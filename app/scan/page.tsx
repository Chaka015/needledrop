import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import ScanClient from "./ScanClient";

export const metadata = { title: "Scan a record" };

// Home-screen shortcut target: opens straight to the barcode scanner.
export default async function ScanPage() {
  const { userId } = await auth();
  if (!userId) redirect(`/sign-in?redirect_url=${encodeURIComponent("/scan")}`);

  return <ScanClient />;
}
