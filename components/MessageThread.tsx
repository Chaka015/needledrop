"use client";

import { useState, useEffect, useRef } from "react";

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

interface Msg {
  id: string;
  content: string;
  createdAt: string;
  mine: boolean;
}

interface Props {
  initialMessages: Msg[];
  otherUsername: string;
  otherAvatarUrl: string | null;
}

export default function MessageThread({ initialMessages, otherUsername }: Props) {
  const [messages, setMessages] = useState<Msg[]>(initialMessages);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Poll for new messages every 5 seconds
  useEffect(() => {
    const id = setInterval(async () => {
      const res = await fetch(`/api/messages/${otherUsername}`);
      if (res.ok) {
        const data = await res.json();
        setMessages(data.messages);
      }
    }, 5000);
    return () => clearInterval(id);
  }, [otherUsername]);

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (!text.trim()) return;
    setSending(true);
    const res = await fetch(`/api/messages/${otherUsername}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: text }),
    });
    if (res.ok) {
      const data = await res.json();
      setMessages((prev) => [...prev, data.message]);
      setText("");
    }
    setSending(false);
  }

  function groupByDay(msgs: Msg[]) {
    const groups: { date: string; msgs: Msg[] }[] = [];
    for (const m of msgs) {
      const day = m.createdAt.slice(0, 10);
      const last = groups[groups.length - 1];
      if (last?.date === day) { last.msgs.push(m); }
      else groups.push({ date: day, msgs: [m] });
    }
    return groups;
  }

  return (
    <div className="flex flex-col flex-1 max-w-2xl mx-auto w-full px-6">
      {/* Messages */}
      <div className="flex-1 py-6 space-y-1 overflow-y-auto" style={{ minHeight: "60vh" }}>
        {messages.length === 0 && (
          <p className="text-center text-xs font-mono py-10" style={{ color: C.subtle }}>
            No messages yet. Say hello!
          </p>
        )}
        {groupByDay(messages).map(({ date, msgs }) => (
          <div key={date}>
            <div className="text-center my-4">
              <span className="text-xs font-mono px-3 py-1" style={{ color: C.subtle, backgroundColor: C.surfaceRaised, borderRadius: 4 }}>
                {new Date(date).toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })}
              </span>
            </div>
            {msgs.map((m) => (
              <div key={m.id} className={`flex mb-1.5 ${m.mine ? "justify-end" : "justify-start"}`}>
                <div className="max-w-xs lg:max-w-sm px-4 py-2.5 text-sm"
                  style={{
                    backgroundColor: m.mine ? C.accent : C.surface,
                    color: m.mine ? C.text : C.text,
                    borderRadius: 4,
                    border: `1px solid ${m.mine ? C.accent : C.border}`,
                  }}>
                  <p>{m.content}</p>
                  <p className="text-xs mt-1 text-right" style={{ color: m.mine ? "rgba(255,255,255,0.6)" : C.subtle }}>
                    {new Date(m.createdAt).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })}
                  </p>
                </div>
              </div>
            ))}
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Send form */}
      <div className="py-4" style={{ borderTop: `1px solid ${C.border}` }}>
        <form onSubmit={handleSend} className="flex gap-3">
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={`Message ${otherUsername}…`}
            className="flex-1 text-sm px-4 py-2.5 outline-none transition-colors duration-100"
            style={{ backgroundColor: C.surface, border: `1px solid ${C.border}`, color: C.text, borderRadius: 0 }}
            onFocus={(e) => (e.currentTarget.style.borderColor = C.accent)}
            onBlur={(e) => (e.currentTarget.style.borderColor = C.border)}
          />
          <button type="submit" disabled={sending || !text.trim()}
            className="px-5 py-2.5 text-xs font-mono transition-colors duration-100"
            style={{ backgroundColor: C.accent, color: C.text, borderRadius: 4, opacity: sending ? 0.4 : 1 }}
            onMouseEnter={(e) => !sending && (e.currentTarget.style.backgroundColor = C.accentHover)}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = C.accent)}>
            SEND
          </button>
        </form>
      </div>
    </div>
  );
}
