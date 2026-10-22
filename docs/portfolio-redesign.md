# Portfolio redesign

Reference: https://www.gazijarin.com/ / character portrait interaction and personal editorial presentation, implemented with original blue styling.

## Setup
In portfolio-server run `npx prisma generate`, `npx prisma migrate deploy`, then `npm run build`. The migration adds photography and the three WWC projects without deleting other projects or replacing uploaded project images. Existing records with a matching canonical slug receive the requested contribution descriptions. All remain editable through Projects. Fresh seeds include the projects too.

## Content management
- Site Content / Hero Section: upload a transparent PNG/WebP up to 8 MB. It is converted to blue text particles in the browser, with a live hover preview and spacing/strength controls. Background removal is not applied. External image URLs need CORS permission; uploaded assets use the API origin.
- Photography: upload JPEG/PNG/WebP; set title, accessible image description, caption, location, category, order, and published status. New photos default to draft. Public endpoints expose only published, non-deleted photos. Admin list and mutations require OWNER/ADMIN. Delete removes the gallery record from view and retains the uploaded file.
- A generic bust appears until a personal portrait is uploaded. No stock photography is presented as the owner's work.
- Reduced motion renders a static portrait; animation sleeps when settled or offscreen, and touch scrolling is preserved.

## Project attribution
DEOS contributions were checked against commits authored by Jhon Lisley Jeresano: user manuals (23d72dd, 2aee3f9, 9542a57), PDFs (2487398, 6a5843f), spatial analytics (9c2e1f8, f3087a1, dab86eb), ownership transfer (6cf3307, 73e9e1e), admin submissions (ca0ef8e), search (1c318cd, cf1646b). PDEA/OADR scope follows the owner's description. PDEA explicitly credits the Unity app to other developers and the website/integration to Jhon.

## Manual checks
Verify desktop/mobile home, particle scatter and recovery, reduced motion, portrait save/reload, photography draft visibility, category filters, dialog keyboard dismissal, edit/delete/order, and all three project detail pages.

## Verification results (local)
Both application production builds passed. Backend Jest: 2 suites, 13 tests passed. Headless Chrome confirmed desktop (1440px) and mobile (390px) navigation without overflow or page errors, all three project details, anonymous/client access restrictions, photography upload/create/edit/publish/delete and draft privacy, gallery dialog Escape handling, transparent portrait upload/save/reload, mouse interaction, and reduced motion. Temporary accounts and media were cleaned up; the original hero photo setting was restored. Local database migrations were applied; production deployment is not performed.

## Single-page and assistant update

The public route is now `/`, with `#hero`, `#projects`, `#about`, `#tech`, `#experience`, `#certifications`, `#photography`, and `#contact` sections. Project cards expand details on the page using `/?project=<slug>#projects`. Legacy `/projects`, `/projects/:slug`, and `/photography` URLs redirect to the matching section. Admin and client authentication routes remain separate.

Site Content > Branding > Website Favicon accepts ICO (including the image/vnd.microsoft.icon MIME type), PNG, SVG, and WebP up to 8 MB. The icon URL is versioned with the saved timestamp. Saves refresh the active tab, notify other tabs through a storage event, and reload when a tab regains focus.

The assistant uses current published project descriptions (including full contribution boundaries), technologies, experience, certifications, and enabled Q&A. A single shared keyword no longer selects a canned answer. It retains the latest 12 turns, includes the new question once, resolves project follow-ups, asks about ambiguous scope, and does not invent prices or commitments. The new migration adds ten editable Q&A entries and replaces only the original unsupported experience-years seed answer. Knowledge edits are available in Admin > Chatbot AI > Add Q&A.

Configure `OPENAI_API_KEY` in the backend environment to enable model-generated responses; the existing `OPENAI_MODEL` setting is preserved. Without a key or when the API fails, the assistant returns labelled published notes, exact verified Q&A, current contact/availability, or a clarification. Local API-key configuration was empty during verification: real model calls were not exercised. Mocked model tests verify history, public-data selection, failure/truncation fallback, and admin takeover during generation.

The frontend no longer sets `baseUrl`; the relative `@/*` paths mapping remains supported. See the [TypeScript 6 migration notes](https://www.typescriptlang.org/docs/handbook/release-notes/typescript-6-0.html) and the [OpenAI prompt engineering guidance](https://developers.openai.com/api/docs/guides/prompt-engineering) used for context separation and grounded answers.

Verification: both builds passed; 25 backend tests across 4 suites passed; changed frontend files passed ESLint. Headless Chrome verified the eight sections, old-link redirects, in-page project details, mobile navigation without horizontal overflow, suggested chat questions, AI-workflow/PDEA answers, follow-up references, actual ICO upload, cross-tab favicon refresh, and reload persistence. Temporary test accounts, conversations, notifications, and icon files were removed; the original favicon setting was restored.
