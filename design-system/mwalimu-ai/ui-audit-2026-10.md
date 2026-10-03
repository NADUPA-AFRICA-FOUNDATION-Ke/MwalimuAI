# UI/UX audit — pre-production (October 2026)

Method: git history of the theme files, a computed-style scan of every public route at 360px with real
mobile emulation (Chrome DevTools, not a resized window), and a read of every shared layout, navigation
and PWA file. Authenticated dashboard pages share `DashboardHeader`, `SidebarNav`, `MobileBottomNav` and the
dashboard layout, which were read directly. Rule numbers refer to the brief.

## Root causes

| # | Finding | Evidence | Rules |
|---|---|---|---|
| A1 | **The "darker" release is the 8 Sept palette commit (`6053fc2`).** Brand green went from a vivid emerald (`#00883C`, oklch .52 .20 160) to a deep teal (`#057A5B`); the orange accent went from `#F87300` to brick `#C2410C`; text ink and all hero/auth panels moved to near-black green `#0E201B`. The logo itself is bright mint to orange, so the UI now reads as a different, heavier brand. | `git show 083ec5f:app/globals.css` vs current `:root` | 1.2 |
| A2 | Landing hero, login and sign-up side panels are full-bleed `#0E201B`. Dark surface where none was asked for, and well outside the #121212–#1E1E1E guidance. | `app/page.tsx`, `auth/*`, `.hero-bg` | 1.1, 6 |
| A3 | `.text-gray-300/400/500 { color: muted !important }` flattens all secondary text to one value, so hierarchy collapses and the colour change leaks everywhere (40 uses of `text-gray-400`). | `globals.css` | 1.2, 2.3 |
| A4 | Dark mode is reachable by accident: the header toggle cycles light → dark → "system", but the provider has `enableSystem={false}`, so "system" is not a real option and a stored `dark` sticks forever. | `components/providers.tsx`, `dashboard-header.tsx` | 1.1 |
| A5 | Dark palette is a green-black (`#0E201B`), not neutral #121212–#1E1E1E; accents are not desaturated. | `.dark` block | 1.5 |
| B1 | **The brand fonts never load.** Lexend and Source Sans 3 are named in CSS but there is no `next/font`, no `@font-face`, and zero font requests. Chrome reports every heading and paragraph rendering in the system font (San Francisco / Roboto). The "deliberate font pairing" does not exist in production. | CDP `getPlatformFontsForNode`, 0 font requests | 6, 7.2 |
| B2 | 34 raw hex colours in components (avatar palette, certificate page, error page, OAuth icons); 56 `bg-white`, 18 `bg-gray-50`, 18 `border-gray-100` that bypass tokens and ignore dark mode. | grep | 1.2 |
| B3 | 125 arbitrary pixel text sizes (`text-[10px]` ×35, `[11px]` ×31, `[13px]`…) outside any scale. 16 runs of text ≤ 11px on the landing page. | grep, computed styles | 2.3, 5.4 |
| C1 | **Header ignores the safe area.** `viewport-fit=cover` is set, but the sticky header is a fixed 60px with no `padding-top: env(safe-area-inset-top)`, so in the installed app it sits under the status bar / notch. | `dashboard-header.tsx` | 4.2 |
| C2 | **No in-app back control.** Sub-screens (lesson, assessment, certificate, tool pages, settings) have no back button in the header. Installed iOS has no browser back, so users can strand themselves. The drawer is the only other route. | `dashboard-header.tsx`, pages | 4.1, 4.4 |
| C3 | No `appleWebApp` metadata (no status-bar style / app title), no `display-mode: standalone` styles, no overscroll control (pull-to-refresh reloads the chat mid-message). | `app/layout.tsx`, `globals.css` | 4.1, 4.5 |
| C4 | Manifest is mostly sound (`standalone`, scope `/`, maskable icon present) but has no `id`, `theme_color` will need to follow the new canvas, and the maskable icon needs a safe-zone check. | `public/manifest.json` | 4.3 |
| C5 | Bottom nav is a translucent `backdrop-blur` bar with 10px labels and a 44px row; bottom padding is only the inset (no 8px floor). | `mobile-bottom-nav.tsx` | 3.1, 4.2, 5.1 |
| C6 | Inside a lesson the full header and bottom nav stay on screen. Primary actions (Previous / Complete / Next) are in the page body, not the thumb zone. | lesson page | 3.3, 3.5 |
| C7 | Fixed-height screens hard-code `calc(100dvh - 57px)` while the header is 60px (3px mis-fit), and `lesson-rehearsal` uses `100vh`, which is wrong behind mobile browser chrome. | `ai-coach`, `lesson-rehearsal` | 2.5, 4.2 |
| D1 | Misalignment: 28 different `max-w-* mx-auto` page roots (2xl/3xl/4xl/5xl, centred), so each dashboard page has a different left edge. | grep | 2.2 |

