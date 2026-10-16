import { prisma } from "./prisma";

// Simulates network latency
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export async function fetchGoogleCalendar(userId: string) {
  try {
    const account = await prisma.account.findFirst({
      where: { provider: "google", userId }
    });

    if (!account || !account.access_token) {
      return { error: "Not connected to Google Calendar" };
    }

    const res = await fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${new Date().toISOString()}&maxResults=1&singleEvents=true&orderBy=startTime`, {
      headers: {
        Authorization: `Bearer ${account.access_token}`
      }
    });

    if (!res.ok) {
      return { error: "Google API Token Expired" };
    }

    const data = await res.json();

    // Today's events, so the greeting can talk about how the day actually went.
    let day: { total: number; done: number; hasClass: boolean } | null = null;
    try {
      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(startOfDay.getTime() + 86_400_000);
      const dayRes = await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${startOfDay.toISOString()}&timeMax=${endOfDay.toISOString()}&maxResults=25&singleEvents=true&orderBy=startTime`,
        { headers: { Authorization: `Bearer ${account.access_token}` } }
      );
      if (dayRes.ok) {
        const items = ((await dayRes.json()).items ?? []) as { summary?: string; end?: { dateTime?: string } }[];
        day = {
          total: items.length,
          done: items.filter((e) => e.end?.dateTime && new Date(e.end.dateTime).getTime() < Date.now()).length,
          hasClass: items.some((e) => /\b(class|lecture|lab|seminar|course|section|exam)\b|\b[A-Za-z]{2,4}\s?\d{3}\b/i.test(e.summary ?? "")),
        };
      }
    } catch {}

    const nextEvent = data.items && data.items.length > 0 ? data.items[0] : null;
    
    if (!nextEvent) {
      return { next_event: "No upcoming events today", event_time: "", location: "", day };
    }

    // Format time nicely
    let formattedTime = "";
    if (nextEvent.start?.dateTime) {
      formattedTime = new Date(nextEvent.start.dateTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
    } else if (nextEvent.start?.date) {
      formattedTime = "All Day";
    }

    return {
      next_event: nextEvent.summary || "Busy",
      event_time: formattedTime,
      start_iso: nextEvent.start?.dateTime ?? null,
      location: nextEvent.location || "No location specified",
      description: nextEvent.description ? "Has details" : "No details",
      day,
    };
  } catch (error) {
    console.error(error);
    return { error: "Failed to fetch calendar" };
  }
}

// Geocoding is the slowest step and addresses rarely change, so results are cached in memory.
const geocodeCache = new Map<string, { lat: number; lon: number } | null>();

export async function geocode(address: string) {
  const key = sanitizeAddress(address).toLowerCase();
  if (geocodeCache.has(key)) return geocodeCache.get(key)!;
  const res = await fetch(
    `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(sanitizeAddress(address))}&format=json&limit=1`,
    { headers: { "User-Agent": "ExitCheck-App/1.0" } }
  );
  const data = await res.json();
  const hit = Array.isArray(data) && data.length ? { lat: parseFloat(data[0].lat), lon: parseFloat(data[0].lon) } : null;
  geocodeCache.set(key, hit);
  return hit;
}

// Sanitize address strings before geocoding — strip zip codes, country suffixes, and extra dashes
function sanitizeAddress(addr: string): string {
  return addr
    .replace(/\s*-\s*\d{5,}$/g, '')        // Remove trailing " - 07306"
    .replace(/,?\s*United States of America/gi, '')
    .replace(/,?\s*USA$/gi, '')
    .trim();
}

