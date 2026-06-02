import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import Link from "next/link";
import Image from "next/image";

const C = {
  bg:      "var(--skin-bg)",
  surface: "var(--skin-surface)",
  surfaceRaised: "var(--skin-surface-raised)",
  border:  "var(--skin-border)",
  text:    "var(--skin-text)",
  muted:   "var(--skin-muted)",
  subtle:  "var(--skin-subtle)",
  accent:  "var(--skin-accent)",
};

export default async function MessagesPage() {
  const { userId: clerkId } = await auth();
  if (!clerkId) redirect("/");

  const me = await prisma.user.findUnique({ where: { clerkId } });
  if (!me) redirect("/");

  const messages = await prisma.message.findMany({
    where: { OR: [{ fromId: me.id }, { toId: me.id }] },
    orderBy: { createdAt: "desc" },
    include: {
      from: { select: { id: true, username: true, avatarUrl: true } },
      to:   { select: { id: true, username: true, avatarUrl: true } },
    },
  });

  // Build conversation list
  const seen = new Set<string>();
  const conversations: {
    user: { id: string; username: string; avatarUrl: string | null };
    lastMessage: string;
    lastAt: Date;
    unread: number;
  }[] = [];

  for (const m of messages) {
    const other = m.fromId === me.id ? m.to : m.from;
    if (seen.has(other.id)) {
      const conv = conversations.find((c) => c.user.id === other.id)!;
      if (!m.read && m.toId === me.id) conv.unread++;
      continue;
    }
    seen.add(other.id);
    conversations.push({
      user: other,
      lastMessage: m.content,
      lastAt: m.createdAt,
      unread: !m.read && m.toId === me.id ? 1 : 0,
    });
  }

  return (
    <div className="min-h-screen font-sans" style={{ backgroundColor: C.bg, color: C.text }}>
      <div className="max-w-2xl mx-auto px-6 py-10">
        <h1 className="text-xs font-mono uppercase tracking-widest mb-6" style={{ color: C.subtle }}>
          Messages
        </h1>

        {conversations.length === 0 ? (
          <div className="p-8 text-center text-sm font-mono"
            style={{ border: `1px dashed ${C.border}`, color: C.subtle }}>
            No messages yet. Visit a profile to start a conversation.
          </div>
        ) : (
          <div className="space-y-1">
            {conversations.map((conv) => (
              <Link key={conv.user.id} href={`/messages/${conv.user.username}`}
                className="flex items-center gap-4 p-4 transition-colors duration-100"
                style={{ backgroundColor: conv.unread > 0 ? C.surfaceRaised : C.surface, border: `1px solid ${conv.unread > 0 ? C.accent : C.border}` }}>
                {conv.user.avatarUrl ? (
                  <Image src={conv.user.avatarUrl} alt={conv.user.username} width={40} height={40}
                    className="object-cover shrink-0"
                    style={{ width: 40, height: 40, borderRadius: "50%", border: `1px solid ${C.border}` }} unoptimized />
                ) : (
                  <div className="shrink-0 flex items-center justify-center text-sm font-bold"
                    style={{ width: 40, height: 40, borderRadius: "50%", backgroundColor: C.surfaceRaised, color: C.subtle }}>
                    {conv.user.username[0].toUpperCase()}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="font-semibold text-sm" style={{ color: conv.unread > 0 ? C.text : C.muted }}>
                      {conv.user.username}
                    </span>
                    <span className="text-xs font-mono shrink-0" style={{ color: C.subtle }}>
                      {new Date(conv.lastAt).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-2 mt-0.5">
                    <p className="text-xs font-mono truncate" style={{ color: C.subtle }}>
                      {conv.lastMessage}
                    </p>
                    {conv.unread > 0 && (
                      <span className="shrink-0 flex items-center justify-center text-xs font-bold"
                        style={{ width: 18, height: 18, borderRadius: "50%", backgroundColor: C.accent, color: C.text, fontSize: 10 }}>
                        {conv.unread > 9 ? "9+" : conv.unread}
                      </span>
                    )}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
