import axios, { AxiosInstance, AxiosError, AxiosResponse, InternalAxiosRequestConfig } from 'axios';
import { logger } from '@/utils/logger';

// Injected at startup by store.ts to avoid circular dep: store → slices → api → store
let _getToken: (() => string | null) | null = null;
let _dispatch: ((action: unknown) => void) | null = null;
let _setAccessToken: ((token: string) => unknown) | null = null;
let _logout: (() => unknown) | null = null;

export interface AgentRun {
    id: string;
    created_at: string | null;
    model: string | null;
    temperature: number | null;
    input_tokens: number | null;
    output_tokens: number | null;
    total_tokens: number | null;
    latency_ms: number | null;
    success: boolean;
    error: string | null;
    input_content: string | null;
    output_content: string | null;
    context_label: string | null;
}

export function injectStoreAuth(opts: {
    getToken: () => string | null;
    dispatch: (action: unknown) => void;
    setAccessToken: (token: string) => unknown;
    logout: () => unknown;
}) {
    _getToken = opts.getToken;
    _dispatch = opts.dispatch;
    _setAccessToken = opts.setAccessToken;
    _logout = opts.logout;
}
import {
    QueryRequest,
    QueryResponse,
    UploadResponse,
    ExamplesResponse,
    ExamplesApiResponse,
    SchemaResponse,
    ApiError,
    ExampleQuestion,
    ConversationSession,
    ConversationHistoryMessage,
    IntelligenceReportType,
    PermitRecord,
    PermitSearchParams,
    PermitSearchResponse,
    PermitCitiesResponse,
    PermitStats,
    CitySyncStatus,
    SyncResponse,
    DeleteCityResponse,
    BulkDeleteResponse,
    ContractorRecord,
    ContractorSearchParams,
    ContractorSearchResponse,
    ContractorTypesResponse,
    ContractorStatesResponse,
    ContractorCitiesResponse,
    ContractorImportResult,
    RegistrySourcesResponse,
    RegistrySearchParams,
    RegistrySearchResponse,
    RegistryRecordDetail,
    CityMonthlyStats,
    CitySyncHistoryEntry,
    CityZipEntry,
    PermitCounty,
    PermitCountiesResponse,
    CountyMonthlyStats,
    CountyCoverageGap,
    CountyBreakdown,
    UserRecord,
    PermitContact,
    FindEmailResponse,
    LeadBank,
    LeadDistributionResult,
    ScoringRubricDetail,
    PermitScorePreview,
    ScoringStats,
    SampleScoreResponse,
    CostEstimateStats,
} from '@/types';

export type WarmupDailyEntry = { date: string; sent: number; received: number; landed_inbox: number; landed_spam: number };
export type WarmupAnalytics = { email: string; sent: number; received: number; landed_inbox: number; landed_spam: number; health_score: number | null; daily: WarmupDailyEntry[] };

export type WarmupThread = {
    thread_id: string;
    subject: string;
    snippet: string;
    from: string;
    to: string;
    date: string;
    message_count: number;
    direction: 'sent' | 'received';
    source: 'inbox' | 'sent' | 'spam' | 'promotions';
    labels: string[];
    is_labeled: boolean;
};

export type WarmupMessage = {
    id: string;
    from: string;
    to: string;
    subject: string;
    date: string;
    body: string;
    snippet: string;
    direction: 'sent' | 'received';
};

export type WarmupThreadDetail = {
    thread_id: string;
    subject: string;
    messages: WarmupMessage[];
    error?: string;
};

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';

class ApiService {
    private client: AxiosInstance;
    private context = 'API';

    constructor() {
        this.client = axios.create({
            baseURL: API_BASE_URL,
            headers: {
                'Content-Type': 'application/json',
            },
            timeout: 120000, // 2 minutes for LLM queries
        });

        this.setupInterceptors();
        logger.info('API Service initialized', { baseURL: API_BASE_URL }, this.context);
    }

    private setupInterceptors() {
        let isRefreshing = false;
        let failedQueue: Array<{ resolve: (token: string) => void; reject: (err: unknown) => void }> = [];

        const processQueue = (error: unknown, token: string | null = null) => {
            failedQueue.forEach(({ resolve, reject }) => {
                if (error) reject(error);
                else if (token) resolve(token);
            });
            failedQueue = [];
        };

        // Request interceptor — inject Bearer token
        this.client.interceptors.request.use(
            (config) => {
                const token = _getToken?.() ?? null;
                if (token) {
                    config.headers = config.headers ?? {};
                    config.headers['Authorization'] = `Bearer ${token}`;
                }
                logger.debug(
                    `Request: ${config.method?.toUpperCase()} ${config.url}`,
                    { params: config.params, data: config.data ? '[DATA]' : undefined },
                    this.context
                );
                return config;
            },
            (error) => {
                logger.error('Request Error', error, this.context);
                return Promise.reject(error);
            }
        );

        // Response interceptor — silent refresh on 401
        this.client.interceptors.response.use(
            (response: AxiosResponse) => {
                logger.debug(
                    `Response: ${response.status} ${response.config.url}`,
                    { status: response.status },
                    this.context
                );
                return response;
            },
            async (error: AxiosError) => {
                const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

                if (error.response?.status === 401 && !originalRequest._retry) {
                    if (isRefreshing) {
                        return new Promise<string>((resolve, reject) => {
                            failedQueue.push({ resolve, reject });
                        }).then(token => {
                            originalRequest.headers['Authorization'] = `Bearer ${token}`;
                            return this.client(originalRequest);
                        }).catch(err => Promise.reject(err));
                    }

                    originalRequest._retry = true;
                    isRefreshing = true;

                    try {
                        const response = await axios.post<{ access_token: string }>(
                            `${API_BASE_URL}/auth/refresh`,
                            {},
                            { withCredentials: true }
                        );
                        const newToken = response.data.access_token;
                        if (_dispatch && _setAccessToken) _dispatch(_setAccessToken(newToken));
                        processQueue(null, newToken);
                        originalRequest.headers['Authorization'] = `Bearer ${newToken}`;
                        return this.client(originalRequest);
                    } catch (refreshError) {
                        processQueue(refreshError);
                        if (_dispatch && _logout) _dispatch(_logout());
                        if (typeof window !== 'undefined') {
                            window.location.href = '/login';
                        }
                        return Promise.reject(refreshError);
                    } finally {
                        isRefreshing = false;
                    }
                }

                const apiError = this.handleError(error);
                logger.error(
                    `Response Error: ${error.config?.url}`,
                    { status: error.response?.status, message: apiError.message },
                    this.context
                );
                return Promise.reject(apiError);
            }
        );
    }

    private handleError(error: AxiosError): ApiError {
        // Client-side timeout (request aborted before any response).
        if (error.code === 'ECONNABORTED' || /timeout/i.test(error.message || '')) {
            return {
                message: 'The request timed out. A long operation may still be completing on the server — refresh in a moment to check.',
                status: 0,
            };
        }

        if (error.response) {
            const status = error.response.status;
            const data = error.response.data as Record<string, unknown> | string | undefined;

            // Prefer the backend's own message (FastAPI `detail`, or `message`).
            let message: string | undefined;
            if (data && typeof data === 'object') {
                const detail = (data as Record<string, unknown>).detail;
                if (typeof detail === 'string') {
                    message = detail;
                } else if (Array.isArray(detail)) {
                    // FastAPI validation errors: [{ loc, msg, type }, ...]
                    message = detail
                        .map((d) => (d && typeof d === 'object' ? (d as { msg?: string }).msg : null))
                        .filter(Boolean)
                        .join('; ') || undefined;
                }
                message = message || ((data as Record<string, unknown>).message as string | undefined);
            }

            // No parseable body (e.g. a gateway 502/504 HTML page) — explain the status.
            if (!message) {
                const byStatus: Record<number, string> = {
                    502: 'Bad gateway — the server is temporarily unavailable. Try again shortly.',
                    503: 'The server is temporarily unavailable. Try again shortly.',
                    504: 'Gateway timeout — the server took too long to respond. A large operation may still be running in the background; refresh the page in a minute to check.',
                    500: 'Internal server error. Check the server logs for the full traceback.',
                };
                message = byStatus[status] || `Request failed (HTTP ${status}).`;
            }

            return {
                message,
                status,
                details: typeof data === 'object' ? (data as Record<string, unknown>) : undefined,
            };
        } else if (error.request) {
            return {
                message: 'Network error — could not reach the server. Please check your connection.',
                status: 0,
            };
        } else {
            return {
                message: error.message || 'An unexpected error occurred',
            };
        }
    }

