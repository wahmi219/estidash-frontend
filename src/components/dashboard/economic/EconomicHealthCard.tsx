'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Activity, TrendingUp, TrendingDown, Minus, AlertCircle, ChevronDown, ChevronUp, DollarSign, Users, Clock, ArrowRightLeft, Info } from 'lucide-react';
import clsx from 'clsx';
import { EconomicSummary } from '@/store/slices/economicSlice';

interface EconomicHealthCardProps {
    data: EconomicSummary | null;
    isLoading?: boolean;
}

type HealthLevel = 'strong' | 'moderate' | 'cautious' | 'unknown';

interface Indicator {
    name: string;
    icon: React.ElementType;
    value: string;
    status: 'positive' | 'neutral' | 'negative';
    interpretation: string;
    rawValue: number;
    min: number;
    max: number;
    invertBar?: boolean; // true = lower is better (like interest rates)
}

function calculateHealth(data: EconomicSummary | null): {
    score: number;
    level: HealthLevel;
    indicators: Indicator[];
    narrative: string;
} {
    if (!data) {
        return { score: 0, level: 'unknown', indicators: [], narrative: '' };
    }

    const toNum = (val: number | string | null | undefined): number | null => {
        if (val === null || val === undefined) return null;
        const num = typeof val === 'string' ? parseFloat(val) : val;
        return isNaN(num) ? null : num;
    };

    const indicators: Indicator[] = [];
    let score = 50;

    // 1. Interest Rate Impact
    const mortgage30 = toNum(data.interest_rates.mortgage_30y);
    if (mortgage30 !== null) {
        let status: 'positive' | 'neutral' | 'negative';
        let interp: string;
        if (mortgage30 <= 5.5) {
            score += 15;
            status = 'positive';
            interp = 'Low financing costs encourage new projects and refinancing';
        } else if (mortgage30 <= 7) {
            status = 'neutral';
            interp = 'Moderate rates — projects remain viable but margins tighten';
        } else {
            score -= 15;
            status = 'negative';
            interp = 'High rates slow new starts and increase debt servicing costs';
        }
        indicators.push({
            name: 'Interest Rate Impact',
            icon: DollarSign,
            value: `${mortgage30.toFixed(2)}%`,
            status,
            interpretation: interp,
            rawValue: mortgage30,
            min: 3,
            max: 9,
            invertBar: true,
        });
    }

    // 2. Workforce Demand
    const employment = toNum(data.employment.total_construction);
    if (employment !== null) {
        let status: 'positive' | 'neutral' | 'negative';
        let interp: string;
        if (employment >= 8000) {
            score += 10;
            status = 'positive';
            interp = `${employment.toLocaleString()}K workers — strong industry activity drives demand`;
        } else if (employment >= 7000) {
            status = 'neutral';
            interp = `${employment.toLocaleString()}K workers — stable employment, steady project pipeline`;
        } else {
            score -= 10;
            status = 'negative';
            interp = `${employment.toLocaleString()}K workers — declining workforce signals reduced activity`;
        }
        indicators.push({
            name: 'Workforce Demand',
            icon: Users,
            value: `${employment.toLocaleString()}K`,
            status,
            interpretation: interp,
            rawValue: employment,
            min: 5000,
            max: 10000,
        });
    }

    // 3. Work Intensity
    const hours = toNum(data.employment.avg_weekly_hours);
    if (hours !== null) {
        const pctOf40 = (hours / 40) * 100;
        let status: 'positive' | 'neutral' | 'negative';
        let interp: string;
        if (hours >= 40) {
            score += 8;
            status = 'positive';
            interp = `${pctOf40.toFixed(0)}% of 40hr benchmark — overtime signals high demand`;
        } else if (hours >= 38) {
            status = 'neutral';
            interp = `${pctOf40.toFixed(0)}% of 40hr benchmark — normal workload levels`;
        } else {
            score -= 8;
            status = 'negative';
            interp = `${pctOf40.toFixed(0)}% of 40hr benchmark — reduced hours indicate slowdown`;
        }
        indicators.push({
            name: 'Work Intensity',
            icon: Clock,
            value: `${hours.toFixed(1)} hrs/wk`,
            status,
            interpretation: interp,
            rawValue: hours,
            min: 34,
            max: 44,
        });
    }

    // 4. Wage Pressure
    const earnings = toNum(data.employment.avg_hourly_earnings);
    if (earnings !== null) {
        let status: 'positive' | 'neutral' | 'negative';
        let interp: string;
        if (earnings >= 38) {
            status = 'negative';
            score -= 5;
            interp = 'High wages increase project labor costs — budget accordingly';
        } else if (earnings >= 33) {
            status = 'neutral';
            interp = 'Wages in normal range — standard labor cost assumptions apply';
        } else {
            status = 'positive';
            score += 5;
            interp = 'Lower wages reduce labor costs — favorable for project margins';
        }
        indicators.push({
            name: 'Wage Pressure',
            icon: TrendingUp,
            value: `$${earnings.toFixed(2)}/hr`,
            status,
            interpretation: interp,
            rawValue: earnings,
            min: 25,
            max: 45,
            invertBar: true,
        });
    }

    // 5. Labor Tightness
    const tightness = toNum(data.labor_turnover.tightness_ratio);
    if (tightness !== null) {
        let status: 'positive' | 'neutral' | 'negative';
        let interp: string;
        if (tightness >= 1.5) {
            score -= 12;
            status = 'negative';
            interp = 'Very tight — more openings than hires, expect bidding wars for workers';
        } else if (tightness >= 1.0) {
            status = 'neutral';
            interp = 'Supply roughly matches demand — normal hiring conditions';
        } else {
            score += 12;
            status = 'positive';
            interp = 'Loose market — ample worker availability for new projects';
        }
        indicators.push({
            name: 'Labor Tightness',
            icon: ArrowRightLeft,
            value: `${tightness.toFixed(2)}x`,
            status,
            interpretation: interp,
            rawValue: tightness,
            min: 0.3,
            max: 2.5,
            invertBar: true,
        });
    }

    score = Math.max(0, Math.min(100, score));

    let level: HealthLevel;
    if (score >= 65) level = 'strong';
    else if (score >= 45) level = 'moderate';
    else level = 'cautious';

    // Build narrative
    const positives = indicators.filter(i => i.status === 'positive').length;
    const negatives = indicators.filter(i => i.status === 'negative').length;

    let narrative: string;
    if (level === 'strong') {
        narrative = `The construction market shows ${positives} favorable signals. Low financing costs and available labor create an opportunity window for project starts and competitive bidding.`;
    } else if (level === 'cautious') {
        narrative = `Caution advised with ${negatives} unfavorable signals. Higher costs, tight labor, or reduced activity suggest conservative budgeting and extended timelines.`;
    } else {
        narrative = `Mixed conditions with both opportunities and headwinds. Monitor interest rates and labor availability closely before committing to new project starts.`;
    }

    return { score, level, indicators, narrative };
}

