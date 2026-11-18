# Human in the loop: calling the shift lead

When an agent stops for approval (a field crew, a generator, contacting a customer), the NOC doesn't wait for someone to notice the screen. It **reaches the shift lead**:

- **WhatsApp call:** a voice agent rings the lead on WhatsApp.
- **Phone call:** the same voice agent on a normal mobile call.
- **WhatsApp message:** a message with **Approve**, **Reject** and **Call me** buttons.

On a call, the agent reads a short briefing (the "story" for that decision) and listens. The lead says "approve" or "reject", or presses 1 or 2 (3 repeats the briefing). The decision lands back in the NOC with how it was made, for example "Approved by Mariam, night shift lead, on a WhatsApp call at 02:23".

If nobody answers, the escalation moves down a ladder:

1. Shift lead.
2. Backup engineer.
3. A WhatsApp message to the shift lead.
4. If that gets no answer either, it stays in the approvals inbox. Safe actions the agents already took stay in place.

## Three ways to run it

| Mode | What happens | Needs |
|---|---|---|
| **Simulated** (default) | A phone card on screen shows the call: ringing, answered, the briefing line by line (optionally read aloud through the laptop), and Approve / Reject as the shift lead. | Nothing. Works offline. |
| **Live, dry run** | The app talks to the escalation service, which acts out the call states. You can trigger a "spoken" decision from a script, exactly as Twilio would. | `npm run dev:all` |
| **Live** | A real phone in the room rings. The voice agent reads the briefing, and the person answers by voice. | Twilio and/or Meta accounts, a public URL, `.env` filled in |

Switch modes, channel and auto-call delay in **Settings → When a person is needed**.

## Twilio Voice trial

Set `TWILIO_TRIAL_VOICE=true` along with `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN` and the trial **From** number in `TWILIO_VOICE_FROM`. Add the recipients in the Twilio Console under **Voice → Try out Voice** and verify them there. Set `CONTACT_GENERATOR_DISPATCH` for a separate recipient on the 11:35 generator dispatch. If Twilio assigns that recipient a different **From** number, set it in `TWILIO_GENERATOR_VOICE_FROM`.

Select **Live → Phone call**. The phone plays Twilio's Speech Recognition sample and the decision is recorded on the NOC screen. This mode can leave `PUBLIC_URL` blank. Full incident briefings and WhatsApp Business Calling use the webhook setup below. [Twilio Voice trial setup](https://www.twilio.com/docs/usage/trials/try-out-voice)

## Deploying the demo on DigitalOcean

Check out the feature branch on the droplet, then create a private `.env` beside `docker-compose.prod.yml` if one does not exist. The Compose file passes these settings to the `calls` service at runtime.

```sh
git fetch origin
git switch feat/twilio-demo-escalation
git pull --ff-only
[ -f .env ] || (umask 077; cp .env.example .env)
chmod 600 .env
```

Fill in the real provider values and recipient numbers on the droplet. Keep `ESCALATION_PORT=8787` and leave `ESCALATION_HOST` blank so the app container can reach the service. Use the trial settings above for regular phone calls, or set `PUBLIC_URL` to the deployed HTTPS origin when using provider webhooks. The app and its `/api/` can initiate real calls, so restrict them to authorized demo users via a private network or an authenticated reverse proxy before setting live credentials. Allow the provider webhook routes separately if needed.

```sh
docker compose -f docker-compose.prod.yml up -d --build
curl --fail http://localhost/api/escalation/health
```

The repository's existing **Deploy** workflow pulls `main`. Use the commands above for this separate branch.

## The story the voice agent tells

Each decision in the demo has a hand-written briefing in `src/sim/escalation.ts`. Each is about 30 seconds, built the same way:

1. Who is calling and why.
2. What happened.
3. What the agents already did on their own.
4. The decision, with its cost.

For example, the 02:23 fibre-cut call to Mariam:

> Hello Mariam, this is the du NOC agent with a P1 at Jebel Ali.
> At 02:14 a contractor cut the fibre between Jebel Ali and Dubai South. 412 alarms, one cause.
> I've rerouted 34 of the 38 sites over the protection path. They're back on air.
> Four single-homed sites are still down, with two enterprise customers on them.
> I'd like to send splicing crew JA-2 to the break, 3.2 kilometres out, at manhole MH-JA-0412. The night call-out costs about 3,800 dirhams.
> Say approve, or press 1. Say reject, or press 2. Say repeat, or press 3.