    // =========================================================================
    // File Upload
    // =========================================================================

    async uploadExcel(file: File): Promise<UploadResponse> {
        const formData = new FormData();
        formData.append('file', file);

        logger.info(`Uploading file: ${file.name}`, { size: file.size, type: file.type }, this.context);

        const response = await this.client.post<UploadResponse>('/upload-excel', formData, {
            headers: {
                'Content-Type': 'multipart/form-data',
            },
        });

        logger.info('File uploaded successfully', response.data, this.context);
        return response.data;
    }

    // =========================================================================
    // Natural Language Query (with Session support)
    // =========================================================================

    async sendQuery(question: string, sessionId?: string): Promise<QueryResponse> {
        logger.info('Sending query', { question, sessionId }, this.context);

        const payload: QueryRequest = {
            question,
            session_id: sessionId,
        };
        const response = await this.client.post<QueryResponse>('/query', payload);

        logger.info('Query response received', {
            success: response.data.success,
            sessionId: response.data.session_id,
            hasContext: response.data.has_context,
        }, this.context);
        return response.data;
    }

    // =========================================================================
    // Session Management
    // =========================================================================

    async createSession(userId?: string): Promise<ConversationSession> {
        logger.info('Creating new session', { userId }, this.context);

        const params = userId ? { user_id: userId } : {};
        const response = await this.client.post<Record<string, unknown>>('/sessions', null, { params });
        const d = response.data;

        return {
            id: d.id as string,
            title: (d.title as string) || 'New Conversation',
            createdAt: (d.created_at || d.createdAt) as string,
            updatedAt: (d.updated_at || d.updatedAt) as string,
            isActive: (d.is_active ?? d.isActive ?? true) as boolean,
            contextSummary: (d.context_summary || d.contextSummary) as string | undefined,
        };
    }

    async listSessions(userId?: string, limit = 20): Promise<ConversationSession[]> {
        logger.debug('Fetching sessions', { userId, limit }, this.context);

        const params: Record<string, unknown> = { limit };
        if (userId) params.user_id = userId;

        const response = await this.client.get<{ sessions: Record<string, unknown>[] }>('/sessions', { params });

        return response.data.sessions.map(s => ({
            id: s.id as string,
            title: (s.title as string) || 'Untitled Conversation',
            createdAt: (s.created_at || s.createdAt) as string,
            updatedAt: (s.updated_at || s.updatedAt) as string,
            isActive: (s.is_active ?? s.isActive ?? true) as boolean,
            contextSummary: (s.context_summary || s.contextSummary) as string | undefined,
        }));
    }

    async getSession(sessionId: string): Promise<ConversationSession> {
        const response = await this.client.get<Record<string, unknown>>(`/sessions/${sessionId}`);
        const d = response.data;
        return {
            id: d.id as string,
            title: (d.title as string) || 'Untitled Conversation',
            createdAt: (d.created_at || d.createdAt) as string,
            updatedAt: (d.updated_at || d.updatedAt) as string,
            isActive: (d.is_active ?? d.isActive ?? true) as boolean,
            contextSummary: (d.context_summary || d.contextSummary) as string | undefined,
        };
    }

    async getSessionHistory(sessionId: string, limit = 50): Promise<ConversationHistoryMessage[]> {
        logger.debug('Fetching session history', { sessionId, limit }, this.context);

        const response = await this.client.get<{ session_id: string; messages: Record<string, unknown>[] }>(
            `/sessions/${sessionId}/history`,
            { params: { limit } }
        );

        return response.data.messages.map(m => ({
            id: m.id as string,
            role: m.role as 'user' | 'assistant' | 'system',
            content: m.content as string,
            sqlQuery: (m.sql_query || m.sqlQuery) as string | undefined,
            createdAt: (m.created_at || m.createdAt) as string,
            isError: (m.is_error ?? m.isError ?? false) as boolean,
        }));
    }

    async deleteSession(sessionId: string): Promise<void> {
        logger.info('Deleting session', { sessionId }, this.context);
        await this.client.delete(`/sessions/${sessionId}`);
    }

    // =========================================================================
    // Intelligence Reports
    // =========================================================================

    async getIntelligenceTypes(): Promise<IntelligenceReportType[]> {
        const response = await this.client.get<{ types: IntelligenceReportType[] }>('/intelligence/types');
        return response.data.types;
    }

    async getMarketPulse(sessionId?: string): Promise<QueryResponse> {
        const params = sessionId ? { session_id: sessionId } : {};
        const response = await this.client.get<QueryResponse>('/intelligence/market-pulse', { params });
        return response.data;
    }

    async getHotCBSAs(sessionId?: string): Promise<QueryResponse> {
        const params = sessionId ? { session_id: sessionId } : {};
        const response = await this.client.get<QueryResponse>('/intelligence/hot-cbsas', { params });
        return response.data;
    }

    async getCoolingCBSAs(sessionId?: string): Promise<QueryResponse> {
        const params = sessionId ? { session_id: sessionId } : {};
        const response = await this.client.get<QueryResponse>('/intelligence/cooling-cbsas', { params });
        return response.data;
    }

    async getHighValuePermits(sessionId?: string): Promise<QueryResponse> {
        const params = sessionId ? { session_id: sessionId } : {};
        const response = await this.client.get<QueryResponse>('/intelligence/high-value', { params });
        return response.data;
    }

    async getTradeOpportunity(sessionId?: string): Promise<QueryResponse> {
        const params = sessionId ? { session_id: sessionId } : {};
        const response = await this.client.get<QueryResponse>('/intelligence/trade-opportunity', { params });
        return response.data;
    }

    async getVelocityAlerts(sessionId?: string): Promise<QueryResponse> {
        const params = sessionId ? { session_id: sessionId } : {};
        const response = await this.client.get<QueryResponse>('/intelligence/velocity-alerts', { params });
        return response.data;
    }

    async getOutreachPriority(sessionId?: string): Promise<QueryResponse> {
        const params = sessionId ? { session_id: sessionId } : {};
        const response = await this.client.get<QueryResponse>('/intelligence/outreach-priority', { params });
        return response.data;
    }

    async getFullIntelligenceReport(sessionId?: string): Promise<QueryResponse> {
        const params = sessionId ? { session_id: sessionId } : {};
        const response = await this.client.get<QueryResponse>('/intelligence/full-report', { params });
        return response.data;
    }

    // =========================================================================
    // Utility Endpoints
    // =========================================================================

