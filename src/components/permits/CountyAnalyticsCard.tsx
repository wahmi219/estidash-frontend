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
// General UI chrome (focus rings, chart line, active tab) uses the
// Estimation Hub primary blue — only the coverage badge itself uses
// semantic green/amber/red, so "No Data" reads as one status chip rather
// than overpowering the whole row with red.

const CHART_COLOR = '#00458B';
const CHART_ALT   = '#045CB4';

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

// ─── custom tooltip ───────────────────────────────────────────────────────────

function CustomTooltip({ active, payload, label }: {
    active?: boolean;
    payload?: { value: number }[];
    label?: string;
}) {
    if (!active || !payload?.length) return null;
    return (
        <div className="bg-white rounded-lg px-3.5 py-2.5 shadow-md border border-[#DFE6EE]">
            <p className="text-[10px] text-[#5B6B7D] mb-1">{label}</p>
            <p className="text-base font-mono font-bold text-[#0E2B5C] tabular-nums">
                {payload[0].value.toLocaleString()}
            </p>
            <p className="text-[10px] text-[#5B6B7D] mt-0.5">permits</p>
        </div>
    );
}

// ─── trend icon ───────────────────────────────────────────────────────────────

function TrendIcon({ monthly }: { monthly: CountyMonthlyStats[] }) {
    if (monthly.length < 2) return <Minus size={14} className="text-gray-300" />;
    const last  = monthly[monthly.length - 1].count;
    const prev  = monthly[monthly.length - 2].count;
    if (last > prev) return <TrendingUp size={14} className="text-emerald-600" />;
    if (last < prev) return <TrendingDown size={14} className="text-red-600" />;
    return <Minus size={14} className="text-gray-300" />;
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

    return (
        <motion.div
            layout
            className={[
                'relative overflow-hidden rounded-lg border transition-shadow duration-300 bg-white',
                isExpanded
                    ? 'border-[#DFE6EE] shadow-sm'
                    : 'border-[#DFE6EE] hover:border-gray-300',
            ].join(' ')}
        >
            {/* Header */}
            <button
                onClick={onToggle}
                className="w-full flex items-center gap-3 px-4 py-3.5 text-left focus-visible:ring-2 focus-visible:ring-[#00458B]/30 focus-visible:outline-none rounded-t-lg"
            >
                {/* Icon */}
                <div className="w-8 h-8 rounded-lg bg-[#F7F9FB] border border-[#DFE6EE] flex items-center justify-center flex-shrink-0">
                    <LandPlot size={16} className="text-[#00458B]" />
                </div>

                {/* Name + state */}
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-semibold text-[#0E2B5C] truncate">
                            {county.county_name}
                        </span>
                        <span className="text-[11px] px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 font-mono flex-shrink-0">
                            {county.state_code}
                        </span>
                        {gap?.metro && (
                            <span className="text-[11px] text-[#5B6B7D] hidden sm:inline">
                                {gap.metro} metro
                            </span>
                        )}
                    </div>
                </div>

                {/* Stats */}
                <div className="flex items-center gap-3 flex-shrink-0 mr-1">
                    {/* Coverage status — a single badge, not a full-row tint */}
                    <span className={`hidden sm:inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium border ${GAP_BADGE[gapStatus]}`}>
                        {GAP_LABEL[gapStatus]}
                    </span>

                    {/* Permit count */}
                    <div className="text-right hidden xs:block">
                        <p className="text-base font-mono font-bold text-[#0E2B5C] tabular-nums leading-none">
                            {county.permit_count.toLocaleString()}
                        </p>
                        <p className="text-[10px] text-[#5B6B7D] uppercase tracking-widest mt-0.5">permits</p>
                    </div>

                    {/* Trend icon — visible once loaded */}
                    {loaded && <TrendIcon monthly={monthly} />}

                    {/* Chevron */}
                    <motion.div
                        animate={{ rotate: isExpanded ? 180 : 0 }}
                        transition={shouldReduce ? { duration: 0 } : { type: 'spring', stiffness: 400, damping: 35 }}
                    >
                        <ChevronDown size={16} className="text-[#5B6B7D]" />
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
                        <div className="px-4 pb-4 pt-1 space-y-4 border-t border-[#DFE6EE]">

                            {/* Tab bar */}
                            <div className="flex gap-1 p-1 bg-[#F7F9FB] rounded-lg border border-[#DFE6EE] mt-3">
                                {([
                                    { id: 'trend' as const, icon: <TrendingUp size={12} />, label: '6-Month Trend' },
                                    { id: 'types' as const, icon: <BarChart2 size={12} />,  label: 'Types' },
                                ]).map(tab => (
                                    <button
                                        key={tab.id}
                                        onClick={() => tab.id === 'types' ? handleTabTypes() : setActiveTab('trend')}
                                        className={`
                                            flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-md text-xs font-medium
                                            transition-all duration-200 focus-visible:ring-2 focus-visible:ring-[#00458B]/30 focus-visible:outline-none
                                            ${activeTab === tab.id
                                                ? 'bg-white text-[#00458B] shadow-sm border border-[#DFE6EE]'
                                                : 'text-[#5B6B7D] hover:text-[#0E2B5C] hover:bg-white/60'}
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
                                    { label: 'Coverage',      value: GAP_LABEL[gapStatus] },
                                    { label: 'Last 6 Months', value: monthly.reduce((s, m) => s + m.count, 0).toLocaleString() },
                                ].map((kpi) => (
                                    <motion.div
                                        key={kpi.label}
                                        variants={shouldReduce ? {} : kpiItem}
                                        className="bg-[#F7F9FB] border border-[#DFE6EE] rounded-lg px-3 py-2 min-w-[100px]"
                                    >
                                        <p className="text-[10px] text-[#5B6B7D] uppercase tracking-widest mb-1">
                                            {kpi.label}
                                        </p>
                                        <p className="text-sm font-mono font-bold text-[#0E2B5C] tabular-nums">
                                            {kpi.value}
                                        </p>
                                    </motion.div>
                                ))}
                            </motion.div>

                            {/* ── Trend tab ── */}
                            {activeTab === 'trend' && (
                                <div>
                                    <p className="text-[10px] text-[#5B6B7D] uppercase tracking-widest mb-2">
                                        6-Month Trend
                                    </p>
                                    {loading ? (
                                        <div className="h-52 flex items-center justify-center">
                                            <div className="w-5 h-5 border-2 border-[#DFE6EE] border-t-[#00458B] rounded-full animate-spin" />
                                        </div>
                                    ) : monthly.length === 0 ? (
                                        <div className="h-52 flex flex-col items-center justify-center gap-2 rounded-lg bg-[#F7F9FB] border border-[#DFE6EE]">
                                            <LandPlot size={24} className="text-gray-300" />
                                            <p className="text-xs text-[#5B6B7D] text-center max-w-[220px]">
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
                                                            <stop offset="0%"   stopColor={CHART_COLOR} stopOpacity={0.35} />
                                                            <stop offset="55%"  stopColor={CHART_COLOR} stopOpacity={0.08} />
                                                            <stop offset="100%" stopColor={CHART_COLOR} stopOpacity={0.02} />
                                                        </linearGradient>
                                                    </defs>
                                                    <CartesianGrid strokeDasharray="3 3" stroke="#DFE6EE" vertical={false} />
                                                    <XAxis
                                                        dataKey="label"
                                                        tick={{ fontSize: 10, fill: '#5B6B7D' }}
                                                        axisLine={false}
                                                        tickLine={false}
                                                        tickFormatter={(v: string) => v.split(' ')[0]}
                                                    />
                                                    <YAxis
                                                        tick={{ fontSize: 10, fill: '#5B6B7D' }}
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
                                            <div className="w-5 h-5 border-2 border-[#DFE6EE] border-t-[#00458B] rounded-full animate-spin" />
                                        </div>
                                    ) : !breakdown || breakdown.permit_type_breakdown.length === 0 ? (
                                        <div className="h-40 flex flex-col items-center justify-center gap-2 rounded-lg bg-[#F7F9FB] border border-[#DFE6EE]">
                                            <LandPlot size={22} className="text-gray-300" />
                                            <p className="text-xs text-[#5B6B7D]">No type breakdown available yet.</p>
                                        </div>
                                    ) : (
                                        <>
                                            {/* Permit type horizontal bars */}
                                            <div>
                                                <p className="text-[10px] text-[#5B6B7D] uppercase tracking-widest mb-2">
                                                    Permit Types
                                                </p>
                                                <div className="space-y-1.5">
                                                    {breakdown.permit_type_breakdown.map((item, i) => {
                                                        const max = breakdown.permit_type_breakdown[0].count;
                                                        const pct = max > 0 ? (item.count / max) * 100 : 0;
                                                        return (
                                                            <div key={i} className="flex items-center gap-2">
                                                                <span
                                                                    className="text-[11px] text-[#5B6B7D] w-28 flex-shrink-0 truncate"
                                                                    title={item.permit_type ?? 'Unknown'}
                                                                >
                                                                    {item.permit_type ?? 'Unknown'}
                                                                </span>
                                                                <div className="flex-1 relative h-5 flex items-center">
                                                                    <div className="absolute inset-y-0 left-0 w-full rounded bg-[#F7F9FB]" />
                                                                    <motion.div
                                                                        className="absolute inset-y-0 left-0 rounded"
                                                                        style={{ background: `${CHART_COLOR}30` }}
                                                                        initial={shouldReduce ? { width: `${pct}%` } : { width: 0 }}
                                                                        animate={{ width: `${pct}%` }}
                                                                        transition={{ duration: 0.45, delay: i * 0.04, ease: 'easeOut' }}
                                                                    />
                                                                    <span className="relative text-[10px] font-mono text-[#5B6B7D] pl-1.5 tabular-nums">
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
                                                <p className="text-[10px] text-[#5B6B7D] uppercase tracking-widest mb-2">
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
                                                            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-blue-50 border border-blue-200"
                                                        >
                                                            <span className="text-[10px] text-[#5B6B7D]">{bucket.label}</span>
                                                            <span className="text-xs font-mono font-bold text-[#00458B] tabular-nums">
                                                                {bucket.count.toLocaleString()}
                                                            </span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>

                                            {/* Permit class pills */}
                                            {breakdown.permit_class_breakdown.length > 0 && (
                                                <div>
                                                    <p className="text-[10px] text-[#5B6B7D] uppercase tracking-widest mb-2">
                                                        By Class
                                                    </p>
                                                    <div className="flex gap-2 flex-wrap">
                                                        {breakdown.permit_class_breakdown.map(item => (
                                                            <div
                                                                key={item.permit_class}
                                                                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[#F7F9FB] border border-[#DFE6EE]"
                                                            >
                                                                <span className="text-[10px] text-[#5B6B7D] capitalize">
                                                                    {item.permit_class.replace('_', ' ')}
                                                                </span>
                                                                <span className="text-xs font-mono font-bold text-[#0E2B5C] tabular-nums">
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
