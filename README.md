# Luma — Gentle Life Companion

An AI companion that helps you prepare for important life events — trips, interviews,
doctor visits — with a personalized checklist and a "Luma's Thought" insight, generated
via Google's Gemini API.

## Stack

- **Frontend:** React 19 + TypeScript + Vite + Tailwind CSS v4
- **Backend:** Express (served via `tsx` in dev, bundled with `esbuild` for production)
- **Auth:** Firebase Authentication (passwordless email-link sign-in)
- **AI:** Google Gemini API (`@google/genai`)
- **Push notifications:** Firebase Cloud Messaging + Firestore (for reminder scheduling)

## Run locally

**Prerequisites:** Node.js 20+

1. Install dependencies:
   ```
   npm install
   ```
2. Copy `.env.example` to `.env.local` and fill in the values — see the comments in that
   file for where each one comes from (Gemini API key, Firebase project config, Firebase
   service account key for the server, and the push-notification variables).
3. Run the app:
   ```
   npm run dev
   ```
   This starts the Express server (with Vite in middleware mode) on the port from
   `.env.local` (defaults to 3000).

## Build for production

```
npm run build   # builds the client (dist/) and bundles server.ts -> dist/server.cjs
npm run start   # runs the production build
```

## Required one-time setup (outside this repo)

- **Firebase project:** create one at [console.firebase.google.com](https://console.firebase.google.com).
  Enable **Authentication → Email link (passwordless sign-in)**, and **Firestore Database**
  (needed for push notification scheduling).
- **Gemini API key:** [ai.google.dev](https://ai.google.dev).
- **Push notifications (optional):** generate a Web Push (VAPID) key pair under
  **Project settings → Cloud Messaging**, and set up a scheduled job (e.g. Google Cloud
  Scheduler) to call `POST /api/notifications/run-check` every 5–15 minutes — see
  `.env.example` for the `CRON_SECRET` this endpoint expects.

## Legal pages

Draft Privacy Policy and Terms of Service live at `public/legal/privacy.html` and
`public/legal/terms.html`. They're a starting structure, not reviewed legal text — fill
in the `[bracketed placeholders]` and have them reviewed before you rely on them.
