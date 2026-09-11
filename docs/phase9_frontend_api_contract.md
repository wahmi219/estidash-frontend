# Phase 9 — Frontend API Contract (Backend Contract Freeze)

Backend: `~/Downloads/estihub-backend`, branch `mvp-recovery`. Originally
written at commit `0f48f13` (Chunk 1); updated through Chunk 4 at commit
`4d6c56c`. This documents the **actual** backend contract as inspected in
the real routers/schemas/services — nothing here is inferred or
aspirational. Where a field/filter the frontend wants doesn't exist, that's
stated explicitly, not fabricated.

**EHUB never sends email.** No endpoint in this document sends, queues, or
retries an outbound message. Manual outreach (Section 8) exists purely to
track eligibility/ownership/stage-due-ness/outcomes for an email an employee
sends themselves, outside EHUB.

## Filter/field decisions locked this chunk

Per the Phase 9 requirement update (mid-Chunk-1):

| Decision | Status |
|---|---|
| **County** — removed from the MVP filter UI | The backend's `/permits/search` actually does have a working `county` query param and `PermitRead.county_name` — Phase 8.5's "no backing data" note was about the *Contractor*-level county, not the permit level. Backend support exists; the **product decision** is to not expose it in the MVP filter UI regardless. `PermitFilters.county` stays on the type (dead) for old bookmarked-URL compatibility; no control renders it. |
| **Contractor Type** — removed from the MVP filter UI | Confirmed genuinely not modeled anywhere (Phase 8.5 finding stands) — nothing to remove from the UI because it was never built. |
| **Trade / Scope** — kept | Backend support: `work_scope` query param (Section 2) — a real, working filter today. |
| **Project Type** — kept | Backend support: `project_class` query param (Section 2) — real, working. |
| **State** — kept | Backend support: `state` query param — real, working. |
| **Data Source** — added | New. Backend: `agency_id` query param + `PermitRead.agency_id`/`.agency_name` (added this chunk, commit `0f48f13`). Human-readable label (`agency_name`, e.g. "Chicago, IL") is what the UI displays; `agency_id` is the stable filter value sent to the API — never displays the id. |
| **Qualification** — kept | Backend support: `qualification` query param (`qualified`/`invalid`) — real, working. |
| **Status** — kept | Backend support: raw `status` isn't directly filterable as free text on `/search`, but `opportunity_category` (Fresh Leads/Change Scope/Live Jobs/Dead) is the intended status-shaped filter — see Section 2. |
| **Date** — kept | Backend support: `start_date`/`end_date` (permit issue date) and `added_start_date`/`added_end_date` (EHUB ingestion date) — both real. |

## 1. Dashboard

**Chunk 4 — built.** `GET /api/v1/dashboard/summary` (role: `outreach`+)
returns six real operational counts, each reusing the exact predicate its
own queue endpoint uses (no drift possible between a card and its
drill-down):

```json
{
  "contractor_verification_pending": 0,
  "contact_info_needed": 0,
  "ready_for_lead_bank": 0,
  "ready_for_outreach": 0,
  "follow_ups_due": 0,
  "lead_bank_total": 0
}
```

`/dashboard/page.tsx` renders these as clickable cards linking to
Contractor Verification / Contact Info Needed / Ready for Lead Bank /
Lead Bank respectively. A pure `viewer`-role user gets a 403 on this one
endpoint (the Dashboard shell itself stays `viewer`+); the page shows a
plain "requires additional access" message for that section rather than
crashing or hiding the whole page. Permit Source Health and the
not-yet-wired "Latest Sync"/"Priority States to Work" sections are
unchanged from Chunk 1 (still honest empty shells, no backend yet).

## 2. Permit Records

**Base:** `GET /api/v1/permits/search` (role: `viewer`+)

Query params (all optional except pagination defaults):

