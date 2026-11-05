"use client";

import { useEffect, useRef, useState } from "react";
import { BrowserMultiFormatReader, type IScannerControls } from "@zxing/browser";
import { BarcodeFormat, DecodeHintType } from "@zxing/library";

const C = {
  bg:            "var(--skin-bg)",
  surface:       "var(--skin-surface)",
  surfaceRaised: "var(--skin-surface-raised)",
  border:        "var(--skin-border)",
  text:          "var(--skin-text)",
  muted:         "var(--skin-muted)",
  subtle:        "var(--skin-subtle)",
  accent:        "var(--skin-accent)",
  accentHover:   "var(--skin-accent-hover)",
};

interface BarcodeScannerProps {
  onDetected: (code: string) => void;
  onCancel: () => void;
}

type CameraState = "starting" | "live" | "denied" | "unavailable";

function stopVideoStream(video: HTMLVideoElement | null) {
  const stream = video?.srcObject as MediaStream | null | undefined;
  stream?.getTracks().forEach((t) => t.stop());
  if (video) video.srcObject = null;
}

export default function BarcodeScanner({ onDetected, onCancel }: BarcodeScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const controlsRef = useRef<IScannerControls | null>(null);
  const doneRef = useRef(false);
  const onDetectedRef = useRef(onDetected);
  const [cameraState, setCameraState] = useState<CameraState>("starting");
  const [manualCode, setManualCode] = useState("");

  useEffect(() => { onDetectedRef.current = onDetected; }, [onDetected]);

  function stopCamera() {
    controlsRef.current?.stop();
    controlsRef.current = null;
    stopVideoStream(videoRef.current);
  }

  useEffect(() => {
    let cancelled = false;

    if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      setCameraState("unavailable");
      return;
    }

    const hints = new Map();
    hints.set(DecodeHintType.POSSIBLE_FORMATS, [
      BarcodeFormat.EAN_13,
      BarcodeFormat.EAN_8,
      BarcodeFormat.UPC_A,
      BarcodeFormat.UPC_E,
    ]);
    const reader = new BrowserMultiFormatReader(hints);

    reader
      .decodeFromConstraints(
        { video: { facingMode: "environment" }, audio: false },
        videoRef.current ?? undefined,
        (result) => {
          if (!result || doneRef.current) return;
          doneRef.current = true;
          stopCamera();
          onDetectedRef.current(result.getText());
        }
      )
      .then((controls) => {
        // Unmounted (or already detected) while the camera was spinning up
        if (cancelled || doneRef.current) {
          controls.stop();
          stopVideoStream(videoRef.current);
          return;
        }
        controlsRef.current = controls;
        setCameraState("live");
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        const name = err instanceof Error ? err.name : "";
        if (name === "NotAllowedError" || name === "SecurityError") setCameraState("denied");
        else setCameraState("unavailable");
      });

    return () => {
      cancelled = true;
      stopCamera();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function submitManual() {
    const code = manualCode.replace(/\D/g, "");
    if (!code) return;
    doneRef.current = true;
    stopCamera();
    onDetected(code);
  }

  function cancel() {
    doneRef.current = true;
    stopCamera();
    onCancel();
  }

  const cameraOff = cameraState === "denied" || cameraState === "unavailable";

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs font-mono uppercase tracking-widest" style={{ color: C.subtle }}>
          Scan the barcode
        </p>
        <button
          onClick={cancel}
          className="text-xs font-mono uppercase tracking-widest transition-colors duration-100"
          style={{ color: C.subtle, background: "none", border: "none", cursor: "pointer" }}
          onMouseEnter={(e) => (e.currentTarget.style.color = C.accent)}
          onMouseLeave={(e) => (e.currentTarget.style.color = C.subtle)}
        >
          Cancel
        </button>
      </div>

      {cameraOff ? (
        <div
          className="px-4 py-6 text-center"
          style={{ backgroundColor: C.surfaceRaised, border: `1px solid ${C.border}` }}
        >
          <p className="text-sm font-medium" style={{ color: C.text }}>
            {cameraState === "denied" ? "No camera access" : "No camera here"}
          </p>
          <p className="text-xs font-mono mt-1" style={{ color: C.muted }}>
            {cameraState === "denied"
              ? "Allow camera access in your browser to scan — or punch the barcode in below."
              : "Punch in the digits from the back of the sleeve below."}
          </p>
        </div>
      ) : (
        <div
          className="relative w-full overflow-hidden"
          style={{ aspectRatio: "4 / 3", backgroundColor: C.surfaceRaised, border: `1px solid ${C.border}` }}
        >
          <video
            ref={videoRef}
            muted
            playsInline
            autoPlay
            className="absolute inset-0 w-full h-full object-cover"
          />
          {/* Aim guide */}
          <div
            className="absolute pointer-events-none"
            style={{ left: "12%", right: "12%", top: "38%", bottom: "38%", border: `2px solid ${C.accent}` }}
          />
          {cameraState === "starting" && (
            <p
              className="absolute inset-0 flex items-center justify-center text-xs font-mono uppercase tracking-widest"
              style={{ color: C.subtle }}
            >
              Warming up the camera...
            </p>
          )}
        </div>
      )}

      <div>
        <p className="text-xs font-mono uppercase tracking-widest pb-1" style={{ color: C.subtle }}>
          Or type it in
        </p>
        <form
          className="flex gap-2"
          onSubmit={(e) => { e.preventDefault(); submitManual(); }}
        >
          <input
            type="text"
            inputMode="numeric"
            pattern="[0-9 ]*"
            value={manualCode}
            onChange={(e) => setManualCode(e.target.value)}
            placeholder="e.g. 602547788241"
            autoFocus={cameraOff}
            className="flex-1 min-w-0 text-sm font-mono px-3 py-2 outline-none transition-colors duration-100"
            style={{ backgroundColor: C.surfaceRaised, border: `1px solid ${C.border}`, color: C.text, borderRadius: 0 }}
            onFocus={(e) => (e.currentTarget.style.borderColor = C.accent)}
            onBlur={(e) => (e.currentTarget.style.borderColor = C.border)}
          />
          <button
            type="submit"
            disabled={!manualCode.replace(/\D/g, "")}
            className="ms-btn fill sm disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Go
          </button>
        </form>
      </div>
    </div>
  );
}
