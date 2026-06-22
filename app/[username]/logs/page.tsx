import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { prisma } from "@/lib/prisma";

interface Props {
  params: Promise<{ username: string }>;
  searchParams: Promise<{ filter?: string }>;
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

const FILTER_LABELS: Record<string, string> = {
  year: "This Year",
  week: "This Week",
};

export default async function LogsPage({ params, searchParams }: Props) {
  const { username } = await params;
  const { filter } = await searchParams;

  const user = await prisma.user.findUnique({
    where: { username },
    select: { id: true, username: true },
  });
  if (!user) notFound();

  const now = new Date();
  let since: Date | undefined;
  if (filter === "year") {
    since = new Date(now.getFullYear(), 0, 1);
  } else if (filter === "week") {
    const dow = new Date(now);
    dow.setDate(now.getDate() - now.getDay());
    dow.setHours(0, 0, 0, 0);
    since = dow;
  }

  const logs = await prisma.listeningLog.findMany({
    where: {
      userId: user.id,
      userDeleted: false,
      ...(since ? { playedAt: { gte: since } } : {}),
    },
    orderBy: { playedAt: "desc" },
    include: { album: true },
  });

  const filterLabel = filter ? FILTER_LABELS[filter] : "All Time";

  return (
    <div className="min-h-screen font-sans" style={{ backgroundColor: C.bg, color: C.text }}>
      <div className="max-w-3xl mx-auto px-6 py-10">

        <div className="mb-6 text-xs font-mono" style={{ color: C.subtle }}>
          <Link href={`/${username}`} className="hover:underline" style={{ color: C.muted }}>{username}</Link>
          {" / "}
          <span>logs</span>
        </div>

        <div className="flex items-center justify-between mb-6">
          <h1 className="text-xs font-mono uppercase tracking-widest" style={{ color: C.subtle }}>
            Listening Logs — {filterLabel}
          </h1>
          <span className="text-xs font-mono" style={{ color: C.muted }}>{logs.length} entries</span>
        </div>

        {/* Filter tabs */}
        <div className="flex gap-2 mb-6">
          {[
            { label: "ALL TIME", href: `/${username}/logs` },
            { label: "THIS YEAR", href: `/${username}/logs?filter=year` },
            { label: "THIS WEEK", href: `/${username}/logs?filter=week` },
          ].map((f) => {
            const active = f.label === (filter ? FILTER_LABELS[filter]?.toUpperCase() : "ALL TIME");
            return (
              <Link key={f.label} href={f.href}
                className="px-3 py-1.5 text-xs font-mono transition-colors duration-100"
                style={{
                  backgroundColor: active ? C.accent : C.surface,
                  color: active ? C.text : C.muted,
                  border: `1px solid ${active ? C.accent : C.border}`,
                  borderRadius: 4,
                }}>
                {f.label}
              </Link>
            );
          })}
        </div>

        {logs.length === 0 ? (
          <div className="p-10 text-center text-sm font-mono" style={{ border: `1px dashed ${C.border}`, color: C.subtle }}>
            No listens logged {filterLabel.toLowerCase()}.
          </div>
        ) : (
          <div className="space-y-1">
            {logs.map((log) => (
              <Link key={log.id} href={`/album/${encodeURIComponent(log.album.discogsId)}`}
                className="flex items-center gap-4 p-3 group"
                style={{ backgroundColor: C.surface, border: `1px solid ${C.border}` }}>
                {log.album.coverUrl ? (
                  <Image src={log.album.coverUrl} alt={log.album.title} width={40} height={40}
                    className="object-cover shrink-0" style={{ width: 40, height: 40, borderRadius: 4 }} unoptimized />
                ) : (
                  <div className="shrink-0" style={{ width: 40, height: 40, backgroundColor: C.surfaceRaised, borderRadius: 4 }} />
                )}
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold truncate" style={{ color: C.text }}>{log.album.title}</div>
                  <div className="text-xs font-mono truncate" style={{ color: C.muted }}>{log.album.artist}</div>
                </div>
                <div className="text-right shrink-0">
                  {log.rating != null && (
                    <div className="text-xs font-mono font-bold mb-0.5" style={{ color: C.accent }}>
                      {log.rating.toFixed(1)}★
                    </div>
                  )}
                  <div className="text-xs font-mono" style={{ color: C.subtle }}>
                    {new Date(log.playedAt).toLocaleDateString()}
                  </div>
                  {log.source === "streaming" ? (
                    <div className="text-xs font-mono" style={{ color: C.muted }}>▶</div>
                  ) : log.format ? (
                    <div className="text-xs font-mono" style={{ color: C.subtle }}>{log.format}</div>
                  ) : null}
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
