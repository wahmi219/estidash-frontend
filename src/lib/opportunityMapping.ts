/**
 * Opportunity Category Mapping
 *
 * Maps internal permit/opportunity statuses (as stored in the DB) to five
 * user-facing bucket names. Users never see raw statuses — only buckets.
 *
 * Buckets (in priority order):
 *   1. Fresh Leads       — work now (issued-type statuses)
 *   2. Scope Change      — highest priority (revision-type statuses)
 *   3. Introduction / Track — monitor, not urgent (early/review statuses)
 *   4. Late / Execution  — low outreach value (under construction/inspection)
 *   5. Dead              — ignore or archive
 *
 * To add or reclassify a status, edit CATEGORY_TO_STATUSES below.
 * The backend (opportunity_mapping.py) must mirror any changes made here.
 */

export const OPPORTUNITY_CATEGORIES = [
    'Fresh Leads',
    'Scope Change',
    'Introduction / Track',
    'Late / Execution',
    'Dead',
] as const;

export type OpportunityCategory = (typeof OPPORTUNITY_CATEGORIES)[number];

/**
 * Each category maps to an array of raw status strings (case-insensitive substrings)
 * that will be matched against the `status` column in the DB via ILIKE.
 */
export const CATEGORY_TO_STATUSES: Record<OpportunityCategory, string[]> = {
    'Fresh Leads': [
        'issued',
        'permit issued',
        'issue',
        'ready for issuance',
        'awaiting permit issuance',
        'issuance fees paid',
        'foundation release',
        'phased permitting',
    ],
    'Scope Change': [
        'corrections required',
        'correction required',
        'awaiting revision issuance',
        'revision fees paid',
        'failed inspection',
        'reinspection',
        're-inspection',
        'correction notice',
        'correction issued',
        'stop work order',
    ],
    'Introduction / Track': [
        'applied',
        'new',
        'application received',
        'application completed',
        'initiated',
        'pending',
        'pending prescreen review',
        'ready for intake',
        'plan set submitted',
        'plan review',
        'pending plans review',
        'pending plans review assignment',
        'hold - pending plans review',
        'reviews in process',
        'reviewed',
        'open',
        'live',
        'in process',
        'route',
        'scheduled',
        'scheduled and submitted',
        'fees due',
        'fees paid',
        'paid',
        'aprv_nr',
        'approved (not under construction)',
        'additional info requested',
        'awaiting information',
        'more information required',
        'awaiting client reply',
    ],
    'Late / Execution': [
        'under construction',
        'ready_for_inspections',
        'system inspection',
        'inspecting',
        'inspection followup',
        'approved to call inspection',
        'final inspection passed',
        'signed-off',
        'certificate',
        'completion report received',
        'permit finaled',
        'final',
        'permit',
    ],
    'Dead': [
        'unknown',
        'system abandoned',
        'well abandoned',
        'cancelled',
        'canceled',
        'application canceled',
        'application withdrawn',
        'withdrwn',
        'w/refund',
        'void',
        'voided',
        'denied',
        'refused',
        'revoked',
        'stop work',
        'suspended',
        'app_exp',
        'demolitions',
        'call notification received',
        'septic system attributes & conditions',
        'on hold',
        'hold',
    ],
};

/**
 * Returns the user-facing category for a given raw opportunity status.
 * Returns null and logs a warning for unmapped statuses.
 */
export function getCategory(opportunityStatus: string): OpportunityCategory | null {
    if (!opportunityStatus) return null;
    const lower = opportunityStatus.toLowerCase().trim();

    for (const category of OPPORTUNITY_CATEGORIES) {
        const terms = CATEGORY_TO_STATUSES[category];
        if (terms.some((term) => lower.includes(term.toLowerCase()))) {
            return category;
        }
    }

    // Log unmapped statuses for review (in browser console / server logs)
    console.warn(`[opportunityMapping] Unmapped opportunity status: "${opportunityStatus}"`);
    return null;
}

