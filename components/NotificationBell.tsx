"use client";

import { useState, useEffect, useRef } from "react";

const C = {
  surface: "#3D3834",
  surfaceRaised: "#4A4540",
  border: "#524D48",
  text: "#F7F1E3",
  muted: "#A89F94",
  subtle: "#6B6560",
  accent: "#E67E22",
};

interface Notification {
  id: string;
  message: string;
  read: boolean;
  createdAt: string;
  type: string;
}

export default function NotificationBell() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch("/api/notifications")
      .then((r) => r.json())
      .then((data) => setNotifications(data.notifications ?? []));
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
            notifications.map((n) => (
              <div
                key={n.id}
                className="px-4 py-3 text-xs font-mono"
                style={{
                  backgroundColor: n.read ? "transparent" : C.surfaceRaised,
                  borderBottom: `1px solid ${C.border}`,
                  color: n.read ? C.muted : C.text,
                }}
              >
                <div>{n.message}</div>
                <div className="mt-0.5" style={{ color: C.subtle }}>
                  {new Date(n.createdAt).toLocaleDateString()}
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
