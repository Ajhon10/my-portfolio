Current platform: integrated Vue + Workers + D1. Original design notes below describe earlier implementation history; see cloudflare-unified-architecture.md for the approved migration.

## Connection status and floating navigation — November 25, 2026

A global status bar sits above the page header. It remains visible while the
browser is offline with "You're offline. Please check your internet connection."
After reconnecting it shows "You're back online." for four seconds, then clears.
A new offline event cancels any pending reconnect dismissal. The initial online
load is quiet. The live status works across public, login, admin and client
layouts and wraps at mobile widths.

Let's connect now sits in the right-hand header controls immediately beside the
sun/moon toggle. At the narrowest widths it keeps an accessible mail button
instead of forcing the header to overflow.

A Back to top button appears near the page bottom, centered above the chatbot
icon with a gap between them. It hides while chat is open. Scrolling respects
reduced motion, returns focus to the logo, and removes the button at the top.

## Owner photography and animated theme icons — November 25, 2026

Four supplied originals are bundled at `/seed/photography/<original-filename>.jpg`
and seeded through the existing `migration/photography.csv`, in the supplied order:
Sorsogon Capitol Park, Makati City, Sorsogon City, and Rompeolas, Sorsogon City.
The seed includes truthful captions, descriptive alt text, locations, categories,
display order and published status. The JPEG bytes and existing seed filenames
are preserved. These records remain editable through Photography administration;
repeat seeding preserves customized/removed records. Bundled assets are served
by Static Assets rather than occupying the D1 upload budget.

`ThemeSelect.vue` retains its filename and now renders an icon-only toggle with
standard SVG sun/moon shapes, an accessible name, pressed state and action title.
The sun represents Light and the moon represents Dark. Icons rotate/fade during
changes alongside the existing surface-color transition. Reduced motion makes
both immediate. The public control sits beside Menu at narrow widths and stays
outside the expandable navigation; the admin header uses the same component.

## Viewer controls and theme labels — November 25, 2026

The header selector is now labelled Light mode / Dark mode. Light remains the
default; choices made in the new selector are preserved. Legacy light/dark
storage values start with the new Light default. The internal Primary/Secondary palette tokens and filenames are
retained. Explicit changes animate surface, text, border and shadow colors for
280 ms, with no startup animation and immediate changes for reduced motion.

Game mode now sits next to the current viewer label in the hero, on desktop and
mobile. Its state still belongs to the public layout so the overlay and Exit
action remain synchronized. Live presence counts distinct visitor sessions,
including the current visitor: a total of five displays "You and 4 others are
currently viewing"; two displays "You and 1 other are currently viewing"; one
displays "You are currently viewing". Disconnected counts are not presented as
current. The metadata row wraps at narrower widths.

The production public-content snapshot now lives in CSVs beside the original
seed files; see README.md for counts, scope and media-link behavior.
The seeded portrait now uses a byte-identical same-origin source asset for canvas
reads, restoring the actual particle drawing and pointer scatter locally. The
rendering, sampling and scatter physics remain unchanged. When another linked
portrait cannot be read into canvas from another origin, the saved
image remains visible as a static preview and the caption reflects that state.

## Primary / Secondary themes and shop — November 25, 2026

The default Primary theme uses white surfaces, blue actions and navy text. The
previous navy portfolio is available as Secondary. Both share the existing
typography, composition and interactions; the selector replaces the former
light/dark control in the public navigation and admin header. The selection is
saved in `portfolio_theme`; legacy light/dark values move to Primary. The initial
HTML applies the saved theme before Vue renders. Public sections, galleries,
gears, forms and administration use shared theme colors.

The logo mark is a stroked SVG code symbol. Explore my work uses a folder and
Let's talk / Let's connect use an envelope. These reusable SVGs have fixed
viewboxes and inherit color, so mobile and desktop do not rely on font glyphs.

`/shop` is a public catalog with category filters, search, paged products,
image/video galleries, optional price labels and external purchase links.
Inquire about this opens the existing contact form with the product name and
shop link prefilled. The owner selected inquiry plus optional external purchase
links; checkout, payment processing and order fulfillment are outside this change.

`/admin/shop` lets OWNER/ADMIN create, rename and remove categories, assign up
to ten categories per product, manage draft/published products, and select
multiple images/videos for upload. Save a product before uploading its gallery.
Each media item has an editable description and order; the first item in order
is the cover. Upload results identify individual failures and retain successful
uploads. Removing a product soft-deletes it; gallery/file removal follows the
existing retained-upload workflow. Categories attached to active products cannot
be deleted. Empty, loading, error and filtered-empty states are included.

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
