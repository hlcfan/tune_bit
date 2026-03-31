# Tune Bit

Tune Bit is a calm, content-first web app for uploading, organizing, and
reading musical notes online.

It is built with SvelteKit, Tailwind CSS, shadcn-svelte, Supabase Auth and
Postgres, and Cloudflare R2 for private file storage.

## What the app includes

- Email/password authentication with protected app routes
- Collections and songs scoped to the signed-in user
- Secure note uploads backed by Cloudflare R2
- Support for both image files and PDFs
- Multi-file upload flows from both collection and song contexts
- Optional PDF page-range selection during upload
- Browser-based note viewing with one-, two-, and three-column layouts
- Focus mode with keyboard-friendly navigation and per-page zoom controls

## Tech stack

- SvelteKit + TypeScript
- Tailwind CSS v4
- shadcn-svelte + Bits UI primitives
- Supabase Auth + Postgres
- Cloudflare R2
- PDF.js and pdf-lib for PDF handling

## Local setup

### 1. Install dependencies

```sh
npm install
```

### 2. Configure environment variables

Copy `.env.example` to `.env` and fill in the required values:

```sh
cp .env.example .env
```

| Variable                                  | Purpose                                                                        |
| ----------------------------------------- | ------------------------------------------------------------------------------ |
| `PUBLIC_SUPABASE_URL`                     | Supabase project URL used by the browser and server                            |
| `PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY` | Supabase publishable key for client auth/session flows                         |
| `SUPABASE_SERVICE_ROLE_KEY`               | Server-only key used for privileged Supabase operations                        |
| `CLOUDFLARE_R2_S3_API_URL`                | R2 S3 API endpoint in the form `https://<account-id>.r2.cloudflarestorage.com` |
| `CLOUDFLARE_R2_ACCESS_KEY_ID`             | R2 access key id                                                               |
| `CLOUDFLARE_R2_SECRET_ACCESS_KEY`         | R2 secret access key                                                           |
| `CLOUDFLARE_R2_BUCKET`                    | Private R2 bucket name for note files                                          |

### 3. Prepare Supabase

Apply the SQL in
[202603270001_schema_and_rls.sql](tune_bit/supabase/migrations/202603270001_schema_and_rls.sql)
to your Supabase project.

The migration creates and secures these user-owned tables:

- `collections`
- `songs`
- `note_files`
- `note_pages`

It also enables row-level security for every table so users can only access
their own records.

### 4. Prepare Cloudflare R2

- Create a private bucket for note files
- Create an R2 API token with access to that bucket
- Use the account S3 API endpoint, not a public `r2.dev` URL

## Run the app

Start the local development server:

```sh
npm run dev
```

Open the printed local URL in your browser.

## Validation commands

Use these commands while working in the project:

```sh
npm run check
npm run lint
npm run build
```

## Project structure

```text
src/
  lib/
    components/     UI components and viewer pieces
    config/         public environment access
    server/         auth, storage, and upload helpers
  routes/           public, auth, collections, songs, and file endpoints
supabase/
  migrations/       database schema and RLS setup
```

## Key product flows

### Auth

- Sign up and sign in use Supabase Auth
- Authenticated routes live under `/app` and `/home`
- Sign-out clears session state and note-file cache state

### Organization

- Users create collections
- Collections contain songs
- Songs contain uploaded note files and note pages

### Uploads

- Uploads are prepared server-side
- Files are sent directly to R2 with signed requests
- Metadata is finalized in Supabase after upload succeeds
- Failed uploads can be cleaned up safely

### Viewing

- PDFs render on demand in the browser
- Images render as ordered note pages
- Readers can switch layouts, use focus mode, and adjust zoom per page

## Notes for contributors

- The product scope lives in [PRD.md](tune_bit/PRD.md)
- Delivery sequencing lives in
  [IMPLEMENTATION_PLAN.md](tune_bit/IMPLEMENTATION_PLAN.md)
- Current progress lives in
  [IMPLEMENTATION_TRACKER.md](tune_bit/IMPLEMENTATION_TRACKER.md)
