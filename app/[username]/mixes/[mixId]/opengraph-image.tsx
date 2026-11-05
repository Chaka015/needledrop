import { ImageResponse } from "next/og";
import { prisma } from "@/lib/prisma";
import {
  Cover, DefaultCard, Frame, MONO, MUTED, OG_SIZE, Wordmark,
  fetchCovers, loadFonts, plural, truncate,
} from "@/lib/og";

export const runtime = "nodejs";
export const revalidate = 3600;
export const size = OG_SIZE;
export const contentType = "image/png";
export const alt = "A NeedleDrop mix: a collage of four album covers with the mix title and its curator";

export default async function Image({ params }: { params: Promise<{ username: string; mixId: string }> }) {
  const { username, mixId } = await params;
  const fonts = await loadFonts();

  const mix = await prisma.mix.findUnique({
    where: { id: mixId },
    select: {
      title: true,
      isPublic: true,
      user: { select: { username: true } },
      _count: { select: { items: true } },
      items: { orderBy: { position: "asc" }, take: 4, select: { album: { select: { coverUrl: true } } } },
    },
  }).catch(() => null);

  // Missing or private mixes get the generic site card: no title, no covers.
  if (!mix || !mix.isPublic || mix.user.username !== username) {
    return new ImageResponse(<DefaultCard covers={[]} />, { ...size, fonts });
  }

  const covers = await fetchCovers(mix.items.map((i) => i.album.coverUrl));
  while (covers.length < 4) covers.push(null);

  const title = truncate(mix.title, 70);
  const titleSize = title.length <= 16 ? 76 : title.length <= 30 ? 60 : title.length <= 48 ? 48 : 40;
  const tile = 238;

  return new ImageResponse(
    (
      <Frame>
        <div style={{ display: "flex", width: "100%", padding: "52px 56px 52px 54px" }}>
          {/* 2×2 collage */}
          <div style={{ display: "flex", flexDirection: "column" }}>
            {[0, 2].map((row) => (
              <div key={row} style={{ display: "flex", marginBottom: row === 0 ? 22 : 0 }}>
                <div style={{ display: "flex", marginRight: 22 }}>
                  <Cover src={covers[row]} size={tile} shadow={8} />
                </div>
                <Cover src={covers[row + 1]} size={tile} shadow={8} />
              </div>
            ))}
          </div>

          <div style={{ display: "flex", flexDirection: "column", marginLeft: 60, flex: 1 }}>
            <div style={{ display: "flex", fontSize: titleSize, fontWeight: 700, letterSpacing: -1.5, lineHeight: 1.05, marginTop: 4 }}>
              {title}
            </div>
            <div style={{ display: "flex", fontSize: 32, fontWeight: 700, marginTop: 18 }}>
              <span style={{ color: MUTED }}>a mix by&nbsp;</span>
              <span>{truncate(username, 24)}</span>
            </div>
            <div style={{ display: "flex", fontFamily: MONO, fontSize: 24, marginTop: 14 }}>{plural(mix._count.items, "record")}</div>
            <div style={{ display: "flex", marginTop: "auto" }}>
              <Wordmark size={26} />
            </div>
          </div>
        </div>
      </Frame>
    ),
    { ...size, fonts }
  );
}