The other three are the generators (11:35, Khalid), briefing the bank (16:13, Khalid) and the utility's firmware rollout (19:01, Mariam). That last one moved from 18:55 so it lands just after the 19:00 handover, as Mariam's first call of her shift. Any other step that waits for a person gets a briefing generated from the incident.

If someone else builds the calling backend (for example with another WhatsApp provider), they only need `POST /api/escalations`. The body carries everything: `stepId`, `incident`, `approver`, `channel` and `script` (`greeting`, `lines`, `ask`, `approved`, `rejected`, `message`). Send the decision back with `POST /api/escalations/:id/decision`, or emit it on the event stream.

## Going live

1. Copy `.env.example` to `.env`.
2. Put the phones of the people in the room in `CONTACT_NIGHT_LEAD`, `CONTACT_DAY_LEAD` and `CONTACT_BACKUP`, in E.164 format. Mariam and Khalid are fictional.
3. Expose the service publicly so Twilio and Meta can reach it, for example `cloudflared tunnel --url http://localhost:8787` or `ngrok http 8787`. Set `PUBLIC_URL` to that https address.
4. **Phone call (most reliable):**
   - Create a Twilio account and buy a voice-capable number.
   - Set `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN` and `TWILIO_VOICE_FROM`.
   - Check Twilio's Voice geo permissions allow calls to the UAE.
5. **WhatsApp call:**
   - Register a WhatsApp sender in Twilio. It needs Meta Business Verification and a messaging limit of at least 2,000 business-initiated conversations a day.
   - Set the sender's Voice Configuration to a TwiML app, then set `TWILIO_WHATSAPP_FROM=whatsapp:+…`.
   - Before the demo, get call permission from each phone (the rules are below).
6. **WhatsApp message:**
   - In Meta's WhatsApp Cloud API, set `META_WA_TOKEN`, `META_WA_PHONE_NUMBER_ID`, `META_WA_VERIFY_TOKEN` and `META_APP_SECRET`.
   - Subscribe the webhook to `PUBLIC_URL/meta/webhook` (messages field).
   - Send "hi" to the business number from each phone before the demo. This opens the 24-hour window that interactive messages need.
7. Run `npm run dev:all`. Settings should show "Escalation service online · live: …". Pick **Live** and your channel.

Webhooks are checked: Twilio's `X-Twilio-Signature` and Meta's `X-Hub-Signature-256` (when `META_APP_SECRET` is set). Phone numbers stay in the service's `.env`; the browser only sees masked numbers.

## What the research found (November 2026)

- **WhatsApp Business Calling exists, with conditions.**
  - Meta's Cloud API supports user-initiated and business-initiated voice calls.
  - The business handles the media itself over WebRTC or SIP, and calls can't go to normal phone numbers (PSTN).
  - Business-initiated calls are billed per 6 seconds. ([360dialog calling docs](https://docs.360dialog.com/docs/messaging/calling.md))
- **Calling someone needs their permission first.**
  - A call-permission request goes out as a template. At most 1 can be sent in 24 hours, and 2 in 7 days.
  - Once given, permission allows 5 calls a day for up to 7 days.
  - Four missed calls in a row revoke it.
  - So for a demo, get permission on the presenter's and helpers' phones a day or two before, and don't burn calls in rehearsal. ([Twilio WhatsApp Business Calling](https://www.twilio.com/docs/voice/whatsapp-business-calling))
- **Twilio wraps it as a normal voice call.**
  - Set a TwiML app on the WhatsApp sender, then place calls to `whatsapp:+…` with the Calls API.
  - The same `<Say>` / `<Gather>` briefing works for both WhatsApp and phone calls, which is what this service does.
  - Business numbers from the USA, Canada, Egypt, Nigeria, Türkiye and Vietnam can't place outbound calls. (Same source.)
- **⚠ The UAE restricts WhatsApp voice calls.**
  - UAE operators, du included, have blocked VoIP services such as WhatsApp calling to comply with national VoIP rules.
  - The 2020 relaxation kept WhatsApp, FaceTime and Skype calls blocked. ([Wikipedia: Internet censorship in the UAE](https://en.wikipedia.org/wiki/Internet_censorship_in_the_United_Arab_Emirates))
  - We couldn't confirm the current status on du's network. A WhatsApp call to a UAE handset may not ring on du or e& mobile data or Wi-Fi.
  - **Recommendation:**
    - Use **Phone call** as the live channel in the room.
    - Keep **WhatsApp message** for the buttons.
    - Show the WhatsApp call in **Simulated** mode, or test it on site first.
  - It's also worth saying out loud to du: the agent reaching the shift lead is the point, and a normal voice call on du's own network is the most natural channel for a telco.
