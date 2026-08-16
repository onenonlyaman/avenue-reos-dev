# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Staff of Avenue Builders, a real-estate developer operating in Nashik, Maharashtra, India. The system is internal today and intended to be sold to other developers later, so no design decision should assume Avenue Builders specifically.

Access is role-based, and the roles in `src/lib/permissions.ts` are the real staff shape:

- **Governance Director / Super Admin** — full access; the only roles that can provision accounts, change settings, and read system diagnostics.
- **Sales Executive / Sales Specialist / Sales Lead** — CRM, sales bookings, customer communications. Home is `/crm`.
- **Finance Lead / Accountant / Auditor** — ledger, budgets, vouchers, the Tally subsystem, executive analytics. Home is `/finance`.
- **Site Engineer / Construction Manager** — WBS milestones, daily progress reports, RA bills, inspections, NCRs, procurement, facility. Home is `/construction`.
- **HR Manager / HR Lead** — employees, attendance, payroll, recruitment, performance. Home is `/hr`.
- **Legal Lead / Regulatory Officer** — land parcels, title searches, JDAs, RERA filings. Home is `/legal`.

Three usage scenes are all real and none is optional:

1. **Desktop, in the office.** Finance, sales, HR, and management staff on large screens, working through dense registers for long stretches. The dominant scene by volume.
2. **Phone, on a construction site.** Site engineers filing daily progress reports, inspections, and quality NCRs outdoors — sunlight glare, one hand occupied, unreliable signal, gloves or dust on the screen.
3. **Tablet, during walkthroughs.** Site walkthroughs, unit handovers, and customer-facing sessions where the screen is turned toward a third party.

## Product Purpose

REOS is a single operating system for a real-estate development business, replacing the spreadsheets and disconnected tools that otherwise sit between land acquisition and unit handover. One record of a project, a unit, a customer, a contractor, and a rupee, shared across every department that touches it.

Success is that staff run the business inside it daily rather than reconciling it against something else afterward.

## Positioning

Most construction and real-estate software covers one band well — accounting, or CRM, or site progress — and forces the rest into exports. REOS covers the full chain in one record model, and specifically covers the Indian regulatory and accounting reality (Tally, GST, TDS/MSME, RERA, JDAs) as first-class workflow rather than an export target.

The second differentiator is governed automation: AI services operate on domain data, but consequential actions route through explicit human-in-the-loop approval queues with an audit trail, rather than acting unsupervised.

## Operating Context

The business moves through a chain that the system mirrors: acquire land, clear title and regulatory standing, plan and build, sell units, collect and account, hand over, then operate the property. The modules are that chain, not a feature menu.

Named surfaces, all currently implemented:

| Area | Covers |
|---|---|
| Dashboard | Cross-module executive overview |
| CRM & Sales | Leads, customers, unit bookings, sales funnel |
| Finance & Accounting | Chart of accounts, general ledger, budgets, cost centers, vouchers, disbursement approvals |
| Tally ERP Subsystem | Vouchers, GST, TDS/MSME, e-BRS bank reconciliation, inventory godowns and BOM, financial reports |
| Construction & Sites | WBS milestones, daily progress reports, RA bills, inspections, quality NCRs |
| Procurement & Materials | Vendors, purchase orders, GRN, inventory |
| Property & Facility | Assets, CAM invoices, handovers, tickets |
| HR & Payroll | Employees, attendance, payroll, recruitment, performance |
| Team Communications | Channels, messages, customer timeline, support tickets |
| Land & Regulatory Legal | Parcels, title searches, JDAs, RERA |
| Executive Analytics | IRR, valuation, liquidity, risk |
| AI Agent Governance | Agent sessions, tool registry, invocation logs, approval queues |
| Domain AI Services | Risk/market, finance/procurement, construction safety, documents/legal |
| External Integrations | Connectors, hardware, communications, logs |
| Administration | User directory, roles, tenant settings, audit logs, diagnostics |

Domain terminology that is load-bearing and must be used exactly: **WBS** (work breakdown structure), **DPR** (daily progress report), **RA bill** (running account bill — progressive contractor payment), **NCR** (non-conformance report), **e-BRS** (electronic bank reconciliation statement), **JDA** (joint development agreement), **RERA** (Real Estate Regulatory Authority), **GRN** (goods receipt note), **CAM** (common area maintenance), **HITL** (human-in-the-loop approval), **cost center**, **godown**, **voucher**, **TDS**, **MSME**, **GST**.

