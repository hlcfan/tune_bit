# Tune Bit Implementation Plan

## Objective

Turn the product scope in [PRD.md](PRD.md) into an ordered delivery plan that keeps infrastructure, security, and product experience aligned from the start.

## Delivery Principles

- Build the smallest complete vertical slices first.
- Keep all user-owned data scoped by authenticated user id.
- Use server-side flows for storage operations and private file access.
- Optimize early for a calm, content-first reading experience.
- Prefer progressive enhancement for uploads, PDF rendering, and viewer controls.

## Phase 1: Foundation

### Goal

Establish the app shell, styling system, and core development setup.

### Changes

- Scaffold the Svelte application.
- Add and configure Tailwind CSS.
- Add and configure shadcn-svelte.
- Establish base app layout, typography, spacing, and navigation patterns.
- Add environment configuration strategy for Supabase and Cloudflare R2.

### Deliverables

- Running app scaffold
- Shared layout shell
- Base UI primitives and styling tokens
- Environment variable contract for local and deployed environments

### Exit Criteria

- App runs locally.
- Styling pipeline is working.
- Shared UI patterns are ready for auth and app screens.

## Phase 2: Authentication and Access Control

### Goal

Allow users to create accounts, sign in, and access only their own content.

### Changes

- Integrate Supabase Auth for email/password sign-up and sign-in.
- Add authenticated and unauthenticated route handling.
- Add session-aware app shell behavior.
- Add sign-out flow.
- Define protected server-side patterns for user identity access.

### Deliverables

- Sign-up screen
- Sign-in screen
- Protected app routes
- Session handling in client and server flows

### Exit Criteria

- A signed-out user cannot access app content screens.
- A signed-in user can create a session and return to the app reliably.

## Phase 3: Database Schema and Security

### Goal

Create the user-scoped relational model and enforce row-level protection.

### Changes

- Create tables for collections, songs, note_files, and note_pages.
- Add foreign keys and useful indexes.
- Add created_at and updated_at conventions where appropriate.
- Write row-level security policies for every user-owned table.
- Define deletion behavior for related records.

### Deliverables

- Supabase SQL migrations
- RLS policies
- Seed or local setup guidance if needed

### Exit Criteria

- Every user-owned row is protected by RLS.
- Core collection and song relationships work as expected.

## Phase 4: Collections and Songs

### Goal

Deliver the main organizational flows for a private note library.

### Changes

- Build collections list screen.
- Build collection detail screen.
- Add collection create, rename, and delete flows.
- Add song create, rename, and delete flows.
- Show song counts and song listings in the appropriate views.

### Deliverables

- Collections list UI
- Collection detail UI
- CRUD actions for collections and songs

### Exit Criteria

- A signed-in user can manage a personal library structure end to end.

## Phase 5: Upload Pipeline and Storage

### Goal

Support secure multi-file uploads for images and PDFs without exposing storage credentials.

### Changes

- Define private Cloudflare R2 object key strategy using user-scoped paths.
- Build a signed direct-upload flow for image and PDF files.
- Support uploads from both the song screen and collection-level modal.
- Create note_files and note_pages metadata records during upload.
- Add upload error handling and recovery messaging.

### Deliverables

- Signed upload URL generation and protected metadata callback flow
- Collection-level upload modal with song name input
- Song-level upload flow
- Metadata persistence for uploaded assets

### Exit Criteria

- A user can upload multiple supported files in one action.
- Files are private and stored with user-scoped keys.
- Upload metadata stays consistent with stored objects.

## Phase 6: Note Viewer

### Goal

Make reading notes fast, clear, and reliable across different song shapes.

### Changes

- Build song viewer screen.
- Add normal mode and focus mode.
- Add one, two, and three-column layout options.
- Add independent per-page zoom state.
- Render uploaded PDFs in-browser on demand.
- Render uploaded images as note pages in reading order.

### Deliverables

- Viewer layout controls
- Focus mode
- Per-page zoom controls
- Progressive page rendering behavior

### Exit Criteria

- A user can open a song and read notes comfortably in multiple layouts.
- PDF viewing does not require pre-generated images by default.

## Phase 7: Hardening and QA

### Goal

Reduce product risk before broader use.

### Changes

- Validate auth boundaries and RLS behavior.
- Validate upload failure cases and error messages.
- Validate multi-page ordering and viewer behavior.
- Improve keyboard accessibility and focus handling.
- Review performance for larger PDFs and longer song page sets.

### Deliverables

- Verified happy-path flows
- Verified security boundaries
- Polished accessibility and resilience fixes

### Exit Criteria

- Core MVP flows are stable and aligned with the PRD.

## Recommended Build Order

1. Phase 1: Foundation
2. Phase 2: Authentication and Access Control
3. Phase 3: Database Schema and Security
4. Phase 4: Collections and Songs
5. Phase 5: Upload Pipeline and Storage
6. Phase 6: Note Viewer
7. Phase 7: Hardening and QA

## Key Risks to Track

- Supabase auth and route protection consistency across client and server boundaries
- RLS policy gaps that could expose other users' metadata
- Metadata and R2 object creation getting out of sync during failed uploads
- Browser PDF rendering performance for large files
- Viewer complexity expanding beyond the calm MVP scope

## Definition of MVP Complete

MVP is complete when a signed-in user can create collections, create songs, upload image and PDF notes privately, and open those notes in a usable multi-layout viewer with focus mode and per-page zoom.
