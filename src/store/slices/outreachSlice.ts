import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { apiService } from '@/services/api';
import type {
    OutreachState, SendingDomain, WarmupHistory,
    CampaignOut, CampaignCreate, EmailSendLog, PermitLead, LeadFilters,
    ThreadContractorSummary, ContractorThreadOut,
} from '@/types';

type WithOutreach = { outreach: OutreachState };

// ============================================================================
// Domain Thunks
// ============================================================================

export const fetchDomains = createAsyncThunk(
    'outreach/fetchDomains',
    async (_, { rejectWithValue }) => {
        try {
            return await apiService.listDomains();
        } catch (err: unknown) {
            return rejectWithValue(_msg(err, 'Failed to load domains'));
        }
    }
);

export const fetchDomainDetail = createAsyncThunk(
    'outreach/fetchDomainDetail',
    async (domainId: string, { rejectWithValue }) => {
        try {
            return await apiService.getDomain(domainId);
        } catch (err: unknown) {
            return rejectWithValue(_msg(err, 'Failed to load domain'));
        }
    }
);

export const fetchWarmupHistory = createAsyncThunk(
    'outreach/fetchWarmupHistory',
    async (domainId: string, { rejectWithValue }) => {
        try {
            return await apiService.getWarmupHistory(domainId);
        } catch (err: unknown) {
            return rejectWithValue(_msg(err, 'Failed to load warmup history'));
        }
    }
);

export const runDnsHealthCheck = createAsyncThunk(
    'outreach/runDnsHealthCheck',
    async (domainId: string, { dispatch, rejectWithValue }) => {
        try {
            const result = await apiService.checkDomainHealth(domainId);
            dispatch(fetchDomains());
            dispatch(fetchDomainDetail(domainId));  // refresh drawer badges
            return result;
        } catch (err: unknown) {
            return rejectWithValue(_msg(err, 'DNS check failed'));
        }
    }
);

export const provisionInboxes = createAsyncThunk(
    'outreach/provisionInboxes',
    async (domainId: string, { dispatch, rejectWithValue }) => {
        try {
            const result = await apiService.provisionInboxes(domainId);
            dispatch(fetchDomains());
            return result;
        } catch (err: unknown) {
            return rejectWithValue(_msg(err, 'Provisioning failed'));
        }
    }
);

export const startWarmup = createAsyncThunk(
    'outreach/startWarmup',
    async ({ domainId, force = false }: { domainId: string; force?: boolean }, { dispatch, rejectWithValue }) => {
        try {
            const result = await apiService.startWarmup(domainId, force);
            dispatch(fetchDomains());
            return result;
        } catch (err: unknown) {
            return rejectWithValue(_msg(err, 'Failed to start warmup'));
        }
    }
);

export const completeWarmup = createAsyncThunk(
    'outreach/completeWarmup',
    async (domainId: string, { dispatch, rejectWithValue }) => {
        try {
            const result = await apiService.completeWarmup(domainId);
            dispatch(fetchDomains());
            return result;
        } catch (err: unknown) {
            return rejectWithValue(_msg(err, 'Failed to complete warmup'));
        }
    }
);

// ============================================================================
// Campaign Thunks
// ============================================================================

export const fetchCampaigns = createAsyncThunk(
    'outreach/fetchCampaigns',
    async (status: string | undefined = undefined, { rejectWithValue }) => {
        try {
            return await apiService.listCampaigns(status);
        } catch (err: unknown) {
            return rejectWithValue(_msg(err, 'Failed to load campaigns'));
        }
    }
);

export const createCampaign = createAsyncThunk(
    'outreach/createCampaign',
    async (data: CampaignCreate, { dispatch, rejectWithValue }) => {
        try {
            const result = await apiService.createCampaign(data);
            dispatch(fetchCampaigns());
            return result;
        } catch (err: unknown) {
            return rejectWithValue(_msg(err, 'Failed to create campaign'));
        }
    }
);

export const startCampaign = createAsyncThunk(
    'outreach/startCampaign',
    async (id: string, { dispatch, rejectWithValue }) => {
        try {
            const result = await apiService.startCampaign(id);
            dispatch(fetchCampaigns());
            return result;
        } catch (err: unknown) {
            return rejectWithValue(_msg(err, 'Failed to start campaign'));
        }
    }
);

export const pauseCampaign = createAsyncThunk(
    'outreach/pauseCampaign',
    async (id: string, { dispatch, rejectWithValue }) => {
        try {
            const result = await apiService.pauseCampaign(id);
            dispatch(fetchCampaigns());
            return result;
        } catch (err: unknown) {
            return rejectWithValue(_msg(err, 'Failed to pause campaign'));
        }
    }
);

