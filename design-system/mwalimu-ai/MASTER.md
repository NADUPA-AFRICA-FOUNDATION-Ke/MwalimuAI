# Mwalimu AI design system

> Phase 1 proposal. This is the reviewable source of truth for the redesign.
> Page components must not be changed until this proposal is approved.

**Product:** Teacher professional development platform
**Audience:** Teachers using learning content, coaching, assessment, community, and classroom tools
**Direction:** Calm, content-first, classroom editorial; precise enough for a professional tool and warm enough for a learning product.
**Source material used:** Existing Mwalimu AI mark and the existing emerald/amber direction in `app/globals.css`.

## Design principles

1. Clarity before decoration. Content, progress, and the next action should be understandable at a glance.
2. Dignity for teachers. Avoid gamified pressure, invented social proof, and language that treats users as conversion metrics.
3. Locality through useful context. Use verified Kenyan curriculum context in content; do not use decorative stereotypes.
4. One primary action per screen. Secondary actions remain visible but quieter.
5. Accessible by default. Every state must work with keyboard, screen reader, zoom, reduced motion, and touch.

## Color tokens

The emerald and amber hues are derived from the existing mark, but the accessible UI colors are deliberately darker or lighter than the logo gradients. Logo colors are not used as small text.

| Token | Light value | Dark value | Use |
|---|---|---|---|
| `--color-canvas` | `#F7FAF8` | `#0E201B` | Page background |
| `--color-surface` | `#FFFFFF` | `#142A24` | Cards, forms, panels |
| `--color-surface-subtle` | `#EEF5F1` | `#1C372F` | Secondary regions, selected rows |
| `--color-ink` | `#12312B` | `#F3FAF7` | Primary text and headings |
| `--color-ink-muted` | `#48615A` | `#C0D1CA` | Supporting text |
| `--color-brand` | `#057A5B` | `#49D7B1` | Primary action and links |
| `--color-on-brand` | `#FFFFFF` | `#0E201B` | Text/icon on brand controls |
| `--color-brand-hover` | `#045E48` | `#79E5C8` | Hover/active brand state |
| `--color-brand-soft` | `#DDF5EB` | `#1A4639` | Soft brand background |
| `--color-accent-text` | `#9B5C00` | `#F8BD57` | Accent text and progress emphasis |
| `--color-accent-soft` | `#FFF1D4` | `#4A3212` | Accent background |
| `--color-success` | `#0B6B43` | `#62D39F` | Success state with text/icon |
| `--color-danger` | `#B42318` | `#FF8A80` | Error/destructive state with text/icon |
| `--color-border` | `#C6D6CE` | `#45675B` | Default dividers and field borders |
| `--color-border-strong` | `#728B82` | `#75958A` | Focus-adjacent/UI boundaries |
| `--color-focus` | `#0B6B5B` | `#79E5C8` | Focus ring |

### Contrast verification

Ratios below were calculated using the WCAG relative-luminance formula. They are the minimum approved pairs for Phase 1; the implemented pages must be rescanned with axe or Lighthouse in Phase 4 and 5.

| Pair | Ratio | Requirement |
|---|---:|---|
| Ink on canvas (`#12312B` / `#F7FAF8`) | 13.32:1 | AAA body text |
| Muted ink on canvas (`#48615A` / `#F7FAF8`) | 6.38:1 | AA body text |
| White on brand (`#FFFFFF` / `#057A5B`) | 5.33:1 | AA button text |
| White on brand hover (`#FFFFFF` / `#045E48`) | 7.78:1 | AA button text |
| Accent text on surface (`#9B5C00` / `#FFFFFF`) | 5.35:1 | AA text |
| Success on surface (`#0B6B43` / `#FFFFFF`) | 6.57:1 | AA text |
| Danger on surface (`#B42318` / `#FFFFFF`) | 6.57:1 | AA text |
| Strong border on canvas (`#728B82` / `#F7FAF8`) | 3.49:1 | UI boundary minimum |
| Light text on dark canvas (`#F3FAF7` / `#0E201B`) | 15.98:1 | AAA body text |
| Dark muted text on dark canvas (`#C0D1CA` / `#0E201B`) | 10.65:1 | AAA supporting text |
| Dark canvas on dark brand (`#0E201B` / `#49D7B1`) | 9.38:1 | AA/AAA button text |
| Dark canvas on dark accent (`#0E201B` / `#F8BD57`) | 10.00:1 | AA/AAA accent control |
| Dark canvas on dark danger (`#0E201B` / `#FF8A80`) | 7.41:1 | AA destructive control |
| Dark border on dark canvas (`#75958A` / `#0E201B`) | 5.17:1 | AA UI boundary |

