# REOS REOS — Schema-to-UI Gap Analysis

Scope: `apps/web` — 113 API routes, 24 pages, 133 components, PostgreSQL `avenue_reos`.
Method: every route handler was cross-referenced against the tables it touches and against every
`fetch` / service call / form endpoint in the UI layer. Live database columns were read from
`information_schema` rather than inferred from migrations.

---

## 1. Orphaned schemas discovered

### 1.1 Registers read by the platform but created by nothing

Five routes queried tables that existed in no migration and in no runtime `CREATE TABLE`. Every read
threw, every error was swallowed by a bare `catch`, and each screen rendered permanently empty with no
indication anything was wrong.

| Table | Read by | Status |
|---|---|---|
| `facility_assets` | `/api/v1/facility/assets` | Created, tenant-scoped, write path added |
| `maintenance_tickets` | `/api/v1/facility/tickets` | Created, tenant-scoped, write path added |
| `rera_compliances` | `/api/v1/legal/rera` | Created, tenant-scoped, write path added |
| `title_search_logs` | `/api/v1/legal/title-searches` | Created, tenant-scoped, write path added |
| `warehouse_inventory` | `/api/v1/procurement/inventory` | Created, tenant-scoped, write path added |

### 1.2 Queries against non-existent columns

`/api/v1/search` selected `customer_name` and `unit_name` from `sales_bookings` — neither column
exists; the real schema stores `customer_id` and `unit_id`. The same route queried
`construction_ra_bills`, which does not exist (the table is `contractor_ra_bills`). Record search
therefore returned zero business records since inception, silently. Both queries were rewritten with
proper joins; record search now returns live bookings and contractor bills.

### 1.3 Master records with no creation pathway

| Entity | Table | Gap | Remediation |
|---|---|---|---|
| Customers | `master_customer` | No route at all; rows only appeared as a side effect of booking creation | `/api/v1/crm/customers` (GET/POST) + registration form in CRM workspace |
| Vendors / Contractors | `master_vendor` | Read-only route | POST added + registration form in Vendor Directory |
| Chart of accounts | `master_chart_of_accounts` | Read-only route; rows previously self-seeded | POST added + form in General Ledger |
| Cost centres | `master_cost_center` | Read-only route; rows previously self-seeded | POST added + form in Budget Management |
| Work breakdown milestones | `construction_wbs_milestones` | Read-only route | POST added + form in WBS view |
| Quality inspections | `quality_ncr_reports` | Read-only route | POST added + form in Quality & Safety view |
| Performance objectives | `hr_performance_goals` | Read-only route | POST added + form in Performance view |
| Facility assets / equipment | `facility_assets` | No table, no write | Table + POST + form |
| Service tickets | `maintenance_tickets` | No table, no write | Table + POST + form |
| Materials / stock | `warehouse_inventory` | No table, no write | Table + POST + form |
| MahaRERA filings | `rera_compliances` | No table, no write | Table + POST + form |
| Title searches | `title_search_logs` | No table, no write | Table + POST + form |
| Disbursement vouchers | `finance_vouchers` | POST existed but no UI reached it | "Raise Disbursement" form in the CFO queue |
| Device sessions | `system_user_sessions` | Endpoint returned a hardcoded device array | Table + tenant-scoped read + revoke |

### 1.4 Selection lists with no master data behind them

Departments, unit typologies, facing directions, parking allocations, workforce types, site
locations, ticket categories, asset categories, material categories and prospect sources were
hardcoded `<SelectItem>` literals across ten modals — unmaintainable by the business and inconsistent
between screens.

Remediation: `master_catalog_options` (tenant-scoped, unique per category/value, soft-retire via
status) with `/api/v1/settings/catalog` (GET/POST/DELETE), a `useCatalogOptions` hook, a
`CatalogSelect` component, and a **Reference Lists** tab under Settings for business maintenance.
`/api/v1/settings/catalog/sync` derives entries from existing records — values come from live data,
never from invented defaults. Twelve hardcoded dropdown blocks now read from this register.

---

## 2. Input pathways created

New endpoints:

- `/api/v1/crm/customers` — GET, POST
- `/api/v1/settings/catalog` — GET, POST, DELETE
- `/api/v1/settings/catalog/sync` — POST
- POST added to: `procurement/vendors`, `procurement/inventory`, `finance/accounts`,
  `finance/cost-centers`, `facility/assets`, `facility/tickets`, `legal/rera`,
  `legal/title-searches`, `construction/wbs`, `construction/inspections`, `hr/performance`

New UI components:

