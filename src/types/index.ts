// ============================================================================
// Chat & Conversation Types
// ============================================================================

export interface ChatMessage {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    timestamp: string;
    responseType?: 'text' | 'bullets' | 'table' | 'chart';
    tableData?: TableData;
    chartData?: ChartData;
    bullets?: string[];
    sqlQuery?: string;
    isError?: boolean;
    isEdited?: boolean;
    editedAt?: string;
}

export interface TableData {
    headers: string[];
    rows: (string | number)[][];
}

export interface ChartData {
    type: 'bar' | 'line' | 'pie' | 'area';
    labels: string[];
    datasets: {
        label: string;
        data: number[];
        backgroundColor?: string[];
        borderColor?: string;
    }[];
}

// Session/Thread types for multi-conversation support
export interface ConversationSession {
    id: string;
    title: string;
    createdAt: string;
    updatedAt: string;
    isActive: boolean;
    contextSummary?: string;
    messageCount?: number;
}

export interface ConversationHistoryMessage {
    id: string;
    role: 'user' | 'assistant' | 'system';
    content: string;
    sqlQuery?: string;
    createdAt: string;
    isError: boolean;
}

// ============================================================================
// API Types
// ============================================================================

export interface QueryRequest {
    question: string;
    session_id?: string;
    user_id?: string;
}

export interface QueryResponse {
    success: boolean;
    session_id: string;
    question: string;
    answer: string | null;
    has_context?: boolean;
    error: string | null;
    data?: IntelligenceData | null;  // Structured data from intelligence endpoints
}

// Structured intelligence data from the backend
export interface IntelligenceData {
    // Market Pulse data
    current_permits?: number;
    previous_permits?: number;
    current_valuation?: number;
    previous_valuation?: number;
    permits_mom_change?: number;
    valuation_mom_change?: number;
    market_state?: 'expanding' | 'flat' | 'cooling';
    current_period?: string;
    previous_period?: string;

    // CBSA lists
    cbsas?: CBSAItem[];
    period?: string;

    // Trade opportunity
    total_permits?: number;
    single_family?: number;
    multi_family?: number;
    single_family_ratio?: number;
    multi_family_ratio?: number;
    primary_trade?: string;
    primary_trade_ratio?: number;
    secondary_trade?: string;
    secondary_trade_ratio?: number;
    confidence?: 'Low' | 'Medium' | 'High';

    // Velocity alerts
    alerts?: VelocityAlertItem[];

    // Outreach priorities
    priority_list?: OutreachItem[];
    avoid_list?: OutreachItem[];

    // Full report nested data
    market_pulse?: IntelligenceData;
    hot_cbsas?: CBSAItem[];
    cooling_cbsas?: CBSAItem[];
    high_value?: CBSAItem[];
    trade_opportunity?: IntelligenceData;
    velocity_alerts?: VelocityAlertItem[];
    outreach_priorities?: {
        priority_list?: OutreachItem[];
        avoid_list?: OutreachItem[];
    };
}

export interface CBSAItem {
    name: string;
    cbsa_code?: string;
    total_permits: number;
    single_family?: number;
    multi_family?: number;
    total_value: number;
    value_per_permit: number;
    commercial_ratio?: number;
    is_commercial_heavy?: boolean;
    current_month_permits?: number;
    ytd_permits?: number;
    avg_monthly?: number;
    decline_percentage?: number;
}

export interface VelocityAlertItem {
    name: string;
    cbsa_code?: string;
    current_month: number;
    ytd_total: number;
    avg_monthly: number;
    velocity_change: number;
    alert_type: 'spike' | 'decline';
    peak_risk: 'low' | 'medium' | 'high';
    total_value: number;
}

export interface OutreachItem {
    name: string;
    cbsa_code?: string;
    total_permits: number;
    total_value: number;
    value_per_permit: number;
    priority_score: number;
    permit_score?: number;
    value_score?: number;
    growth_score?: number;
    trade_focus: string;
}

export interface UploadResponse {
    upload_id: string;
    file_type: string;
    rows_processed: number;
    locations_created: number;
    stats_inserted: number;
    year: number;
    month: number;
    message?: string;
}

export interface ExampleQuestion {
    id?: string;
    question: string;
    category: string;
}

export interface ExamplesApiResponse {
    examples: {
        category: string;
        questions: string[];
    }[];
}

export interface ExamplesResponse {
    examples: ExampleQuestion[];
}

export interface SchemaResponse {
    tables: string[];
    table_info: string;
}

// ============================================================================
// Intelligence Types (for Dashboard)
// ============================================================================

export type MarketState = 'expanding' | 'flat' | 'cooling';
export type ConfidenceLevel = 'low' | 'medium' | 'high';
export type TrendDirection = 'up' | 'down' | 'neutral';

export interface MarketPulse {
    permitsMoMChange: number;
    valuationMoMChange: number;
    marketState: MarketState;
    totalPermits: number;
    totalValuation: number;
    period: string;
}

