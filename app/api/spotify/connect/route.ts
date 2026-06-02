import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

const SPOTIFY_CLIENT_ID = process.env.SPOTIFY_CLIENT_ID!;
const REDIRECT_URI = `${process.env.NEXT_PUBLIC_APP_URL}/api/spotify/callback`;

const SCOPES = [
  "user-read-recently-played",
  "user-read-currently-playing",
].join(" ");

export async function GET() {
  const { userId: clerkId } = await auth();
  if (!clerkId) return NextResponse.redirect("/");

  const params = new URLSearchParams({
    client_id: SPOTIFY_CLIENT_ID,
    response_type: "code",
    redirect_uri: REDIRECT_URI,
    scope: SCOPES,
  });

  return NextResponse.redirect(`https://accounts.spotify.com/authorize?${params}`);
}