    async getExamples(): Promise<ExamplesResponse> {
        logger.debug('Fetching example questions', undefined, this.context);

        const response = await this.client.get<ExamplesApiResponse>('/query/examples');

        // Transform nested structure to flat ExampleQuestion array
        const flatExamples: ExampleQuestion[] = [];
        response.data.examples.forEach((categoryGroup, catIndex) => {
            categoryGroup.questions.forEach((question, qIndex) => {
                flatExamples.push({
                    id: `${catIndex}-${qIndex}`,
                    question,
                    category: categoryGroup.category,
                });
            });
        });

        logger.debug('Examples fetched', { count: flatExamples.length }, this.context);
        return { examples: flatExamples };
    }

    async getSchema(): Promise<SchemaResponse> {
        logger.debug('Fetching database schema', undefined, this.context);

        const response = await this.client.get<SchemaResponse>('/schema');

        logger.debug('Schema fetched', { tables: response.data.tables.length }, this.context);
        return response.data;
    }

    async resetAgent(): Promise<{ message: string }> {
        const response = await this.client.post<{ message: string }>('/reset');
        return response.data;
    }

    // =========================================================================
    // Permit Records (Socrata Data)
    // =========================================================================

    async searchPermits(params: PermitSearchParams): Promise<PermitSearchResponse> {
        logger.debug('Searching permits', { params }, this.context);

        // Convert params to query string format expected by backend
        const queryParams: Record<string, string | number | boolean> = {
            limit: params.limit,
            offset: params.offset,
            order_by: params.order_by,
            order_desc: params.order_desc,
        };

        if (params.city) queryParams.city = params.city;
        if (params.state) queryParams.state = params.state;
        if (params.county) queryParams.county = params.county;
        if (params.opportunity_category) queryParams.opportunity_category = params.opportunity_category;
        if (params.issued_age_bucket) queryParams.issued_age_bucket = params.issued_age_bucket;
        if (params.project_class) queryParams.project_class = params.project_class;
        if (params.work_scope) queryParams.work_scope = params.work_scope;
        if (params.contractor_name) queryParams.contractor_name = params.contractor_name;
        if (params.start_date) queryParams.start_date = params.start_date;
        if (params.end_date) queryParams.end_date = params.end_date;
        if (params.search) queryParams.search = params.search;
        if (params.min_cost != null) queryParams.min_cost = params.min_cost;
        if (params.max_cost != null) queryParams.max_cost = params.max_cost;
        if (params.score_bucket) queryParams.score_bucket = params.score_bucket;
        if (params.is_excluded !== undefined) queryParams.is_excluded = params.is_excluded;
        if (params.cost_source) queryParams.cost_source = params.cost_source;

        const response = await this.client.get<PermitSearchResponse>('/permits/search', {
            params: queryParams
        });

        logger.debug('Permits search results', {
            total: response.data.total,
            returned: response.data.data.length
        }, this.context);

        return response.data;
    }

    async getPermitById(id: string): Promise<PermitRecord> {
        logger.debug('Fetching permit by ID', { id }, this.context);
        const response = await this.client.get<PermitRecord>(`/permits/${id}`);
        return response.data;
    }

    async getPermitRawPayload(id: string): Promise<Record<string, unknown>> {
        const response = await this.client.get<{ payload: Record<string, unknown> }>(`/permits/${id}/raw`);
        return response.data.payload;
    }

    async getPermitCities(): Promise<PermitCitiesResponse> {
        logger.debug('Fetching permit cities', undefined, this.context);
        const response = await this.client.get<PermitCitiesResponse>('/permits/cities');
        return response.data;
    }

    async getPermitCounties(state?: string): Promise<PermitCountiesResponse> {
        logger.debug('Fetching permit counties', { state }, this.context);
        const response = await this.client.get<PermitCountiesResponse>('/permits/counties', {
            params: state ? { state } : undefined,
        });
        return response.data;
    }

    async getCountyMonthlyStats(countyName: string, months = 6): Promise<{ county_name: string; monthly: CountyMonthlyStats[] }> {
        logger.debug('Fetching county monthly stats', { countyName, months }, this.context);
        const response = await this.client.get(`/permits/counties/${encodeURIComponent(countyName)}/monthly`, {
            params: { months },
        });
        return response.data;
    }

    async getCountyCoverageGaps(): Promise<{ gaps: CountyCoverageGap[] }> {
        logger.debug('Fetching county coverage gaps', undefined, this.context);
        const response = await this.client.get('/permits/counties/coverage-gaps');
        return response.data;
    }

    async getCountyBreakdown(countyName: string): Promise<CountyBreakdown> {
        logger.debug('Fetching county breakdown', { countyName }, this.context);
        const response = await this.client.get<CountyBreakdown>(
            `/permits/counties/${encodeURIComponent(countyName)}/breakdown`,
        );
        return response.data;
    }

    async getPermitStats(city: string): Promise<PermitStats> {
        logger.debug('Fetching permit stats', { city }, this.context);
        const response = await this.client.get<PermitStats>(`/permits/stats/${city}`);
        return response.data;
    }

    async syncPermits(
        city: string,
        asyncMode = true,
        maxRecords?: number,
        startDate?: string,
        endDate?: string,
    ): Promise<SyncResponse> {
        logger.info('Syncing permits', { city, asyncMode, maxRecords, startDate, endDate }, this.context);
        const params: Record<string, string | number | boolean> = {
            async_mode: asyncMode,
        };
        if (maxRecords) params.max_records = maxRecords;
        if (startDate) params.start_date = startDate;
        if (endDate) params.end_date = endDate;

        const response = await this.client.post<SyncResponse>(
            `/permits/sync/${city}`,
            null,
            { params, timeout: 300000 } // 5 min timeout for sync
        );
        return response.data;
    }

    async getCitySyncStatus(city: string): Promise<CitySyncStatus> {
        logger.debug('Fetching city sync status', { city }, this.context);
        const response = await this.client.get<CitySyncStatus>(`/permits/sync/status/${city}`);
        return response.data;
    }

    async deleteCityPermits(city: string, confirm = false): Promise<DeleteCityResponse> {
        logger.info('Deleting city permits', { city, confirm }, this.context);
        const response = await this.client.delete<DeleteCityResponse>(
            `/permits/city/${city}`,
            { params: { confirm } }
        );
        return response.data;
    }

    async bulkDeletePermits(permitIds: string[], confirm = false): Promise<BulkDeleteResponse> {
        logger.info('Bulk deleting permits', { count: permitIds.length, confirm }, this.context);
        const response = await this.client.delete<BulkDeleteResponse>(
            '/permits/bulk',
            { data: { permit_ids: permitIds, confirm } }
        );
        return response.data;
    }

    async bulkDeleteByFilter(
        filters: Omit<PermitSearchParams, 'limit' | 'offset' | 'order_by' | 'order_desc'>,
        confirm = false,
    ): Promise<BulkDeleteResponse> {
        logger.info('Bulk deleting permits by filter', { filters, confirm }, this.context);
        const params: Record<string, string | number | boolean> = { confirm };
        if (filters.city) params.city = filters.city;
        if (filters.state) params.state = filters.state;
        if (filters.opportunity_category) params.opportunity_category = filters.opportunity_category;
        if (filters.project_class) params.project_class = filters.project_class;
        if (filters.work_scope) params.work_scope = filters.work_scope;
        if (filters.contractor_name) params.contractor_name = filters.contractor_name;
        if (filters.start_date) params.start_date = filters.start_date;
        if (filters.end_date) params.end_date = filters.end_date;
        if (filters.search) params.search = filters.search;
        if (filters.min_cost) params.min_cost = filters.min_cost;
        if (filters.max_cost) params.max_cost = filters.max_cost;
        const response = await this.client.delete<BulkDeleteResponse>(
            '/permits/bulk-by-filter',
            { params }
        );
        return response.data;
    }

    // =========================================================================
    // Economic Data (FRED & BLS)
    // =========================================================================