export async function fetchCommuteEngine(lat?: number, lon?: number, homeAddress?: string | null, workAddress?: string | null) {
  try {
    let originLat = lat;
    let originLon = lon;
    let originString = originLat && originLon ? `${originLat},${originLon}` : "";

    // Fallback: If no GPS provided, assume they are at Home
    if (!originLat || !originLon) {
      if (!homeAddress) throw new Error("No GPS and no Home Address set");
      const origin = await geocode(homeAddress);
      if (!origin) throw new Error("Could not geocode origin fallback");
      originLat = origin.lat;
      originLon = origin.lon;
      originString = homeAddress;
    }

    const destinationsToCheck = [];
    if (homeAddress) destinationsToCheck.push({ label: "Home", address: homeAddress });
    if (workAddress) destinationsToCheck.push({ label: "Work", address: workAddress });

    if (destinationsToCheck.length === 0) throw new Error("No destinations available");

    const fetchRoute = async (dest: {label: string, address: string}) => {
      try {
        // Preferred: Google Maps with live traffic for driving, real transit and walking times.
        const g = await googleTimes(
          originLat !== undefined && originLon !== undefined && originString === `${originLat},${originLon}`
            ? { location: { latLng: { latitude: originLat, longitude: originLon } } }
            : { address: originString },
          { address: dest.address }
        );
        if (g) {
          if (g.meters < 250) return null; // already there
          const miles = (g.meters / 1609.34).toFixed(1);
          return {
            label: dest.label,
            raw_origin: originString,
            raw_destination: dest.address,
            source: "google" as const,
            driving: { time: g.driving, unit: "min", condition: `To ${dest.label} (${miles} mi)` },
            transit: { time: g.transit, unit: "min", condition: `To ${dest.label} (${miles} mi)` },
            walking: { time: g.walking, unit: "min", condition: "Clear" },
          };
        }

        const found = await geocode(dest.address);
        if (!found) throw new Error(`Could not find coordinates for ${dest.label}`);
        const destLat = found.lat;
        const destLon = found.lon;

        const osrmUrl = `http://router.project-osrm.org/route/v1/driving/${originLon},${originLat};${destLon},${destLat}?overview=false`;
        const osrmRes = await fetch(osrmUrl);
        const osrmData = await osrmRes.json();

        if (osrmData.code !== "Ok" || !osrmData.routes || osrmData.routes.length === 0) {
          throw new Error(`OSRM Routing failed for ${dest.label}`);
        }

        const drivingMinutes = Math.round(osrmData.routes[0].duration / 60);
        const distanceMeters = osrmData.routes[0].distance;
        const distanceMiles = (distanceMeters / 1609.34).toFixed(1);
        const transitMinutes = Math.round(drivingMinutes * 1.6);
        if (distanceMeters < 250) return null; // already there
        const walkingMinutes = Math.round(distanceMeters / 80); // ~4.8 km/h

        return {
          label: dest.label,
          raw_origin: originString,
          raw_destination: dest.address,
          source: "estimate" as const,
          driving: { time: drivingMinutes, unit: "min", condition: `To ${dest.label} (${distanceMiles} mi)` },
          transit: { time: transitMinutes, unit: "min", condition: `To ${dest.label} (${distanceMiles} mi)` },
          walking: { time: walkingMinutes, unit: "min", condition: "Clear" },
        };
      } catch (err) {
        console.warn(`Failed to route to ${dest.label}`, err);
        return null;
      }
    };

    const routes = await Promise.all(destinationsToCheck.map(fetchRoute));
    const validRoutes = routes.filter(r => r !== null);

    return {
      routes: validRoutes.length > 0 ? validRoutes : [{
        label: "Destination",
        raw_origin: "",
        raw_destination: "",
        driving: { time: 22, unit: "min", condition: "To Destination (Mock)" },
        transit: { time: 31, unit: "min", condition: "Bus 42 leaves in 3 min (Mock)" },
        walking: { time: 45, unit: "min", condition: "Clear" },
      }]
    };
  } catch (error) {
    console.warn("Commute engine fallback:", error);
    return {
      routes: [{
        label: "Destination",
        raw_origin: "",
        raw_destination: "",
        driving: { time: 22, unit: "min", condition: "To Destination (Mock)" },
        transit: { time: 31, unit: "min", condition: "Bus 42 leaves in 3 min (Mock)" },
        walking: { time: 45, unit: "min", condition: "Clear" },
      }]
    };
  }
}

export async function fetchSmartHomeState() {
  await delay(300);
  return {
    sensors: [
      { id: "door_main", status: "LOCKED" },
      { id: "window_balcony", status: "OPEN" },
    ],
    appliances: [
      { name: "Space Heater", status: "ACTIVE", power_draw: "1500W" },
      { name: "Coffee Maker", status: "STANDBY", power_draw: "2W" },
    ],
  };
}

export async function fetchShoppingList() {
  await delay(250);
  return {
    active_store_nearby: "Target (0.4 mi on route)",
    items: ["Whole Milk", "Paper Towels", "Coffee Beans"],
  };
}

