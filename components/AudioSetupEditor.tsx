"use client";

import { useState, useRef } from "react";
import Image from "next/image";

const C = {
  surface: "#3D3834",
  surfaceRaised: "#4A4540",
  border: "#524D48",
  text: "#F7F1E3",
  muted: "#A89F94",
  subtle: "#6B6560",
  accent: "#E67E22",
  accentHover: "#CF711E",
};

interface AudioSetup {
  turntable: string | null;
  preamp: string | null;
  speakers: string | null;
  photoUrl?: string | null;
}

export default function AudioSetupEditor({ initial }: { initial: AudioSetup | null }) {
  const [editing, setEditing] = useState(false);
  const [turntable, setTurntable] = useState(initial?.turntable ?? "");
  const [preamp, setPreamp] = useState(initial?.preamp ?? "");
  const [speakers, setSpeakers] = useState(initial?.speakers ?? "");
  const [photoUrl, setPhotoUrl] = useState(initial?.photoUrl ?? "");
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handlePhotoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    const formData = new FormData();
    formData.append("file", file);

    const res = await fetch("/api/setup/upload", {
      method: "POST",
      body: formData,
    });

    if (res.ok) {
      const data = await res.json();
      setPhotoUrl(data.url);
    } else {
      setError("Photo upload failed.");
    }
    setUploading(false);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");

    const res = await fetch("/api/setup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        turntable: turntable || null,
        preamp: preamp || null,
        speakers: speakers || null,
        photoUrl: photoUrl || null,
      }),
    });

    if (!res.ok) {
      const data = await res.json();
      setError(data.error ?? "Something went wrong.");
      setSaving(false);
      return;
    }

    setSaving(false);
    setEditing(false);
    window.location.reload();
  }

  const hasSetup = turntable || preamp || speakers;
  const currentPhoto = initial?.photoUrl;

  return (
    <div>
      {!editing ? (
        <div className="space-y-3">
          <div className="p-5 space-y-4 text-sm" style={{ backgroundColor: C.surface, border: `1px solid ${C.border}` }}>
            {hasSetup ? (
              <>
                {initial?.turntable && <SetupItem icon="💿" label="TURNTABLE" value={initial.turntable} />}
                {initial?.preamp && <SetupItem icon="🎚️" label="PRE-AMP" value={initial.preamp} />}
                {initial?.speakers && <SetupItem icon="🔊" label="SPEAKERS" value={initial.speakers} />}
              </>
            ) : (
              <p className="text-xs font-mono" style={{ color: C.subtle }}>No setup listed yet.</p>
            )}
            <button
              onClick={() => setEditing(true)}
              className="text-xs font-mono mt-2 transition-colors duration-100"
              style={{ color: C.subtle }}
              onMouseEnter={(e) => (e.currentTarget.style.color = C.accent)}
              onMouseLeave={(e) => (e.currentTarget.style.color = C.subtle)}
            >
              {hasSetup ? "EDIT SETUP" : "+ ADD SETUP"}
            </button>
          </div>

          {/* Setup photo */}
          {currentPhoto && (
            <div style={{ border: `1px solid ${C.border}` }}>
              <Image
                src={currentPhoto}
                alt="Audio setup"
                width={256}
                height={192}
                className="w-full object-cover"
                style={{ display: "block" }}
                unoptimized
              />
            </div>
          )}
        </div>
      ) : (
        <form onSubmit={handleSave} className="p-5 space-y-4" style={{ backgroundColor: C.surface, border: `1px solid ${C.border}` }}>
          {[
            { icon: "💿", label: "TURNTABLE", value: turntable, set: setTurntable, placeholder: "e.g. Technics SL-1200" },
            { icon: "🎚️", label: "PRE-AMP", value: preamp, set: setPreamp, placeholder: "e.g. Schiit Mani" },
            { icon: "🔊", label: "SPEAKERS", value: speakers, set: setSpeakers, placeholder: "e.g. KRK Rokit 5" },
          ].map((field) => (
            <div key={field.label}>
              <label className="text-xs font-mono block mb-1" style={{ color: C.subtle }}>
                {field.icon} {field.label}
              </label>
              <input
                type="text"
                value={field.value}
                onChange={(e) => field.set(e.target.value)}
                placeholder={field.placeholder}
                className="w-full text-sm px-3 py-2 outline-none transition-colors duration-100"
                style={{ backgroundColor: C.surfaceRaised, border: `1px solid ${C.border}`, color: C.text, borderRadius: 0 }}
                onFocus={(e) => (e.currentTarget.style.borderColor = C.accent)}
                onBlur={(e) => (e.currentTarget.style.borderColor = C.border)}
              />
            </div>
          ))}

          {/* Photo upload */}
          <div>
            <label className="text-xs font-mono block mb-1" style={{ color: C.subtle }}>📷 SETUP PHOTO</label>
            {photoUrl && (
              <Image
                src={photoUrl}
                alt="Setup preview"
                width={220}
                height={140}
                className="w-full object-cover mb-2"
                style={{ border: `1px solid ${C.border}` }}
                unoptimized
              />
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handlePhotoUpload}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="w-full py-2 text-xs font-mono transition-colors duration-100"
              style={{ backgroundColor: C.surfaceRaised, color: C.muted, border: `1px solid ${C.border}`, borderRadius: 4, opacity: uploading ? 0.4 : 1 }}
            >
              {uploading ? "UPLOADING..." : photoUrl ? "CHANGE PHOTO" : "+ UPLOAD PHOTO"}
            </button>
          </div>

          {error && <p className="text-xs font-mono" style={{ color: "#C0392B" }}>{error}</p>}

          <div className="flex gap-2 pt-1">
            <button
              type="submit"
              disabled={saving}
              className="flex-1 py-2 text-xs font-mono transition-colors duration-100"
              style={{ backgroundColor: C.accent, color: C.text, borderRadius: 4, opacity: saving ? 0.4 : 1 }}
              onMouseEnter={(e) => !saving && (e.currentTarget.style.backgroundColor = C.accentHover)}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = C.accent)}
            >
              {saving ? "SAVING..." : "SAVE"}
            </button>
            <button
              type="button"
              onClick={() => setEditing(false)}
              className="px-4 py-2 text-xs font-mono transition-colors duration-100"
              style={{ backgroundColor: C.surfaceRaised, color: C.muted, borderRadius: 4, border: `1px solid ${C.border}` }}
            >
              CANCEL
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

function SetupItem({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <div>
      <div className="text-xs font-mono mb-0.5" style={{ color: "#6B6560" }}>{icon} {label}</div>
      <div style={{ color: "#F7F1E3" }}>{value}</div>
    </div>
  );
}
