# estidash — Frontend Context

Next.js 16 frontend for Estimation Hub. See root `CLAUDE.md` for full project overview.

## Git & Commit Policy

Active branch: `mvp-recovery`. Commit at the end of each unit of work rather than leaving
changes uncommitted. **Do not merge or commit to `main`** — `main` stays untouched; all
work happens on `mvp-recovery` and is pushed to `origin/mvp-recovery`. End commit messages
with the `Co-Authored-By` trailer.

## Tech Stack

- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript 5
- **State**: Redux Toolkit 2 + React-Redux 9
- **Styling**: TailwindCSS 4 + Tailwind Merge
- **Charts**: Recharts 3 + Leaflet (maps)
- **Animation**: Framer Motion 12
- **HTTP**: Axios 1
- **Markdown**: react-markdown + remark-gfm

## App Router Structure (current — see `src/components/layout/Sidebar.tsx` for the authoritative navigation/IA)

```
src/app/
  layout.tsx                        # Root layout with Redux Provider
  page.tsx                          # Landing/redirect
  login/                            # Auth
  dashboard/
    page.tsx                        # Dashboard
    permits/                        # Permit Records (list + [id] detail) — CORE
    contractors/                    # Contractor Master (list + [id] detail) — CORE
    datasources/                    # Data Sources — DATA
    counties/                       # County Coverage — DATA
    upload/                         # Import Data — DATA
    settings/                       # Settings, Users — ADMIN
    (contact-info-needed, ready-for-lead-bank, lead-bank)  # CORE, added Phase 9 —
       real Phase 6/7/8 backend, frontend pages shipped incrementally; each
       Sidebar entry stays `hidden: true` only until its page is functional,
       then flips to visible in the same commit — never leave a shipped page
       permanently hidden
    (outreach, inbox, warmup, cbsa, analytics, trades, economic)  # legacy/
       exploratory, already hidden from nav — do not surface them; see the
       Phase 9 chunk reports in `docs/` for the KEEP/ADAPT/HIDE/REMOVE LATER
       classification of each before touching any of them
```

## Redux State Slices (`src/store/slices/`)

| Slice | Purpose |
|-------|---------|
| `permitsSlice.ts` | Permit search, filter, pagination |
| `contractorsSlice.ts` | Contractor Master search, filter, pagination |
| `chatSlice.ts` | AI chat/NL query state |
| `dashboardSlice.ts` | Dashboard metrics |
| `uploadSlice.ts` | Excel file upload state |
| `examplesSlice.ts` | Example queries |
| `outreachSlice.ts` | Legacy automated-outreach state — do not build new UI against this; see "Outreach Architecture" below |

Always dispatch from components using `useAppDispatch` and select with `useAppSelector`.

## API Client Pattern (`src/services/api.ts`)

One centralized, typed Axios client (`apiService`) — do not hardcode a second base URL or a
raw `axios.get(...)` call in a component. Add new backend areas as typed methods here (and
their request/response shapes in `src/types/index.ts`), following the existing method
naming/shape conventions, rather than introducing a second API layer.

```ts
import { apiService } from '@/services/api';
const data = await apiService.searchPermits({ city: 'Chicago' });
```

Before wiring a new page to the backend, read `docs/phase9_frontend_api_contract.md`
(updated each Phase 9 chunk) for the actual, currently-exposed contract — never assume a
field/filter exists because a mockup or a task description names it.

## MarkdownRenderer — CRITICAL

**Always use `MarkdownRenderer` for AI-generated text.** Never use raw `whitespace-pre-wrap` divs.

```tsx
import MarkdownRenderer from '@/components/common/MarkdownRenderer';

<MarkdownRenderer content={response.answer} />
```

Location: `src/components/common/MarkdownRenderer.tsx`. CSS scoped under `.chat-markdown` in `globals.css`.

## Key Components

```
src/components/
  common/       PageHeader, SectionHeading, MarkdownRenderer
  layout/       Sidebar, DashboardLayout/Shell, ThemeToggle
  permits/      PermitTable, PermitFilters, PermitRow, pagination
  contractors/  ContractorFiltersPanel, ContractorQualityBadges
  chat/         NL query chat interface
  dashboard/    MarketPulseCard, CBSAListCard, HighValueCard, etc. (legacy — see below)
```

Reuse `PageHeader`/`SectionHeading`/existing table, badge, filter, empty-state, and
loading-state patterns from Permit Records / Contractors rather than inventing a one-off
style per new page — every operational page (Contact Info Needed, Ready for Lead Bank,
Lead Bank, etc.) should look and behave like a sibling of those two, not a new design.

## OUTREACH ARCHITECTURE — READ BEFORE TOUCHING ANYTHING OUTREACH-RELATED

