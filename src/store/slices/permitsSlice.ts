import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { apiService } from '@/services/api';
import { logger } from '@/utils/logger';
import {
    PermitsState,
    PermitFilters,
    PermitPagination,
    PermitSorting,
    PermitSearchResponse,
    PermitCityInfo,
    PermitCounty,
    BulkDeleteResponse,
    ApiError,
    PermitSearchParams,
} from '@/types';

// Minimal local type for selectors — avoids circular import with store.ts
// (store.ts imports this slice; importing RootState back creates a cycle in Turbopack SSR)
type WithPermits = { permits: PermitsState };

// ============================================================================
// Initial State
// ============================================================================

const initialFilters: PermitFilters = {
    city: null,
    state: null,
    metro: null,
    county: null,
    opportunityCategory: null,
    issuedAgeBucket: null,
    projectClass: null,
    workScope: null,
    startDate: null,
    endDate: null,
    search: '',
    minCost: null,
    maxCost: null,
    scoreBucket: null,
    isExcluded: null,
    costSource: null,
    qualification: null,
    hasContractor: null,
    addedStartDate: null,
    addedEndDate: null,
};

const initialState: PermitsState = {
    items: [],
    filters: initialFilters,
    pagination: {
        page: 1,
        pageSize: 25,
        totalRecords: 0,
        totalPages: 0,
        totalIsEstimate: false,
    },
    sorting: {
        // Default: best leads first (bucket → #contacts → score). Backend maps
        // 'lead_priority' to a bucket-rank sort; excluded permits sink to the bottom.
        field: 'lead_priority',
        direction: 'desc',
    },
    status: 'idle',
    error: null,
    lastFetchParams: null,
    lastFetchedAt: null,
    pageCache: {},
    availableCities: [],
    availableCounties: [],
};

// ============================================================================
// Helper Functions
// ============================================================================

function buildQueryParams(state: PermitsState) {
    const { filters, pagination, sorting } = state;
    return {
        city: filters.city || undefined,
        state: filters.state || undefined,
        county: filters.county || undefined,
        opportunity_category: filters.opportunityCategory || undefined,
        issued_age_bucket: filters.issuedAgeBucket || undefined,
        project_class: filters.projectClass || undefined,
        work_scope: filters.workScope || undefined,
        start_date: filters.startDate || undefined,
        end_date: filters.endDate || undefined,
        search: filters.search || undefined,
        min_cost: filters.minCost ?? undefined,
        max_cost: filters.maxCost ?? undefined,
        score_bucket: filters.scoreBucket || undefined,
        is_excluded: filters.isExcluded ?? undefined,
        cost_source: filters.costSource || undefined,
        qualification: filters.qualification || undefined,
        has_contractor: filters.hasContractor ?? undefined,
        added_start_date: filters.addedStartDate || undefined,
        added_end_date: filters.addedEndDate || undefined,
        limit: pagination.pageSize,
        offset: (pagination.page - 1) * pagination.pageSize,
        order_by: sorting.field,
        order_desc: sorting.direction === 'desc',
    };
}

// Returns true when a PageCacheEntry is still within the freshness window.
function isCacheEntryFresh(fetchedAt: string): boolean {
    return Date.now() - new Date(fetchedAt).getTime() < PERMITS_FRESH_MS;
}

// ============================================================================
// Constants
// ============================================================================

// How long any cached result (current items or a page-cache entry) is
// considered fresh enough to serve without hitting the network.
const PERMITS_FRESH_MS = 5 * 60_000;

// Maximum number of distinct query pages held in the page cache at once.
// Each page at ~25–50 items weighs ~100–200 KB; 20 pages ≈ 4 MB ceiling.
const MAX_CACHE_ENTRIES = 20;

// ============================================================================
// Async Thunks
// ============================================================================

export const fetchPermits = createAsyncThunk<
    PermitSearchResponse,
    { force?: boolean } | void,
    { state: WithPermits; rejectValue: ApiError }
>(
    'permits/fetchPermits',
    async (arg, { getState, rejectWithValue }) => {
        const permits = getState().permits;
        const params = buildQueryParams(permits);
        const queryKey = JSON.stringify(params);

        // ── Page cache check ────────────────────────────────────────────────
        // Serve from memory if we have a fresh entry for this exact query.
        // The pending reducer detects this same cache hit and skips the loading
        // spinner, so the transition is invisible to the user.
        if (!arg?.force) {
            const cached = permits.pageCache[queryKey];
            if (cached && isCacheEntryFresh(cached.fetchedAt)) {
                logger.info('Permits served from page cache', { queryKey }, 'Permits');
                return {
                    data: cached.data,
                    total: cached.total,
                    total_is_estimate: cached.totalIsEstimate,
                    limit: params.limit,
                    offset: params.offset,
                } as PermitSearchResponse;
            }
        }

        // ── Network fetch ────────────────────────────────────────────────────
        try {
            logger.info('Fetching permits', { params }, 'Permits');
            return await apiService.searchPermits(params);
        } catch (error) {
            logger.error('Failed to fetch permits', error, 'Permits');
            return rejectWithValue(error as ApiError);
        }
    },
    {
        // Skip dispatch entirely when the current items already satisfy this
        // query and are still fresh (e.g. navigating back to the exact same
        // page/filters within 5 min). Cache hits for *different* queries are
        // allowed through so the thunk body can serve them from memory.
        condition: (arg, { getState }) => {
            if (arg && arg.force) return true;
            const p = getState().permits;
            const queryKey = JSON.stringify(buildQueryParams(p));
            const sameParams = p.lastFetchParams === queryKey;
            const isFresh =
                !!p.lastFetchedAt && Date.now() - new Date(p.lastFetchedAt).getTime() < PERMITS_FRESH_MS;
            if (p.status === 'succeeded' && p.items.length > 0 && sameParams && isFresh) {
                return false;
            }
            return true;
        },
    }
);

