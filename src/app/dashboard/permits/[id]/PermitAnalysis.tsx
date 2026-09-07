'use client';

import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    PieChart, Pie, Cell, ResponsiveContainer,
    BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid,
    RadialBarChart, RadialBar,
} from 'recharts';
import {
    Brain,
    ChevronDown,
    ChevronUp,
    Target,
    Clock,
    Users,
    AlertTriangle,
    Mail,
    TrendingUp,
    Shield,
    DollarSign,
    RefreshCw,
    Loader2,
    Zap,
    Eye,
    Activity,
    CheckCircle2,
    XCircle,
    ArrowUpRight,
} from 'lucide-react';
import { apiService } from '@/services/api';
import { PermitRecord } from '@/types';

// =============================================================================
// Key normalization — LLMs return keys in unpredictable formats
// =============================================================================

function toSnakeCase(key: string): string {
    return key
        .trim()
        .replace(/[\s\-\/]+/g, '_')
        .replace(/([a-z])([A-Z])/g, '$1_$2')
        .replace(/_+/g, '_')
        .replace(/^_|_$/g, '')
        .toLowerCase();
}

function normalizeKeys(obj: Record<string, unknown>): Record<string, unknown> {
    const out: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj)) {
        out[toSnakeCase(key)] = value;
    }
    return out;
}

// =============================================================================
// Types
// =============================================================================

interface PermitAnalysisData {
    score: { value: number; max: number; rating: string; decision: string };
    lead_type: string;
    who_to_email: string;
    buyer_confidence: string;
    why_matters_now: string;
    reply_triggers: string[];
    key_signals: string[];
    pain_stage: string;
    reachability: { tier: string; explanation: string };
    timing: { days_since_issued: number | null; last_movement_days: number | null; amendment_active: boolean | null };
    red_flags: string[];
    builder_repeat_signals: string[];
    best_outreach_angle: string;
    final_verdict: string;
    kill_reason_if_skip: string | null;
    analysis_summary: string;
    estimated_cost: { value: number | null; currency: string; confidence: string | null; method: string | null; note: string | null };
    key_players: {
        general_contractor: { name: string | null; contact_available: boolean | null; confidence: string | null } | null;
        subcontractors: { trade: string; name: string; estimated_value: number | null }[];
    };
    anomalies: { type: string; description: string; severity: string }[];
}

// =============================================================================
// Color / style helpers
// =============================================================================

const SCORE_COLORS: Record<string, { fill: string; text: string; bg: string; border: string; glow: string; gradient: string }> = {
    hot:    { fill: '#ef4444', text: 'text-red-400',    bg: 'bg-red-500/10',    border: 'border-red-500/30',    glow: 'shadow-red-500/25',    gradient: 'from-red-600 to-rose-500' },
    high:   { fill: '#f97316', text: 'text-orange-400', bg: 'bg-orange-500/10', border: 'border-orange-500/30', glow: 'shadow-orange-500/25', gradient: 'from-orange-600 to-amber-500' },
    strong: { fill: '#f59e0b', text: 'text-amber-400',  bg: 'bg-amber-500/10',  border: 'border-amber-500/30',  glow: 'shadow-amber-500/25',  gradient: 'from-amber-600 to-yellow-500' },
    med:    { fill: '#3b82f6', text: 'text-blue-400',   bg: 'bg-blue-500/10',   border: 'border-blue-500/30',   glow: 'shadow-blue-500/25',   gradient: 'from-blue-600 to-cyan-500' },
    low:    { fill: '#6b7280', text: 'text-gray-400',   bg: 'bg-gray-500/10',   border: 'border-gray-500/30',   glow: 'shadow-gray-500/25',   gradient: 'from-gray-600 to-gray-500' },
};

function getScoreTier(v: number) {
    if (v >= 9) return SCORE_COLORS.hot;
    if (v >= 8) return SCORE_COLORS.high;
    if (v >= 7) return SCORE_COLORS.strong;
    if (v >= 5) return SCORE_COLORS.med;
    return SCORE_COLORS.low;
}

function getDecisionColor(d: string) {
    const u = d.toUpperCase();
    if (u.includes('EMAIL NOW'))      return 'text-red-400';
    if (u.includes('HIGH PRIORITY'))  return 'text-orange-400';
    if (u.includes('STRONG'))         return 'text-amber-400';
    if (u.includes('SELECTIVE'))      return 'text-blue-400';
    if (u.includes('RESEARCH'))       return 'text-purple-400';
    return 'text-gray-400';
}

