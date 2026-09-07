'use client';

import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown, Minus, DollarSign } from 'lucide-react';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, ReferenceLine,
} from 'recharts';
import clsx from 'clsx';
import { InterestRates } from '@/store/slices/economicSlice';
import { useChartTheme } from '@/utils/chartTheme';

interface InterestRatesTrendChartProps {
    data: InterestRates | null;
    isLoading?: boolean;
}

interface RateConfig {
    key: keyof InterestRates;
    label: string;
    shortLabel: string;
    threshold: { low: number; high: number };
    color: { favorable: string; moderate: string; unfavorable: string };
}

const RATES: RateConfig[] = [
    {
        key: 'mortgage_30y',
        label: '30-Year Mortgage',
        shortLabel: '30Y',
        threshold: { low: 5, high: 7 },
        color: { favorable: '#10b981', moderate: '#f59e0b', unfavorable: '#f43f5e' },
    },
    {
        key: 'mortgage_15y',
        label: '15-Year Mortgage',
        shortLabel: '15Y',
        threshold: { low: 4, high: 6 },
        color: { favorable: '#10b981', moderate: '#f59e0b', unfavorable: '#f43f5e' },
    },
    {
        key: 'fed_funds',
        label: 'Fed Funds Rate',
        shortLabel: 'Fed',
        threshold: { low: 3, high: 5 },
        color: { favorable: '#10b981', moderate: '#f59e0b', unfavorable: '#f43f5e' },
    },
    {
        key: 'prime_rate',
        label: 'Prime Rate',
        shortLabel: 'Prime',
        threshold: { low: 6, high: 8 },
        color: { favorable: '#10b981', moderate: '#f59e0b', unfavorable: '#f43f5e' },
    },
];

export function InterestRatesTrendChart({ data, isLoading = false }: InterestRatesTrendChartProps) {
    const chartColors = useChartTheme();

    const CustomTooltip = ({ active, payload }: any) => {
        if (!active || !payload?.length) return null;
        const data = payload[0]?.payload;
        return (
            <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 px-4 py-3 rounded-xl shadow-xl">
                <p className="text-sm text-gray-600 dark:text-gray-300 font-medium">{data?.fullLabel}</p>
                <p className="text-lg font-bold mt-1" style={{ color: payload[0]?.fill }}>
                    {data?.rate?.toFixed(2)}%
                </p>
                <p className="text-xs text-gray-500 mt-1">{data?.status}</p>
            </div>
        );
    };
    const toNumber = (val: any): number | null => {
        if (val === null || val === undefined) return null;
        const num = typeof val === 'string' ? parseFloat(val) : val;
        return isNaN(num) ? null : num;
    };

    const getStatus = (value: number, config: RateConfig) => {
        if (value <= config.threshold.low) return { status: 'Favorable', color: config.color.favorable };
        if (value >= config.threshold.high) return { status: 'Unfavorable', color: config.color.unfavorable };
        return { status: 'Moderate', color: config.color.moderate };
    };

    const chartData = RATES
        .map(config => {
            const rate = toNumber(data?.[config.key]);
            if (rate === null) return null;
            const statusInfo = getStatus(rate, config);
            return {
                name: config.shortLabel,
                fullLabel: config.label,
                rate,
                fill: statusInfo.color,
                status: statusInfo.status,
            };
        })
        .filter(Boolean) as { name: string; fullLabel: string; rate: number; fill: string; status: string }[];

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'Favorable': return <TrendingDown className="w-3.5 h-3.5 text-emerald-400" />;
            case 'Unfavorable': return <TrendingUp className="w-3.5 h-3.5 text-rose-400" />;
            default: return <Minus className="w-3.5 h-3.5 text-amber-400" />;
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="bg-white dark:bg-gradient-to-br dark:from-gray-900/90 dark:to-gray-800/90 rounded-2xl p-6 border border-gray-200 dark:border-gray-700/50 shadow-xl"
        >
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

            {isLoading ? (
                <div className="animate-pulse h-[220px] bg-gray-200 dark:bg-gray-700/30 rounded-xl" />
            ) : chartData.length === 0 ? (
                <div className="h-[220px] flex items-center justify-center text-gray-500 text-sm">
                    Sync FRED data to view interest rates
                </div>
            ) : (
                <>
                    {/* Chart */}
                    <ResponsiveContainer width="100%" height={200}>
                        <BarChart data={chartData} barSize={40}>
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
                                tickFormatter={(v) => `${v}%`}
                                domain={[0, 'dataMax + 1']}
                            />
                            <Tooltip content={<CustomTooltip />} cursor={{ fill: chartColors.grid + '20' }} />
                            <Bar dataKey="rate" radius={[6, 6, 0, 0]}>
                                {chartData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={entry.fill} fillOpacity={0.85} />
                                ))}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>

                    {/* Rate Cards */}
                    <div className="grid grid-cols-2 gap-2 mt-4">
                        {chartData.map(item => (
                            <div key={item.name} className="flex items-center justify-between p-2.5 bg-gray-100 dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700/30">
                                <div className="flex items-center gap-2">
                                    {getStatusIcon(item.status)}
                                    <span className="text-xs text-gray-600 dark:text-gray-300">{item.fullLabel}</span>
                                </div>
                                <span className="text-sm font-bold" style={{ color: item.fill }}>
                                    {item.rate.toFixed(2)}%
                                </span>
                            </div>
                        ))}
                    </div>
                </>
            )}

            <div className="mt-4 p-3 bg-blue-500/10 rounded-xl border border-blue-500/20">
                <p className="text-xs text-blue-300">
                    <strong>Insight:</strong> Higher rates slow construction and increase project financing costs. Green = favorable for building.
                </p>
            </div>
        </motion.div>
    );
}
