"use client";

import { useState } from "react";

const C = {
  surface:       "var(--skin-surface)",
  surfaceRaised: "var(--skin-surface-raised)",
  border:        "var(--skin-border)",
  text:          "var(--skin-text)",
  muted:         "var(--skin-muted)",
  subtle:        "var(--skin-subtle)",
  accent:        "var(--skin-accent)",
};

const RELEASE_TYPES = [
  { key: "Album", label: "Albums" },
  { key: "Single", label: "Singles" },
  { key: "EP", label: "EPs" },
  { key: "Live", label: "Live" },
  { key: "Compilation", label: "Compilations" },
];

export interface DiscographyRelease {
  id: string;
  title: string;
  date?: string;
  "primary-type"?: string;
}

function CoverImg({ mbid, title }: { mbid: string; title: string }) {
  const [failed, setFailed] = useState(false);
  if (failed) {
    return (
      <div style={{ width: 40, height: 40, backgroundColor: C.surfaceRaised, borderRadius: 4, flexShrink: 0 }} />
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={`https://coverartarchive.org/release-group/${mbid}/front-250`}
      alt={title}
      onError={() => setFailed(true)}
      style={{ width: 40, height: 40, borderRadius: 4, objectFit: "cover", flexShrink: 0 }}
    />
  );
}

export default function ArtistDiscography({ releases }: { releases: DiscographyRelease[] }) {
  const grouped: Record<string, DiscographyRelease[]> = {};
  for (const r of releases) {
    const type = r["primary-type"] ?? "Other";
    if (!grouped[type]) grouped[type] = [];
    grouped[type].push(r);
  }
  for (const key of Object.keys(grouped)) {
    grouped[key].sort((a, b) => (b.date ?? "").localeCompare(a.date ?? ""));
  }

  if (Object.keys(grouped).length === 0) {
    return (
      <p className="text-xs font-mono" style={{ color: C.subtle }}>No releases found on MusicBrainz.</p>
    );
  }

  return (
    <>
      {RELEASE_TYPES.filter((t) => grouped[t.key]?.length).map(({ key, label }) => (
        <div key={key} className="mb-8">
          <h3 className="text-xs font-mono uppercase tracking-widest mb-3" style={{ color: C.muted }}>{label}</h3>
          <div className="space-y-1">
            {grouped[key].map((r) => (
              <div key={r.id} className="flex items-center gap-3 p-3"
                style={{ backgroundColor: C.surface, border: `1px solid ${C.border}` }}>
                <CoverImg mbid={r.id} title={r.title} />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold truncate" style={{ color: C.text }}>{r.title}</div>
                  {r.date && (
                    <div className="text-xs font-mono" style={{ color: C.subtle }}>{r.date.slice(0, 4)}</div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </>
  );
}
