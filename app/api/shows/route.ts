import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

const TICKETMASTER_KEY = process.env.TICKETMASTER_API_KEY;
const SETLISTFM_KEY = process.env.SETLIST_FM_API_KEY;

interface TMEvent {
  id: string;
  name: string;
  dates: { start: { dateTime?: string; localDate: string } };
  _embedded?: { venues?: { name: string; city: { name: string } }[] };
  url?: string;
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

  // Ticketmaster upcoming shows
  if (TICKETMASTER_KEY && artistName) {
    try {
      const res = await fetch(
        `https://app.ticketmaster.com/discovery/v2/events.json?keyword=${encodeURIComponent(artistName)}&classificationName=music&size=10&apikey=${TICKETMASTER_KEY}`,
        { next: { revalidate: 3600 } }
      );
      if (res.ok) {
        const data = await res.json();
        const events: TMEvent[] = data._embedded?.events ?? [];
        upcoming = events.map((e) => ({
          setlistFmId: `tm:${e.id}`,
          date: e.dates.start.dateTime ?? e.dates.start.localDate,
          venueName: e._embedded?.venues?.[0]?.name ?? "Unknown Venue",
          venueCity: e._embedded?.venues?.[0]?.city?.name ?? "",
          ticketUrl: e.url,
        }));
      }
    } catch { /* stub */ }
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