    async getEconomicSummary(): Promise<{
        interest_rates: {
            mortgage_30y: number | null;
            mortgage_15y: number | null;
            fed_funds: number | null;
            prime_rate: number | null;
            as_of_date: string | null;
        };
        employment: {
            total_construction: number | null;
            residential: number | null;
            nonresidential: number | null;
            avg_weekly_hours: number | null;
            avg_hourly_earnings: number | null;
            as_of_date: string | null;
        };
        labor_turnover: {
            job_openings: number | null;
            hires: number | null;
            separations: number | null;
            quits: number | null;
            layoffs: number | null;
            tightness_ratio: number | null;
            as_of_date: string | null;
        };
    }> {
        logger.debug('Fetching economic summary', undefined, this.context);
        const response = await this.client.get('/economic/summary');
        return response.data;
    }

    async syncFredData(): Promise<{
        source: string;
        success: boolean;
        records_synced: Record<string, number>;
        message: string;
    }> {
        logger.info('Syncing FRED data', undefined, this.context);
        const response = await this.client.post('/economic/sync/fred', null, {
            timeout: 60000, // 1 minute timeout for sync
        });
        return response.data;
    }

    async syncBlsData(): Promise<{
        source: string;
        success: boolean;
        records_synced: Record<string, number>;
        message: string;
    }> {
        logger.info('Syncing BLS data', undefined, this.context);
        const response = await this.client.post('/economic/sync/bls', null, {
            timeout: 60000, // 1 minute timeout for sync
        });
        return response.data;
    }

    // =========================================================================
    // Geographic Economic Data
    // =========================================================================

    async getGeoStates(): Promise<{
        code: string;
        fips_code: string;
        name: string;
        region: string | null;
    }[]> {
        const response = await this.client.get('/economic/geo/states');
        return response.data;
    }

    async getGeoMetros(state?: string): Promise<{
        id: number;
        metro_code: string;
        metro_name: string;
        state_code: string;
        population: number | null;
    }[]> {
        const params = state ? { state } : {};
        const response = await this.client.get('/economic/geo/metros', { params });
        return response.data;
    }

    async getGeoEmployment(geoType: string, geoCode: string): Promise<{
        observation_date: string;
        geo_type: string;
        geo_code: string;
        geo_name: string | null;
        employment_thousands: number | null;
        avg_weekly_hours: number | null;
        avg_hourly_earnings: number | null;
    }> {
        const response = await this.client.get(`/economic/geo/employment/${geoType}/${geoCode}`);
        return response.data;
    }

    async getGeoJolts(geoType: string, geoCode: string): Promise<{
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
    }> {
        const response = await this.client.get(`/economic/geo/jolts/${geoType}/${geoCode}`);
        return response.data;
    }

    async syncStateEmployment(stateCode: string): Promise<{
        success: boolean;
        records_synced: number | null;
        error: string | null;
        geo_code: string | null;
    }> {
        logger.info(`Syncing employment for state ${stateCode}`, undefined, this.context);
        const response = await this.client.post(`/economic/geo/sync/state/${stateCode}/employment`, null, {
            timeout: 60000,
        });
        return response.data;
    }

    async syncAllStates(): Promise<{
        message: string;
        success_count: number;
        failed_count: number;
        errors: string[];
    }> {
        logger.info('Syncing all states employment', undefined, this.context);
        const response = await this.client.post('/economic/geo/sync/all-states', null, {
            timeout: 300000, // 5 min timeout
        });
        return response.data;
    }

    // =========================================================================
    // Agent Prompt Management
    // =========================================================================

    async getActivePrompt(name = 'db_agent_system'): Promise<{
        id: string;
        name: string;
        version: number;
        content: string;
        is_active: boolean;
        created_by: string | null;
        created_at: string;
    }> {
        const response = await this.client.get('/agent-prompt/active', {
            params: { name },
        });
        return response.data;
    }

    async getPromptHistory(name = 'db_agent_system', limit = 20): Promise<{
        prompts: Array<{
            id: string;
            name: string;
            version: number;
            content: string;
            is_active: boolean;
            created_by: string | null;
            created_at: string;
        }>;
        total: number;
    }> {
        const response = await this.client.get('/agent-prompt/history', {
            params: { name, limit },
        });
        return response.data;
    }

    async createPrompt(content: string, createdBy?: string, name = 'db_agent_system'): Promise<{
        id: string;
        name: string;
        version: number;
        content: string;
        is_active: boolean;
        created_by: string | null;
        created_at: string;
    }> {
        const response = await this.client.post('/agent-prompt', {
            content,
            name,
            created_by: createdBy,
        });
        return response.data;
    }

    async activatePrompt(promptId: string): Promise<{
        id: string;
        name: string;
        version: number;
        content: string;
        is_active: boolean;
        created_by: string | null;
        created_at: string;
    }> {
        const response = await this.client.put(`/agent-prompt/${promptId}/activate`);
        return response.data;
    }

    // =========================================================================
    // Agent Configuration (Multi-Agent / Model Selection)
    // =========================================================================

    async getAgents(): Promise<{
        id: string;
        agent_id: string;
        display_name: string;
        description: string | null;
        llm_model: string;
        temperature: number;
        max_tokens: number | null;
        has_api_key: boolean;
        api_key_validation_status: string | null;
        api_key_validated_at: string | null;
        api_key_validation_error_code: string | null;
        research_feeds_estimator: boolean;
        is_active: boolean;
        created_at: string | null;
        updated_at: string | null;
        config_metadata: Record<string, unknown> | null;
    }[]> {
        const response = await this.client.get('/agents');
        return response.data;
    }

    async getAvailableModels(): Promise<{
        id: string;
        name: string;
        category: string;
    }[]> {
        const response = await this.client.get('/agents/models');
        return response.data;
    }

    async getAgentConfig(agentId: string): Promise<{
        id: string;
        agent_id: string;
        display_name: string;
        description: string | null;
        llm_model: string;
        temperature: number;
        max_tokens: number | null;
        has_api_key: boolean;
        api_key_validation_status: string | null;
        api_key_validated_at: string | null;
        api_key_validation_error_code: string | null;
        research_feeds_estimator: boolean;
        is_active: boolean;
    }> {
        const response = await this.client.get(`/agents/${agentId}`);
        return response.data;
    }

    async updateAgentConfig(agentId: string, updates: {
        llm_model?: string;
        temperature?: number;
        max_tokens?: number | null;
        is_active?: boolean;
        display_name?: string;
        description?: string;
        api_key?: string;
        research_feeds_estimator?: boolean;
    }): Promise<{
        id: string;
        agent_id: string;
        display_name: string;
        llm_model: string;
        temperature: number;
        max_tokens: number | null;
        has_api_key: boolean;
        research_feeds_estimator: boolean;
        is_active: boolean;
    }> {
        const response = await this.client.put(`/agents/${agentId}`, updates);
        return response.data;
    }

    async testAgentConnection(agentId: string): Promise<{
        status: string;
        error_code: string | null;
        fingerprint: string | null;
    }> {
        const response = await this.client.post(`/agents/${agentId}/test-connection`);
        return response.data;
    }

    async getAgentStats(agentId: string): Promise<{
        run_count: number;
        total_tokens: number;
        avg_latency_ms: number | null;
        success_rate: number | null;
        last_run: AgentRun | null;
    }> {
        const response = await this.client.get(`/agents/${agentId}/stats`);
        return response.data;
    }

    async getAgentRuns(agentId: string, limit = 50): Promise<AgentRun[]> {
        const response = await this.client.get(`/agents/${agentId}/runs`, { params: { limit } });
        return response.data;
    }

    // =========================================================================
    // Permit Analysis Agent
    // =========================================================================

