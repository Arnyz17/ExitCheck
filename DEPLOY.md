# Deploy ExitCheck to Vercel (permanent link)

You need a free Vercel account and a free Neon (Postgres) account. About 10 minutes.

## 1. Database
1. Create a project at https://neon.tech and copy the **pooled connection string**.
2. Locally, put it in `.env.local` as `DATABASE_URL=...`, then run `npm run db:push` to create the tables.

## 2. Push the code
The repo is at https://github.com/Arnyz17/ExitCheck. Push the latest commits (`git push`).

## 3. Vercel
1. https://vercel.com/new -> import the GitHub repo.
2. Add these environment variables (Settings -> Environment Variables):

| Name | Value |
| --- | --- |
| `DATABASE_URL` | the Neon string |
| `NEXTAUTH_SECRET` | output of `openssl rand -base64 32` |
| `NEXTAUTH_URL` | `https://<your-project>.vercel.app` (set after the first deploy, then redeploy) |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | for Calendar sign-in |
| `GOOGLE_GENERATIVE_AI_API_KEY`, `GOOGLE_MAPS_API_KEY` | optional |

3. Deploy. The build runs `prisma db push`, so the tables are created automatically.

## 4. Google sign-in
In Google Cloud Console -> Credentials -> your OAuth client, add the redirect URI
`https://<your-project>.vercel.app/api/auth/callback/google`.

## 5. On your iPhone
Open `https://<your-project>.vercel.app/exit` in Safari -> Share -> Add to Home Screen.
Then use the Stickers page to copy each sticker's link and write it to an NFC tag.

## Notes
- Home Assistant addresses like `homeassistant.local` are not reachable from Vercel. Use a public address (for example Home Assistant Cloud / Nabu Casa) if you want live home data in the hosted app.
- Local development now also needs a Postgres `DATABASE_URL` (the free Neon one works).