| Param | Type | Notes |
|---|---|---|
| `city` | string | Matches `City.name` or `Agency.external_domain` (ILIKE) |
| `state` | string | State code, e.g. `IL` |
| `agency_id` | UUID | **New this chunk.** Data Source filter — plain FK equality |
| `opportunity_category` | string | `Fresh Leads` \| `Change Scope` \| `Live Jobs` \| `Dead` — expands to OR across raw status keywords server-side |
| `issued_age_bucket` | enum | `fresh_issued`\|`warm_issued`\|`aging_issued`\|`old_issued` — only meaningful with `opportunity_category=Fresh Leads` |
| `project_class` | string | Residential \| Commercial \| Multi-Family \| Industrial \| Data Center \| Specialty — keyword-expansion match |
| `work_scope` | string | New Build \| Addition \| Renovation \| Interior Build-Out/TI \| Demolition \| Special — keyword-expansion match |
| `county` | string | Real, working — **not exposed in the MVP filter UI per product decision** |
| `contractor_name` | string | |
| `start_date`/`end_date` | date | Issue date range |
| `min_cost`/`max_cost` | float | |
| `zip_code` | string | |
| `score_tier` | string | A\|B\|C |
| `score_bucket` | string | strategic\|strong\|core\|opportunistic\|no_send |
| `is_excluded` | bool | Legacy — superseded by `qualification`, don't set both |
| `cost_source` | string | real\|ai\|none |
| `qualification` | string | `qualified`\|`invalid` — the primary business-state filter |
| `has_contractor` | bool | true=Contractor Linked, false=Verification Needed |
| `lifecycle_eligible` | bool | true = issue_date within last 6 months (opt-in, omit for existing historical behavior) |
| `added_start_date`/`added_end_date` | date | EHUB ingestion date, not permit date |
| `search` | string | Free text across address/permit#/description |
| `limit`/`offset` | int | limit 1-2000, default 100 |
| `order_by`/`order_desc` | string/bool | |

**Response** (`PermitSearchResponse`): `{ total, total_is_estimate, limit, offset, data: PermitRead[] }`.

