export interface RoleModuleInfo {
  moduleName: string;
  homeRoute: string;
  category: string;
  description: string;
  badge?: string;
}

export interface RolePermissionRule {
  roleName: string;
  aliases?: string[];
  defaultModule: RoleModuleInfo;
  homeRoute: string;
  allowedPrefixes: string[];
}

// Core Platform Module Definitions
export const CORE_MODULES: Record<string, RoleModuleInfo> = {
  DASHBOARD: {
    moduleName: "Dashboard Overview",
    homeRoute: "/",
    category: "COMMERCIAL & FINANCE",
    description: "Executive and portfolio summary dashboard",
  },
  CRM: {
    moduleName: "CRM & Sales",
    homeRoute: "/crm",
    category: "COMMERCIAL & FINANCE",
    description: "Customer relations, leads, unit bookings, and payment schedules",
  },
  FINANCE: {
    moduleName: "Finance & Accounting",
    homeRoute: "/finance",
    category: "COMMERCIAL & FINANCE",
    description: "Ledgers, disbursements, cash flow statements, and balance sheets",
  },
  TALLY: {
    moduleName: "Tally ERP Subsystem",
    homeRoute: "/finance/tally",
    category: "COMMERCIAL & FINANCE",
    description: "Chart of accounts, vouchers, and ERP ledger sync",
    badge: "Tally",
  },
  CONSTRUCTION: {
    moduleName: "Sites & WBS Execution",
    homeRoute: "/construction",
    category: "OPERATIONS & SITES",
    description: "Site operations, DPR logs, WBS milestones, and contractor RA bills",
  },
  PROCUREMENT: {
    moduleName: "Procurement & Materials",
    homeRoute: "/procurement",
    category: "OPERATIONS & SITES",
    description: "Purchase orders, material requisitions, and inventory stock",
  },
  FACILITY: {
    moduleName: "Property & Facility",
    homeRoute: "/facility",
    category: "OPERATIONS & SITES",
    description: "Property management, CAM invoices, and maintenance tickets",
  },
  HR: {
    moduleName: "HR & Payroll",
    homeRoute: "/hr",
    category: "COMMERCIAL & FINANCE",
    description: "Employee directory, biometric attendance, and payroll runs",
  },
  LEGAL: {
    moduleName: "Land Bank & Legal",
    homeRoute: "/legal",
    category: "GOVERNANCE & STRATEGY",
    description: "Land parcel records, title deeds, and RERA compliance filings",
  },
  ANALYTICS: {
    moduleName: "Executive Analytics",
    homeRoute: "/analytics",
    category: "GOVERNANCE & STRATEGY",
    description: "Executive valuation, portfolio IRR, and cost variance analytics",
  },
  MCP: {
    moduleName: "AI Agent Governance",
    homeRoute: "/mcp",
    category: "SYSTEM & ECOSYSTEM",
    description: "Autonomous AI agents, tool registry, and security execution logs",
    badge: "MCP",
  },
  AI_INTELLIGENCE: {
    moduleName: "Domain AI Services",
    homeRoute: "/ai-intelligence",
    category: "SYSTEM & ECOSYSTEM",
    description: "MOM transcription, computer vision safety, and pricing intelligence",
  },
  INTEGRATIONS: {
    moduleName: "External Integrations",
    homeRoute: "/integrations",
    category: "SYSTEM & ECOSYSTEM",
    description: "External ERP connectors, SAP bridges, and payment gateways",
  },
  USERS: {
    moduleName: "User Directory",
    homeRoute: "/users",
    category: "SYSTEM & ECOSYSTEM",
    description: "RBAC matrix, employee profiles, and access authorization",
  },
  PROFILE: {
    moduleName: "My Profile",
    homeRoute: "/profile",
    category: "SYSTEM & ECOSYSTEM",
    description: "User security settings, credentials, and active sessions",
  },
  SETTINGS: {
    moduleName: "System Administration",
    homeRoute: "/settings",
    category: "SYSTEM & ECOSYSTEM",
    description: "System parameters, tenant configuration, and audit logging",
  },
  SYSTEM_STATUS: {
    moduleName: "System Diagnostics",
    homeRoute: "/system-status",
    category: "SYSTEM & ECOSYSTEM",
    description: "Platform health status, database telemetry, and connectivity",
  },
};

export const DEFAULT_FALLBACK_MODULE: RoleModuleInfo = CORE_MODULES.DASHBOARD;