export interface HotCBSA {
    id: string;
    name: string;
    cbsaCode: string;
    permitCount: number;
    momChange: number;
    aboveAverage: boolean;
    avgPermits3Month?: number;
}

export interface CoolingCBSA {
    id: string;
    name: string;
    cbsaCode: string;
    permitCount: number;
    momChange: number;
    valuationChange?: number;
    riskLevel: 'low' | 'medium' | 'high';
}

export interface HighValuePermit {
    id: string;
    name: string;
    cbsaCode: string;
    valuePerPermit: number;
    totalValue: number;
    totalPermits: number;
    commercialRatio: number; // Percentage of 5+ unit permits
}

export interface TradeOpportunity {
    primaryTrade: string;
    primaryReason: string;
    secondaryTrade: string;
    secondaryReason: string;
    confidenceLevel: ConfidenceLevel;
    metrics: {
        singleFamilyShare: number;
        multiFamilyShare: number;
        avgValuePerUnit: number;
    };
}

export interface VelocityAlert {
    id: string;
    cbsaName: string;
    cbsaCode: string;
    momSpike: number;
    threeMonthTrend: number;
    alertType: 'breakout' | 'spike' | 'peaking';
    riskFlag: boolean;
}

export interface OutreachPriority {
    topCBSAs: {
        id: string;
        name: string;
        score: number;
        reason: string;
    }[];
    tradesToFocus: string[];
    areasToAvoid: {
        name: string;
        reason: string;
    }[];
}

export interface IntelligenceReport {
    marketPulse: MarketPulse;
    hotCBSAs: HotCBSA[];
    coolingCBSAs: CoolingCBSA[];
    highValuePermits: HighValuePermit[];
    tradeOpportunity: TradeOpportunity;
    velocityAlerts: VelocityAlert[];
    outreachPriority: OutreachPriority;
    generatedAt: string;
}

export interface IntelligenceReportType {
    type: string;
    name: string;
    description: string;
    endpoint: string;
}

// ============================================================================
// State Types
// ============================================================================

export interface UploadState {
    isUploading: boolean;
    progress: number;
    error: string | null;
    lastUpload: UploadResponse | null;
}

export interface ChatState {
    messages: ChatMessage[];
    isLoading: boolean;
    error: string | null;
    currentSessionId: string | null;
    sessions: ConversationSession[];
    sessionsLoading: boolean;
}

export interface ExamplesState {
    examples: ExampleQuestion[];
    isLoading: boolean;
    error: string | null;
    selectedCategory: string | null;
}

export interface DashboardState {
    isLoading: boolean;
    error: string | null;
    lastUpdated: string | null;

    // Intelligence data
    marketPulse: MarketPulse | null;
    hotCBSAs: HotCBSA[];
    coolingCBSAs: CoolingCBSA[];
    highValuePermits: HighValuePermit[];
    tradeOpportunity: TradeOpportunity | null;
    velocityAlerts: VelocityAlert[];
    outreachPriority: OutreachPriority | null;
}

// ============================================================================
// Navigation Types
// ============================================================================

export interface NavItem {
    id: string;
    label: string;
    icon: string;
    href: string;
    badge?: string | number;
    children?: NavItem[];
}

export type ActiveView =
    | 'dashboard'
    | 'cbsa-insights'
    | 'permit-analytics'
    | 'trade-signals'
    | 'outreach'
    | 'chat';

// ============================================================================
// UI Types
// ============================================================================

export interface ApiError {
    message: string;
    status?: number;
    details?: unknown;
}

export interface ToastNotification {
    id: string;
    type: 'success' | 'error' | 'warning' | 'info';
    title: string;
    message?: string;
    duration?: number;
}

// ============================================================================
// Utility Types
// ============================================================================

export interface PaginatedResponse<T> {
    items: T[];
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
}

export interface DateRange {
    start: string;
    end: string;
}

export interface FilterOptions {
    states?: string[];
    cbsas?: string[];
    dateRange?: DateRange;
    minPermits?: number;
    maxPermits?: number;
}

// ============================================================================
// Data Sources Analytics Types
// ============================================================================

export interface CityMonthlyStats {
    year: number;
    month: number;
    label: string;
    count: number;
}

export interface CitySyncHistoryEntry {
    started_at: string;
    completed_at: string | null;
    status: string;
    records_fetched: number;
    records_inserted: number;
    records_updated: number;
    records_skipped: number;
    records_failed: number;
    error_message: string | null;
}

export interface CityZipEntry {
    zip_code: string;
    permit_count: number;
    county_name: string | null;
    county_fips: string | null;
    state_code: string | null;
    state_name: string | null;
}

// ============================================================================
// Permit Records Types (Socrata Data)
// ============================================================================