**`PermitRead` fields actually returned** (only what's real — nothing inferred):

`id, external_permit_id, permit_number, permit_type, permit_subtype, permit_class, work_description, status, application_date, issue_date, expiration_date, completion_date, estimated_cost, total_fee, housing_units, ai_estimated_cost, ai_cost_confidence, full_address, city, state_code, zip_code, county_name, latitude, longitude, agency_id, agency_name` **(new this chunk)**, `contractor_id, contractor_name, contractor_email, contractor_phone, contractor_lead_score, contractor_score_bucket, lead_score, score_bucket, score_tier, is_excluded, exclude_reason, is_terminal, terminal_reason` **(new this chunk)**`, score_breakdown, contact_count, square_footage, stories, owner_name, license_number, community, parcel_number, days_since_issue, api_specific_fields (list endpoint omits this), created_at, updated_at`.

**Fields NOT available** (do not fabricate a UI control for these):
- No `lifecycle_reason` string (only the boolean `lifecycle_eligible` filter exists — no per-permit "why ineligible" text).
- No exclusion/terminal **history** on this response (only current-state `exclude_reason`/`terminal_reason`) — history tables exist backend-side (`PermitExclusionHistory`/`PermitTerminalHistory`) but have no exposed read endpoint yet.
- No Contractor Type / Trade classification field (product decision: not shown regardless).

**Detail:** `GET /api/v1/permits/{id}` → same `PermitRead` shape, `include_raw=True` (includes `api_specific_fields`).

**Bulk delete:** `POST /api/v1/permits/bulk` (role: `admin`+) — not otherwise documented here; unchanged this chunk.

**Cities/Counties pickers:** `GET /api/v1/permits/cities`, `GET /api/v1/permits/counties` (role: `analyst`+ for counties) — both real; counties endpoint's data is real but its **UI use is removed** per the product decision above.

**Data Source picker:** reuses `GET /api/v1/data-sources` (Section 9) — `{ agency_id, source }` is the shape the filter dropdown needs; no new endpoint was added for this, the existing Data Sources page's endpoint was reused.

## 3. Contractor Verification

**Base:** `/api/v1/contractor-verification` (role: `admin`+, router-level).
**Chunk 4 — page built** at `/dashboard/contractor-verification` (list)
and `/dashboard/contractor-verification/[id]` (compare/resolve detail).
Reachable via a Dashboard card, deliberately **not** added to the sidebar
(per spec: exception workflow, add to sidebar only if volume/UX strongly
requires it later).

- `GET /candidates` — filterable by `status` (`pending`\|`assigned`\|`in_progress`\|`confirmed`\|`rejected`\|`created_new`\|`unable_to_verify`) and `outcome` (`possible_match`\|`conflict`\|`insufficient_identity`), paginated (`limit` 1-500, `offset`). **Chunk 4:** list/detail responses now also carry the source permit's context (`permit_number, permit_type, scope, project_address, valuation, qualification_bucket, score, issue_date, state_code, agency_id, agency_name`) and, when `candidate_contractor_id` is set, a `candidate_contractor` object (`id, name, aliases[], license_number, license_type, phone, website, state_code, has_lead_bank_relationship`) — both batched across a page (2 extra queries per page, never N+1).
- `GET /candidates/{id}` — one candidate + the same enriched fields.
- `POST /candidates/{id}/confirm-existing` — body `{contractor_id}`.
- `POST /candidates/{id}/confirm-alias` — body `{contractor_id, alias_name}`.
- `POST /candidates/{id}/confirm-new` — body `{name, license_number?, license_type?, phone?, email?, website?, state_code?}`.
- `POST /candidates/{id}/reject`, `/leave-unresolved`, `/assign` (body `{assigned_to}`), `/start-research`, `/unable-to-verify`.
- All resolving actions return `409` if the candidate is already resolved (a prior human decision is never overwritten) — the frontend surfaces this as a plain "already resolved" banner, not a generic error.

Only `status` and `outcome` are backend-filterable; the list page's Search
box filters client-side over the fetched page only (page-scoped, not a
server search) — documented rather than implied as a full-table search.
No County / Contractor Type filter anywhere on this page.

## 4. Contact Info Needed

**Base:** `/api/v1/contractor-workflow` (role: `admin`+, router-level).
**Chunk 2 — page built** at `/dashboard/contact-info-needed`, unhidden in
the CORE sidebar.

- `GET /contact-tasks?status=<contact_info_needed|in_progress|ready|unable_to_find>&assigned_to&limit&offset` — paginated. Enriched (Chunk 2) with contractor name/phone/website/state, `sibling_opportunity_count`, and the current best-eligible permit's context.
- `GET /contact-tasks/{id}` — one task, same enrichment.
- `POST /contact-tasks/{id}/start`, `/unable-to-find`, `/note` (body `{note}`).

Backend-filterable: `status`, `assigned_to` only. State/Data
Source/Trade-Scope/Project Type/Qualification are enriched **display**
fields on this page, not filterable — stated on the page's filter bar
rather than faked as working dropdowns.

## 5. Ready for Lead Bank

**Base:** same router, `/api/v1/contractor-workflow/ready-for-lead-bank?limit&offset&agency_id&qualification_bucket&start_date&end_date` — read-only, paginated, returns raw dicts (not a typed Pydantic model per-row). **Chunk 2 — page built** at `/dashboard/ready-for-lead-bank`, unhidden in the CORE sidebar; **Chunk 4** added a real `total` field to the response (backed by `count_ready_for_lead_bank()`, a single COUNT query with a correlated EXISTS for usable-email — no N+1 Python loop, safe to call unbounded).

Bulk-add wired to `POST /api/v1/lead-bank-v2/opportunities/bulk`; single-row
add to `POST /api/v1/lead-bank-v2/opportunities`. `lead_bank_status`
(`existing`|`new`) per row is real Lead Bank V2 state, never fabricated —
an "existing" row always means "will attach to the current relationship,"
never "will create a duplicate company record."

Backend-filterable: `agency_id` (Data Source), `qualification_bucket`,
`start_date`/`end_date`. State and Trade/Scope are display-only (no join /
no normalized taxonomy) — same honesty rule as Contact Info Needed.

## 6. Contractors

**Base:** existing `/api/v1/contractors` router (not re-audited line-by-line
this chunk — Contractors was a stretch goal not reached; revisit in a later
chunk). One confirmed, important note for whenever Contractors is built:

**Licenses are becoming a child collection, not a single field** — per the
Phase 9 requirement update, the final architecture is ONE Contractor ID →
MULTIPLE licenses (a `contractor_licenses` child table, similar to
`contractor_emails`). **This table does not exist yet** — `Contractor.
license_number` is currently still a single, globally-unique string field
(this is also the source of Phase 8.5's confirmed P1 finding: a real
multi-licensed company can end up as two duplicate Contractor rows today).
**Design the Contractors frontend for a Licenses list/section from the
start** (even against today's single-field backend, render it as a
one-item list) so no rework is needed once the child table ships. Do not
build the frontend around an assumption of exactly one license per
contractor.

**`GET /api/v1/contractors/import-geojson` is disabled** (Phase 8.5 fix,
backend commit `57fff63`) — returns `410`. Do not build a frontend entry
point for it.

## 7. Lead Bank V2

**Base:** `/api/v1/lead-bank-v2` (role: `admin`+, router-level).
**Chunk 3 — page built** at `/dashboard/lead-bank` (CRM list, "All
Relationships" tab) and `/dashboard/lead-bank/[id]` (detail), unhidden in
the CORE sidebar. One main row per Contractor relationship, never per
permit.

- `GET /relationships?status&outreach_status&sales_owner_id&dnc&contractor_id&limit&offset` — **Chunk 4:** each row is now `RelationshipEnrichedOut`, adding `contractor_name/email/phone/state_code`, `sales_owner_name`, `opportunity_count`, and `primary_opportunity_*` (permit_number/type/scope/valuation/qualification_bucket/score/issue_date/source_agency) — 4 batched queries per page total, never N+1.
- `GET /relationships/{id}` — same enrichment, single row.
- `GET /relationships/{id}/opportunities?status&limit&offset`
- `GET /relationships/{id}/history?limit&offset`
- `POST /relationships/{id}/status` — body `{status, reason?}`
- `POST /relationships/{id}/dnc` — body `{dnc, reason?}`
- `POST /relationships/{id}/sales-owner` — body `{sales_owner_id}` — **this is the manager-reassignment endpoint the Manual Outreach section (8) also relies on**, not duplicated there. Not yet wired into the frontend (no owner-reassignment control on the detail page this chunk — Claim is wired, admin reassignment is a documented gap).
- `POST /relationships/{id}/primary-opportunity` — body `{opportunity_id, lock?}` — wired as "Set as Primary" per opportunity row.
- `GET /opportunities/{id}`
- `POST /opportunities` — body `{permit_id, sales_owner_id?}` — 422 if the permit isn't `READY_FOR_LEAD_BANK`-eligible, 404 if missing.
- `POST /opportunities/bulk` — body `{permit_ids[], sales_owner_id?}`, max 5,000/request.

Status vocab: `relationship_status` = prospect\|warm_lead\|active_
opportunity\|active_client\|former_client\|not_interested\|do_not_contact.
`outreach_status` = ready\|active_outreach\|cooldown\|previously_contacted_
new_project\|completed_no_response\|delivery_issue. The two axes are
rendered as two separate badges on both the list and detail page, never
merged into one status.

**Filters wired on the list page:** `status` (relationship), `outreach_status`,
`sales_owner_id` (as a "My Leads" checkbox using the logged-in user's own
id), `dnc` (default `false` — a "Show Do Not Contact" checkbox reveals
suppressed rows). Search is **client-side over the fetched page only**
(contractor name/email) — not a server-side search endpoint; stated as
such in the UI copy, not implied as full-database search. No admin-only
"Sales Owner: pick any employee by name" dropdown was built this chunk —
`GET /api/v1/auth/users` is `super_admin`-only, so a universal owner
picker would silently fail for most callers; documented as a gap rather
than built inconsistently per-role.

## 8. Manual Outreach

**Base:** `/api/v1/manual-outreach` (role: `outreach`+, router-level).
**Chunk 3 — UI built inside Lead Bank**, not as a separate page: the
"Ready for Outreach" and "Follow-ups Due" tabs on `/dashboard/lead-bank`,
plus the "Manual Outreach" section on the relationship detail page
(`/dashboard/lead-bank/[id]`). **Deliberately not `/api/v1/outreach`** —
that prefix is the legacy automated-send system's namespace (campaigns/
warmup/domains/inbox/reply endpoints); the frontend never assumes
anything under `/api/v1/outreach/*` is safe to expose (Section 10).

- `GET /ready?limit&offset` — structural pre-filter, not a full eligibility re-check per row. Wired to the "Ready for Outreach" tab; each row's "Start Outreach Workflow" button explicitly does not send anything.
- `GET /my-leads?owner_id?&status&limit&offset` — not directly wired this chunk (the Lead Bank list's "My Leads" checkbox uses `/lead-bank-v2/relationships?sales_owner_id=<self>` instead, since that response is already enriched with contractor context this endpoint doesn't return).
- `GET /workflows?status&owner_id&limit&offset` — not wired; no "list every workflow across all relationships" view was built. Documented gap.
- `GET /workflows/{sequence_id}` — wired: the relationship detail page fetches the active workflow's stages via `detail.active_workflow_id`.
- `GET /due?limit&offset` — wired to the "Follow-ups Due" tab, with an Overdue badge computed client-side from `due_at`.
- `POST /workflows` — body `{relationship_id, opportunity_id?}` — wired as "Start Outreach Workflow" (Ready for Outreach tab and relationship detail); 422 `{reasons}` surfaced as a plain error banner, 404 if relationship missing.
- `POST /relationships/{id}/claim` — wired as "Claim for Me" (shown only when `sales_owner_id` is null); 409 if already claimed surfaced as an error.
- `POST /stages/{id}/mark-sent` — no body — wired as "Mark Sent" with an explicit confirm dialog ("Use this only after you have actually sent this email..."); 403/422/409 surfaced as error banners, never silently retried.
- `POST /relationships/{id}/outcome` — body `{outcome, notes?, bad_email?}` — all 9 outcomes wired as buttons (Replied, Interested, Active Opportunity, Not Interested, DNC, Unsubscribe, No Response, Bad/Bounced Email, Manual Stop); DNC/Unsubscribe/Manual Stop/Not Interested confirm before submitting. Bad Email opens a picker over the contractor's usable emails (fetched via `GET /contractors/{id}`) rather than accepting free text, so the employee can't typo an address that silently fails to match.
- `POST /stages/{id}/select-email` — body `{email}` — wired inside the "Mark Sent" panel when more than one usable email exists.
- `GET /relationships/{id}` — full detail contract, the primary data source for the whole detail page (contractor + CRM + opportunity + workflow-stage summary in one call).
- `GET /relationships/{id}/history?limit&offset` — not used; the detail page uses `/lead-bank-v2/relationships/{id}/history` instead (same underlying table, the CRM's own audit-trail endpoint) for consistency with the rest of the page.

**Relationship detail contract** (`GET /relationships/{id}`): `relationship_id, contractor_id, company_name, primary_email, usable_alternative_email_count, phone, website, sales_owner_id, sales_owner_name, relationship_status, outreach_status, previously_contacted_new_project (bool), primary_opportunity_id, permit_number, permit_type, scope, project_address, valuation, opportunity_score, qualification_bucket, issue_date, source_agency, last_contacted_at, cooldown_until, reply_lock_until, dnc, active_workflow_id, active_workflow_status, current_stage_number, current_stage_type, current_stage_status, current_stage_due_at`.

**Fields requested but NOT available** (do not fabricate): `County`,
`Contractor Type`, `Trade/Scope` at the *contractor* level (Trade/Scope
exists only at the permit/opportunity level via `work_scope`/`permit_type`
on the linked opportunity's snapshot — there is no contractor-level trade
classification).

**Known gap:** only the relationship's currently-active workflow is shown
on the detail page — there is no backend filter to list all past/stopped
workflows for one relationship (`GET /workflows` only filters by
`status`/`owner_id`, not `relationship_id`). A contractor's outreach
history beyond the active workflow is visible via the History section
(status-change events), not as a full list of past workflow objects.

## 9. Data Sources

**Base:** `/api/v1/data-sources`. Already has a frontend page
(`/dashboard/datasources`) predating this chunk — not re-audited in depth,
but confirmed its list endpoint (`GET /api/v1/data-sources` →
`DataSourceSummary[]`, fields: `agency_id, city_key, source, state,
connector, last_success, latest_permit, next_sync, health, health_reason,
records, enabled, disabled_reason, currently_running`) is exactly what's
reused for the new Permit Records "Data Source" filter dropdown this
chunk — no new endpoint needed.

## 10. County Coverage

**Chunk 4 — removed from active navigation.** Route (`/dashboard/counties`)
and backend (`/api/v1/permits/counties*`) are untouched and still fully
functional — only the sidebar entry moved from the visible `DATA` group
into the hidden `legacyNavItems` list (`Sidebar.tsx`), so a direct link
still works but the page is no longer presented as current functionality.
Data Sources / Source Health (Section 9) is the replacement coverage
indicator.

## 11. Import Data

**Chunk 4 — foundation built** at `/dashboard/import-data` (now the
sidebar's "Import Data" target, replacing the old direct link to
`/dashboard/upload`). Six categories: Active Clients, Former/Existing
Clients, Contractor Database, Email-Only Existing Clients, Contact
Enrichment, Manual Permit Data. Only **Manual Permit Data** has a real
backend today — selecting it links straight to the existing, working
Excel uploader at `/dashboard/upload` (unchanged, still there). The other
five render an honest workflow-stepper preview (Upload → Detect → Preview
→ Clean/Validate → Deduplicate → Match Contractor ID → Possible Match
Review → Confirm Import) with a disabled dropzone and explicit "not yet
available" copy — no file is accepted, no fake success state, and nothing
here processes a real client/contractor/email dataset. Building any of the
five real pipelines (including identity-matching against Contractor IDs
and possible-match review) is pre-production follow-up work, not started.

## 12. User Management

Existing page (`/dashboard/settings/users`) — audited this chunk, no
changes needed: role/status CRUD is real and already scoped to
`super_admin`, password fields are write-only (never echo a stored hash).

## 13. Settings

Existing page (`/dashboard/settings/permit-scoring`, with `/dashboard/
settings` redirecting to it) — audited this chunk. The only other Settings
sub-pages are `agents` (LLM/OpenRouter config, `super_admin`-only, hidden
from nav — API keys are write-only/masked, not automated-outreach related)
and `lead-banks` (the legacy Lead Bank CRM, `super_admin`-only, hidden from
nav — kept, not deleted). No SMTP/Gmail-send/automated-campaign
configuration is exposed in current navigation.

## Known backend carve-outs (do not build fake filters for these)

- **County** at the Contractor level and **Contractor Type** — no backing data anywhere; product decision is to omit both from the MVP UI regardless of eventual backend feasibility. No page built this chunk exposes either.
- **Multi-license contractors** — architecture decided (child table), not built yet. See Section 6.
- **Legacy automated-send system** (`/api/v1/outreach/*`) — kept in the backend for possible future development, never exposed in the current frontend. The legacy `outreach` page (`/dashboard/outreach`, campaigns/lead-queue UI) and `warmup`/`inbox` pages remain hidden in `Sidebar.tsx`'s `legacyNavItems`/`secondaryNavItems`, routes still functional for a direct link, no Send/Auto-Send control anywhere in current navigation.
- **Lead Bank list server-side "Sales Owner: any employee" filter and full workflow-history-by-relationship listing** — see Sections 7-8 for why (role-gated user list; no `relationship_id` filter on `/manual-outreach/workflows`).
- **Import Data**'s five non-Manual-Permit-Data categories — see Section 11.
