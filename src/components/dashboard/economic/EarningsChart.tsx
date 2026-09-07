'use client';

import { motion } from 'framer-motion';
import { DollarSign, TrendingUp, Clock, Users, Info } from 'lucide-react';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, ReferenceLine,
} from 'recharts';
import { EmploymentGeo } from '@/store/slices/economicSlice';
import { useChartTheme } from '@/utils/chartTheme';

interface EarningsChartProps {
    nationalData: EmploymentGeo | null;
    stateData: EmploymentGeo | null;
    metroData: EmploymentGeo | null;
    isLoading?: boolean;
}

const COLORS = {
    national: '#6366f1',
    state: '#10b981',
    metro: '#a855f7',
};

export function EarningsChart({
    nationalData,
    stateData,
    metroData,
    isLoading = false,
}: EarningsChartProps) {
    const chartColors = useChartTheme();

    const CustomTooltip = ({ active, payload, label }: any) => {
        if (!active || !payload?.length) return null;
        return (
            <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 px-4 py-3 rounded-xl shadow-xl">
                <p className="text-sm text-gray-600 dark:text-gray-300 mb-1">{label}</p>
                {payload.map((entry: any, i: number) => (
                    <p key={i} className="text-sm font-bold" style={{ color: entry.fill }}>
                        ${entry.value?.toFixed(2)}/hr
                    </p>
                ))}
            </div>
        );
    };

    function MetricGauge({ label, value, unit, min, max, color, icon: Icon }: {
        label: string; value: number; unit: string; min: number; max: number; color: string;
        icon: React.ElementType;
    }) {
        const pct = Math.min(100, Math.max(0, ((value - min) / (max - min)) * 100));
        return (
            <div className="p-3.5 bg-gray-100 dark:bg-gray-800/50 rounded-xl border border-gray-200 dark:border-gray-700/30">
                <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                        <Icon className="w-3.5 h-3.5 text-gray-500 dark:text-gray-400" />
                        <span className="text-xs text-gray-500 dark:text-gray-400">{label}</span>
                    </div>
                    <span className="text-sm font-bold text-gray-900 dark:text-white">
                        {unit === '$' ? `$${value.toFixed(2)}` : unit === 'hrs' ? `${value.toFixed(1)} hrs` : `${value.toLocaleString()}K`}
                    </span>
                </div>
                <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                    <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${pct}%` }}
                        transition={{ duration: 0.8, ease: 'easeOut' }}
                        className="h-full rounded-full"
                        style={{ backgroundColor: color }}
                    />
                </div>
                <div className="flex justify-between mt-1">
                    <span className="text-[10px] text-gray-600">{unit === '$' ? `$${min}` : min}</span>
                    <span className="text-[10px] text-gray-600">{unit === '$' ? `$${max}` : max}</span>
                </div>
            </div>
        );
    }

    const hasComparison = stateData?.avg_hourly_earnings != null || metroData?.avg_hourly_earnings != null;
    const hasNational = nationalData?.avg_hourly_earnings != null;

    // Build comparison chart data
    const chartData = [
        nationalData?.avg_hourly_earnings != null && {
            name: 'National',
            earnings: nationalData.avg_hourly_earnings,
            color: COLORS.national,
        },
        stateData?.avg_hourly_earnings != null && {
            name: stateData.geo_name || stateData.geo_code,
            earnings: stateData.avg_hourly_earnings,
            color: COLORS.state,
        },
        metroData?.avg_hourly_earnings != null && {
            name: metroData.geo_name || metroData.geo_code,
            earnings: metroData.avg_hourly_earnings,
            color: COLORS.metro,
        },
    ].filter(Boolean) as { name: string; earnings: number; color: string }[];

    const avgEarnings = chartData.length > 0
        ? chartData.reduce((sum, d) => sum + d.earnings, 0) / chartData.length
        : 0;

    // Compute wage differential when comparison exists
    const wageDiff = hasComparison && hasNational && stateData?.avg_hourly_earnings != null
        ? {
            diff: stateData.avg_hourly_earnings - (nationalData?.avg_hourly_earnings || 0),
            pct: ((stateData.avg_hourly_earnings - (nationalData?.avg_hourly_earnings || 0)) / (nationalData?.avg_hourly_earnings || 1)) * 100,
        } : null;

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.15 }}
            className="bg-white dark:bg-gradient-to-br dark:from-gray-900/90 dark:to-gray-800/90 rounded-2xl p-6 border border-gray-200 dark:border-gray-700/50 shadow-xl"
        >
            <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-emerald-500/20 rounded-xl">
                        <DollarSign className="w-5 h-5 text-emerald-400" />
                    </div>
                    <div>
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                            {hasComparison ? 'Wage Comparison' : 'Construction Compensation'}
                        </h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                            {hasComparison ? 'Hourly earnings by geography' : 'National workforce metrics'}
                        </p>
                    </div>
                </div>
                {hasComparison && (
                    <div className="flex items-center gap-3 flex-wrap">
                        {chartData.map(d => (
                            <div key={d.name} className="flex items-center gap-1.5">
                                <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: d.color }} />
                                <span className="text-xs text-gray-500 dark:text-gray-400">{d.name}</span>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {isLoading ? (
                <div className="animate-pulse h-[250px] bg-gray-200 dark:bg-gray-700/30 rounded-xl" />
            ) : !hasNational && !hasComparison ? (
                <div className="h-[250px] flex flex-col items-center justify-center text-center gap-3">
                    <Info className="w-8 h-8 text-gray-600" />
                    <div>
                        <p className="text-gray-500 dark:text-gray-400 text-sm font-medium">No earnings data available</p>
                        <p className="text-gray-500 text-xs mt-1">Sync national data to view compensation metrics</p>
                    </div>
                </div>
            ) : hasComparison ? (
                /* === COMPARISON VIEW: Bar chart when state/metro selected === */
                <>
                    <ResponsiveContainer width="100%" height={200}>
                        <BarChart data={chartData} barSize={50}>
                            <CartesianGrid strokeDasharray="3 3" stroke={chartColors.grid} vertical={false} />
                            <XAxis
                                dataKey="name"
                                tick={{ fill: chartColors.axis, fontSize: 12 }}
                                axisLine={{ stroke: chartColors.grid }}
                                tickLine={false}
                            />
                            <YAxis
                                tick={{ fill: chartColors.axis, fontSize: 12 }}
                                axisLine={false}
                                tickLine={false}
                                tickFormatter={(v) => `$${v}`}
                                domain={['dataMin - 3', 'dataMax + 3']}
                            />
                            <Tooltip content={<CustomTooltip />} cursor={{ fill: chartColors.grid + '20' }} />
                            {avgEarnings > 0 && (
                                <ReferenceLine
                                    y={avgEarnings}
                                    stroke={chartColors.labelColor}
                                    strokeDasharray="4 4"
                                    label={{ value: `Avg $${avgEarnings.toFixed(2)}`, fill: chartColors.labelColor, fontSize: 11, position: 'right' }}
                                />
                            )}
                            <Bar dataKey="earnings" radius={[8, 8, 0, 0]}>
                                {chartData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={entry.color} fillOpacity={0.85} />
                                ))}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>

                    {/* Wage differential insight */}
                    {wageDiff && (
                        <div className={`mt-3 p-3 rounded-xl border ${wageDiff.diff >= 0
                            ? 'bg-emerald-500/10 border-emerald-500/20'
                            : 'bg-amber-500/10 border-amber-500/20'
                            }`}>
                            <div className="flex items-center gap-2">
                                <TrendingUp className={`w-3.5 h-3.5 ${wageDiff.diff >= 0 ? 'text-emerald-400' : 'text-amber-400'}`} />
                                <p className="text-xs text-gray-600 dark:text-gray-300">
                                    <strong>{stateData?.geo_name || stateData?.geo_code}</strong> wages are{' '}
                                    <span className={wageDiff.diff >= 0 ? 'text-emerald-400 font-bold' : 'text-amber-400 font-bold'}>
                                        {wageDiff.diff >= 0 ? '+' : ''}{wageDiff.diff.toFixed(2)}/hr ({wageDiff.pct >= 0 ? '+' : ''}{wageDiff.pct.toFixed(1)}%)
                                    </span>{' '}
                                    vs national. {wageDiff.diff >= 0
                                        ? 'Budget higher labor costs for this region.'
                                        : 'Labor costs may be more competitive here.'}
                                </p>
                            </div>
                        </div>
                    )}
                </>
            ) : (
                /* === NATIONAL-ONLY VIEW: Rich metrics display === */
                <div className="space-y-4">
                    {/* Hero earnings value */}
                    <div className="p-5 bg-gradient-to-r from-emerald-500/10 to-teal-500/10 rounded-xl border border-emerald-500/20">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">National Avg. Hourly Earnings</p>
                                <p className="text-3xl font-bold text-emerald-400">
                                    ${nationalData?.avg_hourly_earnings?.toFixed(2)}
                                    <span className="text-base text-gray-500 font-normal">/hr</span>
                                </p>
                            </div>
                            <div className="text-right">
                                <p className="text-[10px] text-gray-500 uppercase tracking-wider">Construction Industry</p>
                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                    As of {nationalData?.observation_date ? new Date(nationalData.observation_date).toLocaleDateString() : 'N/A'}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Metric gauges */}
                    <div className="grid grid-cols-1 gap-3">
                        {nationalData?.avg_hourly_earnings != null && (
                            <MetricGauge
                                label="Hourly Earnings"
                                value={nationalData.avg_hourly_earnings}
                                unit="$"
                                min={20}
                                max={50}
                                color="#10b981"
                                icon={DollarSign}
                            />
                        )}
                        {nationalData?.avg_weekly_hours != null && (
                            <MetricGauge
                                label="Avg. Weekly Hours"
                                value={nationalData.avg_weekly_hours}
                                unit="hrs"
                                min={30}
                                max={45}
                                color="#6366f1"
                                icon={Clock}
                            />
                        )}
                        {nationalData?.employment_thousands != null && (
                            <MetricGauge
                                label="Total Employment"
                                value={nationalData.employment_thousands}
                                unit="K"
                                min={5000}
                                max={10000}
                                color="#a855f7"
                                icon={Users}
                            />
                        )}
                    </div>

                    <p className="text-xs text-gray-500 text-center">
                        Select a state above to compare regional wages against the national average
                    </p>
                </div>
            )}
        </motion.div>
    );
}