export interface PermitRecord {
    id: string;
    permit_number: string;
    permit_type: string;
    permit_subtype: string | null;
    permit_class: string | null;
    work_description: string | null;
    status: string;
    application_date: string | null;
    issue_date: string | null;
    expiration_date: string | null;
    completion_date: string | null;
    estimated_cost: number | null;
    total_fee: number | null;
    housing_units: number | null;
    ai_estimated_cost: number | null;
    ai_cost_confidence: 'low' | 'medium' | 'high' | null;
    external_permit_id: string;
    full_address: string | null;
    city: string;
    state_code: string;
    zip_code: string | null;
    county_name: string | null;
    latitude: number | null;
    longitude: number | null;
    // Only ever the real PermitRecord.contractor_id FK (never a denormalized
    // fallback) -- only safe to link to a contractor detail page when present.
    contractor_id: string | null;
    contractor_name: string | null;
    contractor_email: string | null;
    contractor_phone: string | null;
    contractor_lead_score: number | null;
    contractor_score_bucket: string | null;
    // Permit lead score (from scoring rubric)
    lead_score?: number | null;
    score_bucket?: string | null;
    score_tier?: string | null;
    is_excluded?: boolean;
    exclude_reason?: string | null;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    score_breakdown?: Record<string, any> | null;   // per-category points + reasons
    contact_count?: number | null;
    // Additional resolved fields
    square_footage: number | null;
    stories: number | null;
    owner_name: string | null;
    license_number: string | null;
    community: string | null;
    parcel_number: string | null;
    api_specific_fields: Record<string, unknown> | null;
    /** Number of days since issue_date, computed server-side. Null when no issue_date. */
    days_since_issue: number | null;
    created_at: string;
    updated_at: string;
}

export interface PermitFilters {
    city: string | null;
    state: string | null;
    metro: string | null;
    county: string | null;
    /** User-facing opportunity category: Fresh Leads | Scope Change | Introduction / Track | Late / Execution | Dead */
    opportunityCategory: string | null;
    /** Age bucket for Fresh Leads only: fresh_issued | warm_issued | aging_issued | old_issued */
    issuedAgeBucket: string | null;
    /** Level-1 project classification: Residential | Commercial | Multi-Family | etc. */
    projectClass: string | null;
    /** Level-2 work scope (visible only when projectClass is set): New Build | Addition | etc. */
    workScope: string | null;
    startDate: string | null;
    endDate: string | null;
    search: string;
    minCost: number | null;
    maxCost: number | null;
    /** Permit score bucket: strategic | strong | core | opportunistic | no_send */
    scoreBucket: string | null;
    /** true = only auto-excluded permits */
    isExcluded: boolean | null;
    /** Cost source: 'real' | 'ai' | 'none' (null = any) */
    costSource: string | null;
}

export interface PermitCounty {
    county_name: string;
    state_code: string;
    permit_count: number;
}

export interface PermitCountiesResponse {
    counties: PermitCounty[];
}

export interface CountyMonthlyStats {
    year: number;
    month: number;
    label: string;
    count: number;
}

export interface CountyCoverageGap {
    county_name: string;
    state_code: string;
    metro: string;
    permit_count: number;
    status: 'green' | 'amber' | 'red';
}

export interface CountyTypeBreakdownItem {
    permit_type: string;
    count: number;
}

export interface CountyClassBreakdownItem {
    permit_class: string;
    count: number;
}

export interface CountyBreakdown {
    county_name: string;
    permit_type_breakdown: CountyTypeBreakdownItem[];
    permit_class_breakdown: CountyClassBreakdownItem[];
    cost_distribution: {
        under_100k: number;
        k100_to_500k: number;
        k500_to_1m: number;
        m1_to_5m: number;
        over_5m: number;
    };
}

export interface PermitPagination {
    page: number;
    pageSize: number;
    totalRecords: number;
    totalPages: number;
    totalIsEstimate?: boolean;
}

export interface PermitSorting {
    field: string;
    direction: 'asc' | 'desc';
}

export interface PermitSearchParams {
    city?: string;
    state?: string;
    /** Resolved from opportunityCategory — backend expands to list of raw statuses */
    opportunity_category?: string;
    /** Age bucket for issued permits: fresh_issued | warm_issued | aging_issued | old_issued */
    issued_age_bucket?: string;
    /** Project class filter: Residential | Commercial | Multi-Family | Industrial | Data Center | Specialty */
    project_class?: string;
    /** Work scope filter: New Build | Addition | Renovation | Interior Build-Out / TI | Demolition | Special */
    work_scope?: string;
    county?: string;
    contractor_name?: string;
    start_date?: string;
    end_date?: string;
    search?: string;
    min_cost?: number;
    max_cost?: number;
    score_bucket?: string;
    is_excluded?: boolean;
    cost_source?: string;
    limit: number;
    offset: number;
    order_by: string;
    order_desc: boolean;
}

export interface PermitSearchResponse {
    total: number;
    total_is_estimate?: boolean;
    limit: number;
    offset: number;
    data: PermitRecord[];
}