export const fetchPermitCities = createAsyncThunk<
    PermitCityInfo[],
    void,
    { rejectValue: ApiError }
>(
    'permits/fetchCities',
    async (_, { rejectWithValue }) => {
        try {
            logger.info('Fetching available cities', undefined, 'Permits');
            const response = await apiService.getPermitCities();
            return response.cities;
        } catch (error) {
            logger.error('Failed to fetch cities', error, 'Permits');
            return rejectWithValue(error as ApiError);
        }
    }
);

export const fetchPermitCounties = createAsyncThunk<
    PermitCounty[],
    string | undefined,
    { rejectValue: ApiError }
>(
    'permits/fetchCounties',
    async (state, { rejectWithValue }) => {
        try {
            const response = await apiService.getPermitCounties(state);
            return response.counties;
        } catch (error) {
            logger.error('Failed to fetch counties', error, 'Permits');
            return rejectWithValue(error as ApiError);
        }
    }
);

export const bulkDeletePermits = createAsyncThunk<
    BulkDeleteResponse,
    string[],
    { rejectValue: ApiError }
>(
    'permits/bulkDelete',
    async (permitIds, { rejectWithValue }) => {
        try {
            logger.info('Bulk deleting permits', { count: permitIds.length }, 'Permits');
            const response = await apiService.bulkDeletePermits(permitIds, true);
            return response;
        } catch (error) {
            logger.error('Failed to bulk delete permits', error, 'Permits');
            return rejectWithValue(error as ApiError);
        }
    }
);

export const bulkDeleteByFilter = createAsyncThunk<
    BulkDeleteResponse,
    Omit<PermitSearchParams, 'limit' | 'offset' | 'order_by' | 'order_desc'>,
    { rejectValue: ApiError }
>(
    'permits/bulkDeleteByFilter',
    async (filters, { rejectWithValue }) => {
        try {
            logger.info('Bulk deleting permits by filter', { filters }, 'Permits');
            const response = await apiService.bulkDeleteByFilter(filters, true);
            return response;
        } catch (error) {
            logger.error('Failed to bulk delete permits by filter', error, 'Permits');
            return rejectWithValue(error as ApiError);
        }
    }
);

// ============================================================================
// Slice
// ============================================================================

