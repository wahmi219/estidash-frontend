'use client';

import { motion } from 'framer-motion';
import { Target, RefreshCw, ArrowUpRight, CheckCircle2, Home, Building2, Users } from 'lucide-react';
import clsx from 'clsx';
import { IntelligenceData } from '@/types';
import MarkdownRenderer from '@/components/common/MarkdownRenderer';

interface TradeOpportunityCardProps {
    isLoading?: boolean;
    answer?: string;
    data?: IntelligenceData | null;
    onRefresh?: () => void;
}

export function TradeOpportunityCard({
    isLoading = false,
    answer,
    data,
    onRefresh,
}: TradeOpportunityCardProps) {
    const hasData = data && data.primary_trade;

    const getConfidenceBadge = (confidence?: string) => {
        switch (confidence) {
            case 'High':
                return { color: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30', icon: '🟢' };
            case 'Medium':
                return { color: 'bg-amber-500/20 text-amber-400 border-amber-500/30', icon: '🟡' };
            default:
                return { color: 'bg-rose-500/20 text-rose-400 border-rose-500/30', icon: '🔴' };
        }
    };

    const getTradeIcon = (trade?: string) => {
        if (!trade) return <Target className="w-5 h-5 text-gray-400" />;
        if (trade.toLowerCase().includes('single') || trade.toLowerCase().includes('residential')) {
            return <Home className="w-5 h-5 text-emerald-400" />;
        }
        if (trade.toLowerCase().includes('multi') || trade.toLowerCase().includes('commercial')) {
            return <Building2 className="w-5 h-5 text-purple-400" />;
        }
        return <Users className="w-5 h-5 text-blue-400" />;
    };

    const formatNumber = (value: number) => {
        return new Intl.NumberFormat('en-US').format(value);
    };

    const confidenceBadge = getConfidenceBadge(data?.confidence);

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="intelligence-panel hover-glow h-full"
        >
            <div className="intelligence-header">
                <div className="flex items-center gap-3">
                    <div className="p-2 rounded-xl bg-gradient-to-br from-emerald-500/20 to-teal-500/20">
                        <Target className="w-5 h-5 text-emerald-400" />
                    </div>
                    <div>
                        <h3 className="font-semibold text-gray-900 dark:text-white">Trade Opportunity</h3>
                        <p className="text-xs text-gray-500">Recommended trades to pursue</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    {hasData && (
                        <div className={clsx(
                            'text-xs px-2 py-1 rounded-full border',
                            confidenceBadge.color
                        )}>
                            {confidenceBadge.icon} {data.confidence}
                        </div>
                    )}
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
                    <div className="space-y-4">
                        <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                            <div className="skeleton h-4 w-24 mb-2" />
                            <div className="skeleton h-6 w-full" />
                        </div>
                        <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                            <div className="skeleton h-4 w-24 mb-2" />
                            <div className="skeleton h-6 w-full" />
                        </div>
                        <div className="flex justify-between items-center">
                            <div className="skeleton h-4 w-20" />
                            <div className="skeleton h-6 w-16 rounded-full" />
                        </div>
                    </div>
                ) : hasData ? (
                    <div className="space-y-4">
                        {/* Primary Trade */}
                        <div className="p-4 rounded-xl bg-gradient-to-br from-emerald-500/10 to-teal-500/10 border border-emerald-500/20">
                            <div className="flex items-center gap-2 mb-2">
                                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                                <span className="text-xs text-emerald-400 uppercase tracking-wider font-medium">
                                    Primary Recommendation
                                </span>
                            </div>
                            <div className="flex items-center gap-3">
                                <div className="p-2 rounded-lg bg-white/10">
                                    {getTradeIcon(data.primary_trade)}
                                </div>
                                <div className="flex-1">
                                    <p className="text-lg font-bold text-gray-900 dark:text-white">
                                        {data.primary_trade}
                                    </p>
                                    <p className="text-sm text-gray-500 dark:text-gray-400">
                                        {Number(data.primary_trade_ratio || 0).toFixed(1)}% of market
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Secondary Trade */}
                        <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                            <div className="flex items-center gap-2 mb-2">
                                <span className="text-xs text-gray-500 uppercase tracking-wider">
                                    Secondary Opportunity
                                </span>
                            </div>
                            <div className="flex items-center gap-3">
                                <div className="p-2 rounded-lg bg-white/10">
                                    {getTradeIcon(data.secondary_trade)}
                                </div>
                                <div className="flex-1">
                                    <p className="text-base font-medium text-gray-900 dark:text-white">
                                        {data.secondary_trade}
                                    </p>
                                    <p className="text-sm text-gray-500">
                                        {Number(data.secondary_trade_ratio || 0).toFixed(1)}% of market
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Permit Breakdown */}
                        {data.total_permits && (
                            <div className="grid grid-cols-3 gap-3 pt-2">
                                <div className="text-center">
                                    <p className="text-xs text-gray-500">Single-Family</p>
                                    <p className="text-sm font-bold text-gray-900 dark:text-white">
                                        {formatNumber(data.single_family || 0)}
                                    </p>
                                    <p className="text-xs text-gray-500">
                                        {Number(data.single_family_ratio || 0).toFixed(0)}%
                                    </p>
                                </div>
                                <div className="text-center border-x border-gray-200 dark:border-white/10">
                                    <p className="text-xs text-gray-500">Multi-Family</p>
                                    <p className="text-sm font-bold text-gray-900 dark:text-white">
                                        {formatNumber(data.multi_family || 0)}
                                    </p>
                                    <p className="text-xs text-gray-500">
                                        {Number(data.multi_family_ratio || 0).toFixed(0)}%
                                    </p>
                                </div>
                                <div className="text-center">
                                    <p className="text-xs text-gray-500">Total</p>
                                    <p className="text-sm font-bold text-gray-900 dark:text-white">
                                        {formatNumber(data.total_permits)}
                                    </p>
                                </div>
                            </div>
                        )}

                        {/* AI Insight */}
                        {answer && (
                            <div className="pt-4 border-t border-white/10">
                                <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">Action</p>
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