export interface PermitCityInfo {
    key: string;
    name: string;
    state_code: string;
    source: string;  // "socrata", "arcgis", "ckan", or "csv"
    domain?: string;
    dataset_id?: string;
    metro_code?: string;
    metro_name?: string;
    stale?: boolean;
    irrelevant?: boolean;
}

export interface PermitCitiesResponse {
    count: number;
    cities: PermitCityInfo[];
}

export interface PermitStats {
    city: string;
    total_permits: number;
    permits_by_status: Record<string, number>;
    permits_by_type: Record<string, number>;
    avg_estimated_cost: number;
    total_estimated_cost: number;
    date_range: {
        min: string | null;
        max: string | null;
    };
}

// City Sync Types
export interface CitySyncStatus {
    city: string;
    last_sync_at: string | null;
    last_sync_status: string | null;
    total_records: number;
    latest_sync?: Record<string, unknown>;
}

export interface SyncResponse {
    status: string;
    city: string;
    fetched: number;
    inserted: number;
    updated: number;
    skipped: number;
    failed: number;
    error?: string;
}

export interface DeleteCityResponse {
    status: 'dry_run' | 'deleted' | 'nothing_to_delete';
    city: string;
    message?: string;
    permits_deleted?: number;
    raw_payloads_deleted?: number;
    sync_logs_deleted?: number;
    agencies_deleted?: number;
    agencies?: Array<{
        agency_id: string;
        name: string;
        domain: string;
        dataset_id: string;
        permit_count: number;
        raw_payload_count: number;
        sync_log_count: number;
    }>;
}

export interface BulkDeleteResponse {
    status: 'dry_run' | 'deleted';
    permits_deleted: number;
    status_history_deleted: number;
}


export interface PageCacheEntry {
    data: PermitRecord[];
    total: number;
    totalIsEstimate: boolean;
    fetchedAt: string; // ISO timestamp
}

export interface PermitsState {
    // Data
    items: PermitRecord[];

    // Filters
    filters: PermitFilters;

    // Pagination
    pagination: PermitPagination;

    // Sorting
    sorting: PermitSorting;

    // Loading states
    status: 'idle' | 'loading' | 'succeeded' | 'failed';
    error: string | null;

    // Cache
    lastFetchParams: string | null;
    lastFetchedAt: string | null;

    // Per-query page cache — keyed by JSON-serialised query params.
    // Lets back/forward pagination return instantly from memory.
    pageCache: Record<string, PageCacheEntry>;

    // Available options (from API)
    availableCities: PermitCityInfo[];
    availableCounties: PermitCounty[];
}

// ============================================================================
// Contractor Types
// ============================================================================

// Phase 2A (2A.1) deterministic, non-LLM data-quality indicators. "present"
// only, never "verified" — see app/services/contractor_completeness_service.py.
export type ContractorIdentityStrength = 'strong' | 'partial' | 'minimal';
export type ContractorContactability = 'reachable' | 'limited' | 'none';
export type ContractorLicenseReadiness = 'ready' | 'needs_state' | 'no_license' | 'invalid_format';
// Read-only flag for names unlikely to be a real business name (leaked
// dates, no letters at all) -- never hides or reorders a contractor.
export type ContractorNameQuality = 'ok' | 'questionable';

// Only present on GET /contractors/{id} (detail view) -- list rows leave it
// undefined to keep the search response payload lean.
// Conservative, read-only "possible similar record" candidate -- name match
// plus at least one corroborating signal. Never a merge suggestion.
export interface SimilarContractorMatch {
    id: string;
    name: string;
    permit_count: number;
    matched_signals: string[];
}

export interface ContractorPermitSummary {
    total: number;
    first_seen: string | null;
    last_seen: string | null;
    top_permit_types: { type: string; count: number }[];
    top_cities: { city: string; count: number }[];
}

export interface ContractorRecord {
    id: string;
    name: string;
    license_number: string | null;
    license_type: string | null;
    license_expiry: string | null;
    phone: string | null;
    email: string | null;
    website: string | null;
    address_line: string | null;
    city: string | null;
    state_code: string | null;
    zip_code: string | null;
    extra_data: Record<string, unknown> | null;
    created_at: string | null;
    updated_at: string | null;
    // Cached (migration 046) — never computed per-request. See
    // app/services/contractor_metrics_service.py.
    permit_count: number;
    latest_permit_date: string | null;
    contractor_types: string[];
    lead_score: number | null;
    score_bucket: string | null;
    identity_strength: ContractorIdentityStrength;
    contactability: ContractorContactability;
    license_readiness: ContractorLicenseReadiness;
    name_quality: ContractorNameQuality;
    permit_summary?: ContractorPermitSummary | null;
    possible_similar_records?: SimilarContractorMatch[];
}

