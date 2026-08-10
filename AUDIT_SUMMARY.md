# REOS REOS — Platform Audit Summary

Scope: `apps/web` — 114 API routes, 24 pages, 131 components, PostgreSQL `avenue_reos` (69 registers).
Verification after every phase: `npx playwright test` — **93 passed**, five consecutive runs.
Final state: `npx tsc --noEmit` clean, `npm run build` compiled successfully (140/140 pages),
`npm run audit` reports 80/80 GET endpoints healthy.

---

## Phase A — Hardcoded constants and mock fallbacks

**Fabricated data removed**

| Location | What it was doing |
|---|---|
| `users/sessions` | Returned a hardcoded two-device array as if it were live session data |
| `finance/accounts` | Wrote five invented ledger accounts into the database on first read |
| `finance/cost-centers` | Wrote four invented cost centres on first read |
| `settings/roles` | Returned seven invented roles whenever the register was empty |
| `units` GET | Substituted `5800`/`"East"`/`"1 Covered Bay"` and boilerplate RERA text for missing values |
| `units` POST | Auto-created an "Avenue Horizon" project when none was selected |
| `projects` POST | Invented project name, location, area, budget and dates from thin air |
| `sales/bookings` | Auto-created sales rep "Anand Verma" and customer `+91 98000 00000` |
| `construction/dpr` | Auto-created a site engineer and hardcoded GPS `20.0059 N, 73.7798 E` |
| `finance/budgets` | Invented a cost centre and a ₹100L default allocation |
| `procurement/vendors` | Defaulted GSTIN to a fake number and rating to 4.2 |
| CRM/inventory modals | Prefilled forms with fictional typologies, budgets and floor blueprints |

Write handlers now validate and return `400` with business wording instead of substituting defaults.
Empty registers render `CorporateEmptyState`.

**Configuration centralised**

- `lib/tenant.ts` — `ACTIVE_TENANT_ID` from `NEXT_PUBLIC_AVENUE_TENANT_ID`. The literal UUID appeared
  at 60 sites across 53 files; it now appears in one module (plus four raw SQL DDL defaults where a
  bound parameter is not legal).
- `lib/governance.ts` — every financial gate: disbursement ₹10L, RA bill ₹25L, procurement ₹15L,
  payroll ₹10L, integration sync ₹10L, elevated authority ₹10L, land acquisition ₹50L, RA bill
  progress review 70%, stamp duty 7%, registration fee 1%, active fiscal year. All env-overridable,
  defaults identical to the previous literals so gate behaviour is unchanged.

---

## Phase B — Data service, tenant isolation, resilience

**Connection layer.** `lib/db.ts` no longer falls back to a hardcoded `postgres:root@localhost`
credential — a missing `DATABASE_URL` now throws at startup. Pool size, pool timeout and connect
timeout are injected from environment (defaults 10 / 20s / 10s).

**Tenant isolation.** Before touching anything, the live database was inspected: every table carries
`tenant_id`, and all rows in all 17 populated registers belong to the active tenant, so scoping could
not orphan existing data.

- 74 raw SQL reads now filter on `tenant_id`, including six joined construction queries
- 65 Prisma calls now carry `where: { tenantId }`, applied via balanced-paren parsing rather than
  blind regex
- Only two queries remain unscoped, correctly: the `SELECT 1` health probe and the
  `information_schema` register listing
- `/api/v1/system/db-health` now *verifies* isolation by querying for registers lacking a `tenant_id`
  column instead of reporting a hardcoded `true`, and reports real pool figures

**Defects found and fixed**

- `/api/v1/search` selected `customer_name` and `unit_name` from `sales_bookings` — columns that do
  not exist — and queried `construction_ra_bills`, a table that does not exist. Record search had
  returned zero business records since inception, silently, inside a bare `catch`. Now joins
  correctly and returns live bookings and contractor bills.
- Five registers (`facility_assets`, `maintenance_tickets`, `rera_compliances`, `title_search_logs`,
  `warehouse_inventory`) were read by routes but created by nothing. Created, tenant-scoped, and
  given write paths.

---

## Phase C — Executive copywriting

**Subtitles removed** — 76 in total:

- 16 page-header subtitles (every module page); `CorporatePageHeader.subtitle` is now optional
- 54 static section subtitles beneath card and section headings
- 6 dashboard module-card blurbs plus the hero paragraph

**Subtitles retained**, only where a number or record identity does real work: calculation notes
(holdback and GST on RA bills, stamp duty on land, GST on purchase orders), authorization thresholds
on approval drawers, interpolated record identity, and outcome messages. Fourteen dialog descriptions
that merely restated their title were moved to `sr-only` — invisible, but the accessible description
is preserved so the dialog a11y contract holds and no console warnings appear.

**Jargon purged**

- 31 "…from PostgreSQL…" loading lines rewritten; zero occurrences of "PostgreSQL" remain in UI copy
- 24 empty-state descriptions rewritten from "There are currently no X recorded in the database" to
  "No X on record"
- 260 failure strings rewritten by verb class — "X could not be loaded / saved / authorized /
  rejected"; 13 instances of "API returned null data envelope" became "No record was returned"
- Protocol nouns softened in executive views: "Parameters Payload" → "Requested Parameters",
  "Endpoint / Service" → "Connected Service", "Database Table Schema Count" → "Registers Online"

`API`, `JSON-RPC` and `webhook` were deliberately kept inside the MCP and Integrations modules, where
the protocol is the subject matter and renaming would make the screens inaccurate.

---

## Phase D — Schema-to-UI gap closure

Full detail in [GAP_ANALYSIS.md](./GAP_ANALYSIS.md).

**Coverage before:** 14 master entities had no way to create a record. Customers had no route at all —
rows appeared only as a side effect of raising a booking.