Money is Indian rupees. Numbers appear in lakh and crore in business conversation.

## Capabilities and Constraints

Confirmed and committed, all four in active scope:

- **Tally ERP integration** — vouchers, GST, TDS/MSME, e-BRS bank reconciliation, chart of accounts. A genuine committed integration, not a placeholder.
- **RERA and land legal** — RERA compliance, title searches, JDAs, land parcels as real regulatory workflow.
- **AI agents, MCP, and HITL approval** — a differentiator intended to ship, not scaffolding.
- **Construction and site operations** — WBS, DPRs, RA bills, quality NCRs, inspections as real field workflow.

Technical constraints:

- Next.js 16 App Router with React 19, Tailwind v4, shadcn/Base UI components, Recharts, `lucide-react`. **This Next.js version has breaking changes from common training data — consult `node_modules/next/dist/docs/` before writing framework code.**
- PostgreSQL 16 accessed through Prisma. Schema is owned by forward-only files in `migrations/`; the application does not issue DDL in production.
- Every business register carries `tenant_id` and is filtered by it. One tenant is live today; the isolation is real and enforced, so no work may bypass it.
- Authentication is server-side sessions in `system_sessions` with an opaque httpOnly cookie. Identity is never taken from a request header. Page routes and API routes both authorize against the single `ROLE_PERMISSIONS` map, so navigation, page access, and API access cannot drift apart.
- The production host has 4 GB of RAM; the build runs with constrained worker parallelism. Heavy client bundles have a real cost here.

Open, undecided:

- Whether tenant-specific branding, onboarding, and billing are built when the product is sold externally. Today there is one tenant and no self-serve signup — registration creates a pending account an administrator must approve.

## Brand Commitments

- **The product name is REOS**, and it stays REOS if the product is later sold to other developers. It is not an Avenue Builders–specific name.

No logo, palette, typeface, or brand guideline has been made binding. The current interface styling — the `Corporate*` component family, the dense register tables, the present palette — was **not** confirmed as an intentional identity, so it is incumbent evidence rather than a commitment.

## Evidence on Hand

Real production data exists and is the honest basis for any interface work — no invented figures, customers, or staff:

- 212 units, 38 sales bookings, 26 CRM leads, 18 customers
- 32 general ledger entries, 12 chart-of-accounts records, 8 cost centers, 8 budget heads
- 28 daily progress reports, 24 WBS milestones, 22 contractor RA bills, 10 quality NCRs, 4 construction sites
- 12 employees, 10 vendors, 4 projects, 1 tenant profile
- 2 user accounts

**Absences future work must not fabricate:** there are no testimonials, case studies, press mentions, customer logos, benchmarks, pricing, or third-party endorsements. Earlier versions of this codebase invented staff records, a bank transaction, and green compliance readouts; that was removed and must not return. When a register is empty, the interface says so.

## Product Principles

1. **Show only what is true.** Every figure traces to a record. An empty register reads as empty, an unreachable service reads as unreachable, and an unknown value reads as unknown. Never a plausible placeholder.
2. **The chain is the product.** Land, build, sell, account, hand over, operate — one record shared across departments. Any screen that makes a module feel like a separate application is working against the reason the system exists.
3. **Role defines the surface.** A person sees the modules their role owns, and nothing else — in navigation, in pages, and in data. This is enforced, not decorative.
4. **The site is a first-class environment.** A daily progress report filed one-handed in sunlight on a phone with bad signal is a primary use, not a responsive afterthought.
5. **Consequential actions are governed.** Disbursements, approvals, and agent-initiated actions pass through explicit human decision points that leave an audit trail.
6. **Density serves the operator.** These users read registers all day. Legibility and scanning speed at real data volumes beat visual generosity.

## Accessibility & Inclusion

- **English only.** No localization is required; no other language was established as a need.
- Outdoor phone use in direct sunlight makes contrast and touch-target size a functional requirement for site workflows, not just a compliance target.
- No specific conformance standard (WCAG level or equivalent) has been committed. Recorded as undecided rather than assumed.