const permitsSlice = createSlice({
    name: 'permits',
    initialState,
    reducers: {
        setFilters: (state, action: PayloadAction<Partial<PermitFilters>>) => {
            state.filters = { ...state.filters, ...action.payload };
            state.pagination.page = 1; // Reset to first page on filter change
        },

        resetFilters: (state) => {
            state.filters = initialFilters;
            state.pagination.page = 1;
        },

        setPage: (state, action: PayloadAction<number>) => {
            state.pagination.page = action.payload;
        },

        setPageSize: (state, action: PayloadAction<number>) => {
            state.pagination.pageSize = action.payload;
            state.pagination.page = 1; // Reset to first page
        },

        setSorting: (state, action: PayloadAction<PermitSorting>) => {
            state.sorting = action.payload;
            state.pagination.page = 1; // Reset to first page
        },

        toggleSortDirection: (state) => {
            state.sorting.direction = state.sorting.direction === 'asc' ? 'desc' : 'asc';
            state.pagination.page = 1;
        },

        clearError: (state) => {
            state.error = null;
        },

        // Wipe the page cache — called after operations that mutate data so
        // subsequent pagination doesn't serve stale cached pages.
        clearPageCache: (state) => {
            state.pageCache = {};
        },

        // Used to hydrate state from URL on initial page load
        hydrateFromUrl: (state, action: PayloadAction<{
            filters?: Partial<PermitFilters>;
            page?: number;
            pageSize?: number;
            sortField?: string;
            sortDir?: 'asc' | 'desc';
        }>) => {
            const { filters, page, pageSize, sortField, sortDir } = action.payload;

            if (filters) {
                state.filters = { ...state.filters, ...filters };
            }
            if (page) {
                state.pagination.page = page;
            }
            if (pageSize) {
                state.pagination.pageSize = pageSize;
            }
            if (sortField) {
                state.sorting.field = sortField;
            }
            if (sortDir) {
                state.sorting.direction = sortDir;
            }
        },
    },
    extraReducers: (builder) => {
        // Fetch Permits
        builder.addCase(fetchPermits.pending, (state) => {
            // Only show the loading spinner for genuine network fetches.
            // When the thunk body will serve this query from the page cache,
            // we skip the loading state so the current items remain visible
            // (no flash of empty table / skeleton) until fulfilled fires.
            const queryKey = JSON.stringify(buildQueryParams(state));
            const cached = state.pageCache[queryKey];
            if (!cached || !isCacheEntryFresh(cached.fetchedAt)) {
                state.status = 'loading';
            }
            state.error = null;
        });

        builder.addCase(fetchPermits.fulfilled, (state, action) => {
            state.status = 'succeeded';
            state.items = action.payload.data;
            state.pagination.totalRecords = action.payload.total;
            state.pagination.totalIsEstimate = action.payload.total_is_estimate ?? false;
            state.pagination.totalPages = Math.ceil(action.payload.total / state.pagination.pageSize);
            state.lastFetchParams = JSON.stringify(buildQueryParams(state));
            state.lastFetchedAt = new Date().toISOString();

            // ── Write to page cache ─────────────────────────────────────────
            const queryKey = state.lastFetchParams;
            state.pageCache[queryKey] = {
                data: action.payload.data,
                total: action.payload.total,
                totalIsEstimate: action.payload.total_is_estimate ?? false,
                fetchedAt: state.lastFetchedAt,
            };

            // Evict oldest entry when the cache exceeds the size limit.
            const keys = Object.keys(state.pageCache);
            if (keys.length > MAX_CACHE_ENTRIES) {
                let oldestKey = keys[0];
                let oldestTime = new Date(state.pageCache[oldestKey].fetchedAt).getTime();
                for (const key of keys) {
                    const t = new Date(state.pageCache[key].fetchedAt).getTime();
                    if (t < oldestTime) { oldestTime = t; oldestKey = key; }
                }
                delete state.pageCache[oldestKey];
            }

            logger.info('Permits loaded', { count: action.payload.data.length, total: action.payload.total }, 'Permits');
        });

        builder.addCase(fetchPermits.rejected, (state, action) => {
            state.status = 'failed';
            state.error = action.payload?.message || 'Failed to fetch permits';
        });

        // Fetch Cities
        builder.addCase(fetchPermitCities.fulfilled, (state, action) => {
            state.availableCities = action.payload;
        });

        // Fetch Counties
        builder.addCase(fetchPermitCounties.fulfilled, (state, action) => {
            state.availableCounties = action.payload;
        });

        // Bulk Delete by ID
        builder.addCase(bulkDeletePermits.fulfilled, (state, action) => {
            const deletedCount = action.payload.permits_deleted;
            const deletedIds = new Set(action.meta.arg);
            state.items = state.items.filter((item) => !deletedIds.has(item.id));
            state.pagination.totalRecords = Math.max(0, state.pagination.totalRecords - deletedCount);
            state.pagination.totalPages = Math.ceil(state.pagination.totalRecords / state.pagination.pageSize);
            // Data changed — cached pages are stale.
            state.pageCache = {};
            logger.info('Bulk delete complete', { deleted: deletedCount }, 'Permits');
        });
        builder.addCase(bulkDeletePermits.rejected, (state, action) => {
            state.error = action.payload?.message || 'Failed to delete permits';
        });

        // Bulk Delete by Filter
        builder.addCase(bulkDeleteByFilter.fulfilled, (state, action) => {
            const deletedCount = action.payload.permits_deleted;
            // All current items may have been deleted; clear them and reset totals.
            // The page will re-fetch after dispatch to get the updated result set.
            state.items = [];
            state.pagination.totalRecords = Math.max(0, state.pagination.totalRecords - deletedCount);
            state.pagination.totalPages = Math.ceil(state.pagination.totalRecords / state.pagination.pageSize);
            state.pagination.page = 1;
            // Data changed — cached pages are stale.
            state.pageCache = {};
            logger.info('Bulk delete by filter complete', { deleted: deletedCount }, 'Permits');
        });
        builder.addCase(bulkDeleteByFilter.rejected, (state, action) => {
            state.error = action.payload?.message || 'Failed to delete permits by filter';
        });
    },
});

// ============================================================================
// Exports
// ============================================================================

export const {
    setFilters,
    resetFilters,
    setPage,
    setPageSize,
    setSorting,
    toggleSortDirection,
    clearError,
    clearPageCache,
    hydrateFromUrl,
} = permitsSlice.actions;

// Selectors
export const selectPermits = (state: WithPermits) => state.permits.items;
export const selectPermitsStatus = (state: WithPermits) => state.permits.status;
export const selectPermitsError = (state: WithPermits) => state.permits.error;
export const selectPermitFilters = (state: WithPermits) => state.permits.filters;
export const selectPermitPagination = (state: WithPermits) => state.permits.pagination;
export const selectPermitSorting = (state: WithPermits) => state.permits.sorting;
export const selectAvailableCities = (state: WithPermits) => state.permits.availableCities;
export const selectAvailableCounties = (state: WithPermits) => state.permits.availableCounties;

export default permitsSlice.reducer;