Do not use opacity-based gray text for essential content unless the resulting rendered pair is measured. Do not use color alone to communicate completion, error, level, or selection.

## Typography

- **Display:** Lexend, weights 600–700. Its open, sturdy letterforms make headings easy to scan in a learning product.
- **Body/UI:** Source Sans 3, weights 400–600. It gives long instructional text a more readable editorial texture than a default UI sans.
- **Fallbacks:** `ui-sans-serif, system-ui, sans-serif` so the interface remains usable if font delivery is unavailable.
- **Base size:** 16px; body line-height 1.5–1.7.
- **Measure:** 35–60 characters on small screens and 60–75 characters on large screens.

| Role | Size / line-height | Weight | Use |
|---|---|---:|---|
| Display | 48 / 1.08 | 700 | Homepage hero only |
| H1 | 36 / 1.15 | 700 | Page title |
| H2 | 30 / 1.2 | 700 | Major section |
| H3 | 24 / 1.25 | 650 | Feature/group heading |
| H4 | 20 / 1.3 | 650 | Card or subsection heading |
| Body large | 18 / 1.55 | 400 | Introductory copy |
| Body | 16 / 1.6 | 400 | Default reading text |
| UI label | 14 / 1.35 | 600 | Navigation and controls |
| Caption | 12 / 1.4 | 600 | Metadata only, never essential instructions |

Font loading must use `font-display: swap` or `optional`, reserve layout space, and retain the fallback stack. No external font import is applied until the deployment/network strategy is confirmed.

## Spacing and layout

Use a 4px base with 8px rhythm for most layout decisions:

`4, 8, 12, 16, 24, 32, 40, 48, 64, 80, 96px`

- Form/control internal padding: 12–16px.
- Related elements: 8–12px.
- Separate content groups: 24–32px.
- Major sections: 48–80px.
- Mobile page gutter: 16px; tablet: 24px; desktop: 32–40px.
- Content container: max-width 1200px; long-form reading: max-width 720px.
- Fixed headers/bottom navigation must reserve their full height plus safe-area padding.

## Shape and elevation

Rounded corners communicate grouping, not decoration:

- `--radius-control: 8px` — buttons, inputs, compact controls.
- `--radius-card: 12px` — ordinary cards.
- `--radius-panel: 16px` — larger panels and sheets.
- `--radius-pill: 999px` — status chips only.

Use a restrained elevation scale:

- `--shadow-none: none`
- `--shadow-sm: 0 1px 2px rgb(18 49 43 / 0.06)`
- `--shadow-md: 0 8px 24px rgb(18 49 43 / 0.10)`
- `--shadow-lg: 0 16px 40px rgb(18 49 43 / 0.14)`

Do not lift every card on hover. Prefer a border/surface change; any transform must not move surrounding layout and must be 150–250ms.

## Buttons and controls

All interactive controls have a minimum 44px hit area, `cursor-pointer`, visible focus, and a disabled/loading state.

1. **Primary:** brand background + on-brand text. One per screen.
2. **Secondary:** surface background + strong border + ink text.
3. **Tertiary:** text/link action with an underline or clear hover state.
4. **Destructive:** danger text/background with confirmation for irreversible actions.

State rules:

- Hover: deepen surface or border; no large movement.
- Pressed: use a subtle color/elevation change.
- Focus-visible: 2px solid focus ring with 2px offset; never remove the ring.
- Disabled: semantic `disabled`, reduced emphasis, no pointer action, explanatory helper text where useful.
- Loading: preserve button width, show a spinner plus status text, prevent duplicate submissions.

