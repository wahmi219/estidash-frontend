'use client';

import { motion } from 'framer-motion';
import { Zap, RefreshCw, AlertTriangle, ArrowUpRight, TrendingUp, TrendingDown } from 'lucide-react';
import clsx from 'clsx';
import { VelocityAlertItem } from '@/types';
import MarkdownRenderer from '@/components/common/MarkdownRenderer';

interface VelocityAlertsCardProps {
    isLoading?: boolean;
    answer?: string;
    alerts?: VelocityAlertItem[];
    onRefresh?: () => void;
}

export function VelocityAlertsCard({
    isLoading = false,
    answer,
    alerts = [],
    onRefresh,
}: VelocityAlertsCardProps) {
    const hasAlerts = alerts && alerts.length > 0;

    const formatNumber = (value: number) => {
        return new Intl.NumberFormat('en-US').format(value);
    };

    const getRiskBadge = (risk: string) => {
        switch (risk) {
            case 'high':
                return { label: 'High Risk', color: 'bg-rose-500/20 text-rose-400 border-rose-500/30' };
            case 'medium':
                return { label: 'Medium', color: 'bg-amber-500/20 text-amber-400 border-amber-500/30' };
            default:
                return { label: 'Low', color: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' };
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="intelligence-panel hover-glow h-full"
        >
            <div className="intelligence-header">
                <div className="flex items-center gap-3">
                    <div className="p-2 rounded-xl bg-gradient-to-br from-violet-500/20 to-purple-500/20">
                        <Zap className="w-5 h-5 text-violet-400" />
                    </div>
                    <div>
                        <h3 className="font-semibold text-gray-900 dark:text-white">Velocity Alerts</h3>
                        <p className="text-xs text-gray-500">Sudden market movements</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-violet-500/10">
                        <AlertTriangle className="w-4 h-4 text-violet-400" />
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
                            <div key={i} className="flex items-center gap-3 p-3 rounded-lg bg-white/5">
                                <div className="skeleton h-8 w-8 rounded-full" />
                                <div className="flex-1">
                                    <div className="skeleton h-4 w-3/4 mb-1" />
                                    <div className="skeleton h-3 w-1/2" />
                                </div>
                                <div className="skeleton h-6 w-16 rounded-full" />
                            </div>
                        ))}
                    </div>
                ) : hasAlerts ? (
                    <div className="space-y-3 max-h-[350px] overflow-y-auto hide-scrollbar">
                        {alerts.map((alert, index) => {
                            const isSpike = alert.alert_type === 'spike';
                            const riskBadge = getRiskBadge(alert.peak_risk);

                            return (
                                <motion.div
                                    key={`${alert.name}-${index}`}
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: index * 0.1 }}
                                    className="flex items-center gap-3 p-3 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
                                >
                                    <div className={clsx(
                                        'p-2 rounded-full',
                                        isSpike ? 'bg-emerald-500/20' : 'bg-rose-500/20'
                                    )}>
                                        {isSpike ? (
                                            <TrendingUp className="w-4 h-4 text-emerald-400" />
                                        ) : (
                                            <TrendingDown className="w-4 h-4 text-rose-400" />
                                        )}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                                            {alert.name}
                                        </p>
                                        <p className="text-xs text-gray-500">
                                            {formatNumber(alert.current_month)} permits •
                                            Avg: {formatNumber(alert.avg_monthly)}
                                        </p>
                                    </div>
                                    <div className="flex flex-col items-end gap-1">
                                        <span className={clsx(
                                            'text-sm font-bold',
                                            isSpike ? 'text-emerald-400' : 'text-rose-400'
                                        )}>
                                            {isSpike ? '+' : ''}{Number(alert.velocity_change).toFixed(0)}%
                                        </span>
                                        <span className={clsx(
                                            'text-xs px-2 py-0.5 rounded-full border',
                                            riskBadge.color
                                        )}>
                                            {riskBadge.label}
                                        </span>
                                    </div>
                                </motion.div>
                            );
                        })}

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
                        <p>No alerts at this time</p>
                        <button
                            onClick={onRefresh}
                            className="mt-2 text-sm text-cyan-400 hover:text-cyan-300 flex items-center gap-1 mx-auto"
                        >
                            Check for alerts <ArrowUpRight size={14} />
                        </button>
                    </div>
                )}
            </div>
        </motion.div>
    );
}
