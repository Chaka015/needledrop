import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ClerkProvider } from "@clerk/nextjs";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import Navbar from "@/components/Navbar";
import { getSkin, skinToVars } from "@/lib/skins";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "NeedleDrop",
  description: "Log your listening",
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

  if (clerkId) {
    const user = await prisma.user.findUnique({
      where: { clerkId },
      select: {
        username: true,
        avatarUrl: true,
        nowSpinning: true,
        nowSpinningAt: true,
        skin: true,
      },
    });

    if (user) {
      username = user.username;
      avatarUrl = user.avatarUrl ?? null;
      userSkin = user.skin ?? null;

      if (user.nowSpinning) {
        // Only treat as active if set within the last 60 minutes
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

  // Apply the logged-in user's skin as CSS variables globally on <html>
  // Profile pages override this via SkinApplicator (for the viewed profile's skin)
  const globalSkinVars = skinToVars(getSkin(userSkin)) as React.CSSProperties;

  return (
    <ClerkProvider>
      <html
        lang="en"
        className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
        style={globalSkinVars}
      >
        <body className="min-h-full flex flex-col">
          <Navbar
            username={username}
            avatarUrl={avatarUrl}
            nowSpinning={nowSpinning}
          />
          {children}
        </body>
      </html>
    </ClerkProvider>
  );
}
