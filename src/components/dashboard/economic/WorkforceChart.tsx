'use client';

import { motion } from 'framer-motion';
import { Users, Clock, TrendingUp, TrendingDown, Info } from 'lucide-react';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import { EmploymentGeo } from '@/store/slices/economicSlice';
import { useChartTheme } from '@/utils/chartTheme';

interface WorkforceChartProps {
    nationalData: EmploymentGeo | null;
    stateData: EmploymentGeo | null;
    isLoading?: boolean;
}

export function WorkforceChart({
    nationalData,
    stateData,
    isLoading = false,
}: WorkforceChartProps) {
    const chartColors = useChartTheme();

    const CustomTooltip = ({ active, payload, label }: any) => {
        if (!active || !payload?.length) return null;
        return (
            <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 px-4 py-3 rounded-xl shadow-xl">
                <p className="text-sm text-gray-600 dark:text-gray-300 font-medium mb-2">{label}</p>
                {payload.map((entry: any, i: number) => (
                    <div key={i} className="flex items-center gap-2 mb-1">
                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.fill || entry.color }} />
                        <span className="text-xs text-gray-500 dark:text-gray-400">{entry.name}:</span>
                        <span className="text-xs font-bold" style={{ color: entry.fill || entry.color }}>
                            {entry.value?.toLocaleString()}K
                        </span>
                    </div>
                ))}
            </div>
        );
    };

    const stateName = stateData?.geo_name || stateData?.geo_code || 'State';
    const hasNational = nationalData?.employment_thousands != null;
    const hasState = stateData?.employment_thousands != null;
    const hasData = hasNational || hasState;

    // Employment bar data
    const employmentData = [];
    if (hasNational) {
        employmentData.push({
            name: 'National',
            value: nationalData!.employment_thousands!,
            fill: '#6366f1',
        });
    }
    if (hasState) {
        employmentData.push({
            name: stateName,
            value: stateData!.employment_thousands!,
            fill: '#10b981',
        });
    }

    // Weekly hours comparison
    const natHours = nationalData?.avg_weekly_hours;
    const stateHours = stateData?.avg_weekly_hours;

    // Compute state share of national
    const stateShare = hasNational && hasState
        ? ((stateData!.employment_thousands! / nationalData!.employment_thousands!) * 100).toFixed(1)
        : null;

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="bg-white dark:bg-gradient-to-br dark:from-gray-900/90 dark:to-gray-800/90 rounded-2xl p-6 border border-gray-200 dark:border-gray-700/50 shadow-xl"
        >
            {/* Header */}
            <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-indigo-500/20 rounded-xl">
                        <Users className="w-5 h-5 text-indigo-400" />
                    </div>
                    <div>
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Workforce Size</h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                            {hasState ? `Construction employment — National vs ${stateName}` : 'National construction employment'}
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
                        <p className="text-gray-500 dark:text-gray-400 text-sm font-medium">No employment data available</p>
                        <p className="text-gray-500 text-xs mt-1">Sync national data to view workforce metrics</p>
                    </div>
                </div>
            ) : (
                <>
                    {/* Stat cards */}
                    <div className={`grid ${hasState ? 'grid-cols-3' : 'grid-cols-2'} gap-3 mb-5`}>
                        {hasNational && (
                            <div className="p-3.5 bg-gray-100 dark:bg-gray-800/50 rounded-xl border border-gray-200 dark:border-gray-700/30">
                                <div className="flex items-center gap-1.5 mb-1.5">
                                    <Users className="w-3.5 h-3.5 text-indigo-400" />
                                    <span className="text-xs text-gray-500 dark:text-gray-400">National Workforce</span>
                                </div>
                                <p className="text-xl font-bold text-gray-900 dark:text-white">
                                    {nationalData!.employment_thousands!.toLocaleString()}K
                                </p>
                                <p className="text-[10px] text-gray-500 mt-1">Total construction workers</p>
                            </div>
                        )}
                        {natHours != null && (
                            <div className="p-3.5 bg-gray-100 dark:bg-gray-800/50 rounded-xl border border-gray-200 dark:border-gray-700/30">
                                <div className="flex items-center gap-1.5 mb-1.5">
                                    <Clock className="w-3.5 h-3.5 text-blue-400" />
                                    <span className="text-xs text-gray-500 dark:text-gray-400">Avg Weekly Hours</span>
                                </div>
                                <div className="flex items-baseline gap-2">
                                    <p className="text-xl font-bold text-gray-900 dark:text-white">{natHours.toFixed(1)}</p>
                                    <span className={`text-xs font-medium ${natHours >= 40 ? 'text-emerald-400' : natHours >= 38 ? 'text-amber-400' : 'text-rose-400'}`}>
                                        {natHours >= 40 ? '≥ 40hr benchmark' : natHours >= 38 ? 'Near benchmark' : 'Below benchmark'}
                                    </span>
                                </div>
                                {stateHours != null && (
                                    <p className="text-[10px] text-gray-500 mt-1">
                                        {stateName}: {stateHours.toFixed(1)} hrs
                                        {' '}
                                        <span className={stateHours >= natHours ? 'text-emerald-400' : 'text-amber-400'}>
                                            ({stateHours >= natHours ? '+' : ''}{(stateHours - natHours).toFixed(1)})
                                        </span>
                                    </p>
                                )}
                            </div>
                        )}
                        {stateShare && (
                            <div className="p-3.5 bg-gray-100 dark:bg-gray-800/50 rounded-xl border border-gray-200 dark:border-gray-700/30">
                                <div className="flex items-center gap-1.5 mb-1.5">
                                    <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
                                    <span className="text-xs text-gray-500 dark:text-gray-400">{stateName} Share</span>
                                </div>
                                <p className="text-xl font-bold text-emerald-400">{stateShare}%</p>
                                <p className="text-[10px] text-gray-500 mt-1">of national construction jobs</p>
                            </div>
                        )}
                    </div>

                    {/* Employment bar chart */}
                    <ResponsiveContainer width="100%" height={180}>
                        <BarChart data={employmentData} barSize={hasState ? 50 : 80}>
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
                                tickFormatter={(v) => `${v.toLocaleString()}K`}
                            />
                            <Tooltip content={<CustomTooltip />} cursor={{ fill: chartColors.grid + '20' }} />
                            <Bar dataKey="value" radius={[8, 8, 0, 0]}>
                                {employmentData.map((entry, index) => (
                                    <Bar key={index} dataKey="value" fill={entry.fill} radius={[8, 8, 0, 0]} />
                                ))}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>

                    {/* Insight */}
                    <div className="mt-4 p-3 bg-indigo-500/10 rounded-xl border border-indigo-500/20">
                        <p className="text-xs text-indigo-300">
                            <strong>What this means:</strong> Employment levels indicate construction industry scale.
                            {hasState && stateShare
                                ? ` ${stateName} accounts for ${stateShare}% of national construction employment.`
                                : ' Select a state to compare regional workforce size.'
                            }
                            {' '}Rising employment = growing project pipeline and labor competition.
                        </p>
                    </div>
                </>
            )}
        </motion.div>
    );
}
