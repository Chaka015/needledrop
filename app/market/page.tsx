import Link from "next/link";

export const metadata = { title: "Marketplace — NeedleDrop" };

const ROADMAP = [
  {
    num: "01",
    title: "Peer-to-peer sales",
    desc: "List your records directly to other collectors. No middleman, lower commission than Discogs.",
    when: "Coming 2026",
  },
  {
    num: "02",
    title: "Condition grading",
    desc: "Standardized VG+/NM/M grading system. Buyers know exactly what they're getting.",
    when: "Coming 2026",
  },
  {
    num: "03",
    title: "Pressing-level matching",
    desc: "List a specific pressing — country, year, label, catalog number. Buyers search by pressing.",
    when: "Coming 2026",
  },
];

export default function MarketPage() {
  return (
    <div className="min-h-screen" style={{ backgroundColor: "var(--skin-bg)", color: "var(--skin-text)" }}>
      <div className="ms-page">
        <Link href="/activity" className="ms-back">← Back to E-Zine</Link>

        {/* Hero */}
        <div style={{ textAlign: "center", maxWidth: 720, margin: "6px auto 0", padding: "14px 0" }}>
          <div className="ms-mkt-badge">
            <span className="d" />
            COMING SOON
          </div>
          <h1 className="ms-mkt-title">The Record<br />Marketplace</h1>
          <p className="ms-mkt-sub">
            Buy and sell records directly with other NeedleDrop collectors.
            Lower commission than Discogs, pressing-level detail, and a community
            that actually cares about the music — not just the grade.
          </p>

          {/* Waitlist */}
          <div className="ms-waitlist">
            <input type="email" placeholder="your@email.com" />
            <button className="ms-btn fill">Notify me</button>
          </div>
          <p className="ms-waitcount">Join the waitlist — be first to list and buy</p>
        </div>

        {/* Divider */}
        <div className="ms-mkt-div"><span>What we&apos;re building</span></div>

        {/* Roadmap */}
        <div className="ms-roadmap" style={{ marginBottom: 48 }}>
          {ROADMAP.map((r) => (
            <div key={r.num} className="ms-box">
              <div className="ms-pad">
                <div className="ms-road-num">{r.num}</div>
                <h3 className="ms-road-h">{r.title}</h3>
                <p className="ms-road-p">{r.desc}</p>
                <div className="ms-road-when">{r.when}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Preview listings — intentionally locked */}
        <div className="ms-mkt-div"><span>Preview — listings will look like this</span></div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 20, opacity: 0.55, pointerEvents: "none", userSelect: "none" }}>
          {PREVIEW_LISTINGS.map((l, i) => (
            <div key={i} className="ms-box">
              <div style={{ padding: "16px 16px 0", display: "grid", placeItems: "center" }}>
                <div style={{ width: 120, height: 120, background: "var(--skin-surface-raised)", borderRadius: 4, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <span style={{ fontFamily: "var(--font-nd-mono)", fontSize: 11, color: "var(--skin-subtle)" }}>cover</span>
                </div>
              </div>
              <div style={{ padding: "14px 16px 16px" }}>
                <div style={{ fontFamily: "var(--font-nd-serif)", fontSize: 17, fontWeight: 600, lineHeight: 1.12, color: "var(--skin-text)" }}>{l.title}</div>
                <div style={{ fontSize: 13, color: "var(--skin-muted)", marginTop: 1 }}>{l.artist}</div>
                <div style={{ display: "flex", gap: 8, margin: "12px 0", flexWrap: "wrap" }}>
                  <span className="ms-press catno" style={{ fontSize: 10 }}>Disc: <b style={{ color: "var(--skin-text)" }}>{l.disc}</b></span>
                  <span className="ms-press catno" style={{ fontSize: 10 }}>Sleeve: <b style={{ color: "var(--skin-text)" }}>{l.sleeve}</b></span>
                </div>
                <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 10, marginTop: 14, paddingTop: 12, borderTop: "1px solid var(--skin-line)" }}>
                  <div style={{ fontFamily: "var(--font-nd-serif)", fontSize: 24, fontWeight: 600, color: "var(--skin-hot)", lineHeight: 1 }}>
                    <span style={{ fontSize: 15, verticalAlign: 4 }}>$</span>{l.price}
                  </div>
                  <div style={{ fontSize: 11.5, color: "var(--skin-muted)", textAlign: "right" }}>
                    <div style={{ fontWeight: 700, color: "var(--skin-text)" }}>{l.seller}</div>
                    <div>{l.pressing}</div>
                  </div>
                </div>
                <div style={{ width: "100%", marginTop: 13, border: "1.5px dashed var(--skin-border)", borderRadius: 4, padding: 9, fontFamily: "var(--font-nd-mono)", fontSize: 10, letterSpacing: ".12em", textTransform: "uppercase", color: "var(--skin-subtle)", textAlign: "center", background: "var(--skin-sunk)" }}>
                  Available at launch
                </div>
              </div>
            </div>
          ))}
        </div>

        <div style={{ height: 60 }} />
      </div>
    </div>
  );
}

const PREVIEW_LISTINGS = [
  { title: "Maggot Brain", artist: "Funkadelic", disc: "VG+", sleeve: "VG+", price: "45", seller: "crate_diggr", pressing: "US 1971 · Westbound" },
  { title: "Blue", artist: "Joni Mitchell", disc: "NM", sleeve: "NM", price: "38", seller: "vinylhound", pressing: "CA 1971 · Reprise" },
  { title: "In Rainbows", artist: "Radiohead", disc: "M", sleeve: "M", price: "60", seller: "orangutan_sounds", pressing: "UK 2007 · XL" },
];
