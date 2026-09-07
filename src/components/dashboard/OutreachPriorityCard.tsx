'use client';

import { motion } from 'framer-motion';
import { Users, RefreshCw, ArrowUpRight, MapPin, AlertCircle, CheckCircle, Trophy } from 'lucide-react';
import clsx from 'clsx';
import { OutreachItem } from '@/types';
import MarkdownRenderer from '@/components/common/MarkdownRenderer';

interface OutreachPriorityCardProps {
    isLoading?: boolean;
    answer?: string;
    priorityList?: OutreachItem[];
    avoidList?: OutreachItem[];
    onRefresh?: () => void;
}

export function OutreachPriorityCard({
    isLoading = false,
    answer,
    priorityList = [],
    avoidList = [],
    onRefresh,
}: OutreachPriorityCardProps) {
    const hasData = priorityList && priorityList.length > 0;

    const formatNumber = (value: number) => {
        return new Intl.NumberFormat('en-US').format(value);
    };

    const formatCurrency = (value: number) => {
        if (value >= 1000) {
            return `$${(value / 1000).toFixed(1)}M`;
        }
        return `$${value.toFixed(0)}K`;
    };

    const getScoreColor = (score: number) => {
        if (score >= 70) return 'text-emerald-400 bg-emerald-500/20';
        if (score >= 40) return 'text-amber-400 bg-amber-500/20';
        return 'text-rose-400 bg-rose-500/20';
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="intelligence-panel hover-glow"
        >
            <div className="intelligence-header">
                <div className="flex items-center gap-3">
                    <div className="p-2 rounded-xl bg-gradient-to-br from-rose-500/20 to-pink-500/20">
                        <Users className="w-5 h-5 text-rose-400" />
                    </div>
                    <div>
                        <h3 className="font-semibold text-gray-900 dark:text-white">Outreach Priority</h3>
                        <p className="text-xs text-gray-500">Where to focus your efforts</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
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
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                            <div className="skeleton h-4 w-24 mb-3" />
                            <div className="space-y-2">
                                <div className="skeleton h-6 w-full" />
                                <div className="skeleton h-6 w-full" />
                                <div className="skeleton h-6 w-3/4" />
                            </div>
                        </div>
                        <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                            <div className="skeleton h-4 w-24 mb-3" />
                            <div className="space-y-2">
                                <div className="skeleton h-6 w-full" />
                                <div className="skeleton h-6 w-3/4" />
                            </div>
                        </div>
                    </div>
                ) : hasData ? (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        {/* Priority List */}
                        <div className="p-4 rounded-xl bg-gradient-to-br from-emerald-500/10 to-teal-500/10 border border-emerald-500/20">
                            <div className="flex items-center gap-2 mb-3">
                                <Trophy className="w-4 h-4 text-emerald-400" />
                                <span className="text-xs text-emerald-400 uppercase tracking-wider font-medium">
                                    Top Priorities
                                </span>
                            </div>
                            <div className="space-y-2 max-h-[300px] overflow-y-auto hide-scrollbar">
                                {priorityList.slice(0, 5).map((item, index) => (
                                    <motion.div
                                        key={`priority-${index}`}
                                        initial={{ opacity: 0, x: -10 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: index * 0.1 }}
                                        className="flex items-center gap-3 p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
                                    >
                                        <div className="flex items-center justify-center w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 text-xs font-bold">
                                            {index + 1}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                                                {item.name}
                                            </p>
                                            <p className="text-xs text-gray-500">
                                                {formatNumber(item.total_permits)} permits • {item.trade_focus}
                                            </p>
                                        </div>
                                        <div className={clsx(
                                            'text-xs font-bold px-2 py-1 rounded',
                                            getScoreColor(item.priority_score)
                                        )}>
                                            {Number(item.priority_score).toFixed(0)}
                                        </div>
                                    </motion.div>
                                ))}
                            </div>
                        </div>

                        {/* Avoid List & Insights */}
                        <div className="space-y-4">
                            {/* Areas to Avoid */}
                            {avoidList && avoidList.length > 0 && (
                                <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20">
                                    <div className="flex items-center gap-2 mb-3">
                                        <AlertCircle className="w-4 h-4 text-rose-400" />
                                        <span className="text-xs text-rose-400 uppercase tracking-wider font-medium">
                                            Lower Priority
                                        </span>
                                    </div>
                                    <div className="space-y-2">
                                        {avoidList.slice(0, 3).map((item, index) => (
                                            <div
                                                key={`avoid-${index}`}
                                                className="flex items-center gap-2 text-sm"
                                            >
                                                <span className="text-gray-500">•</span>
                                                <span className="text-gray-500 dark:text-gray-400 truncate flex-1">
                                                    {item.name}
                                                </span>
                                                <span className="text-xs text-rose-400 bg-rose-500/20 px-2 py-0.5 rounded">
                                                    {Number(item.priority_score).toFixed(0)}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* AI Insight */}
                            {answer && (
                                <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                                    <div className="flex items-center gap-2 mb-2">
                                        <CheckCircle className="w-4 h-4 text-cyan-400" />
                                        <span className="text-xs text-gray-500 uppercase tracking-wider">
                                            Action
                                        </span>
                                    </div>
                                    <div className="prose prose-invert prose-sm max-w-none">
                                        <div className="max-h-[150px] overflow-y-auto hide-scrollbar">
                                            <MarkdownRenderer content={answer} />
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                ) : answer ? (
                    <div className="prose prose-invert prose-sm max-w-none max-h-[400px] overflow-y-auto hide-scrollbar">
                        <MarkdownRenderer content={answer} />
                    </div>
                ) : (
                    <div className="text-center py-8 text-gray-500">
                        <p>No outreach suggestions available</p>
                        <button
                            onClick={onRefresh}
                            className="mt-2 text-sm text-cyan-400 hover:text-cyan-300 flex items-center gap-1 mx-auto"
                        >
                            Get suggestions <ArrowUpRight size={14} />
                        </button>
                    </div>
                )}
            </div>
        </motion.div>
    );
}