    async analyzePermit(params: {
        permit_data: Record<string, unknown>;
        use_cache?: boolean;
    }): Promise<{
        success: boolean;
        analysis: Record<string, unknown> | null;
        error: string | null;
    }> {
        const response = await this.client.post('/agents/permit-analysis', {
            permit_data: params.permit_data,
            use_cache: params.use_cache ?? true,
        });
        return response.data;
    }

    async estimatePermitCost(params: {
        permit_data: Record<string, unknown>;
        permit_id?: string;
        use_cache?: boolean;
    }): Promise<{
        success: boolean;
        estimate: {
            low_estimate: number | null;
            high_estimate: number | null;
            midpoint: number | null;
            confidence: 'low' | 'medium' | 'high' | null;
            reasoning: string | null;
        } | null;
        error: string | null;
    }> {
        const response = await this.client.post('/agents/estimate-cost', {
            permit_data: params.permit_data,
            permit_id: params.permit_id,
            use_cache: params.use_cache ?? false,
        });
        return response.data;
    }

    // =========================================================================
    // Permit Contacts (multi-contact outreach modal)
    // =========================================================================

    async getPermitContacts(permitId: string): Promise<PermitContact[]> {
        const response = await this.client.get(`/permits/${permitId}/contacts`);
        return response.data;
    }

    async savePermitContact(
        permitId: string,
        contactId: string,
        body: { email?: string; phone?: string; name?: string },
    ): Promise<PermitContact> {
        const response = await this.client.put(`/permits/${permitId}/contacts/${contactId}`, body);
        return response.data;
    }

    async setPermitContactDemoEmail(
        permitId: string,
        contactId: string,
        email: string,
    ): Promise<PermitContact> {
        const response = await this.client.post(
            `/permits/${permitId}/contacts/${contactId}/demo-email`,
            { email },
        );
        return response.data;
    }

    async findPermitContactEmail(
        permitId: string,
        contactId: string,
    ): Promise<FindEmailResponse> {
        const response = await this.client.post(
            `/permits/${permitId}/contacts/${contactId}/find-email`,
        );
        return response.data;
    }

    // =========================================================================
    // Multi-contact email generation + send
    // =========================================================================

    async generateOutreachBatch(params: {
        contractor_name: string | null;
        permit_number: string;
        permit_id?: string;
        permit_context: Record<string, unknown>;
        contacts: Array<{ role?: string | null; name?: string | null; company?: string | null; email?: string | null; contractor_id?: string | null }>;
        instructions?: string | null;
        use_web_search?: boolean;
    }): Promise<{
        success: boolean;
        killed: boolean;
        kill_reason: string | null;
        pricing: {
            cold_entry: string | null;
            ceiling: string | null;
            full_scope_target: string | null;
            rationale: string | null;
        } | null;
        variants: Array<{
            role: string | null;
            name: string | null;
            email: string | null;
            contractor_id: string | null;
            success: boolean;
            email_subject: string | null;
            email_body: string | null;
            analysis: string | null;
            error: string | null;
            needs_review: boolean;
            gate_failures: string[];
            word_count: number | null;
            send_eligible: boolean;
        }>;
        research: {
            requested: boolean;
            enabled: boolean;
            provider: string | null;
            ran: boolean;
            cache_hit: boolean;
            facts_collected: number;
            facts_used: number;
            skipped_reason: string | null;
        } | null;
    }> {
        const response = await this.client.post('/email-agent/generate-batch', params);
        return response.data;
    }

    async getResearchAvailability(): Promise<{
        available: boolean;
        provider: string;
        reason: string | null;
    }> {
        const response = await this.client.get('/email-agent/research-availability');
        return response.data;
    }

    async sendOutreachBatch(params: {
        permit_id?: string;
        permit_number?: string;
        items: Array<{
            to_email: string; subject: string; body: string;
            role?: string | null; contractor_id?: string | null;
            needs_review?: boolean; approved?: boolean;
        }>;
        is_demo?: boolean;
    }): Promise<{
        sent: number;
        failed: number;
        results: Array<{ to_email: string; success: boolean; message: string }>;
    }> {
        const response = await this.client.post('/email-agent/send-batch', params);
        return response.data;
    }

    // =========================================================================
    // Agent Inbox Assignments
    // =========================================================================

    async listAgentsWithInboxes(): Promise<Array<{
        user_id: number;
        full_name: string;
        email: string;
        status: string;
        assigned_inboxes: Array<{
            inbox_id: string;
            domain_id: string;
            email: string;
            display_name: string | null;
            domain: string;
            provider: string | null;
            status: string | null;
            warmup_health_score: number | null;
            warmup_status: string | null;
            daily_sent_today: number;
            daily_limit: number;
            assigned_at: string;
        }>;
    }>> {
        const response = await this.client.get('/outreach/agents');
        return response.data;
    }

    async listAvailableInboxes(): Promise<Array<{
        id: string; email: string; display_name: string | null;
        domain: string; domain_id: string; status: string | null;
        warmup_health_score: number | null; warmup_status: string | null;
    }>> {
        const response = await this.client.get('/outreach/agents/all-inboxes');
        return response.data;
    }

    async assignInboxToAgent(userId: number, inboxId: string): Promise<void> {
        await this.client.post(`/outreach/agents/${userId}/inboxes`, { inbox_id: inboxId });
    }

    async removeInboxFromAgent(userId: number, inboxId: string): Promise<void> {
        await this.client.delete(`/outreach/agents/${userId}/inboxes/${inboxId}`);
    }

    // =========================================================================
    // Lead Banks
    // =========================================================================

    async getMyLeadBank(): Promise<LeadBank | null> {
        const response = await this.client.get('/outreach/lead-banks/my-bank');
        return response.data;
    }

    async listLeadBanks(): Promise<LeadBank[]> {
        const response = await this.client.get('/outreach/lead-banks');
        return response.data;
    }

    async createLeadBank(body: {
        name: string;
        agent_user_id: number;
        total_leads: number;
        monthly_quota?: number | null;
        weekly_target?: number | null;
        monthly_project_target?: number | null;
        states: Array<{ state_code: string; tier: string }>;
    }): Promise<LeadBank> {
        const response = await this.client.post('/outreach/lead-banks', body);
        return response.data;
    }

    async updateLeadBank(
        bankId: string,
        body: {
            total_leads?: number;
            monthly_quota?: number;
            weekly_target?: number;
            monthly_project_target?: number;
            status?: string;
            states?: Array<{ state_code: string; tier: string }>;
        },
    ): Promise<LeadBank> {
        const response = await this.client.put(`/outreach/lead-banks/${bankId}/assign`, body);
        return response.data;
    }

    async distributeLeads(dryRun: boolean, reset = false, agentIds?: number[]): Promise<LeadDistributionResult> {
        const response = await this.client.post('/outreach/lead-banks/distribute', {
            dry_run: dryRun,
            reset,
            agent_ids: agentIds && agentIds.length ? agentIds : undefined,
        });
        return response.data;
    }

    // =========================================================================
    // Permit Scoring (super-admin rubric + batch scoring)
    // =========================================================================

    async getScoringRubric(): Promise<ScoringRubricDetail> {
        const response = await this.client.get('/permit-scoring/rubric');
        return response.data;
    }

    async updateScoringRubric(content: Record<string, unknown>, notes?: string): Promise<ScoringRubricDetail> {
        const response = await this.client.put('/permit-scoring/rubric', { content, notes });
        return response.data;
    }

    async getScoringRubricVersions(limit = 30): Promise<ScoringRubricDetail[]> {
        const response = await this.client.get('/permit-scoring/rubric/versions', { params: { limit } });
        return response.data;
    }

