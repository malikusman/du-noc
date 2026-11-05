import { AnimatePresence, motion } from "framer-motion";
import { Play } from "lucide-react";
import { ACTS } from "@/sim/story";
import { TOTAL_SITES } from "@/sim/sites";
import { useSim } from "@/state/sim";
import { num } from "@/lib/format";

/** Title card before the day starts. Space or the button begins the story. */
export function Intro() {
  const { state, play } = useSim();
  const show = state.t < 0.01 && !state.playing && !state.room;
  const stats = [
    { value: num(TOTAL_SITES), label: "sites across 7 emirates" },
    { value: "9.5m", label: "mobile customers" },
    { value: "2", label: "engineers on the night shift" },
    { value: "9", label: "agents working with them" },
  ];
  return (
    <AnimatePresence>
      {show && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, transition: { duration: 0.6 } }}
          className="fixed bottom-0 right-0 top-0 z-[60] flex items-center justify-center bg-bg/80 backdrop-blur-md" style={{ left: "var(--sb)" }}>
          <div className="w-full max-w-[880px] px-10">
            <motion.p initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="text-[12px] font-semibold uppercase tracking-[0.2em] text-brand">Thursday · GITEX week · Dubai</motion.p>
            <motion.h1 initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="mt-4 text-[56px] font-extrabold leading-[1.02] tracking-tightest text-ink">
              One day in the <span className="grad-text">du NOC</span>.
            </motion.h1>
            <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.35 }} className="mt-5 max-w-[680px] text-[18px] leading-7 text-ink-2">
              The agents take the alarm storm. Your engineers take the decisions. Every fix is proven by the network itself.
            </motion.p>
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }} className="mt-10 grid grid-cols-4 gap-4">
              {stats.map((s) => (
                <div key={s.label} className="card px-5 py-4">
                  <p className="font-mono text-[30px] font-semibold leading-none text-ink">{s.value}</p>
                  <p className="mt-2 text-[12.5px] text-ink-3">{s.label}</p>
                </div>
              ))}
            </motion.div>
            <motion.ol initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.7 }} className="mt-8 grid grid-cols-4 gap-4">
              {ACTS.map((a) => (
                <li key={a.id} className="border-t border-line pt-3">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-4">{a.name}</p>
                  <p className="mt-1 text-[14px] font-semibold text-ink">{a.theme}</p>
                </li>
              ))}
            </motion.ol>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.9 }} className="mt-10 flex items-center gap-4">
              <button type="button" onClick={() => play(true)} className="btn-primary px-7 py-3 text-[16px]"><Play className="h-4 w-4" fill="currentColor" /> Start the day</button>
              <span className="text-[13px] text-ink-4">or press Space · → jumps to the next moment · A approves</span>
            </motion.div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
