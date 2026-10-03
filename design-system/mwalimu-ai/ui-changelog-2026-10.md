# UI/UX overhaul: changelog, results and open items (October 2026)

## Revision after review (read this first)

The first pass rebuilt the landing, features and about pages and the public header and footer. On review those
were judged worse than the originals, so **that part was reverted**: the original landing look (dark hero, the
Learn / Ask / Share / Track strip, the original header and footer, features and about pages, auth side panels) is
back, with the defects fixed on top of it:

- The large empty band between the hero and the stat strip is gone (a leftover fade block).
- Header: Sign in and Create account are now the same height and aligned on one centre line (Sign in was a
  block element sitting higher than the filled button).
- Phone email field no longer collapses to a sliver.
- **Back on every page.** Public header, footer pages (privacy, terms, docs, FAQ, support, contact, about), verify,
  pricing, blog, auth, onboarding, offline, 404/error screens, and every signed-in screen except the dashboard home.
  The landing page and dashboard home have none: they are where Back lands.
- **Payment failures** now explain what happened, that no money moved, and one next step (sign in / try again /
  contact support). Raw server text such as "Stripe is not configured. Add STRIPE_SECRET_KEY to .env.local" and
  "Unauthorized" no longer reaches users. Cancelled checkout is a calm notice, not a red error.
- Kept from the first pass: restored brand palette, loaded fonts, the signed-in app shell and navigation, PWA
  work, and the accessibility fixes (landmarks, headings, 44px targets, visible control borders).

The per-page notes below describe the first pass; where they conflict with this section, this section wins.

Companion to `ui-audit-2026-10.md`. Five commits, grouped by concern so each can be reviewed or reverted alone:
**tokens → layout → navigation → PWA → polish.**

Screenshots are in `screenshots/`. Caveat on "before": the 360px landing page capture is the original site. The
installed-app (390px, 47px notch) "before" captures were taken after the tokens commit, so they already show the new
colours and fonts but the old header and navigation. Everything was captured with Chrome DevTools device emulation
(mobile viewport, touch, `display-mode: standalone`, emulated safe-area insets), not on physical phones.

## Per page

| Page | What changed |
|---|---|
| **All pages** | Brand palette restored to the logo's mint green and orange; light is the default, dark follows the system and uses neutral #121212-range surfaces. Lexend + Source Sans 3 now actually load (they never did). Hard-coded `gray/white` utilities mapped to tokens. Sizes snap to a type scale (min 12px). Opaque surfaces instead of blur. |
| Landing `/` | Dark full-bleed hero replaced with a light tonal hero; one headline, one field, one action. Collapsed email field fixed (it was 17px tall). Four-word stat strip, tabbed product mockups, 3×2 feature cards, stock photo, comparison table and dark CTA replaced by: a numbered task list, one labelled coach example, a three-step list, native `<details>` FAQ, a plain CTA. Nothing hides behind a scroll-reveal any more. |
| `/features`, `/about` | Card grids replaced with grouped definition lists; tonal hero; real copy; "values/team" cards of initials removed. |
| `/pricing` | Own duplicate header/footer replaced by the shared ones; `<main>` landmark; a broken `var(--surface-subtle)` background fixed. |
| Header (public) | One opaque bar everywhere, safe-area aware, 44px targets, accessibility entry in the phone menu. |
| Footer (public) | One light footer; every link is a 44px target. |
| `/auth/*` | Dark brand panels and glowing orbs removed; `<main>` landmark and `<h1>` on every screen; 44px Back and show-password targets; form borders at 3.5:1. |
| Dashboard shell | App bar reserves the top safe area; Back + screen title on sub-screens; account bottom sheet (all other screens, language, theme, accessibility, sign out) replaces five loose icons and the hidden drawer; one shared content column so every page has the same left edge. |
| Bottom tab bar | Opaque, five icon + one-line-label tabs, 12px labels, ≥56px targets, active state changes icon weight and label, clears the home indicator by ≥ 8px. Steps aside in lessons. |
| Dashboard home | One primary action ("Continue learning"); a single progress panel instead of four identical cards; heading steps down on phones. |
| Learning paths | Single-row scrollable filter chips; title no longer shown three times. |
| Program page | Banner is solid dark green with solid white text (was translucent white on mid-green and white on orange). |
| Lesson | Sticky Previous / Complete bar in the thumb zone; tab bar hidden; labelled section tabs; no mobile breadcrumb. |
| AI Coach | Input no longer under the tab bar; one control row (History) instead of duplicate menu and Back; empty-state heading no longer clipped; accessibility button no longer covers Send. |
| Settings, Tools, Community, Progress, Achievements, Journal, Resources, Modules | Inherit the shell, column, tokens and type scale; contrast and tap-target fixes (see results). |
| Cookie notice | Compact bottom sheet, safe-area aware, Accept/Decline same size. |
| Accessibility panel | Floating button desktop-only; bottom sheet on phones. |
| PWA | iOS standalone metadata, safe maskable icon, light theme/background colours, offline page, no pull-to-refresh bounce in the installed app, new service-worker cache version. |
| Admin console | Untouched by this work (own components, already token-based). |

