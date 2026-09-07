'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { LandPlot, RefreshCw, AlertCircle, ArrowUpDown, SortAsc } from 'lucide-react';
import { apiService } from '@/services/api';
import { PermitCounty, CountyCoverageGap } from '@/types';
import { CountyAnalyticsCard } from '@/components/permits';

// Rotating palette — cycles through these colors for dynamically discovered states.
const TAB_PALETTE = [
    { activeBg: 'bg-blue-500/15',    activeBorder: 'border-blue-500/40',    text: 'text-blue-400'    },
    { activeBg: 'bg-amber-500/15',   activeBorder: 'border-amber-500/40',   text: 'text-amber-400'   },
    { activeBg: 'bg-purple-500/15',  activeBorder: 'border-purple-500/40',  text: 'text-purple-400'  },
    { activeBg: 'bg-cyan-500/15',    activeBorder: 'border-cyan-500/40',    text: 'text-cyan-400'    },
    { activeBg: 'bg-orange-500/15',  activeBorder: 'border-orange-500/40',  text: 'text-orange-400'  },
    { activeBg: 'bg-pink-500/15',    activeBorder: 'border-pink-500/40',    text: 'text-pink-400'    },
    { activeBg: 'bg-violet-500/15',  activeBorder: 'border-violet-500/40',  text: 'text-violet-400'  },
    { activeBg: 'bg-teal-500/15',    activeBorder: 'border-teal-500/40',    text: 'text-teal-400'    },
    { activeBg: 'bg-rose-500/15',    activeBorder: 'border-rose-500/40',    text: 'text-rose-400'    },
    { activeBg: 'bg-lime-500/15',    activeBorder: 'border-lime-500/40',    text: 'text-lime-400'    },
    { activeBg: 'bg-sky-500/15',     activeBorder: 'border-sky-500/40',     text: 'text-sky-400'     },
    { activeBg: 'bg-fuchsia-500/15', activeBorder: 'border-fuchsia-500/40', text: 'text-fuchsia-400' },
];

const ALL_COLOR = { activeBg: 'bg-emerald-500/15', activeBorder: 'border-emerald-500/40', text: 'text-emerald-400' };

function stateColor(index: number) {
    return TAB_PALETTE[index % TAB_PALETTE.length];
}

const GAP_DOT: Record<string, string> = {
    green: 'bg-emerald-400',
    amber: 'bg-amber-400',
    red:   'bg-red-400 animate-pulse',
};

const GAP_LABEL: Record<string, string> = {
    green: 'Adequate',
    amber: 'Low Coverage',
    red:   'No Data',
};

const GAP_TEXT: Record<string, string> = {
    green: 'text-emerald-400',
    amber: 'text-amber-400',
    red:   'text-red-400',
};

// ─── summary chip ─────────────────────────────────────────────────────────────

