import { prisma } from "@/lib/prisma";
import { notFound, redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import {
  getDateRange,
  getStatStrip,
  getGenreBreakdown,
  getListeningVelocity,
  getFormatPreference,
  getDecadeBreakdown,
  getCollectionBreadth,
  getWantlistOverlap,
  getTopArtists,
  getTopAlbums,
  getFormatBreakdown,
  getRatingDistribution,
  getDailyData,
  type TimeRange,
} from "@/lib/analytics";
import AnalyticsDashboard from "@/components/AnalyticsDashboard";

interface Props {
  params: Promise<{ username: string }>;
  searchParams: Promise<{ range?: string }>;
}

const VALID_RANGES: TimeRange[] = ["month", "quarter", "year", "all"];

export default async function AnalyticsPage({ params, searchParams }: Props) {
  const { username } = await params;
  const { range: rawRange } = await searchParams;
  const range: TimeRange = VALID_RANGES.includes(rawRange as TimeRange)
    ? (rawRange as TimeRange)
    : "month";

  const { userId: clerkId } = await auth();

  const profileUser = await prisma.user.findUnique({ where: { username } });
  if (!profileUser) notFound();

  const viewer = clerkId ? await prisma.user.findUnique({ where: { clerkId } }) : null;
  if (viewer?.id !== profileUser.id) redirect(`/${username}`);

  const { start, end } = getDateRange(range);
  const now = new Date();
  const calendarYear = now.getFullYear();
  const calendarMonth = now.getMonth();
  const uid = profileUser.id;

  const [
    stats,
    genres,
    velocity,
    formatPreference,
    decades,
    collectionBreadth,
    wantlistOverlap,
    topArtists,
    topAlbums,
    formatBreakdown,
    ratingDist,
    dailyData,
  ] = await Promise.all([
    getStatStrip(uid, start, end),
    getGenreBreakdown(uid, start, end),
    getListeningVelocity(uid),
    getFormatPreference(uid, start, end),
    getDecadeBreakdown(uid, start, end),
    getCollectionBreadth(uid),
    getWantlistOverlap(uid, start, end),
    getTopArtists(uid, start, end),
    getTopAlbums(uid, start, end),
    getFormatBreakdown(uid, start, end),
    getRatingDistribution(uid, start, end),
    getDailyData(uid, calendarYear, calendarMonth),
  ]);

  return (
    <AnalyticsDashboard
      username={username}
      range={range}
      stats={stats}
      genres={genres}
      velocity={velocity}
      formatPreference={formatPreference}
      decades={decades}
      collectionBreadth={collectionBreadth}
      wantlistOverlap={wantlistOverlap}
      dailyData={dailyData}
      calendarYear={calendarYear}
      calendarMonth={calendarMonth}
      topArtists={topArtists}
      topAlbums={topAlbums}
      formatBreakdown={formatBreakdown}
      ratingDist={ratingDist}
    />
  );
}
