# Tune Bit Simplified UI Implementation Plan

## Objective

Deliver the simplified authenticated experience defined in [PRD.md](PRD.md), centered on full-width layouts, minimal navigation, streamlined collection and song creation flows, and an integrated song detail screen.

## Scope

- Remove the authenticated top navigation bar
- Make authenticated page content full width by default
- Add a sticky bottom-left avatar menu with Collections and Log out
- Make the signed-in home page the collections index
- Add a dedicated Add New Song page with collection preselection rules
- Support first-run song creation with a placeholder default collection option
- Keep the song note list and viewer on the same screen
- Move note uploads to a song-page modal with drag-and-drop and manual file browsing

## Guiding Principles

- Prioritize note content over layout chrome
- Keep navigation obvious but minimal
- Reduce page-to-page friction for frequent actions
- Preserve user ownership and secure server-side storage flows
- Fit new UI flows into the existing product architecture without widening MVP scope

## Phase 1: App Shell Simplification

### Goal

Replace the current authenticated shell with the simplified full-width layout.

### Changes

- Remove the top navigation bar from authenticated screens
- Update the shared authenticated layout to use the full available page width
- Add a sticky bottom-left avatar trigger that remains visible across authenticated app screens
- Add an avatar menu with exactly two actions: Collections and Log out
- Ensure the simplified shell works across home, collection, add-song, and song screens

### Exit Criteria

- Authenticated pages render without the top nav
- Main content uses the available width cleanly
- Avatar menu is consistently available and functional

## Phase 2: Home as Collections Index

### Goal

Make the signed-in home route the primary collections screen.

### Changes

- Route signed-in users to the collections index on home
- Show all user collections in a compact, scan-friendly layout
- Add a clear Add Collection action
- Add a clear Add New Song action
- Preserve collection metadata visibility, including song count
- Design empty and populated states so they support fast scanning

### Exit Criteria

- Signed-in users land on collections home
- Collections are easy to browse and act on
- Primary actions are visible without wasting content space

## Phase 3: Dedicated Add New Song Flow

### Goal

Move new song creation into a dedicated page with predictable collection selection behavior.

### Changes

- Create a dedicated Add New Song page
- Include a song title field and collection dropdown
- Preselect the current collection when launched from a collection page
- Preselect the most recently updated collection when launched from home
- If the user has no collections, show a placeholder default collection option in the dropdown
- When the placeholder option is submitted, create the real collection before creating the song
- Redirect the user to the new song detail screen after successful creation

### Exit Criteria

- New song creation works from home and collection contexts
- Collection preselection rules are consistent
- First-run users can create a song without separately creating a collection first

## Phase 4: Collection Page Simplification

### Goal

Make collection pages focused and space-efficient.

### Changes

- Show the collection title and song list with minimal chrome
- Remove collection-level upload from the collection page
- Add an Add New Song action that opens the dedicated add-song page with the current collection preselected
- Keep row density compact enough to make browsing fast

### Exit Criteria

- Collection page is centered on songs, not secondary controls
- Add-song flow from a collection page feels direct and predictable

## Phase 5: Song Page Integration

### Goal

Keep song management and reading on one screen.

### Changes

- Show the song title and note list on the song page
- Keep the note list and viewer on the same screen
- Use a compact note list so the viewer remains the dominant content area
- Preserve existing viewer capabilities: normal mode, focus mode, one/two/three-column layout, and per-page zoom
- Ensure the integrated layout works well for songs with few or many note pages

### Exit Criteria

- Users can manage and read a song without leaving the song detail screen
- Viewer still receives the majority of horizontal attention

## Phase 6: Song Upload Modal

### Goal

Attach note uploads directly to the current song without leaving context.

### Changes

- Add an Upload Notes action on the song page
- Open a modal for uploads instead of routing away
- Support drag-and-drop file selection
- Support manual file browsing
- Reuse the secure signed-upload flow and metadata persistence flow
- Refresh the song note list and viewer after successful upload
- Show clear recovery states for failed uploads

### Exit Criteria

- Users can upload notes from the song page only
- Modal upload flow supports multiple files and keeps the user in context

## Phase 7: Validation and Hardening

### Goal

Verify that the simplified flows are correct, secure, and easy to use.

### Changes

- Validate avatar menu navigation and sign-out behavior
- Validate full-width shell behavior across breakpoints
- Validate home, collection, add-song, and song routes
- Validate preselection rules for collection dropdown behavior
- Validate placeholder collection creation when no collections exist
- Validate song-page modal uploads and post-upload refresh behavior
- Validate integrated note list and viewer usability with different page counts
- Recheck auth and row-level security boundaries after route and UI changes

### Exit Criteria

- Simplified UI flows behave consistently
- First-run and returning-user paths both work well
- Security and file ownership rules remain intact

## Recommended Order

1. App shell simplification
2. Home as collections index
3. Dedicated Add New Song flow
4. Collection page simplification
5. Song page integration
6. Song upload modal
7. Validation and hardening

## Key Risks

- Removing top navigation may expose hidden layout assumptions in current routes
- Placeholder collection creation may create confusing naming or duplicate-first-collection behavior if not designed carefully
- Same-screen note list and viewer layout may become cramped on smaller screens if spacing is not tuned
- Song upload modal state may drift from server metadata if refresh handling is incomplete

## Definition of Done

This plan is complete when the app uses the simplified authenticated shell, the home page is the collections index, songs are created through the dedicated add-song flow with the documented fallback behavior for users with no collections, and the song page combines note listing, viewing, and modal-based uploads without reintroducing wasted chrome.