- `RecordFormModal` — config-driven record entry (text, number, date, textarea, select, catalog,
  checkbox), used by twelve registers so entry behaves identically everywhere
- `CatalogSelect` + `useCatalogOptions` — reference-list-backed dropdowns
- `ReferenceListsView` — Settings tab for maintaining every selection list

Views given a create pathway: Facility Assets, Service Tickets, MahaRERA Compliance, Title &
Litigation, Warehouse Inventory, Vendor Directory, WBS Milestones, Quality & Safety, Performance &
Training, General Ledger (accounts), Budget Management (cost centres), CRM (customers), CFO
Disbursements (vouchers).

Every new write handler validates required fields and returns a `400` with business wording instead
of substituting defaults. Every one was exercised against the live database and verified; the test
rows were then removed.

---

## 3. Entity map — ingestion to display

| Master entity | Table | Create | Read | Surfaced in |
|---|---|---|---|---|
| Project | `master_project` | Project modals (3) | `/api/v1/projects` | CRM, Construction, Finance, Analytics |
| Unit | `master_unit` | Blueprint matrix, single unit | `/api/v1/units` | CRM inventory grid, spec sheet |
| Customer | `master_customer` | Customer form, booking flow | `/api/v1/crm/customers` | CRM, bookings, search |
| Prospect | `crm_leads` | Lead capture form | `/api/v1/crm/leads` | CRM pipeline |
| Booking | `sales_bookings` | Quotation modal | `/api/v1/sales/bookings` | CRM, Finance, search |
| Employee | `master_employee` / `hr_employees` | Employee modal | `/api/v1/hr/employees` | HR directory, sales rep and inspector pickers |
| Vendor / Contractor | `master_vendor` | Vendor form | `/api/v1/procurement/vendors` | Procurement, quality inspections |
| Material | `warehouse_inventory` | Stock form | `/api/v1/procurement/inventory` | Warehouse view |
| Equipment | `facility_assets` | Asset form | `/api/v1/facility/assets` | Facility assets |
| Ledger account | `master_chart_of_accounts` | Account form | `/api/v1/finance/accounts` | Journal posting, ledger |
| Cost centre | `master_cost_center` | Cost centre form | `/api/v1/finance/cost-centers` | Budgets, journal posting |
| Budget head | `budget_heads` | Budget form | `/api/v1/finance/budgets` | Budget variance |
| WBS milestone | `construction_wbs_milestones` | Milestone form | `/api/v1/construction/wbs` | Construction WBS |
| Site progress | `daily_progress_reports` | DPR modal | `/api/v1/construction/dpr` | Daily progress |
| Contractor bill | `contractor_ra_bills` | RA bill modal | `/api/v1/construction/ra-bills` | Contractor bills, approvals |
| Inspection | `quality_ncr_reports` | Inspection form | `/api/v1/construction/inspections` | Quality & safety |
| Land parcel | `land_parcels` | Land acquisition modal | `/api/v1/legal/parcels` | Land bank |
| Reference list | `master_catalog_options` | Reference Lists tab | `/api/v1/settings/catalog` | Every dropdown |

---

## 4. Read-only by design (not gaps)

These routes have no write handler because the records are produced by the platform, not typed by a
user: AI microservice outputs (`ai_*`), approval queues (derived from their source records),
MCP registries and execution logs, integration webhook logs, audit trail (`audit_trail_logs`, WORM),
event stream, dashboard and analytics aggregates, system health probes, and global search.

---

## 5. Remaining open items

1. **Update and delete pathways.** This pass closed record *creation* across every master entity.
   Editing and retiring records is still limited to the status transitions the approval drawers
   perform. A generic edit path per register is the natural next step.
2. **CSV bulk import.** Not built. Highest value for `warehouse_inventory` and `master_customer`,
   where volume entry is realistic.
3. **Reference lists start empty.** "Import From Existing Records" seeds them from live data; a
   tenant with an empty database must add entries manually before the dependent dropdowns populate.
   This is deliberate — the alternative is shipping invented defaults.
4. **`master_employee` vs `hr_employees`.** Two workforce tables coexist: the migration-defined
   `master_employee` (referenced by bookings, DPR, inspections) and the route-created `hr_employees`
   (backing the HR directory UI). They are not synchronised. Consolidating them is a data-model
   decision, not a UI fix, so it is flagged rather than forced.
5. **`quality_ncr_reports` and `construction_wbs_milestones` lack an `id` default** in the live
   database despite the migration declaring `gen_random_uuid()`. Inserts now generate the id
   explicitly; the schema drift itself should be corrected in a migration.
