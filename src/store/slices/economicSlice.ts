import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { apiService } from '@/services/api';
import { logger } from '@/utils/logger';

// =============================================================================
// Types
// =============================================================================

export interface InterestRates {
    mortgage_30y: number | null;
    mortgage_15y: number | null;
    fed_funds: number | null;
    prime_rate: number | null;
    as_of_date: string | null;
}

export interface Employment {
    total_construction: number | null;
    residential: number | null;
    nonresidential: number | null;
    avg_weekly_hours: number | null;
    avg_hourly_earnings: number | null;
    as_of_date: string | null;
}

export interface LaborTurnover {
    job_openings: number | null;
    hires: number | null;
    separations: number | null;
    quits: number | null;
    layoffs: number | null;
    tightness_ratio: number | null;
    as_of_date: string | null;
}

export interface EconomicSummary {
    interest_rates: InterestRates;
    employment: Employment;
    labor_turnover: LaborTurnover;
}

export interface SyncResult {
    source: string;
    success: boolean;
    records_synced: Record<string, number>;
    message: string;
}

// Geographic Types
export interface GeoState {
    code: string;
    fips_code: string;
    name: string;
    region: string | null;
}

export interface GeoMetro {
    id: number;
    metro_code: string;
    metro_name: string;
    state_code: string;
    population: number | null;
}

export interface EmploymentGeo {
    observation_date: string;
    geo_type: string;
    geo_code: string;
    geo_name: string | null;
    employment_thousands: number | null;
    avg_weekly_hours: number | null;
    avg_hourly_earnings: number | null;
}

export interface JoltsGeo {
    observation_date: string;
    geo_type: string;
    geo_code: string;
    geo_name: string | null;
    job_openings: number | null;
    hires: number | null;
    separations: number | null;
    quits: number | null;
    layoffs: number | null;
    tightness_ratio: number | null;
}

export interface EconomicState {
    data: EconomicSummary | null;
    isLoading: boolean;
    isSyncing: boolean;
    error: string | null;
    lastUpdated: string | null;
    // Geographic data
    states: GeoState[];
    metros: GeoMetro[];
    selectedState: string | null;
    selectedMetro: string | null;
    stateEmployment: EmploymentGeo | null;
    metroEmployment: EmploymentGeo | null;
    nationalEmployment: EmploymentGeo | null;
    stateJolts: JoltsGeo | null;
    nationalJolts: JoltsGeo | null;
    isGeoLoading: boolean;
    isGeoSyncing: boolean;
}

const initialState: EconomicState = {
    data: null,
    isLoading: false,
    isSyncing: false,
    error: null,
    lastUpdated: null,
    states: [],
    metros: [],
    selectedState: null,
    selectedMetro: null,
    stateEmployment: null,
    metroEmployment: null,
    nationalEmployment: null,
    stateJolts: null,
    nationalJolts: null,
    isGeoLoading: false,
    isGeoSyncing: false,
};

// =============================================================================
// Async Thunks - National
// =============================================================================

export const fetchEconomicSummary = createAsyncThunk<
    EconomicSummary,
    void,
    { rejectValue: string }
>('economic/fetchSummary', async (_, { rejectWithValue }) => {
    try {
        logger.info('Fetching economic summary', undefined, 'Economic');
        const response = await apiService.getEconomicSummary();
        return response;
    } catch (error) {
        logger.error('Failed to fetch economic summary', error, 'Economic');
        return rejectWithValue((error as Error).message || 'Failed to fetch economic data');
    }
});

export const syncFredData = createAsyncThunk<
    SyncResult,
    void,
    { rejectValue: string }
>('economic/syncFred', async (_, { rejectWithValue }) => {
    try {
        logger.info('Syncing FRED data', undefined, 'Economic');
        const response = await apiService.syncFredData();
        return response;
    } catch (error) {
        logger.error('Failed to sync FRED data', error, 'Economic');
        return rejectWithValue((error as Error).message || 'Failed to sync FRED data');
    }
});

export const syncBlsData = createAsyncThunk<
    SyncResult,
    void,
    { rejectValue: string }
>('economic/syncBls', async (_, { rejectWithValue }) => {
    try {
        logger.info('Syncing BLS data', undefined, 'Economic');
        const response = await apiService.syncBlsData();
        return response;
    } catch (error) {
        logger.error('Failed to sync BLS data', error, 'Economic');
        return rejectWithValue((error as Error).message || 'Failed to sync BLS data');
    }
});

// =============================================================================
// Async Thunks - Geographic
// =============================================================================

export const fetchGeoStates = createAsyncThunk<
    GeoState[],
    void,
    { rejectValue: string }
>('economic/fetchGeoStates', async (_, { rejectWithValue }) => {
    try {
        return await apiService.getGeoStates();
    } catch (error) {
        return rejectWithValue((error as Error).message || 'Failed to fetch states');
    }
});

export const fetchGeoMetros = createAsyncThunk<
    GeoMetro[],
    string | undefined,
    { rejectValue: string }
>('economic/fetchGeoMetros', async (stateCode, { rejectWithValue }) => {
    try {
        return await apiService.getGeoMetros(stateCode);
    } catch (error) {
        return rejectWithValue((error as Error).message || 'Failed to fetch metros');
    }
});

export const fetchGeoEmployment = createAsyncThunk<
    { geoType: string; data: EmploymentGeo },
    { geoType: string; geoCode: string },
    { rejectValue: string }
