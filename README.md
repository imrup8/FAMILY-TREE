# বংশতালিকা / Family Genealogy
# বংশতালিকা · Family Genealogy

A Bengali-aware genealogy workspace built with Next.js, Supabase, and optional
Gemini document extraction. Uploaded documents remain private in Supabase
Storage; AI output is stored as reviewable candidates and is never written to
the canonical tree without editor approval.
> A private, Bengali-first workspace for turning archival genealogy documents
> into a searchable, reviewable family tree.

## Local setup
Family Genealogy combines a Next.js application, Supabase PostgreSQL and
Storage, and optional Gemini multimodal extraction. Uploaded records are
preserved as source evidence. AI output is stored as **untrusted review
material** and is never added to the confirmed family tree without an
authenticated editor approving it.

## What is included

- Bengali-aware people directory and profile pages
- Family-tree data endpoint and tree workspace
- Private document metadata and upload validation
- Processing jobs for Gemini-backed structured extraction
- Review queue for approving, rejecting, or deferring extracted people
- Provenance links from people and changes back to source documents
- Append-only change history for approved updates
- Bengali name normalization and search indexes
- JSON, CSV, and GEDCOM exports
- Supabase role checks for `admin`, `editor`, and `viewer` users
- Responsive dashboard shell with Bengali primary labels

The application is intentionally conservative: unknown names, dates, genders,
and relationships remain unknown instead of being guessed.

## Product workflow

```text
Upload source page
        ↓
Store private source metadata
        ↓
Queue/process an AI extraction job
        ↓
Save structured candidates and warnings
        ↓
Review against the original evidence
        ↓
Approve, edit, reject, or defer
        ↓
Write confirmed people/relationships with provenance
        ↓
Browse the tree and export structured data
```

## Tech stack

| Area | Technology |
| --- | --- |
| Web application | Next.js 16 App Router |
| UI | React 19, TypeScript, Tailwind CSS 4 |
| Authentication | Supabase Auth |
| Database | PostgreSQL through Supabase |
| Private files | Supabase Storage |
| AI extraction | Google Gemini SDK |
| Validation | Zod |
| Search | PostgreSQL trigram indexes |

Dependency versions are recorded in
[`package.json`](./package.json) and [`package-lock.json`](./package-lock.json).

## Requirements

- Node.js compatible with the installed Next.js and TypeScript versions
- npm
- A Supabase project
- Optional: a Gemini API key for document extraction
- Optional: the Supabase CLI for migrations and deployment

## Local development

From the repository root:

```bash
cd family-tree-app
npm ci
```

Create a local environment file:

```bash
copy .env.example .env.local
```

On macOS/Linux, use:

```bash
cp .env.example .env.local
```

Fill in the values in `.env.local`, then start the app:

```bash
npm run dev
```

