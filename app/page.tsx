import Image from "next/image";
import Link from "next/link";
import { SignInButton } from "@clerk/nextjs";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";

export default async function Home() {
  const { userId: clerkId } = await auth();

  let username: string | null = null;
  if (clerkId) {
    const user = await prisma.user.findUnique({
      where: { clerkId },
      select: { username: true },
    });
    username = user?.username ?? null;
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-white text-center dark:bg-black">
      <main className="flex flex-col items-center gap-8 py-20 px-6">
        <Image
          src="/nd_splashpage.png"
          alt="NeedleDrop Logo"
          width={400}
          height={400}
          priority
        />

        <h1 className="text-4xl font-bold text-black dark:text-zinc-50">
          NeedleDrop
        </h1>

        <p className="text-lg text-zinc-600 dark:text-zinc-400">
          / Log your listening
        </p>

        {!clerkId ? (
          <SignInButton mode="modal">
            <button className="px-6 py-3 bg-black text-white rounded-full text-sm font-medium hover:bg-zinc-800 transition-colors dark:bg-white dark:text-black">
              Get started
            </button>
          </SignInButton>
        ) : username ? (
          <Link
            href={`/${username}`}
            className="px-6 py-3 bg-black text-white rounded-full text-sm font-medium hover:bg-zinc-800 transition-colors dark:bg-white dark:text-black"
          >
            Go to my profile
          </Link>
        ) : (
          <Link
            href="/onboarding"
            className="px-6 py-3 bg-black text-white rounded-full text-sm font-medium hover:bg-zinc-800 transition-colors dark:bg-white dark:text-black"
          >
            Set up your profile
          </Link>
        )}
      </main>
    </div>
  );
}
