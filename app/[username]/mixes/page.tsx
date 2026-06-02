import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { auth } from "@clerk/nextjs/server";

interface Props {
  params: Promise<{ username: string }>;
}

const C = {
  bg:            "var(--skin-bg)",
  surface:       "var(--skin-surface)",
  surfaceRaised: "var(--skin-surface-raised)",
  border:        "var(--skin-border)",
  text:          "var(--skin-text)",
  muted:         "var(--skin-muted)",
  subtle:        "var(--skin-subtle)",
  accent:        "var(--skin-accent)",
};

export default async function MixesPage({ params }: Props) {
  const { username } = await params;
  const { userId: clerkId } = await auth();

  const user = await prisma.user.findUnique({
    where: { username },
    select: { id: true, username: true, clerkId: true },
  });
  if (!user) notFound();

  const isOwner = clerkId === user.clerkId;

  const mixes = await prisma.mix.findMany({
    where: {
      userId: user.id,
      ...(isOwner ? {} : { isPublic: true }),
    },
    orderBy: { updatedAt: "desc" },
    include: {
      items: {
        take: 4,
        orderBy: { position: "asc" },
        include: { album: { select: { coverUrl: true, title: true, artist: true } } },
      },
      _count: { select: { items: true } },
    },
  });

  return (
    <div className="min-h-screen font-sans" style={{ backgroundColor: C.bg, color: C.text }}>
      <div className="max-w-3xl mx-auto px-6 py-10">

        <div className="mb-6 text-xs font-mono" style={{ color: C.subtle }}>
          <Link href={`/${username}`} className="hover:underline" style={{ color: C.muted }}>{username}</Link>
          {" / mixes"}
        </div>

        <div className="flex items-center justify-between mb-6">
          <h1 className="text-xs font-mono uppercase tracking-widest" style={{ color: C.subtle }}>
            Mixes
          </h1>
          <span className="text-xs font-mono" style={{ color: C.muted }}>{mixes.length} mixes</span>
        </div>

        {mixes.length === 0 ? (
          <div className="p-10 text-center text-sm font-mono" style={{ border: `1px dashed ${C.border}`, color: C.subtle }}>
            {isOwner ? "You haven't created any mixes yet." : "No public mixes yet."}
          </div>
        ) : (
          <div className="space-y-2">
            {mixes.map((mix) => (
              <Link key={mix.id} href={`/${username}/mixes/${mix.id}`}
                className="hover-surface-raised flex items-center gap-4 p-4"
                style={{ backgroundColor: C.surface, border: `1px solid ${C.border}` }}>
                {/* 2×2 cover collage */}
                <div className="grid grid-cols-2 gap-0.5 shrink-0" style={{ width: 56, height: 56 }}>
                  {[0, 1, 2, 3].map((i) => {
                    const item = mix.items[i];
                    return item?.album.coverUrl ? (
                      <Image key={i} src={item.album.coverUrl} alt="" width={27} height={27}
                        className="object-cover" style={{ width: 27, height: 27 }} unoptimized />
                    ) : (
                      <div key={i} style={{ width: 27, height: 27, backgroundColor: C.surfaceRaised }} />
                    );
                  })}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold truncate" style={{ color: C.text }}>{mix.title}</div>
                  {mix.description && (
                    <div className="text-xs truncate" style={{ color: C.muted }}>{mix.description}</div>
                  )}
                  <div className="text-xs font-mono mt-0.5" style={{ color: C.subtle }}>
                    {mix._count.items} RECORDS
                    {!mix.isPublic && <span className="ml-2" style={{ color: C.subtle }}>· PRIVATE</span>}
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
