# Family Tree

A Bengali-first family genealogy application built with Next.js, Supabase,
and optional Gemini-assisted document matching.

## Setup

```bash
npm install
npm run dev
```

Before starting the app, create `.env.local` with the Supabase URL and public
key used by the client, plus the server-side Supabase and Gemini settings used
by the API routes. Keep secrets in `.env.local`; do not commit them. Open
[http://localhost:3000](http://localhost:3000) after the development server
starts.

## Commands

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start the development server |
| `npm run lint` | Run ESLint |
| `npm run build` | Create a production build |
| `npm run start` | Serve the production build |

## Structure

- `app/` contains the routes, authentication pages, dashboard, and API
  handlers.
- `lib/auth/` contains request authentication helpers.
- `lib/supabase/` contains browser and server Supabase clients.
- `lib/matching/` contains Bengali normalization and matching pipelines.
- `lib/gemini/` contains the Gemini client used by document analysis.
- `migrations/` contains the initial database schema.
- `types/` contains shared TypeScript types.

Apply the SQL migration in `migrations/` to a Supabase project before using
the authenticated dashboard and data APIs.