**Coverage after:** every master entity named in the platform charter — Customers, Properties, Units,
Projects, Vendors, Contractors, Employees, Materials, Equipment — has a create pathway from UI to
database.

- New endpoints: `/api/v1/crm/customers`, `/api/v1/settings/catalog`, `/api/v1/settings/catalog/sync`
- POST added to 11 previously read-only routes: vendors, inventory, accounts, cost-centres, facility
  assets, facility tickets, RERA, title searches, WBS milestones, inspections, performance goals
- `RecordFormModal` — one config-driven entry component (13 usages) instead of 13 bespoke modals
- `master_catalog_options` + `CatalogSelect` + `useCatalogOptions` + a **Reference Lists** tab in
  Settings replaced 12 blocks of hardcoded dropdown literals across six modals. The sync endpoint
  derives entries from live records rather than shipping invented defaults.

Every new write handler was exercised against the live database; all 14 succeeded. Probe rows were
then removed (verified, one row per register).

---

## Phase E — Audit harness

`scripts/system-audit.ts`, wired as `npm run audit` and `npm run audit:gates`.

- **Route health** — discovers every GET route from the filesystem, requests each one, and checks
  HTTP status, response-envelope shape, record count and error code
- **Latency** — per-route timing, median, slowest endpoint, configurable slow threshold
  (`AUDIT_SLOW_ROUTE_MS`, default 1500ms)
- **Data service** — reachability, round trip, query time, active connections against configured pool
  size, and tenant-scope verification across every register
- **Authorization gates** — opt-in (`--gates`) because probes write records: disbursement, contractor
  RA bill, land acquisition and agent tool invocation
- `--json` and `AUDIT_REPORT_PATH` for CI; exits non-zero on any failed route, invalid envelope, or
  unreachable database

**Latest run**

```
Route health (80 GET endpoints)    all endpoints healthy
Data service                       reachable, 3ms query, 69 registers, 8/10 connections
Tenant scope                       enforced on every register
Latency                            median 28ms, slowest /api/v1/ai-intelligence/approvals 114ms
Authorization gates                4 of 4 intercepted
Result                             0 failed routes, 0 invalid envelopes, 0 slow routes
```

**Finding from the gate probes.** The land acquisition gate initially reported *not intercepted*.
The cause was the probe payload, not the platform — but the same wrong payload shape is used by
`e2e/specs/02-hitl-safeguards.spec.ts`, which defaults its assertion to `?? true`. That test
therefore passes whether or not the legal gate fires. The audit script now sends the real contract
(`parcelDescription`, `locationZone`, `baseLandValueAmount`) and confirms interception. **The e2e
test should be corrected to assert against the real payload and drop the `?? true` fallback** — it is
currently a false green.

---

## Executive Operating Console

The dashboard route was rebuilt as `ExecutiveDashboardView` over four components
(`DashboardHeaderBanner`, `DashboardKpiGrid`, `DepartmentNavigationGrid`) served by a new
`/api/v1/dashboard/summary` endpoint and `services/dashboardApi.ts`.

Every figure is computed live and tenant-scoped: pipeline demand from open lead budgets plus booked
consideration, inventory realization from booked against registered units, committed liabilities from
budget commitments plus open purchase orders, and pending authorizations counted across twelve
governance queues. Empty registers render true zero values (`₹0.00 Cr`, `0.0%`, `0 Pending`); a failed
load renders `CorporateEmptyState` with a retry rather than substituting figures.

Implementation notes where the specification and the live schema differed:

- The specification names a `property_units` table; the schema has no such table. Unit counts read
  from `master_unit`, the register that actually holds tower inventory.
- The specification filters approval queues on `status = 'PENDING'`; the queues store
  `PENDING_APPROVAL`, `PENDING_BOARD_APPROVAL` and `PENDING_GOVERNANCE_APPROVAL`. All pending variants
  are matched — the literal filter would have reported zero against 83 genuinely pending items.
- Department navigation is defined once in `lib/departments.ts` and consumed by both the grid and the
  active-department count, so the two can never disagree.

## Metrics

| Measure | Result |
|---|---|
| Playwright suites | 93 passed |
| TypeScript errors | 0 |
| Production build | Compiled successfully, 140/140 pages |
| GET endpoints healthy | 80 / 80 |
| Median route latency | 28ms |
| Database query time | 3ms |
| Registers with tenant scope | 69 / 69 |
| Authorization gates verified | 4 / 4 |
| Fabricated data sources removed | 12 |
| Files de-hardcoded of tenant literal | 53 |
| Tenant filters added | 139 (74 raw SQL, 65 Prisma) |
| Subtitles removed | 76 |
| UI strings rewritten | ~330 |
| "PostgreSQL" in UI copy | 0 |
| Write pathways created | 14 |
| Code comments in authored files | 0 |

---

## Open items

1. **Correct the legal-gate e2e test** — currently asserts nothing (see Phase E finding).
2. **Update and delete pathways.** Record creation is now complete across every master entity;
   editing and retiring records is still limited to approval-drawer status transitions.
3. **CSV bulk import** — not built; highest value for stock and customer registers.
4. **`master_employee` vs `hr_employees`** — two unsynchronised workforce tables. Bookings, DPR and
   inspections reference one; the HR directory UI writes the other. Consolidation is a data-model
   decision, flagged rather than forced.
5. **Schema drift** — `quality_ncr_reports` and `construction_wbs_milestones` lack the `id` default
   in the live database despite their migration declaring `gen_random_uuid()`. Inserts now generate
   ids explicitly; the drift should be corrected in a migration.
6. **Lint baseline** — `npx eslint src` reports 418 pre-existing problems (`react-hooks/set-state-in-effect`,
   `no-explicit-any`). Untouched by this audit; worth a separate pass.
