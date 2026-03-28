# Tune Bit PRD

## 1. Product Summary

Tune Bit is a web app for musicians to upload, organize, and view musical notes online without keeping local copies on each device. Users create collections, group note pages under songs, and open their notes from anywhere after signing in.

## 2. Problem

Musical notes are often scattered across devices, cloud folders, chat threads, or paper scans. This makes it hard to keep a single organized library, especially when a song has multiple pages and needs to be reviewed quickly during practice or performance.

## 3. Goal

Build a personal note library that lets a signed-in user:

- create collections
- upload image and PDF note files
- group note pages by song
- view notes in normal mode or focus mode
- choose one, two, or three-column reading layouts
- zoom each page independently
- access their library securely from any device

## 4. Target User

- solo musicians managing personal sheet music
- teachers organizing lesson materials by song
- band members keeping practice charts in one place

## 5. Core User Stories

### Authentication

- As a new user, I can sign up with email and password.
- As a returning user, I can sign in with email and password.
- As a signed-in user, I can only access my own collections, songs, and note files.

### Collections and Songs

- As a user, I can create a collection such as “Jazz Standards” or “Sunday Service”.
- As a user, I can create songs within a collection.
- As a user, I can upload multiple files at once into a song.
- As a user, I can upload multiple note pages to a song.
- As a user, I can see all songs inside a collection.

### File Upload and Organization

- As a user, I can drag and drop multiple files into an upload flow.
- As a user, I can upload image files for note pages.
- As a user, I can upload PDF files for note pages.
- As a user, I can store multiple pages under one song.
- As a user, I can view song pages in the correct order.

### Viewing Experience

- As a user, I can open a song in normal mode.
- As a user, I can switch to focus mode with reduced surrounding UI.
- As a user, I can choose a one-column, two-column, or three-column layout.
- As a user, I can zoom in or out on each page while viewing.

## 6. Functional Requirements

### 6.1 Authentication

- Email and password sign-up is required.
- Email and password sign-in is required.
- Passwords must be securely handled by Supabase Auth.
- Unauthenticated users cannot access app content pages.

### 6.2 Collections

- Users can create, rename, and delete collections.
- Each collection belongs to one user.
- Collection list view shows collection name and song count.
- Collection detail includes a quick upload entry point.
- Collection-level upload opens a modal with a song name input at the top and a drag-and-drop multi-file upload area.

### 6.3 Songs

- Users can create, rename, and delete songs within a collection.
- Each song belongs to one collection and one user.
- Songs contain one or more note pages.
- Song detail supports direct uploads into the current song.

### 6.4 Notes

- Accepted file formats: PDF, JPG, JPEG, PNG, WEBP.
- Users can upload multiple files in a single action.
- A note upload creates one or more pages attached to a song.
- For PDFs, the system stores the original file and renders the uploaded PDF on demand in the browser.
- For images, each uploaded image is treated as a single note page.
- Each page has an order index within a song.

### 6.5 Viewer

- Viewer supports normal mode and focus mode.
- Viewer supports one, two, or three-column layout.
- Each visible page supports zoom in and zoom out.
- Viewer should preserve current layout preferences during a session.
- Zoom is independent per page instance by default.

## 7. Non-Functional Requirements

### Security

- Users can only access their own metadata and files.
- Database access must enforce row-level security.
- File access must require user-scoped authorization.
- Password storage and auth flows must be handled by Supabase Auth.

### Performance

- Common navigation actions should feel immediate on broadband and mobile networks.
- Viewer should load pages progressively for multi-page songs.
- Large PDFs should not block the full UI from rendering.

### Reliability

- Upload failures should show clear recovery messaging.
- Metadata and file storage operations should be coordinated to avoid orphaned records where possible.

### Accessibility

- Keyboard-accessible navigation for viewer controls.
- Clear focus states.
- Sufficient color contrast while keeping the 37signals-inspired visual style.

## 8. UX and Visual Direction

The interface should follow a 37signals-inspired style:

- calm, utility-first layout
- strong typography and spacing
- minimal ornamentation
- soft borders and restrained color usage
- content-first screens with obvious primary actions
- simple navigation similar in spirit to HEY, Basecamp, and Fizzy

### Key UX Principles

- Reduce setup friction.
- Keep the library easy to scan.
- Make reading notes the primary experience.
- Make focus mode feel distraction-free without hiding essential controls.

## 9. Proposed Information Architecture

- Auth
  - Sign up
  - Sign in
- App
  - Collections list
  - Collection detail
  - Song detail / viewer

### Main Screens

#### Collections List

- collection cards or rows
- create collection action
- account menu

#### Collection Detail

- collection title
- song list
- create song action
- collection-level quick upload action
- upload modal with song name input and drag-and-drop multi-file upload

#### Song Viewer

- song title
- layout selector: 1 / 2 / 3 columns
- zoom controls
- normal / focus mode toggle
- page grid or stacked column layout
- independent zoom state per page

## 10. Data Model

### users

Managed by Supabase Auth.

### collections

- id
- user_id
- name
- created_at
- updated_at

### songs

- id
- user_id
- collection_id
- title
- created_at
- updated_at

### note_files

- id
- user_id
- song_id
- storage_provider
- storage_key
- original_filename
- mime_type
- page_count
- created_at

### note_pages

- id
- user_id
- song_id
- note_file_id
- page_number
- sort_order
- preview_key
- created_at

## 11. Technical Direction

- Frontend: Svelte
- Styling: Tailwind CSS
- UI components: shadcn-svelte
- Database and Auth: Supabase
- File storage: Cloudflare R2

### Technical Notes

- Use Supabase Auth for email/password sign-up and sign-in.
- Use Supabase Postgres with row-level security for user-owned metadata.
- Store files in Cloudflare R2 with user-scoped object keys.
- Generate signed access or controlled delivery for private files.
- Generate short-lived signed upload URLs on the server so the browser can upload directly to R2 without exposing credentials.

## 12. MVP Scope

Included in MVP:

- email/password auth
- collection CRUD
- song CRUD
- multi-file uploads
- image and PDF uploads
- multi-page song grouping
- private per-user library
- normal and focus viewer modes
- one, two, and three-column layouts
- per-page zoom controls

Not included in MVP:

- sharing or collaboration
- public links
- OCR or note search
- annotations
- offline mode
- audio playback or metronome tools

## 13. Success Criteria

- A user can sign up and upload notes without manual backend intervention.
- A user can open the same library on another device and view the same content.
- A user can organize notes into collections and songs with multi-page support.
- A user cannot access another user’s files or metadata.

## 14. Product Decisions

- PDFs are rendered on demand in the browser, using the uploaded file directly instead of pre-generating page images by default.
- Uploads are available from both the song screen and collection-level quick actions.
- Collection-level upload uses a modal with a song name input at the top and drag-and-drop multi-file upload.
- Uploads use server-generated signed R2 upload URLs, browser-to-R2 transfer, and a protected callback to persist metadata after upload.
- Page zoom is independent per page instance by default.