export const ROLE_PERMISSIONS: Record<string, RolePermissionRule> = {
  "Governance Director": {
    roleName: "Governance Director",
    aliases: ["GOVERNANCE_DIRECTOR", "governance_director", "director", "Executive Director"],
    defaultModule: CORE_MODULES.DASHBOARD,
    homeRoute: CORE_MODULES.DASHBOARD.homeRoute,
    allowedPrefixes: ["*"],
  },
  "Super Admin": {
    roleName: "Super Admin",
    aliases: ["super_admin", "superadmin", "super admin", "admin", "ADMIN", "Administrator"],
    defaultModule: CORE_MODULES.DASHBOARD,
    homeRoute: CORE_MODULES.DASHBOARD.homeRoute,
    allowedPrefixes: ["*"],
  },
  "SUPER_ADMIN": {
    roleName: "SUPER_ADMIN",
    aliases: [],
    defaultModule: CORE_MODULES.DASHBOARD,
    homeRoute: CORE_MODULES.DASHBOARD.homeRoute,
    allowedPrefixes: ["*"],
  },
  "System Administrator": {
    roleName: "System Administrator",
    aliases: ["SYSTEM_ADMINISTRATOR", "system_administrator", "sysadmin", "system admin"],
    defaultModule: CORE_MODULES.SETTINGS,
    homeRoute: CORE_MODULES.SETTINGS.homeRoute,
    allowedPrefixes: ["*"],
  },
  "Project Director": {
    roleName: "Project Director",
    aliases: ["PROJECT_DIRECTOR", "project_director"],
    defaultModule: CORE_MODULES.DASHBOARD,
    homeRoute: CORE_MODULES.DASHBOARD.homeRoute,
    allowedPrefixes: ["*"],
  },
  "Board Member": {
    roleName: "Board Member",
    aliases: ["BOARD_MEMBER", "board_member", "executive", "investor", "Board Director"],
    defaultModule: CORE_MODULES.ANALYTICS,
    homeRoute: CORE_MODULES.ANALYTICS.homeRoute,
    allowedPrefixes: ["/", "/analytics", "/finance", "/crm", "/communications", "/profile"],
  },
  "Sales Specialist": {
    roleName: "Sales Specialist",
    aliases: ["SALES_SPECIALIST", "sales_specialist", "sales", "sales rep", "Sales Associate"],
    defaultModule: CORE_MODULES.CRM,
    homeRoute: CORE_MODULES.CRM.homeRoute,
    allowedPrefixes: ["/", "/crm", "/communications", "/profile"],
  },
  "Sales Executive": {
    roleName: "Sales Executive",
    aliases: ["SALES_EXECUTIVE", "sales_executive"],
    defaultModule: CORE_MODULES.CRM,
    homeRoute: CORE_MODULES.CRM.homeRoute,
    allowedPrefixes: ["/", "/crm", "/communications", "/profile"],
  },
  "Sales Lead": {
    roleName: "Sales Lead",
    aliases: ["SALES_LEAD", "sales_lead"],
    defaultModule: CORE_MODULES.CRM,
    homeRoute: CORE_MODULES.CRM.homeRoute,
    allowedPrefixes: ["/", "/crm", "/communications", "/profile"],
  },
  "Sales Manager": {
    roleName: "Sales Manager",
    aliases: ["SALES_MANAGER", "sales_manager", "SalesDirector", "sales_director", "Commercial Lead"],
    defaultModule: CORE_MODULES.CRM,
    homeRoute: CORE_MODULES.CRM.homeRoute,
    allowedPrefixes: ["/", "/crm", "/communications", "/profile"],
  },
  "Finance Lead": {
    roleName: "Finance Lead",
    aliases: ["FINANCE_LEAD", "finance_lead"],
    defaultModule: CORE_MODULES.FINANCE,
    homeRoute: CORE_MODULES.FINANCE.homeRoute,
    allowedPrefixes: ["/", "/finance", "/finance/tally", "/analytics", "/ai-intelligence", "/communications", "/profile"],
  },
  "Finance Manager": {
    roleName: "Finance Manager",
    aliases: ["FINANCE_MANAGER", "finance_manager", "ExecutiveCFO", "executive_cfo", "cfo", "CFO", "Chief Financial Officer"],
    defaultModule: CORE_MODULES.FINANCE,
    homeRoute: CORE_MODULES.FINANCE.homeRoute,
    allowedPrefixes: ["/", "/finance", "/finance/tally", "/analytics", "/ai-intelligence", "/communications", "/profile"],
  },
  "Accountant": {
    roleName: "Accountant",
    aliases: ["ACCOUNTANT", "accountant", "bookkeeper", "Senior Accountant", "Accounts Officer"],
    defaultModule: CORE_MODULES.FINANCE,
    homeRoute: CORE_MODULES.FINANCE.homeRoute,
    allowedPrefixes: ["/", "/finance", "/finance/tally", "/analytics", "/ai-intelligence", "/communications", "/profile"],
  },
  "Auditor": {
    roleName: "Auditor",
    aliases: ["AUDITOR", "auditor", "Internal Auditor", "Tax Auditor"],
    defaultModule: CORE_MODULES.FINANCE,
    homeRoute: CORE_MODULES.FINANCE.homeRoute,
    allowedPrefixes: ["/", "/finance", "/finance/tally", "/analytics", "/ai-intelligence", "/communications", "/profile"],
  },
  "Site Engineer": {
    roleName: "Site Engineer",
    aliases: ["SITE_ENGINEER", "site_engineer", "engineer", "field_engineer", "Civil Engineer"],
    defaultModule: CORE_MODULES.CONSTRUCTION,
    homeRoute: CORE_MODULES.CONSTRUCTION.homeRoute,
    allowedPrefixes: ["/", "/construction", "/procurement", "/facility", "/ai-intelligence", "/communications", "/profile"],
  },
  "Construction Manager": {
    roleName: "Construction Manager",
    aliases: ["CONSTRUCTION_MANAGER", "construction_manager", "Project Manager", "Site Supervisor"],
    defaultModule: CORE_MODULES.CONSTRUCTION,
    homeRoute: CORE_MODULES.CONSTRUCTION.homeRoute,
    allowedPrefixes: ["/", "/construction", "/procurement", "/facility", "/ai-intelligence", "/communications", "/profile"],
  },
  "Procurement Manager": {
    roleName: "Procurement Manager",
    aliases: ["PROCUREMENT_MANAGER", "procurement_manager", "Supply Chain Manager", "Materials Manager"],
    defaultModule: CORE_MODULES.PROCUREMENT,
    homeRoute: CORE_MODULES.PROCUREMENT.homeRoute,
    allowedPrefixes: ["/", "/procurement", "/construction", "/facility", "/communications", "/profile"],
  },
  "Procurement Lead": {
    roleName: "Procurement Lead",
    aliases: ["PROCUREMENT_LEAD", "procurement_lead", "Purchase Officer"],
    defaultModule: CORE_MODULES.PROCUREMENT,
    homeRoute: CORE_MODULES.PROCUREMENT.homeRoute,
    allowedPrefixes: ["/", "/procurement", "/construction", "/facility", "/communications", "/profile"],
  },
  "Facility Manager": {
    roleName: "Facility Manager",
    aliases: ["FACILITY_MANAGER", "facility_manager", "property_manager", "Property Manager", "Estate Manager"],
    defaultModule: CORE_MODULES.FACILITY,
    homeRoute: CORE_MODULES.FACILITY.homeRoute,
    allowedPrefixes: ["/", "/facility", "/procurement", "/construction", "/communications", "/profile"],
  },
  "HR Manager": {
    roleName: "HR Manager",
    aliases: ["HR_MANAGER", "hr_manager", "People Operations Manager"],
    defaultModule: CORE_MODULES.HR,
    homeRoute: CORE_MODULES.HR.homeRoute,
    allowedPrefixes: ["/", "/hr", "/communications", "/profile"],
  },
  "HR Lead": {
    roleName: "HR Lead",
    aliases: ["HR_LEAD", "hr_lead", "Talent Lead"],
    defaultModule: CORE_MODULES.HR,
    homeRoute: CORE_MODULES.HR.homeRoute,
    allowedPrefixes: ["/", "/hr", "/communications", "/profile"],
  },
  "HR Specialist": {
    roleName: "HR Specialist",
    aliases: ["HR_SPECIALIST", "hr_specialist", "HR Executive"],
    defaultModule: CORE_MODULES.HR,
    homeRoute: CORE_MODULES.HR.homeRoute,
    allowedPrefixes: ["/", "/hr", "/communications", "/profile"],
  },
  "Legal Lead": {
    roleName: "Legal Lead",
    aliases: ["LEGAL_LEAD", "legal_lead", "General Counsel"],
    defaultModule: CORE_MODULES.LEGAL,
    homeRoute: CORE_MODULES.LEGAL.homeRoute,
    allowedPrefixes: ["/", "/legal", "/ai-intelligence", "/communications", "/profile"],
  },
  "Legal Counsel": {
    roleName: "Legal Counsel",
    aliases: ["LEGAL_COUNSEL", "legal_counsel", "lawyer", "attorney", "Corporate Counsel"],
    defaultModule: CORE_MODULES.LEGAL,
    homeRoute: CORE_MODULES.LEGAL.homeRoute,
    allowedPrefixes: ["/", "/legal", "/ai-intelligence", "/communications", "/profile"],
  },
  "Regulatory Officer": {
    roleName: "Regulatory Officer",
    aliases: ["REGULATORY_OFFICER", "regulatory_officer", "compliance_officer", "Compliance Officer", "RERA Specialist"],
    defaultModule: CORE_MODULES.LEGAL,
    homeRoute: CORE_MODULES.LEGAL.homeRoute,
    allowedPrefixes: ["/", "/legal", "/ai-intelligence", "/communications", "/profile"],
  },
};

