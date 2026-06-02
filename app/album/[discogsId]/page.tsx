import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import Image from "next/image";
import Link from "next/link";
import AlbumActions from "@/components/AlbumActions";

interface Props {
  params: Promise<{ discogsId: string }>;
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

export default async function AlbumPage({ params }: Props) {
  const { discogsId } = await params;
  const { userId: clerkId } = await auth();

  const album = await prisma.album.findUnique({
    where: { discogsId },
    include: {
      logs: {
        orderBy: { playedAt: "desc" },
        include: { user: true, spins: true },
      },
      collection: {
        include: { user: true },
      },
      wantlist: {
        include: { user: true },
      },
    },
  });

  if (!album) notFound();

  const currentUser = clerkId
    ? await prisma.user.findUnique({
        where: { clerkId },
        include: {
          collection: { where: { albumId: album.id } },
          wantlist: { where: { albumId: album.id } },
        },
      })
    : null;

  const logsWithRating = album.logs.filter((l) => l.rating !== null);
  const avgRating = logsWithRating.length > 0
    ? logsWithRating.reduce((sum, l) => sum + (l.rating ?? 0), 0) / logsWithRating.length
    : null;

  const inCollection = (currentUser?.collection.length ?? 0) > 0;
  const inWantlist = (currentUser?.wantlist.length ?? 0) > 0;

  return (
    <div className="min-h-screen font-sans" style={{ backgroundColor: C.bg, color: C.text }}>
      <div className="max-w-4xl mx-auto px-6 py-10">

        {/* Album header */}
        <div className="flex gap-8 mb-10">
          {album.coverUrl ? (
            <Image src={album.coverUrl} alt={album.title} width={180} height={180}
              className="object-cover shrink-0"
              style={{ width: 180, height: 180, borderRadius: 4 }} unoptimized />
          ) : (
            <div className="shrink-0 flex items-center justify-center text-sm font-mono"
              style={{ width: 180, height: 180, backgroundColor: C.surface, borderRadius: 4, color: C.subtle }}>
              No art
            </div>
          )}

          <div className="flex-1 min-w-0">
            <h1 className="text-3xl font-bold tracking-tight mb-1" style={{ color: C.text }}>{album.title}</h1>
            <p className="text-lg font-mono mb-1" style={{ color: C.muted }}>{album.artist}</p>
            <div className="flex gap-4 text-xs font-mono mb-4" style={{ color: C.subtle }}>
              {album.releaseYear && <span>{album.releaseYear}</span>}
              {album.label && <span>{album.label}</span>}
              {album.genre && <span>{album.genre}</span>}
            </div>

            {/* Stats */}
            <div className="flex gap-4 mb-6">
              {[
                { label: "LOGGED", value: album.logs.length },
                { label: "COLLECTED", value: album.collection.length },
                { label: "WANTLISTED", value: album.wantlist.length },
              ].map((s) => (
                <div key={s.label} className="px-4 py-2 text-center"
                  style={{ backgroundColor: C.surface, border: `1px solid ${C.border}` }}>
                  <div className="text-lg font-bold font-mono" style={{ color: C.text }}>{s.value}</div>
                  <div className="text-xs font-mono" style={{ color: C.subtle }}>{s.label}</div>
                </div>
              ))}
              {avgRating !== null && (
                <div className="px-4 py-2 text-center"
                  style={{ backgroundColor: C.surface, border: `1px solid ${C.border}` }}>
                  <div className="text-lg font-bold font-mono" style={{ color: C.accent }}>
                    {avgRating.toFixed(1)}
                  </div>
                  <div className="text-xs font-mono" style={{ color: C.subtle }}>AVG RATING</div>
                </div>
              )}
            </div>

            {/* Actions */}
            {currentUser && (
              <AlbumActions
                albumId={album.id}
                discogsId={album.discogsId}
                title={album.title}
                artist={album.artist}
                releaseYear={album.releaseYear}
                coverUrl={album.coverUrl}
                label={album.label}
                genre={album.genre}
                inCollection={inCollection}
                inWantlist={inWantlist}
              />
            )}
          </div>
        </div>

        {/* Logs */}
        <div>
          <h2 className="text-xs font-mono uppercase tracking-widest mb-4" style={{ color: C.subtle }}>
            Listening Logs
          </h2>
          {album.logs.length === 0 ? (
            <div className="p-8 text-center text-sm font-mono"
              style={{ border: `1px dashed ${C.border}`, color: C.subtle }}>
              No one has logged this album yet.
            </div>
          ) : (
            <div className="space-y-2">
              {album.logs.map((log) => (
                <div key={log.id} className="flex gap-4 p-4"
                  style={{ backgroundColor: C.surface, border: `1px solid ${C.border}` }}>
                  <Link href={`/${log.user.username}`} className="shrink-0">
                    {log.user.avatarUrl ? (
                      <Image src={log.user.avatarUrl} alt={log.user.username} width={36} height={36}
                        className="object-cover"
                        style={{ width: 36, height: 36, borderRadius: "50%", border: `1px solid ${C.border}` }}
                        unoptimized />
                    ) : (
                      <div className="flex items-center justify-center text-sm font-bold"
                        style={{ width: 36, height: 36, borderRadius: "50%", backgroundColor: C.surfaceRaised, color: C.subtle }}>
                        {log.user.username[0].toUpperCase()}
                      </div>
                    )}
                  </Link>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline gap-2">
                      <Link href={`/${log.user.username}`} className="font-semibold text-sm hover:underline"
                        style={{ color: C.text }}>
                        {log.user.username}
                      </Link>
                      {log.format && (
                        <span className="text-xs font-mono" style={{ color: C.subtle }}>{log.format}</span>
                      )}
                    </div>
                    {log.rating != null && <StarRating rating={log.rating} />}
                    {log.review && (
                      <p className="mt-1 text-sm" style={{ color: C.muted }}>{log.review}</p>
                    )}
                    <div className="mt-1 flex gap-3 text-xs font-mono" style={{ color: C.subtle }}>
                      <span>{new Date(log.playedAt).toLocaleDateString()}</span>
                      <span>↻ {log.spins.length}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex gap-0.5 mt-1">
      {[1, 2, 3, 4, 5].map((star) => {
        const full = star <= Math.floor(rating);
        const half = !full && star === Math.ceil(rating) && rating % 1 !== 0;
        return (
          <span key={star} className="text-xs" style={{ position: "relative", display: "inline-block" }}>
            <span style={{ color: "#524D48" }}>★</span>
            {(full || half) && (
              <span style={{ position: "absolute", left: 0, top: 0, overflow: "hidden", width: full ? "100%" : "50%", color: "#E67E22" }}>★</span>
            )}
          </span>
        );
      })}
    </div>
  );
}