// ============================================================================
// Send History Thunks
// ============================================================================

export const fetchSendHistory = createAsyncThunk(
    'outreach/fetchSendHistory',
    async (params: { campaign_id?: string; status?: string; limit?: number } = {}, { rejectWithValue }) => {
        try {
            return await apiService.getSendHistory(params);
        } catch (err: unknown) {
            return rejectWithValue(_msg(err, 'Failed to load send history'));
        }
    }
);

// ============================================================================
// Lead Queue Thunks
// ============================================================================

export const fetchLeads = createAsyncThunk(
    'outreach/fetchLeads',
    async (filters: LeadFilters, { rejectWithValue }) => {
        try {
            return await apiService.getPermitLeads(filters);
        } catch (err: unknown) {
            return rejectWithValue(_msg(err, 'Failed to load leads'));
        }
    }
);

// ============================================================================
// Thread Thunks
// ============================================================================

export const fetchThreadContractors = createAsyncThunk(
    'outreach/fetchThreadContractors',
    async (params: { search?: string; replied_only?: boolean; limit?: number; offset?: number } | undefined, { rejectWithValue }) => {
        try {
            return await apiService.listThreadContractors(params);
        } catch (err: unknown) {
            return rejectWithValue(_msg(err, 'Failed to load thread contractors'));
        }
    }
);

export const fetchEmailThread = createAsyncThunk(
    'outreach/fetchEmailThread',
    async (email: string, { rejectWithValue }) => {
        try {
            return await apiService.getEmailThread(email);
        } catch (err: unknown) {
            return rejectWithValue(_msg(err, 'Failed to load thread'));
        }
    }
);

// ============================================================================
// Initial State
// ============================================================================

const DEFAULT_FILTERS: LeadFilters = {
    min_cost: 100000,
    max_cost: 5000000,
    permit_types: 'electrical,plumbing,mechanical,hvac,new construction',
    days_since_issued: 30,
    has_contractor_email: true,
    limit: 100,
    offset: 0,
};

const initialState: OutreachState = {
    // Domains
    domains: [],
    domainsStatus: 'idle',
    domainsError: null,
    selectedDomain: null,
    warmupHistory: null,
    // Campaigns
    campaigns: [],
    campaignsStatus: 'idle',
    campaignsError: null,
    // Leads
    leads: [],
    leadsStatus: 'idle',
    leadsTotal: 0,
    leadFilters: DEFAULT_FILTERS,
    // Send History
    sendHistory: [],
    sendHistoryStatus: 'idle',
    // Threads
    threadContractors: [],
    threadContractorsStatus: 'idle',
    selectedThreadEmail: null,
    activeThread: null,
    activeThreadStatus: 'idle',
    threadSearch: '',
};

// ============================================================================
// Slice
// ============================================================================

