import { NextResponse } from "next/server";

const HEADERS = (token: string) => ({
  Authorization: `Discogs token=${token}`,
  "User-Agent": "NeedleDrop/1.0",
});

// Given a title+artist query, resolve the Discogs master release and return
// the label/catalog number of its curated main_release — Discogs' notion of
// "the" representative pressing for a master, rather than an arbitrary or
// statistically meaningless pick among dozens of reissues.
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q");
  const empty = { label: null, catalogNumber: null };
  if (!q) return NextResponse.json(empty);

  const token = process.env.DISCOGS_TOKEN;
  if (!token) return NextResponse.json(empty);

  try {
    const searchRes = await fetch(
      `https://api.discogs.com/database/search?q=${encodeURIComponent(q)}&type=master&per_page=1`,
      { headers: HEADERS(token), next: { revalidate: 86400 } }
    );
    if (!searchRes.ok) return NextResponse.json(empty);
    const searchData = await searchRes.json();
    const masterId = searchData.results?.[0]?.id;
    if (!masterId) return NextResponse.json(empty);

    const masterRes = await fetch(`https://api.discogs.com/masters/${masterId}`, {
      headers: HEADERS(token), next: { revalidate: 86400 },
    });
    if (!masterRes.ok) return NextResponse.json(empty);
    const masterData = await masterRes.json();
    const mainReleaseId = masterData.main_release;
    if (!mainReleaseId) return NextResponse.json(empty);

    const releaseRes = await fetch(`https://api.discogs.com/releases/${mainReleaseId}`, {
      headers: HEADERS(token), next: { revalidate: 86400 },
    });
    if (!releaseRes.ok) return NextResponse.json(empty);
    const releaseData = await releaseRes.json();
    const firstLabel = releaseData.labels?.[0];

    return NextResponse.json({
      label: firstLabel?.name ?? null,
      catalogNumber: firstLabel?.catno ?? null,
    });
  } catch {
    return NextResponse.json(empty);
  }
}