function SummaryChip({ label, value, accent }: { label: string; value: string; accent?: string }) {
    return (
        <div className="bg-black/2 dark:bg-white/3 border border-gray-200 dark:border-white/8 rounded-xl p-4">
            <p className={`text-2xl font-bold font-mono tabular-nums ${accent ?? 'text-gray-900 dark:text-white'}`}>
                {value}
            </p>
            <p className="text-xs text-gray-500 mt-0.5">{label}</p>
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
        <div className="p-6 space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between flex-wrap gap-3">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
                            <LandPlot size={20} className="text-white" />
                        </div>
                        County Coverage
                    </h1>
                    <p className="text-gray-500 mt-1 text-sm">
                        Validate permit coverage by county — identify data gaps across key metros
                    </p>
                </div>
                <button
                    onClick={fetchData}
                    disabled={loading}
                    className="flex items-center gap-2 px-3 py-2 bg-black/4 dark:bg-white/5 hover:bg-black/5 dark:hover:bg-white/8 border border-gray-200 dark:border-white/10 rounded-lg text-gray-600 dark:text-gray-300 text-sm transition-colors disabled:opacity-50"
                >
                    <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
                    Refresh
                </button>
            </div>

            {/* Crosswalk warning */}
            {crosswalkEmpty && (
                <div className="flex items-start gap-3 px-4 py-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-amber-400 text-sm">
                    <AlertCircle size={16} className="flex-shrink-0 mt-0.5" />
                    <span>
                        ZIP → County crosswalk is not populated — county names cannot be resolved.
                        Go to <strong>Data Sources</strong> and click &ldquo;Import ZIP Crosswalk&rdquo; to enable county resolution.
                    </span>
                </div>
            )}

            {/* Error */}
            {error && (
                <div className="flex items-center gap-3 px-4 py-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm">
                    <AlertCircle size={16} />
                    {error}
                </div>
            )}

            {/* Summary chips */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <SummaryChip label="Counties in DB"  value={loading ? '—' : totalCounties.toString()} />
                <SummaryChip label="Adequate (≥500)" value={loading ? '—' : adequateCount.toString()} accent="text-emerald-400" />
                <SummaryChip label="Low Coverage"    value={loading ? '—' : gaps.filter(g => g.status === 'amber').length.toString()} accent="text-amber-400" />
                <SummaryChip label="Missing Data"    value={loading ? '—' : missingCount.toString()} accent="text-red-400" />
            </div>

            {/* Coverage Gaps — Known Key Counties */}
            {gaps.length > 0 && (
                <div className="bg-black/2 dark:bg-white/[0.02] border border-gray-200 dark:border-white/[0.06] rounded-xl p-4 space-y-3">
                    <div className="flex items-center justify-between">
                        <h2 className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                            <LandPlot size={14} className="text-emerald-400" />
                            Key County Validation
                        </h2>
                        <p className="text-xs text-gray-500">
                            {adequateCount}/{gaps.length} adequate
                        </p>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2">
                        {gaps.map(g => (
                            <div
                                key={`${g.county_name}-${g.state_code}`}
                                className="flex items-center gap-2.5 px-3 py-2 bg-white/[0.02] border border-white/[0.05] rounded-lg"
                            >
                                <span className={`w-2 h-2 rounded-full flex-shrink-0 ${GAP_DOT[g.status]}`} />
                                <div className="flex-1 min-w-0">
                                    <p className="text-xs text-gray-300 truncate leading-none">
                                        {g.county_name}
                                    </p>
                                    <p className="text-[10px] text-gray-600 mt-0.5">
                                        {g.metro} · {g.state_code}
                                    </p>
                                </div>
                                <div className="text-right flex-shrink-0">
                                    <p className="text-xs font-mono tabular-nums text-gray-400">
                                        {g.permit_count.toLocaleString()}
                                    </p>
                                    <p className={`text-[10px] ${GAP_TEXT[g.status]}`}>
                                        {GAP_LABEL[g.status]}
                                    </p>
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
                                        : 'bg-white/[0.04] text-gray-400 border-transparent hover:border-white/10',
                                ].join(' ')}
                            >
                                {s === 'All' ? 'All States' : s}
                                <span className={`inline-flex items-center justify-center min-w-5 h-5 px-1 rounded-full text-[10px] font-semibold ${isActive ? 'bg-white/10' : 'bg-white/5'}`}>
                                    {count}
                                </span>
                            </button>
                        );
                    })}
                </div>

                {/* Sort toggle */}
                <div className="flex items-center gap-1 bg-white/[0.03] border border-white/[0.06] rounded-lg p-1">
                    <button
                        onClick={() => setSortMode('count')}
                        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs transition-colors ${sortMode === 'count' ? 'bg-emerald-500/15 text-emerald-400' : 'text-gray-500 hover:text-gray-300'}`}
                    >
                        <ArrowUpDown size={11} />
                        Count
                    </button>
                    <button
                        onClick={() => setSortMode('alpha')}
                        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs transition-colors ${sortMode === 'alpha' ? 'bg-emerald-500/15 text-emerald-400' : 'text-gray-500 hover:text-gray-300'}`}
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
                        <div key={i} className="h-14 rounded-xl bg-white/[0.02] border border-white/[0.05] animate-pulse" />
                    ))}
                </div>
            ) : filteredCounties.length === 0 ? (
                <div className="text-center py-16 text-gray-500 text-sm">
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