export async function fetchWeather(userId: string, lat?: number, lon?: number) {
  try {
    let weatherLat = lat;
    let weatherLon = lon;

    // If no GPS, geocode the user's home address
    if (!weatherLat || !weatherLon) {
      const user = await prisma.user.findUnique({ where: { id: userId } });
      const address = user?.homeAddress || 'Jersey City, NJ';
      const geo = await geocode(address);
      if (geo) {
        weatherLat = geo.lat;
        weatherLon = geo.lon;
      } else {
        // Default to Jersey City coords
        weatherLat = 40.7282;
        weatherLon = -74.0776;
      }
    }

    // Open-Meteo: free, no API key, accurate
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${weatherLat}&longitude=${weatherLon}&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m&daily=temperature_2m_max,temperature_2m_min,precipitation_probability_max&temperature_unit=fahrenheit&wind_speed_unit=mph&forecast_days=1&timezone=auto`;
    const res = await fetch(url);
    if (!res.ok) throw new Error('Open-Meteo request failed');
    const data = await res.json();

    const current = data.current;
    const daily = data.daily;

    // WMO weather code to description
    const wmoCode = current.weather_code;
    let condition = 'Clear';
    if (wmoCode >= 0 && wmoCode <= 1) condition = 'Clear';
    else if (wmoCode <= 3) condition = 'Partly cloudy';
    else if (wmoCode <= 49) condition = 'Foggy';
    else if (wmoCode <= 67) condition = 'Rainy';
    else if (wmoCode <= 77) condition = 'Snowy';
    else if (wmoCode <= 82) condition = 'Heavy rain';
    else if (wmoCode >= 95) condition = 'Thunderstorm';

    return {
      current_temp: Math.round(current.temperature_2m),
      forecast: condition,
      high: Math.round(daily.temperature_2m_max[0]),
      low: Math.round(daily.temperature_2m_min[0]),
      precipitation_chance: daily.precipitation_probability_max[0] || 0,
      humidity: current.relative_humidity_2m,
      wind_speed: Math.round(current.wind_speed_10m),
    };
  } catch (error) {
    console.error('Weather fetch failed:', error);
    throw error;
  }
}

/** Driving minutes between two points via OSRM. */
export async function drivingMinutes(a: { lat: number; lon: number }, b: { lat: number; lon: number }) {
  const ll = (p: { lat: number; lon: number }) => ({ location: { latLng: { latitude: p.lat, longitude: p.lon } } });
  try {
    if (process.env.GOOGLE_MAPS_API_KEY?.trim()) {
      const g = await googleLeg(ll(a), ll(b), "DRIVE");
      if (g) return g.minutes;
    }
  } catch {}
  const res = await fetch(`https://router.project-osrm.org/route/v1/driving/${a.lon},${a.lat};${b.lon},${b.lat}?overview=false`, {
    signal: AbortSignal.timeout(6000),
  });
  const data = await res.json();
  if (data.code !== "Ok" || !data.routes?.length) throw new Error("Routing is unavailable right now.");
  return Math.round(data.routes[0].duration / 60);
}

type Waypoint = { address: string } | { location: { latLng: { latitude: number; longitude: number } } };

async function googleLeg(origin: Waypoint, destination: Waypoint, mode: "DRIVE" | "TRANSIT" | "WALK") {
  const res = await fetch("https://routes.googleapis.com/directions/v2:computeRoutes", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": process.env.GOOGLE_MAPS_API_KEY as string,
      "X-Goog-FieldMask": "routes.duration,routes.distanceMeters",
    },
    body: JSON.stringify({
      origin,
      destination,
      travelMode: mode,
      ...(mode === "DRIVE" && { routingPreference: "TRAFFIC_AWARE", departureTime: new Date(Date.now() + 30_000).toISOString() }),
    }),
    signal: AbortSignal.timeout(6000),
  });
  if (!res.ok) throw new Error(`Google Routes ${res.status}`);
  const data = await res.json();
  const r = data.routes?.[0];
  if (!r) return null;
  return { minutes: Math.max(1, Math.round(parseInt(r.duration, 10) / 60)), meters: r.distanceMeters as number };
}

/** Live Google Maps times (drive uses current traffic). Returns null when no key or the call fails. */
export async function googleTimes(origin: Waypoint, destination: Waypoint) {
  if (!process.env.GOOGLE_MAPS_API_KEY?.trim()) return null;
  try {
    const [d, t, w] = await Promise.all([
      googleLeg(origin, destination, "DRIVE"),
      googleLeg(origin, destination, "TRANSIT").catch(() => null),
      googleLeg(origin, destination, "WALK").catch(() => null),
    ]);
    if (!d) return null;
    return { driving: d.minutes, transit: t?.minutes ?? -1, walking: w?.minutes ?? Math.round(d.meters / 80 / 1), meters: d.meters };
  } catch (e) {
    console.warn("Google Routes failed, using estimate:", e instanceof Error ? e.message : e);
    return null;
  }
}
