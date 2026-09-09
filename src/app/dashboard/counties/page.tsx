'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { LandPlot, RefreshCw, AlertCircle, ArrowUpDown, SortAsc, Database } from 'lucide-react';
import { apiService } from '@/services/api';
import { PermitCounty, CountyCoverageGap, DataSourceHealthSummary } from '@/types';
import { CountyAnalyticsCard } from '@/components/permits';
import PageHeader from '@/components/common/PageHeader';

// Rotating palette for the dynamically-discovered state tabs — restrained
// blue / green / amber / gray family only, no purple/pink/neon.
const TAB_PALETTE = [
    { activeBg: 'bg-blue-100',    activeBorder: 'border-blue-400',    text: 'text-blue-700'    },
    { activeBg: 'bg-amber-100',   activeBorder: 'border-amber-400',   text: 'text-amber-700'   },
    { activeBg: 'bg-emerald-100', activeBorder: 'border-emerald-400', text: 'text-emerald-700' },
    { activeBg: 'bg-gray-200',    activeBorder: 'border-gray-400',    text: 'text-[#5B6B7D]'   },
];

const ALL_COLOR = { activeBg: 'bg-[#00458B]/10', activeBorder: 'border-[#00458B]/40', text: 'text-[#00458B]' };

function stateColor(index: number) {
    return TAB_PALETTE[index % TAB_PALETTE.length];
}

// Coverage status — semantic only: green=adequate, amber=low, red=missing.
const GAP_BADGE: Record<string, string> = {
    green: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    amber: 'bg-amber-50 text-amber-700 border-amber-200',
    red:   'bg-red-50 text-red-700 border-red-200',
};

const GAP_LABEL: Record<string, string> = {
    green: 'Adequate',
    amber: 'Low Coverage',
    red:   'Missing Data',
};

// ─── summary chip ─────────────────────────────────────────────────────────────

function SummaryChip({ label, value, accent }: { label: string; value: string; accent?: string }) {
    return (
        <div className="bg-white border border-[#DFE6EE] rounded-lg p-4">
            <p className={`text-2xl font-bold font-mono tabular-nums ${accent ?? 'text-[#0E2B5C]'}`}>
                {value}
            </p>
            <p className="text-xs text-[#5B6B7D] mt-0.5">{label}</p>
        </div>
    );
}

// ─── page ─────────────────────────────────────────────────────────────────────

