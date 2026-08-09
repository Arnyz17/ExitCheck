import { prisma } from "./prisma";

// Simulates network latency
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export async function fetchGoogleCalendar(userId: string) {
  try {
    const account = await prisma.account.findFirst({
      where: { provider: "google" }
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
    const nextEvent = data.items && data.items.length > 0 ? data.items[0] : null;
    
    if (!nextEvent) {
      return { next_event: "No upcoming events today", event_time: "", location: "" };
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
      location: nextEvent.location || "No location specified",
      description: nextEvent.description ? "Has details" : "No details",
    };
  } catch (error) {
    console.error(error);
    return { error: "Failed to fetch calendar" };
  }
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
    let originLabel = "Current Location";
    let originString = originLat && originLon ? `${originLat},${originLon}` : "";

    // Fallback: If no GPS provided, assume they are at Home
    if (!originLat || !originLon) {
      if (!homeAddress) throw new Error("No GPS and no Home Address set");
      originLabel = "Home";
      const originGeocodeUrl = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(sanitizeAddress(homeAddress))}&format=json&limit=1`;
      const originRes = await fetch(originGeocodeUrl, { headers: { "User-Agent": "ExitCheck-App/1.0" } });
      const originData = await originRes.json();
      if (!originData || originData.length === 0) throw new Error("Could not geocode origin fallback");
      originLat = parseFloat(originData[0].lat);
      originLon = parseFloat(originData[0].lon);
      originString = homeAddress;
    }

    const destinationsToCheck = [];
    if (homeAddress) destinationsToCheck.push({ label: "Home", address: homeAddress });
    if (workAddress) destinationsToCheck.push({ label: "Work", address: workAddress });

    if (destinationsToCheck.length === 0) throw new Error("No destinations available");

    const fetchRoute = async (dest: {label: string, address: string}) => {
      try {
        const geocodeUrl = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(sanitizeAddress(dest.address))}&format=json&limit=1`;
        const geocodeRes = await fetch(geocodeUrl, { headers: { "User-Agent": "ExitCheck-App/1.0" } });
        const geocodeData = await geocodeRes.json();
        
        if (!geocodeData || geocodeData.length === 0) throw new Error(`Could not find coordinates for ${dest.label}`);
        const destLat = parseFloat(geocodeData[0].lat);
        const destLon = parseFloat(geocodeData[0].lon);

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
        const walkingMinutes = Math.round(drivingMinutes * 10);

        return {
          label: dest.label,
          raw_origin: originString,
          raw_destination: dest.address,
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
  // Simulating a random API failure on Smart Home to demonstrate fault tolerance 20% of the time
  if (Math.random() > 0.8) {
    throw new Error("Smart Home Hub Timeout");
  }
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
      const geoUrl = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(sanitizeAddress(address))}&format=json&limit=1`;
      const geoRes = await fetch(geoUrl, { headers: { 'User-Agent': 'ExitCheck-App/1.0' } });
      const geoData = await geoRes.json();
      if (geoData && geoData.length > 0) {
        weatherLat = parseFloat(geoData[0].lat);
        weatherLon = parseFloat(geoData[0].lon);
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
    return { current_temp: 75, forecast: 'Clear', high: 80, low: 65, precipitation_chance: 0 };
  }
}