export function EconomicHealthCard({ data, isLoading = false }: EconomicHealthCardProps) {
    const { score, level, indicators, narrative } = calculateHealth(data);
    const [showMethod, setShowMethod] = useState(false);

    const levelConfig = {
        strong: { label: 'Strong', gradient: 'from-emerald-600 to-emerald-400', bg: 'emerald', textColor: 'text-emerald-400' },
        moderate: { label: 'Moderate', gradient: 'from-amber-600 to-amber-400', bg: 'amber', textColor: 'text-amber-400' },
        cautious: { label: 'Cautious', gradient: 'from-rose-600 to-rose-400', bg: 'rose', textColor: 'text-rose-400' },
        unknown: { label: 'No Data', gradient: 'from-gray-600 to-gray-400', bg: 'gray', textColor: 'text-gray-400' },
    };

    const config = levelConfig[level];
    const statusColors = {
        positive: { dot: 'bg-emerald-400', bar: '#10b981', text: 'text-emerald-400' },
        neutral: { dot: 'bg-amber-400', bar: '#f59e0b', text: 'text-amber-400' },
        negative: { dot: 'bg-rose-400', bar: '#f43f5e', text: 'text-rose-400' },
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="bg-gradient-to-br from-white to-gray-50 dark:from-gray-900/90 dark:to-gray-800/90 rounded-2xl p-6 border border-gray-200 dark:border-gray-700/50 shadow-xl"
        >
            {/* Header */}
            <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-cyan-500/20 rounded-xl">
                        <Activity className="w-5 h-5 text-cyan-400" />
                    </div>
                    <div>
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Market Health Index</h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Construction market outlook based on 5 key indicators</p>
                    </div>
                </div>
                <button
                    onClick={() => setShowMethod(!showMethod)}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-gray-500 dark:text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 bg-gray-100 dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700/30 transition-colors"
                >
                    <Info className="w-3 h-3" />
                    How it works
                    {showMethod ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                </button>
            </div>

            {isLoading ? (
                <div className="animate-pulse space-y-4">
                    <div className="h-16 bg-gray-200 dark:bg-gray-700 rounded-xl" />
                    <div className="space-y-3">
                        {[1, 2, 3].map(i => <div key={i} className="h-16 bg-gray-700 rounded-xl" />)}
                    </div>
                </div>
            ) : level === 'unknown' ? (
                <div className="h-[200px] flex flex-col items-center justify-center text-center gap-3">
                    <AlertCircle className="w-8 h-8 text-gray-600" />
                    <div>
                        <p className="text-gray-500 dark:text-gray-400 text-sm font-medium">No market data available</p>
                        <p className="text-gray-500 text-xs mt-1">Sync national data to calculate market health</p>
                    </div>
                </div>
            ) : (
                <>
                    {/* Methodology (collapsible) */}
                    <AnimatePresence>
                        {showMethod && (
                            <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                className="overflow-hidden"
                            >
                                <div className="p-4 bg-gray-100 dark:bg-gray-800/60 rounded-xl border border-gray-200 dark:border-gray-700/30 mb-5 text-xs text-gray-500 dark:text-gray-400 space-y-2">
                                    <p className="font-medium text-gray-600 dark:text-gray-300">How the Market Health Index works:</p>
                                    <p>The score starts at <strong className="text-gray-600 dark:text-gray-300">50</strong> (neutral) and adjusts based on 5 indicators from Federal Reserve (FRED) and Bureau of Labor Statistics (BLS) data:</p>
                                    <ul className="list-disc list-inside space-y-1 ml-1">
                                        <li><strong className="text-gray-600 dark:text-gray-300">Interest Rates</strong> (±15 pts) — 30Y mortgage rate vs 5.5%/7% thresholds</li>
                                        <li><strong className="text-gray-600 dark:text-gray-300">Workforce Demand</strong> (±10 pts) — Total construction employment level</li>
                                        <li><strong className="text-gray-600 dark:text-gray-300">Work Intensity</strong> (±8 pts) — Weekly hours vs 40hr/38hr benchmarks</li>
                                        <li><strong className="text-gray-600 dark:text-gray-300">Wage Pressure</strong> (±5 pts) — Avg hourly earnings impact on costs</li>
                                        <li><strong className="text-gray-600 dark:text-gray-300">Labor Tightness</strong> (±12 pts) — JOLTS openings-to-hires ratio</li>
                                    </ul>
                                    <p>Score ranges: <strong className="text-emerald-400">65+</strong> = Strong, <strong className="text-amber-400">45-64</strong> = Moderate, <strong className="text-rose-400">&lt;45</strong> = Cautious</p>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Score Gauge */}
                    <div className="mb-5">
                        <div className="flex items-end justify-between mb-2">
                            <div className="flex items-baseline gap-3">
                                <span className={clsx('text-4xl font-bold', config.textColor)}>{score}</span>
                                <span className={clsx('text-sm font-medium', config.textColor)}>{config.label} Conditions</span>
                            </div>
                            <span className="text-xs text-gray-500">/ 100</span>
                        </div>
                        {/* Horizontal gauge */}
                        <div className="relative h-3 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                            {/* Colored zones */}
                            <div className="absolute inset-0 flex">
                                <div className="w-[45%] bg-rose-500/20" />
                                <div className="w-[20%] bg-amber-500/20" />
                                <div className="w-[35%] bg-emerald-500/20" />
                            </div>
                            {/* Score marker */}
                            <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: `${score}%` }}
                                transition={{ duration: 1, ease: 'easeOut' }}
                                className={`absolute h-full rounded-full bg-gradient-to-r ${config.gradient}`}
                                style={{ opacity: 0.8 }}
                            />
                        </div>
                        <div className="flex justify-between mt-1.5">
                            <span className="text-[10px] text-rose-400/60">Cautious</span>
                            <span className="text-[10px] text-amber-400/60">Moderate</span>
                            <span className="text-[10px] text-emerald-400/60">Strong</span>
                        </div>
                    </div>

                    {/* Narrative Summary */}
                    <div className="p-4 bg-gray-100 dark:bg-gray-800/40 rounded-xl border border-gray-200 dark:border-gray-700/20 mb-5">
                        <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">{narrative}</p>
                    </div>

                    {/* Indicator Rows */}
                    <div className="space-y-2.5">
                        <span className="text-[10px] text-gray-500 uppercase tracking-widest">Key Indicators</span>
                        {indicators.map((ind, idx) => {
                            const Icon = ind.icon;
                            const sc = statusColors[ind.status];
                            const barPct = Math.min(100, Math.max(5, ((ind.rawValue - ind.min) / (ind.max - ind.min)) * 100));

                            return (
                                <motion.div
                                    key={idx}
                                    initial={{ opacity: 0, x: -10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: idx * 0.05 }}
                                    className="p-3.5 bg-gray-100 dark:bg-gray-800/50 rounded-xl border border-gray-200 dark:border-gray-700/30"
                                >
                                    <div className="flex items-center justify-between mb-2">
                                        <div className="flex items-center gap-2.5">
                                            <div className={`w-2 h-2 rounded-full ${sc.dot}`} />
                                            <Icon className="w-3.5 h-3.5 text-gray-400" />
                                            <span className="text-sm text-gray-600 dark:text-gray-300 font-medium">{ind.name}</span>
                                        </div>
                                        <span className={`text-sm font-bold ${sc.text}`}>{ind.value}</span>
                                    </div>
                                    {/* Mini bar */}
                                    <div className="h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden mb-2">
                                        <motion.div
                                            initial={{ width: 0 }}
                                            animate={{ width: `${barPct}%` }}
                                            transition={{ duration: 0.6, delay: idx * 0.05 }}
                                            className="h-full rounded-full"
                                            style={{ backgroundColor: sc.bar }}
                                        />
                                    </div>
                                    <p className="text-xs text-gray-500">{ind.interpretation}</p>
                                </motion.div>
                            );
                        })}
                    </div>
                </>
            )}
        </motion.div>
    );
}
