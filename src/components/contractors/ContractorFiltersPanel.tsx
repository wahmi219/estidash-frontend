'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Search, X, MapPin, PhoneCall, ShieldCheck, Filter, ChevronDown } from 'lucide-react';
import type { ContractorFilters, ContractorLicenseReadiness } from '@/types';
import { LICENSE_READINESS_LABELS } from './ContractorQualityBadges';

// Mirrors src/components/permits/PermitFilters.tsx's compact toolbar +
// popover structure exactly (same trigger/panel building blocks, same
// active-chip collapse behavior) — established Estimation Hub MVP pattern.
// Every filter here maps to a real GET /contractors query param; nothing is
// a proxy for a research status that doesn't exist yet.

const PRIMARY = '#00458B';
const NAVY = '#0E2B5C';
const MUTED = '#5B6B7D';

const SELECT_CLS =
    'w-full px-2.5 py-1.5 bg-white border border-[#DFE6EE] rounded-md text-[#0E2B5C] focus:outline-none focus:ring-2 focus:ring-[#00458B]/25 focus:border-[#00458B] transition-colors text-sm disabled:opacity-40 disabled:cursor-not-allowed';

const LABEL_CLS = 'text-xs text-[#5B6B7D] font-medium flex items-center gap-1';

const BADGE_CLS =
    'inline-flex items-center gap-1 px-2 py-0.5 bg-[#F7F9FB] text-[#00458B] text-xs rounded-full border border-[#DFE6EE] whitespace-nowrap shrink-0';

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

const VISIBLE_CHIP_LIMIT = 3;

type PopoverKey = 'location' | 'contactability' | 'license' | 'more';

function tristateToValue(v: boolean | null): string {
    return v === null ? '' : String(v);
}
function valueToTristate(v: string): boolean | null {
    return v === '' ? null : v === 'true';
}

// ── Shared popover building blocks (same pattern as PermitFilters.tsx) ─────

