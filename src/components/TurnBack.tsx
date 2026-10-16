"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Undo2, Loader2 } from "lucide-react";
import Rise from "./Rise";

type Result = { verdict: "turn_back" | "keep_going" | "no_deadline"; message: string; extraMinutes: number | null };

/** "Forgot something?" tells you whether going back is worth it, using where you are right now. */
export default function TurnBack({ userId }: { userId: string }) {
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState<string | null>(null);

  const run = async () => {
    setBusy(true);
    setError(null);
    setResult(null);
    try {
      const pos = await new Promise<GeolocationPosition>((resolve, reject) =>
        navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 8000, enableHighAccuracy: true })
      );
      const res = await fetch("/api/turnback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ latitude: pos.coords.latitude, longitude: pos.coords.longitude, user_id: userId }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || "Couldn't work that out.");
      setResult(body);
    } catch (e) {
      setError(
        e instanceof GeolocationPositionError
          ? "Allow location access so we can see how far you've gone."
          : e instanceof Error
          ? e.message
          : "Something went wrong."
      );
    } finally {
      setBusy(false);
    }
  };

  const color = result?.verdict === "turn_back" ? "var(--green)" : result?.verdict === "keep_going" ? "var(--orange)" : "var(--text)";

  return (
    <Rise>
      <section className="tile p-7">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="eyebrow">Already left?</p>
            <h2 className="text-[24px] font-semibold tracking-tight mt-2">Forgot something?</h2>
            <p className="text-[15px] mt-1" style={{ color: "var(--text-2)" }}>
              We&apos;ll tell you if turning back is worth it, based on where you are right now.
            </p>
          </div>
          <Undo2 className="w-9 h-9 shrink-0" strokeWidth={1.5} style={{ color: "var(--text-2)" }} />
        </div>

        <button onClick={run} disabled={busy} className="pill mt-5 !h-12">
          {busy && <Loader2 className="w-4 h-4 animate-spin" />} Should I turn back?
        </button>

        <AnimatePresence mode="wait">
          {(result || error) && (
            <motion.p
              key={result?.message ?? error}
              initial={{ opacity: 0, y: 10, height: 0 }}
              animate={{ opacity: 1, y: 0, height: "auto" }}
              exit={{ opacity: 0 }}
              transition={{ type: "spring", stiffness: 200, damping: 24 }}
              className="text-[19px] font-semibold tracking-tight mt-5 overflow-hidden"
              style={{ color: error ? "var(--red)" : color }}
              role="status"
            >
              {error ?? result?.message}
            </motion.p>
          )}
        </AnimatePresence>
      </section>
    </Rise>
  );
}
