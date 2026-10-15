"use client";

import { useCallback, useEffect, useRef, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import Link from "next/link";
import HUD from "@/components/HUD";
import { ExitCheckResponse } from "@/lib/schema";

function ExitClient() {
  const searchParams = useSearchParams();
  const tag_id = searchParams.get("tag_id") || "door_main";
  const urlUserId = searchParams.get("user_id");
  const { data: session, status } = useSession();
  const userId = session?.user?.id || urlUserId || "usr_123";

  const [data, setData] = useState<ExitCheckResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const inFlight = useRef(false);

  const load = useCallback(async () => {
    if (inFlight.current) return;
    inFlight.current = true;
    setRefreshing(true);

    let batteryLevel: number | null = null;
    let isCharging: boolean | null = null;
    let latitude: number | null = null;
    let longitude: number | null = null;

    try {
      // @ts-expect-error: getBattery is not in the standard DOM typings
      const battery = await navigator.getBattery?.();
      if (battery) {
        batteryLevel = battery.level;
        isCharging = battery.charging;
      }
    } catch {}

    try {
      if ("geolocation" in navigator) {
        const pos = await new Promise<GeolocationPosition>((resolve, reject) =>
          navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 4000, maximumAge: 60000 })
        );
        latitude = pos.coords.latitude;
        longitude = pos.coords.longitude;
      }
    } catch {}

    try {
      const response = await fetch("/api/exit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tag_id, user_id: userId, batteryLevel, isCharging, latitude, longitude }),
      });
      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData?.details || errData?.error || "The server didn't respond.");
      }
      setData(await response.json());
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
      setRefreshing(false);
      inFlight.current = false;
    }
  }, [tag_id, userId]);

  useEffect(() => {
    if (status === "loading") return;
    load();
  }, [load, status]);

  if (error && !data) {
    return (
      <div className="flex min-h-screen w-full items-center justify-center p-6 text-center">
        <div className="max-w-sm">
          <h1 className="text-[22px] font-semibold">Couldn&apos;t load your check</h1>
          <p className="text-[15px] mt-2" style={{ color: "var(--text-2)" }}>
            {error}
          </p>
          <div className="mt-6 flex justify-center gap-3">
            <button
              onClick={() => {
                setError(null);
                setLoading(true);
                load();
              }}
              className="btn"
            >
              Try again
            </button>
            <Link href="/settings" className="btn btn-quiet">
              Settings
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return <HUD data={data} loading={loading} refreshing={refreshing} onRefresh={load} />;
}

export default function ExitPage() {
  return (
    <Suspense fallback={null}>
      <ExitClient />
    </Suspense>
  );
}