/**
 * Normalizes a role string to find its matching system permission rule.
 * Handles uppercase/lowercase, spaces, underscores, and registered aliases.
 */
export function findRoleRule(role: string | undefined | null): RolePermissionRule | null {
  if (!role || typeof role !== "string") return null;
  const trimmed = role.trim();
  if (!trimmed) return null;

  // Direct exact match
  if (ROLE_PERMISSIONS[trimmed]) {
    return ROLE_PERMISSIONS[trimmed];
  }

  // Case-insensitive & punctuation-agnostic match
  const normalized = trimmed.toLowerCase().replace(/[_\-\s]+/g, " ").trim();
  for (const rule of Object.values(ROLE_PERMISSIONS)) {
    if (rule.roleName.toLowerCase().replace(/[_\-\s]+/g, " ").trim() === normalized) {
      return rule;
    }
    if (
      rule.aliases?.some(
        (alias) => alias.toLowerCase().replace(/[_\-\s]+/g, " ").trim() === normalized
      )
    ) {
      return rule;
    }
  }

  return null;
}

/**
 * Returns the default module descriptor for a given role at the core level.
 */
export function getDefaultModuleForRole(role: string | undefined | null): RoleModuleInfo {
  const rule = findRoleRule(role);
  if (rule) {
    return rule.defaultModule;
  }
  return DEFAULT_FALLBACK_MODULE;
}

