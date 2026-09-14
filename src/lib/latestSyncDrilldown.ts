/**
 * URL builder for the Dashboard "Latest Sync" card drill-down into Permit
 * Records — pulled out of app/dashboard/page.tsx as a pure function so it's
 * unit-testable without rendering the Dashboard page.
 *
 * Every card links on the SAME two things: the persisted sync_log_id (the
 * exact APISyncLog run — never a date range, see PermitRecord.sync_log_id's
 * doc comment on the backend) and agency_id (Data Source context, so the
 * destination page's existing "Data Source" filter chip stays visible and
 * accurate). Only `qualification` differs per card, reusing Permit
 * Records' own qualified/invalid states (app/services/permit_qualification.py)
 * rather than inventing a parallel definition.
 */
export interface LatestSyncCardSource {
    sync_log_id: string;
    agency_id: string;
}

export function latestSyncHref(
    sync: LatestSyncCardSource,
    qualification?: 'qualified' | 'invalid',
): string {
    const params = new URLSearchParams({ sync_log_id: sync.sync_log_id, agency_id: sync.agency_id });
    if (qualification) params.set('qualification', qualification);
    return `/dashboard/permits?${params.toString()}`;
}
