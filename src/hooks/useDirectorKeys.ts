import { useEffect, useRef } from "react";
import { useSim } from "@/state/sim";
import type { AutonomyLevel } from "@/sim/types";

/**
 * Presenter keys: Space play/pause · → next step or chapter · Esc leave incident · A approve
 * R restart · S captions · 0–3 autonomy for every domain.
 */
export function useDirectorKeys() {
  const sim = useSim();
  const ref = useRef(sim);
  ref.current = sim;

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement;
      if (target && ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName)) return;
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      const s = ref.current;
      const room = s.state.room ? s.incidents.find((i) => i.incident.id === s.state.room) : undefined;
      const waiting = room?.steps.find((x) => x.status === "waiting");
      const liveNext = room?.next && room.next.status === "pending" && room.next.step.t <= room.incident.liveUntil;
      switch (event.key) {
        case " ":
          event.preventDefault();
          if (room) s.pauseRoom();
          else s.play();
          break;
        case "ArrowRight":
          event.preventDefault();
          if (room) {
            if (liveNext) s.skipRoom();
            else if (!waiting) s.closeRoom();
          } else s.nextChapter();
          break;
        case "Escape":
          if (room) s.closeRoom();
          break;
        case "a":
        case "A":
          if (waiting) s.approve(waiting.step.id);
          break;
        case "r":
        case "R":
          s.reset();
          break;
        case "s":
        case "S":
          s.toggleCaptions();
          break;
        case "0":
        case "1":
        case "2":
        case "3":
          s.setAllLevels(Number(event.key) as AutonomyLevel);
          break;
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
}