function confidenceStyle(c: string | null) {
    if (!c) return { bg: 'bg-gray-500/10', text: 'text-gray-400' };
    const l = c.toLowerCase();
    if (l === 'high')   return { bg: 'bg-emerald-500/10', text: 'text-emerald-400' };
    if (l === 'medium') return { bg: 'bg-amber-500/10', text: 'text-amber-400' };
    return { bg: 'bg-red-500/10', text: 'text-red-400' };
}

function formatCurrency(v: number | null | undefined) {
    if (v == null) return 'N/A';
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(v);
}

// =============================================================================
// Chart sub-components
// =============================================================================

/** Radial score gauge */
function ScoreGauge({ value, max, tier }: { value: number; max: number; tier: typeof SCORE_COLORS.hot }) {
    const pct = Math.round((value / max) * 100);
    const data = [{ name: 'score', value: pct, fill: tier.fill }];
    return (
        <div className="relative w-32 h-32">
            <ResponsiveContainer width="100%" height="100%">
                <RadialBarChart
                    cx="50%" cy="50%"
                    innerRadius="78%" outerRadius="100%"
                    barSize={10}
                    data={data}
                    startAngle={225}
                    endAngle={-45}
                >
                    <RadialBar
                        dataKey="value"
                        cornerRadius={5}
                        background={{ fill: 'rgba(255,255,255,0.04)' }}
                    />
                </RadialBarChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
                <motion.span
                    initial={{ opacity: 0, scale: 0.5 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.3, type: 'spring' }}
                    className={`text-3xl font-black ${tier.text}`}
                >
                    {value}
                </motion.span>
                <span className="text-[10px] text-gray-500 -mt-0.5">/ {max}</span>
            </div>
        </div>
    );
}

/** Donut showing confidence split */
function ConfidenceDonut({ confidence }: { confidence: string }) {
    const c = confidence.toLowerCase();
    const val = c === 'high' ? 90 : c === 'medium' ? 60 : 30;
    const color = c === 'high' ? '#10b981' : c === 'medium' ? '#f59e0b' : '#ef4444';
    const data = [
        { name: 'filled', value: val },
        { name: 'empty', value: 100 - val },
    ];
    return (
        <div className="relative w-16 h-16">
            <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                    <Pie data={data} cx="50%" cy="50%" innerRadius={20} outerRadius={28} dataKey="value" strokeWidth={0} startAngle={90} endAngle={-270}>
                        <Cell fill={color} />
                        <Cell fill="rgba(255,255,255,0.04)" />
                    </Pie>
                </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-[10px] font-bold text-gray-600 dark:text-gray-300 capitalize">{confidence}</span>
            </div>
        </div>
    );
}

/** Horizontal signal strength bars */
function SignalBars({ items, color }: { items: string[]; color: string }) {
    if (!items || items.length === 0) return <p className="text-xs text-gray-600 italic pl-1">None detected</p>;
    return (
        <div className="space-y-2">
            {items.map((item, i) => (
                <motion.div
                    key={i}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.08 }}
                    className="flex items-center gap-3"
                >
                    <div className="h-1.5 rounded-full flex-shrink-0" style={{ width: `${Math.max(20, 100 - i * 15)}%`, backgroundColor: color, opacity: 1 - i * 0.15 }} />
                    <span className="text-xs text-gray-600 dark:text-gray-300 whitespace-nowrap">{item}</span>
                </motion.div>
            ))}
        </div>
    );
}

/** Animated metric card */
function MetricTile({
    icon: Icon, label, value, sub, color = 'text-cyan-400',
}: {
    icon: React.ComponentType<{ size?: number; className?: string }>;
    label: string; value: string; sub?: string; color?: string;
}) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-4 bg-black/2 dark:bg-white/3 hover:bg-black/4 dark:hover:bg-white/5 border border-gray-200 dark:border-white/6 rounded-xl transition-all duration-300"
        >
            <div className="flex items-center gap-2 mb-2">
                <Icon size={14} className={color} />
                <span className="text-[10px] text-gray-500 uppercase tracking-wider">{label}</span>
            </div>
            <p className="text-lg font-bold text-gray-900 dark:text-white leading-tight">{value}</p>
            {sub && <p className="text-[10px] text-gray-500 mt-0.5">{sub}</p>}
        </motion.div>
    );
}

