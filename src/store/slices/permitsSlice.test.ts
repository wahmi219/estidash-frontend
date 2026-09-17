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

// ---------------------------------------------------------------------------
// Phase 11.12 H1 (Part T item 15) — a superseded search response can never
// be rendered.
//
// The audit reproduced this by typing a permit number: the table briefly
// showed a permit that did not match the query, while the same query loaded
// as a fresh URL returned the correct record. These tests drive the reducer
// directly with out-of-order requestIds, which is the condition rapid typing
// produces and which no amount of debouncing removes.
// ---------------------------------------------------------------------------

function permitRow(permitNumber: string) {
    return { id: `id-${permitNumber}`, permit_number: permitNumber } as never;
}

function searchResponse(permitNumber: string): PermitSearchResponse {
    return {
        data: [permitRow(permitNumber)],
        total: 1,
        total_is_estimate: false,
        sync_batch: null,
        limit: 25,
        offset: 0,
    } as PermitSearchResponse;
}

describe('permitsSlice — H1 stale search response guard', () => {
    it('renders the newest request’s results', () => {
        let state = initial();
        state = permitsReducer(state, fetchPermits.pending('req-1', undefined));
        state = permitsReducer(
            state,
            fetchPermits.fulfilled(searchResponse('EXT-4c560ad2'), 'req-1', undefined),
        );
        expect(state.items).toHaveLength(1);
        expect((state.items[0] as { permit_number: string }).permit_number).toBe('EXT-4c560ad2');
        expect(state.status).toBe('succeeded');
    });

    it('drops an older response that resolves AFTER a newer request started', () => {
        let state = initial();
        // Two overlapping searches: the user kept typing.
        state = permitsReducer(state, fetchPermits.pending('req-old', undefined));
        state = permitsReducer(state, fetchPermits.pending('req-new', undefined));

        // The first request's response arrives late.
        state = permitsReducer(
            state,
            fetchPermits.fulfilled(searchResponse('EXT-STALE-NONMATCH'), 'req-old', undefined),
        );

        // It must not have been rendered, and must not have been cached.
        expect(state.items).toHaveLength(0);
        expect(Object.keys(state.pageCache)).toHaveLength(0);

        // The newer response still lands normally.
        state = permitsReducer(
            state,
            fetchPermits.fulfilled(searchResponse('EXT-4c560ad2'), 'req-new', undefined),
        );
        expect((state.items[0] as { permit_number: string }).permit_number).toBe('EXT-4c560ad2');
    });

    it('does not let a superseded response overwrite results already rendered', () => {
        let state = initial();
        state = permitsReducer(state, fetchPermits.pending('req-old', undefined));
        state = permitsReducer(state, fetchPermits.pending('req-new', undefined));
        state = permitsReducer(
            state,
            fetchPermits.fulfilled(searchResponse('EXT-4c560ad2'), 'req-new', undefined),
        );
        // Now the abandoned request finally answers.
        state = permitsReducer(
            state,
            fetchPermits.fulfilled(searchResponse('EXT-STALE-NONMATCH'), 'req-old', undefined),
        );
        expect((state.items[0] as { permit_number: string }).permit_number).toBe('EXT-4c560ad2');
    });

    it('ignores a superseded rejection so the page does not flash an error', () => {
        let state = initial();
        state = permitsReducer(state, fetchPermits.pending('req-old', undefined));
        state = permitsReducer(state, fetchPermits.pending('req-new', undefined));
        state = permitsReducer(
            state,
            fetchPermits.rejected(new Error('aborted'), 'req-old', undefined),
        );
        expect(state.status).not.toBe('failed');
        expect(state.error).toBeNull();
    });

    it('still reports a genuine failure of the current request', () => {
        let state = initial();
        state = permitsReducer(state, fetchPermits.pending('req-1', undefined));
        state = permitsReducer(
            state,
            fetchPermits.rejected(new Error('boom'), 'req-1', undefined),
        );
        expect(state.status).toBe('failed');
        expect(state.error).toBeTruthy();
    });
});