Set `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, and the
server-only `SUPABASE_SERVICE_ROLE_KEY`. Set `GEMINI_API_KEY` only when AI
processing is required; the app reports an explicit configuration error rather
than silently fabricating extraction results. Keep secrets in `.env.local`.
Open [http://localhost:3000](http://localhost:3000).

## Commands
### Environment variables

| Variable | Required | Used for |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Supabase browser and server clients |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | Authenticated browser client |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes for API routes | Server-only database and Storage access |
| `GEMINI_API_KEY` | Only for AI processing | Gemini document analysis |
| `GEMINI_MODEL` | No | Gemini model name; defaults to the configured example |
| `MAX_FILE_SIZE_BYTES` | No | Upload limit; defaults to 50 MiB |

Never expose `SUPABASE_SERVICE_ROLE_KEY` or `GEMINI_API_KEY` to the browser.
Never commit `.env.local`.

## Database and Storage setup

Run the migrations in order against the target Supabase project:

1. [`migrations/001_initial_schema.sql`](./migrations/001_initial_schema.sql)
2. [`migrations/002_production_hardening.sql`](./migrations/002_production_hardening.sql)

Using the Supabase CLI:

```bash
supabase link --project-ref <your-project-ref>
supabase db push
```

The schema includes:

- `people` and `relationships` for confirmed genealogy data
- `documents` and `document_pages` for source provenance
- `processing_jobs` for asynchronous or worker-driven analysis
- `extracted_candidates` and `extracted_relationships` for raw AI output
- `review_items` for human approval
- `person_source_links` and `relationship_source_links` for evidence
- `change_history` for auditability and future undo workflows
- `duplicate_candidates` for cautious identity matching
- `user_roles` for role-based access

Migration 002 creates a private `documents` Storage bucket and authenticated
policies. Keep the bucket private and use short-lived signed URLs for previews.
Configure Supabase daily backups and point-in-time recovery before importing
irreplaceable historical records.

| Command | Purpose |
After creating a user through Supabase Auth, assign a role in `user_roles`.
Use `admin` for administration, `editor` for upload/review changes, and
`viewer` for read-only access.

## Routes

### Dashboard pages

| Route | Purpose |
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
| `/dashboard` | Overview statistics and activity |
| `/dashboard/upload` | Upload genealogy documents |
| `/dashboard/documents` | Source-document archive and processing status |
| `/dashboard/review` | Review AI candidates and proposed changes |
| `/dashboard/tree` | Browse the family-tree workspace |
| `/dashboard/people` | Search and browse people |
| `/dashboard/people/[id]` | View an individual profile |
| `/dashboard/export` | Download structured exports |

### API routes

| Route | Methods | Purpose |
| --- | --- | --- |
| `/api/dashboard/stats` | `GET` | Dashboard counts |
| `/api/documents` | `GET`, `POST` | List and create document records |
| `/api/processing/[id]` | `POST` | Run a queued extraction job |
| `/api/review` | `GET` | List review items |
| `/api/review/[id]` | `PATCH` | Approve, reject, or defer an item |
| `/api/review/count` | `GET` | Pending review count |
| `/api/people` | `GET`, `POST` | Search and create people |
| `/api/people/[id]` | `GET`, `PATCH`, `DELETE` | Manage an individual profile |
| `/api/tree` | `GET` | Return relationship data for the tree |
| `/api/export` | `GET` | JSON, CSV, or GEDCOM export |

## AI processing and review safety

The Gemini client requests structured JSON matching the application’s
extraction schema. It keeps original-script names separate from normalized
names and records confidence, evidence, warnings, and source regions when
available.

AI processing requires a real `GEMINI_API_KEY`. If it is missing, the server
returns an explicit configuration error; it does not fabricate a successful
result. Production deployments should invoke processing from a queue or
worker, not rely on a user request for long-running work. Limit retries using
the `processing_jobs.max_attempts` column.

Reviewers should verify each proposed person and relationship against the
source page. Similar names are candidates for matching, not automatic merges.

## Commands

Run these from `family-tree-app`:

```bash
npm run dev        # Start the development server
npm run lint       # Run ESLint
npm run typecheck  # Run TypeScript checks
npm run build      # Create a production build
npm run start      # Serve the production build
```

The project currently has no dedicated automated test suite. Before a
production release, add API integration tests and browser end-to-end coverage
for authentication, uploads, review approval, persistence, and exports.

## Deployment checklist

1. Create a production Supabase project and apply both migrations.
2. Configure Auth providers and assign the initial user role.
3. Confirm the `documents` bucket is private.
4. Configure all required environment variables in the hosting platform.
5. Add `GEMINI_API_KEY` only if AI processing is enabled.
6. Configure database backups and monitor Storage usage.
7. Run `npm run lint`, `npm run typecheck`, and `npm run build`.
8. Verify that API routes reject unauthenticated requests.
9. Upload a non-sensitive test document and complete a review cycle.
10. Confirm exports do not disclose private living-person data unintentionally.

Vercel is supported as a deployment target, but any Node-compatible host can
run the production build:

```bash
npm run build
npm run start
```

## Security and privacy

- Keep the website private by default; do not make genealogy data publicly
  searchable without an explicit product decision.
- Treat uploaded document text as untrusted historical data, never as
  application instructions.
- Keep server credentials in server-only modules and environment variables.
- Validate file type, file size, request bodies, and review actions on the
  server.
- Preserve original evidence and use audit records for approved changes.
- Restrict logs and error reporting because names and documents are sensitive.
- Use soft deletion and backups for recovery instead of destructive deletion.

## Project structure

```text
family-tree-app/
├── app/
│   ├── api/              # Authenticated server routes
│   ├── dashboard/        # Bengali-first application screens
│   ├── login/            # Authentication screens
│   └── register/
├── lib/
│   ├── auth/             # Request authentication and roles
│   ├── gemini/           # Server-only AI client and schema
│   ├── matching/         # Bengali normalization and matching logic
│   └── supabase/         # Browser and server Supabase clients
├── migrations/           # PostgreSQL schema and hardening policies
├── types/                # Shared TypeScript types
├── public/               # Static assets
└── .env.example          # Safe configuration template
```

## License and data ownership

This repository contains application code only. Genealogy records, uploaded
documents, and Supabase data belong to the project owner and must be handled
according to the owner’s privacy, consent, retention, and backup policies.
