# Phase 9 — Frontend API Contract (Backend Contract Freeze)

Backend: `~/Downloads/estihub-backend`, branch `mvp-recovery`, commit `0f48f13`
at the time this document was written. This documents the **actual** backend
contract as inspected in the real routers/schemas/services — nothing here is
inferred or aspirational. Where a field/filter the frontend wants doesn't
exist, that's stated explicitly, not fabricated.

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

No dedicated Phase 9 dashboard work this chunk (explicitly deferred —
"Do NOT yet build... Dashboard overhaul"). Existing dashboard
(`/dashboard`) reads from `dashboardSlice.ts` against pre-existing
endpoints not re-audited this chunk. Revisit in a later Phase 9 chunk.

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

- `GET /candidates` — filterable by `status` (`pending`\|`confirmed`\|`rejected`\|`created_new`) and `outcome` (`possible_match`\|`conflict`\|`insufficient_identity`), paginated (`limit` 1-500, `offset`).
- `GET /candidates/{id}` — one candidate + evidence.
- `POST /candidates/{id}/confirm-existing` — body `{contractor_id}`.
- `POST /candidates/{id}/confirm-alias` — body `{contractor_id, alias_name}`.
- `POST /candidates/{id}/confirm-new` — body `{name, license_number?, license_type?, phone?, email?, website?, state_code?}`.
- `POST /candidates/{id}/reject`, `/leave-unresolved`, `/assign` (body `{assigned_to}`), `/start-research`, `/unable-to-verify`.
- All resolving actions return `409` if the candidate is already resolved (a prior human decision is never overwritten) — surface this as a clear "already handled" state, not a generic error.

This is an **exception workflow**, not primary navigation (per Step 3) — link from Dashboard/relevant workflow views, not the main sidebar.

## 4. Contact Info Needed

**Base:** `/api/v1/contractor-workflow` (role: `admin`+, router-level).

- `GET /contact-tasks?status=<contact_info_needed|in_progress|ready|unable_to_find>&limit&offset` — paginated.
- `GET /contact-tasks/{id}` — one task.
- `POST /contact-tasks/{id}/start`, `/unable-to-find`, `/note` (body `{note}`).

No page built this chunk (explicitly deferred). Contract is real and stable
for whenever it's built.

## 5. Ready for Lead Bank

**Base:** same router, `/api/v1/contractor-workflow/ready-for-lead-bank?limit&offset` — read-only, paginated, returns raw dicts (not a typed Pydantic model per-row — treat as loosely-typed on the frontend until/unless the backend adds a real schema).

No page built this chunk.

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

- `GET /relationships?status&outreach_status&sales_owner_id&dnc&contractor_id&limit&offset`
- `GET /relationships/{id}`
- `GET /relationships/{id}/opportunities?status&limit&offset`
- `GET /relationships/{id}/history?limit&offset`
- `POST /relationships/{id}/status` — body `{status, reason?}`
- `POST /relationships/{id}/dnc` — body `{dnc, reason?}`
- `POST /relationships/{id}/sales-owner` — body `{sales_owner_id}` — **this is the manager-reassignment endpoint the Manual Outreach section (8) also relies on**, not duplicated there.
- `POST /relationships/{id}/primary-opportunity` — body `{opportunity_id, lock?}`
- `GET /opportunities/{id}`
- `POST /opportunities` — body `{permit_id, sales_owner_id?}` — 422 if the permit isn't `READY_FOR_LEAD_BANK`-eligible, 404 if missing.
- `POST /opportunities/bulk` — body `{permit_ids[], sales_owner_id?}`, max 5,000/request.

Status vocab: `relationship_status` = Prospect\|Warm Lead\|Active
Opportunity\|Active Client\|Former Client\|Not Interested\|Do Not Contact.
`outreach_status` = ready\|active_outreach\|cooldown\|previously_contacted_
new_project\|completed_no_response\|delivery_issue. Do not conflate the two
axes into one field (Step 6) — they're genuinely independent.

No page built this chunk.

## 8. Manual Outreach