export interface ContractorFilters {
    search: string;
    contractorType: string | null;
    city: string | null;
    stateCode: string | null;
    hasEmail: boolean | null;
    scoreBucket: string | null;
    hasLicense: boolean | null;
    hasPhone: boolean | null;
    hasWebsite: boolean | null;
    licenseReadiness: ContractorLicenseReadiness | null;
}

// ============================================================================
// Permit Contacts (multi-contact outreach)
// ============================================================================

export type PermitContactRole =
    | 'general_contractor'
    | 'owner'
    | 'subcontractor'
    | 'mep'
    | 'applicant'
    | 'architect'
    | 'other';

export interface PermitContact {
    id: string;
    permit_id: string;
    role: PermitContactRole;
    name: string | null;
    company: string | null;
    email: string | null;
    phone: string | null;
    contractor_id: string | null;
    source: 'linked' | 'jsonb_parsed' | 'manual';
    is_demo: boolean;
}

export type FindEmailReason =
    | 'no_company_name'
    | 'business_not_found'
    | 'no_website_listed'
    | 'no_email_on_domain'
    | 'verification_failed'
    | 'previously_not_found';

export interface FindEmailResponse {
    contact: PermitContact;
    found: boolean;
    source: string | null;
    domain: string | null;
    reason: FindEmailReason | null;
}

// ============================================================================
// Lead Banks (quota allocation)
// ============================================================================

export interface LeadBankStateAssignment {
    state_code: string;
    tier: 'A' | 'B' | 'C';
}

export interface LeadBank {
    id: string;
    name: string;
    agent_user_id: number;
    agent_email: string | null;
    total_leads: number;
    leads_contacted: number;
    monthly_quota: number | null;
    quota_consumed_pct: number;
    weekly_target: number | null;
    monthly_project_target: number | null;
    status: 'active' | 'paused' | 'completed';
    states: LeadBankStateAssignment[];
    emails_sent: number;
    assigned_permits: number;   // real permits routed to this bank
    contacted_pct: number;      // emails_sent / assigned_permits
    created_at: string | null;
}

// ── Permit Scoring ──────────────────────────────────────────────────────────
// The rubric content is a deep, super-admin-editable document; we keep it loosely
// typed as a record and read/write sections by key in the editor.
export type ScoringRubricContent = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any

export interface ScoringRubricDetail {
    id: string | null;
    name: string;
    version: number;
    content: ScoringRubricContent;
    is_active: boolean;
    created_by: string | null;
    notes: string | null;
    created_at: string | null;
}

export interface PermitScorePreview {
    permit_id: string;
    excluded: boolean;
    exclude_reason: string | null;
    total: number;
    bucket: string | null;
    tier: string | null;
    sections: Record<string, { points: number; label?: string; value?: number | null }>;
}

export interface ScoringStats {
    total_permits: number;
    scored: number;
    excluded: number;
    rubric_version: number;
    scoring_active?: boolean;
    by_bucket: Record<string, number>;
    by_tier: Record<string, number>;
    by_exclude_reason: Record<string, number>;
}

export interface CostEstimateStats {
    total_permits: number;
    missing_real_cost: number;
    ai_estimated_count: number;
    remaining_unestimated: number;
    running: boolean;
}

export interface SampleScoreResult {
    permit_id: string;
    permit_number: string | null;
    work_description: string;
    excluded: boolean;
    exclude_reason: string | null;
    total: number;
    bucket: string | null;
    tier: string | null;
    sections: Record<string, { points: number; label?: string; trades?: number; value?: number | null; modifiers?: string[] }>;
}

export interface SampleScoreResponse {
    n: number;
    rubric_version: number;
    results: SampleScoreResult[];
}

export interface LeadDistributionAgent {
    agent_user_id: number;
    bank_id: string | null;
    bank_name: string;
    email: string | null;
    in_pool?: boolean; // whether this agent is in the selected distribution pool
    // One entry per score bucket/category + a `total`.
    assigned: Record<string, number>;
}

export interface LeadDistributionResult {
    dry_run: boolean;
    status?: string; // 'running' when a real run was kicked off in the background
    reset?: boolean;
    agent_count?: number;
    pool_agent_ids?: number[];
    buckets?: string[];
    agents: LeadDistributionAgent[];
    totals: Record<string, number>; // bucket keys + `assigned`
    total_scored?: number;
    already_assigned?: number;
    preserved?: number;
    message?: string;
}

export interface ContractorSearchParams {
    search?: string;
    contractor_type?: string;
    city?: string;
    state_code?: string;
    has_email?: boolean;
    score_bucket?: string;
    has_license?: boolean;
    has_phone?: boolean;
    has_website?: boolean;
    license_readiness?: ContractorLicenseReadiness;
    limit: number;
    offset: number;
    order_by: string;
    order_desc: boolean;
}

export interface ContractorSearchResponse {
    total: number;
    limit: number;
    offset: number;
    data: ContractorRecord[];
}

export interface ContractorTypesResponse {
    types: string[];
    total: number;
}

