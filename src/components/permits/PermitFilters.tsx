'use client';

import React, { useMemo } from 'react';
import { Filter, X, RefreshCw, MapPin, Building2, Globe, Briefcase, Layers, Target, DollarSign, Calendar, LandPlot, Gauge } from 'lucide-react';
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

// Color config per opportunity category
const OPPORTUNITY_COLORS: Record<string, { dot: string; text: string; badge: string }> = {
    'Fresh Leads':          { dot: 'bg-cyan-400',   text: 'text-cyan-400',   badge: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20' },
    'Scope Change':         { dot: 'bg-orange-400', text: 'text-orange-400', badge: 'bg-orange-500/10 text-orange-400 border-orange-500/20' },
    'Introduction / Track': { dot: 'bg-blue-400',   text: 'text-blue-400',   badge: 'bg-blue-500/10 text-blue-400 border-blue-500/20' },
    'Late / Execution':     { dot: 'bg-yellow-400', text: 'text-yellow-400', badge: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20' },
    'Dead':                 { dot: 'bg-gray-500',   text: 'text-gray-400',   badge: 'bg-gray-500/10 text-gray-400 border-gray-500/20' },
};

const SELECT_CLS =
    'w-full px-3 py-2 bg-white dark:bg-white/3 border border-gray-300 dark:border-white/8 rounded-lg text-gray-900 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-cyan-500/40 transition-colors text-sm';

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

export default function PermitFiltersPanel({
    filters,
    availableCities,
    availableCounties,
    onFilterChange,
    onReset,
}: PermitFiltersProps) {
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
        filters.minCost != null ||
        filters.maxCost != null ||
        filters.scoreBucket ||
        filters.costSource
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

    // ── Render ─────────────────────────────────────────────────────────────────

    return (
        <div className="bg-gray-50 dark:bg-white/2 border border-gray-200 dark:border-white/6 rounded-xl p-4 space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-gray-800 dark:text-gray-200">
                    <Filter size={16} />
                    <span className="font-medium text-sm">Filters</span>
                </div>
                {hasActiveFilters && (
                    <button
                        onClick={onReset}
                        className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 transition-colors"
                    >
                        <RefreshCw size={12} />
                        Reset
                    </button>
                )}
            </div>

            {/* Row 1 — Location + Opportunities + Age Bucket + Project Class + Work Scope */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-8 gap-4">

                {/* Metro Area */}
                <div className="space-y-1">
                    <label className="text-xs text-gray-600 dark:text-gray-400 font-medium flex items-center gap-1">
                        <Globe size={12} />
                        Metro Area
                    </label>
                    <select
                        value={filters.metro || ''}
                        onChange={(e) => handleMetroChange(e.target.value || null)}
                        className={SELECT_CLS.replace('cyan-500/40', 'purple-500/40')}
                    >
                        <option value="">All Metros</option>
                        {availableMetros.map((metro: { code: string; name: string; cityCount: number }) => (
                            <option key={metro.code} value={metro.code}>
                                {metro.name.split(',')[0]} ({metro.cityCount})
                            </option>
                        ))}
                    </select>
                </div>

                {/* State */}
                <div className="space-y-1">
                    <label className="text-xs text-gray-600 dark:text-gray-400 font-medium flex items-center gap-1">
                        <MapPin size={12} />
                        State
                    </label>
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

                {/* County */}
                <div className="space-y-1">
                    <label className="text-xs text-gray-600 dark:text-gray-400 font-medium flex items-center gap-1">
                        <LandPlot size={12} />
                        County
                    </label>
                    <select
                        value={filters.county || ''}
                        onChange={(e) => onFilterChange({ county: e.target.value || null })}
                        className={SELECT_CLS}
                    >
                        <option value="">All Counties</option>
                        {filteredCounties.map((c) => (
                            <option key={`${c.county_name}-${c.state_code}`} value={c.county_name}>
                                {c.county_name}, {c.state_code}
                            </option>
                        ))}
                    </select>
                </div>

                {/* City */}
                <div className="space-y-1">
                    <label className="text-xs text-gray-600 dark:text-gray-400 font-medium flex items-center gap-1">
                        <Building2 size={12} />
                        City
                    </label>
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

                {/* Opportunities */}
                <div className="space-y-1">
                    <label className="text-xs text-gray-600 dark:text-gray-400 font-medium flex items-center gap-1">
                        <Target size={12} />
                        Opportunities
                    </label>
                    <div className="relative">
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
                        {/* Colored indicator dot when active */}
                        {filters.opportunityCategory && (
                            <span
                                className={`absolute right-7 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full ${OPPORTUNITY_COLORS[filters.opportunityCategory]?.dot ?? 'bg-cyan-400'}`}
                            />
                        )}
                    </div>
                </div>

                {/* Issued Age Bucket — only meaningful for Fresh Leads */}
                <div className="space-y-1">
                    <label className={`text-xs font-medium flex items-center gap-1 transition-colors ${filters.opportunityCategory === 'Fresh Leads' ? 'text-gray-600 dark:text-gray-400' : 'text-gray-400 dark:text-gray-600'}`}>
                        <Target size={12} />
                        Issue Age
                    </label>
                    <select
                        value={filters.issuedAgeBucket || ''}
                        onChange={(e) => onFilterChange({ issuedAgeBucket: e.target.value || null })}
                        disabled={filters.opportunityCategory !== 'Fresh Leads'}
                        title={filters.opportunityCategory !== 'Fresh Leads' ? 'Select "Fresh Leads" to filter by issue age' : undefined}
                        className={`${SELECT_CLS} disabled:opacity-40 disabled:cursor-not-allowed`}
                    >
                        {ISSUED_AGE_BUCKET_OPTIONS.map((opt) => (
                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                    </select>
                </div>

                {/* Project Class */}
                <div className="space-y-1">
                    <label className="text-xs text-gray-600 dark:text-gray-400 font-medium flex items-center gap-1">
                        <Briefcase size={12} />
                        Project Class
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

                {/* Work Scope — conditional on Project Class */}
                <div className="space-y-1">
                    <label className={`text-xs font-medium flex items-center gap-1 transition-colors ${filters.projectClass ? 'text-gray-600 dark:text-gray-400' : 'text-gray-400 dark:text-gray-600'}`}>
                        <Layers size={12} />
                        Work Scope
                    </label>
                    <select
                        value={filters.workScope || ''}
                        onChange={(e) => onFilterChange({ workScope: e.target.value || null })}
                        disabled={!filters.projectClass}
                        className={`${SELECT_CLS} disabled:opacity-40 disabled:cursor-not-allowed`}
                    >
                        <option value="">All Scopes</option>
                        {WORK_SCOPE_OPTIONS.map((opt) => (
                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                    </select>
                </div>
            </div>

            {/* Row 2 — Score + Dates and Cost */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                {/* Score Bucket */}
                <div className="space-y-1">
                    <label className="text-xs text-gray-600 dark:text-gray-400 font-medium flex items-center gap-1">
                        <Gauge size={12} />
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

                {/* Cost Source */}
                <div className="space-y-1">
                    <label className="text-xs text-gray-600 dark:text-gray-400 font-medium flex items-center gap-1">
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

                <div className="space-y-1">
                    <label className="text-xs text-gray-600 dark:text-gray-400 font-medium flex items-center gap-1">
                        <Calendar size={12} />
                        From Date
                    </label>
                    <input
                        type="date"
                        value={filters.startDate || ''}
                        onChange={(e) => onFilterChange({ startDate: e.target.value || null })}
                        className={SELECT_CLS}
                    />
                </div>
                <div className="space-y-1">
                    <label className="text-xs text-gray-600 dark:text-gray-400 font-medium flex items-center gap-1">
                        <Calendar size={12} />
                        To Date
                    </label>
                    <input
                        type="date"
                        value={filters.endDate || ''}
                        onChange={(e) => onFilterChange({ endDate: e.target.value || null })}
                        className={SELECT_CLS}
                    />
                </div>
                <div className="space-y-1">
                    <label className="text-xs text-gray-600 dark:text-gray-400 font-medium flex items-center gap-1">
                        <DollarSign size={12} />
                        Min Cost
                    </label>
                    <input
                        type="number"
                        value={filters.minCost ?? ''}
                        onChange={(e) => onFilterChange({ minCost: e.target.value !== '' ? Number(e.target.value) : null })}
                        placeholder="0"
                        min={0}
                        className={SELECT_CLS}
                    />
                </div>
                <div className="space-y-1">
                    <label className="text-xs text-gray-600 dark:text-gray-400 font-medium flex items-center gap-1">
                        <DollarSign size={12} />
                        Max Cost
                    </label>
                    <input
                        type="number"
                        value={filters.maxCost ?? ''}
                        onChange={(e) => onFilterChange({ maxCost: e.target.value !== '' ? Number(e.target.value) : null })}
                        placeholder="∞"
                        min={0}
                        className={SELECT_CLS}
                    />
                </div>
            </div>

            {/* Active filter badges */}
            {hasActiveFilters && (
                <div className="flex items-center gap-2 flex-wrap pt-1">
                    <span className="text-xs text-gray-500 dark:text-gray-500">Active:</span>

                    {filters.metro && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-purple-500/10 text-purple-400 text-xs rounded-full border border-purple-500/20">
                            <Globe size={10} />
                            {selectedMetroName?.split(',')[0]}
                            <button onClick={() => handleMetroChange(null)} className="hover:text-purple-300"><X size={10} /></button>
                        </span>
                    )}
                    {filters.state && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-cyan-500/10 text-cyan-400 text-xs rounded-full border border-cyan-500/20">
                            <MapPin size={10} />
                            {STATE_NAMES[filters.state] ? `${STATE_NAMES[filters.state]} (${filters.state})` : filters.state}
                            <button onClick={() => handleStateChange(null)} className="hover:text-cyan-300"><X size={10} /></button>
                        </span>
                    )}
                    {filters.county && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-500/10 text-emerald-400 text-xs rounded-full border border-emerald-500/20">
                            <LandPlot size={10} />
                            {filters.county}
                            <button onClick={() => onFilterChange({ county: null })} className="hover:text-emerald-300"><X size={10} /></button>
                        </span>
                    )}
                    {filters.city && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-500/10 text-blue-400 text-xs rounded-full border border-blue-500/20">
                            <Building2 size={10} />
                            {filters.city}
                            <button onClick={() => onFilterChange({ city: null })} className="hover:text-blue-300"><X size={10} /></button>
                        </span>
                    )}
                    {filters.opportunityCategory && (
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs rounded-full border ${OPPORTUNITY_COLORS[filters.opportunityCategory]?.badge ?? 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20'}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${OPPORTUNITY_COLORS[filters.opportunityCategory]?.dot ?? 'bg-cyan-400'}`} />
                            {filters.opportunityCategory}
                            <button onClick={() => onFilterChange({ opportunityCategory: null, issuedAgeBucket: null })} className="hover:opacity-70"><X size={10} /></button>
                        </span>
                    )}
                    {filters.issuedAgeBucket && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-cyan-500/10 text-cyan-400 text-xs rounded-full border border-cyan-500/20">
                            <Target size={10} />
                            {ISSUED_AGE_BUCKET_OPTIONS.find((o) => o.value === filters.issuedAgeBucket)?.label ?? filters.issuedAgeBucket}
                            <button onClick={() => onFilterChange({ issuedAgeBucket: null })} className="hover:text-cyan-300"><X size={10} /></button>
                        </span>
                    )}
                    {filters.projectClass && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-500/10 text-amber-400 text-xs rounded-full border border-amber-500/20">
                            <Briefcase size={10} />
                            {filters.projectClass}
                            <button onClick={() => onFilterChange({ projectClass: null, workScope: null })} className="hover:text-amber-300"><X size={10} /></button>
                        </span>
                    )}
                    {filters.workScope && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-violet-500/10 text-violet-400 text-xs rounded-full border border-violet-500/20">
                            <Layers size={10} />
                            {filters.workScope}
                            <button onClick={() => onFilterChange({ workScope: null })} className="hover:text-violet-300"><X size={10} /></button>
                        </span>
                    )}
                    {filters.startDate && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-teal-500/10 text-teal-400 text-xs rounded-full border border-teal-500/20">
                            <Calendar size={10} />
                            From: {filters.startDate}
                            <button onClick={() => onFilterChange({ startDate: null })} className="hover:text-teal-300"><X size={10} /></button>
                        </span>
                    )}
                    {filters.endDate && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-teal-500/10 text-teal-400 text-xs rounded-full border border-teal-500/20">
                            <Calendar size={10} />
                            To: {filters.endDate}
                            <button onClick={() => onFilterChange({ endDate: null })} className="hover:text-teal-300"><X size={10} /></button>
                        </span>
                    )}
                    {filters.minCost != null && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-500/10 text-green-400 text-xs rounded-full border border-green-500/20">
                            <DollarSign size={10} />
                            Min: ${filters.minCost.toLocaleString()}
                            <button onClick={() => onFilterChange({ minCost: null })} className="hover:text-green-300"><X size={10} /></button>
                        </span>
                    )}
                    {filters.maxCost != null && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-500/10 text-green-400 text-xs rounded-full border border-green-500/20">
                            <DollarSign size={10} />
                            Max: ${filters.maxCost.toLocaleString()}
                            <button onClick={() => onFilterChange({ maxCost: null })} className="hover:text-green-300"><X size={10} /></button>
                        </span>
                    )}
                    {filters.scoreBucket && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-orange-500/10 text-orange-400 text-xs rounded-full border border-orange-500/20">
                            <Gauge size={10} />
                            {SCORE_BUCKET_OPTIONS.find((o) => o.value === filters.scoreBucket)?.label ?? filters.scoreBucket}
                            <button onClick={() => onFilterChange({ scoreBucket: null })} className="hover:text-orange-300"><X size={10} /></button>
                        </span>
                    )}
                    {filters.costSource && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-orange-500/10 text-orange-400 text-xs rounded-full border border-orange-500/20">
                            <DollarSign size={10} />
                            {COST_SOURCE_OPTIONS.find((o) => o.value === filters.costSource)?.label ?? filters.costSource}
                            <button onClick={() => onFilterChange({ costSource: null })} className="hover:text-orange-300"><X size={10} /></button>
                        </span>
                    )}
                </div>
            )}
        </div>
    );
}