## Per page / component

Measured at 360px with mobile emulation: no page scrolls horizontally (decorative blobs are clipped).
Targets below 44px counts links and buttons smaller than 44×44.

| Page / component | Issue | Rule | Sev | Fix |
|---|---|---|---|---|
| Landing `/` hero | Dark `#0E201B` hero; email field collapsed to 17px tall (unusable); eyebrow dot and text misaligned; accessibility FAB overlaps CTA | 1.1, 2.4, 5.1 | High | Light brand hero, real input height, one primary CTA |
| Landing `/` sections | Scroll-reveal hides sections (`opacity:0`) until JS observes them; blank bands on slow phones; stat row of four identical big words; tab pills wrap unevenly (2 + 1); macOS traffic-light mockup | 2.5, 6 | High | Visible by default; editorial list; remove template chrome |
| Landing copy | "Learn, plan and reflect. In one place." and "A focused view of…" are vague; fake learner "Jane" | 6 | Med | Specific, plain copy |
| `/features`, `/about` | Grids of identical bordered rounded cards; 7 and 5 contrast failures on muted text | 1.4, 6 | Med | Tonal groups, vary structure, token colours |
| `/pricing` | No `<main>` landmark; 36px menu toggle | 5.3, 5.1 | Med | Landmark, 44px target |
| `/docs` | 33 text links 17px tall | 5.1, 5.2 | Med | Padded list links |
| `/contact`, `/support` | Radio/checkbox inputs 26×46, chip row 38px | 5.1 | Low | Larger hit areas |
| `/auth/login`, `/auth/sign-up` | Dark brand panel (desktop); `Back` link 54×20; no `<main>`; text links 17px | 1.1, 5.1 | Med | Light panel, 44px links, landmark |
| `/auth/forgot-password` | No `<h1>`; "Go back" 312×38 | 5.3 | Low | Heading, 44px |
| `DashboardHeader` | No safe-area padding; no back control; 13.5px brand; theme toggle can pick unsupported "system" | 4.1, 4.2, 1.1 | High | Safe area, contextual back + title, fix theme |
| `MobileBottomNav` | See C5 | 3.1 | High | Opaque bar, 12px labels, 56px tabs, safe-area floor, icon + label state |
| `SidebarNav` | Drawer is the only path to Journal, Progress, Achievements, Resources, Settings on phones | 3.2 | Med | Keep drawer, surface Settings/Progress from the avatar menu, label clearly |
| Lesson / assessment / assignment / certificate | No back control; chrome persists; actions off thumb zone; certificate page has 30 raw colour classes | 3.5, 4.1, 1.2 | High | Back, hide bottom nav in lesson, sticky action bar |
| AI Coach | `calc(100dvh - 57px)` height; chat input can sit under the bottom nav | 2.5, 3.3 | High | Token height, input above nav |
| Lesson rehearsal | `100vh` | 4.2 | Med | `dvh` token |
| All dashboard pages | Different centred widths → different left edges | 2.2 | Med | Shared content column, left-aligned |
| All pages | `text-[10px]/[11px]` sizes | 2.3 | Med | Map onto type scale (min 12px) |
| Cookie banner | Covers the bottom nav and CTA on first load | 3.3 | Med | Compact, above nav, safe-area aware |

## Out of scope / needs a real device

- Real Android (Chrome) and iPhone (Safari) installed-app testing, and before/after captures of the installed app,
  cannot be done from this environment. Safe-area, standalone and pull-to-refresh behaviour is implemented to
  spec and verified by emulation only.
- Lighthouse against production data (Core Web Vitals at p75) needs the deployed site; local lab numbers are
  reported instead.
