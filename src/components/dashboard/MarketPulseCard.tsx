'use client';

import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown, Minus, Activity, RefreshCw } from 'lucide-react';
import clsx from 'clsx';
import { IntelligenceData } from '@/types';
import MarkdownRenderer from '@/components/common/MarkdownRenderer';

interface MarketPulseCardProps {
    permitsMoMChange?: number;
    valuationMoMChange?: number;
    marketState?: 'expanding' | 'flat' | 'cooling';
    isLoading?: boolean;
    answer?: string;
    data?: IntelligenceData | null;
    onRefresh?: () => void;
}

export function MarketPulseCard({
    permitsMoMChange: propPermitsMoM,
    valuationMoMChange: propValuationMoM,
    marketState: propMarketState,
    isLoading = false,
    answer,
    data,
    onRefresh,
}: MarketPulseCardProps) {
    // Use structured data if available, otherwise fall back to props
    const permitsMoMChange = data?.permits_mom_change ?? propPermitsMoM ?? 0;
    const valuationMoMChange = data?.valuation_mom_change ?? propValuationMoM ?? 0;
    const marketState = data?.market_state ?? propMarketState ?? 'flat';
    const currentPeriod = data?.current_period;
    const totalPermits = data?.current_permits;
    const totalValuation = data?.current_valuation;

    const getStateConfig = () => {
        switch (marketState) {
            case 'expanding':
                return {
                    label: 'Expanding',
                    color: 'text-emerald-400',
                    bgColor: 'bg-emerald-500/10',
                    borderColor: 'border-emerald-500/20',
                    icon: <TrendingUp className="w-5 h-5" />,
                };
            case 'cooling':
                return {
                    label: 'Cooling',
                    color: 'text-rose-400',
                    bgColor: 'bg-rose-500/10',
                    borderColor: 'border-rose-500/20',
                    icon: <TrendingDown className="w-5 h-5" />,
                };
            default:
                return {
                    label: 'Stable',
                    color: 'text-amber-400',
                    bgColor: 'bg-amber-500/10',
                    borderColor: 'border-amber-500/20',
                    icon: <Minus className="w-5 h-5" />,
                };
        }
    };

    const stateConfig = getStateConfig();

    const formatChange = (value: number) => {
        const prefix = value >= 0 ? '+' : '';
        return `${prefix}${value.toFixed(1)}%`;
    };

    const formatNumber = (value: number) => {
        return new Intl.NumberFormat('en-US').format(value);
    };

    const formatCurrency = (value: number) => {
        // Value is in thousands, convert to millions for display
        if (value >= 1000000) {
            return `$${(value / 1000000).toFixed(1)}B`;
        } else if (value >= 1000) {
            return `$${(value / 1000).toFixed(1)}M`;
        }
        return `$${value}K`;
    };

    const hasData = data || (permitsMoMChange !== 0 || valuationMoMChange !== 0);

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="intelligence-panel hover-glow"
        >
            <div className="intelligence-header">
                <div className="flex items-center gap-3">
                    <div className="p-2 rounded-xl bg-gradient-to-br from-cyan-500/20 to-purple-500/20">
                        <Activity className="w-5 h-5 text-cyan-400" />
                    </div>
                    <div>
                        <h3 className="font-semibold text-gray-900 dark:text-white">Market Pulse Pluse</h3>
                        <p className="text-xs text-gray-500">
                            {currentPeriod ? `Period: ${currentPeriod}` : 'Overall market health'}
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <div className={clsx(
                        'badge',
                        stateConfig.bgColor,
                        stateConfig.borderColor,
                        stateConfig.color
                    )}>
                        {stateConfig.icon}
                        <span className="ml-1">{stateConfig.label}</span>
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
                    <div className="space-y-4">
                        <div className="skeleton h-6 w-full" />
                        <div className="skeleton h-6 w-3/4" />
                        <div className="skeleton h-6 w-1/2" />
                    </div>
                ) : hasData ? (
                    <div className="space-y-6">
                        {/* Metrics Grid */}
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                            <div className="space-y-1">
                                <p className="text-xs text-gray-500 uppercase tracking-wider">Permits MoM</p>
                                <p className={clsx(
                                    'text-2xl font-bold metric-value',
                                    permitsMoMChange >= 0 ? 'trend-up' : 'trend-down'
                                )}>
                                    {formatChange(permitsMoMChange)}
                                </p>
                            </div>
                            <div className="space-y-1">
                                <p className="text-xs text-gray-500 uppercase tracking-wider">Valuation MoM</p>
                                <p className={clsx(
                                    'text-2xl font-bold metric-value',
                                    valuationMoMChange >= 0 ? 'trend-up' : 'trend-down'
                                )}>
                                    {formatChange(valuationMoMChange)}
                                </p>
                            </div>
                            {totalPermits !== undefined && (
                                <div className="space-y-1">
                                    <p className="text-xs text-gray-500 uppercase tracking-wider">Total Permits</p>
                                    <p className="text-2xl font-bold text-gray-900 dark:text-white">
                                        {formatNumber(totalPermits)}
                                    </p>
                                </div>
                            )}
                            {totalValuation !== undefined && (
                                <div className="space-y-1">
                                    <p className="text-xs text-gray-500 uppercase tracking-wider">Total Value</p>
                                    <p className="text-2xl font-bold text-gray-900 dark:text-white">
                                        {formatCurrency(totalValuation)}
                                    </p>
                                </div>
                            )}
                        </div>

                        {/* AI Insight */}
                        {answer && (
                            <div className="pt-4 border-t border-white/10">
                                <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">AI Insight</p>
                                <div className="prose prose-invert prose-sm max-w-none">
                                    <MarkdownRenderer content={answer} />
                                </div>
                            </div>
                        )}
                    </div>
                ) : answer ? (
                    <div className="prose prose-invert prose-sm max-w-none">
                        <MarkdownRenderer content={answer} />
                    </div>
                ) : (
                    <div className="text-center py-8 text-gray-500">
                        <p>No data available</p>
                        <button
                            onClick={onRefresh}
                            className="mt-2 text-sm text-cyan-400 hover:text-cyan-300"
                        >
                            Load market pulse
                        </button>
                    </div>
                )}
            </div>
        </motion.div>
    );
}
