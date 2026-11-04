import type { Config } from "tailwindcss";

const v = (name: string) => `rgb(var(--${name}) / <alpha-value>)`;

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: v("bg"),
        panel: v("panel"),
        raised: v("raised"),
        line: v("line"),
        ink: { DEFAULT: v("ink"), 2: v("ink-2"), 3: v("ink-3"), 4: v("ink-4") },
        brand: { DEFAULT: v("brand"), 2: v("brand-2"), 3: v("brand-3"), soft: v("brand-soft") },
        good: v("good"),
        warn: v("warn"),
        bad: v("bad"),
        info: v("info"),
      },
      fontFamily: {
        sans: ["Inter Variable", "Inter", "Helvetica Neue", "Arial", "sans-serif"],
        mono: ["JetBrains Mono", "SFMono-Regular", "Menlo", "monospace"],
      },
      letterSpacing: { tightest: "-0.045em" },
      keyframes: {
        ping2: { "0%": { transform: "scale(1)", opacity: "0.45" }, "100%": { transform: "scale(1.5)", opacity: "0" } },
        dots: { "0%, 20%": { opacity: "0.2" }, "50%": { opacity: "1" }, "100%": { opacity: "0.2" } },
        flow: { "0%": { transform: "translateX(-10%)", opacity: "0" }, "15%": { opacity: "1" }, "85%": { opacity: "1" }, "100%": { transform: "translateX(110%)", opacity: "0" } },
        sweep: { "0%": { transform: "rotate(0deg)" }, "100%": { transform: "rotate(360deg)" } },
      },
      animation: {
        ping2: "ping2 1.8s cubic-bezier(0,0,0.2,1) infinite",
        dots: "dots 1.2s infinite",
        sweep: "sweep 6s linear infinite",
      },
    },
  },
  plugins: [],
} satisfies Config;
