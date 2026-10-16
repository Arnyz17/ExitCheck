"use client";

import { useEffect, useState } from "react";

/** "It's 7:55 PM in New Jersey, USA", ticking every few seconds. Falls back to the device's time zone name. */
export default function LiveClock({ place }: { place?: string | null }) {
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setNow(new Date());
    const t = setInterval(() => setNow(new Date()), 5000);
    return () => clearInterval(t);
  }, []);

  if (!now) return <span className="inline-block h-[1.2em]" />;

  const zoneCity = Intl.DateTimeFormat().resolvedOptions().timeZone.split("/").pop()?.replace(/_/g, " ");
  const where = place || zoneCity;

  return (
    <span>
      It&apos;s {now.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}
      {where ? ` in ${where}` : ""}
    </span>
  );
}
