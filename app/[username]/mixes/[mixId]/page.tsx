import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { auth } from "@clerk/nextjs/server";
import Image from "next/image";
import Link from "next/link";
import MixEditor from "@/components/MixEditor";

interface Props {
  params: Promise<{ username: string; mixId: string }>;
}

const C = {
  bg: "#2D2926",
  surface: "#3D3834",
  surfaceRaised: "#4A4540",
  border: "#524D48",
  text: "#F7F1E3",
  muted: "#A89F94",
  subtle: "#6B6560",
  accent: "#E67E22",
};

export default async function MixPage({ params }: Props) {
  const { username, mixId } = await params;
  const { userId: clerkId } = await auth();

  const mix = await prisma.mix.findUnique({
    where: { id: mixId },
    include: {
      user: { select: { username: true, avatarUrl: true, clerkId: true } },
      items: {
        orderBy: { position: "asc" },
        include: { album: true },
      },
    },
  });

  if (!mix || mix.user.username !== username) notFound();

  const isOwner = clerkId === mix.user.clerkId;

  return (
    <div className="min-h-screen font-sans" style={{ backgroundColor: C.bg, color: C.text }}>
      <div className="max-w-4xl mx-auto px-6 py-10">

        {/* Breadcrumb */}
        <div className="mb-6 text-xs font-mono" style={{ color: C.subtle }}>
          <Link href={`/${username}`} className="hover:underline" style={{ color: C.muted }}>{username}</Link>
          {" / "}
          <Link href={`/${username}`} className="hover:underline" style={{ color: C.muted }}>mixes</Link>
          {" / "}
          <span>{mix.title}</span>
        </div>

        {/* Header */}
        <div className="flex gap-6 mb-8">
          {/* Cover collage */}
          <div className="shrink-0" style={{ width: 120, height: 120 }}>
            {mix.coverUrl ? (
              <Image src={mix.coverUrl} alt={mix.title} width={120} height={120}
                className="object-cover" style={{ width: 120, height: 120, borderRadius: 4 }} unoptimized />
            ) : (
              <div className="grid grid-cols-2 gap-0.5" style={{ width: 120, height: 120 }}>
                {[0, 1, 2, 3].map((i) => {
                  const item = mix.items[i];
                  return item?.album.coverUrl ? (
                    <Image key={i} src={item.album.coverUrl} alt="" width={59} height={59}
                      className="object-cover" style={{ width: 59, height: 59, borderRadius: i === 0 ? "4px 0 0 0" : i === 1 ? "0 4px 0 0" : i === 2 ? "0 0 0 4px" : "0 0 4px 0" }} unoptimized />
                  ) : (
                    <div key={i} style={{ width: 59, height: 59, backgroundColor: C.surfaceRaised }} />
                  );
                })}
              </div>
            )}
          </div>

          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-bold mb-1" style={{ color: C.text }}>{mix.title}</h1>
            {mix.description && (
              <p className="text-sm mb-3" style={{ color: C.muted }}>{mix.description}</p>
            )}
            <div className="text-xs font-mono" style={{ color: C.subtle }}>
              {mix.items.length} RECORDS · by{" "}
              <Link href={`/${username}`} className="hover:underline" style={{ color: C.muted }}>{username}</Link>
            </div>
          </div>
        </div>

        {/* Track list */}
        {mix.items.length === 0 ? (
          <div className="p-8 text-center text-sm font-mono" style={{ border: `1px dashed ${C.border}`, color: C.subtle }}>
            {isOwner ? "Add records from your collection to get started." : "This mix is empty."}
          </div>
        ) : (
          <div className="space-y-1">
            {mix.items.map((item, idx) => (
              <Link key={item.id} href={`/album/${item.album.discogsId}`}
                className="flex items-center gap-4 p-3 transition-colors duration-100"
                style={{ backgroundColor: C.surface, border: `1px solid ${C.border}` }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = C.surfaceRaised)}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = C.surface)}>
                <span className="text-xs font-mono w-5 text-right shrink-0" style={{ color: C.subtle }}>
                  {idx + 1}
                </span>
                {item.album.coverUrl ? (
                  <Image src={item.album.coverUrl} alt={item.album.title} width={40} height={40}
                    className="object-cover shrink-0" style={{ width: 40, height: 40, borderRadius: 4 }} unoptimized />
                ) : (
                  <div className="shrink-0" style={{ width: 40, height: 40, backgroundColor: C.surfaceRaised, borderRadius: 4 }} />
                )}
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold truncate" style={{ color: C.text }}>{item.album.title}</div>
                  <div className="text-xs font-mono truncate" style={{ color: C.muted }}>{item.album.artist}</div>
                </div>
                {item.album.releaseYear && (
                  <span className="text-xs font-mono shrink-0" style={{ color: C.subtle }}>{item.album.releaseYear}</span>
                )}
              </Link>
            ))}
          </div>
        )}

        {/* Owner editing tools */}
        {isOwner && (
          <div className="mt-8">
            <MixEditor mixId={mix.id} username={username} />
          </div>
        )}
      </div>
    </div>
  );
}
