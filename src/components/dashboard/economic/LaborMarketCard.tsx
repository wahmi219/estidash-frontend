'use client';

import { motion } from 'framer-motion';
import { Briefcase, ArrowRightLeft, LogOut, AlertTriangle, HelpCircle } from 'lucide-react';
import clsx from 'clsx';
import { LaborTurnover } from '@/store/slices/economicSlice';

interface LaborMarketCardProps {
    data: LaborTurnover | null;
    isLoading?: boolean;
}

export function LaborMarketCard({ data, isLoading = false }: LaborMarketCardProps) {
    const toNumber = (val: number | string | null | undefined): number | null => {
        if (val === null || val === undefined) return null;
        const num = typeof val === 'string' ? parseFloat(val) : val;
        return isNaN(num) ? null : num;
    };

    const getTightnessLevel = (ratio: number | string | null | undefined) => {
        const numRatio = toNumber(ratio);
        if (numRatio === null) return { level: 'unknown', label: 'No Data', color: 'gray' };
        if (numRatio >= 1.5) return { level: 'very-tight', label: 'Very Tight', color: 'rose' };
        if (numRatio >= 1.2) return { level: 'tight', label: 'Tight', color: 'amber' };
        if (numRatio >= 0.8) return { level: 'balanced', label: 'Balanced', color: 'emerald' };
        return { level: 'loose', label: 'Loose', color: 'blue' };
    };

    const tightness = getTightnessLevel(data?.tightness_ratio);

    const formatNumber = (value: number | string | null | undefined) => {
        const num = toNumber(value);
        if (num === null) return '—';
        return `${num.toLocaleString()}K`;
    };

    const metrics = [
        {
            key: 'job_openings',
            label: 'Job Openings',
            value: data?.job_openings,
            icon: Briefcase,
            description: 'Unfilled positions. High = Labor shortage.',
        },
        {
            key: 'hires',
            label: 'Hires',
            value: data?.hires,
            icon: ArrowRightLeft,
            description: 'New employees per month. Activity level indicator.',
        },
        {
            key: 'quits',
            label: 'Quits',
            value: data?.quits,
            icon: LogOut,
            description: 'Voluntary departures. High quits = workers confident in job market.',
        },
        {
            key: 'layoffs',
            label: 'Layoffs',
            value: data?.layoffs,
            icon: AlertTriangle,
            description: 'Involuntary separations. Rising = Industry contraction.',
        },
    ];

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="bg-gradient-to-br from-white to-gray-50 dark:from-gray-900/90 dark:to-gray-800/90 rounded-2xl p-6 border border-gray-200 dark:border-gray-700/50 shadow-xl"
        >
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-purple-500/20 rounded-xl">
                        <ArrowRightLeft className="w-5 h-5 text-purple-400" />
                    </div>
                    <div>
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Labor Turnover</h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400">BLS JOLTS Data</p>
                    </div>
                </div>
                {data?.as_of_date && (
                    <span className="text-xs text-gray-500">
                        As of {new Date(data.as_of_date).toLocaleDateString()}
                    </span>
                )}
            </div>

            {/* Tightness Ratio Highlight */}
            {isLoading ? (
                <div className="animate-pulse mb-6">
                    <div className="h-20 bg-gray-200 dark:bg-gray-700 rounded-xl"></div>
                </div>
            ) : (
                <div className={clsx(
                    'p-4 rounded-xl border mb-6',
                    `bg-${tightness.color}-500/10 border-${tightness.color}-500/20`
                )}
                    style={{
                        backgroundColor: tightness.color === 'rose' ? 'rgba(244,63,94,0.1)' :
                            tightness.color === 'amber' ? 'rgba(245,158,11,0.1)' :
                                tightness.color === 'emerald' ? 'rgba(16,185,129,0.1)' :
                                    tightness.color === 'blue' ? 'rgba(59,130,246,0.1)' : 'rgba(107,114,128,0.1)',
                        borderColor: tightness.color === 'rose' ? 'rgba(244,63,94,0.2)' :
                            tightness.color === 'amber' ? 'rgba(245,158,11,0.2)' :
                                tightness.color === 'emerald' ? 'rgba(16,185,129,0.2)' :
                                    tightness.color === 'blue' ? 'rgba(59,130,246,0.2)' : 'rgba(107,114,128,0.2)',
                    }}
                >
                    <div className="flex items-center justify-between">
                        <div>
                            <div className="flex items-center gap-2">
                                <span className="text-sm text-gray-600 dark:text-gray-300">Labor Market Tightness</span>
                                <div className="relative group/tooltip">
                                    <HelpCircle className="w-3.5 h-3.5 text-gray-500 cursor-help" />
                                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-white dark:bg-gray-900 text-xs text-gray-600 dark:text-gray-300 rounded-lg opacity-0 group-hover/tooltip:opacity-100 transition-opacity pointer-events-none w-48 z-10 shadow-xl border border-gray-200 dark:border-gray-700">
                                        Job Openings ÷ Hires. &gt;1.5 = Very tight labor market.
                                    </div>
                                </div>
                            </div>
                            <div className={clsx('text-3xl font-bold mt-1', {
                                'text-rose-400': tightness.color === 'rose',
                                'text-amber-400': tightness.color === 'amber',
                                'text-emerald-400': tightness.color === 'emerald',
                                'text-blue-400': tightness.color === 'blue',
                                'text-gray-400': tightness.color === 'gray',
                            })}>
                                {toNumber(data?.tightness_ratio)?.toFixed(2) ?? '—'}
                            </div>
                        </div>
                        <div className={clsx('px-3 py-1 rounded-full text-sm font-medium', {
                            'bg-rose-500/20 text-rose-400': tightness.color === 'rose',
                            'bg-amber-500/20 text-amber-400': tightness.color === 'amber',
                            'bg-emerald-500/20 text-emerald-400': tightness.color === 'emerald',
                            'bg-blue-500/20 text-blue-400': tightness.color === 'blue',
                            'bg-gray-500/20 text-gray-400': tightness.color === 'gray',
                        })}>
                            {tightness.label}
                        </div>
                    </div>
                </div>
            )}

            {/* Metrics Grid */}
            {isLoading ? (
                <div className="grid grid-cols-2 gap-3">
                    {[1, 2, 3, 4].map((i) => (
                        <div key={i} className="animate-pulse">
                            <div className="h-16 bg-gray-200 dark:bg-gray-700 rounded-xl"></div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="grid grid-cols-2 gap-3">
                    {metrics.map(({ key, label, value, icon: Icon, description }) => (
                        <div
                            key={key}
                            className="p-3 bg-gray-100 dark:bg-gray-800/50 rounded-xl border border-gray-200 dark:border-gray-700/30 group"
                        >
                            <div className="flex items-center gap-2 mb-1">
                                <Icon className="w-3.5 h-3.5 text-gray-400" />
                                <span className="text-xs text-gray-500 dark:text-gray-400">{label}</span>
                                <div className="relative group/tooltip ml-auto">
                                    <HelpCircle className="w-3 h-3 text-gray-600 cursor-help" />
                                    <div className="absolute bottom-full right-0 mb-2 px-3 py-2 bg-white dark:bg-gray-900 text-xs text-gray-600 dark:text-gray-300 rounded-lg opacity-0 group-hover/tooltip:opacity-100 transition-opacity pointer-events-none w-40 z-10 shadow-xl border border-gray-200 dark:border-gray-700">
                                        {description}
                                    </div>
                                </div>
                            </div>
                            <div className="text-lg font-bold text-gray-900 dark:text-white">
                                {formatNumber(value ?? null)}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Insight Box */}
            <div className="mt-6 p-4 bg-purple-500/10 rounded-xl border border-purple-500/20">
                <p className="text-sm text-purple-300">
                    <strong>For Estimators:</strong> Tightness &gt;1.5 = Budget 5-10% higher labor costs. Tightness &lt;1.0 = Labor readily available.
                </p>
            </div>
        </motion.div>
    );
}
