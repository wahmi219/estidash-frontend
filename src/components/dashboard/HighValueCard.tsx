'use client';

import { motion } from 'framer-motion';
import { DollarSign, RefreshCw, Gem, ArrowUpRight, Building2, Home } from 'lucide-react';
import clsx from 'clsx';
import { CBSAItem } from '@/types';
import MarkdownRenderer from '@/components/common/MarkdownRenderer';

interface HighValueCardProps {
    isLoading?: boolean;
    answer?: string;
    cbsas?: CBSAItem[];
    onRefresh?: () => void;
}

export function HighValueCard({
    isLoading = false,
    answer,
    cbsas = [],
    onRefresh,
}: HighValueCardProps) {
    const hasData = cbsas && cbsas.length > 0;

    const formatCurrency = (value: number) => {
        if (value >= 1000) {
            return `$${(value / 1000).toFixed(1)}M`;
        }
        return `$${value.toFixed(0)}K`;
    };

    const formatNumber = (value: number) => {
        return new Intl.NumberFormat('en-US').format(value);
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="intelligence-panel hover-glow h-full"
        >
            <div className="intelligence-header">
                <div className="flex items-center gap-3">
                    <div className="p-2 rounded-xl bg-gradient-to-br from-amber-500/20 to-yellow-500/20">
                        <DollarSign className="w-5 h-5 text-amber-400" />
                    </div>
                    <div>
                        <h3 className="font-semibold text-gray-900 dark:text-white">High-Value Permits</h3>
                        <p className="text-xs text-gray-500">Premium construction markets</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-amber-500/10">
                        <Gem className="w-4 h-4 text-amber-400" />
                    </div>
                    {onRefresh && (
                        <button
                            onClick={onRefresh}
                            disabled={isLoading}
                            className="p-2 rounded-lg hover:bg-white/5 transition-colors"
                        >
                            <RefreshCw className={clsx(
                                'w-4 h-4 text-gray-400',
                                isLoading && 'animate-spin'
                            )} />
                        </button>
                    )}
                </div>
            </div>

            <div className="intelligence-body">
                {isLoading ? (
                    <div className="space-y-3">
                        {[...Array(4)].map((_, i) => (
                            <div key={i} className="flex items-center gap-3">
                                <div className="skeleton h-10 w-10 rounded-lg" />
                                <div className="flex-1">
                                    <div className="skeleton h-4 w-3/4 mb-2" />
                                    <div className="skeleton h-3 w-1/2" />
                                </div>
                            </div>
                        ))}
                    </div>
                ) : hasData ? (
                    <div className="space-y-3 max-h-[350px] overflow-y-auto hide-scrollbar">
                        {cbsas.map((cbsa, index) => (
                            <motion.div
                                key={`${cbsa.name}-${index}`}
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: index * 0.1 }}
                                className="flex items-center gap-3 p-3 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
                            >
                                <div className={clsx(
                                    'p-2 rounded-lg',
                                    cbsa.is_commercial_heavy
                                        ? 'bg-purple-500/20'
                                        : 'bg-emerald-500/20'
                                )}>
                                    {cbsa.is_commercial_heavy ? (
                                        <Building2 className="w-4 h-4 text-purple-400" />
                                    ) : (
                                        <Home className="w-4 h-4 text-emerald-400" />
                                    )}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                                        {cbsa.name}
                                    </p>
                                    <p className="text-xs text-gray-500">
                                        {formatNumber(cbsa.total_permits)} permits •
                                        {cbsa.is_commercial_heavy ? ' Commercial' : ' Residential'}
                                    </p>
                                </div>
                                <div className="text-right">
                                    <p className="text-lg font-bold text-amber-400">
                                        {formatCurrency(cbsa.value_per_permit)}
                                    </p>
                                    <p className="text-xs text-gray-500">per permit</p>
                                </div>
                            </motion.div>
                        ))}

                        {/* AI Insight */}
                        {answer && (
                            <div className="pt-4 mt-4 border-t border-white/10">
                                <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">Analysis</p>
                                <div className="prose prose-invert prose-sm max-w-none">
                                    <MarkdownRenderer content={answer} />
                                </div>
                            </div>
                        )}
                    </div>
                ) : answer ? (
                    <div className="prose prose-invert prose-sm max-w-none max-h-[300px] overflow-y-auto hide-scrollbar">
                        <MarkdownRenderer content={answer} />
                    </div>
                ) : (
                    <div className="text-center py-8 text-gray-500">
                        <p>No data available</p>
                        <button
                            onClick={onRefresh}
                            className="mt-2 text-sm text-cyan-400 hover:text-cyan-300 flex items-center gap-1 mx-auto"
                        >
                            Load data <ArrowUpRight size={14} />
                        </button>
                    </div>
                )}
            </div>
        </motion.div>
    );
}
