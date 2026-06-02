import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { auth } from "@clerk/nextjs/server";
import WantlistActions from "@/components/WantlistActions";

interface Props {
  params: Promise<{ username: string }>;
  searchParams: Promise<{ sort?: string }>;
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

export default async function WantlistPage({ params, searchParams }: Props) {
  const { username } = await params;
  const { sort = "date" } = await searchParams;
  const { userId: clerkId } = await auth();

  const user = await prisma.user.findUnique({
    where: { username },
    select: { id: true, username: true, clerkId: true },
  });
  if (!user) notFound();

  const isOwner = clerkId === user.clerkId;

  const wantlist = await prisma.wantlist.findMany({
    where: { userId: user.id },
    orderBy: sort === "az"
      ? { album: { title: "asc" } }
      : sort === "year"
      ? { album: { releaseYear: "desc" } }
      : { addedAt: "desc" },
    include: { album: true },
  });

  const SORTS = [
    { key: "date", label: "DATE ADDED" },
    { key: "az", label: "A–Z" },
    { key: "year", label: "YEAR" },
  ];

  return (
    <div className="min-h-screen font-sans" style={{ backgroundColor: C.bg, color: C.text }}>
      <div className="max-w-3xl mx-auto px-6 py-10">

        <div className="mb-6 text-xs font-mono" style={{ color: C.subtle }}>
          <Link href={`/${username}`} className="hover:underline" style={{ color: C.muted }}>{username}</Link>
          {" / "}
          <span>wantlist</span>
        </div>

        <div className="flex items-center justify-between mb-6">
          <h1 className="text-xs font-mono uppercase tracking-widest" style={{ color: C.subtle }}>
            Wantlist
          </h1>
          <span className="text-xs font-mono" style={{ color: C.muted }}>{wantlist.length} records</span>
        </div>

        <div className="flex gap-2 mb-6">
          {SORTS.map((s) => (
            <Link key={s.key} href={`/${username}/wantlist?sort=${s.key}`}
              className="px-3 py-1.5 text-xs font-mono transition-colors duration-100"
              style={{
                backgroundColor: sort === s.key ? C.accent : C.surface,
                color: sort === s.key ? C.text : C.muted,
                border: `1px solid ${sort === s.key ? C.accent : C.border}`,
                borderRadius: 4,
              }}>
              {s.label}
            </Link>
          ))}
        </div>

        {wantlist.length === 0 ? (
          <div className="p-10 text-center text-sm font-mono" style={{ border: `1px dashed ${C.border}`, color: C.subtle }}>
            Wantlist is empty.
          </div>
        ) : (
          <div className="space-y-1">
            {wantlist.map((w) => (
              <div key={w.id} className="flex items-center gap-4 p-3"
                style={{ backgroundColor: C.surface, border: `1px solid ${C.border}` }}>
                <Link href={`/album/${w.album.discogsId}`}>
                  {w.album.coverUrl ? (
                    <Image src={w.album.coverUrl} alt={w.album.title} width={48} height={48}
                      className="object-cover shrink-0" style={{ width: 48, height: 48, borderRadius: 4 }} unoptimized />
                  ) : (
                    <div className="shrink-0" style={{ width: 48, height: 48, backgroundColor: C.surfaceRaised, borderRadius: 4 }} />
                  )}
                </Link>
                <div className="flex-1 min-w-0">
                  <Link href={`/album/${w.album.discogsId}`}>
                    <div className="text-sm font-semibold truncate hover:underline" style={{ color: C.text }}>{w.album.title}</div>
                  </Link>
                  <div className="text-xs font-mono" style={{ color: C.muted }}>{w.album.artist}</div>
                  {w.album.releaseYear && (
                    <div className="text-xs font-mono" style={{ color: C.subtle }}>{w.album.releaseYear}</div>
                  )}
                </div>
                <div className="text-xs font-mono shrink-0" style={{ color: C.subtle }}>
                  {new Date(w.addedAt).toLocaleDateString()}
                </div>
                {isOwner && (
                  <WantlistActions
                    wantlistId={w.id}
                    albumId={w.album.id}
                    discogsId={w.album.discogsId}
                    title={w.album.title}
                    artist={w.album.artist}
                    releaseYear={w.album.releaseYear}
                    coverUrl={w.album.coverUrl}
                    label={w.album.label}
                    genre={w.album.genre}
                  />
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