export interface ContractorStatesResponse {
    states: string[];
    total: number;
}

export interface ContractorCitiesResponse {
    cities: string[];
    total: number;
}

export interface ContractorImportResult {
    success: boolean;
    total_records: number;
    created: number;
    updated: number;
    skipped: number;
    errors: string[];
    message: string;
}

export interface ContractorsState {
    items: ContractorRecord[];
    filters: ContractorFilters;
    pagination: PermitPagination;
    sorting: PermitSorting;
    status: 'idle' | 'loading' | 'succeeded' | 'failed';
    error: string | null;
    lastFetchParams: string | null;
    lastFetchedAt: string | null;
    availableTypes: string[];
    availableStates: string[];
    availableCities: string[];
}

// ============================================================================
// Official Registry (bd estihub-rok.3.9) — synced state contractor license
// registries (Washington L&I today, more states later). Deliberately a
// separate entity from Contractor above: never merged, never implied to be
// permit-linked. "source" = which state registry (jurisdiction); a record's
// own business address state is a different field (address_state).
// ============================================================================

export interface RegistrySourceRead {
    id: string;
    source_key: string;
    display_name: string;
    state_code: string;
    provider_type: string;
    is_active: boolean;
    last_synced_at: string | null;
    current_count: number;
    disappeared_count: number;
    matched_count: number;
    coverage_pct: number;
    // True only for a synthesized multi-source aggregate row (e.g. "New
    // York (All Sources)") -- its source_key is a group_key the search
    // endpoint expands server-side, not a real contractor_registry_sources
    // row. See app/services/contractor_registry_service.py SOURCE_GROUPS.
    is_group: boolean;
}

export interface RegistrySourcesResponse {
    sources: RegistrySourceRead[];
}

export interface RegistryRecordListItem {
    id: string;
    license_number: string | null;
    business_name: string | null;
    license_status_code: string | null;
    license_status_description: string | null;
    license_type_description: string | null;
    business_type_description: string | null;
    primary_principal_name: string | null;
    phone: string | null;
    email: string | null;
    city: string | null;
    address_state: string | null;
    zip: string | null;
    license_effective_date: string | null;
    license_expiration_date: string | null;
    is_current: boolean;
    last_seen_at: string | null;
    // Which underlying source this row came from -- only meaningfully
    // different values within one response when the search's source_key is
    // a group (e.g. "New York (All Sources)"); a DOB General Contractor row
    // and a DCWP Home Improvement row are not interchangeable.
    source_key: string | null;
    source_display_name: string | null;
}

export interface RegistrySearchResponse {
    total: number;
    limit: number;
    offset: number;
    data: RegistryRecordListItem[];
}

export interface RegistryMatchSummary {
    contractor_id: string;
    contractor_name: string;
    match_tier: string;
    match_outcome: string;
}

export interface RegistryRecordDetail {
    id: string;
    source_key: string;
    source_display_name: string;
    license_number: string | null;
    business_name: string | null;
    license_status_code: string | null;
    license_status_description: string | null;
    license_type_description: string | null;
    business_type_description: string | null;
    ubi: string | null;
    primary_principal_name: string | null;
    specialties: Record<string, unknown>[];
    phone: string | null;
    email: string | null;
    address_line1: string | null;
    address_line2: string | null;
    city: string | null;
    address_state: string | null;
    zip: string | null;
    license_effective_date: string | null;
    license_expiration_date: string | null;
    suspend_date: string | null;
    is_current: boolean;
    disappeared_at: string | null;
    last_synced_at: string | null;
    first_seen_at: string | null;
    last_seen_at: string | null;
    match: RegistryMatchSummary | null;
    raw_payload: Record<string, unknown> | null;
}

export interface RegistrySearchParams {
    source_key: string;
    is_current?: boolean;
    search?: string;
    license_number?: string;
    license_status?: string;
    license_type?: string;
    business_type?: string;
    city?: string;
    address_state?: string;
    zip?: string;
    has_phone?: boolean;
    has_email?: boolean;
    expiration_from?: string;
    expiration_to?: string;
    sort_by?: string;
    sort_order?: 'asc' | 'desc';
    limit?: number;
    offset?: number;
}

export interface RegistryFilters {
    sourceKey: string;
    search: string;
    licenseNumber: string;
    licenseStatus: string | null;
    licenseType: string | null;
    businessType: string | null;
    city: string | null;
    addressState: string | null;
    zip: string;
    hasPhone: boolean | null;
    hasEmail: boolean | null;
    isCurrent: boolean;
}

export interface RegistryState {
    items: RegistryRecordListItem[];
    sources: RegistrySourceRead[];
    filters: RegistryFilters;
    pagination: PermitPagination;
    sorting: PermitSorting;
    status: 'idle' | 'loading' | 'succeeded' | 'failed';
    sourcesStatus: 'idle' | 'loading' | 'succeeded' | 'failed';
    error: string | null;
}

