"use client";

import { useState, useEffect } from "react";

const C = {
  surface:       "var(--skin-surface)",
  surfaceRaised: "var(--skin-surface-raised)",
  border:        "var(--skin-border)",
  text:          "var(--skin-text)",
  muted:         "var(--skin-muted)",
  subtle:        "var(--skin-subtle)",
  accent:        "var(--skin-accent)",
  accentHover:   "var(--skin-accent-hover)",
};

interface Show {
  setlistFmId: string;
  date: string;
  venueName: string;
  venueCity: string;
  ticketUrl?: string;
  iWasThere?: boolean;
  attendCount?: number;
}

interface ArtistShowsClientProps {
  artistMbid: string;
  artistName: string;
  userId: string | null;
}

export default function ArtistShowsClient({ artistMbid, artistName, userId }: ArtistShowsClientProps) {
  const [upcomingShows, setUpcomingShows] = useState<Show[]>([]);
  const [pastShows, setPastShows] = useState<Show[]>([]);
  const [loading, setLoading] = useState(true);
  const [attendance, setAttendance] = useState<Set<string>>(new Set());

  useEffect(() => {
    async function load() {
      const res = await fetch(`/api/shows?mbid=${encodeURIComponent(artistMbid)}&artist=${encodeURIComponent(artistName)}`);
      if (res.ok) {
        const data = await res.json();
        setUpcomingShows(data.upcoming ?? []);
        setPastShows(data.past ?? []);
        setAttendance(new Set((data.myAttendance ?? []) as string[]));
      }
      setLoading(false);
    }
    load();
  }, [artistMbid, artistName]);

  async function toggleAttendance(show: Show) {
    if (!userId) return;
    const attending = attendance.has(show.setlistFmId);
    const endpoint = attending ? "/api/shows/attend" : "/api/shows/attend";
    const method = attending ? "DELETE" : "POST";
    const res = await fetch(endpoint, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        setlistFmId: show.setlistFmId,
        artistMbid,
        venueName: show.venueName,
        venueCity: show.venueCity,
        showDate: show.date,
      }),
    });
    if (res.ok) {
      setAttendance((prev) => {
        const next = new Set(prev);
        if (attending) next.delete(show.setlistFmId);
        else next.add(show.setlistFmId);
        return next;
      });
    }
  }

  if (loading) {
    return (
      <div className="text-xs font-mono" style={{ color: C.subtle }}>Loading shows...</div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Upcoming Shows — only render if there are shows */}
      {upcomingShows.length > 0 && (
        <section>
          <h2 className="text-xs font-mono uppercase tracking-widest mb-3" style={{ color: C.subtle }}>
            Upcoming Shows
          </h2>
          <div className="space-y-2">
            {upcomingShows.map((show) => (
              <div key={show.setlistFmId} className="p-3"
                style={{ backgroundColor: C.surface, border: `1px solid ${C.border}` }}>
                <div className="text-xs font-mono mb-0.5" style={{ color: C.accent }}>
                  {new Date(show.date).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
                </div>
                <div className="text-sm font-semibold" style={{ color: C.text }}>{show.venueName}</div>
                <div className="text-xs font-mono" style={{ color: C.muted }}>{show.venueCity}</div>
                {show.ticketUrl && (
                  <a href={show.ticketUrl} target="_blank" rel="noopener noreferrer"
                    className="inline-block mt-2 text-xs font-mono hover:underline" style={{ color: C.accent }}>
                    Buy Tickets →
                  </a>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Show History */}
      <section>
        <h2 className="text-xs font-mono uppercase tracking-widest mb-3" style={{ color: C.subtle }}>
          Show History
        </h2>
        {pastShows.length === 0 ? (
          <p className="text-xs font-mono" style={{ color: C.subtle }}>No show history found.</p>
        ) : (
          <div className="space-y-2">
            {pastShows.slice(0, 10).map((show) => {
              const wasThere = attendance.has(show.setlistFmId);
              return (
                <div key={show.setlistFmId} className="p-3"
                  style={{ backgroundColor: C.surface, border: `1px solid ${wasThere ? C.accent : C.border}` }}>
                  <div className="text-xs font-mono mb-0.5" style={{ color: C.subtle }}>
                    {new Date(show.date).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
                  </div>
                  <div className="text-sm font-semibold" style={{ color: C.text }}>{show.venueName}</div>
                  <div className="text-xs font-mono mb-2" style={{ color: C.muted }}>{show.venueCity}</div>
                  {userId && (
                    <button
                      onClick={() => toggleAttendance(show)}
                      className="text-xs font-mono transition-colors duration-100"
                      style={{ color: wasThere ? C.accent : C.subtle }}
                      onMouseEnter={(e) => !wasThere && (e.currentTarget.style.color = C.text)}
                      onMouseLeave={(e) => !wasThere && (e.currentTarget.style.color = C.subtle)}
                    >
                      {wasThere ? "✓ I WAS THERE" : "I was there"}
                    </button>
                  )}
                  {(show.attendCount ?? 0) > 0 && (
                    <span className="ml-3 text-xs font-mono" style={{ color: C.subtle }}>
                      {show.attendCount} {show.attendCount === 1 ? "person" : "people"}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
