// du Autonomous NOC · escalation service
//
// When an agent needs a human decision, the app asks this service to reach the shift lead:
//   • a phone call (Twilio Voice to a normal mobile number)
//   • a WhatsApp call (Twilio, WhatsApp Business Calling)
//   • a WhatsApp message with Approve / Reject buttons (Meta WhatsApp Cloud API)
// On a call, a voice reads the agent's briefing (the "story") and listens for "approve" / "reject"
// (speech) or 1 / 2 (keypad). The decision is pushed back to the app over Server-Sent Events.
//
// With no credentials in .env the service runs in dry-run mode: it walks through the call states
// on a timer and waits for a decision from the app, so the demo works anywhere.
//
// Run: npm run server   (or npm run dev:all for app + server)

import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import { fileURLToPath } from "node:url";
import express from "express";

/* ─────────────────────────── config ─────────────────────────── */

const here = path.dirname(fileURLToPath(import.meta.url));
loadEnv(path.join(here, "..", ".env"));

const env = (k, d = "") => (process.env[k] ?? d).trim();
const CONFIG = {
  port: Number(env("ESCALATION_PORT", "8787")),
  host: env("ESCALATION_HOST") || undefined,
  publicUrl: env("PUBLIC_URL").replace(/\/$/, ""),
  twilio: {
    sid: env("TWILIO_ACCOUNT_SID"),
    token: env("TWILIO_AUTH_TOKEN"),
    voiceFrom: env("TWILIO_VOICE_FROM"),
    generatorVoiceFrom: env("TWILIO_GENERATOR_VOICE_FROM"),
    whatsappFrom: env("TWILIO_WHATSAPP_FROM"),
    trialVoice: env("TWILIO_TRIAL_VOICE") === "true",
  },
  meta: { token: env("META_WA_TOKEN"), phoneNumberId: env("META_WA_PHONE_NUMBER_ID"), verifyToken: env("META_WA_VERIFY_TOKEN"), appSecret: env("META_APP_SECRET"), graph: env("META_GRAPH_VERSION", "v21.0") },
  voice: env("TTS_VOICE", "Polly.Amy-Neural"),
  language: env("TTS_LANGUAGE", "en-GB"),
  ringSeconds: Number(env("RING_SECONDS", "25")),
  contacts: {
    "night-lead": env("CONTACT_NIGHT_LEAD"),
    "day-lead": env("CONTACT_DAY_LEAD"),
    backup: env("CONTACT_BACKUP"),
  },
  generatorDispatchContact: env("CONTACT_GENERATOR_DISPATCH"),
  validateSignatures: env("VALIDATE_SIGNATURES", "true") !== "false",
};

const CAN = {
  phone: Boolean(CONFIG.twilio.sid && CONFIG.twilio.token && CONFIG.twilio.voiceFrom && (CONFIG.twilio.trialVoice || CONFIG.publicUrl)),
  "whatsapp-call": Boolean(CONFIG.twilio.sid && CONFIG.twilio.token && CONFIG.twilio.whatsappFrom && CONFIG.publicUrl),
  "whatsapp-message": Boolean(CONFIG.meta.token && CONFIG.meta.phoneNumberId),
};

/* ─────────────────────────── state ─────────────────────────── */

/** @type {Map<string, any>} */
const escalations = new Map();
const clients = new Set();

function publish(e) {
  const view = publicView(e);
  const line = `data: ${JSON.stringify(view)}\n\n`;
  for (const res of clients) res.write(line);
}

function publicView(e) {
  return {
    id: e.id,
    stepId: e.stepId,
    incident: e.incident,
    approver: e.approver,
    channel: e.channel,
    status: e.status,
    attempt: e.attempt,
    to: mask(e.to),
    dryRun: e.dryRun,
    trialTemplate: e.trialTemplate,
    decision: e.decision,
    via: e.via ?? null,
    heard: e.heard,
    log: e.log,
    updatedAt: e.updatedAt,
  };
}

function update(e, patch, note) {
  Object.assign(e, patch, { updatedAt: Date.now() });
  if (note) e.log.push({ at: Date.now(), note });
  publish(e);
}

/* ─────────────────────────── app ─────────────────────────── */

const app = express();
app.disable("x-powered-by");
app.use(express.json({ limit: "64kb", verify: (req, _res, buf) => { req.rawBody = buf; } }));
app.use(express.urlencoded({ extended: false, limit: "64kb" }));

app.get("/api/escalation/health", (_req, res) => res.json({ ok: true }));

