"use client";

import { useState, useRef, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { SignOutButton } from "@clerk/nextjs";
import NowSpinningModal from "./NowSpinningModal";
import AddModal from "./AddModal";

const C = {
  bg: "#2D2926",
  surface: "#3D3834",
  surfaceRaised: "#4A4540",
  border: "#524D48",
  text: "#F7F1E3",
  muted: "#A89F94",
  subtle: "#6B6560",
  accent: "#E67E22",
  accentHover: "#CF711E",
};

interface NavbarProps {
  username?: string | null;
  avatarUrl?: string | null;
  nowSpinning?: { title: string; artist: string } | null;
}

export default function Navbar({ username, avatarUrl, nowSpinning }: NavbarProps) {
  const [showNowSpinning, setShowNowSpinning] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [showAvatar, setShowAvatar] = useState(false);
  const addRef = useRef<HTMLDivElement>(null);
  const avatarRef = useRef<HTMLDivElement>(null);

  // Close dropdowns on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (addRef.current && !addRef.current.contains(e.target as Node)) setShowAdd(false);
      if (avatarRef.current && !avatarRef.current.contains(e.target as Node)) setShowAvatar(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  return (
    <>
      <nav
        className="sticky top-0 z-40 w-full flex items-center justify-between px-6 h-14"
        style={{ backgroundColor: C.bg, borderBottom: `1px solid ${C.border}` }}
      >
        {/* Logo */}
        <Link href={username ? `/${username}` : "/"} className="flex items-center gap-2">
          <span className="font-bold tracking-tight text-sm" style={{ color: C.text }}>
            NEEDLE<span style={{ color: C.accent }}>DROP</span>
          </span>
        </Link>

        {/* Center actions */}
        {username && (
          <div className="flex items-center gap-2">

            {/* What are you spinning? */}
            <button
              onClick={() => setShowNowSpinning(true)}
              className="flex items-center gap-2 px-4 py-1.5 text-xs font-mono transition-colors duration-100"
              style={{ backgroundColor: C.accent, color: C.text, borderRadius: 4 }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = C.accentHover)}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = C.accent)}
            >
              {nowSpinning ? (
                <>
                  <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ backgroundColor: C.text }} />
                  {nowSpinning.artist} — {nowSpinning.title}
                </>
              ) : (
                <>▶ WHAT ARE YOU SPINNING?</>
              )}
            </button>

            {/* Add dropdown */}
            <div ref={addRef} className="relative">
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
                <div
                  className="absolute top-full mt-1 right-0 w-48 py-1 z-50"
                  style={{ backgroundColor: C.surface, border: `1px solid ${C.border}` }}
                >
                  <DropdownItem onClick={() => { setShowAdd(false); setShowNowSpinning(true); }}>
                    ▶ Now Spinning
                  </DropdownItem>
                  <DropdownItem onClick={() => { setShowAdd(false); }}>
                    <Link href={`/${username}#add`} className="block w-full">
                      ↓ Import from Discogs
                    </Link>
                  </DropdownItem>
                  <div style={{ height: 1, backgroundColor: C.border, margin: "4px 0" }} />
                  <DropdownItem onClick={() => { setShowAdd(false); }}>
                    <AddModal trigger="search" />
                  </DropdownItem>
                </div>
              )}
            </div>

            {/* Activity */}
            <Link
              href="/activity"
              className="px-3 py-1.5 text-xs font-mono transition-colors duration-100"
              style={{ color: C.muted }}
              onMouseEnter={(e) => (e.currentTarget as HTMLAnchorElement).style.color = C.text}
              onMouseLeave={(e) => (e.currentTarget as HTMLAnchorElement).style.color = C.muted}
            >
              ACTIVITY
            </Link>
          </div>
        )}

        {/* Avatar dropdown */}
        {username && (
          <div ref={avatarRef} className="relative">
            <button
              onClick={() => setShowAvatar((v) => !v)}
              className="flex items-center gap-2"
            >
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
              <div
                className="absolute top-full mt-1 right-0 w-40 py-1 z-50"
                style={{ backgroundColor: C.surface, border: `1px solid ${C.border}` }}
              >
                <DropdownItem onClick={() => setShowAvatar(false)}>
                  <Link href={`/${username}`} className="block w-full">MY PROFILE</Link>
                </DropdownItem>
                <DropdownItem onClick={() => setShowAvatar(false)}>
                  <Link href="/settings" className="block w-full">SETTINGS</Link>
                </DropdownItem>
                <div style={{ height: 1, backgroundColor: C.border, margin: "4px 0" }} />
                <div className="px-4 py-2 text-xs font-mono transition-colors duration-100 cursor-pointer"
                  style={{ color: C.muted }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = C.text)}
                  onMouseLeave={(e) => (e.currentTarget.style.color = C.muted)}>
                  <SignOutButton>SIGN OUT</SignOutButton>
                </div>
              </div>
            )}
          </div>
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
    <div
      className="px-4 py-2 text-xs font-mono cursor-pointer transition-colors duration-100"
      style={{ color: "#A89F94" }}
      onClick={onClick}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLDivElement).style.backgroundColor = "#4A4540";
        (e.currentTarget as HTMLDivElement).style.color = "#F7F1E3";
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLDivElement).style.backgroundColor = "transparent";
        (e.currentTarget as HTMLDivElement).style.color = "#A89F94";
      }}
    >
      {children}
    </div>
  );
}
