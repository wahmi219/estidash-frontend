import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { apiService } from '@/services/api';
import { logger } from '@/utils/logger';
import {
    ContractorsState,
    ContractorFilters,
    ContractorSearchResponse,
    PermitSorting,
    ApiError,
} from '@/types';
// Minimal local type for selectors — avoids circular import with store.ts
type WithContractors = { contractors: ContractorsState };

// ============================================================================
// Initial State
// ============================================================================

const initialFilters: ContractorFilters = {
    search: '',
    contractorType: null,
    city: null,
    stateCode: null,
    hasEmail: null,
    scoreBucket: null,
    hasLicense: null,
    hasPhone: null,
    hasWebsite: null,
    licenseReadiness: null,
};

const initialState: ContractorsState = {
    items: [],
    filters: initialFilters,
    pagination: {
        page: 1,
        pageSize: 25,
        totalRecords: 0,
        totalPages: 0,
    },
    sorting: {
        // Default to highest permit_count first -- the alphabetical default
        // surfaced junk/low-signal contractor names (dates, stray characters
        // from bad source data) ahead of the contractors that actually matter.
        field: 'permit_count',
        direction: 'desc',
    },
    status: 'idle',
    error: null,
    lastFetchParams: null,
    lastFetchedAt: null,
    availableTypes: [],
    availableStates: [],
    availableCities: [],
};

// ============================================================================
// Helper Functions
// ============================================================================

function buildQueryParams(state: ContractorsState) {
    const { filters, pagination, sorting } = state;
    return {
        search: filters.search || undefined,
        contractor_type: filters.contractorType || undefined,
        city: filters.city || undefined,
        state_code: filters.stateCode || undefined,
        has_email: filters.hasEmail ?? undefined,
        score_bucket: filters.scoreBucket || undefined,
        has_license: filters.hasLicense ?? undefined,
        has_phone: filters.hasPhone ?? undefined,
        has_website: filters.hasWebsite ?? undefined,
        license_readiness: filters.licenseReadiness || undefined,
        limit: pagination.pageSize,
        offset: (pagination.page - 1) * pagination.pageSize,
        order_by: sorting.field,
        order_desc: sorting.direction === 'desc',
    };
}

// ============================================================================
// Async Thunks
// ============================================================================

export const fetchContractors = createAsyncThunk<
    ContractorSearchResponse,
    void,
    { state: WithContractors; rejectValue: ApiError }
>(
    'contractors/fetchContractors',
    async (_, { getState, rejectWithValue }) => {
        try {
            const contractors = getState().contractors;
            const params = buildQueryParams(contractors);
            logger.info('Fetching contractors', { params }, 'Contractors');
            const response = await apiService.searchContractors(params);
            return response;
        } catch (error) {
            logger.error('Failed to fetch contractors', error, 'Contractors');
            return rejectWithValue(error as ApiError);
        }
    },
    {
        condition: (_, { getState }) => {
            const { status } = getState().contractors;
            return status !== 'loading';
        },
    }
);

export const fetchContractorTypes = createAsyncThunk<
    string[],
    void,
    { rejectValue: ApiError }
>(
    'contractors/fetchTypes',
    async (_, { rejectWithValue }) => {
        try {
            logger.info('Fetching contractor types', undefined, 'Contractors');
            const response = await apiService.getContractorTypes();
            return response.types;
        } catch (error) {
            logger.error('Failed to fetch contractor types', error, 'Contractors');
            return rejectWithValue(error as ApiError);
        }
    }
);

export const fetchContractorStates = createAsyncThunk<
    string[],
    void,
    { rejectValue: ApiError }
>(
    'contractors/fetchStates',
    async (_, { rejectWithValue }) => {
        try {
            const response = await apiService.getContractorStates();
            return response.states;
        } catch (error) {
            logger.error('Failed to fetch contractor states', error, 'Contractors');
            return rejectWithValue(error as ApiError);
        }
    }
);

export const fetchContractorCities = createAsyncThunk<
    string[],
    string | undefined,
    { rejectValue: ApiError }
>(
    'contractors/fetchCities',
    async (stateCode, { rejectWithValue }) => {
        try {
            const response = await apiService.getContractorCities(stateCode);
            return response.cities;
        } catch (error) {
            logger.error('Failed to fetch contractor cities', error, 'Contractors');
            return rejectWithValue(error as ApiError);
        }
    }
);

// ============================================================================
// Slice
// ============================================================================

const contractorsSlice = createSlice({
    name: 'contractors',
    initialState,
    reducers: {
        setFilters: (state, action: PayloadAction<Partial<ContractorFilters>>) => {
            state.filters = { ...state.filters, ...action.payload };
            state.pagination.page = 1;
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
            filters?: Partial<ContractorFilters>;
            page?: number;
            pageSize?: number;
            sortField?: string;
            sortDir?: 'asc' | 'desc';
        }>) => {
            const { filters, page, pageSize, sortField, sortDir } = action.payload;
            if (filters) state.filters = { ...state.filters, ...filters };
            if (page) state.pagination.page = page;
            if (pageSize) state.pagination.pageSize = pageSize;
            if (sortField) state.sorting.field = sortField;
            if (sortDir) state.sorting.direction = sortDir;
        },
    },
    extraReducers: (builder) => {
        builder.addCase(fetchContractors.pending, (state) => {
            state.status = 'loading';
            state.error = null;
        });
        builder.addCase(fetchContractors.fulfilled, (state, action) => {
            state.status = 'succeeded';
            state.items = action.payload.data;
            state.pagination.totalRecords = action.payload.total;
            state.pagination.totalPages = Math.ceil(action.payload.total / state.pagination.pageSize);
            state.lastFetchParams = JSON.stringify(buildQueryParams(state));
            state.lastFetchedAt = new Date().toISOString();
            logger.info('Contractors loaded', { count: action.payload.data.length, total: action.payload.total }, 'Contractors');
        });
        builder.addCase(fetchContractors.rejected, (state, action) => {
            state.status = 'failed';
            state.error = action.payload?.message || 'Failed to fetch contractors';
        });

        builder.addCase(fetchContractorTypes.fulfilled, (state, action) => {
            state.availableTypes = action.payload;
        });

        builder.addCase(fetchContractorStates.fulfilled, (state, action) => {
            state.availableStates = action.payload;
        });

        builder.addCase(fetchContractorCities.fulfilled, (state, action) => {
            state.availableCities = action.payload;
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
    clearError,
    hydrateFromUrl,
} = contractorsSlice.actions;

export const selectContractors = (state: WithContractors) => state.contractors.items;
export const selectContractorsStatus = (state: WithContractors) => state.contractors.status;
export const selectContractorsError = (state: WithContractors) => state.contractors.error;
export const selectContractorFilters = (state: WithContractors) => state.contractors.filters;
export const selectContractorPagination = (state: WithContractors) => state.contractors.pagination;
export const selectContractorSorting = (state: WithContractors) => state.contractors.sorting;
export const selectAvailableTypes = (state: WithContractors) => state.contractors.availableTypes;
export const selectAvailableStates = (state: WithContractors) => state.contractors.availableStates;
export const selectAvailableCities = (state: WithContractors) => state.contractors.availableCities;

export default contractorsSlice.reducer;