**Base:** `/api/v1/manual-outreach` (role: `outreach`+, router-level).
**Deliberately not `/api/v1/outreach`** — that prefix is the legacy
automated-send system's namespace (campaigns/warmup/domains/inbox/reply
endpoints); a frontend page must never assume everything under
`/api/v1/outreach/*` is safe to expose (Section 10).

- `GET /ready?limit&offset` — structural pre-filter, not a full eligibility re-check per row.
- `GET /my-leads?owner_id?&status&limit&offset` — `owner_id` param restricted to admin/super_admin for anyone other than self (403 otherwise).
- `GET /workflows?status&owner_id&limit&offset`
- `GET /workflows/{sequence_id}` — includes `stages[]`.
- `GET /due?limit&offset` — due/ready stages, read-only.
- `POST /workflows` — body `{relationship_id, opportunity_id?}` — 422 with `{reasons: [...]}` if currently ineligible, 404 if relationship missing.
- `POST /relationships/{id}/claim` — 409 if already claimed by someone else.
- `POST /stages/{id}/mark-sent` — no body (marked_sent_by is always the authenticated caller, never client-supplied) — 403 if owned by a different employee, 422 with `{reasons}` if the gate now blocks it, 409 if the stage/sequence can't be marked sent (already stopped, etc.).
- `POST /relationships/{id}/outcome` — body `{outcome, notes?, bad_email?}`. Valid `outcome` values: `replied`, `interested`, `active_opportunity`, `not_interested`, `dnc`, `unsubscribe`, `no_response`, `bad_email` (requires `bad_email` address), `manual_stop`. 400 for an invalid/missing-required-field outcome, 403 for cross-employee.
- `POST /stages/{id}/select-email` — body `{email}` — 422 if the address isn't currently usable for that contractor.
- `GET /relationships/{id}` — full detail contract (see below).
- `GET /relationships/{id}/history?limit&offset`

**Relationship detail contract** (`GET /relationships/{id}`): `relationship_id, contractor_id, company_name, primary_email, usable_alternative_email_count, phone, website, sales_owner_id, sales_owner_name, relationship_status, outreach_status, previously_contacted_new_project (bool), primary_opportunity_id, permit_number, permit_type, scope, project_address, valuation, opportunity_score, qualification_bucket, issue_date, source_agency, last_contacted_at, cooldown_until, reply_lock_until, dnc, active_workflow_id, active_workflow_status, current_stage_number, current_stage_type, current_stage_status, current_stage_due_at`.

**Fields requested but NOT available** (do not fabricate): `County`,
`Contractor Type`, `Trade/Scope` at the *contractor* level (Trade/Scope
exists only at the permit/opportunity level via `work_scope`/`permit_type`
on the linked opportunity's snapshot — there is no contractor-level trade
classification).

No page built this chunk — service layer + router are Phase 8 work,
already tested; frontend page is future work.

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

Existing page (`/dashboard/counties`), backend `/api/v1/permits/counties*`
family — not re-audited this chunk. Note: this is a genuinely different
"county" concept (coverage/analytics reporting) from the removed permit
*filter* — the County Coverage **page** is unaffected by the filter
removal decision, which is about the Permit Records list filter UI only.

## 11. Import Data

Existing page (`/dashboard/upload`) — not re-audited this chunk.

## 12. User Management

Existing page (`/dashboard/settings/users`) — not re-audited this chunk.

## 13. Settings

Existing page (`/dashboard/settings/permit-scoring`) — not re-audited this
chunk.

## Known backend carve-outs (do not build fake filters for these)

- **County** at the Contractor level and **Contractor Type** — no backing data anywhere; product decision is to omit both from the MVP UI regardless of eventual backend feasibility.
- **Multi-license contractors** — architecture decided (child table), not built yet. See Section 6.
- **Legacy automated-send system** (`/api/v1/outreach/*`) — being kept in the backend for possible future development per this chunk's requirement update, but must never be exposed in the current frontend (Section 10, "Manual Outreach"; also see the frontend audit report's legacy-outreach-UI findings).