>('economic/fetchGeoEmployment', async ({ geoType, geoCode }, { rejectWithValue }) => {
    try {
        const raw = await apiService.getGeoEmployment(geoType, geoCode);
        // Coerce string numerics from API (Decimal serializes as string)
        const data: EmploymentGeo = {
            ...raw,
            employment_thousands: raw.employment_thousands != null ? Number(raw.employment_thousands) : null,
            avg_weekly_hours: raw.avg_weekly_hours != null ? Number(raw.avg_weekly_hours) : null,
            avg_hourly_earnings: raw.avg_hourly_earnings != null ? Number(raw.avg_hourly_earnings) : null,
        };
        return { geoType, data };
    } catch (error) {
        return rejectWithValue((error as Error).message || 'Failed to fetch geo employment');
    }
});

export const fetchGeoJolts = createAsyncThunk<
    { geoType: string; data: JoltsGeo },
    { geoType: string; geoCode: string },
    { rejectValue: string }
>('economic/fetchGeoJolts', async ({ geoType, geoCode }, { rejectWithValue }) => {
    try {
        const data = await apiService.getGeoJolts(geoType, geoCode);
        return { geoType, data };
    } catch (error) {
        return rejectWithValue((error as Error).message || 'Failed to fetch geo JOLTS');
    }
});

export const syncStateEmployment = createAsyncThunk<
    { success: boolean; records_synced: number | null },
    string,
    { rejectValue: string }
>('economic/syncStateEmployment', async (stateCode, { rejectWithValue }) => {
    try {
        logger.info(`Syncing employment for ${stateCode}`, undefined, 'Economic');
        const result = await apiService.syncStateEmployment(stateCode);
        return result;
    } catch (error) {
        return rejectWithValue((error as Error).message || 'Failed to sync state employment');
    }
});

// =============================================================================
// Slice
// =============================================================================

const economicSlice = createSlice({
    name: 'economic',
    initialState,
    reducers: {
        clearError: (state) => {
            state.error = null;
        },
        setLoading: (state, action: PayloadAction<boolean>) => {
            state.isLoading = action.payload;
        },
        resetEconomic: () => initialState,
        setSelectedState: (state, action: PayloadAction<string | null>) => {
            state.selectedState = action.payload;
            state.selectedMetro = null;
            state.stateEmployment = null;
            state.metroEmployment = null;
            state.stateJolts = null;
        },
        setSelectedMetro: (state, action: PayloadAction<string | null>) => {
            state.selectedMetro = action.payload;
            state.metroEmployment = null;
        },
    },
    extraReducers: (builder) => {
        // Fetch Summary
        builder.addCase(fetchEconomicSummary.pending, (state) => {
            state.isLoading = true;
            state.error = null;
        });
        builder.addCase(fetchEconomicSummary.fulfilled, (state, action) => {
            state.isLoading = false;
            state.data = action.payload;
            state.lastUpdated = new Date().toISOString();
        });
        builder.addCase(fetchEconomicSummary.rejected, (state, action) => {
            state.isLoading = false;
            state.error = action.payload || 'Failed to fetch economic data';
        });

        // Sync FRED
        builder.addCase(syncFredData.pending, (state) => {
            state.isSyncing = true;
            state.error = null;
        });
        builder.addCase(syncFredData.fulfilled, (state) => {
            state.isSyncing = false;
        });
        builder.addCase(syncFredData.rejected, (state, action) => {
            state.isSyncing = false;
            state.error = action.payload || 'Failed to sync FRED data';
        });

        // Sync BLS
        builder.addCase(syncBlsData.pending, (state) => {
            state.isSyncing = true;
            state.error = null;
        });
        builder.addCase(syncBlsData.fulfilled, (state) => {
            state.isSyncing = false;
        });
        builder.addCase(syncBlsData.rejected, (state, action) => {
            state.isSyncing = false;
            state.error = action.payload || 'Failed to sync BLS data';
        });

        // Geo States
        builder.addCase(fetchGeoStates.fulfilled, (state, action) => {
            state.states = action.payload;
        });

        // Geo Metros
        builder.addCase(fetchGeoMetros.fulfilled, (state, action) => {
            state.metros = action.payload;
        });

        // Geo Employment
        builder.addCase(fetchGeoEmployment.pending, (state) => {
            state.isGeoLoading = true;
        });
        builder.addCase(fetchGeoEmployment.fulfilled, (state, action) => {
            state.isGeoLoading = false;
            const { geoType, data } = action.payload;
            if (geoType === 'national') state.nationalEmployment = data;
            else if (geoType === 'state') state.stateEmployment = data;
            else if (geoType === 'metro') state.metroEmployment = data;
        });
        builder.addCase(fetchGeoEmployment.rejected, (state) => {
            state.isGeoLoading = false;
        });

        // Geo JOLTS
        builder.addCase(fetchGeoJolts.pending, (state) => {
            state.isGeoLoading = true;
        });
        builder.addCase(fetchGeoJolts.fulfilled, (state, action) => {
            state.isGeoLoading = false;
            const { geoType, data } = action.payload;
            if (geoType === 'national') state.nationalJolts = data;
            else if (geoType === 'state') state.stateJolts = data;
        });
        builder.addCase(fetchGeoJolts.rejected, (state) => {
            state.isGeoLoading = false;
        });

        // Sync State Employment
        builder.addCase(syncStateEmployment.pending, (state) => {
            state.isGeoSyncing = true;
            state.error = null;
        });
        builder.addCase(syncStateEmployment.fulfilled, (state) => {
            state.isGeoSyncing = false;
        });
        builder.addCase(syncStateEmployment.rejected, (state, action) => {
            state.isGeoSyncing = false;
            state.error = action.payload || 'Failed to sync state employment';
        });
    },
});

export const { clearError, setLoading, resetEconomic, setSelectedState, setSelectedMetro } = economicSlice.actions;
export default economicSlice.reducer;
