# ExitCheck 🚪

A smart home departure dashboard that gives you a full pre-exit briefing — traffic, weather, calendar, and transit — in under 10 seconds. Tap an NFC tag by your door and the HUD pulls it all together automatically.

📹 [Watch the demo](./exitcheck_walkthrough.mp4) · 📄 [Full project manual](./exitcheck_manual.pdf)

---

## What This Actually Does

ExitCheck solves a real problem: leaving the house unprepared. Forgot your laptop? Left the garage open? Running late to a meeting you forgot about? ExitCheck shows all of this in one glance before you walk out the door.

The app was built from scratch — including a real geocoding and routing engine, a resilient AI orchestration layer with a graceful quota fallback, an OAuth-backed settings hub, and a hardware NFC trigger that costs under $1.

---

## How It Works

1. A passive NFC tag (NTAG213/215) is placed by your front door and encoded with a URL trigger.
2. Tapping your phone against the tag opens the ExitCheck dashboard in your browser.
3. The app resolves your GPS location, checks live driving times and weather, pulls your next calendar event, checks your gear checklist, and synthesizes everything into a single glanceable HUD — ready before you've finished tying your shoes.

---

## What the HUD Shows

| Section | Data | Source |
|---|---|---|
| **Critical Alerts** | Appliances left on, open windows, rain incoming | Smart home state + weather |
| **Quick Actions** | Close garage, start Tesla climate — one tap | `/api/actions` webhook dispatcher |
| **Commute Times** | Driving + transit + walking for Home & Work | Nominatim geocoding → OSRM routing |
| **Weather** | Live temp, forecast, wind, rain % | Open-Meteo (no API key needed) |
| **Calendar** | Next event name, time, location | Google Calendar API (OAuth 2.0) |
| **Gear Checklist** | Laptop, badge, keys — tappable list | Prisma + SQLite |
| **Home Security** | Door/window lock states | Smart home sensor states |
| **On The Way** | Stores on your route with items needed | Shopping list integration |

---

## Tech Stack

| Component | Provider | Purpose |
|---|---|---|
| Framework | Next.js 16 | Core app + API routes + dashboard UI |
| Database | Prisma + SQLite | User profiles, gear items, OAuth session tokens |
| Auth | NextAuth + Google OAuth 2.0 | Session management, Google Calendar token storage |
| Geocoding | Nominatim (OpenStreetMap) | Resolves text addresses to GPS coords — no API key needed |
| Routing | OSRM (Open Source Routing Machine) | Live driving distance and time calculations |
| Weather | Open-Meteo | Real-time WMO-coded weather — no API key needed |
| Calendar | Google Calendar API | Reads next active calendar event for the session user |
| AI Synthesis | Google Gemini 1.5 Flash | Orchestrates all data into a structured `generateObject` JSON response |
| Video | FFmpeg + Pillow | Compiled the MP4 demo walkthrough from rendered frames |

---

## Getting Started

```bash
npm install
npx prisma db push
npm run dev
```

Open `http://localhost:3000/exit` in your browser (Safari or Chrome with location permissions enabled).

### Set Up Your NFC Tag

1. Download **NFC Tools** on Android or iOS.
2. Write a URL record to your tag:
   ```
   http://localhost:3000/exit?tag_id=door_main&user_id=usr_123
   ```
3. Stick the tag next to your front door handle.

### Configure Your Addresses

Go to `http://localhost:3000/settings`, enter your Home and Work addresses. These are geocoded automatically via Nominatim and stored in your local SQLite database.

---

## Environment Variables

Create a `.env.local` file (never committed — already in `.gitignore`):

```env
GOOGLE_CLIENT_ID=your_google_oauth_client_id
GOOGLE_CLIENT_SECRET=your_google_oauth_client_secret
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your_random_secret
GOOGLE_GENERATIVE_AI_API_KEY=your_gemini_api_key
```

Weather and routing work with **zero API keys** (Open-Meteo + Nominatim + OSRM are all free and keyless).

---

## API Reference

**`POST /api/exit`** — HUD Aggregator. Fires 5 concurrent data fetches and feeds results to Gemini for synthesis.
```json
{
  "tag_id": "door_main",
  "user_id": "usr_123",
  "latitude": 40.7321,
  "longitude": -74.0606,
  "batteryLevel": 0.85,
  "isCharging": false
}
```

**`POST /api/actions`** — Smart home action dispatcher. Returns a success confirmation after dispatching the IoT webhook.
```json
{ "actionId": "garage_door_close" }
```

**`GET /api/settings`** — Returns the session user's saved profile (addresses + gear).

**`PUT /api/settings`** — Updates home or work address for the session user.

**`POST /api/settings/gear`** — Adds a new gear item to the checklist.

**`DELETE /api/settings/gear?id=...`** — Removes a gear item by ID.

---

## Architecture

The `/api/exit` route is the core orchestrator:

```
NFC Tap → Browser GPS → POST /api/exit
  └── Promise.allSettled([
        fetchGoogleCalendar()     → Google Calendar API
        fetchCommuteEngine()      → Nominatim → OSRM
        fetchSmartHomeState()     → Sensor states
        fetchShoppingList()       → Errand list
        fetchWeather()            → Open-Meteo
      ])
  └── Gemini 1.5 Flash (generateObject) → Structured JSON HUD
  └── Fallback template (if quota exceeded) → Live routing still injected
```

---

## Notes & Known Limits

- **Gemini free tier**: Caps at 20 requests/day. ExitCheck falls back to a cached static layout when the quota is hit — live routing and weather data continue to work normally since they don't use Gemini.
- **Geolocation**: Safari requires explicit permission for `localhost`. If denied, the app falls back to geocoding your saved Home address instead.
- **Smart home actions**: Currently dispatches webhooks to `/api/actions` with a simulated success response. Connecting to real devices (Tesla API, Home Assistant, Shelly) requires adding credentials to `.env.local`.
- **Google Calendar**: Requires completing the OAuth flow in `/settings` to store a valid access token in the database.

---

## Project Files

| File | Purpose |
|---|---|
| `exitcheck_walkthrough.mp4` | Real compiled MP4 demo video (FFmpeg + Pillow) |
| `exitcheck_manual.pdf` | Full project manual (compiled via headless Chrome) |
| `video_presentation.html` | Interactive split-screen feature walkthrough player |
| `assets/` | Mockup screenshots used in the video presentation |
| `prisma/schema.prisma` | Database schema (User, Account, Session, GearItem) |
| `src/app/api/exit/` | Core HUD orchestration route |
| `src/app/api/actions/` | IoT action dispatcher |
| `src/app/settings/` | Settings hub UI |
| `src/lib/mock-apis.ts` | Geocoding, routing, weather, and calendar integrations |
