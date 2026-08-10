export interface RolePermissionRule {
  roleName: string;
  allowedPrefixes: string[];
  homeRoute: string;
}

export const ROLE_PERMISSIONS: Record<string, RolePermissionRule> = {
  "Governance Director": {
    roleName: "Governance Director",
    allowedPrefixes: ["*"],
    homeRoute: "/",
  },
  "Super Admin": {
    roleName: "Super Admin",
    allowedPrefixes: ["*"],
    homeRoute: "/",
  },
  "SUPER_ADMIN": {
    roleName: "SUPER_ADMIN",
    allowedPrefixes: ["*"],
    homeRoute: "/",
  },
  "Sales Specialist": {
    roleName: "Sales Specialist",
    allowedPrefixes: ["/", "/crm", "/communications", "/profile"],
    homeRoute: "/crm",
  },
  "Sales Executive": {
    roleName: "Sales Executive",
    allowedPrefixes: ["/", "/crm", "/communications", "/profile"],
    homeRoute: "/crm",
  },
  "Sales Lead": {
    roleName: "Sales Lead",
    allowedPrefixes: ["/", "/crm", "/communications", "/profile"],
    homeRoute: "/crm",
  },
  "Finance Lead": {
    roleName: "Finance Lead",
    allowedPrefixes: ["/", "/finance", "/finance/tally", "/analytics", "/communications", "/profile"],
    homeRoute: "/finance",
  },
  "Accountant": {
    roleName: "Accountant",
    allowedPrefixes: ["/", "/finance", "/finance/tally", "/analytics", "/communications", "/profile"],
    homeRoute: "/finance",
  },
  "Auditor": {
    roleName: "Auditor",
    allowedPrefixes: ["/", "/finance", "/finance/tally", "/analytics", "/communications", "/profile"],
    homeRoute: "/finance",
  },
  "Site Engineer": {
    roleName: "Site Engineer",
    allowedPrefixes: ["/", "/construction", "/procurement", "/facility", "/communications", "/profile"],
    homeRoute: "/construction",
  },
  "Construction Manager": {
    roleName: "Construction Manager",
    allowedPrefixes: ["/", "/construction", "/procurement", "/facility", "/communications", "/profile"],
    homeRoute: "/construction",
  },
  "HR Manager": {
    roleName: "HR Manager",
    allowedPrefixes: ["/", "/hr", "/communications", "/profile"],
    homeRoute: "/hr",
  },
  "HR Lead": {
    roleName: "HR Lead",
    allowedPrefixes: ["/", "/hr", "/communications", "/profile"],
    homeRoute: "/hr",
  },
  "Legal Lead": {
    roleName: "Legal Lead",
    allowedPrefixes: ["/", "/legal", "/communications", "/profile"],
    homeRoute: "/legal",
  },
  "Regulatory Officer": {
    roleName: "Regulatory Officer",
    allowedPrefixes: ["/", "/legal", "/communications", "/profile"],
    homeRoute: "/legal",
  },
};

export function isRouteAllowedForRole(role: string | undefined | null, pathname: string): boolean {
  if (!role || role === "Governance Director" || role === "Super Admin" || role === "SUPER_ADMIN") {
    return true;
  }

  const rule = ROLE_PERMISSIONS[role];
  if (!rule) {
    return true;
  }

  if (rule.allowedPrefixes.includes("*")) {
    return true;
  }

  if (pathname === "/") {
    return true;
  }

  return rule.allowedPrefixes.some((prefix) => {
    if (prefix === "/") return false;
    return pathname === prefix || pathname.startsWith(`${prefix}/`);
  });
}

export function getHomeRouteForRole(role: string | undefined | null): string {
  if (!role) return "/";
  const rule = ROLE_PERMISSIONS[role];
  return rule ? rule.homeRoute : "/";
}
