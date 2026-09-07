'use client';

import { motion } from 'framer-motion';
import { Users, Clock, DollarSign, HelpCircle, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import clsx from 'clsx';
import { Employment } from '@/store/slices/economicSlice';

interface EmploymentCardProps {
    data: Employment | null;
    isLoading?: boolean;
}

const METRIC_INFO = {
    total_construction: {
        label: 'Total Construction',
        unit: 'K workers',
        description: 'Total workers in construction (thousands). Higher = industry growing, more competition for labor.',
        icon: Users,
    },
    avg_weekly_hours: {
        label: 'Avg Weekly Hours',
        unit: 'hrs',
        description: 'Hours worked per week. Below 40 = slowdown indicator.',
        icon: Clock,
        threshold: 40,
    },
    avg_hourly_earnings: {
        label: 'Avg Hourly Earnings',
        unit: '$',
        description: 'Average wage rate. Track for labor cost estimates.',
        icon: DollarSign,
    },
};

export function EmploymentCard({ data, isLoading = false }: EmploymentCardProps) {
    const getHoursStatus = (hours: number | null) => {
        if (hours === null) return 'neutral';
        if (hours >= 42) return 'high';
        if (hours < 38) return 'low';
        return 'normal';
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'high':
                return 'text-rose-400';
            case 'low':
                return 'text-amber-400';
            default:
                return 'text-emerald-400';
        }
    };

    const getHoursIcon = (status: string) => {
        switch (status) {
            case 'high':
                return <TrendingUp className="w-4 h-4 text-rose-400" />;
            case 'low':
                return <TrendingDown className="w-4 h-4 text-amber-400" />;
            default:
                return <Minus className="w-4 h-4 text-emerald-400" />;
        }
    };

    const formatValue = (value: number | null, unit: string) => {
        if (value === null) return '—';
        if (unit === '$') return `$${value.toFixed(2)}`;
        if (unit === 'hrs') return value.toFixed(1);
        return value.toLocaleString();
    };

    const hoursStatus = getHoursStatus(data?.avg_weekly_hours ?? null);

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="bg-gradient-to-br from-white to-gray-50 dark:from-gray-900/90 dark:to-gray-800/90 rounded-2xl p-6 border border-gray-200 dark:border-gray-700/50 shadow-xl"
        >
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-emerald-500/20 rounded-xl">
                        <Users className="w-5 h-5 text-emerald-400" />
                    </div>
                    <div>
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Employment</h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400">BLS Construction Data</p>
                    </div>
                </div>
                {data?.as_of_date && (
                    <span className="text-xs text-gray-500">
                        As of {new Date(data.as_of_date).toLocaleDateString()}
                    </span>
                )}
            </div>

            {/* Stats */}
            {isLoading ? (
                <div className="space-y-4">
                    {[1, 2, 3].map((i) => (
                        <div key={i} className="animate-pulse">
                            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/3 mb-2"></div>
                            <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="space-y-4">
                    {/* Total Construction */}
                    <div className="p-4 bg-gray-100 dark:bg-gray-800/50 rounded-xl border border-gray-200 dark:border-gray-700/30">
                        <div className="flex items-center gap-2 mb-2">
                            <Users className="w-4 h-4 text-gray-400" />
                            <span className="text-sm text-gray-600 dark:text-gray-300">Total Construction</span>
                            <div className="relative group/tooltip">
                                <HelpCircle className="w-3.5 h-3.5 text-gray-500 cursor-help" />
                                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-white dark:bg-gray-900 text-xs text-gray-600 dark:text-gray-300 rounded-lg opacity-0 group-hover/tooltip:opacity-100 transition-opacity pointer-events-none w-48 z-10 shadow-xl border border-gray-200 dark:border-gray-700">
                                    {METRIC_INFO.total_construction.description}
                                </div>
                            </div>
                        </div>
                        <div className="text-3xl font-bold text-gray-900 dark:text-white">
                            {data?.total_construction ? `${data.total_construction.toLocaleString()}K` : '—'}
                        </div>
                    </div>

                    {/* Hours and Earnings Row */}
                    <div className="grid grid-cols-2 gap-4">
                        {/* Weekly Hours */}
                        <div className="p-4 bg-gray-100 dark:bg-gray-800/50 rounded-xl border border-gray-200 dark:border-gray-700/30">
                            <div className="flex items-center gap-2 mb-2">
                                <Clock className="w-4 h-4 text-gray-400" />
                                <span className="text-xs text-gray-500 dark:text-gray-400">Weekly Hours</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className={clsx('text-xl font-bold', getStatusColor(hoursStatus))}>
                                    {formatValue(data?.avg_weekly_hours ?? null, 'hrs')}
                                </span>
                                {getHoursIcon(hoursStatus)}
                            </div>
                        </div>

                        {/* Hourly Earnings */}
                        <div className="p-4 bg-gray-100 dark:bg-gray-800/50 rounded-xl border border-gray-200 dark:border-gray-700/30">
                            <div className="flex items-center gap-2 mb-2">
                                <DollarSign className="w-4 h-4 text-gray-400" />
                                <span className="text-xs text-gray-500 dark:text-gray-400">Hourly Earnings</span>
                            </div>
                            <div className="text-xl font-bold text-gray-900 dark:text-white">
                                {formatValue(data?.avg_hourly_earnings ?? null, '$')}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Insight Box */}
            <div className="mt-6 p-4 bg-emerald-500/10 rounded-xl border border-emerald-500/20">
                <p className="text-sm text-emerald-300">
                    <strong>For Estimators:</strong> High employment + low hours = capacity available. High employment + high hours = tight labor market.
                </p>
            </div>
        </motion.div>
    );
}
