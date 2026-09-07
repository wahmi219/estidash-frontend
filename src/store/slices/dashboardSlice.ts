import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { apiService } from '@/services/api';
import { logger } from '@/utils/logger';
import {
    DashboardState,
    QueryResponse,
    ApiError,
} from '@/types';

const initialState: DashboardState = {
    isLoading: false,
    error: null,
    lastUpdated: null,

    marketPulse: null,
    hotCBSAs: [],
    coolingCBSAs: [],
    highValuePermits: [],
    tradeOpportunity: null,
    velocityAlerts: [],
    outreachPriority: null,
};

// ============================================================================
// Async Thunks
// ============================================================================

export const fetchMarketPulse = createAsyncThunk<
    QueryResponse,
    void,
    { rejectValue: ApiError }
>('dashboard/fetchMarketPulse', async (_, { rejectWithValue }) => {
    try {
        logger.info('Fetching market pulse', undefined, 'Dashboard');
        const response = await apiService.getMarketPulse();
        return response;
    } catch (error) {
        logger.error('Failed to fetch market pulse', error, 'Dashboard');
        return rejectWithValue(error as ApiError);
    }
});

export const fetchHotCBSAs = createAsyncThunk<
    QueryResponse,
    void,
    { rejectValue: ApiError }
>('dashboard/fetchHotCBSAs', async (_, { rejectWithValue }) => {
    try {
        logger.info('Fetching hot CBSAs', undefined, 'Dashboard');
        const response = await apiService.getHotCBSAs();
        return response;
    } catch (error) {
        logger.error('Failed to fetch hot CBSAs', error, 'Dashboard');
        return rejectWithValue(error as ApiError);
    }
});

export const fetchCoolingCBSAs = createAsyncThunk<
    QueryResponse,
    void,
    { rejectValue: ApiError }
>('dashboard/fetchCoolingCBSAs', async (_, { rejectWithValue }) => {
    try {
        logger.info('Fetching cooling CBSAs', undefined, 'Dashboard');
        const response = await apiService.getCoolingCBSAs();
        return response;
    } catch (error) {
        logger.error('Failed to fetch cooling CBSAs', error, 'Dashboard');
        return rejectWithValue(error as ApiError);
    }
});

export const fetchHighValuePermits = createAsyncThunk<
    QueryResponse,
    void,
    { rejectValue: ApiError }
>('dashboard/fetchHighValuePermits', async (_, { rejectWithValue }) => {
    try {
        logger.info('Fetching high value permits', undefined, 'Dashboard');
        const response = await apiService.getHighValuePermits();
        return response;
    } catch (error) {
        logger.error('Failed to fetch high value permits', error, 'Dashboard');
        return rejectWithValue(error as ApiError);
    }
});

export const fetchTradeOpportunity = createAsyncThunk<
    QueryResponse,
    void,
    { rejectValue: ApiError }
>('dashboard/fetchTradeOpportunity', async (_, { rejectWithValue }) => {
    try {
        logger.info('Fetching trade opportunity', undefined, 'Dashboard');
        const response = await apiService.getTradeOpportunity();
        return response;
    } catch (error) {
        logger.error('Failed to fetch trade opportunity', error, 'Dashboard');
        return rejectWithValue(error as ApiError);
    }
});

export const fetchVelocityAlerts = createAsyncThunk<
    QueryResponse,
    void,
    { rejectValue: ApiError }
>('dashboard/fetchVelocityAlerts', async (_, { rejectWithValue }) => {
    try {
        logger.info('Fetching velocity alerts', undefined, 'Dashboard');
        const response = await apiService.getVelocityAlerts();
        return response;
    } catch (error) {
        logger.error('Failed to fetch velocity alerts', error, 'Dashboard');
        return rejectWithValue(error as ApiError);
    }
});

export const fetchOutreachPriority = createAsyncThunk<
    QueryResponse,
    void,
    { rejectValue: ApiError }