## Forms and feedback

- Every input has a visible `<label>`, semantic `name`, appropriate `autocomplete`, and a 44px minimum height.
- Required fields are marked in the label; instructions are persistent, not placeholder-only.
- Validate on blur and submit, not on every keystroke.
- Put field errors beside the field with `aria-invalid` and `aria-describedby`.
- For multiple errors, provide an error summary that links to fields and focus the first invalid field.
- Use `role="alert"` for blocking errors and `aria-live="polite"` for non-blocking status updates.
- Success feedback states what happened and what to do next.
- Destructive actions require a confirmation step and an undo path where practical.

## Images and icons

- Use the existing Mwalimu mark and approved assets without recoloring or distorting them.
- Use Lucide for interface icons and official provider logos for authentication providers.
- No emoji or decorative Unicode symbols as interface icons.
- Standard icon sizes: 16px inline, 20px control, 24px navigation, 32px feature illustration.
- Keep icon stroke weight consistent at approximately 1.75–2px.
- Meaningful images get concise descriptive alt text; decorative images use `alt=""`.
- All images declare dimensions/aspect-ratio, use responsive loading, and use optimized local assets where possible.
- Do not use stock-looking avatars or testimonials until identities and image rights are confirmed.

## Navigation

- Marketing: one consistent header, clear active/hover/focus states, keyboard-operable mobile menu, and a single primary CTA.
- Dashboard: sidebar on desktop; mobile navigation may contain no more than five top-level destinations with labels and icons.
- Deep pages retain a predictable back path and breadcrumbs where hierarchy exceeds three levels.
- Keep account deletion and logout separate from normal navigation.
- On route change, move focus to the main content heading or announce the new page title.

## Required component states

| State | Required behavior |
|---|---|
| Loading | Skeleton mirrors final layout for operations over 300ms; never show a blank panel |
| Empty | Explain why it is empty and offer the next useful action |
| Error | State cause where known, provide retry/edit/help action, and announce it |
| Validation | Identify the field, explain the fix, focus the first invalid field |
| Success | Confirm the completed action and the next available step |
| Disabled | Use semantic disabled state and explain unavailable actions when unclear |
| Auth | Preserve return path; distinguish sign-in, sign-up, recovery, and incomplete profile |
| Offline | Say what is unavailable, preserve local work, and offer retry/sync guidance |
| No permission | Explain access requirements without exposing private data |

## Motion

- Micro-interactions: 150–250ms, ease-out for entrance and ease-in for exit.
- Complex transitions: no more than 400ms.
- Animate only meaningful state changes; remove decorative floating blobs, shimmer, and large entrance choreography.
- Implement a global `prefers-reduced-motion: reduce` rule that disables non-essential animation and smooth scrolling.
- Never make content or primary actions wait for animation.

## Content and credibility guardrails

The redesign must not present any of the following as fact without source approval:

- `[NEEDS CONFIRMATION: organization registration, address, contact details, partners, team, testimonials, user counts, ratings, school counts, county counts, module counts, curriculum endorsements, pricing, payment methods, response-time promises, and legal text]`

Unverified claims are removed, replaced with product-specific descriptions, or displayed with an internal confirmation marker until the owner supplies evidence. The interface should not use invented social proof to create urgency.

## Phase 1 acceptance checklist

- [x] Product-specific direction selected and documented.
- [x] Semantic color tokens defined for light and dark themes.
- [x] Primary text, muted text, controls, status colors, and focus pairs measured.
- [x] Display/body type choices and fallback strategy documented.
- [x] Type, spacing, radius, shadow, button, form, icon, image, navigation, and state rules documented.
- [x] Anti-patterns from the audit explicitly excluded.
- [ ] Owner sign-off received.
- [ ] Tokens applied to shared CSS/components.
- [ ] Page-specific overrides created after sign-off.
- [ ] Screenshots, keyboard checks, axe, and Lighthouse run during Phases 4–5.
