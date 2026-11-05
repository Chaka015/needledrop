import { ImageResponse } from "next/og";
import { prisma } from "@/lib/prisma";
import {
  ACCENT, Cover, DefaultCard, Frame, INK, MONO, MUTED, OG_SIZE, Wordmark,
  fetchCover, loadFonts, plural, truncate,
} from "@/lib/og";

export const runtime = "nodejs";
export const revalidate = 3600;
export const size = OG_SIZE;
export const contentType = "image/png";
export const alt = "An album on NeedleDrop: cover art, title, artist, and how many fans own and have spun it";

export default async function Image({ params }: { params: Promise<{ discogsId: string }> }) {
  const { discogsId: raw } = await params;
  let discogsId = raw;
  try { discogsId = decodeURIComponent(raw); } catch { /* already decoded */ }
  const fonts = await loadFonts();

  const album = await prisma.album.findFirst({
    where: { discogsId: { equals: discogsId, mode: "insensitive" } },
    select: { id: true, title: true, artist: true, releaseYear: true, label: true, coverUrl: true },
  }).catch(() => null);

  if (!album) return new ImageResponse(<DefaultCard covers={[]} />, { ...size, fonts });

  const [owners, listens, cover] = await Promise.all([
    prisma.collection.findMany({ where: { albumId: album.id }, distinct: ["userId"], select: { userId: true } })
      .then((r) => r.length).catch(() => 0),
    prisma.listeningLog.count({ where: { albumId: album.id, userDeleted: false } }).catch(() => 0),
    fetchCover(album.coverUrl),
  ]);

  const title = truncate(album.title, 80);
  const titleSize = title.length <= 18 ? 66 : title.length <= 34 ? 54 : title.length <= 56 ? 44 : 36;
  const facts = [album.releaseYear ? String(album.releaseYear) : null, album.label ? truncate(album.label, 30) : null].filter(Boolean).join(" · ");
  const social = [
    owners > 0 ? `${plural(owners, "fan")} ${owners === 1 ? "owns" : "own"} this` : null,
    listens > 0 ? plural(listens, "listen") : null,
  ].filter(Boolean).join(" · ");

  return new ImageResponse(
    (
      <Frame>
        <div style={{ display: "flex", width: "100%", padding: "54px 56px 54px 54px" }}>
          <Cover src={cover} size={500} shadow={12} border={5} />
          <div style={{ display: "flex", flexDirection: "column", marginLeft: 56, flex: 1, paddingTop: 6 }}>
            <div style={{ display: "flex", fontSize: titleSize, fontWeight: 700, letterSpacing: -1.5, lineHeight: 1.05 }}>{title}</div>
            <div style={{ display: "flex", fontSize: 34, fontWeight: 700, color: ACCENT, marginTop: 14, lineHeight: 1.1 }}>
              {truncate(album.artist, 40)}
            </div>
            {facts && (
              <div style={{ display: "flex", fontFamily: MONO, fontSize: 22, color: MUTED, marginTop: 18 }}>{facts}</div>
            )}
            <div style={{ display: "flex", flexDirection: "column", marginTop: "auto" }}>
              {social && (
                <div
                  style={{
                    display: "flex", alignSelf: "flex-start", fontFamily: MONO, fontWeight: 700, fontSize: 22,
                    border: `4px solid ${INK}`, background: "#FFFFFF", padding: "8px 14px", marginBottom: 28,
                    boxShadow: `6px 6px 0 ${INK}`,
                  }}
                >
                  {social}
                </div>
              )}
              <Wordmark size={26} />
            </div>
          </div>
        </div>
      </Frame>
    ),
    { ...size, fonts }
  );
}
