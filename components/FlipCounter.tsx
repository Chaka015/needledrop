"use client";

// Retro segmented/odometer display for total listening time
// Amber digits on near-black background, subtle glow — vintage airport board aesthetic

interface FlipCounterProps {
  totalMs: number; // total milliseconds
}

function pad(n: number, len = 2) {
  return String(n).padStart(len, "0");
}

function Digit({ char }: { char: string }) {
  return (
    <span
      className="inline-block text-center font-mono font-bold"
      style={{
        background: "#0D0B08",
        color: "#E8A030",
        textShadow: "0 0 8px #E8A03088, 0 0 16px #E8A03044",
        boxShadow: "inset 0 0 4px #000, 0 0 2px #E8A03033",
        border: "1px solid #2A2010",
        borderRadius: 2,
        padding: "2px 5px",
        fontSize: "1.4rem",
        lineHeight: 1.2,
        minWidth: "1.1ch",
        letterSpacing: "0.02em",
      }}
    >
      {char}
    </span>
  );
}

function Separator({ char }: { char: string }) {
  return (
    <span
      className="font-mono font-bold"
      style={{ color: "#6B5020", fontSize: "1.2rem", padding: "0 2px", lineHeight: 1.2 }}
    >
      {char}
    </span>
  );
}

export default function FlipCounter({ totalMs }: FlipCounterProps) {
  const totalMinutes = Math.floor(totalMs / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  const hoursStr = hours >= 1000 ? String(hours) : pad(hours, hours >= 100 ? 3 : 2);

  return (
    <div className="flex items-center gap-1.5" title={`${hours}h ${minutes}m total listening time`}>
      <div className="flex items-center gap-0.5">
        {hoursStr.split("").map((c, i) => <Digit key={i} char={c} />)}
      </div>
      <Separator char="h" />
      <div className="flex items-center gap-0.5">
        {pad(minutes).split("").map((c, i) => <Digit key={i} char={c} />)}
      </div>
      <Separator char="m" />
      <span
        className="text-xs font-mono ml-1"
        style={{ color: "#6B5020", letterSpacing: "0.05em" }}
      >
        on the needle
      </span>
    </div>
  );
}
