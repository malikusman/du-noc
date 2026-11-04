# du × Scorpius — "Autonomous NOC" demo: research & plan

_Prepared 4 Nov 2026. Status: plan, nothing built yet. Audience: du NOC operators (L1/L2 engineers, shift leads)._

## 1. Who du is (verified)

| Fact | Source |
|---|---|
| Emirates Integrated Telecommunications Co. (EITC). CEO Fahad Al Hassawi. **CTO Saleem AlBlooshi** (Telecom Review "CTO of the Year", Dec 2025). Abdulla Baghoum, head of technology operations (Oct 2024), is the likely NOC owner. | The National; Telecom Review; RCR Wireless |
| **Q3 2026** (21 Oct): revenue AED 4,145m (+7.1%), EBITDA AED 1,975m (47.7%), net profit AED 786m, capex AED 647m (+31.5%, data centres and network). **9.5m mobile** (2.0m postpaid / 7.4m prepaid), **756k fixed**. Licence renewed for 20 years. | du Q3 2026 press release |
| Units: du Business, du Tech (cloud/AI/data centres), du Pay, du Infra. | Telecom Review |
| **5G ~99% coverage**, 5G SA (2023), 5G-Advanced commercial (Jan 2024), VoNR (Feb 2025), "5G+" (Sept 2025), U6GHz (Oct 2026). 5G-A on n78 (3.7 GHz) and n41 (2.6 GHz) with Huawei 64T64R; indoor multi-band 5G-A in malls, airports, exhibition centres. | RCR Wireless; The National; Mubasher |
| Multi-vendor RAN: **Huawei** (5G-A, indoor), **Nokia** (AirScale, Cloud RAN, **MantaRay SMO**), **Ericsson** (5G RAN since 2021, mmWave). **Nokia WaveSuite AI** in transport/optical. | RCR Wireless; Telecom Review |
| **AI for the network:** TM Forum autonomous-network roadmap **to Level 4** (CTO, Dec 2025). **Agentic AI 5G-A slicing pilot with Nokia + AWS on a live network** (Feb 2026), covering mass events, weather surges, first responders, 5G+ / FWA SLAs. Arabic Telecom LLM for internal ops (Aug 2025). | Telecom Review |
| Five data centres; AED 2bn hyperscale DC with Microsoft; National Hypercloud (sovereign, UAE Cybersecurity Council certified). PEACE and SING subsea, UAE-IX, Oman Emirates Gateway. | RCR; The National; Mubasher |
| Stress events: Feb–Mar 2026 regional conflict (du kept operations "uninterrupted", BCP activated; handle indirectly), April 2024 floods, Sept 2025 Red Sea cable cuts (Gulf latency), GITEX every October at DWTC, A2RL private 5G (cars stop if latency breaches threshold). | The National; Telecom Review; Wikipedia |

**Not public (so we simulate and label it):** du's site count, vendor-by-region split, NOC location and size, OSS/ticketing stack, alarm volumes, MTTR.

**Derived anchor for revenue-at-risk:** Q3 revenue ÷ 92 days ≈ AED 45m/day, ÷ 10.26m subscribers ≈ **AED 4.4 per subscriber per day**. Enterprise SLA penalties are simulated on top.

## 2. Market context

- **Industry level:** TM Forum puts operators at about L1.5–2.1. "Level 4" certificates are usually single-domain. Published wins: China Mobile MTTR −50% (IP) and −87% (core); industry around −30% MTTR and −15% tickets; Elisa −80% customer-impacting incidents with a digital twin and agents; Rakuten says autonomous *remediation* is "still work in progress". Cisco: most operators want open loop first (the agent recommends, a human validates).
- **Table stakes:** alarm dedup and correlation, RCA suggestions, energy saving, a chat assistant, single-domain closed loops.
- **What nobody clearly shows (our wedge):**
  1. **Cross-domain** reasoning across RAN, transport, core, IT and security in one incident.
  2. A fix **proven by KPIs** (traffic returns, CSSR recovers), with auto-rollback or escalation if it isn't.
  3. Finding what **raises no alarm**: sleeping cells and silent degradation.
  4. **Change-aware** operations: most outages follow a change, so link KPI drops to the change ticket and roll back.
  5. Autonomy by domain, mapped to du's own TM Forum **L4 roadmap**.
  6. **Customer-aware** actions: enterprise SLAs, 5G+ and FWA, VIP venues, critical sites (hospitals, airports).

## 3. What we already have

**`noc` repo (Scorpius NOC demo, June 2026)** is a static React/shadcn app with 11 pages. Problems for du:
- **Saudi-centric data:** Riyadh, Jeddah, Dammam, with USD and $ revenue.
- **It reads like a BI dashboard:** KPI cards, charts, tables. Nothing moves in time, and agents are text summaries.
- **No human decision moment, no proof, no story.**

