# Tune Bit Landing and Auth Simplification Plan

## Objective

Simplify the public landing page, sign-in page, and sign-up page so they feel calm, direct, and product-focused, in line with the 37signals-inspired visual direction defined in [PRD.md](file:///Users/hlcfan/workspace/tune_bit/PRD.md#L157-L176).

## Design Goals

- Reduce each page to one primary job
- Remove internal implementation language from public screens
- Use stronger typography, more whitespace, and fewer bordered regions
- Keep primary actions obvious and secondary actions quiet
- Preserve the current authentication behavior while simplifying the presentation

## Current Problems

- The landing page currently mixes product messaging, implementation status, infrastructure details, and roadmap communication in [src/routes/+page.svelte](file:///Users/hlcfan/workspace/tune_bit/src/routes/+page.svelte#L78-L286)
- The sign-in and sign-up pages split attention between marketing content and form completion in [src/routes/sign-in/+page.svelte](file:///Users/hlcfan/workspace/tune_bit/src/routes/sign-in/+page.svelte#L30-L117) and [src/routes/sign-up/+page.svelte](file:///Users/hlcfan/workspace/tune_bit/src/routes/sign-up/+page.svelte#L32-L125)
- The public shell includes more navigation and footer messaging than the simplified direction needs in [src/routes/+layout.svelte](file:///Users/hlcfan/workspace/tune_bit/src/routes/+layout.svelte#L31-L101)

## Guiding Principles

- Write for users, not for implementation milestones
- Prefer plain language over technical or roadmap language
- Use fewer cards, fewer badges, and fewer simultaneous messages
- Let spacing and typography do more of the visual work than decorative framing
- Keep the public experience quiet so the private library feels like the natural destination

## Landing Page

### Goal

Make the landing page a simple product promise page with a clear path into the app.

### Planned Changes

- Replace the current status-heavy layout with a smaller set of content blocks
- Use a hero section with:
  - product name
  - one-sentence value proposition
  - primary call to action
  - secondary call to action
- Add a short benefits section with three concise user outcomes
- Add one short privacy or ownership reassurance line instead of multiple status cards
- Show different calls to action based on session state:
  - signed out: Create account and Sign in
  - signed in: Open library

### Content To Remove

- Authentication status panel
- Delivery order and phase messaging
- Protected route explanation blocks
- Environment contract section
- Immediate next slice section

### Content Tone

- Product-centered
- Quiet
- Concrete
- Operational rather than promotional

## Sign-In Page

### Goal

Turn sign-in into a focused task page with minimal distraction.

### Planned Changes

- Replace the split layout with a single centered auth form
- Keep only:
  - title
  - one short explanation line
  - email field
  - password field
  - inline error message
  - submit button
  - link to sign up
  - small back link
- Remove badges, explanatory stat boxes, and redirect summary blocks
- If redirect context is still needed, reduce it to a single quiet sentence

### Suggested Tone

- Title: Sign in
- Supporting line: Use your email and password to open your library.

## Sign-Up Page

### Goal

Match the sign-in experience while keeping account creation clear and low-friction.

### Planned Changes

- Use the same centered single-panel layout as sign-in
- Keep only:
  - title
  - one short explanation line
  - email field
  - password field
  - inline success or error message
  - submit button
  - link to sign in
  - small back link
- Remove ownership model and protected route explainer boxes
- Keep password guidance minimal and close to the field
- Show post-submit success in a plain, calm confirmation state when email verification is required

### Suggested Tone

- Title: Create your account
- Supporting line: Set up your private library with your email and password.

## Shared Public Shell

### Goal

Reduce chrome around public pages so the page content carries the experience.

### Planned Changes

- Simplify the header to:
  - Tune Bit wordmark on the left
  - one or two actions on the right at most
- Remove or sharply reduce the footer progress messaging
- Preserve the current authenticated and unauthenticated routing behavior
- Let the landing and auth pages sit in more open space with less framing

## Copy Direction

### Favor

- A private place for your sheet music and note pages.
- Keep collections and songs together.
- Upload PDFs or images.
- Read notes without clutter.

### Avoid

- Phase 2 authentication
- Environment contract
- Schema-backed privacy
- Protected route flow
- Delivery order language on public screens

## Visual Direction

- Use fewer cards overall
- Remove most badges from public pages
- Prefer large headings and short paragraphs
- Use soft borders only where structure is needed
- Keep one obvious primary button per screen
- Maintain the existing restrained palette from [layout.css](file:///Users/hlcfan/workspace/tune_bit/src/routes/layout.css)

## Implementation Sequence

1. Simplify the shared public layout in [src/routes/+layout.svelte](file:///Users/hlcfan/workspace/tune_bit/src/routes/+layout.svelte#L31-L101)
2. Rewrite the landing page structure in [src/routes/+page.svelte](file:///Users/hlcfan/workspace/tune_bit/src/routes/+page.svelte#L78-L286)
3. Unify sign-in and sign-up around one visual pattern in [src/routes/sign-in/+page.svelte](file:///Users/hlcfan/workspace/tune_bit/src/routes/sign-in/+page.svelte#L30-L117) and [src/routes/sign-up/+page.svelte](file:///Users/hlcfan/workspace/tune_bit/src/routes/sign-up/+page.svelte#L32-L125)

## Definition of Done

This plan is complete when the landing page communicates the product in a calm and minimal way, the sign-in and sign-up pages are reduced to focused single-purpose flows, and the public shell supports those pages without reintroducing unnecessary chrome or implementation messaging.
