'use client';

import React from 'react';
import { X } from 'lucide-react';
import type { ContractorFilters, ContractorLicenseReadiness } from '@/types';
import { LICENSE_READINESS_LABELS } from './ContractorQualityBadges';

// Mirrors src/components/permits/PermitFilters.tsx's structure and styling
// (SELECT_CLS, hasActiveFilters + reset pattern) — Phase 2A, 2A.2. Holds only
// the filters that previously existed in ContractorFilters/the API contract
// but had no rendered control (state, city, hasEmail) plus the new ones
// added in 2A.1 (hasLicense/hasPhone/hasWebsite/licenseReadiness). Search,
// contractor type, and score bucket stay in the page's existing inline
// controls — deliberately not moved here, to avoid touching already-working UI.

const SELECT_CLS =
    'w-full px-3 py-2 bg-white dark:bg-white/3 border border-gray-300 dark:border-white/8 rounded-lg text-gray-900 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-cyan-500/40 transition-colors text-sm';

const TRISTATE_OPTIONS: { value: string; label: string }[] = [
    { value: '', label: 'Any' },
    { value: 'true', label: 'Yes' },
    { value: 'false', label: 'No' },
];

const READINESS_OPTIONS: { value: ContractorLicenseReadiness | ''; label: string }[] = [
    { value: '', label: 'Any' },
    { value: 'ready', label: LICENSE_READINESS_LABELS.ready },
    { value: 'needs_state', label: LICENSE_READINESS_LABELS.needs_state },
    { value: 'no_license', label: LICENSE_READINESS_LABELS.no_license },
    { value: 'invalid_format', label: LICENSE_READINESS_LABELS.invalid_format },
];

function tristateToValue(v: boolean | null): string {
    return v === null ? '' : String(v);
}

function valueToTristate(v: string): boolean | null {
    return v === '' ? null : v === 'true';
}

interface ContractorFiltersPanelProps {
    filters: ContractorFilters;
    onFilterChange: (patch: Partial<ContractorFilters>) => void;
    availableStates: string[];
    availableCities: string[];
}

// This panel owns exactly these seven filter fields — its own "clear" only
// resets these, not search/contractorType/scoreBucket (which the page's
// existing inline controls own and already have their own reset behavior).
const PANEL_OWNED_RESET: Partial<ContractorFilters> = {
    city: null,
    stateCode: null,
    hasEmail: null,
    hasLicense: null,
    hasPhone: null,
    hasWebsite: null,
    licenseReadiness: null,
};

export default function ContractorFiltersPanel({
    filters,
    onFilterChange,
    availableStates,
    availableCities,
}: ContractorFiltersPanelProps) {
    const hasActiveFilters = Boolean(
        filters.city ||
        filters.stateCode ||
        filters.hasEmail !== null ||
        filters.hasLicense !== null ||
        filters.hasPhone !== null ||
        filters.hasWebsite !== null ||
        filters.licenseReadiness
    );

    return (
        <div className="p-4 bg-white dark:bg-white/2 border border-gray-200 dark:border-white/6 rounded-xl">
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-3">
                <div>
                    <label className="block text-[10px] uppercase tracking-widest text-gray-500 mb-1">State</label>
                    <select
                        value={filters.stateCode ?? ''}
                        onChange={(e) => {
                            const stateCode = e.target.value || null;
                            // City options are scoped to the selected state (fetched by the
                            // page's cascading effect) -- clear any city pick that no longer
                            // applies rather than leaving a stale, now-invalid filter selected.
                            onFilterChange({ stateCode, city: null });
                        }}
                        className={SELECT_CLS}
                    >
                        <option value="">Any</option>
                        {availableStates.map((s) => (
                            <option key={s} value={s}>{s}</option>
                        ))}
                    </select>
                </div>

                <div>
                    <label className="block text-[10px] uppercase tracking-widest text-gray-500 mb-1">City</label>
                    <select
                        value={filters.city ?? ''}
                        onChange={(e) => onFilterChange({ city: e.target.value || null })}
                        className={SELECT_CLS}
                    >
                        <option value="">Any</option>
                        {availableCities.map((c) => (
                            <option key={c} value={c}>{c}</option>
                        ))}
                    </select>
                </div>

                <div>
                    <label className="block text-[10px] uppercase tracking-widest text-gray-500 mb-1">Has Email</label>
                    <select
                        value={tristateToValue(filters.hasEmail)}
                        onChange={(e) => onFilterChange({ hasEmail: valueToTristate(e.target.value) })}
                        className={SELECT_CLS}
                    >
                        {TRISTATE_OPTIONS.map((o) => (
                            <option key={o.value} value={o.value}>{o.label}</option>
                        ))}
                    </select>
                </div>

                <div>
                    <label className="block text-[10px] uppercase tracking-widest text-gray-500 mb-1">Has License</label>
                    <select
                        value={tristateToValue(filters.hasLicense)}
                        onChange={(e) => onFilterChange({ hasLicense: valueToTristate(e.target.value) })}
                        className={SELECT_CLS}
                    >
                        {TRISTATE_OPTIONS.map((o) => (
                            <option key={o.value} value={o.value}>{o.label}</option>
                        ))}
                    </select>
                </div>

                <div>
                    <label className="block text-[10px] uppercase tracking-widest text-gray-500 mb-1">Has Phone</label>
                    <select
                        value={tristateToValue(filters.hasPhone)}
                        onChange={(e) => onFilterChange({ hasPhone: valueToTristate(e.target.value) })}
                        className={SELECT_CLS}
                    >
                        {TRISTATE_OPTIONS.map((o) => (
                            <option key={o.value} value={o.value}>{o.label}</option>
                        ))}
                    </select>
                </div>

                <div>
                    <label className="block text-[10px] uppercase tracking-widest text-gray-500 mb-1">Has Website</label>
                    <select
                        value={tristateToValue(filters.hasWebsite)}
                        onChange={(e) => onFilterChange({ hasWebsite: valueToTristate(e.target.value) })}
                        className={SELECT_CLS}
                    >
                        {TRISTATE_OPTIONS.map((o) => (
                            <option key={o.value} value={o.value}>{o.label}</option>
                        ))}
                    </select>
                </div>

                <div>
                    <label className="block text-[10px] uppercase tracking-widest text-gray-500 mb-1">License Readiness</label>
                    <select
                        value={filters.licenseReadiness ?? ''}
                        onChange={(e) =>
                            onFilterChange({
                                licenseReadiness: (e.target.value || null) as ContractorLicenseReadiness | null,
                            })
                        }
                        className={SELECT_CLS}
                    >
                        {READINESS_OPTIONS.map((o) => (
                            <option key={o.value} value={o.value}>{o.label}</option>
                        ))}
                    </select>
                </div>
            </div>

            {hasActiveFilters && (
                <button
                    onClick={() => onFilterChange(PANEL_OWNED_RESET)}
                    className="mt-3 flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
                >
                    <X size={14} />
                    Clear these filters
                </button>
            )}
        </div>
    );
}
