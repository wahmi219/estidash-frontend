'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
    X, MapPin, Briefcase, Layers, Target,
    DollarSign, Calendar, LandPlot, Gauge, Globe, UserCheck, ChevronDown, Filter,
} from 'lucide-react';
import { PermitFilters, PermitCityInfo, PermitCounty, PermitDataSourceOption } from '@/types';
import {
    OPPORTUNITY_CATEGORIES,
    ISSUED_AGE_BUCKET_OPTIONS,
    PROJECT_CLASS_OPTIONS,
    WORK_SCOPE_OPTIONS,
} from '@/lib/opportunityMapping';
import PermitSearch from './PermitSearch';

interface PermitFiltersProps {
    filters: PermitFilters;
    availableCities: PermitCityInfo[];
    // Kept as a prop (not removed from the type) so this component still
    // compiles against callers passing it, but Phase 9 Chunk 1 no longer
    // renders a County control — see PermitFilters.county's doc comment.
    availableCounties: PermitCounty[];
    availableDataSources: PermitDataSourceOption[];
    onFilterChange: (filters: Partial<PermitFilters>) => void;
    onReset: () => void;
    searchValue: string;
    onSearchChange: (value: string) => void;
    onSearchClear: () => void;
}

const STATE_NAMES: Record<string, string> = {
    AL: 'Alabama', AK: 'Alaska', AZ: 'Arizona', AR: 'Arkansas', CA: 'California',
    CO: 'Colorado', CT: 'Connecticut', DE: 'Delaware', FL: 'Florida', GA: 'Georgia',
    HI: 'Hawaii', ID: 'Idaho', IL: 'Illinois', IN: 'Indiana', IA: 'Iowa',
    KS: 'Kansas', KY: 'Kentucky', LA: 'Louisiana', ME: 'Maine', MD: 'Maryland',
    MA: 'Massachusetts', MI: 'Michigan', MN: 'Minnesota', MS: 'Mississippi', MO: 'Missouri',
    MT: 'Montana', NE: 'Nebraska', NV: 'Nevada', NH: 'New Hampshire', NJ: 'New Jersey',
    NM: 'New Mexico', NY: 'New York', NC: 'North Carolina', ND: 'North Dakota', OH: 'Ohio',
    OK: 'Oklahoma', OR: 'Oregon', PA: 'Pennsylvania', RI: 'Rhode Island', SC: 'South Carolina',
    SD: 'South Dakota', TN: 'Tennessee', TX: 'Texas', UT: 'Utah', VT: 'Vermont',
    VA: 'Virginia', WA: 'Washington', WV: 'West Virginia', WI: 'Wisconsin', WY: 'Wyoming',
    DC: 'District of Columbia', PR: 'Puerto Rico',
    AB: 'Alberta', BC: 'British Columbia', MB: 'Manitoba', NB: 'New Brunswick',
    NL: 'Newfoundland and Labrador', NT: 'Northwest Territories', NS: 'Nova Scotia',
    NU: 'Nunavut', ON: 'Ontario', PE: 'Prince Edward Island', QC: 'Quebec',
    SK: 'Saskatchewan', YT: 'Yukon',
};

// Estimation Hub light theme
const PRIMARY = '#00458B';
const NAVY = '#0E2B5C';
const MUTED = '#5B6B7D';

const SELECT_CLS =
    'w-full px-2.5 py-1.5 bg-white border border-[#DFE6EE] rounded-md text-[#0E2B5C] focus:outline-none focus:ring-2 focus:ring-[#00458B]/25 focus:border-[#00458B] transition-colors text-sm disabled:opacity-40 disabled:cursor-not-allowed';

// Tighter than SELECT_CLS — native date inputs need less horizontal padding to
// stay inside a narrow popover column without overflowing.
const DATE_INPUT_CLS =
    'w-full min-w-0 px-1.5 py-1.5 bg-white border border-[#DFE6EE] rounded-md text-[#0E2B5C] focus:outline-none focus:ring-2 focus:ring-[#00458B]/25 focus:border-[#00458B] transition-colors text-xs disabled:opacity-40 disabled:cursor-not-allowed';

