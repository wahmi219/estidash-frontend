# estidash — Frontend Context

Next.js 16 frontend for Estimation Hub. See root `CLAUDE.md` for full project overview.

## Git & Commit Policy

**Always commit after writing code or docs.** This is an independent git repo (separate from
the root `Estimation-Hub` repo and from `estihub`). Make a commit at the end of each unit of
work rather than leaving changes uncommitted. Commit directly on `main` (this repo's
established workflow). End commit messages with the `Co-Authored-By` trailer.

## Tech Stack

- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript 5
- **State**: Redux Toolkit 2 + React-Redux 9
- **Styling**: TailwindCSS 4 + Tailwind Merge
- **Charts**: Recharts 3 + Leaflet (maps)
- **Animation**: Framer Motion 12
- **HTTP**: Axios 1
- **Markdown**: react-markdown + remark-gfm

## App Router Structure

```
src/app/
  layout.tsx            # Root layout with Redux Provider
  page.tsx              # Home / dashboard
  permits/              # Permit search and table
  intelligence/         # AI analytics pages
    outreach/           # Contractor outreach
    cbsa/               # CBSA metro analysis
    trades/             # Trade opportunity analysis
  settings/             # Agent config + prompt editor
```

## Redux State Slices (`src/store/slices/`)

| Slice | Purpose |
|-------|---------|
| `permitsSlice.ts` | Permit search, filter, pagination |
| `chatSlice.ts` | AI chat/NL query state |
| `dashboardSlice.ts` | Dashboard metrics |
| `uploadSlice.ts` | Excel file upload state |
| `examplesSlice.ts` | Example queries |

Always dispatch from components using `useAppDispatch` and select with `useAppSelector`.

## API Client Pattern (`src/services/`)

Axios instances with base URL from env. Example:
```ts
import api from '@/services/api';
const data = await api.get('/api/v1/permits', { params: { city: 'Chicago' } });
```

## MarkdownRenderer — CRITICAL

**Always use `MarkdownRenderer` for AI-generated text.** Never use raw `whitespace-pre-wrap` divs.

```tsx
import MarkdownRenderer from '@/components/common/MarkdownRenderer';

<MarkdownRenderer content={response.answer} />
```

Location: `src/components/common/MarkdownRenderer.tsx`
CSS: scoped under `.chat-markdown` in `globals.css`

Applies to: chat messages, all dashboard intelligence cards, outreach/cbsa/trades pages.

## Key Components

```
src/components/
  common/
    MarkdownRenderer.tsx    # Shared AI text renderer
  chat/                     # NL query chat interface
  dashboard/                # MarketPulseCard, CBSAListCard, HighValueCard, etc.
  permits/                  # PermitTable, filters, ContractorOutreachModal
  layout/                   # Header, sidebar, navigation
```

## Contractor Outreach Flow

1. User clicks "Message" on a permit row → `ContactOutreachModal` opens, lists permit contacts
2. "Generate emails" calls `POST /api/v1/email-agent/generate-batch` — one shared `gather_context`
   + pattern analysis for the permit, then a role-tailored email per selected contact
3. User can Edit, Regenerate (with instructions), or Send via `POST /api/v1/email-agent/send-batch`,
   which delivers through the sender's **assigned sending inboxes** (sticky-per-recipient, then
   health-aware rotation) — never local/global SMTP

## Agent Settings UI

- **Settings > Agent Settings**: Change LLM model + temperature per agent
- **Prompt Editor**: Edit system prompts per agent (no redeployment needed)

## Dev Commands

```bash
npm run dev      # Start on http://localhost:3000
npm run build    # Production build
npm run lint     # ESLint check
```

## Environment

```
NEXT_PUBLIC_API_URL=http://localhost:8000   # Backend URL
```

See `env.example` for full list.

## Design System

**Active skill**: `.agent/skills/estimation-hub-design/SKILL.md` — use for ALL frontend work in estidash.
Secondary references: `.agent/skills/frontend-design/SKILL.md` (creative direction) and `.agent/skills/ui-ux-pro-max/SKILL.md` (systematic rules + accessibility).

### Always-On Rules (apply without invoking the skill)

**Adapter palette** — enforced on every component that shows city/source data:
| Adapter | Color    | Badge classes                          | Chart hex  |
|---------|----------|----------------------------------------|------------|
| arcgis  | Emerald  | `bg-emerald-500/15 text-emerald-400`   | `#10b981`  |
| socrata | Blue     | `bg-blue-500/15 text-blue-400`         | `#3b82f6`  |
| ckan    | Amber    | `bg-amber-500/15 text-amber-400`       | `#f59e0b`  |
| csv     | Purple   | `bg-purple-500/15 text-purple-400`     | `#a855f7`  |
| ods     | Pink     | `bg-pink-500/15 text-pink-400`         | `#ec4899`  |

**Typography**:
- Data values (numbers, counts, timestamps): `font-mono tabular-nums text-white` — always monospaced
- KPI values: `text-2xl font-mono font-bold text-white` minimum size
- Labels/metadata: `text-[10px] uppercase tracking-widest text-gray-500`
- Fonts loaded in `layout.tsx`: Geist (`--font-geist-sans`) + Geist Mono (`--font-geist-mono`)

**Charts**: `AreaChart` for time-series (not BarChart). Gradient fill via raw SVG `<defs><linearGradient>` inside chart — do NOT import from recharts. Use `useId()` for unique gradient IDs. Minimum chart height `h-52`.

**Motion**: Framer Motion 12 for all animations. Always check `useReducedMotion()` — if true, set duration 0. Stagger list reveals with `staggerChildren: 0.05`. Spring config for accordions: `{ type: 'spring', stiffness: 400, damping: 35 }`.

**Accessibility**: 4.5:1 contrast (WCAG AA). `focus-visible:ring-2` on all interactive elements. No emojis as icons — lucide-react only. Touch targets ≥ 44px.

**Dark-first**: All components target dark mode. Card base: `bg-gray-950/80 backdrop-blur-sm border border-white/[0.08] rounded-2xl`.