## Results

Measured with real mobile emulation. Contrast uses the browser's own colour resolution (canvas), including
translucent layers.

| Check (public pages @360px, 15 routes) | Before | After |
|---|---|---|
| Horizontal scroll | none | none |
| Contrast failures (landing page) | 39 flagged | 0 |
| Contrast failures (all public routes) | 51 | 0 |
| Text ≤ 11px (landing page) | 13 | 0 |
| Pages without `<main>` | 4 | 0 |
| Pages without exactly one `<h1>` | 1 | 0 |
| Interactive elements under 44px (excl. skip link and the hidden anti-spam field) | 4–33 per page | 0–3 per page, all inline text links inside sentences (exempt under WCAG 2.2) |

| Check (signed-in app @390px, 14 routes) | After |
|---|---|
| Horizontal scroll | none |
| Contrast failures | 0 on every route checked |
| Text ≤ 11px | 0 |
| Header under the 47px notch | fixed (header reserves the inset; was 0px) |
| Bottom bar above home indicator | padding = max(8px, inset) = 34px |

Lighthouse (mobile, simulated slow 4G, production build served locally):

| Page | Perf | A11y | Best practices | SEO | LCP | CLS |
|---|---|---|---|---|---|---|
| `/` | 92 | 100 | 96 | 92 | 3.3 s | 0 |
| `/features` | 93 | 100 | 96 | 92 | 3.2 s | 0 |
| `/pricing` | 89 | 100 | 96 | 92 | 3.8 s | 0 |
| `/auth/login` | 90 | 96 → fixed after the run (44px show-password target) | 96 | 61 (intentionally `noindex`) | 3.6 s | 0 |

## Not done, and why

- **Real-device checks.** Installed-app behaviour on a physical Android phone and a physical iPhone, notch/Dynamic
  Island rendering, and installed-app screenshots were not possible here. Safe areas, standalone styles and
  overscroll are implemented to spec and verified under emulation only. Please test on both before shipping.
- **LCP ≤ 2.5 s.** Lab LCP is 3.2–3.8 s under simulated slow 4G with 4× CPU throttling; the largest element is the
  hero paragraph and the main cost is the 36 KB render-blocking stylesheet. Field data (p75) needs the deployed site.
  Total transfer is ~415 KB. Splitting the stylesheet is the next lever.
- **Lighthouse "PWA installable".** Lighthouse no longer has a PWA category; manifest, icons (incl. maskable),
  service worker and `display: standalone` are all present.
- **Unused marketing sections.** `components/marketing/sections.tsx` and `mockups.tsx` are no longer used by the landing
  page. Per the brief ("ask before deleting components") they are left in place; say the word and I will remove them.
- **Avatar initials colour** now uses the brand colour; the older multi-colour avatar palette is gone from the header.
  Remaining raw hex values are in `app/global-error.tsx` (a deliberately CSS-free fallback page), the certificate
  page/PDF (a print artefact that must stay white paper), chart colours and OAuth brand icons.
- **Uniform card styling.** The shared `.glass` / `.card-premium` utilities still give most dashboard cards the same
  border and radius. Landing, features, about, dashboard home and program banner were de-templated; the long tail of
  tool pages still uses the shared card look.
- **Standalone "back" on public pages.** The in-app Back control exists inside the signed-in app. Public pages
  (landing, pricing, blog) open in the installed app only via a link; they keep the normal header with Home.
- **`/auth/login` SEO 61.** Intentional: sign-in screens are `noindex` and disallowed in `robots.txt`.
