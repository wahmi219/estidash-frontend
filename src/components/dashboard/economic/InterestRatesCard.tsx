'use client';

import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown, Minus, DollarSign, HelpCircle } from 'lucide-react';
import clsx from 'clsx';
import { InterestRates } from '@/store/slices/economicSlice';

interface InterestRatesCardProps {
    data: InterestRates | null;
    isLoading?: boolean;
}

const RATE_INFO = {
    mortgage_30y: {
        label: '30-Year Mortgage',
        description: 'Standard home loan rate. Higher rates = more expensive to build/buy.',
        threshold: { low: 5, high: 7 },
    },
    mortgage_15y: {
        label: '15-Year Mortgage',
        description: 'Shorter-term loans, usually 0.5-1% lower than 30-year.',
        threshold: { low: 4, high: 6 },
    },
    fed_funds: {
        label: 'Fed Funds Rate',
        description: "Federal Reserve's target rate. Drives all other interest rates.",
        threshold: { low: 3, high: 5 },
    },
    prime_rate: {
        label: 'Prime Rate',
        description: 'Base rate banks charge. Affects construction loans directly.',
        threshold: { low: 6, high: 8 },
    },
};

export function InterestRatesCard({ data, isLoading = false }: InterestRatesCardProps) {
    const getRateStatus = (value: number | string | null, key: keyof typeof RATE_INFO) => {
        if (value === null) return 'neutral';
        const numValue = typeof value === 'string' ? parseFloat(value) : value;
        if (isNaN(numValue)) return 'neutral';
        const { low, high } = RATE_INFO[key].threshold;
        if (numValue <= low) return 'favorable';
        if (numValue >= high) return 'unfavorable';
        return 'moderate';
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'favorable':
                return 'text-emerald-400';
            case 'unfavorable':
                return 'text-rose-400';
            default:
                return 'text-amber-400';
        }
    };

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'favorable':
                return <TrendingDown className="w-4 h-4" />;
            case 'unfavorable':
                return <TrendingUp className="w-4 h-4" />;
            default:
                return <Minus className="w-4 h-4" />;
        }
    };

    const formatRate = (value: number | string | null) => {
        if (value === null) return '—';
        const numValue = typeof value === 'string' ? parseFloat(value) : value;
        if (isNaN(numValue)) return '—';
        return `${numValue.toFixed(2)}%`;
    };

    const rates = [
        { key: 'mortgage_30y' as const, value: data?.mortgage_30y },
        { key: 'mortgage_15y' as const, value: data?.mortgage_15y },
        { key: 'fed_funds' as const, value: data?.fed_funds },
        { key: 'prime_rate' as const, value: data?.prime_rate },
    ];

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="bg-gradient-to-br from-white to-gray-50 dark:from-gray-900/90 dark:to-gray-800/90 rounded-2xl p-6 border border-gray-200 dark:border-gray-700/50 shadow-xl"
        >
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-500/20 rounded-xl">
                        <DollarSign className="w-5 h-5 text-blue-400" />
                    </div>
                    <div>
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Interest Rates</h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400">FRED Federal Reserve Data</p>
                    </div>
                </div>
                {data?.as_of_date && (
                    <span className="text-xs text-gray-500">
                        As of {new Date(data.as_of_date).toLocaleDateString()}
                    </span>
                )}
            </div>

            {/* Rates Grid */}
            {isLoading ? (
                <div className="space-y-4">
                    {[1, 2, 3, 4].map((i) => (
                        <div key={i} className="animate-pulse">
                            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/3 mb-2"></div>
                            <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="space-y-4">
                    {rates.map(({ key, value }) => {
                        const status = getRateStatus(value ?? null, key);
                        const info = RATE_INFO[key];
                        return (
                            <div
                                key={key}
                                className="p-4 bg-gray-100 dark:bg-gray-800/50 rounded-xl border border-gray-200 dark:border-gray-700/30 hover:border-gray-300 dark:hover:border-gray-600/50 transition-colors group"
                            >
                                <div className="flex items-center justify-between">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2">
                                            <span className="text-sm text-gray-600 dark:text-gray-300">{info.label}</span>
                                            <div className="relative group/tooltip">
                                                <HelpCircle className="w-3.5 h-3.5 text-gray-500 cursor-help" />
                                                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-white dark:bg-gray-900 text-xs text-gray-600 dark:text-gray-300 rounded-lg opacity-0 group-hover/tooltip:opacity-100 transition-opacity pointer-events-none w-48 z-10 shadow-xl border border-gray-200 dark:border-gray-700">
                                                    {info.description}
                                                </div>
                                            </div>
                                        </div>
                                        <div className={clsx('text-2xl font-bold mt-1', getStatusColor(status))}>
                                            {formatRate(value ?? null)}
                                        </div>
                                    </div>
                                    <div className={clsx('p-2 rounded-lg', getStatusColor(status))}>
                                        {getStatusIcon(status)}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Insight Box */}
            <div className="mt-6 p-4 bg-blue-500/10 rounded-xl border border-blue-500/20">
                <p className="text-sm text-blue-300">
                    <strong>For Estimators:</strong> Higher rates often mean slower project timelines and more price sensitivity from clients.
                </p>
            </div>
        </motion.div>
    );
}
