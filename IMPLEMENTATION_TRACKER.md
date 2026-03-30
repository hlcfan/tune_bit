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
- [x] Simplified authenticated UI
- [x] Simplified public landing and auth UI
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
- [x] Support PDF page-range selection during upload
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
- [x] Harden SEO metadata and crawler directives for public and private routes
- [ ] Validate RLS protections
- [x] Validate upload reliability
- [ ] Validate page ordering
- [x] Validate keyboard accessibility
- [x] Review viewer performance for larger PDFs

### 8. Simplified Authenticated UI

- [x] Remove the authenticated top navigation bar
- [x] Make authenticated layouts full width
- [x] Add a sticky avatar menu with Collections and Log out
- [x] Make the signed-in home route the collections index
- [x] Add a dedicated Add New Song page with collection preselection
- [x] Support first-run song creation with a default collection fallback
- [x] Simplify collection pages around the song list
- [x] Keep the song note list and viewer on one screen
- [x] Move song uploads into a song-page modal

### 9. Simplified Public Landing and Auth UI

- [x] Simplify the shared public shell
- [x] Reduce the landing page to a focused product promise
- [x] Simplify the sign-in page into a single-panel form
- [x] Simplify the sign-up page into a single-panel form

## Implementation Notes

### Architecture Guardrails

- Use Supabase Auth for identity and session handling.
- Use Supabase Postgres for relational metadata.
- Use Cloudflare R2 for private file storage.
- Keep R2 credentials server-side only.
- Scope database rows and storage keys by user id.

### UX Guardrails

- Keep the UI calm and content-first.
- Keep uploads attached to the song screen so users stay in reading context.
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
- Reworked the authenticated shell into a full-width layout with a persistent bottom-left avatar menu for Collections and Log out.
- Turned the signed-in home route into a cleaner collections index and added a dedicated Add New Song page with collection preselection plus a first-run default collection fallback.
- Simplified collection detail screens around the song list and moved note uploads into a song-page modal while keeping the note list and viewer on the same screen.
- Enhanced song-page note deletion so modal submissions stay in place without leaving the route on a named action URL.
- Verified the simplified UI slice with typecheck, lint, production build, and a live local preview.
- Refined the focus-mode toolbar into a smaller centered floating bar so layout and exit controls stay accessible without pushing down the note viewer or introducing extra visual chrome.
- Updated the song note viewer to scale each PDF and image page to the available viewport height so the full note content fits on screen by default in both normal and focus modes.
- Split focus mode into a dedicated full-screen viewer with explicit one-, two-, and three-column layouts plus floating per-page resize controls that no longer add extra chrome or padding around each note.
- Centered the song-page upload modal so it opens consistently in the middle of the viewport like the delete-note dialog.
- Stopped the song viewer from recalculating page viewport height on window scroll so scrolling no longer resizes note images or PDF pages unexpectedly.
- Simplified the floating signed-in menu into an avatar-only trigger, anchored its popup above the avatar, and hid it while the song viewer is in focus mode.
- Added left-arrow and right-arrow shortcuts in song focus mode so readers can move to the previous or next song in the same collection without leaving the full-screen viewer.
- Updated protected note-file responses to use long-lived private browser caching with cookie variance, and cleared cached note assets on sign-out so repeat viewing avoids unnecessary R2 fetches without leaking across sessions.
- Extended left-arrow and right-arrow song switching to the standard song page while suppressing it when upload or delete dialogs are open.
- Updated the Add a Song screen to use a two-column layout with song details on the left and a drag-and-drop upload area on the right, and enabled optional file uploads during song creation.
- Added optional PDF page selection during song uploads so users can upload all pages, explicit page lists, or page ranges from a single PDF.
- Changed the empty song page so the inline drag-and-drop upload area appears immediately instead of requiring an Upload Notes button and modal first.
- Added dismissible flash notifications with automatic fade-out across collection, song, and add-song screens plus the focus-mode viewer.
- Changed the default post-auth landing route from /app to /home and added a protected /home alias for the collections index.
- Simplified the public shell, landing page, sign-in page, and sign-up page to better match the calm, minimal 37signals-inspired direction in the PRD.
- Polished public-page copy tone and spacing to feel quieter and closer to the HEY/Basecamp style without changing the simplified page structure.
- Tightened the public-page voice and spacing again after reviewing Basecamp, using more direct problem-solution copy and clearer section titles while keeping the simplified structure intact.
- Removed the extra "Back to overview" links from the auth forms so the pages stay focused on signing in or creating an account.
- Hardened page-level SEO by adding canonical URLs and richer landing-page share metadata, while marking private and auth routes as non-indexable in both page metadata and robots rules.
- Added the collection index row actions menu so each collection can be renamed or deleted from the same three-dots control pattern used elsewhere in the app.
- Made collection row menus, song row menus, and the floating avatar menu dismiss when users click outside their popovers while preserving the existing click-to-toggle behavior.

### Next Recommended Slice

- Finish phase 7 by validating row-level security behavior, verifying page ordering against real multi-file uploads, and smoke-testing the new simplified collection and song flows with authenticated data.
