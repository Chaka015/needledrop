import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import crypto from "crypto";

const SPOTIFY_CLIENT_ID = process.env.SPOTIFY_CLIENT_ID!;

const SCOPES = [
  "user-read-recently-played",
  "user-read-currently-playing",
].join(" ");

function appUrl(req: Request) {
  return process.env.NEXT_PUBLIC_APP_URL ?? new URL(req.url).origin;
}

export async function GET(req: Request) {
  const { userId: clerkId } = await auth();
  if (!clerkId) return NextResponse.redirect(new URL("/", req.url));

  const redirectUri = `${appUrl(req)}/api/spotify/callback`;

  // CSRF state token
  const state = crypto.randomBytes(16).toString("hex");
  const cookieStore = await cookies();
  cookieStore.set("spotify_oauth_state", state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 600,
    path: "/",
  });

  const params = new URLSearchParams({
    client_id: SPOTIFY_CLIENT_ID,
    response_type: "code",
    redirect_uri: redirectUri,
    scope: SCOPES,
    state,
  });

  return NextResponse.redirect(`https://accounts.spotify.com/authorize?${params}`);
}
