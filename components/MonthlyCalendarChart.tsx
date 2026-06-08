"use client";

import { useState } from "react";
import Image from "next/image";

const C = {
  surface:       "var(--skin-surface)",
  surfaceRaised: "var(--skin-surface-raised)",
  border:        "var(--skin-border)",
  text:          "var(--skin-text)",
  muted:         "var(--skin-muted)",
  subtle:        "var(--skin-subtle)",
  accent:        "var(--skin-accent)",
  accentHover:   "var(--skin-accent-hover)",
  sunk:          "var(--skin-sunk, var(--skin-surface-raised))",
  line:          "var(--skin-line, var(--skin-border))",
};

export interface DayLog {
  title: string;
  artist: string;
  coverUrl: string | null;
  format: string | null;
  source: string;
  rating: number | null;
}

export interface DailyData {
  [dateKey: string]: DayLog[]; // key: "YYYY-MM-DD"
}

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function getMonthGrid(year: number, month: number): (number | null)[] {
  // month is 0-indexed
  const firstDay = new Date(year, month, 1).getDay(); // 0=Sun
  // Convert to Mon-first: Sun(0)→6, Mon(1)→0, Tue(2)→1, ...
  const offset = (firstDay + 6) % 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (number | null)[] = [];
  for (let i = 0; i < offset; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  // Pad to full weeks
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

function fmt(dateKey: string) {
  const [, m, d] = dateKey.split("-");
  const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  return `${months[parseInt(m) - 1]} ${parseInt(d)}`;
}

function intensityOpacity(count: number, max: number): number {
  if (count === 0) return 0;
  const ratio = count / max;
  return ratio < 0.25 ? 0.18 : ratio < 0.5 ? 0.38 : ratio < 0.75 ? 0.62 : 0.88;
}

export default function MonthlyCalendarChart({
  dailyData,
  year,
  month,
}: {
  dailyData: DailyData;
  year: number;
  month: number; // 0-indexed
}) {
  const [hovered, setHovered] = useState<string | null>(null);

  const cells = getMonthGrid(year, month);
  const monthName = new Date(year, month, 1).toLocaleString("default", { month: "long", year: "numeric" });

  const max = Math.max(
    ...Object.values(dailyData).map((v) => v.length),
    1
  );

  const hoveredLogs = hovered ? (dailyData[hovered] ?? []) : [];

  function pad(n: number) { return String(n).padStart(2, "0"); }

  function handleEnter(day: number) {
    const key = `${year}-${pad(month + 1)}-${pad(day)}`;
    setHovered(key);
  }

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 240px", gap: 0, border: `1px solid ${C.border}`, backgroundColor: C.surface }}>
      {/* Left: calendar */}
      <div
        style={{
          padding: 16,
          borderRight: `1px solid ${C.border}`,
        }}
      >
        {/* Month heading */}
        <div
          style={{
            fontFamily: "var(--font-nd-mono)",
            fontSize: 11,
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            color: C.muted,
            marginBottom: 12,
          }}
        >
          {monthName}
        </div>

        {/* Day-of-week headers */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 4, marginBottom: 4 }}>
          {DAYS.map((d) => (
            <div
              key={d}
              style={{
                fontFamily: "var(--font-nd-mono)",
                fontSize: 9,
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                color: C.subtle,
                textAlign: "center",
                paddingBottom: 4,
              }}
            >
              {d}
            </div>
          ))}
        </div>

        {/* Calendar grid */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 4 }}>
          {cells.map((day, i) => {
            if (day === null) {
              return <div key={`empty-${i}`} style={{ aspectRatio: "1", borderRadius: 3 }} />;
            }
            const key = `${year}-${pad(month + 1)}-${pad(day)}`;
            const count = (dailyData[key] ?? []).length;
            const isHovered = hovered === key;

            return (
              <div
                key={key}
                onMouseEnter={() => handleEnter(day)}
                onMouseLeave={() => setHovered(null)}
                style={{
                  aspectRatio: "1",
                  borderRadius: 3,
                  position: "relative",
                  cursor: count > 0 ? "pointer" : "default",
                  border: isHovered ? `1px solid var(--skin-accent)` : `1px solid ${C.border}`,
                  backgroundColor: C.sunk,
                  transition: "border-color 100ms",
                  overflow: "hidden",
                }}
              >
                {/* Accent intensity overlay — separate layer so text stays full opacity */}
                {count > 0 && (
                  <div style={{
                    position: "absolute",
                    inset: 0,
                    backgroundColor: "var(--skin-accent)",
                    opacity: intensityOpacity(count, max),
                    pointerEvents: "none",
                  }} />
                )}
                {/* Text layer */}
                <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", justifyContent: "space-between", padding: "4px 5px" }}>
                  <span style={{
                    fontFamily: "var(--font-nd-mono)",
                    fontSize: 10,
                    color: count > 0 ? C.text : C.subtle,
                    fontWeight: count > 0 ? 700 : 400,
                    lineHeight: 1,
                  }}>
                    {day}
                  </span>
                  {count > 0 && (
                    <span style={{
                      fontFamily: "var(--font-nd-mono)",
                      fontSize: 9,
                      color: C.accent,
                      fontWeight: 700,
                      lineHeight: 1,
                      alignSelf: "flex-end",
                    }}>
                      {count}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Legend */}
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 12, justifyContent: "flex-end" }}>
          <span style={{ fontFamily: "var(--font-nd-mono)", fontSize: 9, color: C.subtle, textTransform: "uppercase", letterSpacing: "0.08em" }}>Less</span>
          {[0, 0.18, 0.38, 0.62, 0.88].map((op, i) => (
            <div
              key={i}
              style={{
                width: 10,
                height: 10,
                borderRadius: 2,
                position: "relative",
                backgroundColor: C.sunk,
                border: `1px solid ${C.border}`,
                overflow: "hidden",
              }}
            >
              {op > 0 && (
                <div style={{ position: "absolute", inset: 0, backgroundColor: "var(--skin-accent)", opacity: op }} />
              )}
            </div>
          ))}
          <span style={{ fontFamily: "var(--font-nd-mono)", fontSize: 9, color: C.subtle, textTransform: "uppercase", letterSpacing: "0.08em" }}>More</span>
        </div>
      </div>

      {/* Right: day detail panel */}
      <div style={{ display: "flex", flexDirection: "column" }}>
        {/* Panel header */}
        <div
          style={{
            backgroundColor: hovered ? "var(--skin-accent)" : C.surfaceRaised,
            color: hovered ? "var(--skin-accent-ink, #fff)" : C.subtle,
            fontFamily: "var(--font-nd-mono)",
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: "0.1em",
            textTransform: "uppercase",
            padding: "9px 12px",
            borderBottom: `1px solid ${C.border}`,
            transition: "background-color 100ms, color 100ms",
            flexShrink: 0,
          }}
        >
          {hovered ? fmt(hovered) : "Hover a day"}
        </div>

        <div style={{ overflowY: "auto", flex: 1 }}>
          {!hovered ? (
            <div style={{ padding: "16px 12px", fontFamily: "var(--font-nd-mono)", fontSize: 10, color: C.subtle, textTransform: "uppercase", letterSpacing: "0.08em", lineHeight: 1.6 }}>
              Hover any day to see listens
            </div>
          ) : hoveredLogs.length === 0 ? (
            <div style={{ padding: "12px", fontFamily: "var(--font-nd-mono)", fontSize: 11, color: C.subtle }}>
              No listens logged
            </div>
          ) : (
            hoveredLogs.map((log, i) => (
              <div
                key={i}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "9px 12px",
                  borderBottom: i < hoveredLogs.length - 1 ? `1px solid ${C.line}` : "none",
                }}
              >
                {log.coverUrl ? (
                  <Image
                    src={log.coverUrl}
                    alt={log.title}
                    width={36}
                    height={36}
                    unoptimized
                    style={{ width: 36, height: 36, borderRadius: 3, objectFit: "cover", flexShrink: 0 }}
                  />
                ) : (
                  <div style={{ width: 36, height: 36, borderRadius: 3, backgroundColor: C.surfaceRaised, flexShrink: 0 }} />
                )}
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: C.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {log.title}
                  </div>
                  <div style={{ fontFamily: "var(--font-nd-mono)", fontSize: 10, color: C.muted, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", marginTop: 1 }}>
                    {log.artist}
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 5, marginTop: 3 }}>
                    <span style={{
                      fontFamily: "var(--font-nd-mono)",
                      fontSize: 9,
                      letterSpacing: "0.1em",
                      textTransform: "uppercase",
                      color: C.subtle,
                      border: `1px solid ${C.border}`,
                      borderStyle: log.source === "streaming" ? "dashed" : "solid",
                      borderRadius: 2,
                      padding: "1px 4px",
                    }}>
                      {log.source === "streaming" ? "▶ stream" : (log.format ?? "vinyl")}
                    </span>
                    {log.rating !== null && (
                      <span style={{ fontFamily: "var(--font-nd-mono)", fontSize: 9, color: "var(--skin-star, #f3a712)" }}>
                        {"★".repeat(Math.round(log.rating))}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
