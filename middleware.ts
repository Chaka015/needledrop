import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const isPublicRoute = createRouteMatcher([
  "/",
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/api/webhooks(.*)",
  "/:username",
]);

export default clerkMiddleware(async (auth, req) => {
  const { userId: clerkId } = await auth();

  // Not logged in — let public routes through, protect everything else
  if (!clerkId) {
    if (!isPublicRoute(req)) {
      const signInUrl = new URL("/", req.url);
      return NextResponse.redirect(signInUrl);
    }
    return NextResponse.next();
  }

  // Logged in — check if they have a real username
  const url = req.nextUrl.pathname;

  // Don't redirect if already on onboarding or api routes
  if (url.startsWith("/onboarding") || url.startsWith("/api")) {
    return NextResponse.next();
  }

  const user = await prisma.user.findUnique({
    where: { clerkId },
    select: { username: true },
  });

  const hasUsername =
    user?.username && !user.username.startsWith("user_");

  if (!hasUsername && url !== "/onboarding") {
    return NextResponse.redirect(new URL("/onboarding", req.url));
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