// ============================================================================
// Auth / User Management Types
// ============================================================================

export interface CurrentDevice {
    id: number;
    device_name: string | null;
    platform: string | null;
    city: string | null;
    country: string | null;
    isp: string | null;
    last_seen_at: string | null;
    last_seen_ip: string | null;
    registered_at: string | null;
}

export interface UserRecord {
    id: number;
    email: string;
    full_name: string;
    role: string;
    status: string;
    last_login: string | null;
    created_at: string;
    current_device: CurrentDevice | null;
}

// ============================================================================
// Cold Email Infrastructure Types
// ============================================================================

export type InboxProvider = 'google' | 'microsoft';
export type DomainWarmupStatus = 'pending' | 'warming' | 'ready' | 'degraded' | 'retired';
export type InboxStatus = 'pending' | 'provisioning' | 'active' | 'paused' | 'retired';

export interface SendingInbox {
    id: string;
    email: string;
    display_name: string | null;
    provider: InboxProvider;
    status: InboxStatus;
    daily_sent_today: number;
    daily_limit: number;
    daily_warmup_sent_today: number;
    warmup_started_at: string | null;
    last_used_at: string | null;
}

export interface SendingDomain {
    id: string;
    domain: string;
    provider: InboxProvider;
    warmup_status: DomainWarmupStatus;
    dns_spf: boolean;
    dns_dkim: boolean;
    dns_dmarc: boolean;
    dns_mx: boolean;
    inbox_count: number;
    daily_sent_today: number;
    daily_capacity: number;
    postmaster_domain_reputation: string | null;
    is_primary: boolean;
    assigned_user_id: number | null;
    created_at: string;
    // Detail view only
    inboxes?: SendingInbox[];
    dkim_selector?: string;
    warmup_started_at?: string | null;
    expires_at?: string | null;
    postmaster_spam_rate?: number | null;
    postmaster_last_checked_at?: string | null;
}

export interface WarmupHistoryEntry {
    date: string;
    sent_count: number;
    bounce_count: number;
    reply_count: number;
    ramp_limit: number;
}

export interface WarmupHistory {
    domain: string;
    warmup_status: DomainWarmupStatus;
    warmup_started_at: string | null;
    history: WarmupHistoryEntry[];
}

export interface PostmasterStatEntry {
    date: string;
    domain_reputation: string;
    spam_rate: number;
    dkim_success_ratio: number;
    dmarc_success_ratio: number;
    delivery_error_rate: number;
}

export interface DnsHealthResult {
    domain: string;
    spf: boolean;
    dkim: boolean;
    dmarc: boolean;
    mx: boolean;
    ready: boolean;
}

export interface BlacklistResult {
    domain: string;
    is_blacklisted: boolean;
    blacklists: string[];
    passed: number;
    failed: number;
    checked_at: string;
    error?: string;
}

export interface OutreachState {
    domains: SendingDomain[];
    domainsStatus: 'idle' | 'loading' | 'succeeded' | 'failed';
    domainsError: string | null;
    selectedDomain: SendingDomain | null;
    warmupHistory: WarmupHistory | null;
    campaigns: CampaignOut[];
    campaignsStatus: 'idle' | 'loading' | 'succeeded' | 'failed';
    campaignsError: string | null;
    leads: PermitLead[];
    leadsStatus: 'idle' | 'loading' | 'succeeded' | 'failed';
    leadsTotal: number;
    sendHistory: EmailSendLog[];
    sendHistoryStatus: 'idle' | 'loading' | 'succeeded' | 'failed';
    leadFilters: LeadFilters;
    // Thread state
    threadContractors: ThreadContractorSummary[];
    threadContractorsStatus: 'idle' | 'loading' | 'succeeded' | 'failed';
    selectedThreadEmail: string | null;
    activeThread: ContractorThreadOut | null;
    activeThreadStatus: 'idle' | 'loading' | 'succeeded' | 'failed';
    threadSearch: string;
}

// ── Campaign Types ────────────────────────────────────────────────────────────

export interface CampaignCreate {
    name: string;
    template_type?: 'email_agent' | 'permit_template';
    daily_limit?: number;
    from_domain?: string | null;
    locked_template_subject?: string | null;
    locked_template_body?: string | null;
    syntax_variant?: number | null;
    filter_snapshot?: Record<string, unknown> | null;
    use_web_search?: boolean;
}

export interface CampaignOut {
    id: string;
    name: string;
    status: 'draft' | 'active' | 'paused' | 'completed';
    template_type: string;
    daily_limit: number;
    from_domain: string | null;
    syntax_variant: number | null;
    use_web_search: boolean;
    created_at: string;
    updated_at: string;
    total_recipients: number;
    sent_count: number;
    replied_count: number;
}

export interface AddRecipientsResponse {
    added: number;
    skipped_no_email: number;
    total: number;
}