export default function CountiesPage() {
    const [counties, setCounties]           = useState<PermitCounty[]>([]);
    const [gaps, setGaps]                   = useState<CountyCoverageGap[]>([]);
    const [loading, setLoading]             = useState(true);
    const [error, setError]                 = useState<string | null>(null);

    const [activeState, setActiveState]     = useState('All');
    const [sortMode, setSortMode]           = useState<'count' | 'alpha'>('count');
    const [activeCardKey, setActiveCardKey] = useState<string | null>(null);

    const fetchData = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const [countiesRes, gapsRes] = await Promise.all([
                apiService.getPermitCounties(),
                apiService.getCountyCoverageGaps(),
            ]);
            setCounties(countiesRes.counties);
            setGaps(gapsRes.gaps);
        } catch {
            setError('Failed to load county data. Make sure the backend is running.');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchData(); }, [fetchData]);

    // Lightweight source-health indicator only (Phase 2C) -- this page's
    // job stays geographic coverage, not source troubleshooting, so this
    // is a single small link, not a table or breakdown.
    const [sourceHealth, setSourceHealth] = useState<DataSourceHealthSummary | null>(null);
    useEffect(() => {
        apiService.getDataSourcesHealthSummary().then(setSourceHealth).catch(() => {});
    }, []);
    const sourcesNeedingAttention = sourceHealth
        ? sourceHealth.warning + sourceHealth.failed + sourceHealth.stuck + sourceHealth.needs_auth
        : 0;

    // Build a gaps lookup for fast card access
    const gapMap = useMemo(() => {
        const m = new Map<string, CountyCoverageGap>();
        gaps.forEach(g => m.set(`${g.county_name}__${g.state_code}`, g));
        return m;
    }, [gaps]);

    // Filter + sort county list
    const filteredCounties = useMemo(() => {
        let list = activeState === 'All'
            ? counties
            : counties.filter(c => c.state_code === activeState);
        if (sortMode === 'count') {
            list = [...list].sort((a, b) => b.permit_count - a.permit_count);
        } else {
            list = [...list].sort((a, b) => a.county_name.localeCompare(b.county_name));
        }
        return list;
    }, [counties, activeState, sortMode]);

    // Summary stats
    const totalCounties  = counties.length;
    const missingCount   = gaps.filter(g => g.status === 'red').length;
    const adequateCount  = gaps.filter(g => g.status === 'green').length;
    const crosswalkEmpty = !loading && counties.length === 0;

    // Derive state tabs + counts from actual data (sorted by permit volume desc)
    const { stateTabs, stateCounts } = useMemo(() => {
        const counts: Record<string, number> = {};
        let totalPermits = 0;
        counties.forEach(c => {
            counts[c.state_code] = (counts[c.state_code] ?? 0) + 1;
            totalPermits += c.permit_count;
        });
        const sorted = Object.keys(counts).sort((a, b) => counts[b] - counts[a]);
        return {
            stateTabs: ['All', ...sorted],
            stateCounts: { ...counts, All: counties.length } as Record<string, number>,
        };
    }, [counties]);

    return (
        <div className="p-6 lg:p-8 space-y-6">
            <PageHeader
                icon={LandPlot}
                title="County Coverage"
                subtitle="Validate permit coverage by county — identify data gaps across key metros"
                actions={
                    <>
                        {sourcesNeedingAttention > 0 && (
                            <Link
                                href="/dashboard/datasources"
                                className="flex items-center gap-2 px-3 py-2 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-lg text-amber-800 text-sm transition-colors"
                                title="Some permit sources need attention"
                            >
                                <Database size={14} />
                                {sourcesNeedingAttention} source{sourcesNeedingAttention === 1 ? '' : 's'} need attention
                            </Link>
                        )}
                        <button
                            onClick={fetchData}
                            disabled={loading}
                            className="flex items-center gap-2 px-3 py-2 bg-white hover:bg-[#F7F9FB] border border-[#DFE6EE] rounded-lg text-[#5B6B7D] hover:text-[#0E2B5C] text-sm transition-colors disabled:opacity-50"
                        >
                            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
                            Refresh
                        </button>
                    </>
                }
            />

            {/* Crosswalk warning */}
            {crosswalkEmpty && (
                <div className="flex items-start gap-3 px-4 py-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-800 text-sm">
                    <AlertCircle size={16} className="flex-shrink-0 mt-0.5" />
                    <span>
                        ZIP → County crosswalk is not populated — county names cannot be resolved.
                        Go to <strong>Data Sources</strong> and click &ldquo;Import ZIP Crosswalk&rdquo; to enable county resolution.
                    </span>
                </div>
            )}

            {/* Error */}
            {error && (
                <div className="flex items-center gap-3 px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                    <AlertCircle size={16} />
                    {error}
                </div>
            )}

            {/* Summary chips */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <SummaryChip label="Counties in DB"  value={loading ? '—' : totalCounties.toString()} />
                <SummaryChip label="Adequate (≥500)" value={loading ? '—' : adequateCount.toString()} accent="text-emerald-700" />
                <SummaryChip label="Low Coverage"    value={loading ? '—' : gaps.filter(g => g.status === 'amber').length.toString()} accent="text-amber-700" />
                <SummaryChip label="Missing Data"    value={loading ? '—' : missingCount.toString()} accent="text-red-700" />
            </div>

            {/* Coverage Gaps — Known Key Counties */}
            {gaps.length > 0 && (
                <div className="bg-white border border-[#DFE6EE] rounded-lg p-4 space-y-3">
                    <div className="flex items-center justify-between">
                        <h2 className="text-sm font-semibold text-[#0E2B5C] flex items-center gap-2">
                            <LandPlot size={14} className="text-[#00458B]" />
                            Key County Validation
                        </h2>
                        <p className="text-xs text-[#5B6B7D]">
                            {adequateCount}/{gaps.length} adequate
                        </p>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2">
                        {gaps.map(g => (
                            <div
                                key={`${g.county_name}-${g.state_code}`}
                                className="flex items-center gap-2.5 px-3 py-2.5 bg-[#F7F9FB] border border-[#DFE6EE] rounded-lg"
                            >
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium text-[#0E2B5C] truncate leading-none">
                                        {g.county_name}
                                    </p>
                                    <p className="text-[11px] text-[#5B6B7D] mt-1">
                                        {g.metro} · {g.state_code}
                                    </p>
                                </div>
                                <div className="text-right flex-shrink-0 space-y-1">
                                    <p className="text-xs font-mono tabular-nums text-[#5B6B7D]">
                                        {g.permit_count.toLocaleString()}
                                    </p>
                                    <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium border ${GAP_BADGE[g.status]}`}>
                                        {GAP_LABEL[g.status]}
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* State tabs + sort */}
            <div className="flex items-center justify-between flex-wrap gap-3">
                <div className="flex items-center gap-2 flex-wrap">
                    {stateTabs.map((s, idx) => {
                        const isActive = activeState === s;
                        const colors   = s === 'All' ? ALL_COLOR : stateColor(idx - 1);
                        const count    = stateCounts[s] ?? 0;
                        return (
                            <button
                                key={s}
                                onClick={() => setActiveState(s)}
                                className={[
                                    'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all duration-150',
                                    isActive
                                        ? `${colors.activeBg} ${colors.text} ${colors.activeBorder}`
                                        : 'bg-white text-[#5B6B7D] border-[#DFE6EE] hover:border-[#00458B]/30',
                                ].join(' ')}
                            >
                                {s === 'All' ? 'All States' : s}
                                <span className={`inline-flex items-center justify-center min-w-5 h-5 px-1 rounded-full text-[10px] font-semibold ${isActive ? 'bg-black/10' : 'bg-black/5'}`}>
                                    {count}
                                </span>
                            </button>
                        );
                    })}
                </div>

                {/* Sort toggle */}
                <div className="flex items-center gap-1 bg-[#F7F9FB] border border-[#DFE6EE] rounded-lg p-1">
                    <button
                        onClick={() => setSortMode('count')}
                        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs transition-colors ${sortMode === 'count' ? 'bg-white text-[#00458B] shadow-sm' : 'text-[#5B6B7D] hover:text-[#0E2B5C]'}`}
                    >
                        <ArrowUpDown size={11} />
                        Count
                    </button>
                    <button
                        onClick={() => setSortMode('alpha')}
                        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs transition-colors ${sortMode === 'alpha' ? 'bg-white text-[#00458B] shadow-sm' : 'text-[#5B6B7D] hover:text-[#0E2B5C]'}`}
                    >
                        <SortAsc size={11} />
                        A–Z
                    </button>
                </div>
            </div>

            {/* County card list */}
            {loading ? (
                <div className="space-y-2">
                    {[...Array(6)].map((_, i) => (
                        <div key={i} className="h-14 rounded-lg bg-[#F7F9FB] border border-[#DFE6EE] animate-pulse" />
                    ))}
                </div>
            ) : filteredCounties.length === 0 ? (
                <div className="text-center py-16 text-[#5B6B7D] text-sm">
                    {counties.length === 0
                        ? 'No county data yet — import the ZIP crosswalk and sync a data source first.'
                        : `No counties found for ${activeState}.`}
                </div>
            ) : (
                <div className="space-y-2">
                    {filteredCounties.map(county => {
                        const key = `${county.county_name}__${county.state_code}`;
                        return (
                            <CountyAnalyticsCard
                                key={key}
                                county={county}
                                gap={gapMap.get(key)}
                                isExpanded={activeCardKey === key}
                                onToggle={() => setActiveCardKey(prev => prev === key ? null : key)}
                            />
                        );
                    })}
                </div>
            )}
        </div>
    );
}
