import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { stripe, PREMIUM_PRICE_ID } from "@/lib/stripe";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const { userId: clerkId } = await auth();
  if (!clerkId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = await prisma.user.findUnique({ where: { clerkId } });
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  if (user.isPremium) {
    return NextResponse.json({ error: "Already premium" }, { status: 400 });
  }

  const { origin } = new URL(req.url);

  let customerId = user.stripeCustomerId;
  if (!customerId) {
    const customer = await stripe.customers.create({
      email: user.username + "@needledrop.local",
      metadata: { userId: user.id, username: user.username },
    });
    customerId = customer.id;
    await prisma.user.update({ where: { id: user.id }, data: { stripeCustomerId: customerId } });
  }

  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: "subscription",
    payment_method_types: ["card"],
    line_items: [{ price: PREMIUM_PRICE_ID, quantity: 1 }],
    success_url: `${origin}/settings?premium=success`,
    cancel_url: `${origin}/settings?premium=cancel`,
    metadata: { userId: user.id },
  });

  return NextResponse.json({ url: session.url });
}