/** What the app may offer. Phone numbers never leave the server; only masked forms do. */
app.get("/api/escalation/config", (_req, res) => {
  res.json({
    channels: CAN,
    dryRun: !CAN.phone && !CAN["whatsapp-call"] && !CAN["whatsapp-message"],
    trialVoice: CAN.phone && CONFIG.twilio.trialVoice,
    contacts: Object.fromEntries(Object.entries(CONFIG.contacts).map(([k, v]) => [k, mask(v)])),
    publicUrl: Boolean(CONFIG.publicUrl),
  });
});

app.get("/api/escalations/stream", (req, res) => {
  res.set({ "Content-Type": "text/event-stream", "Cache-Control": "no-cache", Connection: "keep-alive" });
  res.flushHeaders();
  res.write(`retry: 2000\n\n`);
  clients.add(res);
  for (const e of escalations.values()) res.write(`data: ${JSON.stringify(publicView(e))}\n\n`);
  const ping = setInterval(() => res.write(`: ping\n\n`), 20000);
  req.on("close", () => { clearInterval(ping); clients.delete(res); });
});

/**
 * Start an escalation.
 * body: { stepId, incident: {number, title, severity}, approver: {key, name, role},
 *         channel: "phone" | "whatsapp-call" | "whatsapp-message",
 *         script: { greeting, lines: string[], ask, approved, rejected, message } }
 */
app.post("/api/escalations", async (req, res) => {
  const b = req.body ?? {};
  const problem = validateStart(b);
  if (problem) return res.status(400).json({ error: problem });
  const existing = [...escalations.values()].find((e) => e.stepId === b.stepId && !e.decision && !isOver(e.status));
  if (existing) return res.json(publicView(existing));

  const ladder = buildLadder(b.channel, b.approver.key, b.stepId);
  const e = {
    id: crypto.randomUUID(),
    stepId: String(b.stepId),
    incident: { number: String(b.incident?.number ?? ""), title: String(b.incident?.title ?? ""), severity: String(b.incident?.severity ?? "") },
    approver: { key: b.approver.key, name: String(b.approver.name), role: String(b.approver.role ?? "") },
    script: sanitizeScript(b.script),
    ladder,
    attempt: 0,
    channel: ladder[0].channel,
    to: ladder[0].to,
    status: "queued",
    dryRun: !ladder[0].live,
    trialTemplate: ladder[0].live && b.channel === "phone" && CONFIG.twilio.trialVoice,
    decision: null,
    heard: null,
    log: [],
    updatedAt: Date.now(),
  };
  escalations.set(e.id, e);
  res.json(publicView(e));
  runAttempt(e).catch((err) => fail(e, err));
});

/** A decision taken in the app (the presenter, or the dry-run phone). */
app.post("/api/escalations/:id/decision", (req, res) => {
  const e = escalations.get(req.params.id);
  if (!e) return res.status(404).json({ error: "not found" });
  const d = req.body?.decision;
  if (d !== "approved" && d !== "rejected") return res.status(400).json({ error: "decision must be approved or rejected" });
  decide(e, d, req.body?.via ?? "app", req.body?.heard ?? null);
  res.json(publicView(e));
});

app.post("/api/escalations/:id/cancel", (req, res) => {
  const e = escalations.get(req.params.id);
  if (!e) return res.status(404).json({ error: "not found" });
  if (!e.decision) update(e, { status: "canceled" }, "Canceled from the NOC");
  if (e.callSid) twilioHangup(e.callSid).catch(() => {});
  res.json(publicView(e));
});

/* ─────────────────────── Twilio: the call itself ─────────────────────── */

/** TwiML for the call: read the story, then listen for approve / reject. Speech can interrupt. */
app.post("/twilio/voice/:id", twilioGuard, (req, res) => {
  const e = escalations.get(req.params.id);
  if (!e) return twiml(res, `<Say ${voiceAttrs()}>This escalation has expired. Goodbye.</Say><Hangup/>`);
  const retry = Number(req.query.retry ?? 0);
  if (e.decision) return twiml(res, `<Say ${voiceAttrs()}>${xml(e.decision === "approved" ? e.script.approved : e.script.rejected)}</Say><Hangup/>`);
  if (retry === 0) update(e, { status: "speaking" }, "Answered. Reading the briefing.");
  const s = e.script;
  const story = retry === 0 ? [s.greeting, ...s.lines].map((l) => `<Say ${voiceAttrs()}>${xml(l)}</Say><Pause length="1"/>`).join("") : "";
  const action = `${CONFIG.publicUrl}/twilio/voice/${e.id}/decision`;
  const again = `${CONFIG.publicUrl}/twilio/voice/${e.id}?retry=${retry + 1}`;
  const body =
    retry > 2
      ? `<Say ${voiceAttrs()}>I'll leave it with the NOC screen. Goodbye.</Say><Hangup/>`
      : `<Gather input="speech dtmf" numDigits="1" timeout="7" speechTimeout="auto" language="${CONFIG.language}" hints="approve, reject, repeat, yes, no" action="${action}" method="POST">${story}<Say ${voiceAttrs()}>${xml(s.ask)}</Say></Gather><Redirect method="POST">${xml(again)}</Redirect>`;
  twiml(res, body);
});