const DATE_MINI_LABEL_CLS = 'block text-[9px] uppercase tracking-wide text-[#5B6B7D] leading-none mb-0.5';

const LABEL_CLS = 'text-xs text-[#5B6B7D] font-medium flex items-center gap-1';

const BADGE_CLS =
    'inline-flex items-center gap-1 px-2 py-0.5 bg-[#F7F9FB] text-[#00458B] text-xs rounded-full border border-[#DFE6EE] whitespace-nowrap shrink-0';

const SCORE_BUCKET_OPTIONS = [
    { value: '', label: 'All Buckets' },
    { value: 'strategic', label: 'Strategic' },
    { value: 'strong', label: 'Strong' },
    { value: 'core', label: 'Core' },
    { value: 'opportunistic', label: 'Opportunistic' },
    { value: 'no_send', label: 'No Send' },
];

const COST_SOURCE_OPTIONS = [
    { value: '', label: 'All Costs' },
    { value: 'real', label: 'Real cost' },
    { value: 'ai', label: 'AI-estimated' },
    { value: 'none', label: 'No cost' },
];

const QUALIFICATION_OPTIONS = [
    { value: '', label: 'All' },
    { value: 'qualified', label: 'Qualified' },
    { value: 'invalid', label: 'Invalid / Excluded' },
];

const CONTRACTOR_OPTIONS = [
    { value: '', label: 'All' },
    { value: 'true', label: 'Contractor Linked' },
    { value: 'false', label: 'Verification Needed' },
];

// Max active-filter chips shown before collapsing the rest into "+N more" —
// keeps the active-filters row to a single line in the common case.
const VISIBLE_CHIP_LIMIT = 3;

type PopoverKey = 'location' | 'qualification' | 'contractor' | 'date' | 'more';

// ── Small shared popover building blocks ────────────────────────────────────

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

function OptionList({
    options, value, onSelect,
}: {
    options: { value: string; label: string }[]; value: string; onSelect: (value: string) => void;
}) {
    return (
        <div className="space-y-0.5">
            {options.map((opt) => (
                <button
                    key={opt.value}
                    type="button"
                    onClick={() => onSelect(opt.value)}
                    className={`w-full text-left px-2 py-1.5 rounded-md text-sm transition-colors ${
                        value === opt.value
                            ? 'bg-[#00458B]/10 text-[#00458B] font-medium'
                            : 'text-[#0E2B5C] hover:bg-[#F7F9FB]'
                    }`}
                >
                    {opt.label}
                </button>
            ))}
        </div>
    );
}

// Parses a YYYY-MM-DD (date-only) string manually to avoid timezone offset bugs.
function parseDateOnly(dateStr: string): Date | null {
    const parts = dateStr.split('T')[0].split('-');
    if (parts.length !== 3) return null;
    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    const day = parseInt(parts[2], 10);
    return new Date(year, month, day);
}

function shortDate(dateStr: string): { month: string; day: string } {
    const d = parseDateOnly(dateStr);
    if (!d) return { month: '', day: dateStr };
    return { month: d.toLocaleDateString('en-US', { month: 'short' }), day: String(d.getDate()) };
}

// Combines a From/To pair into one compact chip label, e.g. "Added: Sep 1–7"
// or "Added: Sep 1–Oct 3" across months, or "Added: from Sep 1" / "until Sep 7"
// when only one bound is set.
function dateRangeLabel(prefix: string, start: string | null, end: string | null): string | null {
    if (!start && !end) return null;
    if (start && end) {
        const s = shortDate(start);
        const e = shortDate(end);
        return s.month === e.month
            ? `${prefix}: ${s.month} ${s.day}–${e.day}`
            : `${prefix}: ${s.month} ${s.day}–${e.month} ${e.day}`;
    }
    if (start) {
        const s = shortDate(start);
        return `${prefix}: from ${s.month} ${s.day}`;
    }
    const e = shortDate(end as string);
    return `${prefix}: until ${e.month} ${e.day}`;
}