/**
 * Returns the home navigation path for a given role.
 */
export function getHomeRouteForRole(role: string | undefined | null): string {
  return getDefaultModuleForRole(role).homeRoute;
}

/**
 * Checks whether an authenticated role has permission to access a given URL path.
 *
 * Guaranteed Invariants:
 * 1. Base routes ("/", "/profile", "/communications") are accessible to any authenticated user.
 * 2. Every role is ALWAYS permitted to access its designated defaultModule homeRoute.
 * 3. Wildcard roles have access to everything.
 */
export function isRouteAllowedForRole(role: string | undefined | null, pathname: string): boolean {
  if (!role) {
    return false;
  }

  const rule = findRoleRule(role);

  // Administrative wildcard roles have unrestricted access
  if (
    role === "Governance Director" ||
    role === "Super Admin" ||
    role === "SUPER_ADMIN" ||
    rule?.allowedPrefixes.includes("*")
  ) {
    return true;
  }

  // Baseline universal routes available to all authenticated users
  if (
    pathname === "/" ||
    pathname === "/profile" ||
    pathname.startsWith("/profile/") ||
    pathname === "/communications" ||
    pathname.startsWith("/communications/")
  ) {
    return true;
  }

  if (!rule) {
    // For unknown or custom roles, base routes above are allowed, others denied
    return false;
  }

  // Guaranteed access to the role's assigned default module
  if (
    pathname === rule.defaultModule.homeRoute ||
    pathname.startsWith(`${rule.defaultModule.homeRoute}/`)
  ) {
    return true;
  }

  return rule.allowedPrefixes.some((prefix) => {
    if (prefix === "/") return false;
    return pathname === prefix || pathname.startsWith(`${prefix}/`);
  });
}