**EHUB never sends email.** Employees send outreach manually from their own Gmail,
Outlook, or other email account, entirely outside this application. EHUB's job is limited
to: eligibility (who may be contacted right now, and why/why not), ownership (which
employee owns a Contractor relationship), Mark Sent (recording that an employee already
sent an email manually), follow-up due dates, and outcomes (Replied, Interested, Active
Opportunity, Not Interested, DNC, Unsubscribe, No Response, Bad Email, Manual Stop).

**Never build or expose:**
- a "Send Email" or "Auto Send" button of any kind
- Gmail/Outlook/SMTP send integration
- automated campaign or sequence-send UI
- provider delivery controls (inbox warmup, placement testing, deliverability dashboards) as active product surfaces

**Legacy automated-send code exists in this repo** (`/dashboard/outreach`, `/dashboard/inbox`,
`/dashboard/warmup`, `ContactOutreachModal.tsx`, `outreachSlice.ts`'s send-related actions,
the old `email-agent/generate-batch` / `email-agent/send-batch` flow this file used to
describe as current). It is being **kept in the codebase for possible future development**,
already hidden from the sidebar, and must **stay hidden** — do not link to it, do not adapt
it into a new page, do not treat anything under it as a pattern to copy. If a task asks you
to build outreach-adjacent UI, it means the manual workflow above (Mark Sent, outcomes,
Ready for Outreach) via `/api/v1/manual-outreach` — never `/api/v1/outreach/*`, which is the
legacy automated system's namespace.

## Contractor Master model

One Contractor ID = one real company. A Contractor may have: multiple emails (one Primary,
others alternates — `ContractorRead.emails[]`, backend commit `7a743d2`), multiple confirmed
aliases (`ContractorRead.aliases[]`), and — architecture decided, **not yet built** as a
child table — will eventually have multiple licenses (currently still a single
`license_number` field on `Contractor`; design any Licenses UI as a list from the start so
no rework is needed once the child table ships — do not assume exactly one license). One
Contractor may have many opportunities/permits and, if promoted, exactly one Lead Bank V2
relationship (`ContractorRead.lead_bank`, null until one exists).

## Filters — approved MVP set

**Use:** State, Data Source (human-readable jurisdiction name shown; stable `agency_id`
filtered on internally — never display the id), Trade/Scope, Project Type, Qualification,
Status, Date.

**Do not add or re-add:** County, Contractor Type. Both were removed from the MVP filter
design across Permit Records and Contractors (Phase 9 Chunk 1/2) — not a missing feature,
a settled product decision. Trade/Scope is a permit/opportunity-level concept, not a
Contractor-level one — never infer or store a "Contractor Type" from a single permit.

## Dev Commands

```bash
npm run dev            # Start on http://localhost:3000
npm run build           # Production build (also typechecks)
npm run lint             # ESLint check
npx tsc --noEmit         # Standalone typecheck (no dedicated package.json script exists)
```

## Environment

```
NEXT_PUBLIC_API_URL=http://localhost:8000   # Backend URL
```

See `env.example` for full list.

## Design System

**Professional, light B2B construction/CRM UI.** Confirmed as the actual current design of
every in-scope page (Sidebar, Permit Records, Contractors) as of Phase 9 — this is not
aspirational, it is what the code already does; keep matching it.

**Palette:**
| Token | Hex | Use |
|---|---|---|
| Primary | `#00458B` | primary actions, active nav |
| Primary hover | `#045CB4` | hover state |
| Navy | `#0E2B5C` | headings, primary text |
| Muted text | `#5B6B7D` | secondary/meta text |
| Border | `#DFE6EE` | borders, dividers |
| Page background | `#F7F9FB` | page background |
| Cards | `#FFFFFF` | card/panel surfaces |

**Avoid:** purple, pink, neon, dark dashboard themes, glow effects, heavy gradients. (Some
already-hidden legacy pages — outreach/inbox/warmup/economic — and unused tokens in
`globals.css` like `--brand-purple`/`.glow-purple` still use the old dark/neon direction;
they are dead weight, not a pattern to follow. Do not extend that palette to new work, and
do not "fix" those legacy pages' styling as a side effect of unrelated work — they're
tracked separately for eventual removal.)

**Typography**: standard system/Geist fonts, dark text on light backgrounds (`#0E2B5C`
headings, `#5B6B7D` secondary) — not the old white-on-dark/monospace-everything convention.

**Accessibility**: 4.5:1 contrast (WCAG AA). `focus-visible:ring-2` on all interactive
elements. No emojis as icons — lucide-react only. Touch targets ≥ 44px.

**Motion**: Framer Motion 12, respecting `useReducedMotion()`.

**Responsive**: laptop/desktop-first — this is an internal business portal, not a
mobile-first consumer product.
