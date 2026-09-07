'use client';

import { motion } from 'framer-motion';
import { DollarSign, TrendingUp, TrendingDown, ArrowRight, Info } from 'lucide-react';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, ReferenceLine,
} from 'recharts';
import { EmploymentGeo } from '@/store/slices/economicSlice';
import { useChartTheme } from '@/utils/chartTheme';

interface WageComparisonChartProps {
    nationalData: EmploymentGeo | null;
    stateData: EmploymentGeo | null;
    metroData?: EmploymentGeo | null;
    isLoading?: boolean;
}

const COLORS = {
    national: '#6366f1',
    state: '#10b981',
    metro: '#a855f7',
};

export function WageComparisonChart({
    nationalData,
    stateData,
    metroData,
    isLoading = false,
}: WageComparisonChartProps) {
    const chartColors = useChartTheme();

    const CustomTooltip = ({ active, payload, label }: any) => {
        if (!active || !payload?.length) return null;
        return (
            <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 px-4 py-3 rounded-xl shadow-xl">
                <p className="text-sm text-gray-600 dark:text-gray-300 font-medium mb-1">{label}</p>
                {payload.map((entry: any, i: number) => (
                    <p key={i} className="text-sm font-bold" style={{ color: entry.fill }}>
                        ${entry.value?.toFixed(2)}/hr
                    </p>
                ))}
            </div>
        );
    };

    const stateName = stateData?.geo_name || stateData?.geo_code || 'State';
    const metroName = metroData?.geo_name || metroData?.geo_code || 'Metro';

    const natEarnings = nationalData?.avg_hourly_earnings;
    const stateEarnings = stateData?.avg_hourly_earnings;
    const metroEarnings = metroData?.avg_hourly_earnings;

    const hasNational = natEarnings != null;
    const hasState = stateEarnings != null;
    const hasMetro = metroEarnings != null;
    const hasData = hasNational || hasState || hasMetro;

    // Build horizontal bar data
    const barData = [
        hasNational && { name: 'National', earnings: natEarnings!, color: COLORS.national },
        hasState && { name: stateName, earnings: stateEarnings!, color: COLORS.state },
        hasMetro && { name: metroName, earnings: metroEarnings!, color: COLORS.metro },
    ].filter(Boolean) as { name: string; earnings: number; color: string }[];

    // Differentials
    const stateDiff = hasNational && hasState
        ? { amount: stateEarnings! - natEarnings!, pct: ((stateEarnings! - natEarnings!) / natEarnings!) * 100 }
        : null;
    const metroDiff = hasNational && hasMetro
        ? { amount: metroEarnings! - natEarnings!, pct: ((metroEarnings! - natEarnings!) / natEarnings!) * 100 }
        : null;

    const avgEarnings = barData.length > 0 ? barData.reduce((s, d) => s + d.earnings, 0) / barData.length : 0;

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.15 }}
            className="bg-white dark:bg-gradient-to-br dark:from-gray-900/90 dark:to-gray-800/90 rounded-2xl p-6 border border-gray-200 dark:border-gray-700/50 shadow-xl"
        >
            {/* Header */}
            <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-emerald-500/20 rounded-xl">
                        <DollarSign className="w-5 h-5 text-emerald-400" />
                    </div>
                    <div>
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Wage Comparison</h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                            {hasState ? `Average hourly construction earnings` : 'National hourly construction earnings'}
                        </p>
                    </div>
                </div>
                {nationalData?.observation_date && (
                    <span className="text-xs text-gray-500">
                        As of {new Date(nationalData.observation_date).toLocaleDateString()}
                    </span>
                )}
            </div>

            {isLoading ? (
                <div className="animate-pulse h-[260px] bg-gray-200 dark:bg-gray-700/30 rounded-xl" />
            ) : !hasData ? (
                <div className="h-[260px] flex flex-col items-center justify-center text-center gap-3">
                    <Info className="w-8 h-8 text-gray-600" />
                    <div>
                        <p className="text-gray-500 dark:text-gray-400 text-sm font-medium">No wage data available</p>
                        <p className="text-gray-500 text-xs mt-1">Sync data to view earnings comparison</p>
                    </div>
                </div>
            ) : (
                <>
                    {/* Differential Cards */}
                    <div className={`grid ${stateDiff && metroDiff ? 'grid-cols-2' : 'grid-cols-1'} gap-3 mb-5`}>
                        {stateDiff && (
                            <div className={`p-3.5 rounded-xl border ${stateDiff.amount >= 0
                                    ? 'bg-emerald-500/10 border-emerald-500/20'
                                    : 'bg-amber-500/10 border-amber-500/20'
                                }`}>
                                <div className="flex items-center gap-2 mb-1">
                                    {stateDiff.amount >= 0
                                        ? <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
                                        : <TrendingDown className="w-3.5 h-3.5 text-amber-400" />
                                    }
                                    <span className="text-xs text-gray-500 dark:text-gray-400">{stateName} vs National</span>
                                </div>
                                <div className="flex items-baseline gap-2">
                                    <span className={`text-lg font-bold ${stateDiff.amount >= 0 ? 'text-emerald-400' : 'text-amber-400'}`}>
                                        {stateDiff.amount >= 0 ? '+' : ''}{stateDiff.amount.toFixed(2)}/hr
                                    </span>
                                    <span className="text-xs text-gray-500">
                                        ({stateDiff.pct >= 0 ? '+' : ''}{stateDiff.pct.toFixed(1)}%)
                                    </span>
                                </div>
                                <p className="text-[10px] text-gray-500 mt-1">
                                    {stateDiff.amount >= 0
                                        ? 'Higher labor costs — adjust estimates upward'
                                        : 'Lower labor costs — potential savings on labor'}
                                </p>
                            </div>
                        )}
                        {metroDiff && (
                            <div className={`p-3.5 rounded-xl border ${metroDiff.amount >= 0
                                    ? 'bg-purple-500/10 border-purple-500/20'
                                    : 'bg-amber-500/10 border-amber-500/20'
                                }`}>
                                <div className="flex items-center gap-2 mb-1">
                                    {metroDiff.amount >= 0
                                        ? <TrendingUp className="w-3.5 h-3.5 text-purple-400" />
                                        : <TrendingDown className="w-3.5 h-3.5 text-amber-400" />
                                    }
                                    <span className="text-xs text-gray-500 dark:text-gray-400">{metroName} vs National</span>
                                </div>
                                <div className="flex items-baseline gap-2">
                                    <span className={`text-lg font-bold ${metroDiff.amount >= 0 ? 'text-purple-400' : 'text-amber-400'}`}>
                                        {metroDiff.amount >= 0 ? '+' : ''}{metroDiff.amount.toFixed(2)}/hr
                                    </span>
                                    <span className="text-xs text-gray-500">
                                        ({metroDiff.pct >= 0 ? '+' : ''}{metroDiff.pct.toFixed(1)}%)
                                    </span>
                                </div>
                                <p className="text-[10px] text-gray-500 mt-1">
                                    {metroDiff.amount >= 0
                                        ? 'Metro premium on wages'
                                        : 'Below-average metro labor rates'}
                                </p>
                            </div>
                        )}
                        {!stateDiff && !metroDiff && hasNational && (
                            <div className="p-3.5 bg-indigo-500/10 rounded-xl border border-indigo-500/20">
                                <div className="flex items-center gap-2 mb-1">
                                    <DollarSign className="w-3.5 h-3.5 text-indigo-400" />
                                    <span className="text-xs text-gray-500 dark:text-gray-400">National Avg Hourly</span>
                                </div>
                                <p className="text-xl font-bold text-gray-900 dark:text-white">${natEarnings!.toFixed(2)}/hr</p>
                                <p className="text-[10px] text-gray-500 mt-1">Select a state to compare wages</p>
                            </div>
                        )}
                    </div>

                    {/* Bar chart */}
                    <ResponsiveContainer width="100%" height={180}>
                        <BarChart data={barData} barSize={barData.length <= 2 ? 60 : 40}>
                            <CartesianGrid strokeDasharray="3 3" stroke={chartColors.grid} vertical={false} />
                            <XAxis
                                dataKey="name"
                                tick={{ fill: chartColors.axis, fontSize: 12 }}
                                axisLine={{ stroke: chartColors.grid }}
                                tickLine={false}
                            />
                            <YAxis
                                tick={{ fill: chartColors.axis, fontSize: 11 }}
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
                                {barData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={entry.color} fillOpacity={0.85} />
                                ))}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>

                    {/* Insight */}
                    <div className="mt-4 p-3 bg-emerald-500/10 rounded-xl border border-emerald-500/20">
                        <p className="text-xs text-emerald-300">
                            <strong>Why this matters:</strong> Hourly wage rates directly impact labor line items in your estimates.
                            {stateDiff
                                ? ` ${stateName} wages are ${Math.abs(stateDiff.pct).toFixed(1)}% ${stateDiff.amount >= 0 ? 'above' : 'below'} the national average — factor this into regional bids.`
                                : ' Compare state and metro wages to calibrate labor costs for specific geographies.'
                            }
                        </p>
                    </div>
                </>
            )}
        </motion.div>
    );
}