    async activateScoringRubricVersion(rubricId: string): Promise<ScoringRubricDetail> {
        const response = await this.client.post(`/permit-scoring/rubric/versions/${rubricId}/activate`);
        return response.data;
    }

    async resetScoringRubric(): Promise<ScoringRubricDetail> {
        const response = await this.client.post('/permit-scoring/rubric/reset');
        return response.data;
    }

    async runPermitScoring(body?: { agency_ids?: string[]; only_unscored?: boolean; limit?: number }): Promise<{ status: string; message: string }> {
        // Default to only_unscored: scores are now written on sync, so the batch is
        // only a backfill / rubric-change re-score — avoid rewriting current rows.
        const response = await this.client.post('/permit-scoring/score-bulk', body ?? { only_unscored: true });
        return response.data;
    }

    async scoreOnePermit(permitId: string): Promise<PermitScorePreview> {
        const response = await this.client.post(`/permit-scoring/score/${permitId}`);
        return response.data;
    }

    async scoreSample(body: { n?: number; only_unscored?: boolean }): Promise<SampleScoreResponse> {
        const response = await this.client.post('/permit-scoring/score-sample', body);
        return response.data;
    }

    async getScoringStats(refresh = false): Promise<ScoringStats> {
        const response = await this.client.get('/permit-scoring/stats', { params: refresh ? { refresh: true } : undefined });
        return response.data;
    }

    // --- AI cost backfill (DB-grounded) ---
    async getCostEstimateStats(): Promise<CostEstimateStats> {
        const response = await this.client.get('/agents/estimate-cost/stats');
        return response.data;
    }

    async runBulkCostEstimation(body?: {
        batch_size?: number;
        max_total?: number;
        concurrency?: number;
        skip_excluded?: boolean;
        min_lead_score?: number | null;
    }): Promise<{ message: string; queued: number }> {
        const response = await this.client.post('/agents/estimate-cost/bulk', body ?? {});
        return response.data;
    }

    // =========================================================================
    // Contractors
    // =========================================================================

    async searchContractors(params: ContractorSearchParams): Promise<ContractorSearchResponse> {
        logger.debug('Searching contractors', { params }, this.context);

        const queryParams: Record<string, string | number | boolean> = {
            limit: params.limit,
            offset: params.offset,
            order_by: params.order_by,
            order_desc: params.order_desc,
        };

        if (params.search) queryParams.search = params.search;
        if (params.contractor_type) queryParams.contractor_type = params.contractor_type;
        if (params.city) queryParams.city = params.city;
        if (params.state_code) queryParams.state_code = params.state_code;
        if (params.has_email !== undefined) queryParams.has_email = params.has_email;
        if (params.score_bucket) queryParams.score_bucket = params.score_bucket;
        if (params.has_license !== undefined) queryParams.has_license = params.has_license;
        if (params.has_phone !== undefined) queryParams.has_phone = params.has_phone;
        if (params.has_website !== undefined) queryParams.has_website = params.has_website;
        if (params.license_readiness) queryParams.license_readiness = params.license_readiness;

        const response = await this.client.get<ContractorSearchResponse>('/contractors', {
            params: queryParams,
        });

        return response.data;
    }

    async getContractorById(id: string): Promise<ContractorRecord> {
        const response = await this.client.get<ContractorRecord>(`/contractors/${id}`);
        return response.data;
    }

    async getContractorPermits(id: string, limit = 25, offset = 0): Promise<PermitSearchResponse> {
        const response = await this.client.get<PermitSearchResponse>(`/contractors/${id}/permits`, {
            params: { limit, offset },
        });
        return response.data;
    }

    async getContractorTypes(): Promise<ContractorTypesResponse> {
        const response = await this.client.get<ContractorTypesResponse>('/contractors/types');
        return response.data;
    }

    async getContractorStates(): Promise<ContractorStatesResponse> {
        const response = await this.client.get<ContractorStatesResponse>('/contractors/states');
        return response.data;
    }

    async getContractorCities(stateCode?: string): Promise<ContractorCitiesResponse> {
        const response = await this.client.get<ContractorCitiesResponse>('/contractors/cities', {
            params: stateCode ? { state_code: stateCode } : undefined,
        });
        return response.data;
    }

    // =========================================================================
    // Official Registry (bd estihub-rok.3.9) — distinct from Contractors
    // above; never merged. GET-only, read from contractor_registry_records.
    // =========================================================================

    async getRegistrySources(): Promise<RegistrySourcesResponse> {
        const response = await this.client.get<RegistrySourcesResponse>('/contractor-registry/sources');
        return response.data;
    }

    async searchRegistryRecords(params: RegistrySearchParams): Promise<RegistrySearchResponse> {
        logger.debug('Searching registry records', { params }, this.context);

        const queryParams: Record<string, string | number | boolean> = {
            source_key: params.source_key,
            limit: params.limit ?? 50,
            offset: params.offset ?? 0,
            sort_by: params.sort_by ?? 'business_name',
            sort_order: params.sort_order ?? 'asc',
        };

        if (params.is_current !== undefined) queryParams.is_current = params.is_current;
        if (params.search) queryParams.search = params.search;
        if (params.license_number) queryParams.license_number = params.license_number;
        if (params.license_status) queryParams.license_status = params.license_status;
        if (params.license_type) queryParams.license_type = params.license_type;
        if (params.business_type) queryParams.business_type = params.business_type;
        if (params.city) queryParams.city = params.city;
        if (params.address_state) queryParams.address_state = params.address_state;
        if (params.zip) queryParams.zip = params.zip;
        if (params.has_phone !== undefined) queryParams.has_phone = params.has_phone;
        if (params.has_email !== undefined) queryParams.has_email = params.has_email;
        if (params.expiration_from) queryParams.expiration_from = params.expiration_from;
        if (params.expiration_to) queryParams.expiration_to = params.expiration_to;

        const response = await this.client.get<RegistrySearchResponse>('/contractor-registry', {
            params: queryParams,
        });
        return response.data;
    }

    async getRegistryRecord(id: string, includeRaw = false): Promise<RegistryRecordDetail> {
        const response = await this.client.get<RegistryRecordDetail>(`/contractor-registry/records/${id}`, {
            params: includeRaw ? { include_raw: true } : undefined,
        });
        return response.data;
    }

    async importContractorsGeoJSON(file: File): Promise<ContractorImportResult> {
        const formData = new FormData();
        formData.append('file', file);

        logger.info(`Importing contractors from: ${file.name}`, { size: file.size }, this.context);

        const response = await this.client.post<ContractorImportResult>(
            '/contractors/import-geojson',
            formData,
            {
                headers: { 'Content-Type': 'multipart/form-data' },
                timeout: 300000, // 5 min for large imports
            }
        );

        return response.data;
    }

    async sendRetainerCard(contractorId: string): Promise<{
        success: boolean;
        contractor_name: string | null;
        to_email: string | null;
        email_subject: string | null;
        email_body: string | null;
        permits_used: number | null;
        overlap_detected: boolean;
        error: string | null;
    }> {
        const response = await this.client.post(`/lead-scoring/retainer-card/${contractorId}`);
        return response.data;
    }

    // =========================================================================
    // Data Sources Analytics
    // =========================================================================

    async getCityMonthlyStats(city: string, months = 6): Promise<CityMonthlyStats[]> {
        const response = await this.client.get<{ city: string; monthly: CityMonthlyStats[] }>(
            `/permits/cities/${city}/monthly`,
            { params: { months } }
        );
        return response.data.monthly;
    }

    async getCitySyncHistory(city: string, limit = 10): Promise<CitySyncHistoryEntry[]> {
        const response = await this.client.get<{ city: string; history: CitySyncHistoryEntry[] }>(
            `/permits/cities/${city}/sync-history`,
            { params: { limit } }
        );
        return response.data.history;
    }

