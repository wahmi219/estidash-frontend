'use client';

import { useState, useEffect, useId, useCallback } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { ChevronDown, LandPlot, TrendingUp, Minus, TrendingDown, BarChart2 } from 'lucide-react';
import {
    AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from 'recharts';
import { apiService } from '@/services/api';
import { PermitCounty, CountyCoverageGap, CountyMonthlyStats, CountyBreakdown } from '@/types';

// ─── constants ────────────────────────────────────────────────────────────────

const CHART_COLOR = '#10b981'; // emerald-500
const CHART_ALT   = '#059669';

const GAP_STYLES = {
    green: { dot: 'bg-emerald-400', text: 'text-emerald-400', label: null },
    amber: { dot: 'bg-amber-400',   text: 'text-amber-400',   label: 'Low Coverage' },
    red:   { dot: 'bg-red-400 animate-pulse', text: 'text-red-400', label: 'No Data' },
};

// ─── custom tooltip ───────────────────────────────────────────────────────────

function CustomTooltip({ active, payload, label }: {
    active?: boolean;
    payload?: { value: number }[];
    label?: string;
}) {
    if (!active || !payload?.length) return null;
    return (
        <div
            className="bg-gray-900/98 rounded-xl px-3.5 py-2.5 shadow-2xl backdrop-blur-sm"
            style={{ border: `1px solid ${CHART_COLOR}40` }}
        >
            <p className="text-[10px] text-gray-400 mb-1">{label}</p>
            <p className="text-base font-mono font-bold text-white tabular-nums">
                {payload[0].value.toLocaleString()}
            </p>
            <p className="text-[10px] text-gray-500 mt-0.5">permits</p>
        </div>
    );
}

// ─── trend icon ───────────────────────────────────────────────────────────────

function TrendIcon({ monthly }: { monthly: CountyMonthlyStats[] }) {
    if (monthly.length < 2) return <Minus size={14} className="text-gray-600" />;
    const last  = monthly[monthly.length - 1].count;
    const prev  = monthly[monthly.length - 2].count;
    if (last > prev) return <TrendingUp size={14} className="text-emerald-400" />;
    if (last < prev) return <TrendingDown size={14} className="text-red-400" />;
    return <Minus size={14} className="text-gray-500" />;
}

// ─── animation variants ───────────────────────────────────────────────────────

const kpiVariants = {
    hidden: {},
    show: { transition: { staggerChildren: 0.05 } },
};
const kpiItem = {
    hidden: { opacity: 0, y: 8 },
    show:   { opacity: 1, y: 0, transition: { duration: 0.22, ease: 'easeOut' as const } },
};

// ─── component ────────────────────────────────────────────────────────────────

interface CountyAnalyticsCardProps {
    county: PermitCounty;
    gap?: CountyCoverageGap;
    isExpanded: boolean;
    onToggle: () => void;
}

export function CountyAnalyticsCard({ county, gap, isExpanded, onToggle }: CountyAnalyticsCardProps) {
    const gradientId   = useId().replace(/:/g, '');
    const shouldReduce = useReducedMotion();

    // Trend tab state
    const [monthly, setMonthly]   = useState<CountyMonthlyStats[]>([]);
    const [loaded, setLoaded]     = useState(false);
    const [loading, setLoading]   = useState(false);

    // Types tab state
    const [activeTab, setActiveTab]                 = useState<'trend' | 'types'>('trend');
    const [breakdown, setBreakdown]                 = useState<CountyBreakdown | null>(null);
    const [breakdownLoaded, setBreakdownLoaded]     = useState(false);
    const [breakdownLoading, setBreakdownLoading]   = useState(false);

    // Lazy-load monthly stats on first expand
    useEffect(() => {
        if (!isExpanded || loaded) return;
        setLoading(true);
        apiService.getCountyMonthlyStats(county.county_name)
            .then(r => { setMonthly(r.monthly); setLoaded(true); })
            .catch(() => setLoaded(true))
            .finally(() => setLoading(false));
    }, [isExpanded, loaded, county.county_name]);

    // Lazy-load breakdown on first Types tab click
    const handleTabTypes = useCallback(() => {
        setActiveTab('types');
        if (breakdownLoaded || breakdownLoading) return;
        setBreakdownLoading(true);
        apiService.getCountyBreakdown(county.county_name)
            .then(data => { setBreakdown(data); setBreakdownLoaded(true); })
            .catch(() => setBreakdownLoaded(true))
            .finally(() => setBreakdownLoading(false));
    }, [county.county_name, breakdownLoaded, breakdownLoading]);

    const gapStatus = gap?.status ?? (county.permit_count === 0 ? 'red' : county.permit_count < 500 ? 'amber' : 'green');
    const gapStyle  = GAP_STYLES[gapStatus];

    return (
        <motion.div
            layout
            className={[
                'relative overflow-hidden rounded-xl border transition-shadow duration-300',
                isExpanded
                    ? 'border-l-2 border-emerald-500/40 border-l-emerald-500 shadow-lg shadow-emerald-500/10 bg-gray-950/90'
                    : 'border-white/[0.06] bg-gray-950/60 hover:bg-gray-950/80 hover:shadow-emerald-500/10',
            ].join(' ')}
        >
            {/* Gradient sheen */}
            <div
                className="absolute inset-0 pointer-events-none opacity-40"
                style={{
                    background: `linear-gradient(135deg, ${CHART_COLOR}20 0%, transparent 60%)`,
                }}
            />

            {/* Header */}
            <button
                onClick={onToggle}
                className="relative w-full flex items-center gap-3 px-4 py-3.5 text-left focus-visible:ring-2 focus-visible:ring-emerald-500/40 focus-visible:outline-none rounded-xl"
            >
                {/* Icon */}
                <div className="w-8 h-8 rounded-lg bg-emerald-500/15 flex items-center justify-center flex-shrink-0">
                    <LandPlot size={16} className="text-emerald-400" />
                </div>

                {/* Name + state */}
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-semibold text-white truncate">
                            {county.county_name}
                        </span>
                        <span className="text-[11px] px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-400 font-mono flex-shrink-0">
                            {county.state_code}
                        </span>
                        {gap?.metro && (
                            <span className="text-[11px] text-gray-500 hidden sm:inline">
                                {gap.metro} metro
                            </span>
                        )}
                    </div>
                </div>

                {/* Stats */}
                <div className="flex items-center gap-3 flex-shrink-0 mr-1">
                    {/* Gap status */}
                    <div className="flex items-center gap-1.5">
                        <span className={`w-2 h-2 rounded-full flex-shrink-0 ${gapStyle.dot}`} />
                        {gapStyle.label && (
                            <span className={`text-[11px] font-medium ${gapStyle.text} hidden sm:inline`}>
                                {gapStyle.label}
                            </span>
                        )}
                    </div>

                    {/* Permit count */}
                    <div className="text-right hidden xs:block">
                        <p className="text-base font-mono font-bold text-white tabular-nums leading-none">
                            {county.permit_count.toLocaleString()}
                        </p>
                        <p className="text-[10px] text-gray-500 uppercase tracking-widest mt-0.5">permits</p>
                    </div>

                    {/* Trend icon — visible once loaded */}
                    {loaded && <TrendIcon monthly={monthly} />}

                    {/* Chevron */}
                    <motion.div
                        animate={{ rotate: isExpanded ? 180 : 0 }}
                        transition={shouldReduce ? { duration: 0 } : { type: 'spring', stiffness: 400, damping: 35 }}
                    >
                        <ChevronDown size={16} className="text-gray-500" />
                    </motion.div>
                </div>
            </button>

            {/* Expanded body */}
            <AnimatePresence initial={false}>
                {isExpanded && (
                    <motion.div
                        key="body"
                        initial={shouldReduce ? false : { height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={shouldReduce ? undefined : { height: 0, opacity: 0 }}
                        transition={{ type: 'spring', stiffness: 400, damping: 35 }}
                        className="overflow-hidden"
                    >
                        <div className="px-4 pb-4 pt-1 space-y-4 border-t border-white/[0.05]">

                            {/* Tab bar */}
                            <div className="flex gap-1 p-1 bg-white/[0.03] rounded-xl border border-white/[0.05]">
                                {([
                                    { id: 'trend' as const, icon: <TrendingUp size={12} />, label: '6-Month Trend' },
                                    { id: 'types' as const, icon: <BarChart2 size={12} />,  label: 'Types' },
                                ]).map(tab => (
                                    <button
                                        key={tab.id}
                                        onClick={() => tab.id === 'types' ? handleTabTypes() : setActiveTab('trend')}
                                        className={`
                                            flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium
                                            transition-all duration-200 focus-visible:ring-2 focus-visible:ring-emerald-500/40 focus-visible:outline-none
                                            ${activeTab === tab.id
                                                ? 'bg-white/[0.08] text-emerald-400 shadow-sm'
                                                : 'text-gray-500 hover:text-gray-300 hover:bg-white/[0.03]'}
                                        `}
                                    >
                                        {tab.icon}
                                        <span className="hidden sm:inline">{tab.label}</span>
                                    </button>
                                ))}
                            </div>

                            {/* KPI strip */}
                            <motion.div
                                variants={shouldReduce ? {} : kpiVariants}
                                initial="hidden"
                                animate="show"
                                className="flex gap-3 flex-wrap"
                            >
                                {[
                                    { label: 'Total Permits', value: county.permit_count.toLocaleString() },
                                    { label: 'Coverage',      value: gapStatus === 'green' ? 'Adequate' : gapStatus === 'amber' ? 'Low' : 'Missing' },
                                    { label: 'Last 6 Months', value: monthly.reduce((s, m) => s + m.count, 0).toLocaleString() },
                                ].map((kpi) => (
                                    <motion.div
                                        key={kpi.label}
                                        variants={shouldReduce ? {} : kpiItem}
                                        className="bg-white/[0.03] border border-white/[0.06] rounded-lg px-3 py-2 min-w-[100px]"
                                    >
                                        <p className="text-[10px] text-gray-500 uppercase tracking-widest mb-1">
                                            {kpi.label}
                                        </p>
                                        <p className="text-sm font-mono font-bold text-white tabular-nums">
                                            {kpi.value}
                                        </p>
                                    </motion.div>
                                ))}
                            </motion.div>

                            {/* ── Trend tab ── */}
                            {activeTab === 'trend' && (
                                <div>
                                    <p className="text-[10px] text-gray-500 uppercase tracking-widest mb-2">
                                        6-Month Trend
                                    </p>
                                    {loading ? (
                                        <div className="h-52 flex items-center justify-center">
                                            <div className="w-5 h-5 border-2 border-emerald-500/40 border-t-emerald-400 rounded-full animate-spin" />
                                        </div>
                                    ) : monthly.length === 0 ? (
                                        <div className="h-52 flex flex-col items-center justify-center gap-2 rounded-xl bg-white/[0.02] border border-white/[0.04]">
                                            <LandPlot size={24} className="text-gray-700" />
                                            <p className="text-xs text-gray-600 text-center max-w-[220px]">
                                                No permit data for this county yet.
                                                {gapStatus === 'red' && ' Import the ZIP crosswalk and sync a data source that covers this county.'}
                                            </p>
                                        </div>
                                    ) : (
                                        <div className="h-52">
                                            <ResponsiveContainer width="100%" height="100%">
                                                <AreaChart data={monthly} margin={{ top: 4, right: 4, left: -28, bottom: 0 }}>
                                                    <defs>
                                                        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                                                            <stop offset="0%"   stopColor={CHART_COLOR} stopOpacity={0.60} />
                                                            <stop offset="55%"  stopColor={CHART_COLOR} stopOpacity={0.12} />
                                                            <stop offset="100%" stopColor={CHART_COLOR} stopOpacity={0.02} />
                                                        </linearGradient>
                                                    </defs>
                                                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
                                                    <XAxis
                                                        dataKey="label"
                                                        tick={{ fontSize: 10, fill: '#6b7280' }}
                                                        axisLine={false}
                                                        tickLine={false}
                                                        tickFormatter={(v: string) => v.split(' ')[0]}
                                                    />
                                                    <YAxis
                                                        tick={{ fontSize: 10, fill: '#6b7280' }}
                                                        axisLine={false}
                                                        tickLine={false}
                                                        tickFormatter={(v: number) => v >= 1000 ? `${(v / 1000).toFixed(1)}k` : String(v)}
                                                    />
                                                    <Tooltip content={<CustomTooltip />} />
                                                    <Area
                                                        type="monotone"
                                                        dataKey="count"
                                                        stroke={CHART_COLOR}
                                                        strokeWidth={2}
                                                        fill={`url(#${gradientId})`}
                                                        dot={false}
                                                        activeDot={{ r: 4, fill: CHART_ALT, strokeWidth: 0 }}
                                                    />
                                                </AreaChart>
                                            </ResponsiveContainer>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* ── Types tab ── */}
                            {activeTab === 'types' && (
                                <div className="space-y-4">
                                    {breakdownLoading ? (
                                        <div className="h-40 flex items-center justify-center">
                                            <div className="w-5 h-5 border-2 border-emerald-500/40 border-t-emerald-400 rounded-full animate-spin" />
                                        </div>
                                    ) : !breakdown || breakdown.permit_type_breakdown.length === 0 ? (
                                        <div className="h-40 flex flex-col items-center justify-center gap-2 rounded-xl bg-white/[0.02] border border-white/[0.04]">
                                            <LandPlot size={22} className="text-gray-700" />
                                            <p className="text-xs text-gray-600">No type breakdown available yet.</p>
                                        </div>
                                    ) : (
                                        <>
                                            {/* Permit type horizontal bars */}
                                            <div>
                                                <p className="text-[10px] text-gray-500 uppercase tracking-widest mb-2">
                                                    Permit Types
                                                </p>
                                                <div className="space-y-1.5">
                                                    {breakdown.permit_type_breakdown.map((item, i) => {
                                                        const max = breakdown.permit_type_breakdown[0].count;
                                                        const pct = max > 0 ? (item.count / max) * 100 : 0;
                                                        return (
                                                            <div key={i} className="flex items-center gap-2">
                                                                <span
                                                                    className="text-[11px] text-gray-400 w-28 flex-shrink-0 truncate"
                                                                    title={item.permit_type ?? 'Unknown'}
                                                                >
                                                                    {item.permit_type ?? 'Unknown'}
                                                                </span>
                                                                <div className="flex-1 relative h-5 flex items-center">
                                                                    <div className="absolute inset-y-0 left-0 w-full rounded bg-white/[0.03]" />
                                                                    <motion.div
                                                                        className="absolute inset-y-0 left-0 rounded"
                                                                        style={{ background: '#10b98133' }}
                                                                        initial={shouldReduce ? { width: `${pct}%` } : { width: 0 }}
                                                                        animate={{ width: `${pct}%` }}
                                                                        transition={{ duration: 0.45, delay: i * 0.04, ease: 'easeOut' }}
                                                                    />
                                                                    <span className="relative text-[10px] font-mono text-gray-500 pl-1.5 tabular-nums">
                                                                        {item.count.toLocaleString()}
                                                                    </span>
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </div>

                                            {/* Cost bucket pills — 3 simplified buckets */}
                                            <div>
                                                <p className="text-[10px] text-gray-500 uppercase tracking-widest mb-2">
                                                    Cost Distribution
                                                </p>
                                                <div className="flex gap-2 flex-wrap">
                                                    {[
                                                        { label: '<$100K',    count: breakdown.cost_distribution.under_100k },
                                                        { label: '$100K–$1M', count: breakdown.cost_distribution.k100_to_500k + breakdown.cost_distribution.k500_to_1m },
                                                        { label: '>$1M',      count: breakdown.cost_distribution.m1_to_5m + breakdown.cost_distribution.over_5m },
                                                    ].map(bucket => (
                                                        <div
                                                            key={bucket.label}
                                                            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20"
                                                        >
                                                            <span className="text-[10px] text-gray-500">{bucket.label}</span>
                                                            <span className="text-xs font-mono font-bold text-emerald-400 tabular-nums">
                                                                {bucket.count.toLocaleString()}
                                                            </span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>

                                            {/* Permit class pills */}
                                            {breakdown.permit_class_breakdown.length > 0 && (
                                                <div>
                                                    <p className="text-[10px] text-gray-500 uppercase tracking-widest mb-2">
                                                        By Class
                                                    </p>
                                                    <div className="flex gap-2 flex-wrap">
                                                        {breakdown.permit_class_breakdown.map(item => (
                                                            <div
                                                                key={item.permit_class}
                                                                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white/[0.04] border border-white/[0.06]"
                                                            >
                                                                <span className="text-[10px] text-gray-500 capitalize">
                                                                    {item.permit_class.replace('_', ' ')}
                                                                </span>
                                                                <span className="text-xs font-mono font-bold text-white tabular-nums">
                                                                    {item.count.toLocaleString()}
                                                                </span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                        </>
                                    )}
                                </div>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
}

export default CountyAnalyticsCard;
