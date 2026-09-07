'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRightLeft, Info, ChevronDown, ChevronUp, AlertTriangle, CheckCircle, MinusCircle } from 'lucide-react';
import {
    Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
    ResponsiveContainer, Tooltip, Legend,
} from 'recharts';
import { JoltsGeo } from '@/store/slices/economicSlice';
import { useChartTheme } from '@/utils/chartTheme';

interface JoltsRadarChartProps {
    nationalData: JoltsGeo | null;
    stateData: JoltsGeo | null;
    isLoading?: boolean;
}

const toNumber = (val: number | string | null | undefined): number => {
    if (val === null || val === undefined) return 0;
    const num = typeof val === 'string' ? parseFloat(val) : val;
    return isNaN(num) ? 0 : num;
};

interface DimensionInfo {
    key: string;
    label: string;
    description: string;
    implication: string;
    icon: 'up' | 'down' | 'neutral';
}

const DIMENSIONS: DimensionInfo[] = [
    {
        key: 'job_openings',
        label: 'Job Openings',
        description: 'Unfilled construction positions actively seeking workers',
        implication: 'High openings = labor shortage → budget more for recruiting and higher wages',
        icon: 'up',
    },
    {
        key: 'hires',
        label: 'Hires',
        description: 'New workers entering construction jobs each month',
        implication: 'Rising hires = growing demand, but may signal tight competition for talent',
        icon: 'up',
    },
    {
        key: 'separations',
        label: 'Separations',
        description: 'Total workers leaving jobs (includes quits + layoffs)',
        implication: 'High separations = workforce instability → plan for retention costs',
        icon: 'down',
    },
    {
        key: 'quits',
        label: 'Quits',
        description: 'Workers voluntarily leaving for better opportunities',
        implication: 'High quits = workers confident in alternatives → market is competitive',
        icon: 'neutral',
    },
    {
        key: 'layoffs',
        label: 'Layoffs',
        description: 'Involuntary separations driven by economic conditions',
        implication: 'Rising layoffs = market stress signal → cautious hiring outlook',
        icon: 'down',
    },
];

