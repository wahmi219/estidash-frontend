import { describe, expect, it } from 'vitest';
import { latestSyncHref } from './latestSyncDrilldown';

const SYNC = { sync_log_id: '45566db8-274f-4637-b1fb-c43f26662542', agency_id: 'b3f633bb-e6c5-4280-8495-0a4174c05164' };

describe('latestSyncHref (Latest Sync Dashboard Drill-Down)', () => {
    it('New Permits card: links to Permit Records scoped to the sync batch, no qualification filter', () => {
        const href = latestSyncHref(SYNC);
        expect(href).toBe(
            `/dashboard/permits?sync_log_id=${SYNC.sync_log_id}&agency_id=${SYNC.agency_id}`,
        );
        // No qualification param at all for the New Permits card — it must
        // show every permit from the batch, not a subset.
        expect(href).not.toContain('qualification');
    });

    it('Qualified New card: adds qualification=qualified', () => {
        const href = latestSyncHref(SYNC, 'qualified');
        const params = new URL(href, 'http://test').searchParams;
        expect(params.get('sync_log_id')).toBe(SYNC.sync_log_id);
        expect(params.get('agency_id')).toBe(SYNC.agency_id);
        expect(params.get('qualification')).toBe('qualified');
    });

    it('Invalid / Excluded New card: adds qualification=invalid', () => {
        const href = latestSyncHref(SYNC, 'invalid');
        const params = new URL(href, 'http://test').searchParams;
        expect(params.get('sync_log_id')).toBe(SYNC.sync_log_id);
        expect(params.get('agency_id')).toBe(SYNC.agency_id);
        expect(params.get('qualification')).toBe('invalid');
    });

    it('always uses the persisted sync_log_id identity, never a date parameter', () => {
        const href = latestSyncHref(SYNC, 'qualified');
        expect(href).not.toMatch(/start_date|end_date|added_start_date|added_end_date|date=/);
    });

    it('preserves Data Source context via agency_id on every card variant', () => {
        for (const qualification of [undefined, 'qualified', 'invalid'] as const) {
            const params = new URL(latestSyncHref(SYNC, qualification), 'http://test').searchParams;
            expect(params.get('agency_id')).toBe(SYNC.agency_id);
        }
    });
});