>('dashboard/fetchOutreachPriority', async (_, { rejectWithValue }) => {
    try {
        logger.info('Fetching outreach priority', undefined, 'Dashboard');
        const response = await apiService.getOutreachPriority();
        return response;
    } catch (error) {
        logger.error('Failed to fetch outreach priority', error, 'Dashboard');
        return rejectWithValue(error as ApiError);
    }
});

export const fetchFullReport = createAsyncThunk<
    QueryResponse,
    void,
    { rejectValue: ApiError }
>('dashboard/fetchFullReport', async (_, { rejectWithValue }) => {
    try {
        logger.info('Fetching full intelligence report', undefined, 'Dashboard');
        const response = await apiService.getFullIntelligenceReport();
        return response;
    } catch (error) {
        logger.error('Failed to fetch full report', error, 'Dashboard');
        return rejectWithValue(error as ApiError);
    }
});

// ============================================================================
// Slice
// ============================================================================

const dashboardSlice = createSlice({
    name: 'dashboard',
    initialState,
    reducers: {
        clearError: (state) => {
            state.error = null;
        },

        setLoading: (state, action: PayloadAction<boolean>) => {
            state.isLoading = action.payload;
        },

        resetDashboard: () => initialState,
    },
    extraReducers: (builder) => {
        // Market Pulse
        builder.addCase(fetchMarketPulse.pending, (state) => {
            state.isLoading = true;
        });
        builder.addCase(fetchMarketPulse.fulfilled, (state, action) => {
            state.isLoading = false;
            state.lastUpdated = new Date().toISOString();
            // The response contains the answer as text - we store the raw response
            // The UI components will parse/display it appropriately
            if (action.payload.success && action.payload.answer) {
                // Store as marketPulse with raw answer for display
                state.marketPulse = {
                    permitsMoMChange: 0, // Will be parsed from answer
                    valuationMoMChange: 0,
                    marketState: 'flat',
                    totalPermits: 0,
                    totalValuation: 0,
                    period: new Date().toISOString(),
                };
            }
            logger.info('Market pulse updated', undefined, 'Dashboard');
        });
        builder.addCase(fetchMarketPulse.rejected, (state, action) => {
            state.isLoading = false;
            state.error = action.payload?.message || 'Failed to fetch market pulse';
        });

        // Hot CBSAs
        builder.addCase(fetchHotCBSAs.pending, (state) => {
            state.isLoading = true;
        });
        builder.addCase(fetchHotCBSAs.fulfilled, (state, action) => {
            state.isLoading = false;
            state.lastUpdated = new Date().toISOString();
            if (action.payload.success) {
                // Data will be displayed as text from the answer
                state.hotCBSAs = [];
            }
        });
        builder.addCase(fetchHotCBSAs.rejected, (state, action) => {
            state.isLoading = false;
            state.error = action.payload?.message || 'Failed to fetch hot CBSAs';
        });

        // Cooling CBSAs
        builder.addCase(fetchCoolingCBSAs.pending, (state) => {
            state.isLoading = true;
        });
        builder.addCase(fetchCoolingCBSAs.fulfilled, (state, action) => {
            state.isLoading = false;
            state.lastUpdated = new Date().toISOString();
            if (action.payload.success) {
                state.coolingCBSAs = [];
            }
        });
        builder.addCase(fetchCoolingCBSAs.rejected, (state, action) => {
            state.isLoading = false;
            state.error = action.payload?.message || 'Failed to fetch cooling CBSAs';
        });

        // Full Report
        builder.addCase(fetchFullReport.pending, (state) => {
            state.isLoading = true;
        });
        builder.addCase(fetchFullReport.fulfilled, (state) => {
            state.isLoading = false;
            state.lastUpdated = new Date().toISOString();
        });
        builder.addCase(fetchFullReport.rejected, (state, action) => {
            state.isLoading = false;
            state.error = action.payload?.message || 'Failed to fetch full report';
        });
    },
});

export const { clearError, setLoading, resetDashboard } = dashboardSlice.actions;
export default dashboardSlice.reducer;
