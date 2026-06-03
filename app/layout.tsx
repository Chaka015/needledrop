import type { Metadata } from "next";
import { Newsreader, Hanken_Grotesk, Space_Mono } from "next/font/google";
import "./globals.css";
import { ClerkProvider } from "@clerk/nextjs";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import Navbar from "@/components/Navbar";
import SpotifyAutoSync from "@/components/SpotifyAutoSync";
import { getSkin, skinToVars } from "@/lib/skins";

const newsreader = Newsreader({
  variable: "--font-nd-serif",
  subsets: ["latin"],
  style: ["normal", "italic"],
  weight: ["400", "600"],
  display: "swap",
});

const hankenGrotesk = Hanken_Grotesk({
  variable: "--font-nd-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

const spaceMono = Space_Mono({
  variable: "--font-nd-mono",
  subsets: ["latin"],
  weight: ["400", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "NeedleDrop",
  description: "The social network for record collectors",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const { userId: clerkId } = await auth();

  let username: string | null = null;
  let avatarUrl: string | null = null;
  let nowSpinning: { title: string; artist: string } | null = null;
  let nowSpinningActive = false;
  let userSkin: string | null = null;
  let shouldSpotifySync = false;
  let spotifyConnected = false;

  if (clerkId) {
    const user = await prisma.user.findUnique({
      where: { clerkId },
      select: {
        username: true,
        avatarUrl: true,
        nowSpinning: true,
        nowSpinningAt: true,
        skin: true,
        spotifyConnected: true,
        spotifyLastSyncedAt: true,
      },
    });

    if (user) {
      username = user.username;
      avatarUrl = user.avatarUrl ?? null;
      userSkin = user.skin ?? null;

      if (user.spotifyConnected) {
        spotifyConnected = true;
        const fifteenMinAgo = new Date(Date.now() - 15 * 60 * 1000);
        shouldSpotifySync = !user.spotifyLastSyncedAt || user.spotifyLastSyncedAt < fifteenMinAgo;
      }

      if (user.nowSpinning) {
        const sixtyMinutesAgo = new Date(Date.now() - 60 * 60 * 1000);
        nowSpinningActive = user.nowSpinningAt ? user.nowSpinningAt > sixtyMinutesAgo : false;

        if (nowSpinningActive) {
          const spinningAlbum = await prisma.album.findUnique({
            where: { id: user.nowSpinning },
            select: { title: true, artist: true },
          });
          if (spinningAlbum) {
            nowSpinning = { title: spinningAlbum.title, artist: spinningAlbum.artist };
          }
        }
      }
    }
  }

  const globalSkinVars = skinToVars(getSkin(userSkin)) as React.CSSProperties;

  return (
    <ClerkProvider>
      <html
        lang="en"
        className={`${newsreader.variable} ${hankenGrotesk.variable} ${spaceMono.variable} h-full`}
        style={globalSkinVars}
      >
        <body className="min-h-full flex flex-col">
          <Navbar
            username={username}
            avatarUrl={avatarUrl}
            nowSpinning={nowSpinning}
            spotifyConnected={spotifyConnected}
          />
          <SpotifyAutoSync shouldSync={shouldSpotifySync} spotifyConnected={spotifyConnected} />
          {children}
        </body>
      </html>
    </ClerkProvider>
  );
}
