"use client";

import { useEffect, useRef, useState } from "react";
import type { Map as LMap } from "leaflet";
import "leaflet/dist/leaflet.css";
import { Navigation } from "lucide-react";
import Rise from "./Rise";

type Place = { label: string; address: string; lat: number; lon: number };

const dot = (color: string, size = 16) =>
  `<div style="width:${size}px;height:${size}px;border-radius:50%;background:${color};border:3px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,.35)"></div>`;

/** Interactive map: you, your saved places, and the driving route to each. */
export default function MapCard({ userId }: { userId: string }) {
  const el = useRef<HTMLDivElement>(null);
  const map = useRef<LMap | null>(null);
  const [empty, setEmpty] = useState(false);
  const [places, setPlaces] = useState<Place[]>([]);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/map", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ user_id: userId }) })
      .then((r) => r.json())
      .then((d) => {
        if (cancelled) return;
        if (!d.places?.length) setEmpty(true);
        else setPlaces(d.places);
      })
      .catch(() => setEmpty(true));
    return () => {
      cancelled = true;
    };
  }, [userId]);

  useEffect(() => {
    if (!places.length || !el.current || map.current) return;
    let alive = true;
    (async () => {
      const L = (await import("leaflet")).default;
      if (!alive || !el.current) return;
      const dark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      const m = L.map(el.current, { zoomControl: false, attributionControl: true, scrollWheelZoom: false }).setView([places[0].lat, places[0].lon], 13);
      map.current = m;
      L.control.zoom({ position: "bottomright" }).addTo(m);
      L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        className: dark ? "map-tiles-dark" : "",
        attribution: "© OpenStreetMap contributors",
      }).addTo(m);

      const pts: [number, number][] = [];
      places.forEach((p) => {
        pts.push([p.lat, p.lon]);
        L.marker([p.lat, p.lon], { icon: L.divIcon({ html: dot(p.label === "Home" ? "#34c759" : "#ff9500", 18), className: "", iconSize: [18, 18], iconAnchor: [9, 9] }) })
          .addTo(m)
          .bindPopup(`<b>${p.label}</b><br>${p.address}`);
      });

      const finish = () => m.fitBounds(L.latLngBounds(pts), { padding: [40, 40], maxZoom: 15 });
      finish();

      const place = (lat: number, lon: number) => {
        pts.push([lat, lon]);
        L.marker([lat, lon], { icon: L.divIcon({ html: dot("#0a84ff", 18), className: "", iconSize: [18, 18], iconAnchor: [9, 9] }), zIndexOffset: 1000 })
          .addTo(m)
          .bindPopup("<b>You</b>");
        return [lat, lon] as [number, number];
      };

      // Route between your saved places (and from you, if location is shared).
      const draw = async (from: [number, number], to: [number, number], color: string) => {
        try {
          const r = await fetch(`https://router.project-osrm.org/route/v1/driving/${from[1]},${from[0]};${to[1]},${to[0]}?overview=full&geometries=geojson`);
          const j = await r.json();
          const coords = j.routes?.[0]?.geometry?.coordinates as [number, number][] | undefined;
          if (!coords || !alive) return;
          L.polyline(coords.map(([x, y]) => [y, x] as [number, number]), { color, weight: 6, opacity: 0.9, lineCap: "round" }).addTo(m);
        } catch {}
      };

      if (places.length > 1) await draw([places[0].lat, places[0].lon], [places[1].lat, places[1].lon], "#0a84ff");
      navigator.geolocation?.getCurrentPosition(
        (pos) => {
          if (!alive) return;
          const me = place(pos.coords.latitude, pos.coords.longitude);
          finish();
          const target = places.find((p) => p.label === "Work") ?? places[0];
          draw(me, [target.lat, target.lon], "#34c759");
        },
        () => {},
        { timeout: 4000, maximumAge: 60000 }
      );
    })();
    return () => {
      alive = false;
      map.current?.remove();
      map.current = null;
    };
  }, [places]);

  if (empty) return null;

  const target = places.find((p) => p.label === "Work") ?? places[0];

  return (
    <Rise>
      <section className="tile overflow-hidden">
        <div className="flex items-center justify-between p-6 pb-4">
          <div>
            <p className="eyebrow">Map</p>
            <h2 className="text-[24px] font-semibold tracking-tight mt-1">Your route</h2>
          </div>
          {target && (
            <a
              href={`https://maps.apple.com/?daddr=${encodeURIComponent(target.address)}&dirflg=d`}
              target="_blank"
              rel="noopener noreferrer"
              className="pill pill-quiet"
            >
              <Navigation className="w-4 h-4" /> Open in Maps
            </a>
          )}
        </div>
        <div ref={el} className="h-[340px] sm:h-[420px] w-full" style={{ background: "var(--surface-2)" }} aria-label="Interactive map" />
      </section>
    </Rise>
  );
}
