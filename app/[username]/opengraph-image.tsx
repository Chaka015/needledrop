import { ImageResponse } from "next/og";
import { prisma } from "@/lib/prisma";
import {
  ACCENT, Cover, DefaultCard, Frame, INK, MONO, MUTED, OG_SIZE, WHITE, Wordmark,
  fetchCover, fetchCovers, fitSize, loadFonts, plural, truncate,
} from "@/lib/og";

export const runtime = "nodejs";
export const revalidate = 3600;
export const size = OG_SIZE;
export const contentType = "image/png";
export const alt = "A NeedleDrop fan's profile: their name, record and listen counts, and their Top 5 records";

export default async function Image({ params }: { params: Promise<{ username: string }> }) {
  const { username } = await params;
  const fonts = await loadFonts();

  const user = await prisma.user.findUnique({
    where: { username },
    select: {
      id: true,
      username: true,
      nowSpinning: true,
      nowSpinningAt: true,
      _count: { select: { collection: true } },
      collection: {
        where: { isFeatured: true },
        orderBy: { featuredPosition: "asc" },
        take: 5,
        select: { album: { select: { coverUrl: true } } },
      },
    },
  }).catch(() => null);

  if (!user) return new ImageResponse(<DefaultCard covers={[]} />, { ...size, fonts });

  const onAir = !!(user.nowSpinning && user.nowSpinningAt && user.nowSpinningAt > new Date(Date.now() - 60 * 60 * 1000));

  // No Top 5 picked yet → the latest additions stand in
  let shelfUrls = user.collection.map((c) => c.album.coverUrl);
  if (shelfUrls.length === 0) {
    const latest = await prisma.collection.findMany({
      where: { userId: user.id },
      orderBy: { addedAt: "desc" },
      take: 5,
      select: { album: { select: { coverUrl: true } } },
    }).catch(() => []);
    shelfUrls = latest.map((c) => c.album.coverUrl);
  }

  const [listens, spinning] = await Promise.all([
    prisma.listeningLog.count({ where: { userId: user.id, userDeleted: false } }).catch(() => 0),
    onAir
      ? prisma.album.findUnique({ where: { id: user.nowSpinning! }, select: { title: true, artist: true, coverUrl: true } }).catch(() => null)
      : Promise.resolve(null),
  ]);

  const [shelf, spinningCover] = await Promise.all([
    fetchCovers(shelfUrls),
    spinning ? fetchCover(spinning.coverUrl) : Promise.resolve(null),
  ]);

  const stats = `${plural(user._count.collection, "record")} · ${plural(listens, "listen")}`;

  // ── On air: big Now Spinning cover on the left ───────────────────────────
  if (spinning) {
    const nameSize = fitSize(user.username, 600, 84, 44, 0.58);
    return new ImageResponse(
      (
        <Frame>
          <div style={{ display: "flex", width: "100%", padding: "56px 60px" }}>
            <div style={{ display: "flex", flexDirection: "column", position: "relative" }}>
              <Cover src={spinningCover} size={400} />
              <div
                style={{
                  position: "absolute", top: -18, left: -14, display: "flex", alignItems: "center",
                  background: ACCENT, color: WHITE, border: `4px solid ${INK}`, padding: "6px 14px",
                  fontFamily: MONO, fontWeight: 700, fontSize: 22, letterSpacing: 2,
                }}
              >
                <div style={{ width: 12, height: 12, borderRadius: 12, background: WHITE, marginRight: 10, display: "flex" }} />
                ON AIR
              </div>
              <div style={{ display: "flex", flexDirection: "column", marginTop: 26, width: 400 }}>
                <div style={{ display: "flex", fontSize: 26, fontWeight: 700 }}>{truncate(spinning.title, 30)}</div>
                <div style={{ display: "flex", fontFamily: MONO, fontSize: 18, color: MUTED, marginTop: 2 }}>{truncate(spinning.artist, 34)}</div>
              </div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", marginLeft: 56, flex: 1 }}>
              <div style={{ display: "flex", justifyContent: "flex-end" }}>
                <Wordmark size={26} />
              </div>
              <div style={{ display: "flex", fontFamily: MONO, fontSize: 20, color: MUTED, letterSpacing: 2, marginTop: 34 }}>NOW SPINNING ON</div>
              <div style={{ display: "flex", fontSize: nameSize, fontWeight: 700, letterSpacing: -1.5, lineHeight: 1.05, marginTop: 4 }}>
                {user.username}
              </div>
              <div style={{ display: "flex", fontFamily: MONO, fontSize: 24, color: INK, marginTop: 14 }}>{stats}</div>
              {shelf.length > 0 && (
                <div style={{ display: "flex", flexDirection: "column", marginTop: "auto" }}>
                  <div style={{ display: "flex", fontFamily: MONO, fontSize: 16, color: MUTED, letterSpacing: 2, marginBottom: 12 }}>TOP 5</div>
                  <div style={{ display: "flex" }}>
                    {shelf.map((c, i) => (
                      <div key={i} style={{ display: "flex", marginRight: i < shelf.length - 1 ? 14 : 0 }}>
                        <Cover src={c} size={100} shadow={6} border={3} />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </Frame>
      ),
      { ...size, fonts }
    );
  }

  // ── Default: name and stats on top, Top 5 shelf below ────────────────────
  const nameSize = fitSize(user.username, 820, 104, 52, 0.58);
  return new ImageResponse(
    (
      <Frame>
        <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", width: "100%", padding: "52px 60px 66px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div style={{ display: "flex", flexDirection: "column" }}>
              <div style={{ display: "flex", fontSize: nameSize, fontWeight: 700, letterSpacing: -2, lineHeight: 1 }}>{user.username}</div>
              <div style={{ display: "flex", fontFamily: MONO, fontSize: 26, marginTop: 14 }}>{stats}</div>
            </div>
            <Wordmark size={26} />
          </div>
          {shelf.length > 0 ? (
            <div style={{ display: "flex" }}>
              {shelf.map((c, i) => (
                <div key={i} style={{ display: "flex", marginRight: i < shelf.length - 1 ? 24 : 0 }}>
                  <Cover src={c} size={194} />
                </div>
              ))}
            </div>
          ) : (
            <div style={{ display: "flex", fontFamily: MONO, fontSize: 24, color: MUTED }}>
              The shelf is still being stocked.
            </div>
          )}
        </div>
      </Frame>
    ),
    { ...size, fonts }
  );
}