export interface CampaignRecipient {
    id: string;
    campaign_id: string;
    contractor_id: string | null;
    permit_id: string | null;
    status: 'pending' | 'sent' | 'skipped' | 'bounced';
    follow_up_count: number;
    replied: boolean;
    reply_intent: 'hot_lead' | 'soft' | 'not_now' | 'no' | null;
    unsubscribed: boolean;
    next_follow_up_at: string | null;
    created_at: string;
}

// ── Email Send Log ────────────────────────────────────────────────────────────

export interface EmailSendLog {
    id: string;
    to_email: string;
    from_email: string;
    subject: string;
    status: 'queued' | 'sent' | 'bounced' | 'failed';
    sent_at: string | null;
    created_at: string;
    campaign_id: string | null;
    contractor_name: string | null;
    permit_number: string | null;
}

// ── Lead Queue Types ──────────────────────────────────────────────────────────

export interface PermitLead {
    id: string;
    permit_number: string;
    permit_type: string;
    status: string;
    estimated_cost: number | null;
    issue_date: string | null;
    lead_score: number;
    contractor_id: string | null;
    contractor_name: string | null;
    contractor_email: string | null;
    city: string | null;
    state: string | null;
}

export interface LeadFilters {
    min_cost?: number;
    max_cost?: number;
    permit_types?: string;
    days_since_issued?: number;
    has_contractor_email?: boolean;
    states?: string;
    cities?: string;
    limit?: number;
    offset?: number;
}

// ── Thread / Inbox Reply Types ─────────────────────────────────────────────────

export type ReplyIntent = 'hot_lead' | 'soft' | 'not_now' | 'no';

export interface ThreadItem {
    id: string;
    direction: 'sent' | 'received';
    subject: string | null;
    body_text: string | null;
    from_email: string;
    to_email: string;
    timestamp: string;
    status: string | null;        // EmailSendStatus value for sent items
    reply_intent: ReplyIntent | null;
    is_auto_reply: boolean;
}

export interface ContractorThreadOut {
    items: ThreadItem[];
    total_sent: number;
    total_received: number;
    last_activity_at: string | null;
    latest_reply_intent: ReplyIntent | null;
}

export interface ThreadContractorSummary {
    thread_email: string;           // primary key — sender's email address
    contractor_id: string | null;   // set only if sender is in contractors table
    contractor_name: string | null;
    sent_count: number;             // emails we sent TO this address
    received_count: number;         // emails we received FROM this address
    latest_reply_intent: ReplyIntent | null;
    last_activity_at: string | null;
}

// ─── Cold Email Health Dashboard ───────────────────────────────────────────

export interface HealthOverview {
    domains_active: number;
    domains_at_risk: number;
    healthy_inboxes: number;
    warmup_inboxes: number;
    paused_inboxes: number;
    emails_sent_today: number;
    replies_today: number;
    positive_replies_today: number;
    hot_leads_today: number;
    inboxes_in_spam: number;
    bounce_rate: number;
}

export interface DomainHealthRow {
    id: string;
    domain: string;
    provider: string | null;
    warmup_status: string | null;
    is_primary: boolean;
    score: number;
    status: 'healthy' | 'warning' | 'critical';
    reputation: string;
    postmaster_reputation: string | null;
    sent: number;
    bounce_rate: number;
    spam_rate: number;
    dns: { spf: boolean; dkim: boolean; dmarc: boolean; mx: boolean };
}

export interface InboxHealthRow {
    id: string;
    email: string;
    domain: string;
    status: string | null;
    warmup_status: string | null;
    age_days: number | null;
    score: number;
    health_status: 'healthy' | 'warning' | 'critical';
    sent_today: number;
    daily_limit: number;
    sent: number;
    replies: number;
    bounce_rate: number;
    last_positive_reply: string | null;
}

export interface DeliverabilityTrendPoint {
    date: string;
    spam_rate: number;
    delivery_error_rate: number;
    dkim_ratio: number;
    dmarc_ratio: number;
}

export interface DeliverabilityData {
    deliverability_score: number;
    trend: DeliverabilityTrendPoint[];
    inbox_placement: { available: boolean; reason: string };
}

export interface ReplyIntelligence {
    counts: Record<string, number>;
    unclassified: number;
    total: number;
    sentiment_pct: Record<string, number>;
    recent: {
        from_email: string;
        subject: string | null;
        intent: string | null;
        received_at: string | null;
    }[];
}

export interface TechnicalStatus {
    queues: { queued: number; sent_today: number; failed_today: number; bounced_today: number };
    jobs: { id: string; schedule: string; registered: boolean }[];
    channels: Record<string, boolean>;
}

export interface Recommendation {
    target: string;
    severity: 'critical' | 'warning' | 'info';
    issue: string;
    recommendation: string;
    suggested_action: string;
}

export interface RecommendationsResult {
    success: boolean;
    recommendations: Recommendation[] | null;
    generated_at: string | null;
    error: string | null;
}
