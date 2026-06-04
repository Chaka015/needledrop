"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";

const C = {
  surface: "var(--skin-surface)",
  surfaceRaised: "var(--skin-surface-raised)",
  border: "var(--skin-border)",
  text: "var(--skin-text)",
  muted: "var(--skin-muted)",
  subtle: "var(--skin-subtle)",
  accent: "var(--skin-accent)",
};

interface Notification {
  id: string;
  message: string;
  read: boolean;
  createdAt: string;
  type: string;
  url: string | null;
}

export default function NotificationBell() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  function fetchNotifications() {
    fetch("/api/notifications")
      .then((r) => r.json())
      .then((data) => setNotifications(data.notifications ?? []));
  }

  useEffect(() => {
    fetchNotifications();
    // Refresh when tab regains focus so new spins/follows appear
    function onFocus() { fetchNotifications(); }
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, []);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const unread = notifications.filter((n) => !n.read).length;

  function handleOpen() {
    setOpen((v) => !v);
    if (!open && unread > 0) {
      fetch("/api/notifications", { method: "POST" });
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    }
  }

  return (
    <div ref={ref} className="relative shrink-0">
      <button
        onClick={handleOpen}
        className="relative flex items-center justify-center w-8 h-8 text-sm transition-colors duration-100"
        style={{ color: unread > 0 ? C.accent : C.muted }}
        title="Notifications"
      >
        🔔
        {unread > 0 && (
          <span
            className="absolute -top-1 -right-1 flex items-center justify-center text-xs font-bold"
            style={{
              width: 16, height: 16, borderRadius: "50%",
              backgroundColor: C.accent, color: C.text, fontSize: 10,
            }}
          >
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div
          className="absolute top-full mt-1 right-0 w-72 py-1 z-50 max-h-80 overflow-y-auto"
          style={{ backgroundColor: C.surface, border: `1px solid ${C.border}` }}
        >
          {notifications.length === 0 ? (
            <p className="px-4 py-3 text-xs font-mono" style={{ color: C.subtle }}>
              No notifications yet.
            </p>
          ) : (
            notifications.map((n) => {
              const inner = (
                <>
                  <div>{n.message}</div>
                  <div className="mt-0.5" style={{ color: C.subtle }}>
                    {new Date(n.createdAt).toLocaleDateString()}
                  </div>
                </>
              );
              const itemStyle = {
                backgroundColor: n.read ? "transparent" : C.surfaceRaised,
                borderBottom: `1px solid ${C.border}`,
                color: n.read ? C.muted : C.text,
              };
              return n.url ? (
                <Link
                  key={n.id}
                  href={n.url}
                  className="block px-4 py-3 text-xs font-mono transition-colors duration-100"
                  style={itemStyle}
                  onClick={() => setOpen(false)}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = C.surfaceRaised)}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = n.read ? "transparent" : C.surfaceRaised)}
                >
                  {inner}
                </Link>
              ) : (
                <div
                  key={n.id}
                  className="px-4 py-3 text-xs font-mono"
                  style={itemStyle}
                >
                  {inner}
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