const outreachSlice = createSlice({
    name: 'outreach',
    initialState,
    reducers: {
        setSelectedDomain(state, action: PayloadAction<SendingDomain | null>) {
            state.selectedDomain = action.payload;
            state.warmupHistory = null;
        },
        clearError(state) {
            state.domainsError = null;
            state.campaignsError = null;
        },
        setLeadFilters(state, action: PayloadAction<Partial<LeadFilters>>) {
            state.leadFilters = { ...state.leadFilters, ...action.payload };
        },
        resetLeadFilters(state) {
            state.leadFilters = DEFAULT_FILTERS;
        },
        setSelectedThreadEmail(state, action: PayloadAction<string | null>) {
            state.selectedThreadEmail = action.payload;
            state.activeThread = null;
            state.activeThreadStatus = 'idle';
        },
        setThreadSearch(state, action: PayloadAction<string>) {
            state.threadSearch = action.payload;
        },
    },
    extraReducers: (builder) => {
        builder
            // ── Domains ──
            .addCase(fetchDomains.pending, (state) => {
                state.domainsStatus = 'loading';
                state.domainsError = null;
            })
            .addCase(fetchDomains.fulfilled, (state, action) => {
                state.domainsStatus = 'succeeded';
                state.domains = action.payload;
            })
            .addCase(fetchDomains.rejected, (state, action) => {
                state.domainsStatus = 'failed';
                state.domainsError = action.payload as string;
            })
            .addCase(fetchDomainDetail.fulfilled, (state, action) => {
                state.selectedDomain = action.payload;
            })
            .addCase(fetchWarmupHistory.fulfilled, (state, action) => {
                state.warmupHistory = action.payload;
            })
            // ── Campaigns ──
            .addCase(fetchCampaigns.pending, (state) => {
                state.campaignsStatus = 'loading';
                state.campaignsError = null;
            })
            .addCase(fetchCampaigns.fulfilled, (state, action) => {
                state.campaignsStatus = 'succeeded';
                state.campaigns = action.payload;
            })
            .addCase(fetchCampaigns.rejected, (state, action) => {
                state.campaignsStatus = 'failed';
                state.campaignsError = action.payload as string;
            })
            // ── Send History ──
            .addCase(fetchSendHistory.pending, (state) => {
                state.sendHistoryStatus = 'loading';
            })
            .addCase(fetchSendHistory.fulfilled, (state, action) => {
                state.sendHistoryStatus = 'succeeded';
                state.sendHistory = action.payload;
            })
            .addCase(fetchSendHistory.rejected, (state) => {
                state.sendHistoryStatus = 'failed';
            })
            // ── Leads ──
            .addCase(fetchLeads.pending, (state) => {
                state.leadsStatus = 'loading';
            })
            .addCase(fetchLeads.fulfilled, (state, action) => {
                state.leadsStatus = 'succeeded';
                state.leads = action.payload.items;
                state.leadsTotal = action.payload.total;
            })
            .addCase(fetchLeads.rejected, (state) => {
                state.leadsStatus = 'failed';
            })
            // ── Threads ──
            .addCase(fetchThreadContractors.pending, (state) => {
                state.threadContractorsStatus = 'loading';
            })
            .addCase(fetchThreadContractors.fulfilled, (state, action) => {
                state.threadContractorsStatus = 'succeeded';
                state.threadContractors = action.payload;
            })
            .addCase(fetchThreadContractors.rejected, (state) => {
                state.threadContractorsStatus = 'failed';
            })
            .addCase(fetchEmailThread.pending, (state) => {
                state.activeThreadStatus = 'loading';
                state.activeThread = null;
            })
            .addCase(fetchEmailThread.fulfilled, (state, action) => {
                state.activeThreadStatus = 'succeeded';
                state.activeThread = action.payload;
            })
            .addCase(fetchEmailThread.rejected, (state) => {
                state.activeThreadStatus = 'failed';
            });
    },
});

export const {
    setSelectedDomain, clearError, setLeadFilters, resetLeadFilters,
    setSelectedThreadEmail, setThreadSearch,
} = outreachSlice.actions;
export default outreachSlice.reducer;

// ── Selectors ─────────────────────────────────────────────────────────────────

export const selectDomains          = (s: WithOutreach) => s.outreach.domains;
export const selectDomainsStatus    = (s: WithOutreach) => s.outreach.domainsStatus;
export const selectDomainsError     = (s: WithOutreach) => s.outreach.domainsError;
export const selectSelectedDomain   = (s: WithOutreach) => s.outreach.selectedDomain;
export const selectWarmupHistory    = (s: WithOutreach) => s.outreach.warmupHistory;
export const selectCampaigns        = (s: WithOutreach) => s.outreach.campaigns;
export const selectCampaignsStatus  = (s: WithOutreach) => s.outreach.campaignsStatus;
export const selectCampaignsError   = (s: WithOutreach) => s.outreach.campaignsError;
export const selectSendHistory      = (s: WithOutreach) => s.outreach.sendHistory;
export const selectSendHistoryStatus= (s: WithOutreach) => s.outreach.sendHistoryStatus;
export const selectLeads            = (s: WithOutreach) => s.outreach.leads;
export const selectLeadsStatus      = (s: WithOutreach) => s.outreach.leadsStatus;
export const selectLeadsTotal       = (s: WithOutreach) => s.outreach.leadsTotal;
export const selectLeadFilters          = (s: WithOutreach) => s.outreach.leadFilters;
export const selectThreadContractors    = (s: WithOutreach) => s.outreach.threadContractors;
export const selectThreadContractorsStatus = (s: WithOutreach) => s.outreach.threadContractorsStatus;
export const selectSelectedThreadEmail = (s: WithOutreach) => s.outreach.selectedThreadEmail;
export const selectActiveThread        = (s: WithOutreach) => s.outreach.activeThread;
export const selectActiveThreadStatus  = (s: WithOutreach) => s.outreach.activeThreadStatus;
export const selectThreadSearch        = (s: WithOutreach) => s.outreach.threadSearch;

// ── Internal helpers ──────────────────────────────────────────────────────────

function _msg(err: unknown, fallback: string): string {
    return (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ?? fallback;
}
