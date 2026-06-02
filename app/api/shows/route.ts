import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

const BANDSINTOWN_KEY = process.env.BANDSINTOWN_API_KEY;
const SETLISTFM_KEY = process.env.SETLIST_FM_API_KEY;

interface BTEvent {
  id: string;
  datetime: string;
  venue: { name: string; city: string };
  offers?: { url: string }[];
}

interface SLSetlist {
  id: string;
  eventDate: string; // "DD-MM-YYYY"
  venue: { name: string; city: { name: string; country: { code: string } } };
}

export async function GET(req: Request) {
  const { userId: clerkId } = await auth();
  const { searchParams } = new URL(req.url);
  const artistName = searchParams.get("artist") ?? "";
  const artistMbid = searchParams.get("mbid") ?? "";

  let upcoming: object[] = [];
  let past: object[] = [];
  let myAttendance: string[] = [];

  // Bandsintown upcoming shows
  if (BANDSINTOWN_KEY && artistName) {
    try {
      const res = await fetch(
        `https://rest.bandsintown.com/artists/${encodeURIComponent(artistName)}/events?app_id=${BANDSINTOWN_KEY}`,
        { next: { revalidate: 3600 } }
      );
      if (res.ok) {
        const events: BTEvent[] = await res.json();
        upcoming = (Array.isArray(events) ? events : []).slice(0, 10).map((e) => ({
          setlistFmId: `bt:${e.id}`,
          date: e.datetime,
          venueName: e.venue.name,
          venueCity: e.venue.city,
          ticketUrl: e.offers?.[0]?.url,
        }));
      }
    } catch { /* stub */ }
  } else {
    // Stub data when no API key
    upcoming = [];
  }

  // Setlist.fm past shows
  if (SETLISTFM_KEY && artistMbid) {
    try {
      const res = await fetch(
        `https://api.setlist.fm/rest/1.0/artist/${artistMbid}/setlists?p=1`,
        { headers: { "x-api-key": SETLISTFM_KEY, Accept: "application/json" }, next: { revalidate: 3600 } }
      );
      if (res.ok) {
        const data = await res.json();
        const setlists: SLSetlist[] = data.setlist ?? [];
        past = setlists.slice(0, 20).map((s) => {
          const [d, m, y] = s.eventDate.split("-");
          return {
            setlistFmId: s.id,
            date: `${y}-${m}-${d}`,
            venueName: s.venue.name,
            venueCity: `${s.venue.city.name}, ${s.venue.city.country.code}`,
          };
        });
      }
    } catch { /* stub */ }
  } else {
    past = [];
  }

  // Attendance counts for each past show
  if (past.length > 0) {
    const ids = (past as { setlistFmId: string }[]).map((s) => s.setlistFmId);
    const counts = await prisma.showAttendance.groupBy({
      by: ["setlistFmId"],
      where: { setlistFmId: { in: ids } },
      _count: { setlistFmId: true },
    });
    const countMap = Object.fromEntries(counts.map((c) => [c.setlistFmId, c._count.setlistFmId]));
    past = (past as { setlistFmId: string }[]).map((s) => ({ ...s, attendCount: countMap[s.setlistFmId] ?? 0 }));
  }

  // Current user's attendance
  if (clerkId && past.length > 0) {
    const user = await prisma.user.findUnique({ where: { clerkId }, select: { id: true } });
    if (user) {
      const attended = await prisma.showAttendance.findMany({
        where: {
          userId: user.id,
          setlistFmId: { in: (past as { setlistFmId: string }[]).map((s) => s.setlistFmId) },
        },
        select: { setlistFmId: true },
      });
      myAttendance = attended.map((a) => a.setlistFmId);
    }
  }

  return NextResponse.json({ upcoming, past, myAttendance });
}
