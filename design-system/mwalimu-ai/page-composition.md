# Phase 3 page composition

Status: implemented on `audit-redesign`. Phase 4 state, accessibility, and breakpoint verification remains pending.

The composition rule for this pass is one dominant job per page. Shared navigation and footer establish orientation; page-specific content determines the order and focal point.

## Public pages

| Route | One purpose | Focal point | Composition rationale |
| --- | --- | --- | --- |
| `/` | Explain the product and invite a first account action. | Hero headline, product preview, and `Create account` CTA. | Identity and audience appear in the hero; capability areas follow immediately; the preview gives product context before deeper detail; use cases, FAQ, and the final CTA support the same decision. Credibility comes from clear product behavior and previews rather than unverified statistics or testimonials. |
| `/features` | Help a visitor decide whether the product has the tools they need. | Feature grid. | The hero states the audience and offering, the grid is the evidence, and the final CTA is reserved for account creation. |
| `/pricing` | Let a visitor compare access options and start checkout. | Three plan cards. | The page opens with the decision, keeps plan comparison together, places checkout actions on the cards, and moves explanatory questions below the purchase choice. |
| `/about` | Explain why the product exists and what is inside it. | Mission/story block. | The product rationale comes before values and platform areas, so the page explains context before listing supporting details. |
| `/blog` | Help visitors browse teacher resources. | Featured article. | One featured article establishes the reading path, followed by the article grid and a single account CTA. The page no longer presents account creation as a newsletter subscription. |
| `/blog/[slug]` | Provide a focused reading experience for one article. | Article title, metadata, and body. | Supporting navigation and related actions stay secondary to readable article content. |
| `/docs` | Help users find product guidance. | Documentation category grid. | Categories are the first decision point; quick links are separated below so they do not compete with the primary self-serve path. |
| `/faq` | Resolve common product and account questions. | Categorized accordion. | Questions are grouped by user intent, with the contact action after the answers rather than competing with them. |
| `/contact` | Collect a general message. | Contact form. | The form is the primary action; the side panel explains what information belongs in a message and avoids unsupported promises. |
| `/support` | Route a user to the fastest available help path. | Quick links, then support form. | Documentation and FAQ can resolve simple issues before the form; the form remains visible for account and technical cases. |
| `/privacy` | Present privacy information for review. | Readable legal document. | Legal copy gets a quiet, readable layout with navigation kept secondary. `[NEEDS CONFIRMATION: legal review and approval]` |
| `/terms` | Present terms for review. | Readable legal document. | The page prioritizes scanning and direct access to legal sections. `[NEEDS CONFIRMATION: legal review and approval]` |

## Authentication and account entry

| Route | One purpose | Focal point | Composition rationale |
| --- | --- | --- | --- |
| `/auth/login` | Return an existing user to the workspace. | Sign-in form. | Product context is confined to the secondary desktop panel; the form remains the dominant action and recovery links sit beside the relevant field. |
| `/auth/sign-up` | Create a new account. | Account-creation form. | The form asks only for account credentials first; product context and provider options remain subordinate. |
| `/auth/forgot-password` | Start password recovery. | Email field and recovery CTA. | The page removes all unrelated choices so the recovery task is clear. |
| `/auth/reset-password` | Set a new password. | New-password form. | The password task is isolated with direct feedback and no competing marketing content. |
| `/auth/sign-up-success` | Explain the next sign-up step. | Confirmation message and next action. | The page confirms the state first, then provides the specific path back to sign-in or account use. |
| `/auth/callback` and `/auth/error` | Complete or explain provider authentication. | Status/error message. | Provider handoff states need a single next action: continue, retry, or return to sign-in. |

## Authenticated workspace

| Route group | One purpose | Focal point | Composition rationale |
| --- | --- | --- | --- |
| `/onboarding` | Complete the profile needed to enter the workspace. | Current profile step and save/continue action. | The flow keeps one step visible at a time and makes the account-entry path explicit. Existing migrated-profile resolution is preserved. |
| `/dashboard` | Give the user a reliable overview of their learning work. | Progress summary and next recommended action. | Summary comes first, followed by direct routes to learning, Coach, tools, community, and progress detail. |
| `/dashboard/learning`, `/dashboard/modules` | Choose and enter learning content. | Program/module list. | Filters or categories support selection; the content list remains the main visual weight. |
| `/dashboard/learning/*`, `/dashboard/modules/*` | Complete one learning activity. | Lesson or assessment content. | The current activity stays central; progress and navigation provide context without displacing the task. |
| `/dashboard/ai-coach` | Ask and review an AI teaching question. | Conversation thread and composer. | The conversation is primary, with connection/loading/error states attached to the composer and response area. |
| `/dashboard/tools/*` | Complete one teaching-support task. | Tool form and generated result. | Input and output share one task surface; saved history and navigation remain secondary. |
| `/dashboard/community` | Read and participate in teacher discussions. | Discussion feed and composer. | The feed is the focal point; filters and participation controls are placed around it. |
| `/dashboard/progress`, `/dashboard/achievements`, `/dashboard/journal` | Review personal learning evidence. | User-owned progress, badges, or entries. | Each route puts the relevant record type first and provides an empty state with a next action. |
| `/dashboard/resources` | Find practical resources. | Resource list. | Search/category controls support the list rather than becoming the page’s focal point. |
| `/dashboard/settings` | Manage account preferences. | Grouped settings form. | Settings are grouped by task and destructive/account actions are visually separated. |

## Implemented in Phase 3

- The homepage now uses the shared `MarketingHeader` so desktop and mobile navigation follow one composition and one account CTA.
- The homepage has a semantic `<main>` with a labelled hero; the hero, capability strip, product preview, feature detail, use cases, FAQ, and CTA follow a deliberate orientation-to-decision sequence.
- Pricing now opens with a quiet decision-oriented introduction, keeps plan cards in a non-overlapping section, and labels the plans and FAQ regions.
- Pricing’s decorative blob/mesh treatment was removed from the decision area so plan comparison carries the visual weight.
- Shared mobile navigation uses a 44px minimum menu target and exposes its expanded state through `aria-expanded`/`aria-controls`.

## Deferred to later checkpoints

Phase 4 will verify loading, empty, error, validation, auth, offline, keyboard, screen-reader, and responsive states at 320/375/768/1024/1440/1920px. Phase 5 will run the full verification suite and report actual results.
