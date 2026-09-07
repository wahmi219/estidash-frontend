import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { apiService } from '@/services/api';
import { logger } from '@/utils/logger';
import {
    RegistryState,
    RegistryFilters,
    RegistrySearchResponse,
    RegistrySourceRead,
    PermitSorting,
    ApiError,
} from '@/types';
// Minimal local type for selectors — avoids circular import with store.ts
type WithRegistry = { registry: RegistryState };

// ============================================================================
// Initial State
// ============================================================================

const DEFAULT_SOURCE_KEY = 'washington_lni_socrata';

// The registry search endpoint hard-caps limit at 100 (plan section 11
// point 2 -- unlike /permits, which allows up to 2000). PermitPagination
// is reused as-is (its page-size options go up to 2000), so page size is
// clamped here rather than in the component, keeping every write path
// (manual select, URL hydration) consistent with what the API will accept.
const MAX_PAGE_SIZE = 100;

const initialFilters: RegistryFilters = {
    sourceKey: DEFAULT_SOURCE_KEY,
    search: '',
    licenseNumber: '',
    licenseStatus: null,
    licenseType: null,
    businessType: null,
    city: null,
    addressState: null,
    zip: '',
    hasPhone: null,
    hasEmail: null,
    isCurrent: true,
};

const initialState: RegistryState = {
    items: [],
    sources: [],
    filters: initialFilters,
    pagination: {
        page: 1,
        pageSize: 50,
        totalRecords: 0,
        totalPages: 0,
    },
    sorting: {
        field: 'business_name',
        direction: 'asc',
    },
    status: 'idle',
    sourcesStatus: 'idle',
    error: null,
};

// ============================================================================
// Helper Functions
// ============================================================================

function buildQueryParams(state: RegistryState) {
    const { filters, pagination, sorting } = state;
    return {
        source_key: filters.sourceKey,
        is_current: filters.isCurrent,
        search: filters.search || undefined,
        license_number: filters.licenseNumber || undefined,
        license_status: filters.licenseStatus || undefined,
        license_type: filters.licenseType || undefined,
        business_type: filters.businessType || undefined,
        city: filters.city || undefined,
        address_state: filters.addressState || undefined,
        zip: filters.zip || undefined,
        has_phone: filters.hasPhone ?? undefined,
        has_email: filters.hasEmail ?? undefined,
        sort_by: sorting.field,
        sort_order: sorting.direction,
        limit: pagination.pageSize,
        offset: (pagination.page - 1) * pagination.pageSize,
    };
}

// ============================================================================
// Async Thunks
// ============================================================================

export const fetchRegistryRecords = createAsyncThunk<
    RegistrySearchResponse,
    void,
    { state: WithRegistry; rejectValue: ApiError }
>(
    'registry/fetchRecords',
    async (_, { getState, rejectWithValue }) => {
        try {
            const registry = getState().registry;
            const params = buildQueryParams(registry);
            logger.info('Fetching registry records', { params }, 'Registry');
            const response = await apiService.searchRegistryRecords(params);
            return response;
        } catch (error) {
            logger.error('Failed to fetch registry records', error, 'Registry');
            return rejectWithValue(error as ApiError);
        }
    },
    {
        condition: (_, { getState }) => {
            const { status } = getState().registry;
            return status !== 'loading';
        },
    }
);

export const fetchRegistrySources = createAsyncThunk<
    RegistrySourceRead[],
    void,
    { rejectValue: ApiError }
>(
    'registry/fetchSources',
    async (_, { rejectWithValue }) => {
        try {
            const response = await apiService.getRegistrySources();
            return response.sources;
        } catch (error) {
            logger.error('Failed to fetch registry sources', error, 'Registry');
            return rejectWithValue(error as ApiError);
        }
    }
);

// ============================================================================
// Slice
// ============================================================================

