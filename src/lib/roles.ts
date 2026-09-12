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
    // Phase 9.6 P1-7: these four pages had no AuthGuard floor at all
    // (resolveMinRole returned undefined -> any authenticated viewer could
    // load them), while every API call they make requires "admin" on the
    // backend -- an "outreach"-role employee could load the page, see the
    // sidebar link (Sidebar.tsx already lists all four at minRole:
    // 'outreach'), and get a 403 on every request. Backend roles for these
    // routers were lowered to "outreach" to match (see
    // docs/phase9_6_independent_audit_fixes.md P1-7); these entries now
    // match that floor exactly so frontend visibility == backend access.
    "/dashboard/contact-info-needed": "outreach",
    "/dashboard/ready-for-lead-bank": "outreach",
    "/dashboard/contractor-verification": "outreach",
    "/dashboard/outreach": "admin",
    "/dashboard/analytics": "admin",
    "/dashboard/cbsa": "admin",
    "/dashboard/chat": "admin",
    "/dashboard/upload": "admin",
    // Phase 9.7 P2-D: the sidebar's "Import Data" link (Sidebar.tsx,
    // minRole: 'admin') points here — this page had NO AuthGuard floor at
    // all (any authenticated viewer could load it), while its one real
    // action (POST /api/v1/upload-excel) requires "admin" on the backend.
    "/dashboard/import-data": "admin",
    "/dashboard/economic": "admin",
    "/dashboard/contractors": "outreach",
    "/dashboard/lead-bank": "outreach",
    "/dashboard/counties": "admin",
    "/dashboard/trades": "admin",
    "/dashboard/datasources": "admin",
    // /dashboard/settings now does nothing but redirect straight to
    // /dashboard/settings/permit-scoring (the only real MVP settings area) --
    // gated at the same super_admin level as that destination so an admin
    // (non-super-admin) never passes through it only to be bounced back out.
    "/dashboard/settings": "super_admin",
    "/dashboard/settings/lead-banks": "super_admin",
    "/dashboard/settings/permit-scoring": "super_admin",
    "/dashboard/settings/users": "super_admin",
    "/dashboard/settings/devices": "super_admin",
    "/dashboard/settings/agents": "super_admin",
    "/dashboard/warmup": "admin",
};

// Resolves the minimum role for a pathname, falling back from an exact
// PAGE_MIN_ROLES match to the longest matching path-segment prefix. This lets
// a dynamic/nested route (e.g. /dashboard/contractors/[id]) inherit its
// parent's requirement (/dashboard/contractors) without a separate entry,
// while an exact entry (e.g. /dashboard/settings/users) still wins over any
// shorter parent gate. Matches whole path segments only, so
// /dashboard/permitsxyz can never match /dashboard/permits.
export function resolveMinRole(pathname: string): Role | undefined {
    if (PAGE_MIN_ROLES[pathname]) return PAGE_MIN_ROLES[pathname];

    // Stop above i=1 so this never falls back to the bare top-level
    // "/dashboard" entry as a catch-all default for every unrelated nested
    // route -- only an explicit, more-specific parent entry (two or more
    // segments) can be inherited from.
    const segments = pathname.split('/').filter(Boolean);
    for (let i = segments.length - 1; i > 1; i--) {
        const prefix = '/' + segments.slice(0, i).join('/');
        if (PAGE_MIN_ROLES[prefix]) return PAGE_MIN_ROLES[prefix];
    }
    return undefined;
}
