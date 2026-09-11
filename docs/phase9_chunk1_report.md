# Phase 9 Chunk 1 — Frontend Contract Freeze + Application Foundation

Backend: `~/Downloads/estihub-backend` @ `mvp-recovery` (commit `0f48f13`).
Frontend: `~/Downloads/estidash-frontend` @ `mvp-recovery`. Production
untouched, `main` untouched (both repos), outreach OFF, zero emails sent,
no client data imported, no deployment.

## 1. Frontend audit findings

**Correction to this repo's own `CLAUDE.md`:** that file describes a
dark-theme, neon-accented design system (`.glow-purple`, purple/pink/cyan
gradients) and the OLD automated-send flow
(`POST /api/v1/email-agent/send-batch` "delivers through the sender's
assigned sending inboxes"). Both are **stale** — actual code for every
currently-visible page already uses the light B2B palette this session's
instructions specify (`#00458B`/`#0E2B5C`/`#5B6B7D`/`#DFE6EE`/white cards
— confirmed directly in `Sidebar.tsx` before touching anything), and the
send-batch flow's UI (`ContactOutreachModal.tsx`) is dead code, not
rendered anywhere (Section 11). This report follows the session's
instructions and the actual code, not the stale `CLAUDE.md`; that file was
not rewritten this chunk (out of scope, and a separate decision).

**Good news the audit surfaced:** the frontend is considerably more
mature than the task brief's framing suggested. Permit Records
(492+450+903+other lines across focused components), the shared API
client (`services/api.ts`, ~1900 lines, fully typed), Redux slices, and
the navigation's existing `hidden: true` pattern (with the comment "MVP:
hidden from nav, route stays functional") show a prior, deliberate
simplification pass already happened. Chunk 1's job was less "build from
scratch" and more "verify against the real backend contract, lock the
target IA, and close two concrete gaps" (Terminal status, Data Source).

## 2. API contract document location

`docs/phase9_frontend_api_contract.md` (this repo).

## 3. Frontend routes — classified

| Route | Classification | Notes |
|---|---|---|
| `/dashboard` | **ADAPT** | Not touched this chunk (explicitly deferred) |
| `/dashboard/permits` + `[id]` | **ADAPT** | Real backend wiring confirmed; two small drift fixes applied (Section 9) |
| `/dashboard/contractors` (+registry) | **ADAPT (stretch, not reached)** | Real Contractor Master API exists; Licenses-as-list redesign needed per the requirement update (Section 6 of the API contract doc) — deferred to a later chunk |
| `/dashboard/datasources` | **KEEP** | Predates this chunk; its list endpoint reused for the new Permit filter |
| `/dashboard/counties` | **KEEP** | Not touched |
| `/dashboard/upload` | **KEEP** | Not touched ("Import Data") |
| `/dashboard/settings/users` | **KEEP** | Not touched |
| `/dashboard/settings/permit-scoring` | **KEEP** | Not touched |
| `/dashboard/settings/devices` | **KEEP** | Not touched |
| `/dashboard/settings/agents`, `/dashboard/chat` | **HIDE (already hidden)** | `minRole: super_admin`/`admin`, `hidden: true` already in `Sidebar.tsx` |
| `/dashboard/inbox` | **HIDE (already hidden)** | Predates the manual-outreach architecture |
| `/dashboard/outreach` (+ `/dashboard/warmup` child) | **HIDE (already hidden) — legacy automated-send UI, kept per requirement update** | See Section 11 |
| `/dashboard/cbsa`, `/dashboard/analytics`, `/dashboard/trades`, `/dashboard/economic` | **HIDE (already hidden)** | Exploratory analytics, predate the current IA |
| `/dashboard/settings/lead-banks` | **HIDE (already hidden)** | Legacy per-agent-quota Lead Bank — genuinely distinct concept from Lead Bank V2 (confirmed backend-side in Phase 8.5); not the same thing as the new `/dashboard/lead-bank` target route |
| `/dashboard/help` | **HIDE (already hidden)** | |
| `/permits` (top-level, outside `/dashboard`) | **REMOVE LATER (candidate)** | A second, older permits page predating the `/dashboard/permits` one per this repo's stale `CLAUDE.md` structure — not deleted this chunk (no assessment of who links to it yet), flagged for a cleanup pass |
| `/dashboard/contact-info-needed` (new) | **NOT BUILT — nav entry added, hidden** | Phase 6 backend exists (Section 4 of API contract) |
| `/dashboard/ready-for-lead-bank` (new) | **NOT BUILT — nav entry added, hidden** | Phase 6/7 backend exists (Section 5) |
| `/dashboard/lead-bank` (new) | **NOT BUILT — nav entry added, hidden** | Phase 7/8 backend exists (Sections 7-8) |

## 4. Files changed

**Frontend:**
- `src/types/index.ts` — `PermitRecord.is_terminal/.terminal_reason/.agency_id/.agency_name`; `PermitFilters.agencyId` (+ `county` marked deprecated-not-removed); `PermitSearchParams.agency_id`; new `PermitDataSourceOption`; `PermitsState.availableDataSources`.
- `src/components/layout/Sidebar.tsx` — split `mainNavItems` into `coreNavItems`/`dataNavItems`/`legacyNavItems`; added Core/Data section headers; added hidden stub entries for Contact Info Needed, Ready for Lead Bank, Lead Bank.
- `src/components/permits/PermitRow.tsx` — added a Terminal badge to `QualificationCell`, distinct from Excluded.
- `src/components/permits/PermitFilters.tsx` — removed the County select/chip/cascade, added a Data Source select/chip/cascade in its place.
- `src/store/slices/permitsSlice.ts` — added `fetchPermitDataSources` thunk, `availableDataSources` state/selector, `agency_id` in the query-param builder.
- `src/app/dashboard/permits/page.tsx` — wired the new data-source fetch/selector/prop, URL param `agency_id` (replacing `county` in the URL-sync direction; `county` still read on mount for old bookmarks).
- `docs/phase9_frontend_api_contract.md` — new.
- `docs/phase9_chunk1_report.md` — new (this file).

**Backend** (see Section 14 for full detail): `app/schemas/permits.py`,
`app/routers/permits.py`, `tests/test_permit_read_terminal_fields.py`.

## 5. Commits

Frontend (this repo, `mvp-recovery`):
1. Navigation lock + PermitRow Terminal badge + type additions.
2. Data Source filter (replaces County) — types, slice, filter component, page wiring.
3. This report + API contract doc.

(Exact hashes in `git log` after this report is committed — commits are
made immediately following this document per Step 12's discipline.)

Backend (separate repo, already pushed): `35b866d` (is_terminal),
`0f48f13` (Data Source field + filter).

## 6. Push status

Pushed to `origin/mvp-recovery` (frontend) and `origin/mvp-recovery`
(backend, already done). `main` untouched in both repos.

## 7. Navigation implemented

Target IA locked in `Sidebar.tsx`:

- **Core**: Dashboard, Permit Records, *Contact Info Needed (hidden stub)*, *Ready for Lead Bank (hidden stub)*, Contractors (+ Official Registry), *Lead Bank (hidden stub)*.
- **Data**: Data Sources, County Coverage, Import Data.
- **Admin** (unchanged, already existed): User Management, Settings.
- Legacy/exploratory items kept hidden, organizationally separated into their own array with a comment pointing at this report's classification table.

Contractor Verification is intentionally **not** in the sidebar (matches
Step 3 — exception workflow, link from Dashboard/relevant views when that
integration point is built).

## 8. Shared API/type changes

See Section 4. No wholesale rewrite of `services/api.ts` (1896 lines,
already a reasonably organized centralized client) — extended the
existing pattern (typed interfaces in `types/index.ts`, thunks in the
relevant slice) rather than introducing a second, competing API layer.
`apiService.getDataSources()` already existed and was reused as-is for
the new filter — no new endpoint client method needed.

## 9. Permit Records status

**ADAPT, not REBUILD** — already real, already wired to the live backend
before this chunk. Two concrete gaps found and closed:

1. **Terminal status was entirely invisible** — `PermitRead` never exposed `is_terminal`/`terminal_reason` even though the backend has computed both since Phase 4A. Backend fix (commit `35b866d`) + a new "Terminal" badge in `PermitRow.tsx`, visually distinct from "Invalid/Excluded" (they're different axes — a finaled/closed permit may never have been excluded at all).
2. **No Data Source filter existed** — added end-to-end (backend field/filter, frontend type/slice/UI), replacing the removed County filter in the same UI slot.

Not done this chunk (explicitly out of scope per Step 8's "displays
backend decisions" instruction, and time-boxed): a Terminal-status display
on the **detail** page (`permits/[id]/page.tsx`, 979 lines, not opened
this chunk) — the list-row badge was the higher-leverage fix given the
list is where qualification triage happens; flagged as a small follow-up.

## 10. Contractors status

**Not reached this chunk** (stretch goal, explicitly optional — "if time
permits after Permit Records"). One important design note captured for
whenever it is built: per the mid-chunk requirement update, Contractors
must be designed around a **Licenses list**, not a single license field —
see `docs/phase9_frontend_api_contract.md` Section 6.

## 11. Legacy automated-outreach UI findings

Per the mid-chunk requirement update: **keep the legacy code, hide it from
the frontend, do not expose send/auto-send controls.** Findings:

- `/dashboard/outreach` (2,629-line page) and its `/dashboard/warmup` child — already `hidden: true` in `Sidebar.tsx` **before this chunk started** (pre-existing MVP simplification). No sidebar link exists; routes remain technically reachable by direct URL, matching "do not blindly delete."
- `/dashboard/inbox` — same: already hidden.
- `ContactOutreachModal.tsx` (701 lines — the "Generate emails"/"Send via `email-agent/send-batch`" flow `CLAUDE.md` describes) — confirmed **not imported or rendered anywhere** in the app (only re-exported from a barrel file). Already fully inert from a user's perspective; nothing to hide because nothing currently surfaces it. Left in place, not deleted, per the explicit "keep... do not delete" instruction.
- `globals.css` still defines legacy dark/neon design tokens (`--brand-purple`, `.glow-purple`, cyan/purple gradients) used only by the already-hidden pages above (`outreach`, `inbox`, `warmup`, `economic`) — confirmed via grep, not removed this chunk (touches only already-hidden pages, no user-visible impact, and CSS cleanup wasn't in this chunk's scope).
- No new legacy-outreach exposure was introduced by this chunk's work.

**Backend-side** (informational, not a frontend deliverable): Phase 8.5
confirmed the legacy send workers (`campaign_service.run_followup_worker`,
`gmail_placement_service.send_placement_test_emails`) remain registered in
the backend's scheduler but are kill-switch-gated at every checked call
site (`OUTREACH_ENABLED=false`). Kept, not disabled, per this session's
explicit "keep for possible future development" instruction — this
supersedes Phase 8.5's earlier recommendation to consider deprecating
them.

## 12. Unavailable backend/filter fields

- **County** (contractor-level) and **Contractor Type** — no backing data; removed from the MVP filter design by product decision (not a technical limitation for permit-level County, which does exist — see the API contract doc's "Filter/field decisions" table for the precise distinction).
- **Trade/Scope at the Contractor level** — does not exist; only permit/opportunity-level `work_scope`/`permit_type` exist. Do not build a Contractor-level Trade filter.
- **Multi-license Contractor model** — architecture decided (child table), not built. Single `license_number` field remains authoritative until that migration ships.
- **Permit exclusion/terminal history** (not just current state) — no exposed read endpoint.

## 13. Typecheck/lint/build results

Inspected actual configured commands first (`package.json` has `dev`,
`build`, `start`, `lint` — no dedicated `typecheck` script, so `npx tsc
--noEmit` was used directly against the existing `tsconfig.json`, which is
a real, always-available check, not an invented command):

- **`npx tsc --noEmit`**: exit 0, zero errors.
- **`npm run lint`**: 115 pre-existing problems (1 error, 114 warnings) in files this chunk never touched (`chartTheme.ts`, `logger.ts`, several Redux slices, `RegistryTable.tsx`, `useEmailNotifications.ts`, etc.) — confirmed by name-checking the lint output against every file this chunk edited (`Sidebar.tsx`, `PermitRow.tsx`, `PermitFilters.tsx`, `permitsSlice.ts`, `permits/page.tsx`, `types/index.ts`): **zero lint issues in any of them.** Pre-existing baseline left untouched per "do not silently hide existing unrelated failures" (and, symmetrically, not fixed either — out of this chunk's scope).
- **`npm run build`**: succeeds, all 28 routes compile (static + the two dynamic `[id]` routes), no new warnings beyond the pre-existing baseline.

## 14. Backend changes, if any

Two small, additive, narrowly-scoped changes — each with its own commit,
its own tests, and the full backend suite re-run after each (990 passed,
same 13 pre-existing unrelated failures both times):

1. **`is_terminal`/`terminal_reason` on `PermitRead`** (commit `35b866d`) — the frontend's Terminal-status badge needs real backend data, not a fabricated value; the columns already existed on `PermitRecord` since Phase 4A, just were never exposed on the read schema.
2. **`agency_id`/`agency_name` on `PermitRead` + `agency_id` filter on `/search`** (commit `0f48f13`) — the Data Source filter the requirement update asked for; `PermitRecord.agency_id` and its eager-loaded `Agency` relationship already existed, this only exposes them.

Both preserve Phase 8.5's architecture (no new send path, no schema
migration, no touch to eligibility/identity/scoring logic), have tests,
and are committed separately in the backend repo per Step 9's rule.

## 15. Unresolved frontend blockers

1. Contractors page not started (stretch goal).
2. Terminal status not yet surfaced on the permit detail page (only the list row).
3. `/permits` (top-level, outside `/dashboard`) is an unaudited possible-duplicate route — needs a decision (redirect, or confirm it's genuinely still used) before a cleanup pass.
4. `globals.css`'s legacy dark/neon tokens are unused-but-present — harmless, but a real cleanup candidate whenever the already-hidden pages that use them are formally removed.
5. This repo's `CLAUDE.md` describes a stale design system and the banned automated-send flow as current guidance — not corrected this chunk (a documentation fix, not code); future sessions should not follow it without cross-checking against actual code, exactly as this chunk did.

## 16. Exact recommended Phase 9 Chunk 2

Build the **Contact Info Needed** page first (smallest surface area of the
three not-yet-built Core pages — a single-status task queue, backend
contract already fully documented in Section 4 of the API contract doc),
then **Ready for Lead Bank** (read-only list, Section 5), establishing the
list-page pattern this codebase already uses well (Permit Records) before
tackling the larger **Lead Bank / Manual Outreach** CRM surface (Sections
7-8) in a subsequent chunk. Flip each corresponding `Sidebar.tsx` entry's
`hidden` flag to `false` in the same commit each page ships.

---

**Confirmed:** production untouched · `main` untouched (both repos) ·
outreach OFF · zero emails sent · no client data imported · no deployment
performed.