const registrySlice = createSlice({
    name: 'registry',
    initialState,
    reducers: {
        setFilters: (state, action: PayloadAction<Partial<RegistryFilters>>) => {
            state.filters = { ...state.filters, ...action.payload };
            state.pagination.page = 1;
        },

        resetFilters: (state) => {
            // Preserve the current source — switching sources is a distinct
            // action (setSource) from clearing the record-level filters.
            state.filters = { ...initialFilters, sourceKey: state.filters.sourceKey };
            state.pagination.page = 1;
        },

        setSource: (state, action: PayloadAction<string>) => {
            state.filters.sourceKey = action.payload;
            state.pagination.page = 1;
        },

        setPage: (state, action: PayloadAction<number>) => {
            state.pagination.page = action.payload;
        },

        setPageSize: (state, action: PayloadAction<number>) => {
            state.pagination.pageSize = Math.min(action.payload, MAX_PAGE_SIZE);
            state.pagination.page = 1;
        },

        setSorting: (state, action: PayloadAction<PermitSorting>) => {
            state.sorting = action.payload;
            state.pagination.page = 1;
        },

        clearError: (state) => {
            state.error = null;
        },

        hydrateFromUrl: (state, action: PayloadAction<{
            filters?: Partial<RegistryFilters>;
            page?: number;
            pageSize?: number;
            sortField?: string;
            sortDir?: 'asc' | 'desc';
        }>) => {
            const { filters, page, pageSize, sortField, sortDir } = action.payload;
            if (filters) state.filters = { ...state.filters, ...filters };
            if (page) state.pagination.page = page;
            if (pageSize) state.pagination.pageSize = Math.min(pageSize, MAX_PAGE_SIZE);
            if (sortField) state.sorting.field = sortField;
            if (sortDir) state.sorting.direction = sortDir;
        },
    },
    extraReducers: (builder) => {
        builder.addCase(fetchRegistryRecords.pending, (state) => {
            state.status = 'loading';
            state.error = null;
        });
        builder.addCase(fetchRegistryRecords.fulfilled, (state, action) => {
            state.status = 'succeeded';
            state.items = action.payload.data;
            state.pagination.totalRecords = action.payload.total;
            state.pagination.totalPages = Math.ceil(action.payload.total / state.pagination.pageSize);
            logger.info('Registry records loaded', { count: action.payload.data.length, total: action.payload.total }, 'Registry');
        });
        builder.addCase(fetchRegistryRecords.rejected, (state, action) => {
            state.status = 'failed';
            state.error = action.payload?.message || 'Failed to fetch registry records';
        });

        builder.addCase(fetchRegistrySources.pending, (state) => {
            state.sourcesStatus = 'loading';
        });
        builder.addCase(fetchRegistrySources.fulfilled, (state, action) => {
            state.sourcesStatus = 'succeeded';
            state.sources = action.payload;
        });
        builder.addCase(fetchRegistrySources.rejected, (state) => {
            state.sourcesStatus = 'failed';
        });
    },
});

// ============================================================================
// Exports
// ============================================================================

export const {
    setFilters,
    resetFilters,
    setSource,
    setPage,
    setPageSize,
    setSorting,
    clearError,
    hydrateFromUrl,
} = registrySlice.actions;

export const selectRegistryRecords = (state: WithRegistry) => state.registry.items;
export const selectRegistryStatus = (state: WithRegistry) => state.registry.status;
export const selectRegistryError = (state: WithRegistry) => state.registry.error;
export const selectRegistryFilters = (state: WithRegistry) => state.registry.filters;
export const selectRegistryPagination = (state: WithRegistry) => state.registry.pagination;
export const selectRegistrySorting = (state: WithRegistry) => state.registry.sorting;
export const selectRegistrySources = (state: WithRegistry) => state.registry.sources;
export const selectRegistrySourcesStatus = (state: WithRegistry) => state.registry.sourcesStatus;

export default registrySlice.reducer;
