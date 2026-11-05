import { cache } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { auth } from "@clerk/nextjs/server";
import Image from "next/image";
import Link from "next/link";
import MixEditor from "@/components/MixEditor";
import MixTrackList from "@/components/MixTrackList";

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

// cache(): generateMetadata and the page share one query per request.
const getMix = cache((mixId: string) =>
  prisma.mix.findUnique({
    where: { id: mixId },
    include: {
      user: { select: { username: true, avatarUrl: true, clerkId: true } },
      items: {
        orderBy: { position: "asc" },
        include: { album: true },
      },
    },
  })
);

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { username, mixId } = await params;
  const mix = await getMix(mixId);
  if (!mix || mix.user.username !== username) return { title: "Mix not found" };
  // Private mixes: never leak the title or covers into share previews.
  // (The opengraph-image route serves the generic site card for them.)
  if (!mix.isPublic) {
    return { title: `A mix by ${username}`, robots: { index: false } };
  }

  const title = `${mix.title} — by ${username}`;
  const description = mix.description?.trim()
    || `${mix.items.length} records, picked by ${username}.`;
  return {
    title,
    description,
    openGraph: { title, description, siteName: "NeedleDrop", type: "website", url: `/${username}/mixes/${mix.id}` },
    twitter: { card: "summary_large_image", title, description },
  };
}

export default async function MixPage({ params }: Props) {
  const { username, mixId } = await params;
  const { userId: clerkId } = await auth();

  const mix = await getMix(mixId);

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
          <MixTrackList items={mix.items} />
        )}

        {/* Owner editing tools */}
        {isOwner && (
          <div className="mt-8">
            <MixEditor mixId={mix.id} username={username} isPublic={mix.isPublic} currentCoverUrl={mix.coverUrl} />
          </div>
        )}
      </div>
    </div>
  );
}
