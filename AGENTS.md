## Project Configuration

- **Language**: TypeScript
- **Package Manager**: npm
- **Add-ons**: tailwindcss, eslint, prettier

---

# AGENTS.md

## Project Context

This repository is for Tune Bit, a web app that lets authenticated users upload, organize, and view musical notes online by collection and song.

The current source of truth for product scope is [PRD.md](PRD.md).

## Required Stack

- Svelte for the application framework
- Tailwind CSS for styling
- shadcn-svelte for UI components
- Supabase for authentication and relational data
- Cloudflare R2 for private file storage

Do not replace these technologies unless the user explicitly requests it.

## Product Principles

- Optimize for a calm, content-first experience.
- Follow a 37signals-inspired visual direction similar to HEY, Basecamp, and Fizzy.
- Keep interfaces simple, readable, and operationally clear.
- Prioritize note viewing over dashboard complexity.

## Core Domain Rules

- A user owns collections, songs, note files, and note pages.
- A collection contains many songs.
- A song contains one or more note pages.
- Notes can originate from uploaded images or PDFs.
- Users can upload multiple files in one action.
- Users must only access their own data and files.

## Security Rules

- Use Supabase Auth for email/password authentication.
- Enforce row-level security on every user-owned table.
- Never expose Cloudflare R2 credentials to the browser.
- Use server-side upload and signed/private access patterns for files.
- Avoid storing sensitive data outside approved infrastructure.

## Implementation Guidelines

- Prefer server-side or protected endpoint flows for storage operations.
- Use consistent user-scoped identifiers in database rows and storage keys.
- Keep the UI component layer aligned with shadcn-svelte patterns.
- Prefer clear typography, restrained color, generous spacing, and simple layouts.
- Build responsive layouts, but prioritize a strong desktop/tablet viewing experience for music notes.
- Support uploads from both the song screen and a collection-level modal with a song name input and drag-and-drop multi-file upload.
- Render uploaded PDFs on demand in the browser by default.
- Design the note viewer so layout mode and zoom controls are obvious and fast to use.
- Keep zoom state independent per page instance by default.

## Suggested App Areas

- authentication
- collections
- songs
- uploads
- note viewer
- storage integration

## Expected Initial Deliverables

- app scaffold with Svelte and Tailwind
- shadcn-svelte setup
- Supabase auth integration
- database schema for collections, songs, note files, and note pages
- secure upload pipeline to Cloudflare R2
- collection list, collection detail, and song viewer screens

## Working Agreement for Future Changes

- Read existing files before editing to match local conventions.
- Prefer editing existing files over creating extra files.
- Keep markdown docs concise and useful.
- Validate code changes with the relevant checks available in the repository.
- Follow [IMPLEMENTATION_PLAN.md](IMPLEMENTATION_PLAN.md) as the default delivery sequence unless the user asks for a different order.
- After completing a task, update [IMPLEMENTATION_TRACKER.md](IMPLEMENTATION_TRACKER.md) so progress stays current.
- If new product decisions are made, update [PRD.md](PRD.md) so implementation stays aligned.
