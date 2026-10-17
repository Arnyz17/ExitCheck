# ExitCheck

Touch your phone to an NFC sticker by the door and get a one-glance "ready to leave?" screen: weather, commute, home status, what to bring, and anything you're about to forget.

No account needed to try it. Open the app and it works.

## Run it

```bash
npm install
npx prisma db push
npm run dev          # http://localhost:3000
npm test             # 21 unit tests
```

Optional environment variables (`.env.local`):

| Variable | Purpose |
| --- | --- |
| `GOOGLE_GENERATIVE_AI_API_KEY` | Lets Gemini write the summary. Without it a deterministic rule engine does. |
| `GEMINI_MODEL` | Override the model (default `gemini-3.8-flash`). |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` / `NEXTAUTH_SECRET` / `NEXTAUTH_URL` | Google sign-in for Calendar. |

## Run it on your phone

```bash
npm run phone
```

It builds the app, serves it on your network, and prints a link plus a QR code. Scan it with your iPhone camera (same Wi-Fi), open it, then Share -> Add to Home Screen to install it as an app.

Location, alerts and writing NFC stickers need HTTPS. Install `cloudflared` (`brew install cloudflared`) and `npm run phone` will also print a secure public link.

## What it does

- **Today**: readiness score (0-100), alerts, quick actions, weather, home status, commute, errands, packing checklist.
- **Stickers**: create and name NFC stickers, give each its own extra checklist, copy the link, write it to a sticker (Web NFC on Android), see scan counts.
- **Services**: Google Calendar (OAuth), Weather (Open-Meteo), and your own quick actions via webhook (Home Assistant, IFTTT, Zapier), Apple Shortcut, or app link.
- **Insights**: checks run, problems caught, estimated time saved, clean-exit streak, p50/p95 latency, per-source reliability, and a waterfall trace of the latest request.
- **You**: name, accent color, home and work addresses, things to bring.

## The two features that are genuinely new

- **"Forgot something?" turn-back calculator.** After you've left, one tap reads your location and compares the detour (you -> home -> destination) against the time left before your next event. It answers "go back, you'll still be 15 min early" or "keep going, turning back makes you 10 min late", instead of leaving you to guess.
- **Live leave-by countdown.** Combines your next calendar event, real routing time and a 10-minute arrival buffer into a ticking "Leave in 12 min" that turns orange and red as the window closes.

## How it works

```
NFC tap -> /exit?tag_id=...  ->  POST /api/exit
                                   |
            +----------------------+----------------------+
            |  parallel, individually timed and isolated  |
            |  Calendar | Commute | Weather | Home | Errands
            +----------------------+----------------------+
                                   |
                  rule engine builds the response (always)
                                   |
              Gemini rewrites it (2.5 s budget, circuit breaker)
                                   |
        exact facts re-injected (commute, weather, home, actions)
                                   |
                       scan + trace written to SQLite
```

Design decisions worth knowing:

- **Graceful degradation.** Every source can fail independently; the rule engine always produces a valid response, and Gemini only improves wording.
- **The model never owns facts.** Commute times, weather, home state and actions are overwritten after generation, so it can't hallucinate them.
- **Circuit breaker.** Two consecutive AI failures skip the model for five minutes so taps stay fast.
- **Observability built in.** Each scan stores per-source latency, success, AI usage and readiness, which powers the Insights page.
- **Validated contract.** The response is a Zod schema shared by the rule engine and the model.

## Honest limits

- iPhone NFC works within an inch or two and a web app can't detect you walking past on its own, so the interaction is a tap. An iOS Shortcuts NFC automation (guided in-app) removes the banner tap.
- Home sensor data is simulated until a real hub is linked. Quick actions are real (webhook / Shortcut / link).
- "Minutes saved" is an estimate (10 minutes per caught problem), labelled as such in the UI.

## Stack

Next.js 16, React 19, TypeScript, Tailwind v4, Framer Motion, Prisma + SQLite, NextAuth (Google), Vercel AI SDK + Gemini, Zod, Vitest.

## Resume bullets

- Built an NFC-triggered "leave-the-house" dashboard (Next.js, TypeScript, Prisma/SQLite) that fans out to five data sources in parallel, with per-source fault isolation, geocode caching and a rule-based fallback so every tap returns a valid screen.
- Added an LLM summarization layer (Gemini via Vercel AI SDK, Zod-validated output) with a timeout and circuit breaker, and re-injected authoritative data after generation to prevent hallucinated commute and weather facts.
- Instrumented every request with latency/success tracing and built an Insights dashboard (p50/p95, source reliability, request waterfall); wrote 21 unit tests covering the rule engine, scoring and analytics.
- Designed a personalized, animated Apple-style UI with per-sticker checklists, webhook/Shortcut/deep-link actions, and Google OAuth Calendar integration.
- Built a turn-back decision engine that routes you -> home -> destination with OSRM and compares the detour to calendar slack to say whether going back for a forgotten item is worth it.