app.post("/twilio/voice/:id/decision", twilioGuard, (req, res) => {
  const e = escalations.get(req.params.id);
  if (!e) return twiml(res, `<Hangup/>`);
  const digits = String(req.body.Digits ?? "");
  const speech = String(req.body.SpeechResult ?? "").toLowerCase();
  const intent = digits === "1" || /\b(approve|approved|yes|go ahead|confirm|do it|send)\b/.test(speech) ? "approved"
    : digits === "2" || /\b(reject|rejected|no|don't|do not|stop|hold)\b/.test(speech) ? "rejected"
    : "repeat";
  if (intent === "repeat") {
    // "Repeat" (or 3) reads the whole briefing again; anything unclear just asks the question again.
    const full = digits === "3" || /\b(repeat|again)\b/.test(speech);
    update(e, { heard: speech || digits || null }, full ? "Asked to hear it again." : speech ? `Heard "${speech}". Asking again.` : "No clear answer. Asking again.");
    return twiml(res, `<Redirect method="POST">${xml(`${CONFIG.publicUrl}/twilio/voice/${e.id}?retry=${full ? 0 : 1}`)}</Redirect>`);
  }
  decide(e, intent, e.channel === "whatsapp-call" ? "whatsapp-call" : "phone", speech || (digits ? `pressed ${digits}` : null));
  twiml(res, `<Say ${voiceAttrs()}>${xml(intent === "approved" ? e.script.approved : e.script.rejected)}</Say><Hangup/>`);
});

/** Call progress from Twilio: ringing, answered, finished, no answer… */
app.post("/twilio/status/:id", twilioGuard, (req, res) => {
  res.sendStatus(204);
  const e = escalations.get(req.params.id);
  if (!e) return;
  const s = String(req.body.CallStatus ?? "");
  if (s === "ringing") update(e, { status: "ringing" }, `Ringing ${e.approver.name}`);
  else if (s === "in-progress") update(e, { status: "speaking" });
  else if (["no-answer", "busy", "failed", "canceled", "completed"].includes(s)) {
    if (e.decision) return update(e, { status: "done" }, "Call ended.");
    update(e, { status: s === "completed" ? "no-decision" : s }, `${label(s)}.`);
    next(e);
  }
});

/* ─────────────────────── Meta WhatsApp Cloud API ─────────────────────── */

app.get("/meta/webhook", (req, res) => {
  if (req.query["hub.mode"] === "subscribe" && CONFIG.meta.verifyToken && req.query["hub.verify_token"] === CONFIG.meta.verifyToken) {
    return res.status(200).send(String(req.query["hub.challenge"] ?? ""));
  }
  res.sendStatus(403);
});

app.post("/meta/webhook", (req, res) => {
  if (CONFIG.meta.appSecret && CONFIG.validateSignatures) {
    const sig = String(req.get("x-hub-signature-256") ?? "");
    const want = "sha256=" + crypto.createHmac("sha256", CONFIG.meta.appSecret).update(req.rawBody ?? Buffer.alloc(0)).digest("hex");
    if (!safeEqual(sig, want)) return res.sendStatus(401);
  }
  res.sendStatus(200);
  for (const entry of req.body?.entry ?? []) for (const change of entry.changes ?? []) for (const m of change.value?.messages ?? []) {
    const id = m.interactive?.button_reply?.id ?? "";
    const [action, escId] = id.split(":");
    const e = escId ? escalations.get(escId) : latestOpenFor(m.from);
    if (!e || e.decision) continue;
    const text = String(m.text?.body ?? "").toLowerCase();
    const intent = action === "approve" || /\b(approve|yes)\b/.test(text) ? "approved" : action === "reject" || /\b(reject|no)\b/.test(text) ? "rejected" : action === "call" ? "call" : null;
    if (intent === "call") {
      update(e, {}, `${e.approver.name} asked for a call.`);
      e.ladder.splice(e.attempt + 1, 0, { channel: CAN.phone ? "phone" : "whatsapp-call", to: e.to, live: CAN.phone || CAN["whatsapp-call"] });
      next(e);
    } else if (intent) {
      decide(e, intent, "whatsapp-message", m.interactive?.button_reply?.title ?? text);
    }
  }
});

/* ─────────────────────────── flow ─────────────────────────── */

function buildLadder(channel, leadKey, stepId) {
  const lead = CONFIG.contacts[leadKey] || "";
  const backup = CONFIG.contacts.backup || "";
  // The second demo call is the daytime generator dispatch. Other incidents use their shift lead.
  const generatorCall = channel === "phone" && leadKey === "day-lead" && stepId === "w-dispatch";
  const primary = (generatorCall && CONFIG.generatorDispatchContact) || lead;
  const steps = [{ channel, to: primary, live: CAN[channel] && Boolean(primary) }];
  if (generatorCall && CONFIG.twilio.generatorVoiceFrom) {
    steps[0].voiceFrom = CONFIG.twilio.generatorVoiceFrom;
  }
  if (channel === "phone" && CONFIG.twilio.trialVoice) return steps;
  if (channel !== "whatsapp-message" && backup) steps.push({ channel, to: backup, live: CAN[channel], who: "backup" });
  steps.push({ channel: "whatsapp-message", to: lead, live: CAN["whatsapp-message"] && Boolean(lead) });
  return steps;
}

async function runAttempt(e) {
  const step = e.ladder[e.attempt];
  e.channel = step.channel;
  e.to = step.to;
  e.dryRun = !step.live;
  e.trialTemplate = step.live && step.channel === "phone" && CONFIG.twilio.trialVoice;
  const who = step.who === "backup" ? "the backup engineer" : e.approver.name;
  if (e.dryRun) return dryRun(e, who);
  if (step.channel === "whatsapp-message") {
    update(e, { status: "messaging" }, `WhatsApp message to ${who}`);
    await metaSendButtons(e);
    return update(e, { status: "waiting-reply" }, "Message delivered. Waiting for a tap.");
  }
  update(e, { status: "dialing" }, `${step.channel === "whatsapp-call" ? "WhatsApp call" : "Phone call"} to ${who}`);
  const call = await twilioCall(e, step);
  e.callSid = call.sid;
  if (e.trialTemplate) {
    if (!/^CA[a-f0-9]{32}$/i.test(e.callSid ?? "")) throw new Error("Twilio did not return a call ID.");
    if (e.decision || e.status === "canceled") return twilioHangup(e.callSid).catch(() => {});
    await trackTrialCall(e);
  }
}

/** No credentials: act out the call states so the app shows the same journey. The decision comes from the app. */
function dryRun(e, who) {
  const kind = e.channel === "whatsapp-message" ? "WhatsApp message" : e.channel === "whatsapp-call" ? "WhatsApp call" : "Phone call";
  update(e, { status: e.channel === "whatsapp-message" ? "messaging" : "dialing" }, `${kind} to ${who} (dry run, no credentials)`);
  if (e.channel === "whatsapp-message") return setTimeout(() => !e.decision && update(e, { status: "waiting-reply" }), 1500);
  setTimeout(() => !e.decision && !isOver(e.status) && update(e, { status: "ringing" }), 1200);
  setTimeout(() => !e.decision && !isOver(e.status) && update(e, { status: "speaking" }, "Answered. Reading the briefing."), 4200);
}

function next(e) {
  if (e.decision || e.status === "canceled") return;
  if (e.attempt + 1 >= e.ladder.length) return update(e, { status: "unanswered" }, "Nobody answered. It stays on the NOC screen.");
  e.attempt += 1;
  runAttempt(e).catch((err) => fail(e, err));
}

/** A provider error moves down the ladder instead of stopping the escalation. */
function fail(e, err) {
  if (e.decision || e.status === "canceled") return;
  update(e, { status: "failed" }, `Failed: ${err.message}`);
  if (!e.trialTemplate) next(e);
}

function decide(e, decision, via, heard) {
  if (e.decision) return;
  update(e, { decision, status: "decided", heard: heard ?? e.heard, via }, `${e.approver.name} ${decision === "approved" ? "approved" : "rejected"} by ${label(via)}${heard ? `: "${heard}"` : ""}`);
  // Decided on the NOC screen while the phone is still ringing or talking: close the call politely.
  if (via === "app" && e.callSid && !e.dryRun) {
    if (e.trialTemplate) return twilioHangup(e.callSid).catch(() => {});
    const words = `${e.approver.name} has already ${decision} this on the NOC screen. Goodbye.`;
    twilioUpdate(e.callSid, { Twiml: `<Response><Say ${voiceAttrs()}>${xml(words)}</Say><Hangup/></Response>` }).catch(() => {});
  }
}

/* ─────────────────────────── providers ─────────────────────────── */

const TWILIO_CALLS = `https://api.twilio.com/2010-04-01/Accounts/${CONFIG.twilio.sid}/Calls`;
const TWILIO_AUTH = "Basic " + Buffer.from(`${CONFIG.twilio.sid}:${CONFIG.twilio.token}`).toString("base64");
const TRIAL_VOICE_TEMPLATE = "https://webhooks.twilio.com/v1/Voice/Template/voice_speech_recognition";

async function twilioCall(e, step) {
  const to = step.channel === "whatsapp-call" ? `whatsapp:${step.to}` : step.to;
  const from = step.channel === "whatsapp-call"
    ? CONFIG.twilio.whatsappFrom
    : step.voiceFrom || CONFIG.twilio.voiceFrom;
  const form = new URLSearchParams({
    To: to,
    From: from,
    Url: e.trialTemplate ? TRIAL_VOICE_TEMPLATE : `${CONFIG.publicUrl}/twilio/voice/${e.id}`,
  });
  if (!e.trialTemplate) {
    form.set("Method", "POST");
    form.set("StatusCallback", `${CONFIG.publicUrl}/twilio/status/${e.id}`);
    form.set("StatusCallbackMethod", "POST");
    form.set("Timeout", String(CONFIG.ringSeconds));
    for (const ev of ["initiated", "ringing", "answered", "completed"]) form.append("StatusCallbackEvent", ev);
  }
  const r = await fetch(`${TWILIO_CALLS}.json`, {
    method: "POST",
    headers: { Authorization: TWILIO_AUTH, "Content-Type": "application/x-www-form-urlencoded" },
    body: form,
  });
  const body = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(`Twilio ${r.status}: ${body.message ?? "call failed"}`);
  return body;
}

/** Track the trial call without adding parameters to Twilio's create-call request. */
async function trackTrialCall(e) {
  const deadline = Date.now() + 12 * 60 * 1000;
  const active = () => !e.decision && e.status !== "canceled";
  let readFailures = 0;
  while (active() && Date.now() < deadline) {
    await delay(2500);
    if (!active()) return;
    let call;
    try {
      const response = await fetch(`${TWILIO_CALLS}/${e.callSid}.json`, {
        headers: { Authorization: TWILIO_AUTH },
        signal: AbortSignal.timeout(5000),
      });
      if (!response.ok) throw new Error(`Twilio HTTP ${response.status}`);
      call = await response.json();
      readFailures = 0;
    } catch {
      if (++readFailures >= 3 && active()) {
        return update(e, { status: "awaiting-noc" }, "Twilio accepted the call. Call status is unavailable.");
      }
      continue;
    }
    if (!active()) return;
    if (call.status === "completed") return update(e, { status: "awaiting-noc" }, "Trial call ended. Decide on the NOC screen.");
    if (call.status === "failed") return update(e, { status: "failed" }, "Twilio reported that the trial call failed.");
    if (["busy", "no-answer", "canceled"].includes(call.status)) {
      return update(e, { status: "unanswered" }, label(call.status));
    }
    if (call.status === "ringing" && e.status === "dialing") update(e, { status: "ringing" });
    if (call.status === "in-progress" && e.status !== "speaking") update(e, { status: "speaking" });
  }
  if (active()) update(e, { status: "awaiting-noc" }, "Trial call status tracking ended. Decide on the NOC screen.");
}

const twilioHangup = (sid) => twilioUpdate(sid, { Status: "completed" });

async function twilioUpdate(sid, fields) {
  await fetch(`${TWILIO_CALLS}/${sid}.json`, {
    method: "POST",
    headers: { Authorization: TWILIO_AUTH, "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams(fields),
  });
}

/** An interactive message with three reply buttons. Needs an open 24-hour window (the lead messaged the number first) or an approved template. */
async function metaSendButtons(e) {
  const body = {
    messaging_product: "whatsapp",
    to: e.to.replace(/^\+/, ""),
    type: "interactive",
    interactive: {
      type: "button",
      header: { type: "text", text: `${e.incident.severity} · approval needed`.slice(0, 60) },
      body: { text: e.script.message.slice(0, 1024) },
      footer: { text: "du Autonomous NOC" },
      action: {
        buttons: [
          { type: "reply", reply: { id: `approve:${e.id}`, title: "Approve" } },
          { type: "reply", reply: { id: `reject:${e.id}`, title: "Reject" } },
          { type: "reply", reply: { id: `call:${e.id}`, title: "Call me" } },
        ],
      },
    },
  };
  const r = await fetch(`https://graph.facebook.com/${CONFIG.meta.graph}/${CONFIG.meta.phoneNumberId}/messages`, {
    method: "POST",
    headers: { Authorization: `Bearer ${CONFIG.meta.token}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const out = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(`WhatsApp ${r.status}: ${out.error?.message ?? "send failed"}`);
}

/* ─────────────────────────── helpers ─────────────────────────── */

/** Reject webhooks that Twilio didn't sign (X-Twilio-Signature, HMAC-SHA1 of URL + sorted params). */
function twilioGuard(req, res, next) {
  if (!CONFIG.validateSignatures || !CONFIG.twilio.token) return next();
  const url = CONFIG.publicUrl + req.originalUrl;
  const params = req.body ?? {};
  const data = url + Object.keys(params).sort().map((k) => k + params[k]).join("");
  const want = crypto.createHmac("sha1", CONFIG.twilio.token).update(Buffer.from(data, "utf-8")).digest("base64");
  if (!safeEqual(String(req.get("x-twilio-signature") ?? ""), want)) return res.sendStatus(403);
  next();
}

function twiml(res, inner) {
  res.type("text/xml").send(`<?xml version="1.0" encoding="UTF-8"?><Response>${inner}</Response>`);
}
const voiceAttrs = () => `voice="${CONFIG.voice}" language="${CONFIG.language}"`;
const xml = (s) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const isOver = (s) => ["awaiting-noc", "decided", "done", "canceled", "unanswered", "failed"].includes(s);
const label = (s) => ({ "no-answer": "No answer", busy: "Busy", failed: "Call failed", canceled: "Canceled", completed: "Call ended without a decision", phone: "phone call", "whatsapp-call": "WhatsApp call", "whatsapp-message": "WhatsApp message", app: "the NOC screen" }[s] ?? s);
const mask = (n) => (n ? `${n.slice(0, 4)} ••• ${n.slice(-3)}` : "");
const safeEqual = (a, b) => a.length === b.length && crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));
const latestOpenFor = (waId) => [...escalations.values()].reverse().find((e) => !e.decision && e.to.replace(/^\+/, "") === waId);

function validateStart(b) {
  if (!b.stepId) return "stepId is required";
  if (!["phone", "whatsapp-call", "whatsapp-message"].includes(b.channel)) return "channel must be phone, whatsapp-call or whatsapp-message";
  if (!["night-lead", "day-lead", "backup"].includes(b.approver?.key)) return "approver.key must be night-lead, day-lead or backup";
  if (!b.script || !Array.isArray(b.script.lines)) return "script.lines is required";
  return null;
}

function sanitizeScript(s) {
  const clean = (t, n = 600) => String(t ?? "").slice(0, n);
  return {
    greeting: clean(s.greeting),
    lines: s.lines.slice(0, 12).map((l) => clean(l)),
    ask: clean(s.ask) || "Say approve, or press 1. Say reject, or press 2. Say repeat, or press 3.",
    approved: clean(s.approved) || "Approved. The agents will carry it out. Goodbye.",
    rejected: clean(s.rejected) || "Rejected. The agents will stop and hand it to the NOC. Goodbye.",
    message: clean(s.message, 1024) || clean(s.lines.join(" "), 1024),
  };
}

function loadEnv(file) {
  if (!fs.existsSync(file)) return;
  for (const line of fs.readFileSync(file, "utf-8").split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
    if (m && process.env[m[1]] === undefined) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
}

app.listen(CONFIG.port, CONFIG.host, () => {
  const live = Object.entries(CAN).filter(([, v]) => v).map(([k]) => k);
  console.log(`Escalation service on :${CONFIG.port} · ${live.length ? `live: ${live.join(", ")}` : "dry run (no credentials in .env)"}`);
  if (CAN["whatsapp-message"] && !CONFIG.publicUrl) console.log("Set PUBLIC_URL so Meta can reach the webhooks.");
});
