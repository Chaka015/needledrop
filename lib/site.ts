// Canonical site origin. Set NEXT_PUBLIC_SITE_URL in Vercel when the
// domain changes; the fallback is the current production deployment.
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://needledrop-five.vercel.app").replace(/\/+$/, "");

/** Host without protocol, e.g. "needledrop-five.vercel.app". */
export const SITE_HOST = SITE_URL.replace(/^https?:\/\//, "");
