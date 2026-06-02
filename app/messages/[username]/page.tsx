import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import MessageThread from "@/components/MessageThread";

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

interface Props { params: Promise<{ username: string }> }

export default async function ConversationPage({ params }: Props) {
  const { username } = await params;
  const { userId: clerkId } = await auth();
  if (!clerkId) redirect("/");

  const [me, other] = await Promise.all([
    prisma.user.findUnique({ where: { clerkId } }),
    prisma.user.findUnique({ where: { username } }),
  ]);
  if (!me) redirect("/");
  if (!other || other.id === me.id) notFound();

  const messages = await prisma.message.findMany({
    where: {
      OR: [
        { fromId: me.id, toId: other.id },
        { fromId: other.id, toId: me.id },
      ],
    },
    orderBy: { createdAt: "asc" },
  });

  // Mark incoming as read
  await prisma.message.updateMany({
    where: { fromId: other.id, toId: me.id, read: false },
    data: { read: true },
  });

  const formatted = messages.map((m) => ({
    id: m.id,
    content: m.content,
    createdAt: m.createdAt.toISOString(),
    mine: m.fromId === me.id,
  }));

  return (
    <div className="min-h-screen font-sans flex flex-col" style={{ backgroundColor: C.bg, color: C.text }}>
      {/* Header */}
      <div className="sticky top-14 z-30 flex items-center gap-4 px-6 py-3"
        style={{ backgroundColor: C.bg, borderBottom: `1px solid ${C.border}` }}>
        <Link href="/messages" className="text-xs font-mono hover:underline" style={{ color: C.subtle }}>
          ← Inbox
        </Link>
        <Link href={`/${other.username}`} className="flex items-center gap-3 hover:opacity-80 transition-opacity">
          {other.avatarUrl ? (
            <Image src={other.avatarUrl} alt={other.username} width={32} height={32}
              className="object-cover" style={{ width: 32, height: 32, borderRadius: "50%", border: `1px solid ${C.border}` }} unoptimized />
          ) : (
            <div className="flex items-center justify-center text-sm font-bold"
              style={{ width: 32, height: 32, borderRadius: "50%", backgroundColor: C.surfaceRaised, color: C.subtle }}>
              {other.username[0].toUpperCase()}
            </div>
          )}
          <span className="font-semibold text-sm" style={{ color: C.text }}>{other.username}</span>
        </Link>
      </div>

      {/* Thread */}
      <MessageThread
        initialMessages={formatted}
        otherUsername={other.username}
        otherAvatarUrl={other.avatarUrl}
      />
    </div>
  );
}
