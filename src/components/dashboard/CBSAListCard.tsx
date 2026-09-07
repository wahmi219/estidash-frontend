'use client';

import { motion } from 'framer-motion';
import { Flame, Snowflake, RefreshCw, TrendingUp, TrendingDown, ArrowUpRight } from 'lucide-react';
import clsx from 'clsx';
import MarkdownRenderer from '@/components/common/MarkdownRenderer';

interface CBSAListCardProps {
    title: string;
    subtitle: string;
    type: 'hot' | 'cooling';
    isLoading?: boolean;
    answer?: string;
    onRefresh?: () => void;
}

export function CBSAListCard({
    title,
    subtitle,
    type,
    isLoading = false,
    answer,
    onRefresh,
}: CBSAListCardProps) {
    const isHot = type === 'hot';
    const Icon = isHot ? Flame : Snowflake;
    const TrendIcon = isHot ? TrendingUp : TrendingDown;

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="intelligence-panel hover-glow h-full"
        >
            <div className="intelligence-header">
                <div className="flex items-center gap-3">
                    <div className={clsx(
                        'p-2 rounded-xl',
                        isHot
                            ? 'bg-gradient-to-br from-orange-500/20 to-rose-500/20'
                            : 'bg-gradient-to-br from-blue-500/20 to-cyan-500/20'
                    )}>
                        <Icon className={clsx(
                            'w-5 h-5',
                            isHot ? 'text-orange-400' : 'text-blue-400'
                        )} />
                    </div>
                    <div>
                        <h3 className="font-semibold text-gray-900 dark:text-white">{title}</h3>
                        <p className="text-xs text-gray-500">{subtitle}</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <div className={clsx(
                        'p-1.5 rounded-lg',
                        isHot ? 'bg-orange-500/10' : 'bg-blue-500/10'
                    )}>
                        <TrendIcon className={clsx(
                            'w-4 h-4',
                            isHot ? 'text-orange-400' : 'text-blue-400'
                        )} />
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
                        {[...Array(5)].map((_, i) => (
                            <div key={i} className="flex items-center gap-3">
                                <div className="skeleton h-4 w-4 rounded" />
                                <div className="skeleton h-4 flex-1" />
                                <div className="skeleton h-4 w-16" />
                            </div>
                        ))}
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
