# বংশতালিকা / Family Genealogy

A Bengali-aware genealogy workspace built with Next.js, Supabase, and optional
Gemini document extraction. Uploaded documents remain private in Supabase
Storage; AI output is stored as reviewable candidates and is never written to
the canonical tree without editor approval.

## Local setup

```bash
cd family-tree-app
npm ci
copy .env.example .env.local
npm run dev
```

Set `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, and the
server-only `SUPABASE_SERVICE_ROLE_KEY`. Set `GEMINI_API_KEY` only when AI
processing is required; the app reports an explicit configuration error rather
than silently fabricating extraction results. Keep secrets in `.env.local`.

## Commands

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start the development server |
| `npm run lint` | Run ESLint |
| `npm run typecheck` | Run TypeScript checks |
| `npm run build` | Create a production build |
| `npm run start` | Serve the production build |

## Supabase

Run `migrations/001_initial_schema.sql` followed by
`migrations/002_production_hardening.sql` in the Supabase SQL editor (or with
`supabase db push`). Migration 002 creates the private `documents` bucket and
its policies. Never expose the service-role key to browser code.

The schema includes normalized people and relationships, provenance links,
document pages, processing jobs, review items, duplicate candidates, and
append-only change history. Use short-lived signed URLs for document previews.
Configure daily backups/PITR before importing historical records.

## Main flows

- `/dashboard/upload` validates images/PDFs, stores document metadata, and
  queues AI work.
- `/dashboard/review` approves, defers, or rejects extracted people and
  relationships.
- `/dashboard/tree`, `/dashboard/people`, and `/dashboard/people/:id` browse
  the verified tree with Bengali-aware search.
- `/dashboard/documents` lists source-document processing status.
- `/dashboard/export` provides JSON, CSV, and GEDCOM downloads.

AI jobs are started with `POST /api/processing/:jobId`. In production, invoke
that endpoint from a queue/worker rather than a user request, and keep retries
bounded by `processing_jobs.max_attempts`.

## Structure

- `app/` contains routes, dashboard pages, and API handlers.
- `lib/auth/` contains request authentication helpers.
- `lib/supabase/` contains browser and server Supabase clients.
- `lib/matching/` contains Bengali normalization and matching pipelines.
- `lib/gemini/` contains the server-only Gemini client and extraction schema.
- `migrations/` contains the database schema and hardening policies.
- `types/` contains shared TypeScript types.

Deploy to Vercel or another Node host with the same environment variables.
Restrict logs because names and source documents are sensitive data.
