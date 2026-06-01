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
    <div
      className="flex min-h-screen items-center justify-center text-center"
      style={{ backgroundColor: "#2D2926", color: "#F7F1E3" }}
    >
      <main className="flex flex-col items-center gap-8 py-20 px-6">
        <Image
          src="/nd_splashpage.png"
          alt="NeedleDrop Logo"
          width={320}
          height={320}
          priority
        />

        <div>
          <h1
            className="text-5xl font-bold tracking-tight"
            style={{ color: "#F7F1E3" }}
          >
            NeedleDrop
          </h1>
          <p
            className="mt-3 text-sm uppercase tracking-widest font-mono"
            style={{ color: "#A89F94" }}
          >
            / Log your listening
          </p>
        </div>

        {!clerkId ? (
          <SignInButton mode="modal">
            <button
              className="mt-2 px-8 py-3 text-sm font-medium transition-colors duration-100"
              style={{
                backgroundColor: "#E67E22",
                color: "#F7F1E3",
                borderRadius: "4px",
              }}
              onMouseEnter={(e) =>
                (e.currentTarget.style.backgroundColor = "#CF711E")
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.backgroundColor = "#E67E22")
              }
            >
              Get started
            </button>
          </SignInButton>
        ) : username ? (
          <Link
            href={`/${username}`}
            className="mt-2 px-8 py-3 text-sm font-medium transition-colors duration-100"
            style={{
              backgroundColor: "#E67E22",
              color: "#F7F1E3",
              borderRadius: "4px",
            }}
          >
            Go to my profile →
          </Link>
        ) : (
          <Link
            href="/onboarding"
            className="mt-2 px-8 py-3 text-sm font-medium transition-colors duration-100"
            style={{
              backgroundColor: "#E67E22",
              color: "#F7F1E3",
              borderRadius: "4px",
            }}
          >
            Set up your profile →
          </Link>
        )}
      </main>
    </div>
  );
}