export default function PermitFiltersPanel({
    filters,
    availableCities,
    availableDataSources,
    onFilterChange,
    onReset,
    searchValue,
    onSearchChange,
    onSearchClear,
}: PermitFiltersProps) {
    const [openPopover, setOpenPopover] = useState<PopoverKey | null>(null);
    const [showAllChips, setShowAllChips] = useState(false);
    // Which date range the Date popover is currently showing/editing. Purely a UI
    // toggle — switching it never reads from or writes to the other range, so
    // addedStartDate/addedEndDate and startDate/endDate stay fully independent.
    const [dateType, setDateType] = useState<'added' | 'permit'>(() => (
        (filters.startDate || filters.endDate) && !(filters.addedStartDate || filters.addedEndDate)
            ? 'permit'
            : 'added'
    ));

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

    // Project Type and Value moved into More Filters this pass, so they count
    // toward the More Filters trigger's "has value" dot.
    const hasMoreActive = Boolean(
        filters.projectClass || filters.workScope || filters.metro || filters.opportunityCategory ||
        filters.issuedAgeBucket || filters.costSource || filters.scoreBucket ||
        filters.minCost != null || filters.maxCost != null
    );

    const hasLocationActive = Boolean(filters.state || filters.city || filters.agencyId);
    const hasDateActive = Boolean(filters.addedStartDate || filters.addedEndDate || filters.startDate || filters.endDate);

    const hasActiveFilters = Boolean(
        filters.city ||
        filters.state ||
        filters.metro ||
        filters.agencyId ||
        filters.opportunityCategory ||
        filters.issuedAgeBucket ||
        filters.projectClass ||
        filters.workScope ||
        filters.startDate ||
        filters.endDate ||
        filters.addedStartDate ||
        filters.addedEndDate ||
        filters.minCost != null ||
        filters.maxCost != null ||
        filters.scoreBucket ||
        filters.costSource ||
        filters.qualification ||
        filters.hasContractor != null
    );

    const handleOpportunityCategoryChange = (value: string) => {
        // Clear age bucket when switching away from Fresh Leads
        const newCategory = value || null;
        const updates: Partial<PermitFilters> = { opportunityCategory: newCategory };
        if (newCategory !== 'Fresh Leads') updates.issuedAgeBucket = null;
        onFilterChange(updates);
    };

    // ── Metro / State / City cascading ────────────────────────────────────────

    const availableMetros = useMemo(() => {
        const metroMap = new Map<string, { code: string; name: string; cityCount: number }>();
        availableCities.forEach((city: PermitCityInfo) => {
            if (city.metro_code && city.metro_name) {
                const existing = metroMap.get(city.metro_code);
                if (existing) {
                    existing.cityCount += 1;
                } else {
                    metroMap.set(city.metro_code, { code: city.metro_code, name: city.metro_name, cityCount: 1 });
                }
            }
        });
        return Array.from(metroMap.values()).sort((a, b) => a.name.localeCompare(b.name));
    }, [availableCities]);

    const citiesFilteredByMetro = useMemo(() => {
        if (!filters.metro) return availableCities;
        return availableCities.filter((c: PermitCityInfo) => c.metro_code === filters.metro);
    }, [availableCities, filters.metro]);

    const availableStates = useMemo(() => {
        const stateMap = new Map<string, string>();
        citiesFilteredByMetro.forEach((city: PermitCityInfo) => {
            if (city.state_code && !stateMap.has(city.state_code)) {
                stateMap.set(city.state_code, city.state_code);
            }
        });
        return Array.from(stateMap.keys()).sort();
    }, [citiesFilteredByMetro]);

    const filteredCities = useMemo(() => {
        if (!filters.state) return citiesFilteredByMetro;
        return citiesFilteredByMetro.filter((c: PermitCityInfo) => c.state_code === filters.state);
    }, [citiesFilteredByMetro, filters.state]);

    // Data sources cascade with state selection, same pattern the removed
    // county cascade used.
    const filteredDataSources = useMemo(() => {
        if (!filters.state) return availableDataSources;
        // "source" is formatted "City, ST" server-side — matches by suffix.
        return availableDataSources.filter((d: PermitDataSourceOption) => d.source.endsWith(`, ${filters.state}`));
    }, [availableDataSources, filters.state]);

    const selectedMetroName = useMemo(() => {
        if (!filters.metro) return null;
        const metro = availableMetros.find((m: { code: string; name: string }) => m.code === filters.metro);
        return metro?.name || filters.metro;
    }, [filters.metro, availableMetros]);

    const handleMetroChange = (metroCode: string | null) => {
        const updates: Partial<PermitFilters> = { metro: metroCode };
        if (metroCode) {
            const metroCities = availableCities.filter((c: PermitCityInfo) => c.metro_code === metroCode);
            const metroStates = new Set(metroCities.map((c: PermitCityInfo) => c.state_code));
            if (filters.state && !metroStates.has(filters.state)) {
                updates.state = null;
                updates.city = null;
            } else if (filters.city) {
                const cityStillValid = metroCities.some((c: PermitCityInfo) => c.key === filters.city);
                if (!cityStillValid) updates.city = null;
            }
        }
        onFilterChange(updates);
    };

    const handleStateChange = (stateCode: string | null) => {
        const updates: Partial<PermitFilters> = { state: stateCode };
        if (stateCode && filters.city) {
            const cityStillValid = citiesFilteredByMetro.some(
                (c: PermitCityInfo) => c.key === filters.city && c.state_code === stateCode
            );
            if (!cityStillValid) updates.city = null;
        }
        onFilterChange(updates);
    };

    const handleProjectClassChange = (value: string) => {
        onFilterChange({ projectClass: value || null, workScope: null });
    };

    const handleQualificationChange = (value: string) => {
        onFilterChange({ qualification: value || null, isExcluded: null });
    };

    const handleContractorChange = (value: string) => {
        onFilterChange({ hasContractor: value === '' ? null : value === 'true' });
    };

    // ── Active filter chips (single line, collapsible) ─────────────────────────

    const activeChips = useMemo(() => {
        const chips: { id: string; label: string; onRemove: () => void }[] = [];

        if (filters.qualification) {
            chips.push({
                id: 'qualification',
                label: QUALIFICATION_OPTIONS.find((o) => o.value === filters.qualification)?.label ?? filters.qualification,
                onRemove: () => onFilterChange({ qualification: null }),
            });
        }
        if (filters.hasContractor != null) {
            chips.push({
                id: 'contractor',
                label: filters.hasContractor ? 'Contractor Linked' : 'Verification Needed',
                onRemove: () => onFilterChange({ hasContractor: null }),
            });
        }
        const addedLabel = dateRangeLabel('Added', filters.addedStartDate, filters.addedEndDate);
        if (addedLabel) {
            chips.push({
                id: 'added-date',
                label: addedLabel,
                onRemove: () => onFilterChange({ addedStartDate: null, addedEndDate: null }),
            });
        }
        const permitLabel = dateRangeLabel('Permit', filters.startDate, filters.endDate);
        if (permitLabel) {
            chips.push({
                id: 'permit-date',
                label: permitLabel,
                onRemove: () => onFilterChange({ startDate: null, endDate: null }),
            });
        }
        if (filters.state) {
            chips.push({
                id: 'state',
                label: STATE_NAMES[filters.state] || filters.state,
                onRemove: () => handleStateChange(null),
            });
        }
        if (filters.agencyId) {
            const source = availableDataSources.find((d) => d.agency_id === filters.agencyId);
            chips.push({ id: 'data-source', label: source?.source ?? 'Data Source', onRemove: () => onFilterChange({ agencyId: null }) });
        }
        if (filters.city) {
            const cityInfo = filteredCities.find((c) => c.key === filters.city);
            chips.push({ id: 'city', label: cityInfo?.name || filters.city, onRemove: () => onFilterChange({ city: null }) });
        }
        if (filters.metro) {
            chips.push({
                id: 'metro',
                label: selectedMetroName?.split(',')[0] ?? filters.metro,
                onRemove: () => handleMetroChange(null),
            });
        }
        if (filters.projectClass) {
            chips.push({
                id: 'project-class',
                label: filters.projectClass,
                onRemove: () => onFilterChange({ projectClass: null, workScope: null }),
            });
        }
        if (filters.workScope) {
            chips.push({ id: 'work-scope', label: filters.workScope, onRemove: () => onFilterChange({ workScope: null }) });
        }
        if (filters.opportunityCategory) {
            chips.push({
                id: 'opportunity',
                label: filters.opportunityCategory,
                onRemove: () => onFilterChange({ opportunityCategory: null, issuedAgeBucket: null }),
            });
        }
        if (filters.issuedAgeBucket) {
            chips.push({
                id: 'issue-age',
                label: ISSUED_AGE_BUCKET_OPTIONS.find((o) => o.value === filters.issuedAgeBucket)?.label ?? filters.issuedAgeBucket,
                onRemove: () => onFilterChange({ issuedAgeBucket: null }),
            });
        }
        if (filters.minCost != null) {
            chips.push({
                id: 'min-cost',
                label: `Min $${filters.minCost.toLocaleString()}`,
                onRemove: () => onFilterChange({ minCost: null }),
            });
        }
        if (filters.maxCost != null) {
            chips.push({
                id: 'max-cost',
                label: `Max $${filters.maxCost.toLocaleString()}`,
                onRemove: () => onFilterChange({ maxCost: null }),
            });
        }
        if (filters.scoreBucket) {
            chips.push({
                id: 'score-bucket',
                label: SCORE_BUCKET_OPTIONS.find((o) => o.value === filters.scoreBucket)?.label ?? filters.scoreBucket,
                onRemove: () => onFilterChange({ scoreBucket: null }),
            });
        }
        if (filters.costSource) {
            chips.push({
                id: 'cost-source',
                label: COST_SOURCE_OPTIONS.find((o) => o.value === filters.costSource)?.label ?? filters.costSource,
                onRemove: () => onFilterChange({ costSource: null }),
            });
        }
        return chips;
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [filters, filteredCities, selectedMetroName]);

    const visibleChips = showAllChips ? activeChips : activeChips.slice(0, VISIBLE_CHIP_LIMIT);
    const hiddenCount = activeChips.length - visibleChips.length;

    // ── Render ─────────────────────────────────────────────────────────────────

    return (
        <div className="bg-white border border-[#DFE6EE] rounded-lg px-3 py-2.5 space-y-2" ref={toolbarRef}>
            {/* Compact toolbar — Search, Location, Qualification, Contractor, Date, More Filters, Clear */}
            <div className="flex items-center gap-2 flex-wrap">
                <div className="flex-[1_1_260px] max-w-[420px] min-w-[220px]">
                    <PermitSearch
                        value={searchValue}
                        onChange={onSearchChange}
                        onClear={onSearchClear}
                        placeholder="Search permit #, address, contractor, scope..."
                    />
                </div>

                {/* Location */}
                <div className="relative">
                    <FilterTrigger
                        label="Location"
                        icon={<MapPin size={13} />}
                        isOpen={openPopover === 'location'}
                        hasValue={hasLocationActive}
                        onClick={() => togglePopover('location')}
                    />
                    {openPopover === 'location' && (
                        <PopoverPanel title="Location" width="w-72" onClose={() => setOpenPopover(null)}>
                            <div className="space-y-2">
                                <div>
                                    <label className={LABEL_CLS}>State</label>
                                    <select
                                        value={filters.state || ''}
                                        onChange={(e) => handleStateChange(e.target.value || null)}
                                        className={SELECT_CLS}
                                    >
                                        <option value="">All States</option>
                                        {availableStates.map((st: string) => (
                                            <option key={st} value={st}>
                                                {STATE_NAMES[st] ? `${STATE_NAMES[st]} (${st})` : st}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    {/* Data Source replaces County (Phase 9 Chunk 1 — County removed
                                        from the MVP filter set; label/value shows the human-readable
                                        source name, filters by the stable agency_id). */}
                                    <label className={LABEL_CLS}>Data Source</label>
                                    <select
                                        value={filters.agencyId || ''}
                                        onChange={(e) => onFilterChange({ agencyId: e.target.value || null })}
                                        className={SELECT_CLS}
                                    >
                                        <option value="">All Data Sources</option>
                                        {filteredDataSources.map((d) => (
                                            <option key={d.agency_id} value={d.agency_id}>
                                                {d.source}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className={LABEL_CLS}>City</label>
                                    <select
                                        value={filters.city || ''}
                                        onChange={(e) => onFilterChange({ city: e.target.value || null })}
                                        className={SELECT_CLS}
                                    >
                                        <option value="">All Cities</option>
                                        {filteredCities.map((city) => (
                                            <option key={city.key} value={city.key}>
                                                {city.name}, {city.state_code}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                        </PopoverPanel>
                    )}
                </div>

                {/* Qualification */}
                <div className="relative">
                    <FilterTrigger
                        label="Qualification"
                        icon={<Gauge size={13} />}
                        isOpen={openPopover === 'qualification'}
                        hasValue={Boolean(filters.qualification)}
                        onClick={() => togglePopover('qualification')}
                    />
                    {openPopover === 'qualification' && (
                        <PopoverPanel title="Qualification" width="w-56" onClose={() => setOpenPopover(null)}>
                            <OptionList
                                options={QUALIFICATION_OPTIONS}
                                value={filters.qualification || ''}
                                onSelect={(v) => { handleQualificationChange(v); setOpenPopover(null); }}
                            />
                        </PopoverPanel>
                    )}
                </div>

                {/* Contractor */}
                <div className="relative">
                    <FilterTrigger
                        label="Contractor"
                        icon={<UserCheck size={13} />}
                        isOpen={openPopover === 'contractor'}
                        hasValue={filters.hasContractor != null}
                        onClick={() => togglePopover('contractor')}
                    />
                    {openPopover === 'contractor' && (
                        <PopoverPanel title="Contractor" width="w-56" onClose={() => setOpenPopover(null)}>
                            <OptionList
                                options={CONTRACTOR_OPTIONS}
                                value={filters.hasContractor === null ? '' : String(filters.hasContractor)}
                                onSelect={(v) => { handleContractorChange(v); setOpenPopover(null); }}
                            />
                        </PopoverPanel>
                    )}
                </div>

                {/* Date — Added Date vs Permit Date, switchable without losing either range */}
                <div className="relative">
                    <FilterTrigger
                        label="Date"
                        icon={<Calendar size={13} />}
                        isOpen={openPopover === 'date'}
                        hasValue={hasDateActive}
                        onClick={() => togglePopover('date')}
                    />
                    {openPopover === 'date' && (
                        <PopoverPanel title="Date" width="w-72" onClose={() => setOpenPopover(null)}>
                            <div className="flex items-center gap-1 p-0.5 bg-[#F7F9FB] rounded-md">
                                <button
                                    type="button"
                                    onClick={() => setDateType('added')}
                                    className={`relative flex-1 px-2 py-1 rounded text-xs font-medium transition-colors ${
                                        dateType === 'added' ? 'bg-white text-[#00458B] shadow-sm' : 'text-[#5B6B7D] hover:text-[#0E2B5C]'
                                    }`}
                                >
                                    Added Date
                                    {(filters.addedStartDate || filters.addedEndDate) && (
                                        <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full" style={{ backgroundColor: PRIMARY }} aria-hidden />
                                    )}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setDateType('permit')}
                                    className={`relative flex-1 px-2 py-1 rounded text-xs font-medium transition-colors ${
                                        dateType === 'permit' ? 'bg-white text-[#00458B] shadow-sm' : 'text-[#5B6B7D] hover:text-[#0E2B5C]'
                                    }`}
                                >
                                    Permit Date
                                    {(filters.startDate || filters.endDate) && (
                                        <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full" style={{ backgroundColor: PRIMARY }} aria-hidden />
                                    )}
                                </button>
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                                <div>
                                    <span className={DATE_MINI_LABEL_CLS}>From</span>
                                    <input
                                        // Remounts on tab switch — native date inputs can retain stale
                                        // uncommitted segment text across a bare value-prop change, which
                                        // would visually (not logically) look like the two ranges mixed.
                                        key={`from-${dateType}`}
                                        type="date"
                                        value={(dateType === 'added' ? filters.addedStartDate : filters.startDate) || ''}
                                        onChange={(e) => onFilterChange(
                                            dateType === 'added'
                                                ? { addedStartDate: e.target.value || null }
                                                : { startDate: e.target.value || null }
                                        )}
                                        aria-label={`${dateType === 'added' ? 'Added' : 'Permit'} date from`}
                                        className={DATE_INPUT_CLS}
                                    />
                                </div>
                                <div>
                                    <span className={DATE_MINI_LABEL_CLS}>To</span>
                                    <input
                                        key={`to-${dateType}`}
                                        type="date"
                                        value={(dateType === 'added' ? filters.addedEndDate : filters.endDate) || ''}
                                        onChange={(e) => onFilterChange(
                                            dateType === 'added'
                                                ? { addedEndDate: e.target.value || null }
                                                : { endDate: e.target.value || null }
                                        )}
                                        aria-label={`${dateType === 'added' ? 'Added' : 'Permit'} date to`}
                                        className={DATE_INPUT_CLS}
                                    />
                                </div>
                            </div>
                            <p className="text-[10px] text-[#5B6B7D] leading-snug">
                                Added Date is when Estimation Hub ingested the permit. Permit Date is the jurisdiction&apos;s
                                issue/application date. Switching tabs does not clear the other range.
                            </p>
                        </PopoverPanel>
                    )}
                </div>

                {/* More Filters — Project Type, Work Scope, Value, Metro, Opportunity, Issue Age, Cost Source, Score Bucket */}
                <div className="relative">
                    <FilterTrigger
                        label="More Filters"
                        icon={<Filter size={13} />}
                        isOpen={openPopover === 'more'}
                        hasValue={hasMoreActive}
                        onClick={() => togglePopover('more')}
                    />
                    {openPopover === 'more' && (
                        <PopoverPanel title="More Filters" align="right" width="w-[520px]" onClose={() => setOpenPopover(null)}>
                            <div className="grid grid-cols-2 gap-3">
                                {/* Project Type */}
                                <div className="space-y-1">
                                    <label className={LABEL_CLS}>
                                        <Briefcase size={12} />
                                        Project Type
                                    </label>
                                    <select
                                        value={filters.projectClass || ''}
                                        onChange={(e) => handleProjectClassChange(e.target.value)}
                                        className={SELECT_CLS}
                                    >
                                        {PROJECT_CLASS_OPTIONS.map((opt) => (
                                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                                        ))}
                                    </select>
                                </div>

                                {/* Work Scope — conditional on Project Type */}
                                <div className="space-y-1">
                                    <label className={`${LABEL_CLS} ${!filters.projectClass ? 'opacity-50' : ''}`}>
                                        <Layers size={12} />
                                        Work Scope
                                    </label>
                                    <select
                                        value={filters.workScope || ''}
                                        onChange={(e) => onFilterChange({ workScope: e.target.value || null })}
                                        disabled={!filters.projectClass}
                                        title={!filters.projectClass ? 'Select a Project Type to filter by work scope' : undefined}
                                        className={SELECT_CLS}
                                    >
                                        <option value="">All Scopes</option>
                                        {WORK_SCOPE_OPTIONS.map((opt) => (
                                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                                        ))}
                                    </select>
                                </div>

                                {/* Value */}
                                <div className="space-y-1">
                                    <label className={LABEL_CLS}>
                                        <DollarSign size={12} />
                                        Value
                                    </label>
                                    <div className="flex items-center gap-1.5">
                                        <input
                                            type="number"
                                            value={filters.minCost ?? ''}
                                            onChange={(e) => onFilterChange({ minCost: e.target.value !== '' ? Number(e.target.value) : null })}
                                            placeholder="Min"
                                            min={0}
                                            className={SELECT_CLS}
                                        />
                                        <input
                                            type="number"
                                            value={filters.maxCost ?? ''}
                                            onChange={(e) => onFilterChange({ maxCost: e.target.value !== '' ? Number(e.target.value) : null })}
                                            placeholder="Max"
                                            min={0}
                                            className={SELECT_CLS}
                                        />
                                    </div>
                                </div>

                                {/* Metro Area */}
                                <div className="space-y-1">
                                    <label className={LABEL_CLS}>
                                        <Globe size={12} />
                                        Metro Area
                                    </label>
                                    <select
                                        value={filters.metro || ''}
                                        onChange={(e) => handleMetroChange(e.target.value || null)}
                                        className={SELECT_CLS}
                                    >
                                        <option value="">All Metros</option>
                                        {availableMetros.map((metro: { code: string; name: string; cityCount: number }) => (
                                            <option key={metro.code} value={metro.code}>
                                                {metro.name.split(',')[0]} ({metro.cityCount})
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                {/* Opportunity Category */}
                                <div className="space-y-1">
                                    <label className={LABEL_CLS}>
                                        <Target size={12} />
                                        Opportunity
                                    </label>
                                    <select
                                        value={filters.opportunityCategory || ''}
                                        onChange={(e) => handleOpportunityCategoryChange(e.target.value)}
                                        className={SELECT_CLS}
                                    >
                                        <option value="">All Opportunities</option>
                                        {OPPORTUNITY_CATEGORIES.map((cat) => (
                                            <option key={cat} value={cat}>{cat}</option>
                                        ))}
                                    </select>
                                </div>

                                {/* Issue Age — only meaningful for Fresh Leads */}
                                <div className="space-y-1">
                                    <label className={`${LABEL_CLS} ${filters.opportunityCategory !== 'Fresh Leads' ? 'opacity-50' : ''}`}>
                                        <Target size={12} />
                                        Issue Age
                                    </label>
                                    <select
                                        value={filters.issuedAgeBucket || ''}
                                        onChange={(e) => onFilterChange({ issuedAgeBucket: e.target.value || null })}
                                        disabled={filters.opportunityCategory !== 'Fresh Leads'}
                                        title={filters.opportunityCategory !== 'Fresh Leads' ? 'Select "Fresh Leads" to filter by issue age' : undefined}
                                        className={SELECT_CLS}
                                    >
                                        {ISSUED_AGE_BUCKET_OPTIONS.map((opt) => (
                                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                                        ))}
                                    </select>
                                </div>

                                {/* Cost Source */}
                                <div className="space-y-1">
                                    <label className={LABEL_CLS}>
                                        <DollarSign size={12} />
                                        Cost Source
                                    </label>
                                    <select
                                        value={filters.costSource || ''}
                                        onChange={(e) => onFilterChange({ costSource: e.target.value || null })}
                                        className={SELECT_CLS}
                                    >
                                        {COST_SOURCE_OPTIONS.map((opt) => (
                                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                                        ))}
                                    </select>
                                </div>

                                {/* Score Bucket */}
                                <div className="space-y-1">
                                    <label className={LABEL_CLS}>
                                        <LandPlot size={12} />
                                        Score Bucket
                                    </label>
                                    <select
                                        value={filters.scoreBucket || ''}
                                        onChange={(e) => onFilterChange({ scoreBucket: e.target.value || null })}
                                        className={SELECT_CLS}
                                    >
                                        {SCORE_BUCKET_OPTIONS.map((opt) => (
                                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                        </PopoverPanel>
                    )}
                </div>

                {/* Clear — small text button, only shown when a filter is active */}
                {hasActiveFilters && (
                    <button
                        type="button"
                        onClick={onReset}
                        className="text-xs whitespace-nowrap text-[#5B6B7D] hover:text-[#00458B] hover:underline underline-offset-2 transition-colors ml-auto"
                    >
                        Clear
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
