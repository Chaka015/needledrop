export interface NewsArticle {
  title: string;
  source: string;
  publishedAt: string;
  url: string;
}

export async function fetchArtistNews(artistName: string): Promise<NewsArticle[]> {
  const key = process.env.NEWSAPI_KEY;
  if (!key) return [];

  try {
    const q = encodeURIComponent(`"${artistName}" music`);
    const res = await fetch(
      `https://newsapi.org/v2/everything?q=${q}&sortBy=publishedAt&pageSize=3&language=en`,
      {
        headers: { "X-Api-Key": key },
        next: { revalidate: 3600 },
      }
    );
    if (!res.ok) return [];
    const data = await res.json();
    return (data.articles ?? []).slice(0, 3).map((a: {
      title: string;
      source: { name: string };
      publishedAt: string;
      url: string;
    }) => ({
      title: a.title,
      source: a.source?.name ?? "Unknown",
      publishedAt: a.publishedAt,
      url: a.url,
    }));
  } catch {
    return [];
  }
}