Worth keeping from it:
- Its incident ideas: battery controller, planned MSC upgrade masking as a fault, fibre cuts, config drift, backhaul, DDoS.
- The restricted/unrestricted agent and A2A framing (from Ericsson's white paper).
- The production deploy setup (nginx multi-stage, GitHub Actions to the droplet).

**charge&go Autopilot** (the one that looked good) gives us the patterns to reuse:
- A deterministic 24-hour sim clock with director keys.
- An incident room with step cards: observe → hypothesise → test → plan → act → verify → learn.
- An autonomy dropdown with an approvals inbox, and Approve / Reject that escalates to a human team.
- Knowledge citations, and a report built from what actually happened.

**Recommendation:** build a new app in `du-noc`. Reuse the charge&go sim/incident-room architecture and the noc repo's deploy pipeline. Make it frontend-only (deterministic, works offline in the room); a live "ask the NOC" bar can come later.

## 4. Concept: "du Autonomous NOC, powered by Scorpius"

**One line:** _The agents take the alarm storm. Your engineers take the decisions._

**Positioning for operators** (not "AI replaces the NOC"): agents do the L1 triage, correlation and paperwork. Engineers approve anything risky and see every step the agents took. Each domain gets an autonomy level, and the operator controls it.

**Frame: "One shift in the du NOC: GITEX Thursday."** A full 24-hour day, replayed in about 10 minutes, with the presenter controlling the clock. GITEX at DWTC is a du-owned moment, and their real agentic-slicing pilot covers exactly this mass-event case.

| Time | Incident | Domain | Sidebar section it proves | What the agents do |
|---|---|---|---|---|
| 02:14 | **Fibre cut, Dubai South / Jebel Ali** (contractor excavation). 412 alarms across 38 sites. | Transport → RAN | Incident Correlation | Collapse 412 alarms into 1 incident in seconds. OTDR places the cut 3.2 km from the hub; traffic reroutes over the ring (WaveSuite). A field team is dispatched with GPS. Verified when the alarms clear. |
| 05:50 | **Coastal fog, Abu Dhabi**: microwave links fading (ACM downshift) | Transport | Downtime Prevention | Predict a link drop 40 min ahead and pre-shift traffic. No customer impact. |
| 08:05 | **Planned upgrade masking as a fault** (CHG-…, core node). 12 events. | Core | Incident Correlation | Match the events to the change calendar, downgrade to "expected", and suppress tickets. |
| 09:40 | **Change gone wrong, Sharjah cluster**: a Nokia parameter push makes CSSR drop 4% | RAN | Autonomous Remediation | Link the KPI drop to CHG-…, roll back the parameters (inside the guardrail), and verify CSSR recovers. Cited MOP. |
| 11:30 | **Grid dip, Hatta / Al Ain**: sites on battery, 46 °C | Power | Downtime Prevention | Predict battery autonomy per site and rank generator dispatch by subscribers and critical sites (hospital). **Approval needed** (truck roll). |
| 13:30 | **★ GITEX surge, DWTC**: PRB 93%, 5G+ users' throughput dropping | RAN / slicing | Revenue Protection | Forecast the surge, apply a slice policy (VIP, payments, broadcast; mirrors du's pilot) and activate capacity cells. Proven by throughput. |
| 16:10 | **Enterprise SLA, DIFC bank SD-WAN**: latency breach | Enterprise / IP | Revenue Protection | SLA clock in AED. Reroute, notify the customer's account manager before they call. |
| 18:45 | **★ IoT signalling storm**: a smart-meter firmware push causes mass re-attach and core MME/AMF load | RAN + Core + Security | Security Operations | Tell an attack apart from a bug (one device type, one firmware). Throttle that APN/slice, open a vendor case, hold the firmware rollout. **Approval.** Cross-domain hero. |
| 21:20 | **★ Sleeping cell, Dubai Mall indoor 5G-A**: no alarm, zero traffic for 47 min at peak | RAN | Cell Site Management | Detect it from the KPI gap versus neighbours and last week, reset the cell, verify traffic returns. "No alarm ever fired." |
| 23:40 | **Red Sea cable degradation**: international latency to Asia/EU up | International | Executive Intelligence | Reroute transit via an alternate system, and give care agents an advisory. |
| 06:00 | **Shift handover** | — | Analytics & Reports | Written by the agents for the incoming shift and the CTO, in English or Arabic. |

Plus the "quiet autonomy" background: VSWR resets, cell lock/unlock, license alarms, ticket auto-closes. Each collapses into the counter "handled without a ticket".

## 5. Screens

The nav is reorganised from their sidebar. All sections are kept, and some are merged so the story flows.

