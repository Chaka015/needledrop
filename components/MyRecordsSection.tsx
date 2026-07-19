"use client";

import { useState } from "react";
import CollectionGrid from "./CollectionGrid";
import AddToCollection from "./AddToCollection";
import ImportDiscogs from "./ImportDiscogs";

const C = {
  surface:       "var(--skin-surface)",
  surfaceRaised: "var(--skin-surface-raised)",
  border:        "var(--skin-border)",
  text:          "var(--skin-text)",
  muted:         "var(--skin-muted)",
  subtle:        "var(--skin-subtle)",
  accent:        "var(--skin-accent)",
  accentHover:   "var(--skin-accent-hover)",
};

interface Album {
  discogsId: string;
  title: string;
  artist: string;
  artistMbid: string | null;
  releaseYear: number | null;
  coverUrl: string | null;
  label: string | null;
  genre: string | null;
}

interface CollectionItem {
  id: string;
  isFeatured: boolean;
  album: Album;
}

type Panel = "add" | "import" | null;

export default function MyRecordsSection({
  items,
  totalCount,
}: {
  items: CollectionItem[];
  totalCount: number;
}) {
  const [panel, setPanel] = useState<Panel>(null);

  function toggle(p: Panel) {
    setPanel((prev) => (prev === p ? null : p));
  }

  return (
    <div className="ms-box">
      {/* Bar */}
      <div
        className="ms-bar"
        style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}
      >
        <span>
          My Records{" "}
          <span className="cta">{totalCount} total</span>
        </span>
        <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
          <button
            onClick={() => toggle("add")}
            className="text-xs font-mono transition-colors duration-100"
            style={{
              padding: "4px 10px",
              backgroundColor: panel === "add" ? C.accent : C.surfaceRaised,
              color: panel === "add" ? C.text : C.muted,
              border: `1px solid ${panel === "add" ? C.accent : C.border}`,
              borderRadius: 4,
            }}
            onMouseEnter={(e) => {
              if (panel !== "add") e.currentTarget.style.color = C.text;
            }}
            onMouseLeave={(e) => {
              if (panel !== "add") e.currentTarget.style.color = C.muted;
            }}
          >
            + DIG
          </button>
          <button
            onClick={() => toggle("import")}
            className="text-xs font-mono transition-colors duration-100"
            style={{
              padding: "4px 10px",
              backgroundColor: panel === "import" ? C.accent : C.surfaceRaised,
              color: panel === "import" ? C.text : C.muted,
              border: `1px solid ${panel === "import" ? C.accent : C.border}`,
              borderRadius: 4,
            }}
            onMouseEnter={(e) => {
              if (panel !== "import") e.currentTarget.style.color = C.text;
            }}
            onMouseLeave={(e) => {
              if (panel !== "import") e.currentTarget.style.color = C.muted;
            }}
          >
            ↓ DISCOGS
          </button>
        </div>
      </div>

      {/* Expandable panels */}
      {panel === "add" && (
        <div
          style={{
            padding: "16px",
            borderBottom: `1px solid ${C.border}`,
          }}
        >
          <AddToCollection />
        </div>
      )}
      {panel === "import" && (
        <div
          style={{
            padding: "16px",
            borderBottom: `1px solid ${C.border}`,
          }}
        >
          <ImportDiscogs />
        </div>
      )}

      <div className="ms-pad">
        <CollectionGrid items={items} />
      </div>
    </div>
  );
}
