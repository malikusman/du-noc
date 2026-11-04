# du Autonomous NOC · powered by Scorpius

A demo for du's NOC engineers showing how agentic AI runs inside a telecom Network Operations Centre. Nine agents watch a simulated du network. They turn alarm storms into single incidents and find root causes across RAN, transport, core, power and security. They act inside guardrails set per domain, ask an engineer when a step costs money or touches a customer, and close an incident only when the KPIs prove the fix.

The research and plan are in [`docs/PLAN.md`](docs/PLAN.md).

## Run it

```bash
npm install
npm run dev            # http://localhost:5173
```

Docker: `docker compose up` (dev server) or `docker compose -f docker-compose.prod.yml up --build` (nginx on port 80).

The app runs entirely in the browser and is deterministic, so it plays out the same way every time and works offline in the room.

## The day: Thursday of GITEX week

| Time | Incident | What it shows |
|---|---|---|
| 02:14 | **412 alarms, one fibre cut** (Jebel Ali) | Correlation: 412 alarms become 1 ticket. OTDR locates the cut, 34 of 38 sites are rerouted in 4 minutes, and the splicing crew is dispatched **with approval**. |
| 05:40 | Fog on the Abu Dhabi coast | Prevention: microwave traffic moves to fibre before the links fade. |
| 07:00 | Shift handover | The Scribe writes the night-shift handover (Reports). |
| 08:05 | Twelve core alarms that aren't an outage | The events are matched to a planned change, so no tickets are opened. |
| 09:40 | **A parameter change that made calls fail** (Sharjah) | No alarm fires. The KPI drop is linked to the change ticket, the parameters are rolled back and the fix is verified. A canary rule is learned. |
| 11:30 | 14 sites on battery (Hatta, Al Ain) | Load shedding, then generators go to the hospital site first **with approval**. |
| 13:20 | **GITEX is about to fill every cell** (DWTC) | A slice intent on MantaRay SMO, mirroring du's real agentic-slicing pilot with Nokia and AWS. |
| 16:10 | A bank's latency is creeping toward its SLA | The VPN fails over to another PE before the breach, and the account manager is briefed **with approval**. |
| 18:45 | **An attack, or a bug?** | A signalling storm from 61,000 smart meters. It is not DDoS: the meters get a back-off, nobody is blocked, and the customer is asked to pause its rollout **with approval**. |
| 19:00 | Shift handover | The day shift hands over to nights. |
| 21:20 | **A cell that says it's fine** (The Dubai Mall) | A sleeping cell with no alarm is detected, woken and proven. The agents then scan all indoor cells. |
| 23:10 | Europe just got 38 ms further away | A subsea fault: transit is rerouted and care gets an advisory. |

Bold rows open the incident room automatically.

## Presenting (about 10 minutes)

1. **Operations at 00:00.** Point out the three numbers, the alarm river and the agent feed. Press **Space**.
2. **02:14 fibre cut.** The room opens. Let the Correlator and Diagnostician run, then press **A** to approve the splicing crew.
3. Press **→** to jump between chapters. At **09:40** stress that no alarm ever fired.
4. **13:20 GITEX.** Tie it to du's live pilot of agentic slicing.
5. **18:45 storm.** Try **Reject** on the customer request to show the handover to engineers.
6. **21:20 sleeping cell.** End the story with "found what no alarm could".
7. Then visit **Reports** (shift handover), **Policy** (per-domain autonomy against TM Forum levels), **Agents**, **Knowledge** and **Security**.

Keys: `Space` play/pause · `→` next step or chapter · `A` approve · `Esc` close incident · `S` captions · `R` restart · `0–3` autonomy for all domains. The sun/moon button in the top bar switches between dark and light.

## How it is built

- React 18, TypeScript, Vite, Tailwind, Framer Motion and Recharts.
- Colours are CSS variables in `src/index.css`. Dark and light themes swap instantly.
- `scripts/generate-network.mjs` writes `src/sim/network.ts`: the UAE outline, 2,512 simulated sites, transport hubs and rings. Run it with `npm run generate:network`.
- `src/sim/` holds the simulation:
  - `incidents.ts`: the 10 incident scripts, step by step
  - `routine.ts`: small auto-fixes and security events
  - `alarms.ts`: the alarm river
  - `agents.ts`: agents, autonomy and guardrails
  - `knowledge.ts`: MOPs, policies, changes, past incidents
  - `progress.ts`: the state of each incident at any minute
- `src/state/sim.tsx` holds the clock, approvals, per-domain autonomy and the decision log.

## What is real and what is simulated

- **Real, from public sources (see the plan):**
  - du's scale: 9.5m mobile and 756k fixed subscribers.
  - Multi-vendor RAN (Huawei, Ericsson, Nokia), with MantaRay SMO and WaveSuite.
  - 5G-Advanced on n78 and n41, and indoor 5G-A in malls and venues.
  - The TM Forum L4 roadmap.
  - The agentic slicing pilot with Nokia and AWS.
  - Revenue per subscriber, derived from Q3 2026 results.
- **Simulated:**
  - The network itself: site count, names, vendor regions and topology.
  - Alarm volumes, the incidents, customers and change records.
  - System names in tool calls stand for the kinds of systems a NOC uses.

## Logo

`src/components/Logo.tsx` holds a placeholder mark. Add du's official logo at `src/assets/du-logo.svg` and switch the flag in that file.
