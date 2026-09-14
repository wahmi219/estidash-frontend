import { describe, expect, it } from 'vitest';
import permitsReducer, {
    setFilters,
    resetFilters,
    hydrateFromUrl,
    fetchPermits,
} from './permitsSlice';
import type { PermitsState, PermitSearchResponse } from '@/types';

function initial(): PermitsState {
    // permitsReducer's own initialState, obtained the same way Redux does —
    // dispatch an action the reducer doesn't recognize.
    return permitsReducer(undefined, { type: '@@INIT' });
}

const SYNC_BATCH = {
    sync_log_id: '45566db8-274f-4637-b1fb-c43f26662542',
    agency_id: 'b3f633bb-e6c5-4280-8495-0a4174c05164',
    source: 'Chicago Building Permits',
    completed_at: '2026-09-14T00:01:08.771780+00:00',
    status: 'success',
};

describe('permitsSlice — Latest Sync drill-down (EHUB Latest Sync Dashboard Drill-Down)', () => {
    it('initial state has no syncLogId filter and no syncBatch', () => {
        const state = initial();
        expect(state.filters.syncLogId).toBeNull();
        expect(state.syncBatch).toBeNull();
    });

    it('setFilters({ syncLogId }) sets the filter and resets to page 1', () => {
        let state = initial();
        state = permitsReducer(state, setFilters({ syncLogId: SYNC_BATCH.sync_log_id }));
        expect(state.filters.syncLogId).toBe(SYNC_BATCH.sync_log_id);
        expect(state.pagination.page).toBe(1);
    });

    it('clearing the filter (setFilters({ syncLogId: null })) restores normal Permit Records', () => {
        let state = initial();
        state = permitsReducer(state, setFilters({ syncLogId: SYNC_BATCH.sync_log_id }));
        state = permitsReducer(state, setFilters({ syncLogId: null }));
        expect(state.filters.syncLogId).toBeNull();
    });

    it('resetFilters() also clears syncLogId back to null', () => {
        let state = initial();
        state = permitsReducer(state, setFilters({ syncLogId: SYNC_BATCH.sync_log_id, qualification: 'qualified' }));
        state = permitsReducer(state, resetFilters());
        expect(state.filters.syncLogId).toBeNull();
        expect(state.filters.qualification).toBeNull();
    });

    it('hydrateFromUrl carries syncLogId into filters — reload/back/forward support', () => {
        let state = initial();
        state = permitsReducer(state, hydrateFromUrl({ filters: { syncLogId: SYNC_BATCH.sync_log_id } }));
        expect(state.filters.syncLogId).toBe(SYNC_BATCH.sync_log_id);
    });

    it('fetchPermits.fulfilled stores sync_batch from the response when the syncLogId filter is active', () => {
        let state = initial();
        state = permitsReducer(state, setFilters({ syncLogId: SYNC_BATCH.sync_log_id }));

        const response: PermitSearchResponse = {
            total: 11, limit: 100, offset: 0, data: [], sync_batch: SYNC_BATCH,
        };
        const action = fetchPermits.fulfilled(response, 'req-1', undefined);
        state = permitsReducer(state, action);

        expect(state.syncBatch).toEqual(SYNC_BATCH);
        expect(state.pagination.totalRecords).toBe(11);
    });

    it('fetchPermits.fulfilled clears syncBatch when the syncLogId filter is not active, even if a stale sync_batch is present on the payload', () => {
        let state = initial();
        // No syncLogId filter set — a normal, unfiltered Permit Records view.
        const response: PermitSearchResponse = {
            total: 5, limit: 100, offset: 0, data: [], sync_batch: SYNC_BATCH,
        };
        const action = fetchPermits.fulfilled(response, 'req-1', undefined);
        state = permitsReducer(state, action);

        expect(state.syncBatch).toBeNull();
    });

    it('qualification composes independently with the Latest Sync filter (Qualified New / Invalid Excluded New cards)', () => {
        let state = initial();
        state = permitsReducer(state, setFilters({ syncLogId: SYNC_BATCH.sync_log_id, qualification: 'qualified' }));
        expect(state.filters.syncLogId).toBe(SYNC_BATCH.sync_log_id);
        expect(state.filters.qualification).toBe('qualified');

        // Removing only the sync batch (the banner's "Clear Latest Sync
        // filter" button) must leave the qualification filter untouched —
        // each active-filter chip removes just its own facet.
        state = permitsReducer(state, setFilters({ syncLogId: null }));
        expect(state.filters.syncLogId).toBeNull();
        expect(state.filters.qualification).toBe('qualified');
    });
});
