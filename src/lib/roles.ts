export const ROLE_HIERARCHY = [
    "viewer",
    "outreach",
    "analyst",
    "admin",
    "super_admin",
] as const;

export type Role = (typeof ROLE_HIERARCHY)[number];

export function hasRole(userRole: Role, minRole: Role): boolean {
    return ROLE_HIERARCHY.indexOf(userRole) >= ROLE_HIERARCHY.indexOf(minRole);
}

// Minimum role required to access each page.
// analyst slot is reserved; treated as admin for all current page gates.
export const PAGE_MIN_ROLES: Record<string, Role> = {
    "/dashboard": "viewer",
    "/dashboard/permits": "viewer",
    "/dashboard/help": "viewer",
    "/dashboard/inbox": "outreach",
    "/dashboard/outreach": "admin",
    "/dashboard/analytics": "admin",
    "/dashboard/cbsa": "admin",
    "/dashboard/chat": "admin",
    "/dashboard/upload": "admin",
    "/dashboard/economic": "admin",
    "/dashboard/contractors": "outreach",
    "/dashboard/counties": "admin",
    "/dashboard/trades": "admin",
    "/dashboard/datasources": "admin",
    "/dashboard/settings": "admin",
    "/dashboard/settings/lead-banks": "super_admin",
    "/dashboard/settings/permit-scoring": "super_admin",
    "/dashboard/settings/users": "super_admin",
    "/dashboard/settings/devices": "super_admin",
    "/dashboard/settings/agents": "super_admin",
    "/dashboard/warmup": "admin",
};