1. **Operations (home):** a full-bleed dark UAE map with ~9,800 simulated sites by vendor. Alongside it:
   - The **alarm river**: raw alarms → deduplicated → incidents, with live counters such as 48k → 1.2k → 9.
   - The agent feed, the approvals inbox, the clock and the autonomy control.
2. **Incidents:** correlation view (the storm collapsing into one root cause), the incident room (step-by-step reasoning, tool calls into ENM / NetAct / U2020 / MantaRay / WaveSuite / ticketing), and Approve / Reject.
3. **Network:** sites and cells (Cell Site Management), health by domain, sleeping-cell watchlist and predictions (Downtime Prevention).
4. **Security:** SOC view. The signalling storm and a DDoS on DNS, with "attack or bug?" reasoning.
5. **Agents:** observatory, A2A hand-offs, guardrail matrix and decision log.
6. **Knowledge:** MOPs, vendor bulletins, the change calendar, past incidents, and "rules learned today".
7. **Reports:** shift handover, revenue protected (AED), MTTR, alarms-to-tickets ratio and the executive brief.
8. **Policy** (replaces Settings): autonomy **per domain** (RAN, Transport, Core, IT, Security), shown against TM Forum L2 → L4.

**Design:** dark NOC video-wall theme with du-like brand accents, motion from time (clock, alarm river, confidence bars, arriving evidence), at most 3 headline numbers per screen, and one human action per incident. One honest badge: "Simulated network".

## 6. Agents

- **Sentinel:** watches KPIs and predicts.
- **Correlator:** alarm storm → incident.
- **Diagnostician:** hypotheses and tests.
- **Planner:** options, risk, MOP, change window.
- **Operator:** executes via the EMS/SMO/ticketing tools.
- **Verifier:** KPI proof, then rollback or escalate.
- **Liaison:** enterprise customers, care and the du app status.
- **Guardian:** security.
- **Scribe:** shift handover.

## 7. Build plan

1. **Story lock (½ day):** confirm the decisions below.
2. **Network generator and sim engine (1–2 days):** sites and cells across the 7 emirates, KPIs, the alarm generator, the change calendar, the timeline.
3. **Incident scripts and agent steps (2 days):** the 10 incidents above, with tool calls and citations.
4. **UI (3–4 days):** map, alarm river, incident room, network, security, agents, knowledge, reports, policy, director keys.
5. **Polish and deploy (1 day):** timings, offline build, Docker / nginx, a fallback recording.

## 8. Open decisions

- Theme: dark NOC wall versus light (charge&go style).
- Story frame: GITEX Thursday (recommended), summer heat day, or New Year's Eve.
- Branding: du logo and colours (we need the official asset from them) versus neutral "Scorpius for du".
- Arabic toggle for the shift handover.

## Sources

- du Q3 2026 results: https://static.mubasher.info/File.Mix_Announcement_File/F1BA5667-9C5F-47A3-A7AB-212875043C64.PDF
- CTO interview (L4 roadmap, RedCap, A2RL): https://www.telecomreview.com/articles/exclusive-interviews/28004-beyond-connectivity-dus-cto-on-turning-networks-into-ai-enablers/
- Agentic slicing pilot with Nokia and AWS: https://www.telecomreview.com/articles/telecom-vendors/28411-du-and-orange-pilot-nokia-and-awss-breakthrough-in-agentic-ai-5g-a-slicing/
- Nokia deal and Abdulla Baghoum: https://rcrwireless.com/20241024/5g/du-announces-expanded-5g-deal-nokia
- 5G-A deployment: https://rcrwireless.com/20241101/featured/du-has-already-deployed-hundreds-of-5g-a-base-stations-in-uae
- Huawei 5G-A n78/n41: https://rcrwireless.com/20250815/5g/du-huawei-5g
- Nokia WaveSuite AI: https://www.telecomreview.com/articles/telecom-operators/26600-du-pioneers-ai-assisted-network-management-with-nokias-wavesuite-ai/
- Arabic Telecom LLM: https://www.telecomreview.com/articles/telecom-operators/25852-du-leads-ai-innovation-with-first-arabic-telecom-llm/
- Microsoft data centre: https://rcrwireless.com/20250428/data-center-2/du-ai-data-microsoft
- Industry autonomy levels and MTTR: https://rcrwireless.com/20260519/carriers/road-to-level-4-point-solutions-wall-to-wall-autonomy-tm-forum
- Elisa: https://rcrwireless.com/20260707/5g/elisa-ai-automation
- Rakuten: https://www.rcrwireless.com/20260723/carriers/agentic-network-rakuten-mobile
- Cisco on trust: https://www.rcrwireless.com/20260721/carriers/cisco-trust-autonomous-operations
- Regional conflict and continuity: https://www.thenationalnews.com/future/technology/2026/04/22/du-maintains-full-year-guidance-despite-geopolitical-uncertainty/
