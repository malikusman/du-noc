# The story: "One day in the du NOC"

**One line:** _The agents take the alarm storm. Your engineers take the decisions. Every fix is proven by the network itself._

**Who it's for:** du NOC engineers and shift leads, with the CTO's office in mind for the ending.

**The promise we make, in their language:**
- Fewer tickets.
- Faster root cause.
- Nothing risky happens without a shift lead.
- Every fix is proven by KPIs, not by "command accepted".

**The cast** (fictional names):
- **Mariam**, night shift lead (00:00–07:00 and 19:00–24:00).
- **Khalid**, day shift lead (07:00–19:00).
- **Nine agents.** Five can only read and recommend: Sentinel, Correlator, Diagnostician, Verifier and Guardian. Operator and Liaison can act, inside guardrails. Planner weighs the options, and Scribe writes the handovers and the brief.

---

## Cold open (title card, before 00:00)

> "This is a Thursday in GITEX week. The network has 2,512 sites and 9.5 million mobile customers. Two engineers are on the night shift, working with nine agents. Let's watch the day."

Press **Space**.

## Act 1 · Night: turning noise into signal

| Time | Beat | Say | Screen |
|---|---|---|---|
| 00:00–02:10 | Quiet hours | "Small faults get fixed without a ticket. Watch the counter climb." | Overview: the feed and the alarm river |
| **02:14** | **412 alarms, one fibre cut** | "Last March the same duct was cut. 37 tickets, and 52 minutes to find the cause. Tonight: one ticket and three minutes, and 34 sites are back before anyone wakes up. The only thing Mariam has to decide is whether to send the night crew, and she's at home asleep. So the agent calls her." The phone card rings (or a real phone in the room rings in Live mode). Let the briefing play, then answer **Approve** on the phone. | The room opens by itself. The call card shows the briefing. Point at **Last time vs today** |
| 05:40 | Fog on the Abu Dhabi coast | "No alarm yet. The agents act on the forecast." | Caption → open the incident |

**Show next:** **Incident Correlation**: the 412 alarms on the left, one incident on the right, and the checks that ruled out planned work and power.

## Act 2 · Day: prevent, don't react

| Time | Beat | Say | Screen |
|---|---|---|---|
| 07:00 | Handover | "Khalid starts his shift with one page, not a 40-minute briefing." | **Analytics & Reports** → night shift handover |
| 08:05 | Planned work | "Twelve core alarms. It's the SMF upgrade in its change window, so nobody gets paged." | Correlation → planned vs unplanned |
| **09:40** | **A change that made calls fail** | "No alarm will ever fire for this. Sentinel saw call setup drop 4 points and tied it to a change at 09:00. The agents rolled back three parameters in four minutes and learned a new rule: big pushes start with a canary." | The room opens by itself |
| 11:30 | Grid trip, hospital site | "Batteries are stretched, and the generators go to Tawam Hospital first. Khalid approves the cost." | **Downtime Prevention** |
| **13:20** | **GITEX** | "The keynote ends at 13:50. The agents protect payments, broadcasters and 5G+ users before the crowd moves. This is the agentic slicing du is already piloting with Nokia and AWS, running in the NOC." | The room opens by itself, then **Revenue Protection** |
| 16:10 | A bank's SLA | "The bank never knew. Its account manager did, and before the bank could call." | Revenue Protection → enterprise SLAs |

## Act 3 · Evening: judgement calls

| Time | Beat | Say | Screen |
|---|---|---|---|
| **18:45** | **An attack, or a bug?** | "Last year a storm like this was treated as DDoS for 25 minutes and a whole IoT APN was blocked. Tonight Guardian proves it's 61,000 meters with a firmware bug. The agents slow the meters down and block nobody. At 19:01, Mariam's first minute back on shift, the agent calls her to ask about contacting the customer." On the call, answer **Reject** to show the handover to engineers. | The room opens by itself, then **Security Operations** |
| 19:00 | Handover | "Mariam is back. What's still open is on one page." | Reports |
| **21:20** | **A cell that says it's fine** | "No alarm, but zero users at The Dubai Mall on a Thursday night. The agents wake it in five minutes, scan every indoor cell, and find a second one at DXB T3." | The room opens by itself |
| 23:10 | Subsea | "A Red Sea fault. Europe traffic is rerouted, and care gets a script before the calls start." | Caption |

## Epilogue · the morning brief

**Executive Intelligence:**
> "This is what the CTO reads at 06:00 on Friday: 40,000 alarms, 10 incidents, 85 actions taken alone, 4 decisions by people, and the sign-offs needed this week."

Then use **Ask the NOC**: "Was the evening surge an attack?" or "What needs a decision right now?" Each answer cites its incidents.

**Then the Command Center** (Admin in the sidebar), for the executives in the room:
> "This is the screen for whoever sets the NOC's goals. Seven business intents, in plain words, each live. Here's the one the bank incident touched, back to Met. Auto-resolved is above 90 percent, and these are the four decisions that needed a person today."

Type an intent live, for example "Keep enterprise uplink above 50 Mbps in Abu Dhabi", and show the Planner turning it into a metric, a target and guardrails.

**Close on Settings:**
> "Autonomy is set per domain. You decide how far the agents go, domain by domain, along the same TM Forum levels as du's L4 roadmap."

---

## How the demo covers each section of their NOC sidebar

| Section | Where in the demo | The point it proves |
|---|---|---|
| Downtime Prevention | Prevention page; fog, power, GITEX, sleeping-cell scan | Outages that never happened, plus a 7-day risk board that learns during the day |
| Incident Correlation | Correlation page; fibre and planned work | 412 alarms → 1 ticket; planned work never pages anyone |
| Revenue Protection | Revenue page; GITEX, bank SLA, SIM-box fraud | AED at risk now, protected today, SLA credits avoided |
| Overview | Operations | One screen: map, alarm river, approvals, agent feed, clock |
| Cell Site Management | Network page | Every site by status, vendor or technology; site history; watchlist |
| Autonomous Remediation | Remediation page and the incident rooms | The loop per incident (detect → verify), every action and who approved it |
| Security Operations | Security page; the storm | Attack or accident: never block real customers by mistake |
| Agent Observatory | Agents page | Restricted vs acting agents, hand-offs, decision log, guardrails |
| Analytics & Reports | Reports page | Shift handovers written by the Scribe; alarms and root-cause charts |
| Executive Intelligence | Executive page | The CTO brief, plus Ask the NOC with cited answers |
| Settings | Settings page | Autonomy per domain (TM Forum levels), confidence floor, alerts, team, integrations |

## Questions to expect

- **"Is this connected to our network?"** No. The network is simulated and fitted to du: three RAN vendors, MantaRay SMO, WaveSuite, 5G-A on n78 and n41, and real UAE places. The agents call the same kinds of systems a NOC already uses, and the pilot would connect read-only first.
- **"What stops it doing something stupid?"** Guardrails per domain. Irreversible, costly and customer-facing steps always ask. There is a confidence floor. Every step shows its evidence, and any engineer can reject.
- **"Where do the AED numbers come from?"** AED 4.4 per subscriber per day, from du's Q3 2026 revenue and subscriber base. SLA credits come from contract tables (simulated). The method is shown on the Revenue page.
- **"What would a pilot look like?"**
  - Start: one domain (transport or RAN) in Observe mode for 4 weeks, read-only, scored against the shift's own decisions.
  - Then: move that domain to Guardrails.
