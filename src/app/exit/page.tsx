"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import HUD from "@/components/HUD";
import { ExitCheckResponse } from "@/lib/schema";

function ExitClient() {
  const searchParams = useSearchParams();
  const tag_id = searchParams.get("tag_id") || "door_main";
  const { data: session } = useSession();

  const [data, setData] = useState<ExitCheckResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      // Resolve user_id: prefer session user, then URL param, then fallback
      const urlUserId = searchParams.get("user_id");
      const user_id = session?.user?.id || urlUserId || "usr_123";

      let batteryLevel: number | null = null;
      let isCharging: boolean | null = null;

      try {
        if ("getBattery" in navigator) {
          // @ts-expect-error: getBattery is not standardized in all TS DOM types
          const battery = await navigator.getBattery();
          batteryLevel = battery.level;
          isCharging = battery.charging;
        }
      } catch (err) {
        console.warn("Battery API unavailable or failed", err);
      }

      let latitude: number | null = null;
      let longitude: number | null = null;

      try {
        if ("geolocation" in navigator) {
          const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 5000 });
          });
          latitude = pos.coords.latitude;
          longitude = pos.coords.longitude;
        }
      } catch (err) {
        console.warn("Geolocation denied or unavailable", err);
      }

      try {
        const response = await fetch("/api/exit", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ tag_id, user_id, batteryLevel, isCharging, latitude, longitude }),
        });

        if (!response.ok) {
          const errData = await response.json().catch(() => ({}));
          throw new Error(errData?.details || errData?.error || "Failed to fetch HUD data");
        }

        const result = await response.json();
        setData(result);
      } catch (err) {
        setError(err instanceof Error ? err.message : "An error occurred");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [tag_id, session]);

  if (error) {
    return (
      <div className="flex h-screen w-full items-center justify-center p-6 text-center bg-slate-900">
        <div className="max-w-sm">
          <p className="text-red-400 text-lg font-semibold mb-2">⚠️ HUD Load Error</p>
          <p className="text-slate-400 text-sm">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 px-4 py-2 bg-blue-600 rounded-lg text-white text-sm hover:bg-blue-500"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return <HUD data={data} loading={loading} />;
}

export default function ExitPage() {
  return (
    <Suspense fallback={<div className="flex h-screen items-center justify-center bg-slate-900 text-slate-400">Loading...</div>}>
      <ExitClient />
    </Suspense>
  );
}
