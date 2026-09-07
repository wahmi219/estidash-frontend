'use client';

import React from 'react';
import { Search, X, ChevronDown } from 'lucide-react';
import type { RegistryFilters, RegistrySourceRead } from '@/types';

// Mirrors ContractorFiltersPanel.tsx's structure/styling. The Source
// selector is deliberately first and visually distinct (it changes WHICH
// registry/jurisdiction you're browsing) from the filters below it (which
// narrow records WITHIN that source) -- see plan section 7's jurisdiction-
// vs-business-address-state distinction.

const SELECT_CLS =
    'w-full px-3 py-2 bg-white dark:bg-white/3 border border-gray-300 dark:border-white/8 rounded-lg text-gray-900 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-cyan-500/40 transition-colors text-sm';

const TRISTATE_OPTIONS: { value: string; label: string }[] = [
    { value: '', label: 'Any' },
    { value: 'true', label: 'Yes' },
    { value: 'false', label: 'No' },
];

function tristateToValue(v: boolean | null): string {
    return v === null ? '' : String(v);
}

function valueToTristate(v: string): boolean | null {
    return v === '' ? null : v === 'true';
}

interface RegistryFiltersPanelProps {
    filters: RegistryFilters;
    onFilterChange: (patch: Partial<RegistryFilters>) => void;
    onSourceChange: (sourceKey: string) => void;
    sources: RegistrySourceRead[];
}

const PANEL_OWNED_RESET: Partial<RegistryFilters> = {
    licenseNumber: '',
    licenseStatus: null,
    licenseType: null,
    businessType: null,
    city: null,
    addressState: null,
    zip: '',
    hasPhone: null,
    hasEmail: null,
};

export default function RegistryFiltersPanel({
    filters,
    onFilterChange,
    onSourceChange,
    sources,
}: RegistryFiltersPanelProps) {
    // Sources with nothing synced yet are excluded from the selector, not
    // shown disabled -- there's nothing useful to switch to (plan section 4,
    // open decision 6).
    const selectableSources = sources.filter((s) => s.current_count > 0);

    const hasActiveFilters = Boolean(
        filters.licenseNumber ||
        filters.licenseStatus ||
        filters.licenseType ||
        filters.businessType ||
        filters.city ||
        filters.addressState ||
        filters.zip ||
        filters.hasPhone !== null ||
        filters.hasEmail !== null
    );

    return (
        <div className="space-y-3">
            {/* Source selector — which registry/jurisdiction */}
            <div className="flex items-center gap-3">
                <label className="text-sm font-medium text-gray-600 dark:text-gray-300 shrink-0">
                    Source
                </label>
                <div className="relative max-w-xs">
                    <select
                        value={filters.sourceKey}
                        onChange={(e) => onSourceChange(e.target.value)}
                        className="pl-4 pr-8 py-2 bg-gray-100 dark:bg-white/4 border border-gray-200 dark:border-white/8 rounded-xl text-gray-700 dark:text-gray-200 text-sm font-medium appearance-none cursor-pointer focus:outline-none focus:border-cyan-500/40 transition-colors"
                    >
                        {selectableSources.length === 0 && (
                            <option value={filters.sourceKey}>{filters.sourceKey}</option>
                        )}
                        {selectableSources.map((s) => (
                            <option key={s.source_key} value={s.source_key}>
                                {s.display_name} ({s.state_code})
                            </option>
                        ))}
                    </select>
                    <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
                </div>
            </div>

            {/* Search row */}
            <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative max-w-sm flex-1">
                    <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                    <input
                        type="text"
                        value={filters.search}
                        onChange={(e) => onFilterChange({ search: e.target.value })}
                        placeholder="Search business name..."
                        className="w-full pl-10 pr-4 py-2.5 bg-gray-100 dark:bg-white/4 border border-gray-200 dark:border-white/8 rounded-xl text-gray-700 dark:text-gray-200 text-sm placeholder-gray-500 focus:outline-none focus:border-cyan-500/40 transition-colors"
                    />
                </div>
                <div className="relative max-w-xs flex-1">
                    <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                    <input
                        type="text"
                        value={filters.licenseNumber}
                        onChange={(e) => onFilterChange({ licenseNumber: e.target.value })}
                        placeholder="License # (partial match ok)"
                        className="w-full pl-10 pr-4 py-2.5 bg-gray-100 dark:bg-white/4 border border-gray-200 dark:border-white/8 rounded-xl text-gray-700 dark:text-gray-200 text-sm placeholder-gray-500 focus:outline-none focus:border-cyan-500/40 transition-colors"
                    />
                </div>
            </div>

            {/* Narrowing filters — within the selected source */}
            <div className="p-4 bg-white dark:bg-white/2 border border-gray-200 dark:border-white/6 rounded-xl">
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                    <div>
                        <label className="block text-[10px] uppercase tracking-widest text-gray-500 mb-1">City</label>
                        <input
                            type="text"
                            value={filters.city ?? ''}
                            onChange={(e) => onFilterChange({ city: e.target.value || null })}
                            className={SELECT_CLS}
                            placeholder="Any"
                        />
                    </div>

                    <div>
                        <label
                            className="block text-[10px] uppercase tracking-widest text-gray-500 mb-1"
                            title="The record's own business address state — not the same as the registry Source above"
                        >
                            Business Address State
                        </label>
                        <input
                            type="text"
                            value={filters.addressState ?? ''}
                            onChange={(e) => onFilterChange({ addressState: e.target.value.toUpperCase() || null })}
                            maxLength={2}
                            className={SELECT_CLS}
                            placeholder="Any"
                        />
                    </div>

                    <div>
                        <label className="block text-[10px] uppercase tracking-widest text-gray-500 mb-1">ZIP</label>
                        <input
                            type="text"
                            value={filters.zip}
                            onChange={(e) => onFilterChange({ zip: e.target.value })}
                            className={SELECT_CLS}
                            placeholder="Any"
                        />
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
                        <label className="block text-[10px] uppercase tracking-widest text-gray-500 mb-1">Status</label>
                        <select
                            value={filters.isCurrent ? 'current' : 'all'}
                            onChange={(e) => onFilterChange({ isCurrent: e.target.value === 'current' })}
                            className={SELECT_CLS}
                        >
                            <option value="current">Currently Listed</option>
                            <option value="all">Include Historic</option>
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
        </div>
    );
}
