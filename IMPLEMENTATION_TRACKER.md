# Tune Bit Implementation Tracker

## Status Legend

- [ ] Not started
- [~] In progress
- [x] Complete

## Current Focus

- [x] Foundation
- [x] Authentication and access control
- [x] Database schema and security
- [x] Collections and songs
- [x] Upload pipeline and storage
- [ ] Note viewer
- [ ] Hardening and QA

## Milestone Checklist

### 1. Foundation

- [x] Scaffold Svelte app
- [x] Configure Tailwind CSS
- [x] Configure shadcn-svelte
- [x] Create shared app shell
- [x] Define environment variable contract

### 2. Authentication and Access Control

- [x] Integrate Supabase Auth
- [x] Build sign-up flow
- [x] Build sign-in flow
- [x] Protect authenticated routes
- [x] Add sign-out flow

### 3. Database Schema and Security

- [x] Create collections table
- [x] Create songs table
- [x] Create note_files table
- [x] Create note_pages table
- [x] Add foreign keys and indexes
- [x] Add row-level security policies

### 4. Collections and Songs

- [x] Build collections list screen
- [x] Add create collection flow
- [x] Add rename collection flow
- [x] Add delete collection flow
- [x] Build collection detail screen
- [x] Add create song flow
- [x] Add rename song flow
- [x] Add delete song flow

### 5. Upload Pipeline and Storage

- [x] Define R2 key structure
- [x] Build secure signed direct-upload flow
- [x] Support multi-file uploads
- [x] Support collection-level upload modal with song name input
- [x] Support song-level uploads
- [x] Persist note_files metadata
- [x] Persist note_pages metadata
- [x] Add upload failure handling

### 6. Note Viewer

- [ ] Build song viewer screen
- [ ] Add one-column layout
- [ ] Add two-column layout
- [ ] Add three-column layout
- [ ] Add normal mode
- [ ] Add focus mode
- [ ] Add per-page zoom controls
- [ ] Render PDFs on demand in browser
- [ ] Render uploaded images in page order

### 7. Hardening and QA

- [ ] Validate auth protections
- [ ] Validate RLS protections
- [ ] Validate upload reliability
- [ ] Validate page ordering
- [ ] Validate keyboard accessibility
- [ ] Review viewer performance for larger PDFs

## Implementation Notes

### Architecture Guardrails

- Use Supabase Auth for identity and session handling.
- Use Supabase Postgres for relational metadata.
- Use Cloudflare R2 for private file storage.
- Keep R2 credentials server-side only.
- Scope database rows and storage keys by user id.

### UX Guardrails

- Keep the UI calm and content-first.
- Make uploads available from both collection and song contexts.
- Keep note viewing faster and more prominent than management actions.
- Keep viewer controls obvious without making the interface heavy.

## Change Log

### Planned

- Created implementation planning docs based on the current PRD.

### Completed

- Scaffolded the SvelteKit app in the existing repository.
- Configured Tailwind CSS v4 and initialized shadcn-svelte with core UI primitives.
- Built a calm shared app shell and a foundation landing page aligned with the PRD.
- Added the initial environment variable contract for Supabase and Cloudflare R2.
- Updated the environment contract to use Supabase publishable key naming and a Cloudflare R2 S3 API URL instead of a separate account id.
- Verified the foundation slice with format, typecheck, lint, and production build commands.
- Added Supabase SSR auth wiring for server-side session handling and protected route checks.
- Built email/password sign-up and sign-in screens plus a server-side sign-out endpoint.
- Updated the shared shell and landing page to reflect live authentication state and the protected app area.
- Added a Supabase migration for collections, songs, note_files, and note_pages with cascading foreign keys and supporting indexes.
- Enforced row-level security on every user-owned table and added updated_at triggers for mutable records.
- Verified the phase 3 slice with typecheck, lint, and production build commands.
- Replaced the protected app placeholder with a collections list backed by Supabase data and collection CRUD actions.
- Added a collection detail route with collection settings plus create, rename, and delete flows for songs.
- Verified the phase 4 slice with typecheck, lint, and production build commands.
- Added a Cloudflare R2 upload pipeline with user-scoped object keys, PDF page counting, and rollback handling for failed uploads.
- Added collection-level quick upload and a song workspace route for direct multi-file uploads plus note_files and note_pages persistence.
- Switched uploads to server-generated signed R2 URLs, browser-to-R2 transfer, protected finalize callbacks, and cleanup callbacks for failed direct uploads.
- Verified the phase 5 slice with typecheck, lint, and production build commands.

### Next Recommended Slice

- Build the note viewer on top of the new upload metadata, starting with ordered page rendering and PDF display in the browser.