function FilterTrigger({
    label, icon, isOpen, hasValue, onClick,
}: {
    label: string; icon: React.ReactNode; isOpen: boolean; hasValue: boolean; onClick: () => void;
}) {
    return (
        <button
            type="button"
            onClick={onClick}
            className={`relative flex items-center gap-1.5 h-[34px] px-3 rounded-md border text-sm font-medium whitespace-nowrap transition-colors ${
                isOpen
                    ? 'border-[#00458B] text-[#00458B] bg-[#00458B]/5'
                    : 'border-[#DFE6EE] text-[#0E2B5C] bg-white hover:bg-[#F7F9FB]'
            }`}
        >
            {icon}
            {label}
            <ChevronDown size={13} className={`transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            {hasValue && (
                <span
                    className="absolute -top-1 -right-1 w-2 h-2 rounded-full border border-white"
                    style={{ backgroundColor: PRIMARY }}
                    aria-hidden
                />
            )}
        </button>
    );
}

function PopoverPanel({
    title, align = 'left', width = 'w-64', onClose, children,
}: {
    title: string; align?: 'left' | 'right'; width?: string; onClose: () => void; children: React.ReactNode;
}) {
    return (
        <div
            className={`absolute z-30 top-full ${align === 'right' ? 'right-0' : 'left-0'} mt-1.5 ${width} bg-white border border-[#DFE6EE] rounded-lg shadow-lg p-3 space-y-2`}
        >
            <div className="flex items-center justify-between">
                <span className="text-xs font-semibold" style={{ color: NAVY }}>{title}</span>
                <button type="button" onClick={onClose} className="text-[#5B6B7D] hover:text-[#0E2B5C]" aria-label={`Close ${title}`}>
                    <X size={12} />
                </button>
            </div>
            {children}
        </div>
    );
}

interface ContractorFiltersPanelProps {
    filters: ContractorFilters;
    onFilterChange: (patch: Partial<ContractorFilters>) => void;
    onReset: () => void;
    availableStates: string[];
    availableCities: string[];
    availableTypes: string[];
    searchValue: string;
    onSearchChange: (value: string) => void;
    onSearchClear: () => void;
}

export default function ContractorFiltersPanel({
    filters,
    onFilterChange,
    onReset,
    availableStates,
    availableCities,
    searchValue,
    onSearchChange,
    onSearchClear,
}: ContractorFiltersPanelProps) {
    const [openPopover, setOpenPopover] = useState<PopoverKey | null>(null);
    const [showAllChips, setShowAllChips] = useState(false);
    const toolbarRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        function handleClickOutside(e: MouseEvent) {
            if (toolbarRef.current && !toolbarRef.current.contains(e.target as Node)) {
                setOpenPopover(null);
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const togglePopover = (key: PopoverKey) => setOpenPopover((prev) => (prev === key ? null : key));

    const hasLocationActive = Boolean(filters.stateCode || filters.city);
    const hasContactabilityActive = filters.hasEmail !== null || filters.hasPhone !== null || filters.hasWebsite !== null;
    const hasLicenseActive = filters.hasLicense !== null || Boolean(filters.licenseReadiness);

    const hasActiveFilters = Boolean(
        searchValue ||
        filters.contractorType ||
        filters.city ||
        filters.stateCode ||
        filters.hasEmail !== null ||
        filters.hasLicense !== null ||
        filters.hasPhone !== null ||
        filters.hasWebsite !== null ||
        filters.licenseReadiness
    );

    const handleStateChange = (stateCode: string | null) => {
        // City options are scoped to the selected state (fetched by the page's
        // cascading effect) -- clear any city pick that no longer applies.
        onFilterChange({ stateCode, city: null });
    };

    const activeChips = useMemo(() => {
        const chips: { id: string; label: string; onRemove: () => void }[] = [];
        if (filters.stateCode) {
            chips.push({ id: 'state', label: filters.stateCode, onRemove: () => handleStateChange(null) });
        }
        if (filters.city) {
            chips.push({ id: 'city', label: filters.city, onRemove: () => onFilterChange({ city: null }) });
        }
        if (filters.hasEmail !== null) {
            chips.push({
                id: 'has-email',
                label: filters.hasEmail ? 'Has Email' : 'No Email',
                onRemove: () => onFilterChange({ hasEmail: null }),
            });
        }
        if (filters.hasPhone !== null) {
            chips.push({
                id: 'has-phone',
                label: filters.hasPhone ? 'Has Phone' : 'No Phone',
                onRemove: () => onFilterChange({ hasPhone: null }),
            });
        }
        if (filters.hasWebsite !== null) {
            chips.push({
                id: 'has-website',
                label: filters.hasWebsite ? 'Has Website' : 'No Website',
                onRemove: () => onFilterChange({ hasWebsite: null }),
            });
        }
        if (filters.hasLicense !== null) {
            chips.push({
                id: 'has-license',
                label: filters.hasLicense ? 'Has License' : 'No License',
                onRemove: () => onFilterChange({ hasLicense: null }),
            });
        }
        if (filters.licenseReadiness) {
            chips.push({
                id: 'license-readiness',
                label: LICENSE_READINESS_LABELS[filters.licenseReadiness],
                onRemove: () => onFilterChange({ licenseReadiness: null }),
            });
        }
        if (filters.contractorType) {
            chips.push({
                id: 'contractor-type',
                label: filters.contractorType,
                onRemove: () => onFilterChange({ contractorType: null }),
            });
        }
        return chips;
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [filters]);

    const visibleChips = showAllChips ? activeChips : activeChips.slice(0, VISIBLE_CHIP_LIMIT);
    const hiddenCount = activeChips.length - visibleChips.length;

    return (
        <div className="bg-white border border-[#DFE6EE] rounded-lg px-3 py-2.5 space-y-2" ref={toolbarRef}>
            <div className="flex items-center gap-2 flex-wrap">
                {/* Search */}
                <div className="relative flex-[1_1_260px] max-w-[420px] min-w-[220px]">
                    <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#5B6B7D]" />
                    <input
                        type="text"
                        value={searchValue}
                        onChange={(e) => onSearchChange(e.target.value)}
                        placeholder="Search by name, email, phone, license..."
                        className="w-full pl-9 pr-9 py-2 bg-white border border-[#DFE6EE] rounded-lg text-[#0E2B5C] placeholder-[#5B6B7D] focus:outline-none focus:ring-2 focus:ring-[#00458B]/25 focus:border-[#00458B] transition-colors text-sm"
                    />
                    {searchValue && (
                        <button
                            onClick={onSearchClear}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-[#5B6B7D] hover:text-[#0E2B5C] transition-colors"
                        >
                            <X size={14} />
                        </button>
                    )}
                </div>

                {/* Location — State / City */}
                <div className="relative">
                    <FilterTrigger
                        label="Location"
                        icon={<MapPin size={13} />}
                        isOpen={openPopover === 'location'}
                        hasValue={hasLocationActive}
                        onClick={() => togglePopover('location')}
                    />
                    {openPopover === 'location' && (
                        <PopoverPanel title="Location" width="w-64" onClose={() => setOpenPopover(null)}>
                            <div className="space-y-2">
                                <div>
                                    <label className={LABEL_CLS}>State</label>
                                    <select
                                        value={filters.stateCode ?? ''}
                                        onChange={(e) => handleStateChange(e.target.value || null)}
                                        className={SELECT_CLS}
                                    >
                                        <option value="">Any</option>
                                        {availableStates.map((s) => (
                                            <option key={s} value={s}>{s}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className={LABEL_CLS}>City</label>
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
                            </div>
                        </PopoverPanel>
                    )}
                </div>

                {/* Contactability — Has Email / Has Phone / Has Website */}
                <div className="relative">
                    <FilterTrigger
                        label="Contactability"
                        icon={<PhoneCall size={13} />}
                        isOpen={openPopover === 'contactability'}
                        hasValue={hasContactabilityActive}
                        onClick={() => togglePopover('contactability')}
                    />
                    {openPopover === 'contactability' && (
                        <PopoverPanel title="Contactability" width="w-60" onClose={() => setOpenPopover(null)}>
                            <div className="space-y-2">
                                <div>
                                    <label className={LABEL_CLS}>Has Email</label>
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
                                    <label className={LABEL_CLS}>Has Phone</label>
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
                                    <label className={LABEL_CLS}>Has Website</label>
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
                                <p className="text-[10px] text-[#5B6B7D] leading-snug pt-1 border-t border-[#DFE6EE]">
                                    The Contactability column on the table is derived from these three fields.
                                </p>
                            </div>
                        </PopoverPanel>
                    )}
                </div>

                {/* License — Has License / License Readiness */}
                <div className="relative">
                    <FilterTrigger
                        label="License"
                        icon={<ShieldCheck size={13} />}
                        isOpen={openPopover === 'license'}
                        hasValue={hasLicenseActive}
                        onClick={() => togglePopover('license')}
                    />
                    {openPopover === 'license' && (
                        <PopoverPanel title="License" width="w-64" onClose={() => setOpenPopover(null)}>
                            <div className="space-y-2">
                                <div>
                                    <label className={LABEL_CLS}>Has License</label>
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
                                    <label className={LABEL_CLS}>License Readiness</label>
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
                        </PopoverPanel>
                    )}
                </div>

                {/* "More Filters" (Contractor Type) removed -- Phase 9 requirement
                    update: Contractor Type is not part of the approved MVP filter
                    set (see docs/phase9_frontend_api_contract.md). filters.
                    contractorType/availableTypes are kept on the type/state only
                    for backward compatibility with old bookmarked URLs; no
                    control sets them anymore. */}

                {/* Clear all — small text button, only shown when a filter is active */}
                {hasActiveFilters && (
                    <button
                        type="button"
                        onClick={onReset}
                        className="text-xs whitespace-nowrap text-[#5B6B7D] hover:text-[#00458B] hover:underline underline-offset-2 transition-colors ml-auto"
                    >
                        Clear all
                    </button>
                )}
            </div>

            {/* Active filter chips — single line, collapses extras into "+N more" */}
            {activeChips.length > 0 && (
                <div className={`flex items-center gap-1.5 pt-1.5 border-t border-[#DFE6EE] ${showAllChips ? 'flex-wrap' : 'overflow-hidden'}`}>
                    <span className="text-xs shrink-0" style={{ color: MUTED }}>Active:</span>
                    {visibleChips.map((chip) => (
                        <span key={chip.id} className={BADGE_CLS}>
                            {chip.label}
                            <button onClick={chip.onRemove} className="hover:text-[#045CB4]" aria-label={`Remove ${chip.label}`}>
                                <X size={10} />
                            </button>
                        </span>
                    ))}
                    {!showAllChips && hiddenCount > 0 && (
                        <button
                            type="button"
                            onClick={() => setShowAllChips(true)}
                            className="text-xs text-[#00458B] hover:underline shrink-0 whitespace-nowrap"
                        >
                            +{hiddenCount} more
                        </button>
                    )}
                    {showAllChips && activeChips.length > VISIBLE_CHIP_LIMIT && (
                        <button
                            type="button"
                            onClick={() => setShowAllChips(false)}
                            className="text-xs text-[#00458B] hover:underline shrink-0 whitespace-nowrap"
                        >
                            Show less
                        </button>
                    )}
                </div>
            )}
        </div>
    );
}
