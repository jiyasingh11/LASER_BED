import { useState } from "react";

export default function AlarmButton({
  onClick,
  disabled = false,
  label = "TRIGGER ALARM",
  subLabel = "Bed Exit",
  active = true
}) {
  const [rippleId, setRippleId] = useState(0);

  const handleClick = () => {
    setRippleId((prev) => prev + 1);
    onClick?.();
  };

  return (
    <div className="relative flex items-center justify-center">
      <button
        type="button"
        onClick={handleClick}
        disabled={disabled}
        className={`group relative h-52 w-52 overflow-hidden rounded-full border text-white transition-all duration-200 md:h-64 md:w-64 ${
          disabled
            ? "cursor-not-allowed border-elder-line bg-elder-panelSoft opacity-60"
            : "border-elder-danger/80 bg-gradient-to-b from-rose-500 to-red-700 shadow-alarm hover:scale-[1.02] active:scale-95"
        } ${active && !disabled ? "animate-pulseSoft" : ""}`}
      >
        <span className="relative z-10 flex h-full w-full flex-col items-center justify-center px-6 text-center">
          <span className="brand-font text-2xl font-bold tracking-wide md:text-3xl">{label}</span>
          <span className="mt-2 text-sm font-medium uppercase tracking-[0.22em] text-red-100">{subLabel}</span>
        </span>

        {rippleId > 0 && !disabled && (
          <span
            key={rippleId}
            className="pointer-events-none absolute inset-0 m-auto h-24 w-24 rounded-full border border-red-200/80 animate-ripple"
          />
        )}
      </button>
    </div>
  );
}