    async getCityZipSummary(city: string, top = 10): Promise<CityZipEntry[]> {
        const response = await this.client.get<{ city: string; zip_summary: CityZipEntry[] }>(
            `/permits/cities/${city}/zip-summary`,
            { params: { top } }
        );
        return response.data.zip_summary;
    }

    async importZipCrosswalk(): Promise<{ status: string; message: string; rows_imported?: number }> {
        const response = await this.client.post<{ status: string; message: string; rows_imported?: number }>(
            '/permits/admin/import-zip-crosswalk',
            undefined,
            { timeout: 120_000 }, // Census download can take 30–90 s
        );
        return response.data;
    }

    async getTotalPermitCount(): Promise<{ total: number }> {
        const response = await this.client.get<{ total: number }>('/permits/count');
        return response.data;
    }

    // =========================================================================
    // User Management (auth/users)
    // =========================================================================

    async listUsers(): Promise<UserRecord[]> {
        const response = await this.client.get<UserRecord[]>('/auth/users');
        return response.data;
    }

    async createUser(data: { email: string; password: string; full_name: string; role: string }): Promise<UserRecord> {
        const response = await this.client.post<UserRecord>('/auth/users', data);
        return response.data;
    }

    async updateUser(userId: number, data: { full_name?: string; role?: string; status?: string; new_password?: string }): Promise<UserRecord> {
        const response = await this.client.patch<UserRecord>(`/auth/users/${userId}`, data);
        return response.data;
    }

    async deleteUser(userId: number): Promise<void> {
        await this.client.delete(`/auth/users/${userId}`);
    }

    // =========================================================================
    // Sending Domains (cold email infrastructure)
    // =========================================================================

    async listDomains(): Promise<import('@/types').SendingDomain[]> {
        const response = await this.client.get('/outreach/domains');
        return response.data;
    }

    async getDomain(domainId: string): Promise<import('@/types').SendingDomain> {
        const response = await this.client.get(`/outreach/domains/${domainId}`);
        return response.data;
    }

    async registerDomain(data: { domain: string; provider: string; dkim_selector?: string }): Promise<{ id: string; domain: string; status: string }> {
        const response = await this.client.post('/outreach/domains', data);
        return response.data;
    }

    async retireDomain(domainId: string): Promise<{ message: string; domain: string }> {
        const response = await this.client.post(`/outreach/domains/${domainId}/retire`);
        return response.data;
    }

    async deleteDomain(domainId: string): Promise<{ message: string }> {
        const response = await this.client.delete(`/outreach/domains/${domainId}`);
        return response.data;
    }

    async assignDomain(domainId: string, userId: number | null): Promise<{ id: string; assigned_user_id: number | null }> {
        const response = await this.client.put(`/outreach/domains/${domainId}/assign`, { user_id: userId });
        return response.data;
    }

    async setDomainPrimary(domainId: string, isPrimary: boolean): Promise<{ id: string; domain: string; is_primary: boolean }> {
        if (isPrimary) {
            const response = await this.client.put(`/outreach/domains/${domainId}/set-primary`);
            return response.data;
        } else {
            const response = await this.client.delete(`/outreach/domains/${domainId}/set-primary`);
            return response.data;
        }
    }

    async checkDomainHealth(domainId: string): Promise<import('@/types').DnsHealthResult> {
        const response = await this.client.get(`/outreach/domains/${domainId}/health`);
        return response.data;
    }

    async provisionInboxes(domainId: string): Promise<{ provisioned: string[]; domain: string }> {
        const response = await this.client.post(`/outreach/domains/${domainId}/provision-inboxes`);
        return response.data;
    }

    async startWarmup(domainId: string, force = false): Promise<{ domain: string; warmup_status: string }> {
        const response = await this.client.post(`/outreach/domains/${domainId}/start-warmup`, null, {
            params: force ? { force: true } : undefined,
        });
        return response.data;
    }

    async completeWarmup(domainId: string): Promise<{ domain: string; warmup_status: string }> {
        const response = await this.client.post(`/outreach/domains/${domainId}/complete-warmup`);
        return response.data;
    }

    async getWarmupHistory(domainId: string): Promise<import('@/types').WarmupHistory> {
        const response = await this.client.get(`/outreach/domains/${domainId}/warmup-history`);
        return response.data;
    }

    async getPostmasterStats(domainId: string, days = 30): Promise<{ domain: string; history: import('@/types').PostmasterStatEntry[]; postmaster_domain_reputation: string | null }> {
        const response = await this.client.get(`/outreach/domains/${domainId}/postmaster-stats`, { params: { days } });
        return response.data;
    }

    async checkBlacklist(domainId: string): Promise<import('@/types').BlacklistResult> {
        const response = await this.client.get(`/outreach/domains/${domainId}/blacklist-check`);
        return response.data;
    }

    async updateInbox(domainId: string, inboxId: string, data: { status?: string; daily_limit?: number; display_name?: string; smtp_password?: string }): Promise<import('@/types').SendingInbox> {
        const response = await this.client.put(`/outreach/domains/${domainId}/inboxes/${inboxId}`, data);
        return response.data;
    }

    async addInbox(domainId: string, data: { email_prefix: string; display_name: string; given_name?: string; family_name?: string; app_password?: string }): Promise<import('@/types').SendingInbox> {
        const response = await this.client.post(`/outreach/domains/${domainId}/inboxes`, data);
        return response.data;
    }

    async deleteInbox(domainId: string, inboxId: string): Promise<{ message: string }> {
        const response = await this.client.delete(`/outreach/domains/${domainId}/inboxes/${inboxId}`);
        return response.data;
    }

    // ── Campaigns ─────────────────────────────────────────────────────────────

    async listCampaigns(status?: string): Promise<import('@/types').CampaignOut[]> {
        const response = await this.client.get('/outreach/campaigns', { params: status ? { status } : {} });
        return response.data;
    }

    async getCampaign(id: string): Promise<import('@/types').CampaignOut> {
        const response = await this.client.get(`/outreach/campaigns/${id}`);
        return response.data;
    }

    async createCampaign(data: import('@/types').CampaignCreate): Promise<import('@/types').CampaignOut> {
        const response = await this.client.post('/outreach/campaigns', data);
        return response.data;
    }

    async startCampaign(id: string): Promise<import('@/types').CampaignOut> {
        const response = await this.client.post(`/outreach/campaigns/${id}/start`);
        return response.data;
    }

    async pauseCampaign(id: string): Promise<import('@/types').CampaignOut> {
        const response = await this.client.post(`/outreach/campaigns/${id}/pause`);
        return response.data;
    }

    async addCampaignRecipients(id: string, permitIds: string[]): Promise<import('@/types').AddRecipientsResponse> {
        const response = await this.client.post(`/outreach/campaigns/${id}/recipients`, { permit_ids: permitIds });
        return response.data;
    }

    async getCampaignRecipients(id: string, status?: string): Promise<import('@/types').CampaignRecipient[]> {
        const response = await this.client.get(`/outreach/campaigns/${id}/recipients`, { params: status ? { status } : {} });
        return response.data;
    }

    // ── Send History ──────────────────────────────────────────────────────────

    async getSendHistory(params?: { campaign_id?: string; status?: string; limit?: number; offset?: number }): Promise<import('@/types').EmailSendLog[]> {
        const response = await this.client.get('/outreach/send-history', { params });
        return response.data;
    }

    // ── Permit Leads ──────────────────────────────────────────────────────────

