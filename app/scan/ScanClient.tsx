"use client";

import { useRouter } from "next/navigation";
import NowSpinningModal from "@/components/NowSpinningModal";

export default function ScanClient() {
  const router = useRouter();
  // "/" sends signed-in fans on to their own profile
  const leave = () => router.push("/");

  return (
    <div className="flex-1" style={{ minHeight: "100dvh", backgroundColor: "var(--skin-bg)" }}>
      <NowSpinningModal startInScanMode onClose={leave} onSuccess={leave} />
    </div>
  );
}
