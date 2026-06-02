import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ClerkProvider } from "@clerk/nextjs";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import Navbar from "@/components/Navbar";

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

  if (clerkId) {
    const user = await prisma.user.findUnique({
      where: { clerkId },
      include: { collection: { include: { album: true } } },
    });

    if (user) {
      username = user.username;
      avatarUrl = user.avatarUrl ?? null;

      if (user.nowSpinning) {
        const spinningAlbum = await prisma.album.findUnique({
          where: { id: user.nowSpinning },
        });
        if (spinningAlbum) {
          nowSpinning = { title: spinningAlbum.title, artist: spinningAlbum.artist };
        }
      }
    }
  }

  return (
    <ClerkProvider>
      <html
        lang="en"
        className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
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
