# বংশতালিকা / Family Genealogy

This Bengali-aware genealogy workspace uses Next.js, Supabase, and optional Gemini document extraction. Uploaded documents remain private in Supabase Storage; AI output is stored as reviewable candidates and is never written to the canonical tree without editor approval.

## Local setup

```bash
cd family-tree-app
npm ci
copy .env.example .env.local
npm run dev
```

Set `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, and the server-only `SUPABASE_SERVICE_ROLE_KEY`. Set `GEMINI_API_KEY` only when AI processing is required; the app reports an explicit configuration error instead of silently fabricating extraction results.

## Supabase

Run `migrations/001_initial_schema.sql` followed by `migrations/002_production_hardening.sql` in the Supabase SQL editor (or with `supabase db push`). Migration 002 creates the private `documents` bucket and its policies. Never expose the service-role key to browser code.

The schema includes normalized people and relationships, provenance links, document pages, processing jobs, review items, duplicate candidates, and append-only change history. Use short-lived signed URLs for document previews.

## Main flows

- `/dashboard/upload` uploads validated images/PDFs and queues AI work.
- `/dashboard/review` approves, edits, defers, or rejects extracted people.
- `/dashboard/tree`, `/dashboard/people`, and `/dashboard/people/:id` browse the verified tree with Bengali-aware search.
- `/dashboard/export` provides JSON, CSV, and GEDCOM downloads.

AI jobs are started with `POST /api/processing/:jobId`. In production, invoke that endpoint from a queue/worker rather than a user request, and keep retries bounded by `processing_jobs.max_attempts`.

## Verification, backups, and deployment

Run `npm run lint`, `npm run typecheck`, and `npm run build`. Configure Supabase daily backups/PITR before importing historical records. Deploy to Vercel or another Node host with the same environment variables, and restrict logs because names and source documents are sensitive data.
