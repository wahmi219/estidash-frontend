'use client';

import React, { useMemo, useState } from 'react';
import {
    Filter, X, RefreshCw, MapPin, Building2, Briefcase, Layers, Target,
    DollarSign, Calendar, LandPlot, Gauge, Globe, UserCheck, ChevronDown, ChevronUp,
} from 'lucide-react';
import { PermitFilters, PermitCityInfo, PermitCounty } from '@/types';
import {
    OPPORTUNITY_CATEGORIES,
    ISSUED_AGE_BUCKET_OPTIONS,
    PROJECT_CLASS_OPTIONS,
    WORK_SCOPE_OPTIONS,
} from '@/lib/opportunityMapping';

interface PermitFiltersProps {
    filters: PermitFilters;
    availableCities: PermitCityInfo[];
    availableCounties: PermitCounty[];
    onFilterChange: (filters: Partial<PermitFilters>) => void;
    onReset: () => void;
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

const LABEL_CLS = 'text-xs text-[#5B6B7D] font-medium flex items-center gap-1';

const BADGE_CLS =
    'inline-flex items-center gap-1 px-2 py-0.5 bg-[#F7F9FB] text-[#00458B] text-xs rounded-full border border-[#DFE6EE]';

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

export default function PermitFiltersPanel({
    filters,
    availableCities,
    availableCounties,
    onFilterChange,
    onReset,
}: PermitFiltersProps) {
    // "More Filters" starts expanded if any of the secondary filters it holds are
    // already active — otherwise a user landing on a filtered URL wouldn't see why.
    const [showMore, setShowMore] = useState(() => Boolean(
        filters.workScope || filters.metro || filters.opportunityCategory ||
        filters.issuedAgeBucket || filters.costSource || filters.scoreBucket
    ));

    const hasMoreActive = Boolean(
        filters.workScope || filters.metro || filters.opportunityCategory ||
        filters.issuedAgeBucket || filters.costSource || filters.scoreBucket
    );

    const hasActiveFilters = Boolean(
        filters.city ||
        filters.state ||
        filters.metro ||
        filters.county ||
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

    // Counties cascade with state selection
    const filteredCounties = useMemo(() => {
        if (!filters.state) return availableCounties;
        return availableCounties.filter((c: PermitCounty) => c.state_code === filters.state);
    }, [availableCounties, filters.state]);

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

    // ── Render ─────────────────────────────────────────────────────────────────

    return (
        <div className="bg-white border border-[#DFE6EE] rounded-lg p-4 space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2" style={{ color: NAVY }}>
                    <Filter size={16} />
                    <span className="font-medium text-sm">Filters</span>
                </div>
            </div>

            {/* Row 1 — Added Date, Permit Date, Location, Project Type, Qualification */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                {/* Added Date */}
                <div className="space-y-1">
                    <label className={LABEL_CLS}>
                        <Calendar size={12} />
                        Added Date
                    </label>
                    <div className="flex items-center gap-1.5">
                        <input
                            type="date"
                            value={filters.addedStartDate || ''}
                            onChange={(e) => onFilterChange({ addedStartDate: e.target.value || null })}
                            title="Added from"
                            className={SELECT_CLS}
                        />
                        <input
                            type="date"
                            value={filters.addedEndDate || ''}
                            onChange={(e) => onFilterChange({ addedEndDate: e.target.value || null })}
                            title="Added to"
                            className={SELECT_CLS}
                        />
                    </div>
                </div>

                {/* Permit Date (jurisdiction issue/application date) */}
                <div className="space-y-1">
                    <label className={LABEL_CLS}>
                        <Calendar size={12} />
                        Permit Date
                    </label>
                    <div className="flex items-center gap-1.5">
                        <input
                            type="date"
                            value={filters.startDate || ''}
                            onChange={(e) => onFilterChange({ startDate: e.target.value || null })}
                            title="Permit date from"
                            className={SELECT_CLS}
                        />
                        <input
                            type="date"
                            value={filters.endDate || ''}
                            onChange={(e) => onFilterChange({ endDate: e.target.value || null })}
                            title="Permit date to"
                            className={SELECT_CLS}
                        />
                    </div>
                </div>

                {/* Location — State / County / City */}
                <div className="space-y-1 lg:col-span-2">
                    <label className={LABEL_CLS}>
                        <MapPin size={12} />
                        Location
                    </label>
                    <div className="flex items-center gap-1.5">
                        <select
                            value={filters.state || ''}
                            onChange={(e) => handleStateChange(e.target.value || null)}
                            className={SELECT_CLS}
                            title="State"
                        >
                            <option value="">All States</option>
                            {availableStates.map((st: string) => (
                                <option key={st} value={st}>
                                    {STATE_NAMES[st] ? `${STATE_NAMES[st]} (${st})` : st}
                                </option>
                            ))}
                        </select>
                        <select
                            value={filters.county || ''}
                            onChange={(e) => onFilterChange({ county: e.target.value || null })}
                            className={SELECT_CLS}
                            title="County"
                        >
                            <option value="">All Counties</option>
                            {filteredCounties.map((c) => (
                                <option key={`${c.county_name}-${c.state_code}`} value={c.county_name}>
                                    {c.county_name}, {c.state_code}
                                </option>
                            ))}
                        </select>
                        <select
                            value={filters.city || ''}
                            onChange={(e) => onFilterChange({ city: e.target.value || null })}
                            className={SELECT_CLS}
                            title="City"
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
            </div>

            {/* Row 2 — Qualification, Contractor, Value, More Filters, Clear */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 items-end">
                {/* Qualification — business state, distinct from score bucket */}
                <div className="space-y-1">
                    <label className={LABEL_CLS}>
                        <Gauge size={12} />
                        Qualification
                    </label>
                    <select
                        value={filters.qualification || ''}
                        onChange={(e) => handleQualificationChange(e.target.value)}
                        className={SELECT_CLS}
                    >
                        {QUALIFICATION_OPTIONS.map((opt) => (
                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                    </select>
                </div>

                {/* Contractor */}
                <div className="space-y-1">
                    <label className={LABEL_CLS}>
                        <UserCheck size={12} />
                        Contractor
                    </label>
                    <select
                        value={filters.hasContractor === null ? '' : String(filters.hasContractor)}
                        onChange={(e) => handleContractorChange(e.target.value)}
                        className={SELECT_CLS}
                    >
                        {CONTRACTOR_OPTIONS.map((opt) => (
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

                {/* More Filters toggle */}
                <button
                    type="button"
                    onClick={() => setShowMore((v) => !v)}
                    className="relative flex items-center justify-center gap-1.5 h-[34px] px-3 rounded-md border border-[#DFE6EE] text-sm font-medium text-[#0E2B5C] hover:bg-[#F7F9FB] transition-colors"
                >
                    <Filter size={14} />
                    More Filters
                    {showMore ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                    {hasMoreActive && (
                        <span
                            className="absolute -top-1 -right-1 w-2 h-2 rounded-full"
                            style={{ backgroundColor: PRIMARY }}
                            aria-hidden
                        />
                    )}
                </button>

                {/* Clear */}
                <button
                    type="button"
                    onClick={onReset}
                    disabled={!hasActiveFilters}
                    className="flex items-center justify-center gap-1.5 h-[34px] px-3 rounded-md border border-[#DFE6EE] text-sm font-medium text-[#5B6B7D] hover:text-[#00458B] hover:bg-[#F7F9FB] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                    <RefreshCw size={14} />
                    Clear
                </button>
            </div>

            {/* More Filters — Work Scope, Metro Area, Opportunity Category, Issue Age, Cost Source, Score Bucket */}
            {showMore && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4 pt-2 border-t border-[#DFE6EE]">
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
            )}

            {/* Active filter badges */}
            {hasActiveFilters && (
                <div className="flex items-center gap-2 flex-wrap pt-1 border-t border-[#DFE6EE]">
                    <span className="text-xs" style={{ color: MUTED }}>Active:</span>

                    {filters.qualification && (
                        <span className={BADGE_CLS}>
                            <Gauge size={10} />
                            {QUALIFICATION_OPTIONS.find((o) => o.value === filters.qualification)?.label ?? filters.qualification}
                            <button onClick={() => onFilterChange({ qualification: null })} className="hover:text-[#045CB4]"><X size={10} /></button>
                        </span>
                    )}
                    {filters.hasContractor != null && (
                        <span className={BADGE_CLS}>
                            <UserCheck size={10} />
                            {filters.hasContractor ? 'Contractor Linked' : 'Verification Needed'}
                            <button onClick={() => onFilterChange({ hasContractor: null })} className="hover:text-[#045CB4]"><X size={10} /></button>
                        </span>
                    )}
                    {filters.addedStartDate && (
                        <span className={BADGE_CLS}>
                            <Calendar size={10} />
                            Added from: {filters.addedStartDate}
                            <button onClick={() => onFilterChange({ addedStartDate: null })} className="hover:text-[#045CB4]"><X size={10} /></button>
                        </span>
                    )}
                    {filters.addedEndDate && (
                        <span className={BADGE_CLS}>
                            <Calendar size={10} />
                            Added to: {filters.addedEndDate}
                            <button onClick={() => onFilterChange({ addedEndDate: null })} className="hover:text-[#045CB4]"><X size={10} /></button>
                        </span>
                    )}
                    {filters.metro && (
                        <span className={BADGE_CLS}>
                            <Globe size={10} />
                            {selectedMetroName?.split(',')[0]}
                            <button onClick={() => handleMetroChange(null)} className="hover:text-[#045CB4]"><X size={10} /></button>
                        </span>
                    )}
                    {filters.state && (
                        <span className={BADGE_CLS}>
                            <MapPin size={10} />
                            {STATE_NAMES[filters.state] ? `${STATE_NAMES[filters.state]} (${filters.state})` : filters.state}
                            <button onClick={() => handleStateChange(null)} className="hover:text-[#045CB4]"><X size={10} /></button>
                        </span>
                    )}
                    {filters.county && (
                        <span className={BADGE_CLS}>
                            <LandPlot size={10} />
                            {filters.county}
                            <button onClick={() => onFilterChange({ county: null })} className="hover:text-[#045CB4]"><X size={10} /></button>
                        </span>
                    )}
                    {filters.city && (
                        <span className={BADGE_CLS}>
                            <Building2 size={10} />
                            {filters.city}
                            <button onClick={() => onFilterChange({ city: null })} className="hover:text-[#045CB4]"><X size={10} /></button>
                        </span>
                    )}
                    {filters.projectClass && (
                        <span className={BADGE_CLS}>
                            <Briefcase size={10} />
                            {filters.projectClass}
                            <button onClick={() => onFilterChange({ projectClass: null, workScope: null })} className="hover:text-[#045CB4]"><X size={10} /></button>
                        </span>
                    )}
                    {filters.workScope && (
                        <span className={BADGE_CLS}>
                            <Layers size={10} />
                            {filters.workScope}
                            <button onClick={() => onFilterChange({ workScope: null })} className="hover:text-[#045CB4]"><X size={10} /></button>
                        </span>
                    )}
                    {filters.opportunityCategory && (
                        <span className={BADGE_CLS}>
                            <Target size={10} />
                            {filters.opportunityCategory}
                            <button onClick={() => onFilterChange({ opportunityCategory: null, issuedAgeBucket: null })} className="hover:text-[#045CB4]"><X size={10} /></button>
                        </span>
                    )}
                    {filters.issuedAgeBucket && (
                        <span className={BADGE_CLS}>
                            <Target size={10} />
                            {ISSUED_AGE_BUCKET_OPTIONS.find((o) => o.value === filters.issuedAgeBucket)?.label ?? filters.issuedAgeBucket}
                            <button onClick={() => onFilterChange({ issuedAgeBucket: null })} className="hover:text-[#045CB4]"><X size={10} /></button>
                        </span>
                    )}
                    {filters.startDate && (
                        <span className={BADGE_CLS}>
                            <Calendar size={10} />
                            Permit from: {filters.startDate}
                            <button onClick={() => onFilterChange({ startDate: null })} className="hover:text-[#045CB4]"><X size={10} /></button>
                        </span>
                    )}
                    {filters.endDate && (
                        <span className={BADGE_CLS}>
                            <Calendar size={10} />
                            Permit to: {filters.endDate}
                            <button onClick={() => onFilterChange({ endDate: null })} className="hover:text-[#045CB4]"><X size={10} /></button>
                        </span>
                    )}
                    {filters.minCost != null && (
                        <span className={BADGE_CLS}>
                            <DollarSign size={10} />
                            Min: ${filters.minCost.toLocaleString()}
                            <button onClick={() => onFilterChange({ minCost: null })} className="hover:text-[#045CB4]"><X size={10} /></button>
                        </span>
                    )}
                    {filters.maxCost != null && (
                        <span className={BADGE_CLS}>
                            <DollarSign size={10} />
                            Max: ${filters.maxCost.toLocaleString()}
                            <button onClick={() => onFilterChange({ maxCost: null })} className="hover:text-[#045CB4]"><X size={10} /></button>
                        </span>
                    )}
                    {filters.scoreBucket && (
                        <span className={BADGE_CLS}>
                            <Gauge size={10} />
                            {SCORE_BUCKET_OPTIONS.find((o) => o.value === filters.scoreBucket)?.label ?? filters.scoreBucket}
                            <button onClick={() => onFilterChange({ scoreBucket: null })} className="hover:text-[#045CB4]"><X size={10} /></button>
                        </span>
                    )}
                    {filters.costSource && (
                        <span className={BADGE_CLS}>
                            <DollarSign size={10} />
                            {COST_SOURCE_OPTIONS.find((o) => o.value === filters.costSource)?.label ?? filters.costSource}
                            <button onClick={() => onFilterChange({ costSource: null })} className="hover:text-[#045CB4]"><X size={10} /></button>
                        </span>
                    )}
                </div>
            )}
        </div>
    );
}
