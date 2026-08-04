export interface DepartmentDefinition {
  title: string;
  href: string;
  scopeTag: string;
  iconName: string;
  description: string;
}

export const PLATFORM_DEPARTMENTS: DepartmentDefinition[] = [
  {
    title: "CRM & Sales Management",
    href: "/crm",
    scopeTag: "Real Estate Sales",
    iconName: "TrendingUp",
    description: "Prospect pipelines, tower inventory, commercial quotations and booking authorizations.",
  },
  {
    title: "Finance & Accounting",
    href: "/finance",
    scopeTag: "Financial Control",
    iconName: "DollarSign",
    description: "General ledger, cost centre budgets, escrow positions and executive disbursements.",
  },
  {
    title: "Construction & Sites",
    href: "/construction",
    scopeTag: "Site Operations",
    iconName: "HardHat",
    description: "Work breakdown milestones, daily site progress, contractor bills and quality audits.",
  },
  {
    title: "Procurement & Materials",
    href: "/procurement",
    scopeTag: "Supply Chain",
    iconName: "Package",
    description: "Purchase orders, goods receipts, warehouse stock balances and approved vendors.",
  },
  {
    title: "Property & Facility",
    href: "/facility",
    scopeTag: "Asset Lifecycle",
    iconName: "Key",
    description: "Possession handovers, maintenance billing, service requests and asset contracts.",
  },
  {
    title: "Land & Regulatory Legal",
    href: "/legal",
    scopeTag: "Compliance & Land",
    iconName: "Scale",
    description: "Land parcels, joint development agreements, MahaRERA filings and title searches.",
  },
  {
    title: "HR & Payroll",
    href: "/hr",
    scopeTag: "Workforce Ops",
    iconName: "Users",
    description: "Workforce directory, site attendance, statutory payroll and performance objectives.",
  },
  {
    title: "Team Communications",
    href: "/communications",
    scopeTag: "Workplace Hub",
    iconName: "MessageSquare",
    description: "Department channels, buyer support desk, dispute escalations and interaction history.",
  },
  {
    title: "Executive Analytics",
    href: "/analytics",
    scopeTag: "Intelligence",
    iconName: "BarChart3",
    description: "Portfolio valuation, liquidity forecasts, project returns and enterprise risk scoring.",
  },
  {
    title: "System Administration",
    href: "/settings",
    scopeTag: "Governance",
    iconName: "Settings",
    description: "Organisation profile, user access, reference lists, security policy and audit trail.",
  },
  {
    title: "System Diagnostics",
    href: "/system-status",
    scopeTag: "SRE Health",
    iconName: "Activity",
    description: "Platform health, data service diagnostics, event stream and authorization audit.",
  },
  {
    title: "AI Agent Governance",
    href: "/mcp",
    scopeTag: "MCP Protocol",
    iconName: "Cpu",
    description: "Registered agent tools, active sessions, execution history and intercepted actions.",
  },
  {
    title: "Domain AI Services",
    href: "/ai-intelligence",
    scopeTag: "Native AI",
    iconName: "Sparkles",
    description: "Meeting records, deed drafting, site safety review and commodity price advisory.",
  },
  {
    title: "External Integrations",
    href: "/integrations",
    scopeTag: "API Connectors",
    iconName: "Globe",
    description: "Accounting sync, payment reconciliation, messaging dispatch and site hardware feeds.",
  },
];