    async getPermitLeads(params: import('@/types').LeadFilters): Promise<{ items: import('@/types').PermitLead[]; total: number; offset: number; limit: number }> {
        const response = await this.client.get('/permits/leads', { params });
        return response.data;
    }

    // ── Threads ───────────────────────────────────────────────────────────────

    async listThreadContractors(params?: {
        search?: string;
        received_only?: boolean;
        limit?: number;
        offset?: number;
    }): Promise<import('@/types').ThreadContractorSummary[]> {
        const response = await this.client.get('/outreach/threads', { params });
        return response.data;
    }

    async getEmailThread(email: string): Promise<import('@/types').ContractorThreadOut> {
        const response = await this.client.get('/outreach/email-thread', { params: { email } });
        return response.data;
    }

    async replyToThread(body: { contact_email: string; body: string; subject?: string }): Promise<{
        status: string; from_email: string; subject: string; message_id: string;
    }> {
        const response = await this.client.post('/outreach/reply', body);
        return response.data;
    }

    async triggerImapPoll(): Promise<{ message: string }> {
        const response = await this.client.post('/outreach/debug/run-imap-poll');
        return response.data;
    }

    async pollNotifications(since: string): Promise<import('@/hooks/useEmailNotifications').EmailNotification[]> {
        const response = await this.client.get('/outreach/notifications', { params: { since } });
        return response.data;
    }

    async listSendingInboxes(): Promise<{
        id: string; email: string; display_name: string; domain: string;
        provider: string; status: string; message_count: number; last_message_at: string | null;
    }[]> {
        const response = await this.client.get('/outreach/sending-inboxes');
        return response.data;
    }

    async getInboxMessages(toEmail: string): Promise<{
        id: string; from_email: string; to_email: string; subject: string;
        body_text: string | null; received_at: string | null;
        reply_intent: string | null; is_auto_reply: boolean; contractor_id: string | null;
    }[]> {
        const response = await this.client.get('/outreach/inbox-messages', { params: { to_email: toEmail } });
        return response.data;
    }

    async getInboxConversations(inboxEmail: string): Promise<{
        contact_email: string; contact_name: string | null; contractor_id: string | null;
        sent_count: number; received_count: number;
        last_direction: 'sent' | 'received' | null;
        last_subject: string | null; last_preview: string | null;
        last_message_at: string | null; latest_reply_intent: string | null;
        has_unread: boolean;
    }[]> {
        const response = await this.client.get('/outreach/inbox-conversations', { params: { inbox_email: inboxEmail } });
        return response.data;
    }

    async getArchivedInboxConversations(): Promise<{
        inbox_email: string;
        conversation_count: number;
        last_activity_at: string | null;
        conversations: {
            contact_email: string; contact_name: string | null; contractor_id: string | null;
            sent_count: number; received_count: number;
            last_direction: 'sent' | 'received' | null;
            last_subject: string | null; last_preview: string | null;
            last_message_at: string | null; latest_reply_intent: string | null;
            has_unread: boolean;
        }[];
    }[]> {
        const response = await this.client.get('/outreach/archived-inbox-conversations');
        return response.data;
    }

    async markInboxConversationRead(inboxEmail: string, contactEmail: string): Promise<void> {
        await this.client.post('/outreach/inbox-conversations/mark-read', null, {
            params: { inbox_email: inboxEmail, contact_email: contactEmail },
        });
    }

    async sendFromInbox(data: {
        inbox_id: string; to_email: string; subject: string; body: string; contractor_id?: string;
    }): Promise<{ success: boolean; message: string }> {
        const response = await this.client.post('/outreach/send-from-inbox', data);
        return response.data;
    }

    async getInboxPassword(domainId: string, inboxId: string): Promise<{ email: string; password: string }> {
        const response = await this.client.get(`/outreach/domains/${domainId}/inboxes/${inboxId}/password`);
        return response.data;
    }

    async syncGwsUsers(domainId: string): Promise<{
        domain: string;
        synced: string[];
        orphaned: { email: string; name: string; suspended: boolean }[];
        missing: string[];
    }> {
        const response = await this.client.get(`/outreach/domains/${domainId}/gws-sync`);
        return response.data;
    }

    async deleteGwsOrphan(domainId: string, email: string): Promise<{ message: string }> {
        const response = await this.client.delete(`/outreach/domains/${domainId}/gws-orphans/${encodeURIComponent(email)}`);
        return response.data;
    }

    // ── Health Dashboard ──────────────────────────────────────────────────────

    async getHealthOverview(): Promise<import('@/types').HealthOverview> {
        const response = await this.client.get('/outreach/health/overview');
        return response.data;
    }

    async getDomainsHealth(): Promise<import('@/types').DomainHealthRow[]> {
        const response = await this.client.get('/outreach/health/domains-health');
        return response.data;
    }

    async getInboxesHealth(): Promise<import('@/types').InboxHealthRow[]> {
        const response = await this.client.get('/outreach/health/inboxes-health');
        return response.data;
    }

    async getDeliverability(): Promise<import('@/types').DeliverabilityData> {
        const response = await this.client.get('/outreach/health/deliverability');
        return response.data;
    }

    async getReplyIntelligence(): Promise<import('@/types').ReplyIntelligence> {
        const response = await this.client.get('/outreach/health/reply-intelligence');
        return response.data;
    }

    async getTechnicalStatus(): Promise<import('@/types').TechnicalStatus> {
        const response = await this.client.get('/outreach/health/technical');
        return response.data;
    }

    async getHealthRecommendations(): Promise<import('@/types').RecommendationsResult> {
        const response = await this.client.get('/outreach/health/recommendations');
        return response.data;
    }

    async refreshHealthRecommendations(): Promise<import('@/types').RecommendationsResult> {
        const response = await this.client.post('/outreach/health/recommendations/refresh');
        return response.data;
    }

    // =========================================================================
    // Generic HTTP helpers (used by pages that don't need typed responses)
    // =========================================================================

    async get<T = unknown>(path: string, params?: Record<string, unknown>): Promise<T> {
        const response = await this.client.get<T>(path, params ? { params } : undefined);
        return response.data;
    }

    async post<T = unknown>(path: string, data?: unknown): Promise<T> {
        const response = await this.client.post<T>(path, data);
        return response.data;
    }

    async getInboxWarmupAnalytics(email: string): Promise<WarmupAnalytics> {
        const response = await this.client.get(`/warmup/inboxes/${encodeURIComponent(email)}/analytics`);
        return response.data;
    }

    async getWarmupThreads(email: string, days = 14): Promise<{ email: string; days: number; count: number; threads: WarmupThread[]; error: string | null; used_fallback: boolean }> {
        const response = await this.client.get(`/warmup/inboxes/${encodeURIComponent(email)}/threads`, { params: { days } });
        return response.data;
    }

    async getWarmupThread(email: string, threadId: string): Promise<WarmupThreadDetail> {
        const response = await this.client.get(`/warmup/inboxes/${encodeURIComponent(email)}/threads/${threadId}`);
        return response.data;
    }

    async trashGmailThread(email: string, threadId: string): Promise<{ ok: boolean }> {
        const response = await this.client.post(`/warmup/inboxes/${encodeURIComponent(email)}/threads/${threadId}/trash`);
        return response.data;
    }

    async put<T = unknown>(path: string, data?: unknown): Promise<T> {
        const response = await this.client.put<T>(path, data);
        return response.data;
    }

    async patch<T = unknown>(path: string, data?: unknown): Promise<T> {
        const response = await this.client.patch<T>(path, data);
        return response.data;
    }

    async delete<T = unknown>(path: string, data?: unknown): Promise<T> {
        const response = await this.client.delete<T>(path, data ? { data } : undefined);
        return response.data;
    }
}

export const apiService = new ApiService();
