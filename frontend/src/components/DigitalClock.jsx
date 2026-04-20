import React from "react";

export default function DigitalClock({ now }) {
  // Format with leading zeros
  const pad = (n) => n.toString().padStart(2, "0");
  const hours = pad(now.getHours());
  const minutes = pad(now.getMinutes());
  const seconds = pad(now.getSeconds());
  const dateStr = now.toLocaleDateString();

  return (
    <div className="digital-clock flex flex-col items-center justify-center select-none">
      <span className="text-base font-medium text-black mb-1 animate-fade-in">{dateStr}</span>
      <span
        className="text-3xl sm:text-4xl md:text-5xl font-mono font-bold text-indigo-700 bg-white/80 px-6 py-2 rounded-xl shadow-lg tracking-widest animate-clock-glow"
        style={{ letterSpacing: "0.15em" }}
      >
        {hours}:{minutes}:<span className="animate-blink">{seconds}</span>
      </span>
    </div>
  );
}
