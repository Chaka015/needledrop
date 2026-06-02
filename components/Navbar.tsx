"use client";

import { useState, useRef, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { SignOutButton } from "@clerk/nextjs";
import NowSpinningModal from "./NowSpinningModal";
import AddModal from "./AddModal";
import NotificationBell from "./NotificationBell";

const C = {
  bg: "var(--skin-bg)",
  surface: "var(--skin-surface)",
  surfaceRaised: "var(--skin-surface-raised)",
  border: "var(--skin-border)",
  text: "var(--skin-text)",
  muted: "var(--skin-muted)",
  subtle: "var(--skin-subtle)",
  accent: "var(--skin-accent)",
  accentHover: "var(--skin-accent-hover)",
};

interface NavbarProps {
  username?: string | null;
  avatarUrl?: string | null;
  nowSpinning?: { title: string; artist: string } | null;
}

export default function Navbar({ username, avatarUrl, nowSpinning }: NavbarProps) {
  const router = useRouter();
  const [showNowSpinning, setShowNowSpinning] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [showAvatar, setShowAvatar] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const addRef = useRef<HTMLDivElement>(null);
  const avatarRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (addRef.current && !addRef.current.contains(e.target as Node)) setShowAdd(false);
      if (avatarRef.current && !avatarRef.current.contains(e.target as Node)) setShowAvatar(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
      setSearchQuery("");
    }
  }

  return (
    <>
      <nav
        className="sticky top-0 z-40 w-full flex items-center gap-3 px-6 h-14"
        style={{ backgroundColor: C.bg, borderBottom: `1px solid ${C.border}` }}
      >
        {/* Logo */}
        <Link href={username ? `/${username}` : "/"} className="flex items-center shrink-0">
          <span className="font-bold tracking-tight text-sm" style={{ color: C.text }}>
            NEEDLE<span style={{ color: C.accent }}>DROP</span>
          </span>
        </Link>

        {username && (
          <>
            {/* Search */}
            <form onSubmit={handleSearch} className="flex-1 max-w-xs">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search users or albums..."
                className="w-full text-xs px-3 py-1.5 outline-none transition-colors duration-100 font-mono"
                style={{ backgroundColor: C.surface, border: `1px solid ${C.border}`, color: C.text, borderRadius: 4 }}
                onFocus={(e) => (e.currentTarget.style.borderColor = C.accent)}
                onBlur={(e) => (e.currentTarget.style.borderColor = C.border)}
              />
            </form>

            {/* Now Spinning */}
            {nowSpinning ? (
              <button
                onClick={() => setShowNowSpinning(true)}
                className="flex items-center gap-2 px-3 py-1.5 text-xs font-mono transition-opacity duration-100 shrink-0"
                style={{ backgroundColor: "#0D0D0D", border: "1px solid #333", borderRadius: 4 }}
                onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.8")}
                onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}
              >
                <span className="w-1.5 h-1.5 rounded-full animate-pulse shrink-0" style={{ backgroundColor: "#FF3E3E" }} />
                <span className="font-bold" style={{ color: "#FF3E3E" }}>ON AIR</span>
                <span className="max-w-40 truncate" style={{ color: "#F7F1E3" }}>
                  {nowSpinning.artist} — {nowSpinning.title}
                </span>
              </button>
            ) : (
              <button
                onClick={() => setShowNowSpinning(true)}
                className="flex items-center gap-2 px-4 py-1.5 text-xs font-mono transition-colors duration-100 shrink-0"
                style={{ backgroundColor: C.accent, color: C.text, borderRadius: 4 }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = C.accentHover)}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = C.accent)}
              >
                ▶ WHAT ARE YOU SPINNING?
              </button>
            )}

            {/* Add dropdown */}
            <div ref={addRef} className="relative shrink-0">
              <button
                onClick={() => setShowAdd((v) => !v)}
                className="flex items-center gap-1 px-3 py-1.5 text-xs font-mono transition-colors duration-100"
                style={{
                  backgroundColor: showAdd ? C.surfaceRaised : C.surface,
                  color: C.muted,
                  border: `1px solid ${C.border}`,
                  borderRadius: 4,
                }}
                onMouseEnter={(e) => (e.currentTarget.style.color = C.text)}
                onMouseLeave={(e) => (e.currentTarget.style.color = C.muted)}
              >
                ADD ▾
              </button>

              {showAdd && (
                <div className="absolute top-full mt-1 right-0 w-52 py-1 z-50"
                  style={{ backgroundColor: C.surface, border: `1px solid ${C.border}` }}>
                  <DropdownItem onClick={() => { setShowAdd(false); setShowNowSpinning(true); }}>
                    ▶ Now Spinning
                  </DropdownItem>
                  <div style={{ height: 1, backgroundColor: C.border, margin: "4px 0" }} />
                  <div className="px-4 py-2 text-xs font-mono cursor-pointer transition-colors duration-100"
                    style={{ color: C.muted }}
                    onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.backgroundColor = C.surfaceRaised; (e.currentTarget as HTMLDivElement).style.color = C.text; }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.backgroundColor = "transparent"; (e.currentTarget as HTMLDivElement).style.color = C.muted; }}>
                    <AddModal trigger="search" />
                  </div>
                  <DropdownItem onClick={() => { setShowAdd(false); if (username) router.push(`/${username}`); }}>
                    ↓ Import from Discogs
                  </DropdownItem>
                </div>
              )}
            </div>

            {/* Activity */}
            <Link href="/activity"
              className="px-3 py-1.5 text-xs font-mono transition-colors duration-100 shrink-0"
              style={{ color: C.muted }}
              onMouseEnter={(e) => ((e.currentTarget as HTMLAnchorElement).style.color = C.text)}
              onMouseLeave={(e) => ((e.currentTarget as HTMLAnchorElement).style.color = C.muted)}>
              SOCIAL FEED
            </Link>

            {/* Notification Bell */}
            <NotificationBell />

            {/* Avatar dropdown */}
            <div ref={avatarRef} className="relative shrink-0">
              <button onClick={() => setShowAvatar((v) => !v)} className="flex items-center">
                {avatarUrl ? (
                  <Image src={avatarUrl} alt={username} width={28} height={28}
                    className="object-cover"
                    style={{ width: 28, height: 28, borderRadius: "50%", border: `1px solid ${C.border}` }} />
                ) : (
                  <div className="flex items-center justify-center text-xs font-bold"
                    style={{ width: 28, height: 28, borderRadius: "50%", backgroundColor: C.surface, color: C.subtle, border: `1px solid ${C.border}` }}>
                    {username[0].toUpperCase()}
                  </div>
                )}
              </button>

              {showAvatar && (
                <div className="absolute top-full mt-1 right-0 w-40 py-1 z-50"
                  style={{ backgroundColor: C.surface, border: `1px solid ${C.border}` }}>
                  <DropdownItem onClick={() => setShowAvatar(false)}>
                    <Link href={`/${username}`} className="block w-full">MY PROFILE</Link>
                  </DropdownItem>
                  <DropdownItem onClick={() => setShowAvatar(false)}>
                    <Link href="/settings" className="block w-full">SETTINGS</Link>
                  </DropdownItem>
                  <div style={{ height: 1, backgroundColor: C.border, margin: "4px 0" }} />
                  <div className="px-4 py-2 text-xs font-mono cursor-pointer transition-colors duration-100"
                    style={{ color: C.muted }}
                    onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.color = C.text; }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.color = C.muted; }}>
                    <SignOutButton>SIGN OUT</SignOutButton>
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </nav>

      {showNowSpinning && (
        <NowSpinningModal
          onClose={() => setShowNowSpinning(false)}
          onSuccess={() => { setShowNowSpinning(false); window.location.reload(); }}
        />
      )}
    </>
  );
}

function DropdownItem({ children, onClick }: { children: React.ReactNode; onClick?: () => void }) {
  return (
    <div className="px-4 py-2 text-xs font-mono cursor-pointer transition-colors duration-100"
      style={{ color: C.muted }}
      onClick={onClick}
      onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.backgroundColor = C.surfaceRaised; (e.currentTarget as HTMLDivElement).style.color = C.text; }}
      onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.backgroundColor = "transparent"; (e.currentTarget as HTMLDivElement).style.color = C.muted; }}>
      {children}
    </div>
  );
}
