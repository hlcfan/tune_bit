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
- [x] Note viewer
- [~] Hardening and QA

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

- [x] Build song viewer screen
- [x] Add one-column layout
- [x] Add two-column layout
- [x] Add three-column layout
- [x] Add normal mode
- [x] Add focus mode
- [x] Add per-page zoom controls
- [x] Render PDFs on demand in browser
- [x] Render uploaded images in page order

### 7. Hardening and QA

- [x] Validate auth protections
- [ ] Validate RLS protections
- [x] Validate upload reliability
- [ ] Validate page ordering
- [x] Validate keyboard accessibility
- [x] Review viewer performance for larger PDFs

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
- Turned the song workspace into a note viewer with one, two, and three-column layouts plus normal and focus modes.
- Added protected file streaming routes and browser-side PDF rendering with on-demand page loading for private R2 assets.
- Added independent per-page zoom controls for both PDF and image note pages while keeping upload and page-order management in the same song screen.
- Verified the phase 6 slice with typecheck, lint, and production build commands.
- Hardened server-side auth checks to rely on verified users, aligned signed-in UI state with authenticated user presence, and removed the recurring Supabase session warning during development.
- Improved upload resilience on both upload surfaces by validating one prepared upload per selected file and by tracking duplicate filenames with stable per-file progress ids.
- Improved viewer keyboard accessibility with focus restoration, layout and focus shortcuts, clearer live regions, and more descriptive per-page zoom controls.
- Improved larger-PDF delivery by adding byte-range and HEAD support on protected file routes while keeping progressive page rendering in place.
- Verified the phase 7 hardening slice with typecheck, lint, and production build commands.

### Next Recommended Slice

- Finish phase 7 by validating row-level security behavior and verifying page ordering against real multi-file uploads.
