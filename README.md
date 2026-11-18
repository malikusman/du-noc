# du Autonomous NOC · powered by Scorpius

**A working demo of agentic AI inside a telecom Network Operations Centre, built for du's NOC engineers.**

> _The agents take the alarm storm. Your engineers take the decisions. Every fix is proven by the network itself._

The app replays one full day, the Thursday of GITEX week, across a simulated du network of 2,512 sites in all seven emirates. Nine AI agents watch the network as the day plays out:
- They turn alarm storms into single incidents.
- They find root causes across radio, transport, core, power and security.
- They fix what they safely can on their own.
- When a step costs money or touches a customer, **they call the shift lead and ask**.
- An incident closes only when the KPIs prove the fix worked.

The whole day plays in about 10–15 minutes, with you controlling the clock. It runs offline and identically every time, so it is safe to present live.

---

## Contents

1. [What the application does](#1-what-the-application-does)
2. [Quick start](#2-quick-start)
3. [A worked example: the 02:14 fibre cut](#3-a-worked-example-the-0214-fibre-cut)
4. [How it works](#4-how-it-works)
5. [The screens](#5-the-screens)
6. [The day's incidents](#6-the-days-incidents)
7. [Calling the shift lead (human in the loop)](#7-calling-the-shift-lead-human-in-the-loop)
8. [Presenting](#8-presenting)
9. [Project structure](#9-project-structure)
10. [Customising](#10-customising)
11. [Deploying](#11-deploying)
12. [What is real and what is simulated](#12-what-is-real-and-what-is-simulated)
13. [Troubleshooting](#13-troubleshooting)

---

## 1. What the application does

A NOC today drowns in alarms. One fibre cut can raise hundreds of them across several vendors' systems. Engineers spend the first hour working out which alarms are the same problem, whether it's planned work, and where the fault actually is. Some faults, like a "sleeping" cell or a bad parameter change, raise no alarm at all.

This demo shows a NOC where AI agents do that first hour of work, with the engineers firmly in control:

| The agents… | So the engineers… |
|---|---|
| Group 412 alarms from three systems into **one incident** | Get one ticket, not 37 |
| Test several possible causes and show their **confidence** as evidence arrives | See why, not just what |
| Make **reversible** fixes on their own (reroute traffic, roll back a parameter, wake a cell) inside guardrails | Aren't paged for things that fix themselves |
| **Stop and ask** before anything costly or customer-facing (a night crew, a generator, contacting a customer) | Make every decision that matters, by phone if they're away |
| **Prove** each fix with live KPIs, and roll back or escalate if it didn't work | Trust the "resolved" status |
| Learn a rule from each incident and check the whole network for it | See the same problem prevented next time |
| Write the **shift handover** and the **CTO's morning brief** | Start each shift informed |

Autonomy is set **per domain** (RAN, Transport, Core, Enterprise, Power, Security, International), on four levels that map to the TM Forum autonomous-network scale:

| Level | What the agents may do | TM Forum |
|---|---|---|
| Observe | Detect, diagnose and plan. People carry out every action. | L2 |
| Recommend | Prepare every action. People approve each one. | L3 |
| **Act within guardrails** (default) | Reversible changes run on their own. Costs, field visits and customer contact wait for a person. | L4 |
| Autonomous | Everything inside policy runs on its own. People are informed. | L4+ |

---

## 2. Quick start

**You need:** Node.js 18 or newer (20 LTS recommended). Check with `node -v`.

```bash
cd du-noc
npm install          # first time, and after pulling changes
npm run dev          # open http://localhost:5173
```

You land on a title card, "One day in the du NOC". Click **Start the day** or press **Space**.

| Command | What it runs |
|---|---|
| `npm run dev` | The app only. Calls to the shift lead are **simulated** on screen. This is all you need for a demo. |
| `npm run dev:all` | The app plus the **escalation service** on port 8787, which places real phone and WhatsApp calls (see [section 7](#7-calling-the-shift-lead-human-in-the-loop)). |
| `npm run build` | Type-check and build to `dist/`. |
| `npm run preview` | Serve the built app on port 4173. |
| `npm run server` | The escalation service on its own. |
| `npm run generate:network` | Regenerate the simulated network map (`src/sim/network.ts`). |
| `docker compose up` | App and escalation service in containers (dev). |

**Keys while presenting:**

| Key | Action |
|---|---|
| `Space` | Play or pause the day; inside an incident, pause the reasoning |
| `→` | Next step inside an incident, or jump to the next moment of the day |
| `A` | Approve what the agents are asking for |
| `Esc` | Close the incident and return to the Overview |
| `R` | Restart the day |
| `S` | Show or hide the story captions |
| `0`–`3` | Set autonomy for every domain: Observe, Recommend, Guardrails, Autonomous |

The sun/moon button switches between dark and light. The sidebar collapses for a bigger map.

---

## 3. A worked example: the 02:14 fibre cut

This one incident shows almost everything the app does, from the alarm storm to a phone call to a proven fix.

### What happens in the story

At 02:14 a contractor's digger cuts the fibre duct between the Jebel Ali and Dubai South aggregation hubs. 38 cell sites lose their backhaul. Mariam, the night shift lead (a fictional character), is at home.

### What you see, step by step

Start the day and let it run. At 02:14 the **incident room** opens by itself. Each agent takes its turn; every step appears as a card with its evidence on the right.

| Time | Agent | What it does | What you see |
|---|---|---|---|
| 02:14 | **Correlator** | 412 alarms arrive in 90 seconds from the optical system, the radio EMS and the IP layer. They all sit behind one fibre span, so it opens **one incident**. | A bar chart of alarms every 10 seconds; chips: *412 raw alarms, 371 duplicates removed, 38 sites, 1 ticket*. |
| 02:15 | **Diagnostician** | Keeps four explanations open: fibre cut 71%, router failure 18%, hub power 8%, planned work 3%. | Confidence bars. |
| 02:16 | **Diagnostician** | Tests each one: no planned work in ITSM, hub power normal, router healthy. The OTDR finds a break 3.21 km out, matching an excavation permit opened at 18:00. | A terminal-style tool log, line by line. |
| 02:17 | **Diagnostician** | Fibre cut now 96%. Same duct as a cut in March. GPS of the break: 24.981, 55.121. | The confidence bars move. |
| 02:17 | **Planner** | Three options: wait for the splice (38 sites down ~4 h), reroute then splice (4 sites down), or add a temporary microwave link (AED 9,500). It picks the reroute. | Three option cards, one marked *Chosen*. |
| 02:18 | **Operator** | Switches 34 sites onto the protection path. It's reversible and inside the guardrails, so it **runs on its own**. | *Ran on its own. Reversible and inside guardrails.* |
| 02:21 | **Verifier** | Proves 34 sites are carrying traffic again. | A line chart: sites drop to 0, then jump back to 34. |
| 02:23 | **Operator** | Wants to send a splicing crew to the GPS of the break. That's a night call-out costing AED 3,800 and can't be undone, so it **stops and asks Mariam**. | A card outlined in amber: *Needs your approval*. |
| +4 s | **Escalation** | The agent **calls Mariam** (WhatsApp call by default). A phone card rings, she answers, and the agent reads a 30-second briefing. | The call card with the briefing, line by line. |
| 02:23 | **Mariam** | Says "approve" on the call (or you press **Approve** on the phone card, or **A**). | *Approved by Mariam, night shift lead, on a WhatsApp call at 02:23.* |
| 02:24 | **Liaison** | Tells the two enterprise customers on the still-down sites, with an ETA. | |
| 05:52 | **Verifier** | Splice done, original path restored, alarms clear. Only now is the incident **resolved**. | Runs in the background after the room closes. |
| 06:05 | **Planner** | Learns from it: flags the 4 single-homed sites for a second path, and watches new excavation permits near this duct. | The rule appears in **Knowledge** and on the **Downtime Prevention** risk board. |

On the right of the room, **Last time vs today** compares this with the March cut on the same duct:

| | Last time | Today |
|---|---|---|
| Tickets opened | 37 | 1 |
| Root cause found | 52 min | 3 min |
| First sites back | 1 h 35 min | 4 min |
| Crew sent to | The hub, then searched | GPS of the break |

The incident then shows up across the app:
- **Incident Correlation:** the 412 alarms collapsing into one incident.
- **Autonomous Remediation:** each step of the loop, and who approved what.
- **Revenue Protection:** the AED kept on air, plus the service credits not paid.
- **Analytics & Reports:** the night-shift handover at 07:00.
- **Executive Intelligence:** the CTO's brief.

### The call Mariam receives

The briefing comes from `src/sim/escalation.ts`:

> Hello Mariam, this is the du NOC agent with a P1 at Jebel Ali.
> At 02:14 a contractor cut the fibre between Jebel Ali and Dubai South. 412 alarms, one cause.
> I've rerouted 34 of the 38 sites over the protection path. They're back on air.
> Four single-homed sites are still down, with two enterprise customers on them.
> I'd like to send splicing crew JA-2 to the break, 3.2 kilometres out, at manhole MH-JA-0412. The night call-out costs about 3,800 dirhams.
> Say approve, or press 1. Say reject, or press 2. Say repeat, or press 3.

### What's happening in the code

Each step of the incident is plain data in `src/sim/incidents.ts`. This is the step that waits for Mariam:

```ts
{
  id: "f-dispatch", t: at("02:23"), agent: "operator", kind: "act",
  title: "Send the splicing crew to the exact spot",
  action: {
    command: "wfm.dispatch(team='Splicing-JA-2', gps='24.981,55.121', kit='48F splice', manhole='MH-JA-0412')",
    system: "Field service (WFM)",
    reversible: false,                       // ← this is why it asks
    approvalReason: "Night call-out for a splicing crew. It costs money and can't be undone.",
    cost: "AED 3,800",
    result: "Crew Splicing-JA-2 on the way. ETA 02:58, with the GPS and manhole number.",
  },
}
```

1. **The clock** (`src/state/sim.tsx`) moves the simulated time forward. At 02:14 it reaches the incident's `trigger` and opens the room.
2. **Progress** (`src/sim/progress.ts`) works out every step's state at the current minute. This step has `reversible: false`, and Transport autonomy is *Act within guardrails*. So `needsApproval()` in `src/sim/agents.ts` returns true, and the step becomes **waiting**. Every later step is held back.
3. **Escalation** (`src/state/escalation.tsx`) sees the waiting step. After 4 seconds it starts a call to the shift lead on duty: `approverAt(02:23)` returns Mariam.
   - In Simulated mode, the call card plays the script.
   - In Live mode, it sends the script to the escalation service, which places a real call through Twilio.
4. **The decision** comes back from the call card, the **A** key or the service's live event stream. It calls `approve(stepId, via)`, which records the approval with *how* it was made. Progress releases the following steps, shifted by the time spent waiting.
5. **Change the autonomy and the story changes.** Press **0** (Observe) before 02:14 and even the reroute waits for a person. Press **3** (Autonomous) and the crew is dispatched by policy without asking.

### Trying it in Live mode (a real phone rings)

With `npm run dev:all` running, Settings → *When a person is needed* → **Live**. Without credentials the service runs a **dry run**: it acts out the call states, so you can test the whole loop. This is what a phone answer looks like to the service. Twilio sends it when the person speaks:

```bash
# find the active escalation id
curl -s -N --max-time 1 localhost:8787/api/escalations/stream | grep -o '"id":"[^"]*"' | head -1

# simulate Mariam saying "yes, approve it" on the call
curl -s -X POST localhost:8787/twilio/voice/<id>/decision --data-urlencode 'SpeechResult=Yes, approve it.'
```

The app updates within a second: *Approved by Mariam, night shift lead, on a WhatsApp call at 02:23*. With Twilio credentials in `.env`, a real phone rings instead. See [section 7](#7-calling-the-shift-lead-human-in-the-loop).

---

## 4. How it works

```
 ┌──────────────────────── Browser (React app) ────────────────────────┐
 │                                                                     │
 │  Simulation (src/sim)            State (src/state)      Screens     │
 │  ─────────────────────           ────────────────       ───────     │
 │  network.ts   2,512 sites   ──►  sim.tsx               Overview     │
 │  incidents.ts 10 scripts         clock, approvals,  ──► Incident    │
 │  routine.ts   68 small fixes     autonomy, decisions    room, 12    │
 │  alarms.ts    alarm river        escalation.tsx         pages       │
 │  progress.ts  state at minute t  calls to the lead                  │
 │  agents.ts    autonomy rules           │                            │
 └────────────────────────────────────────┼────────────────────────────┘
                                          │ /api (only in Live mode)
                                          ▼
                     ┌──────── Escalation service (server/index.mjs) ────────┐
                     │ Twilio Voice ── phone call / WhatsApp call (TwiML)     │
                     │ Meta WhatsApp Cloud API ── message with buttons        │
                     │ ladder: lead → backup → WhatsApp → NOC screen          │
                     │ Server-Sent Events back to the app                     │
                     └────────────────────────────────────────────────────────┘
```

### The simulation is deterministic

Nothing is random at run time, so the day plays the same way in every rehearsal and in the room.

- **The network** (`scripts/generate-network.mjs` → `src/sim/network.ts`):
  - The UAE outline from Natural Earth.
  - 2,512 sites (20,063 cells) placed in 56 areas and 6 highway corridors with a seeded random generator.
  - Simulated vendor regions: Huawei, Ericsson and Nokia.
  - Technology: 4G, 5G and 5G-A.
  - 19 transport hubs and 25 links, including core data centres and a cable landing station.
  - Named sites for the story: the Dubai World Trade Centre halls, The Dubai Mall, DIFC, the Tawam Hospital site, and others.
- **Incidents** (`src/sim/incidents.ts`): each incident is a script of steps (observe → hypothesise → test → plan → act → verify → learn), with:
  - the agent that takes each step
  - its tool calls
  - the evidence chart
  - the knowledge-base entries it cites
  - the sites it affects, phase by phase.
- **Progress** (`src/sim/progress.ts`) is a pure function: given the minute, the approvals and the autonomy levels, it returns:
  - every step's state: done, waiting, pending or rejected
  - each incident's status
  - which sites are down, degraded, watched or fixed.

  Waiting for a person shifts the rest of the incident later.
- **Background activity** gives the day its texture:
  - 64 small auto-fixes (VSWR glitches, stuck cells, door alarms matched to maintenance) and 4 security events (`routine.ts`).
  - A traffic-shaped stream of raw alarms, about 40,000 over the day (`alarms.ts`).
- **The clock** (`src/state/sim.tsx`):
  - Runs at 6 simulated minutes per real second at 1×, with 2× and 5× available.
  - Pauses while an incident room is open, so the reasoning can be read.
  - Saves its state in `sessionStorage`, so a page refresh doesn't lose your place.

### The nine agents

| Agent | Can act? | Job |
|---|---|---|
| Sentinel | No | Watches every KPI against neighbours, last week, weather and events. Finds problems that raise no alarm. |
| Correlator | No | Turns alarm storms into one incident; checks the change calendar. |
| Diagnostician | No | Keeps several causes open and tests each across domains. |
| Planner | No | Weighs options on subscribers, SLAs, risk and cost; checks guardrails. |
| Operator | **Yes** | Runs the change through the vendor EMS, SMO or IP controller. |
| Verifier | No | Closes an incident only when KPIs prove it; otherwise rolls back or escalates. |
| Liaison | **Yes**, with approval | Tells customers, account managers and care. |
| Guardian | No | Separates attacks from accidents; works with the SOC. |
| Scribe | No | Writes the shift handovers and the CTO's brief. |

### Revenue numbers

Revenue protected = subscribers kept on air × minutes avoided × **AED 4.4 per subscriber per day** ÷ 1,440, plus SLA credits avoided.

AED 4.4 comes from du's Q3 2026 revenue (AED 4,145m) over 92 days and 10.26m subscribers. The SLA credit amounts are simulated.

---

## 5. The screens

The sidebar uses the same groups and names as the NOC sidebar the du team has already seen, plus an **Admin** group for executives.

**Admin**

| Screen | What it shows |
|---|---|
| **Command Center** | The executive dashboard, live as the day plays. Its parts are described below the screen tables. |

**Intelligence**

| Screen | What it shows |
|---|---|
| **Downtime Prevention** | Outages prevented today (what would have happened against what did), a 7-day risk board that grows as the agents learn, and the week ahead (events, fog, dust). |
| **Incident Correlation** | Raw alarms → unique events → incidents → decisions; for each incident, the alarm groups collapsing into one cause, and the checks that decide planned or unplanned. |
| **Revenue Protection** | AED at risk right now, protected today, SLA credits avoided, fraud stopped, the GITEX service floors, and the enterprise SLA table. |

**Operations**

| Screen | What it shows |
|---|---|
| **Overview** | The live map, three headline numbers, the alarm river, the timeline, the approvals inbox and the agents' activity feed. Incidents open here by themselves. |
| **Cell Site Management** | Every site, coloured by status, vendor or technology; site detail and today's history; the Sentinel watchlist. |
| **Autonomous Remediation** | The loop per incident (Detect → Diagnose → Plan → Approve → Execute → Verify), and every action with who approved it and how. |
| **Security Operations** | "Attack or accident?", with today's security events. |
| **Agent Observatory** | The nine agents, their hand-offs, the decision log and the guardrail matrix. |
| **Analytics & Reports** | Shift handovers written by the Scribe (07:00 and 19:00), plus alarms per hour and time to root cause. |
| **Executive Intelligence** | The CTO's Friday 06:00 brief, and **Ask the NOC**: seven questions answered from today's record, with the incidents they used. |
| **Knowledge Base** | Methods of procedure, policies, change records, vendor bulletins, past incidents and rules learned today, with which agent cited what. |
| **Settings** | Autonomy per domain, the confidence floor, **who gets called and how**, alert channels, the team on shift and connected systems. |

### The Command Center (executive dashboard)

Added after the first demo, when du asked for a dashboard for the executive admin. It answers three questions on one screen: are the business outcomes being met, what did the agents do on their own, and which decisions need me?

- **Headline tiles:**
  - Auto-resolved: the share of actions with no person involved.
  - Mean time to repair.
  - Intents met (for example 6 of 7).
  - Revenue leakage: subscriber revenue actually lost to outages today, as a share of du's daily revenue.
  - Decisions waiting.
- **Business intents:**
  - Outcomes in plain words, each with a target and a live status: Met, At risk or Breached.
  - Example targets: "Gold SLA banks stay under 25 ms", "Card payments at GITEX succeed at least 99.5% of the time", "Critical sites never go off air".
  - Each one moves with the incident that touched it.
  - **Add intent:** type a goal such as "Keep enterprise uplink above 50 Mbps". The Planner agent turns it into a metric, a target, a scope and a domain, with the guardrails that apply, and starts watching it.
  - This follows intent-based operations as in TM Forum's Intent Management API (TMF921). Customer-facing intents can be exposed through the CAMARA Quality on Demand API.
- **Agent activity:** the latest actions, labelled by domain.
- **Needs human approval:**
  - *Right now:* actions waiting on the shift, with confidence, cost, and whether the shift lead is already on a call. Approve or Hold (Hold hands it to an engineer).
  - *For sign-off this week:* investments and policies the agents recommend from what they learned today.
- **Domain health:** a score per domain that drops while an incident in it is open and recovers once the fix is proven.
- **Value delivered today:**
  - Revenue protected.
  - Subscriber-hours protected.
  - Tickets the agents didn't need.
  - Field visits avoided.
  - A link to the CTO brief.

The intent logic is in `src/sim/intents.ts` and the screen in `src/pages/Command.tsx`. In the demo, typed intents are parsed by simple rules so the result is predictable on stage. In production the Planner would use a language model and the live KPI feeds.

---

## 6. The day's incidents

| Time | Incident | Domain | What it proves |
|---|---|---|---|
| **02:14** | **412 alarms, one fibre cut** (Jebel Ali) | Transport | Correlation, OTDR location, reroute, a call to approve the crew |
| 05:40 | Fog on the Abu Dhabi coast | Transport | Acting on a forecast before links fade |
| 07:00 | Night-shift handover | — | One page instead of a briefing |
| 08:05 | Twelve core alarms that aren't an outage | Core | Planned work matched to its change; no tickets |
| **09:40** | **A parameter change that made calls fail** (Sharjah) | RAN | No alarm fired; KPI drift tied to a change and rolled back; a canary rule learned |
| 11:30 | 14 sites on battery (Hatta, Al Ain) | Power | Load shedding; generators to the hospital site, with approval |
| **13:20** | **GITEX is about to fill every cell** (DWTC) | RAN | A slice intent guarding payments, broadcasters and 5G+ users |
| 16:10 | A bank's latency creeping toward its SLA | Enterprise | Fixed before the breach; account manager briefed, with approval |
| **18:45** | **An attack, or a bug?** | Core | 61,000 smart meters, not DDoS; back-off, nobody blocked; a call at 19:01 |
| 19:00 | Day-shift handover | — | Everything open, on one page |
| **21:20** | **A cell that says it's fine** (The Dubai Mall) | RAN | A sleeping cell found without an alarm, woken in 5 minutes; a second found by a fleet scan |
| 23:10 | Europe 38 ms further away | International | A subsea fault; traffic rerouted, care briefed |

Incidents in **bold** open their room automatically while the Overview is on screen.

---

## 7. Calling the shift lead (human in the loop)

When an agent waits for a decision, the shift lead on duty is reached by one of three channels:
- **WhatsApp call:** a voice agent rings on WhatsApp.
- **Phone call:** the same voice agent on a normal mobile call.
- **WhatsApp message:** a message with Approve / Reject / Call me buttons.

On a call, the agent reads the briefing and listens for "approve" or "reject" (or 1 / 2; 3 repeats). If nobody answers, the escalation moves down a ladder:

1. Shift lead.
2. Backup engineer.
3. A WhatsApp message to the shift lead.
4. If that gets no answer either, it stays in the approvals inbox.

| Mode | Set in Settings | Needs |
|---|---|---|
| **Simulated** (default) | The call plays on screen and can be read aloud | Nothing |
| **Live · dry run** | The service acts out the call states | `npm run dev:all` |
| **Live** | A real phone rings | `.env` with Twilio and/or Meta credentials, contact numbers, and a public URL (ngrok or cloudflared) |

To go live:
1. Copy `.env.example` to `.env` and fill it in.
2. Run `npm run dev:all`.
3. Choose **Live** in Settings.

Full setup, the escalation service's API and the research behind it are in [`docs/ESCALATION.md`](docs/ESCALATION.md).

> **⚠ UAE note:** UAE operators have historically blocked WhatsApp voice calls. For the live moment in the room, use **Phone call**: same voice agent, works on any network. Show the WhatsApp call in Simulated mode unless you've tested it on site. WhatsApp business calling also needs Meta business verification, and each person's permission in advance.

---

## 8. Presenting

The full talk track (what to say and click, minute by minute) is in [`docs/STORY.md`](docs/STORY.md). The short version is a three-act day:

1. **Title card:** "Two engineers, nine agents, one day." Press **Space**.
2. **Act 1 · Night: turning noise into signal.**
   - 02:14 fibre cut: the agent calls Mariam; answer **Approve** on the phone.
   - Then show Incident Correlation.
3. **Act 2 · Day: prevent, don't react.**
   - 07:00 handover.
   - 09:40 change rollback.
   - 11:30 generators.
   - 13:20 GITEX → Revenue Protection.
4. **Act 3 · Evening: judgement calls.**
   - 18:45 "attack or bug?": at 19:01 the agent calls Mariam; answer **Reject**.
   - 21:20 sleeping cell.
5. **Epilogue:** Executive Intelligence (the CTO brief, Ask the NOC), then Settings (autonomy per domain).

Before you present:
- Press **R** to restart.
- Check autonomy is **Guardrails**.
- Pick the theme.
- In Settings, choose the call channel and set *Call automatically after* to **4 s**.

---

## 9. Project structure

```
du-noc/
├── src/
│   ├── App.tsx                 routes, sidebar, incident room, call card
│   ├── main.tsx                providers (simulation, escalation)
│   ├── index.css               colour tokens for dark and light themes
│   ├── sim/                    the simulated world (pure data and functions)
│   │   ├── network.ts          generated map, sites, hubs, links
│   │   ├── sites.ts            site lookup and helpers
│   │   ├── incidents.ts        the 10 incident scripts
│   │   ├── progress.ts         state of every incident at any minute
│   │   ├── agents.ts           agents, autonomy levels, guardrails
│   │   ├── routine.ts          small auto-fixes and security events
│   │   ├── alarms.ts           the alarm river
│   │   ├── knowledge.ts        MOPs, policies, changes, past incidents
│   │   ├── insight.ts          alarm groups, checks, last-time-vs-today, risk board, customers, team
│   │   ├── escalation.ts       call briefings and channels
│   │   ├── story.ts            acts and captions
│   │   └── time.ts             clock, shifts, shift leads
│   ├── state/
│   │   ├── sim.tsx             clock, approvals, autonomy, decision log
│   │   ├── escalation.tsx      calling the shift lead (simulated or live)
│   │   └── theme.tsx           dark / light
│   ├── components/             map, feed, timeline, call card, incident room…
│   └── pages/                  one file per screen
├── server/index.mjs            escalation service (Express): Twilio, Meta WhatsApp, SSE
├── scripts/generate-network.mjs
├── docs/
│   ├── PLAN.md                 research and plan
│   ├── STORY.md                presenter talk track
│   └── ESCALATION.md           calls and WhatsApp: setup and research
├── .env.example                escalation service settings
├── Dockerfile, Dockerfile.prod, Dockerfile.server
├── docker-compose.yml, docker-compose.prod.yml, nginx.conf
└── .github/workflows/deploy.yml   manual SSH deploy
```

**Stack:** React 18, TypeScript, Vite, Tailwind CSS, Framer Motion and Recharts for the app; Node and Express for the escalation service.

---

## 10. Customising

**Add the du logo:**
1. Save it as `src/assets/du-logo.svg`.
2. In `src/components/Logo.tsx`, set `USE_OFFICIAL_LOGO` to `true` and render the image.

**Change brand colours:** edit the `--brand`, `--brand-2` and `--brand-3` tokens in `src/index.css`. There is one set for dark and one for light.

**Add an incident:**
1. Copy one in `src/sim/incidents.ts`.
2. Give it a new `id`, a `trigger` time, `steps` and `phases`.
3. Add it to the `INCIDENTS` list.

Things to know:
- `autoOpen: true` makes the room open by itself.
- An `action` with `reversible: false` makes the agents ask a person.
- Add a caption in `src/sim/story.ts`, and optionally a call briefing in `src/sim/escalation.ts`, keyed by the step id.

**Change the network:** edit the areas in `scripts/generate-network.mjs` and run `npm run generate:network`.

**Change who gets called:** set `CONTACT_NIGHT_LEAD`, `CONTACT_DAY_LEAD` and `CONTACT_BACKUP` in `.env`. Numbers never reach the browser.

---

## 11. Deploying

```bash
docker compose -f docker-compose.prod.yml up -d --build
```

This serves the built app with nginx on port 80 and runs the escalation service beside it. nginx forwards `/api`, `/twilio` and `/meta` to the service, so Twilio and Meta webhooks can reach it at your domain. Set `PUBLIC_URL` in `.env` to that domain.

`.github/workflows/deploy.yml` is a manual (*Run workflow*) SSH deploy. It needs these repository secrets:
- `DEPLOY_HOST`
- `DEPLOY_USER`
- `DEPLOY_SSH_KEY`
- `DEPLOY_PATH`

---

## 12. What is real and what is simulated

**Real, from public sources** (see `docs/PLAN.md`):
- du's scale: 9.5m mobile and 756k fixed subscribers (Q3 2026).
- The multi-vendor RAN (Huawei, Ericsson, Nokia), with Nokia MantaRay SMO and WaveSuite.
- 5G-Advanced on n78 and n41, and indoor 5G-A at malls and venues.
- The CTO's TM Forum Level 4 roadmap.
- The agentic network-slicing pilot with Nokia and AWS.
- Revenue per subscriber, derived from the Q3 2026 results.

**Simulated:**
- The network itself: site count, names, vendor regions and topology.
- Alarm volumes, the incidents, customers, contracts and change records.
- The past incident reviews used in "last time vs today".
- The shift leads Mariam and Khalid.
- System names in tool calls stand for the kinds of systems a NOC uses.
- **Ask the NOC** matches questions to answers built live from the simulated day. In production it would be a language model over the NOC's own data.

---

## 13. Troubleshooting

| Problem | Fix |
|---|---|
| `npm: command not found` | Install Node 20 LTS from nodejs.org or `brew install node@20`. |
| Port 5173 in use | Vite offers the next free port. Use the link it prints. |
| The day starts in the middle | The clock is saved per browser tab. Press **R** to restart. |
| An incident didn't open by itself | Rooms open automatically only on the **Overview**. Open them from the timeline dots or the feed. |
| Settings says "Escalation service offline" | Run `npm run dev:all` instead of `npm run dev`. |
| Live call doesn't ring | Check `PUBLIC_URL` is a public https address that reaches port 8787, the numbers are in E.164 format (`+9715…`), and Twilio's geo permissions allow the UAE. For WhatsApp calls, check the person granted call permission. |
| Browser console shows a 500 for `/api/escalation/config` | Harmless. The app checks for the escalation service, which isn't running. |
