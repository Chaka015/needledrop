"use client";

import { useState } from "react";
import { MS_ACCENTS, SKINS, buildSkinId, parseSkinId, skinToVars, DEFAULT_SKIN_ID } from "@/lib/skins";
import type { ThemeMode } from "@/lib/skins";

interface Props {
  currentSkin: string | null;
  onSave?: (skinId: string) => void; // called after DB save succeeds
}

export default function SkinPicker({ currentSkin, onSave }: Props) {
  const parsed = parseSkinId(currentSkin ?? DEFAULT_SKIN_ID);
  const [accent, setAccent] = useState(parsed.accent);
  const [mode, setMode] = useState<ThemeMode>(parsed.mode);
  const [saving, setSaving] = useState(false);

  // Immediately apply new skin vars to the document for live preview
  function applyPreview(newAccent: string, newMode: ThemeMode) {
    const skinId = buildSkinId(newAccent, newMode);
    const skin = SKINS[skinId];
    if (!skin) return;
    const el = document.documentElement;
    Object.entries(skinToVars(skin)).forEach(([k, v]) => el.style.setProperty(k, v));
  }

  function handleAccent(id: string) {
    setAccent(id);
    applyPreview(id, mode);
  }

  function handleMode(m: ThemeMode) {
    setMode(m);
    applyPreview(accent, m);
  }

  async function handleSave() {
    const skinId = buildSkinId(accent, mode);
    setSaving(true);
    try {
      const res = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ skin: skinId }),
      });
      if (res.ok) onSave?.(skinId);
    } finally {
      setSaving(false);
    }
  }

  const activeSkinId = buildSkinId(accent, mode);

  return (
    <div>
      {/* Accent swatches */}
      <div className="ms-cust-sec">Profile color</div>
      <div className="ms-swatches">
        {MS_ACCENTS.map((a) => {
          const isOn = accent === a.id;
          return (
            <button
              key={a.id}
              type="button"
              title={a.name}
              className={"ms-swatch" + (isOn ? " on" : "")}
              style={{ background: a.color }}
              onClick={() => handleAccent(a.id)}
            />
          );
        })}
      </div>

      {/* Light / Dark toggle */}
      <div className="ms-cust-sec" style={{ marginTop: 16 }}>Appearance</div>
      <div className="ms-modeseg">
        <button
          type="button"
          className={mode === "light" ? "on" : ""}
          onClick={() => handleMode("light")}
        >
          Light
        </button>
        <button
          type="button"
          className={mode === "dark" ? "on" : ""}
          onClick={() => handleMode("dark")}
        >
          Dark
        </button>
      </div>

      {/* Save — only shown when selection differs from saved value */}
      {activeSkinId !== (currentSkin ?? DEFAULT_SKIN_ID) && (
        <button
          type="button"
          className="ms-btn fill sm"
          onClick={handleSave}
          disabled={saving}
          style={{ marginTop: 14, width: "100%", opacity: saving ? 0.5 : 1 }}
        >
          {saving ? "Saving…" : "Save theme"}
        </button>
      )}
    </div>
  );
}