// ─── Issued Age Bucket Options ────────────────────────────────────────────────

export const ISSUED_AGE_BUCKET_OPTIONS = [
    { value: '', label: 'All Ages' },
    { value: 'fresh_issued', label: '0–15 days', priority: 'High' },
    { value: 'warm_issued', label: '0–31 days', priority: 'Good' },
    { value: 'aging_issued', label: '0–60 days', priority: 'Selective' },
    { value: 'old_issued', label: '61+ days', priority: 'Low' },
] as const;

export type IssuedAgeBucket = 'fresh_issued' | 'warm_issued' | 'aging_issued' | 'old_issued' | '';

// ─── Project Class Options ────────────────────────────────────────────────────

export const PROJECT_CLASS_OPTIONS = [
    { value: '', label: 'All Projects' },
    { value: 'Residential', label: 'Residential' },
    { value: 'Commercial', label: 'Commercial' },
    { value: 'Multi-Family', label: 'Multi-Family' },
    { value: 'Industrial', label: 'Industrial' },
    { value: 'Data Center', label: 'Data Center' },
    { value: 'Specialty', label: 'Specialty' },
] as const;

export type ProjectClass = (typeof PROJECT_CLASS_OPTIONS)[number]['value'];

// ─── Work Scope Options ───────────────────────────────────────────────────────

export const WORK_SCOPE_OPTIONS = [
    { value: 'New Build', label: 'New Build' },
    { value: 'Addition', label: 'Addition' },
    { value: 'Renovation', label: 'Renovation' },
    { value: 'Interior Build-Out / TI', label: 'Interior Build-Out / TI' },
    { value: 'Demolition', label: 'Demolition' },
    { value: 'Special', label: 'Special (other)' },
] as const;

export type WorkScope = (typeof WORK_SCOPE_OPTIONS)[number]['value'];

/**
 * Maps a Project Class value to the DB search terms used for ILIKE matching.
 * Mirrors PROJECT_CLASS_SEARCH_TERMS in the backend opportunity_mapping.py.
 */
export const PROJECT_CLASS_SEARCH_TERMS: Record<string, string[]> = {
    Residential: ['residential', 'single family', 'single-family', 'sfr', 'r-1', 'r-2', 'r-3'],
    Commercial: ['commercial', 'office', 'retail', 'mixed use', 'c-1', 'c-2', 'business'],
    'Multi-Family': ['multi-family', 'multifamily', 'apartment', 'condo', 'duplex', 'triplex', 'multi family', 'r-4', 'r-5'],
    Industrial: ['industrial', 'warehouse', 'manufacturing', 'factory', 'storage', 'flex'],
    'Data Center': ['data center', 'datacenter', 'server', 'colocation', 'colo'],
    Specialty: ['specialty', 'special', 'mixed-use', 'institutional', 'hospital', 'school', 'church', 'religious', 'government'],
};

/**
 * Maps a Work Scope value to the DB search terms used for ILIKE matching.
 * Mirrors WORK_SCOPE_SEARCH_TERMS in the backend opportunity_mapping.py.
 */
export const WORK_SCOPE_SEARCH_TERMS: Record<string, string[]> = {
    'New Build': ['new construction', 'new build', 'new structure', 'ground up', 'erect', 'erection', 'new commercial', 'new residential'],
    Addition: ['addition', 'addtn', 'add-on', 'expand'],
    Renovation: ['renovation', 'renovat', 'remodel', 'alteration', 'retrofit', 'rehab', 'upgrade', 'improve'],
    'Interior Build-Out / TI': ['tenant improvement', 'tenant impr', 'interior', 'ti ', 't.i.', 'build-out', 'buildout', 'fit-out', 'fitout'],
    Demolition: ['demolition', 'demolish', 'demo '],
    Special: ['special', 'other', 'miscellaneous', 'misc'],
};
