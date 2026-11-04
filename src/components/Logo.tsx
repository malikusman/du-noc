/**
 * Placeholder mark until du's official logo file is added.
 * To use the real logo: put it at src/assets/du-logo.svg and set USE_OFFICIAL_LOGO to true.
 */
const USE_OFFICIAL_LOGO = false;

export function Logo() {
  return (
    <div className="flex items-center gap-3">
      {USE_OFFICIAL_LOGO ? null : (
        <span className="grad-bg relative inline-flex h-9 w-9 items-center justify-center rounded-xl text-[17px] font-extrabold tracking-tight text-white shadow-[0_6px_24px_rgb(var(--brand)/0.45)]">
          du
        </span>
      )}
      <div className="leading-none">
        <p className="text-[15px] font-bold tracking-tight text-ink">Autonomous NOC</p>
        <p className="mt-1 text-[10.5px] font-medium uppercase tracking-[0.16em] text-ink-4">powered by Scorpius</p>
      </div>
    </div>
  );
}