/** Pain stage visual stepper */
function PainStagePipeline({ current }: { current: string }) {
    const stages = ['Early bid', 'Active buyout', 'Revision/amendment', 'Inspection friction', 'Continuing package', 'Too late'];
    const currentLower = current.toLowerCase();
    const activeIdx = stages.findIndex(s => currentLower.includes(s.toLowerCase().split('/')[0]));

    return (
        <div className="flex items-center gap-1 overflow-x-auto py-1">
            {stages.map((stage, i) => {
                const isActive = i === activeIdx;
                const isPast = i < activeIdx;
                return (
                    <React.Fragment key={stage}>
                        <motion.div
                            initial={{ scale: 0.8, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            transition={{ delay: i * 0.06 }}
                            className={`px-2.5 py-1 rounded-full text-[10px] font-medium whitespace-nowrap transition-all
                                ${isActive
                                    ? 'bg-violet-500/20 text-violet-300 border border-violet-500/40 shadow-lg shadow-violet-500/10'
                                    : isPast
                                        ? 'bg-black/3 dark:bg-white/4 text-gray-500 border border-gray-200 dark:border-white/6'
                                        : 'bg-black/2 dark:bg-white/2 text-gray-400 dark:text-gray-600 border border-gray-100 dark:border-white/4'
                                }`}
                        >
                            {isActive && <span className="inline-block w-1.5 h-1.5 rounded-full bg-violet-400 mr-1 animate-pulse" />}
                            {stage}
                        </motion.div>
                        {i < stages.length - 1 && (
                            <div className={`w-3 h-px flex-shrink-0 ${isPast ? 'bg-violet-500/30' : 'bg-gray-200 dark:bg-white/6'}`} />
                        )}
                    </React.Fragment>
                );
            })}
        </div>
    );
}

/** Reachability tier visual */
function ReachabilityGauge({ tier, explanation }: { tier: string; explanation: string }) {
    const tierNum = tier.toLowerCase().includes('1') ? 1 : tier.toLowerCase().includes('2') ? 2 : 3;
    const colors = ['#10b981', '#f59e0b', '#ef4444'];
    const labels = ['Direct Buyer', 'Researchable', 'Weak'];

    return (
        <div className="flex items-center gap-4">
            <div className="flex gap-1">
                {[1, 2, 3].map(t => (
                    <motion.div
                        key={t}
                        initial={{ scaleY: 0 }}
                        animate={{ scaleY: 1 }}
                        transition={{ delay: t * 0.1 }}
                        className="w-3 rounded-sm origin-bottom"
                        style={{
                            height: `${16 + (4 - t) * 8}px`,
                            backgroundColor: t <= tierNum ? colors[tierNum - 1] : 'rgba(255,255,255,0.06)',
                        }}
                    />
                ))}
            </div>
            <div>
                <p className="text-sm font-semibold text-gray-900 dark:text-white">{tier} <span className="text-xs text-gray-500 font-normal">({labels[tierNum - 1]})</span></p>
                <p className="text-[11px] text-gray-500">{explanation}</p>
            </div>
        </div>
    );
}

/** Red flags bar chart */
function RedFlagsChart({ flags }: { flags: string[] }) {
    if (!flags || flags.length === 0) return null;
    const data = flags.map((f, i) => ({ name: f.length > 25 ? f.substring(0, 25) + '...' : f, severity: flags.length - i, fullName: f }));

    return (
        <div className="h-[120px]">
            <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data} layout="vertical" margin={{ left: 0, right: 10, top: 5, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" horizontal={false} />
                    <XAxis type="number" hide />
                    <YAxis type="category" dataKey="name" width={140} tick={{ fill: '#9ca3af', fontSize: 10 }} axisLine={false} tickLine={false} />
                    <Tooltip
                        content={({ active, payload }) => {
                            if (!active || !payload?.length) return null;
                            return (
                                <div className="bg-gray-900 border border-gray-700 px-3 py-2 rounded-lg shadow-xl">
                                    <p className="text-xs text-red-400">{payload[0]?.payload?.fullName}</p>
                                </div>
                            );
                        }}
                    />
                    <Bar dataKey="severity" radius={[0, 4, 4, 0]}>
                        {data.map((_, i) => (
                            <Cell key={i} fill={`rgba(239, 68, 68, ${0.8 - i * 0.15})`} />
                        ))}
                    </Bar>
                </BarChart>
            </ResponsiveContainer>
        </div>
    );
}

// =============================================================================
// Collapsible section wrapper
// =============================================================================

function Section({
    title, icon: Icon, defaultOpen = false, count, children,
}: {
    title: string; icon: React.ComponentType<{ size?: number; className?: string }>;
    defaultOpen?: boolean; count?: number; children: React.ReactNode;
}) {
    const [open, setOpen] = useState(defaultOpen);
    return (
        <div className="border-t border-gray-200 dark:border-white/6">
            <button onClick={() => setOpen(!open)} className="w-full px-5 py-3.5 flex items-center justify-between hover:bg-black/2 dark:hover:bg-white/2 transition-colors">
                <div className="flex items-center gap-2.5">
                    <Icon size={15} className="text-gray-500" />
                    <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">{title}</span>
                    {count != null && count > 0 && (
                        <span className="ml-1 px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-gray-200 dark:bg-white/6 text-gray-500">{count}</span>
                    )}
                </div>
                <motion.div animate={{ rotate: open ? 180 : 0 }} transition={{ duration: 0.2 }}>
                    <ChevronDown size={14} className="text-gray-500" />
                </motion.div>
            </button>
            <AnimatePresence>
                {open && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.25 }}
                        className="overflow-hidden"
                    >
                        <div className="px-5 pb-5">{children}</div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

// =============================================================================
// Main Component
// =============================================================================

interface PermitAnalysisProps {
    permit: PermitRecord;
}

export default function PermitAnalysis({ permit }: PermitAnalysisProps) {
    const [analysis, setAnalysis] = useState<PermitAnalysisData | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const runAnalysis = async () => {
        try {
            setLoading(true);
            setError(null);

            const result = await apiService.analyzePermit({
                permit_data: permit as unknown as Record<string, unknown>,
            });

            if (result.success && result.analysis) {
                const raw = normalizeKeys(result.analysis as Record<string, unknown>);

                const scoreObj = typeof raw.score === 'object' && raw.score !== null
                    ? raw.score as Record<string, unknown>
                    : {} as Record<string, unknown>;
                const scoreValue = Number(scoreObj.value ?? raw.score_value ?? (typeof raw.score === 'number' ? raw.score : 0));
                const scoreDecision = String(scoreObj.decision ?? raw.decision ?? 'UNKNOWN');

                const reachObj = typeof raw.reachability === 'object' && raw.reachability !== null
                    ? raw.reachability as Record<string, unknown>
                    : {} as Record<string, unknown>;
                const reachTier = String(reachObj.tier ?? (typeof raw.reachability === 'string' ? raw.reachability : 'Unknown'));
                const reachExplanation = String(reachObj.explanation ?? '—');

                const timingObj = typeof raw.timing === 'object' && raw.timing !== null
                    ? raw.timing as Record<string, unknown>
                    : {} as Record<string, unknown>;

                const costObj = typeof raw.estimated_cost === 'object' && raw.estimated_cost !== null
                    ? raw.estimated_cost as Record<string, unknown>
                    : {} as Record<string, unknown>;

                const playersObj = typeof raw.key_players === 'object' && raw.key_players !== null
                    ? raw.key_players as Record<string, unknown>
                    : {} as Record<string, unknown>;
                const gcObj = typeof playersObj.general_contractor === 'object' && playersObj.general_contractor !== null
                    ? playersObj.general_contractor as Record<string, unknown>
                    : {} as Record<string, unknown>;

                const str = (...keys: string[]): string => {
                    for (const k of keys) { const v = raw[k]; if (v != null && v !== '') return String(v); }
                    return '—';
                };
                const arr = (...keys: string[]): string[] => {
                    for (const k of keys) { const v = raw[k]; if (Array.isArray(v)) return v.map(String); }
                    return [];
                };

                const normalized: PermitAnalysisData = {
                    score: { value: scoreValue, max: Number(scoreObj.max ?? 10), rating: String(scoreObj.rating ?? `${scoreValue}/10`), decision: scoreDecision },
                    lead_type: str('lead_type'),
                    who_to_email: str('who_to_email'),
                    buyer_confidence: str('buyer_confidence'),
                    why_matters_now: str('why_matters_now', 'why_this_matters_now'),
                    reply_triggers: arr('reply_triggers', 'why_this_buyer_would_reply_now'),
                    key_signals: arr('key_signals'),
                    pain_stage: str('pain_stage'),
                    reachability: { tier: reachTier, explanation: reachExplanation },
                    timing: {
                        days_since_issued: timingObj.days_since_issued != null ? Number(timingObj.days_since_issued) : null,
                        last_movement_days: timingObj.last_movement_days != null ? Number(timingObj.last_movement_days) : null,
                        amendment_active: timingObj.amendment_active != null ? Boolean(timingObj.amendment_active) : null,
                    },
                    red_flags: arr('red_flags'),
                    builder_repeat_signals: arr('builder_repeat_signals'),
                    best_outreach_angle: str('best_outreach_angle'),
                    final_verdict: str('final_verdict'),
                    kill_reason_if_skip: raw.kill_reason_if_skip != null ? String(raw.kill_reason_if_skip) : null,
                    analysis_summary: str('analysis_summary', 'residential_commercial_interpretation'),
                    estimated_cost: {
                        value: costObj.value != null ? Number(costObj.value) : null,
                        currency: String(costObj.currency ?? 'USD'),
                        confidence: costObj.confidence != null ? String(costObj.confidence) : null,
                        method: costObj.method != null ? String(costObj.method) : null,
                        note: costObj.note != null ? String(costObj.note) : null,
                    },
                    key_players: {
                        general_contractor: gcObj.name ? {
                            name: String(gcObj.name),
                            contact_available: gcObj.contact_available != null ? Boolean(gcObj.contact_available) : null,
                            confidence: gcObj.confidence != null ? String(gcObj.confidence) : null,
                        } : null,
                        subcontractors: Array.isArray(playersObj.subcontractors) ? playersObj.subcontractors : [],
                    },
                    anomalies: Array.isArray(raw.anomalies) ? raw.anomalies : [],
                };

                setAnalysis(normalized);
            } else {
                setError(result.error || 'Analysis failed. Please try again.');
            }
        } catch (err: unknown) {
            const message = err && typeof err === 'object' && 'message' in err
                ? (err as { message: string }).message
                : 'Failed to analyze permit';
            setError(message);
        } finally {
            setLoading(false);
        }
    };

    // Analysis is an expensive LLM call — run it only when the user asks,
    // not automatically on every permit detail view.

    // ── Loading ──
    if (loading) {
        return (
            <div className="bg-black/2 dark:bg-white/2 border border-gray-200 dark:border-white/6 rounded-2xl overflow-hidden">
                <Header />
                <div className="flex flex-col items-center justify-center py-16 gap-4">
                    <div className="relative">
                        <div className="w-16 h-16 rounded-full border-2 border-violet-500/20 animate-ping absolute inset-0" />
                        <div className="w-16 h-16 rounded-full bg-violet-500/10 border border-violet-500/30 flex items-center justify-center relative">
                            <Brain size={24} className="text-violet-400 animate-pulse" />
                        </div>
                    </div>
                    <div className="text-center">
                        <p className="text-sm text-gray-600 dark:text-gray-300 font-medium">Analyzing permit data...</p>
                        <p className="text-[11px] text-gray-600 mt-1">Master Permit Intelligence Engine v3.3</p>
                    </div>
                </div>
            </div>
        );
    }

    // ── Error ──
    if (error) {
        return (
            <div className="bg-black/2 dark:bg-white/2 border border-gray-200 dark:border-white/6 rounded-2xl overflow-hidden">
                <Header />
                <div className="flex flex-col items-center justify-center py-12 gap-4">
                    <div className="w-14 h-14 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center">
                        <AlertTriangle size={22} className="text-red-400" />
                    </div>
                    <p className="text-sm text-gray-400 text-center max-w-sm">{error}</p>
                    <button onClick={runAnalysis} className="flex items-center gap-2 px-4 py-2 bg-violet-500/10 hover:bg-violet-500/20 border border-violet-500/20 text-violet-400 rounded-xl transition-colors text-sm font-medium">
                        <RefreshCw size={14} /> Retry Analysis
                    </button>
                </div>
            </div>
        );
    }

    // ── Idle (not yet requested) ── on-demand to avoid an LLM call on every page view
    if (!analysis) {
        return (
            <div className="bg-black/2 dark:bg-white/2 border border-gray-200 dark:border-white/6 rounded-2xl overflow-hidden">
                <Header />
                <div className="flex flex-col items-center justify-center py-12 gap-4">
                    <div className="w-14 h-14 rounded-full bg-violet-500/10 border border-violet-500/20 flex items-center justify-center">
                        <Brain size={22} className="text-violet-400" />
                    </div>
                    <p className="text-sm text-gray-500 dark:text-gray-400 text-center max-w-sm">
                        Run the Master Permit Intelligence Engine to score this permit and generate outreach guidance.
                    </p>
                    <button onClick={runAnalysis} className="flex items-center gap-2 px-4 py-2 bg-violet-500/10 hover:bg-violet-500/20 border border-violet-500/20 text-violet-400 rounded-xl transition-colors text-sm font-medium">
                        <Brain size={14} /> Run AI Analysis
                    </button>
                </div>
            </div>
        );
    }

    const tier = getScoreTier(analysis.score.value);
    const decColor = getDecisionColor(analysis.score.decision);
    const hasKeyPlayers = analysis.key_players?.general_contractor?.name || (analysis.key_players?.subcontractors?.length ?? 0) > 0;
    const hasFlags = (analysis.red_flags?.length ?? 0) > 0 || (analysis.anomalies?.length ?? 0) > 0;

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="bg-black/2 dark:bg-white/2 border border-gray-200 dark:border-white/6 rounded-2xl overflow-hidden"
        >
            {/* ── Header ── */}
            <div className="px-5 py-3.5 border-b border-gray-200 dark:border-white/6 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-lg shadow-violet-500/20">
                        <Brain size={16} className="text-white" />
                    </div>
                    <div>
                        <h2 className="text-sm font-bold text-gray-700 dark:text-gray-200">AI Permit Analysis</h2>
                        <p className="text-[10px] text-gray-600">Intelligence Engine v3.3</p>
                    </div>
                </div>
                <button
                    onClick={runAnalysis}
                    disabled={loading}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-black/3 dark:bg-white/4 hover:bg-black/5 dark:hover:bg-white/8 border border-gray-200 dark:border-white/8 rounded-xl transition-all text-[11px] text-gray-500 dark:text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                >
                    <RefreshCw size={12} /> Re-analyze
                </button>
            </div>

            {/* ── Score Hero ── */}
            <div className="px-5 py-6">
                <div className="flex flex-col sm:flex-row items-center gap-6">
                    {/* Gauge */}
                    <ScoreGauge value={analysis.score.value} max={analysis.score.max} tier={tier} />

                    {/* Decision + summary */}
                    <div className="flex-1 text-center sm:text-left">
                        <motion.div
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.2 }}
                        >
                            <div className="flex items-center gap-3 justify-center sm:justify-start mb-2">
                                <span className={`text-lg font-black uppercase tracking-wide ${decColor}`}>
                                    {analysis.score.decision}
                                </span>
                                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${tier.bg} ${tier.text} border ${tier.border}`}>
                                    {analysis.score.rating}
                                </span>
                            </div>
                            <p className="text-xs text-gray-500 mb-1">{analysis.lead_type}</p>
                            <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">{analysis.analysis_summary}</p>
                        </motion.div>

                        {/* Quick chips */}
                        <div className="flex flex-wrap gap-2 mt-3 justify-center sm:justify-start">
                            <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-semibold ${tier.bg} ${tier.text} border ${tier.border}`}>
                                <Target size={10} /> {analysis.pain_stage}
                            </span>
                            <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-semibold ${confidenceStyle(analysis.buyer_confidence).bg} ${confidenceStyle(analysis.buyer_confidence).text} border border-gray-200 dark:border-white/8`}>
                                <Users size={10} /> {analysis.reachability.tier}
                            </span>
                            <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-semibold bg-black/3 dark:bg-white/4 text-gray-500 dark:text-gray-400 border border-gray-200 dark:border-white/6`}>
                                <Mail size={10} /> {analysis.who_to_email}
                            </span>
                        </div>
                    </div>

                    {/* Buyer confidence donut */}
                    <div className="hidden sm:block">
                        <ConfidenceDonut confidence={analysis.buyer_confidence} />
                        <p className="text-[9px] text-gray-600 text-center mt-1">Buyer Conf.</p>
                    </div>
                </div>
            </div>

            {/* ── Pain Stage Pipeline ── */}
            <div className="px-5 pb-4">
                <p className="text-[10px] text-gray-600 uppercase tracking-wider mb-2">Pain Stage</p>
                <PainStagePipeline current={analysis.pain_stage} />
            </div>

            {/* ── Key Insights Cards ── */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 px-5 pb-5">
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="p-4 bg-gradient-to-br from-amber-500/[0.06] to-transparent border border-amber-500/10 rounded-xl">
                    <div className="flex items-center gap-2 mb-2">
                        <Zap size={14} className="text-amber-400" />
                        <span className="text-[10px] text-amber-400/70 uppercase tracking-wider font-semibold">Why Now</span>
                    </div>
                    <p className="text-sm text-gray-700 dark:text-gray-200 leading-relaxed">{analysis.why_matters_now}</p>
                </motion.div>

                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="p-4 bg-gradient-to-br from-cyan-500/[0.06] to-transparent border border-cyan-500/10 rounded-xl">
                    <div className="flex items-center gap-2 mb-2">
                        <Mail size={14} className="text-cyan-400" />
                        <span className="text-[10px] text-cyan-400/70 uppercase tracking-wider font-semibold">Outreach Angle</span>
                    </div>
                    <p className="text-sm text-gray-700 dark:text-gray-200 leading-relaxed italic">{analysis.best_outreach_angle}</p>
                </motion.div>

                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="p-4 bg-gradient-to-br from-violet-500/[0.06] to-transparent border border-violet-500/10 rounded-xl">
                    <div className="flex items-center gap-2 mb-2">
                        <Shield size={14} className="text-violet-400" />
                        <span className="text-[10px] text-violet-400/70 uppercase tracking-wider font-semibold">Final Verdict</span>
                    </div>
                    <p className="text-sm text-gray-700 dark:text-gray-200 leading-relaxed font-medium">{analysis.final_verdict}</p>
                </motion.div>
            </div>

            {/* ── Timing Metrics ── */}
            <Section title="Timing & Reachability" icon={Clock} defaultOpen>
                <div className="space-y-4">
                    <div className="grid grid-cols-3 gap-3">
                        <MetricTile
                            icon={Clock}
                            label="Days Since Issued"
                            value={analysis.timing.days_since_issued != null ? String(analysis.timing.days_since_issued) : '—'}
                            color="text-blue-400"
                        />
                        <MetricTile
                            icon={Activity}
                            label="Last Movement"
                            value={analysis.timing.last_movement_days != null ? `${analysis.timing.last_movement_days}d` : '—'}
                            color="text-emerald-400"
                        />
                        <MetricTile
                            icon={analysis.timing.amendment_active ? CheckCircle2 : XCircle}
                            label="Amendment Active"
                            value={analysis.timing.amendment_active ? 'Yes' : 'No'}
                            color={analysis.timing.amendment_active ? 'text-amber-400' : 'text-gray-500'}
                        />
                    </div>
                    <ReachabilityGauge tier={analysis.reachability.tier} explanation={analysis.reachability.explanation} />
                </div>
            </Section>

            {/* ── Key Signals & Triggers ── */}
            <Section title="Key Signals & Reply Triggers" icon={TrendingUp} count={(analysis.key_signals?.length ?? 0) + (analysis.reply_triggers?.length ?? 0)}>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div>
                        <p className="text-[10px] text-cyan-400/60 uppercase tracking-wider font-semibold mb-3">Key Signals</p>
                        <SignalBars items={analysis.key_signals} color="#22d3ee" />
                    </div>
                    <div>
                        <p className="text-[10px] text-amber-400/60 uppercase tracking-wider font-semibold mb-3">Reply Triggers</p>
                        <SignalBars items={analysis.reply_triggers} color="#fbbf24" />
                    </div>
                </div>
                {analysis.builder_repeat_signals.length > 0 && (
                    <div className="mt-4">
                        <p className="text-[10px] text-emerald-400/60 uppercase tracking-wider font-semibold mb-3">Builder Repeat Signals</p>
                        <SignalBars items={analysis.builder_repeat_signals} color="#34d399" />
                    </div>
                )}
            </Section>

            {/* ── Key Players & Cost ── */}
            <Section title="Key Players & Cost" icon={DollarSign} defaultOpen={!!(hasKeyPlayers || analysis.estimated_cost?.value != null)}>
                <div className="space-y-4">
                    {analysis.estimated_cost?.value != null && (
                        <div className="flex items-center gap-4 p-4 bg-gradient-to-r from-emerald-500/[0.06] to-transparent border border-emerald-500/10 rounded-xl">
                            <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                                <DollarSign size={20} className="text-emerald-400" />
                            </div>
                            <div>
                                <p className="text-xl font-bold text-white">{formatCurrency(analysis.estimated_cost.value)}</p>
                                <div className="flex items-center gap-2 mt-0.5">
                                    {analysis.estimated_cost.confidence && (
                                        <span className={`text-[10px] px-1.5 py-0.5 rounded ${confidenceStyle(analysis.estimated_cost.confidence).bg} ${confidenceStyle(analysis.estimated_cost.confidence).text}`}>
                                            {analysis.estimated_cost.confidence}
                                        </span>
                                    )}
                                    {analysis.estimated_cost.method && <span className="text-[10px] text-gray-500">{analysis.estimated_cost.method}</span>}
                                </div>
                                {analysis.estimated_cost.note && <p className="text-[11px] text-gray-500 mt-1">{analysis.estimated_cost.note}</p>}
                            </div>
                        </div>
                    )}

                    {analysis.key_players?.general_contractor?.name && (
                        <div className="flex items-center gap-3 p-3 bg-black/2 dark:bg-white/3 rounded-xl border border-gray-200 dark:border-white/6">
                            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
                                <Users size={16} className="text-white" />
                            </div>
                            <div>
                                <p className="text-[10px] text-gray-500 uppercase tracking-wider">General Contractor</p>
                                <p className="text-sm text-white font-semibold">{analysis.key_players.general_contractor.name}</p>
                                <div className="flex items-center gap-2 mt-0.5">
                                    {analysis.key_players.general_contractor.contact_available && (
                                        <span className="text-[10px] text-emerald-400 flex items-center gap-1"><CheckCircle2 size={9} /> Contact available</span>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    {analysis.key_players?.subcontractors && analysis.key_players.subcontractors.length > 0 && (
                        <div className="space-y-1.5">
                            <p className="text-[10px] text-gray-500 uppercase tracking-wider">Subcontractors</p>
                            {analysis.key_players.subcontractors.map((sub, i) => (
                                <div key={i} className="flex items-center justify-between px-3 py-2 bg-black/2 dark:bg-white/2 rounded-lg border border-gray-100 dark:border-white/4">
                                    <div className="flex items-center gap-2">
                                        <span className="text-[10px] text-gray-500 font-medium">{sub.trade}</span>
                                        <span className="text-xs text-gray-600 dark:text-gray-300">{sub.name}</span>
                                    </div>
                                    {sub.estimated_value && <span className="text-xs text-gray-400 font-mono">{formatCurrency(sub.estimated_value)}</span>}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </Section>

            {/* ── Red Flags & Anomalies ── */}
            {hasFlags && (
                <Section title="Red Flags & Anomalies" icon={AlertTriangle} count={(analysis.red_flags?.length ?? 0) + (analysis.anomalies?.length ?? 0)}>
                    <div className="space-y-4">
                        {analysis.red_flags.length > 0 && (
                            <RedFlagsChart flags={analysis.red_flags} />
                        )}
                        {analysis.anomalies.length > 0 && (
                            <div className="space-y-2">
                                <p className="text-[10px] text-gray-500 uppercase tracking-wider">Data Anomalies</p>
                                {analysis.anomalies.map((a, i) => (
                                    <motion.div key={i} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.1 }} className="flex items-start gap-2.5 p-3 bg-black/2 dark:bg-white/2 rounded-lg border border-gray-100 dark:border-white/4">
                                        <AlertTriangle size={13} className={a.severity === 'high' ? 'text-red-400' : a.severity === 'medium' ? 'text-amber-400' : 'text-gray-500'} />
                                        <div>
                                            <p className="text-xs text-gray-600 dark:text-gray-300">{a.description}</p>
                                            <span className="text-[10px] text-gray-600">{a.type} &middot; {a.severity}</span>
                                        </div>
                                    </motion.div>
                                ))}
                            </div>
                        )}
                    </div>
                </Section>
            )}

            {/* ── Kill reason ── */}
            {analysis.kill_reason_if_skip && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="px-5 py-3 border-t border-red-500/10 bg-red-500/[0.03]">
                    <div className="flex items-center gap-2">
                        <XCircle size={13} className="text-red-400" />
                        <span className="text-[11px] text-red-400 font-semibold">Skip Reason:</span>
                        <span className="text-xs text-gray-400">{analysis.kill_reason_if_skip}</span>
                    </div>
                </motion.div>
            )}
        </motion.div>
    );
}

/** Shared header for loading/error states */
function Header() {
    return (
        <div className="px-5 py-3.5 border-b border-gray-200 dark:border-white/6 flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-lg shadow-violet-500/20">
                <Brain size={16} className="text-white" />
            </div>
            <div>
                <h2 className="text-sm font-bold text-gray-700 dark:text-gray-200">AI Permit Analysis</h2>
                <p className="text-[10px] text-gray-600">Intelligence Engine v3.3</p>
            </div>
        </div>
    );
}