export function JoltsRadarChart({
    nationalData,
    stateData,
    isLoading = false,
}: JoltsRadarChartProps) {
    const chartColors = useChartTheme();

    const CustomTooltip = ({ active, payload }: any) => {
        if (!active || !payload?.length) return null;
        const dimension = payload[0]?.payload?.dimension;
        const dimInfo = DIMENSIONS.find(d => d.label === dimension);
        return (
            <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 px-4 py-3 rounded-xl shadow-xl max-w-xs">
                <p className="text-sm text-gray-600 dark:text-gray-300 font-medium mb-1">{dimension}</p>
                {dimInfo && <p className="text-[10px] text-gray-500 mb-2">{dimInfo.description}</p>}
                {payload.map((entry: any, i: number) => (
                    <div key={i} className="flex items-center gap-2 mb-1">
                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
                        <span className="text-xs text-gray-500 dark:text-gray-400">{entry.name}:</span>
                        <span className="text-xs font-bold" style={{ color: entry.color }}>
                            {entry.value?.toLocaleString()}K
                        </span>
                    </div>
                ))}
            </div>
        );
    };

    function TightnessGauge({ value, label }: { value: number; label: string }) {
        const pct = Math.min(100, Math.max(0, ((value - 0.3) / (2.5 - 0.3)) * 100));

        const getColor = (ratio: number) => {
            if (ratio >= 1.5) return { bg: '#f43f5e', text: 'text-rose-400' };
            if (ratio >= 1.2) return { bg: '#f59e0b', text: 'text-amber-400' };
            if (ratio >= 0.8) return { bg: '#10b981', text: 'text-emerald-400' };
            return { bg: '#3b82f6', text: 'text-blue-400' };
        };

        const color = getColor(value);

        return (
            <div className="flex-1 p-3 bg-gray-100 dark:bg-gray-800/50 rounded-xl border border-gray-200 dark:border-gray-700/30">
                <div className="flex items-center justify-between mb-2">
                    <span className="text-xs text-gray-500 dark:text-gray-400">{label}</span>
                    <span className={`text-sm font-bold ${color.text}`}>{value.toFixed(2)}x</span>
                </div>
                <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden relative">
                    {/* Zone markers */}
                    <div className="absolute inset-0 flex">
                        <div className="w-[23%] bg-blue-500/10" />  {/* < 0.8 */}
                        <div className="w-[18%] bg-emerald-500/10" /> {/* 0.8-1.2 */}
                        <div className="w-[14%] bg-amber-500/10" />  {/* 1.2-1.5 */}
                        <div className="w-[45%] bg-rose-500/10" />   {/* 1.5+ */}
                    </div>
                    <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${pct}%` }}
                        transition={{ duration: 0.8, ease: 'easeOut' }}
                        className="absolute h-full rounded-full"
                        style={{ backgroundColor: color.bg }}
                    />
                </div>
                <div className="flex justify-between mt-1">
                    <span className="text-[9px] text-blue-400/50">Loose</span>
                    <span className="text-[9px] text-emerald-400/50">Balanced</span>
                    <span className="text-[9px] text-rose-400/50">Very Tight</span>
                </div>
            </div>
        );
    }

    const [showDetails, setShowDetails] = useState(false);
    const stateName = stateData?.geo_name || stateData?.geo_code || 'State';

    const chartData = DIMENSIONS.map(d => ({
        dimension: d.label,
        National: toNumber((nationalData as any)?.[d.key]),
        ...(stateData ? { [stateName]: toNumber((stateData as any)?.[d.key]) } : {}),
    }));

    const hasNational = nationalData && DIMENSIONS.some(d => toNumber((nationalData as any)?.[d.key]) > 0);
    const hasState = stateData && DIMENSIONS.some(d => toNumber((stateData as any)?.[d.key]) > 0);
    const hasData = hasNational || hasState;

    const natTightness = toNumber(nationalData?.tightness_ratio);
    const stateTightness = toNumber(stateData?.tightness_ratio);

    // Dynamic interpretation
    const getInterpretation = () => {
        const ratio = stateTightness > 0 ? stateTightness : natTightness;
        const region = stateTightness > 0 ? stateName : 'National';

        if (ratio >= 1.5) {
            return {
                icon: AlertTriangle,
                color: 'rose',
                title: 'Tight Labor Market',
                text: `The ${region} construction labor market is very tight (${ratio.toFixed(2)}x ratio). There are significantly more job openings than hires, meaning contractors must compete aggressively for workers. Budget 5-10% higher labor costs and expect longer hiring timelines.`,
            };
        } else if (ratio >= 1.0) {
            return {
                icon: MinusCircle,
                color: 'amber',
                title: 'Moderately Tight Market',
                text: `The ${region} labor market is moderately tight (${ratio.toFixed(2)}x ratio). Supply roughly matches demand but some specialties may be harder to fill. Standard labor cost assumptions are reasonable with a small contingency buffer.`,
            };
        } else if (ratio > 0) {
            return {
                icon: CheckCircle,
                color: 'emerald',
                title: 'Balanced Labor Market',
                text: `The ${region} labor market is balanced or loose (${ratio.toFixed(2)}x ratio). Workers are generally available and competitive bidding conditions favor contractors. Labor costs should be predictable.`,
            };
        }
        return null;
    };

    const interpretation = getInterpretation();

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="bg-white dark:bg-gradient-to-br dark:from-gray-900/90 dark:to-gray-800/90 rounded-2xl p-6 border border-gray-200 dark:border-gray-700/50 shadow-xl"
        >
            {/* Header with info */}
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-purple-500/20 rounded-xl">
                        <ArrowRightLeft className="w-5 h-5 text-purple-400" />
                    </div>
                    <div>
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Labor Turnover (JOLTS)</h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Job Openings & Labor Turnover Survey — measures workforce flow</p>
                    </div>
                </div>
                <button
                    onClick={() => setShowDetails(!showDetails)}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-gray-500 dark:text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 bg-gray-100 dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700/30 transition-colors"
                >
                    <Info className="w-3 h-3" />
                    What is JOLTS?
                    {showDetails ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                </button>
            </div>

            {/* JOLTS Explanation (collapsible) */}
            <AnimatePresence>
                {showDetails && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden"
                    >
                        <div className="p-4 bg-gray-100 dark:bg-gray-800/60 rounded-xl border border-gray-200 dark:border-gray-700/30 mb-4 text-xs text-gray-500 dark:text-gray-400 space-y-2">
                            <p className="font-medium text-gray-600 dark:text-gray-300">JOLTS measures the flow of workers into and out of construction jobs each month:</p>
                            <ul className="space-y-1.5 ml-1">
                                {DIMENSIONS.map(d => (
                                    <li key={d.key} className="flex items-start gap-2">
                                        <span className="text-purple-400 font-medium min-w-[90px]">{d.label}:</span>
                                        <span>{d.description}</span>
                                    </li>
                                ))}
                            </ul>
                            <p className="pt-1">The <strong className="text-gray-600 dark:text-gray-300">Tightness Ratio</strong> = Job Openings ÷ Hires. Values above 1.0 mean labor is getting harder to find.</p>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Tightness Gauges */}
            {(natTightness > 0 || stateTightness > 0) && (
                <div className="flex gap-3 mb-4">
                    {natTightness > 0 && <TightnessGauge value={natTightness} label="National Tightness" />}
                    {stateTightness > 0 && stateData && <TightnessGauge value={stateTightness} label={`${stateName} Tightness`} />}
                </div>
            )}

            {/* Chart */}
            {isLoading ? (
                <div className="animate-pulse h-[280px] bg-gray-200 dark:bg-gray-700/30 rounded-xl" />
            ) : !hasData ? (
                <div className="h-[280px] flex flex-col items-center justify-center text-center gap-3">
                    <Info className="w-8 h-8 text-gray-600" />
                    <div>
                        <p className="text-gray-500 dark:text-gray-400 text-sm font-medium">No labor turnover data available</p>
                        <p className="text-gray-500 text-xs mt-1">Sync data to view JOLTS dimensions</p>
                    </div>
                </div>
            ) : (
                <ResponsiveContainer width="100%" height={280}>
                    <RadarChart data={chartData} cx="50%" cy="50%" outerRadius="75%">
                        <PolarGrid stroke={chartColors.grid} />
                        <PolarAngleAxis
                            dataKey="dimension"
                            tick={{ fill: chartColors.axis, fontSize: 11 }}
                        />
                        <PolarRadiusAxis
                            tick={{ fill: chartColors.labelColor, fontSize: 10 }}
                            axisLine={false}
                        />
                        <Tooltip content={<CustomTooltip />} />
                        <Legend
                            wrapperStyle={{ paddingTop: '8px' }}
                            iconType="circle"
                            iconSize={8}
                            formatter={(value: string) => (
                                <span className="text-xs text-gray-500 dark:text-gray-400">{value}</span>
                            )}
                        />
                        {hasNational && (
                            <Radar
                                name="National"
                                dataKey="National"
                                stroke="#6366f1"
                                fill="#6366f1"
                                fillOpacity={0.2}
                                strokeWidth={2}
                            />
                        )}
                        {hasState && (
                            <Radar
                                name={stateName}
                                dataKey={stateName}
                                stroke="#a855f7"
                                fill="#a855f7"
                                fillOpacity={0.15}
                                strokeWidth={2}
                            />
                        )}
                    </RadarChart>
                </ResponsiveContainer>
            )}

            {/* Dynamic Interpretation Callout */}
            {interpretation && (
                <div className={`mt-4 p-4 rounded-xl border ${interpretation.color === 'rose' ? 'bg-rose-500/10 border-rose-500/20' :
                        interpretation.color === 'amber' ? 'bg-amber-500/10 border-amber-500/20' :
                            'bg-emerald-500/10 border-emerald-500/20'
                    }`}>
                    <div className="flex items-center gap-2 mb-2">
                        <interpretation.icon className={`w-4 h-4 ${interpretation.color === 'rose' ? 'text-rose-400' :
                                interpretation.color === 'amber' ? 'text-amber-400' :
                                    'text-emerald-400'
                            }`} />
                        <span className={`text-sm font-semibold ${interpretation.color === 'rose' ? 'text-rose-400' :
                                interpretation.color === 'amber' ? 'text-amber-400' :
                                    'text-emerald-400'
                            }`}>{interpretation.title}</span>
                    </div>
                    <p className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed">{interpretation.text}</p>
                </div>
            )}

            {/* Dimension Guide */}
            {hasData && (
                <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                    {DIMENSIONS.map((d, idx) => {
                        const natVal = toNumber((nationalData as any)?.[d.key]);
                        const stateVal = stateData ? toNumber((stateData as any)?.[d.key]) : 0;
                        return (
                            <div key={d.key} className="p-2.5 bg-gray-100 dark:bg-gray-800/30 rounded-lg border border-gray-200 dark:border-gray-700/20">
                                <div className="flex items-center justify-between mb-1">
                                    <span className="text-xs font-medium text-gray-600 dark:text-gray-300">{d.label}</span>
                                    <span className="text-xs text-indigo-400 font-bold">
                                        {natVal > 0 ? `${natVal.toLocaleString()}K` : '—'}
                                    </span>
                                </div>
                                <p className="text-[10px] text-gray-500 leading-tight">{d.implication}</p>
                            </div>
                        );
                    })}
                </div>
            )}
        </motion.div>
    );
}
