'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import {
    PieChart, Pie, Cell, ResponsiveContainer,
    BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid,
    RadialBarChart, RadialBar,
} from 'recharts';
import {
    Brain,
    ChevronDown,
    Target,
    Clock,
    Users,
    AlertTriangle,
    Mail,
    TrendingUp,
    Shield,
    DollarSign,
    RefreshCw,
    Zap,
    Activity,
    CheckCircle2,
    XCircle,
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
// Color / style helpers — Estimation Hub light theme, no neon/glow
// =============================================================================

const SCORE_COLORS: Record<string, { fill: string; text: string; bg: string; border: string }> = {
    hot:    { fill: '#dc2626', text: 'text-red-700',    bg: 'bg-red-50',    border: 'border-red-200' },
    high:   { fill: '#ea580c', text: 'text-orange-700', bg: 'bg-orange-50', border: 'border-orange-200' },
    strong: { fill: '#d97706', text: 'text-amber-700',  bg: 'bg-amber-50',  border: 'border-amber-200' },
    med:    { fill: '#00458B', text: 'text-[#00458B]',  bg: 'bg-blue-50',   border: 'border-blue-200' },
    low:    { fill: '#9ca3af', text: 'text-[#5B6B7D]',  bg: 'bg-gray-100',  border: 'border-gray-200' },
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
    if (u.includes('EMAIL NOW'))      return 'text-red-700';
    if (u.includes('HIGH PRIORITY'))  return 'text-orange-700';
    if (u.includes('STRONG'))         return 'text-amber-700';
    if (u.includes('SELECTIVE'))      return 'text-blue-700';
    if (u.includes('RESEARCH'))       return 'text-[#00458B]';
    return 'text-[#5B6B7D]';
}

function confidenceStyle(c: string | null) {
    if (!c) return { bg: 'bg-gray-100', text: 'text-[#5B6B7D]' };
    const l = c.toLowerCase();
    if (l === 'high')   return { bg: 'bg-emerald-50', text: 'text-emerald-700' };
    if (l === 'medium') return { bg: 'bg-amber-50', text: 'text-amber-700' };
    return { bg: 'bg-red-50', text: 'text-red-700' };
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
        <div className="relative w-28 h-28">
            <ResponsiveContainer width="100%" height="100%">
                <RadialBarChart
                    cx="50%" cy="50%"
                    innerRadius="78%" outerRadius="100%"
                    barSize={9}
                    data={data}
                    startAngle={225}
                    endAngle={-45}
                >
                    <RadialBar
                        dataKey="value"
                        cornerRadius={5}
                        background={{ fill: '#F7F9FB' }}
                    />
                </RadialBarChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className={`text-2xl font-bold font-mono ${tier.text}`}>
                    {value}
                </span>
                <span className="text-[10px] text-[#5B6B7D] -mt-0.5">/ {max}</span>
            </div>
        </div>
    );
}

/** Donut showing confidence split */
function ConfidenceDonut({ confidence }: { confidence: string }) {
    const c = confidence.toLowerCase();
    const val = c === 'high' ? 90 : c === 'medium' ? 60 : 30;
    const color = c === 'high' ? '#059669' : c === 'medium' ? '#d97706' : '#dc2626';
    const data = [
        { name: 'filled', value: val },
        { name: 'empty', value: 100 - val },
    ];
    return (
        <div className="relative w-14 h-14">
            <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                    <Pie data={data} cx="50%" cy="50%" innerRadius={18} outerRadius={25} dataKey="value" strokeWidth={0} startAngle={90} endAngle={-270}>
                        <Cell fill={color} />
                        <Cell fill="#F7F9FB" />
                    </Pie>
                </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-[9px] font-bold text-[#0E2B5C] capitalize">{confidence}</span>
            </div>
        </div>
    );
}

/** Horizontal signal strength bars */
function SignalBars({ items, color, reduceMotion }: { items: string[]; color: string; reduceMotion: boolean }) {
    if (!items || items.length === 0) return <p className="text-xs text-[#5B6B7D] italic pl-1">None detected</p>;
    return (
        <div className="space-y-2">
            {items.map((item, i) => (
                <motion.div
                    key={i}
                    initial={{ opacity: 0, x: reduceMotion ? 0 : -12 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: reduceMotion ? 0 : i * 0.06, duration: reduceMotion ? 0 : undefined }}
                    className="flex items-center gap-3"
                >
                    <div className="h-1.5 rounded-full flex-shrink-0" style={{ width: `${Math.max(20, 100 - i * 15)}%`, backgroundColor: color, opacity: 1 - i * 0.12 }} />
                    <span className="text-xs text-[#0E2B5C] whitespace-nowrap">{item}</span>
                </motion.div>
            ))}
        </div>
    );
}

/** Metric card */
function MetricTile({
    icon: Icon, label, value, sub, color = 'text-[#00458B]',
}: {
    icon: React.ComponentType<{ size?: number; className?: string }>;
    label: string; value: string; sub?: string; color?: string;
}) {
    return (
        <div className="p-3.5 bg-[#F7F9FB] border border-[#DFE6EE] rounded-lg">
            <div className="flex items-center gap-2 mb-1.5">
                <Icon size={13} className={color} />
                <span className="text-[10px] text-[#5B6B7D] uppercase tracking-wider">{label}</span>
            </div>
            <p className="text-base font-semibold text-[#0E2B5C] leading-tight">{value}</p>
            {sub && <p className="text-[10px] text-[#5B6B7D] mt-0.5">{sub}</p>}
        </div>
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
                        <div
                            className={`px-2.5 py-1 rounded-full text-[10px] font-medium whitespace-nowrap
                                ${isActive
                                    ? 'bg-[#00458B]/10 text-[#00458B] border border-[#00458B]/30'
                                    : isPast
                                        ? 'bg-[#F7F9FB] text-[#5B6B7D] border border-[#DFE6EE]'
                                        : 'bg-white text-gray-400 border border-[#DFE6EE]'
                                }`}
                        >
                            {isActive && <span className="inline-block w-1.5 h-1.5 rounded-full bg-[#00458B] mr-1" />}
                            {stage}
                        </div>
                        {i < stages.length - 1 && (
                            <div className={`w-3 h-px flex-shrink-0 ${isPast ? 'bg-[#00458B]/30' : 'bg-[#DFE6EE]'}`} />
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
    const colors = ['#059669', '#d97706', '#dc2626'];
    const labels = ['Direct Buyer', 'Researchable', 'Weak'];

    return (
        <div className="flex items-center gap-4">
            <div className="flex gap-1">
                {[1, 2, 3].map(t => (
                    <div
                        key={t}
                        className="w-3 rounded-sm"
                        style={{
                            height: `${16 + (4 - t) * 8}px`,
                            backgroundColor: t <= tierNum ? colors[tierNum - 1] : '#F7F9FB',
                            border: t <= tierNum ? 'none' : '1px solid #DFE6EE',
                        }}
                    />
                ))}
            </div>
            <div>
                <p className="text-sm font-semibold text-[#0E2B5C]">{tier} <span className="text-xs text-[#5B6B7D] font-normal">({labels[tierNum - 1]})</span></p>
                <p className="text-[11px] text-[#5B6B7D]">{explanation}</p>
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
                    <CartesianGrid strokeDasharray="3 3" stroke="#F7F9FB" horizontal={false} />
                    <XAxis type="number" hide />
                    <YAxis type="category" dataKey="name" width={140} tick={{ fill: '#5B6B7D', fontSize: 10 }} axisLine={false} tickLine={false} />
                    <Tooltip
                        content={({ active, payload }) => {
                            if (!active || !payload?.length) return null;
                            return (
                                <div className="bg-white border border-[#DFE6EE] px-3 py-2 rounded-lg shadow-sm">
                                    <p className="text-xs text-red-700">{payload[0]?.payload?.fullName}</p>
                                </div>
                            );
                        }}
                    />
                    <Bar dataKey="severity" radius={[0, 4, 4, 0]}>
                        {data.map((_, i) => (
                            <Cell key={i} fill={`rgba(220, 38, 38, ${0.85 - i * 0.15})`} />
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
    title, icon: Icon, defaultOpen = false, count, children, reduceMotion,
}: {
    title: string; icon: React.ComponentType<{ size?: number; className?: string }>;
    defaultOpen?: boolean; count?: number; children: React.ReactNode; reduceMotion: boolean;
}) {
    const [open, setOpen] = useState(defaultOpen);
    return (
        <div className="border-t border-[#DFE6EE]">
            <button onClick={() => setOpen(!open)} className="w-full px-5 py-3 flex items-center justify-between hover:bg-[#F7F9FB] transition-colors">
                <div className="flex items-center gap-2.5">
                    <Icon size={15} className="text-[#5B6B7D]" />
                    <span className="text-xs font-semibold text-[#5B6B7D] uppercase tracking-wider">{title}</span>
                    {count != null && count > 0 && (
                        <span className="ml-1 px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-[#F7F9FB] border border-[#DFE6EE] text-[#5B6B7D]">{count}</span>
                    )}
                </div>
                <motion.div animate={{ rotate: open ? 180 : 0 }} transition={{ duration: reduceMotion ? 0 : 0.2 }}>
                    <ChevronDown size={14} className="text-[#5B6B7D]" />
                </motion.div>
            </button>
            <AnimatePresence>
                {open && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: reduceMotion ? 0 : 0.2 }}
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
    const reduceMotion = !!useReducedMotion();
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
            <div className="bg-white border border-[#DFE6EE] rounded-lg overflow-hidden">
                <Header />
                <div className="flex flex-col items-center justify-center py-14 gap-4">
                    <div className="w-14 h-14 rounded-full bg-blue-50 border border-blue-200 flex items-center justify-center">
                        <Brain size={22} className="text-[#00458B]" />
                    </div>
                    <div className="text-center">
                        <p className="text-sm text-[#0E2B5C] font-medium">Analyzing permit data...</p>
                        <p className="text-[11px] text-[#5B6B7D] mt-1">Master Permit Intelligence Engine v3.3</p>
                    </div>
                </div>
            </div>
        );
    }

    // ── Error ──
    if (error) {
        return (
            <div className="bg-white border border-[#DFE6EE] rounded-lg overflow-hidden">
                <Header />
                <div className="flex flex-col items-center justify-center py-12 gap-4">
                    <div className="w-14 h-14 rounded-full bg-red-50 border border-red-200 flex items-center justify-center">
                        <AlertTriangle size={22} className="text-red-600" />
                    </div>
                    <p className="text-sm text-[#5B6B7D] text-center max-w-sm">{error}</p>
                    <button onClick={runAnalysis} className="flex items-center gap-2 px-4 py-2 bg-blue-50 hover:bg-blue-100 border border-blue-200 text-[#00458B] rounded-lg transition-colors text-sm font-medium">
                        <RefreshCw size={14} /> Retry Analysis
                    </button>
                </div>
            </div>
        );
    }

    // ── Idle (not yet requested) ── on-demand to avoid an LLM call on every page view
    if (!analysis) {
        return (
            <div className="bg-white border border-[#DFE6EE] rounded-lg overflow-hidden">
                <Header />
                <div className="flex flex-col items-center justify-center py-12 gap-4">
                    <div className="w-14 h-14 rounded-full bg-blue-50 border border-blue-200 flex items-center justify-center">
                        <Brain size={22} className="text-[#00458B]" />
                    </div>
                    <p className="text-sm text-[#5B6B7D] text-center max-w-sm">
                        Run the Master Permit Intelligence Engine to score this permit and generate outreach guidance.
                    </p>
                    <button onClick={runAnalysis} className="flex items-center gap-2 px-4 py-2 bg-[#00458B] hover:bg-[#045CB4] text-white rounded-lg transition-colors text-sm font-medium">
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
            initial={{ opacity: 0, y: reduceMotion ? 0 : 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: reduceMotion ? 0 : 0.3 }}
            className="bg-white border border-[#DFE6EE] rounded-lg overflow-hidden"
        >
            {/* ── Header ── */}
            <div className="px-5 py-3 border-b border-[#DFE6EE] flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-[#00458B] flex items-center justify-center">
                        <Brain size={16} className="text-white" />
                    </div>
                    <div>
                        <h2 className="text-sm font-bold text-[#0E2B5C]">AI Permit Analysis</h2>
                        <p className="text-[10px] text-[#5B6B7D]">Intelligence Engine v3.3</p>
                    </div>
                </div>
                <button
                    onClick={runAnalysis}
                    disabled={loading}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-[#F7F9FB] border border-[#DFE6EE] rounded-lg transition-all text-[11px] text-[#5B6B7D] hover:text-[#0E2B5C]"
                >
                    <RefreshCw size={12} /> Re-analyze
                </button>
            </div>

            {/* ── Score Hero ── */}
            <div className="px-5 py-5">
                <div className="flex flex-col sm:flex-row items-center gap-6">
                    {/* Gauge */}
                    <ScoreGauge value={analysis.score.value} max={analysis.score.max} tier={tier} />

                    {/* Decision + summary */}
                    <div className="flex-1 text-center sm:text-left">
                        <div>
                            <div className="flex items-center gap-3 justify-center sm:justify-start mb-2">
                                <span className={`text-lg font-bold uppercase tracking-wide ${decColor}`}>
                                    {analysis.score.decision}
                                </span>
                                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${tier.bg} ${tier.text} border ${tier.border}`}>
                                    {analysis.score.rating}
                                </span>
                            </div>
                            <p className="text-xs text-[#5B6B7D] mb-1">{analysis.lead_type}</p>
                            <p className="text-sm text-[#0E2B5C] leading-relaxed">{analysis.analysis_summary}</p>
                        </div>

                        {/* Quick chips */}
                        <div className="flex flex-wrap gap-2 mt-3 justify-center sm:justify-start">
                            <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-semibold ${tier.bg} ${tier.text} border ${tier.border}`}>
                                <Target size={10} /> {analysis.pain_stage}
                            </span>
                            <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-semibold ${confidenceStyle(analysis.buyer_confidence).bg} ${confidenceStyle(analysis.buyer_confidence).text} border border-[#DFE6EE]`}>
                                <Users size={10} /> {analysis.reachability.tier}
                            </span>
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-semibold bg-[#F7F9FB] text-[#5B6B7D] border border-[#DFE6EE]">
                                <Mail size={10} /> {analysis.who_to_email}
                            </span>
                        </div>
                    </div>

                    {/* Buyer confidence donut */}
                    <div className="hidden sm:block">
                        <ConfidenceDonut confidence={analysis.buyer_confidence} />
                        <p className="text-[9px] text-[#5B6B7D] text-center mt-1">Buyer Conf.</p>
                    </div>
                </div>
            </div>

            {/* ── Pain Stage Pipeline ── */}
            <div className="px-5 pb-4">
                <p className="text-[10px] text-[#5B6B7D] uppercase tracking-wider mb-2">Pain Stage</p>
                <PainStagePipeline current={analysis.pain_stage} />
            </div>

            {/* ── Key Insights Cards ── */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 px-5 pb-5">
                <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                        <Zap size={14} className="text-amber-600" />
                        <span className="text-[10px] text-amber-700 uppercase tracking-wider font-semibold">Why Now</span>
                    </div>
                    <p className="text-sm text-[#0E2B5C] leading-relaxed">{analysis.why_matters_now}</p>
                </div>

                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                        <Mail size={14} className="text-[#00458B]" />
                        <span className="text-[10px] text-[#00458B] uppercase tracking-wider font-semibold">Outreach Angle</span>
                    </div>
                    <p className="text-sm text-[#0E2B5C] leading-relaxed italic">{analysis.best_outreach_angle}</p>
                </div>

                <div className="p-4 bg-[#F7F9FB] border border-[#DFE6EE] rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                        <Shield size={14} className="text-[#0E2B5C]" />
                        <span className="text-[10px] text-[#0E2B5C] uppercase tracking-wider font-semibold">Final Verdict</span>
                    </div>
                    <p className="text-sm text-[#0E2B5C] leading-relaxed font-medium">{analysis.final_verdict}</p>
                </div>
            </div>

            {/* ── Timing Metrics ── */}
            <Section title="Timing & Reachability" icon={Clock} defaultOpen reduceMotion={reduceMotion}>
                <div className="space-y-4">
                    <div className="grid grid-cols-3 gap-3">
                        <MetricTile
                            icon={Clock}
                            label="Days Since Issued"
                            value={analysis.timing.days_since_issued != null ? String(analysis.timing.days_since_issued) : '—'}
                            color="text-blue-700"
                        />
                        <MetricTile
                            icon={Activity}
                            label="Last Movement"
                            value={analysis.timing.last_movement_days != null ? `${analysis.timing.last_movement_days}d` : '—'}
                            color="text-emerald-700"
                        />
                        <MetricTile
                            icon={analysis.timing.amendment_active ? CheckCircle2 : XCircle}
                            label="Amendment Active"
                            value={analysis.timing.amendment_active ? 'Yes' : 'No'}
                            color={analysis.timing.amendment_active ? 'text-amber-700' : 'text-[#5B6B7D]'}
                        />
                    </div>
                    <ReachabilityGauge tier={analysis.reachability.tier} explanation={analysis.reachability.explanation} />
                </div>
            </Section>

            {/* ── Key Signals & Triggers ── */}
            <Section title="Key Signals & Reply Triggers" icon={TrendingUp} count={(analysis.key_signals?.length ?? 0) + (analysis.reply_triggers?.length ?? 0)} reduceMotion={reduceMotion}>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div>
                        <p className="text-[10px] text-[#00458B] uppercase tracking-wider font-semibold mb-3">Key Signals</p>
                        <SignalBars items={analysis.key_signals} color="#00458B" reduceMotion={reduceMotion} />
                    </div>
                    <div>
                        <p className="text-[10px] text-amber-700 uppercase tracking-wider font-semibold mb-3">Reply Triggers</p>
                        <SignalBars items={analysis.reply_triggers} color="#d97706" reduceMotion={reduceMotion} />
                    </div>
                </div>
                {analysis.builder_repeat_signals.length > 0 && (
                    <div className="mt-4">
                        <p className="text-[10px] text-emerald-700 uppercase tracking-wider font-semibold mb-3">Builder Repeat Signals</p>
                        <SignalBars items={analysis.builder_repeat_signals} color="#059669" reduceMotion={reduceMotion} />
                    </div>
                )}
            </Section>

            {/* ── Key Players & Cost ── */}
            <Section title="Key Players & Cost" icon={DollarSign} defaultOpen={!!(hasKeyPlayers || analysis.estimated_cost?.value != null)} reduceMotion={reduceMotion}>
                <div className="space-y-4">
                    {analysis.estimated_cost?.value != null && (
                        <div className="flex items-center gap-4 p-4 bg-emerald-50 border border-emerald-200 rounded-lg">
                            <div className="w-11 h-11 rounded-lg bg-white border border-emerald-200 flex items-center justify-center">
                                <DollarSign size={18} className="text-emerald-700" />
                            </div>
                            <div>
                                <p className="text-xl font-bold text-[#0E2B5C]">{formatCurrency(analysis.estimated_cost.value)}</p>
                                <div className="flex items-center gap-2 mt-0.5">
                                    {analysis.estimated_cost.confidence && (
                                        <span className={`text-[10px] px-1.5 py-0.5 rounded ${confidenceStyle(analysis.estimated_cost.confidence).bg} ${confidenceStyle(analysis.estimated_cost.confidence).text}`}>
                                            {analysis.estimated_cost.confidence}
                                        </span>
                                    )}
                                    {analysis.estimated_cost.method && <span className="text-[10px] text-[#5B6B7D]">{analysis.estimated_cost.method}</span>}
                                </div>
                                {analysis.estimated_cost.note && <p className="text-[11px] text-[#5B6B7D] mt-1">{analysis.estimated_cost.note}</p>}
                            </div>
                        </div>
                    )}

                    {analysis.key_players?.general_contractor?.name && (
                        <div className="flex items-center gap-3 p-3 bg-[#F7F9FB] rounded-lg border border-[#DFE6EE]">
                            <div className="w-9 h-9 rounded-lg bg-white border border-[#DFE6EE] flex items-center justify-center">
                                <Users size={15} className="text-[#00458B]" />
                            </div>
                            <div>
                                <p className="text-[10px] text-[#5B6B7D] uppercase tracking-wider">General Contractor</p>
                                <p className="text-sm text-[#0E2B5C] font-semibold">{analysis.key_players.general_contractor.name}</p>
                                <div className="flex items-center gap-2 mt-0.5">
                                    {analysis.key_players.general_contractor.contact_available && (
                                        <span className="text-[10px] text-emerald-700 flex items-center gap-1"><CheckCircle2 size={9} /> Contact available</span>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    {analysis.key_players?.subcontractors && analysis.key_players.subcontractors.length > 0 && (
                        <div className="space-y-1.5">
                            <p className="text-[10px] text-[#5B6B7D] uppercase tracking-wider">Subcontractors</p>
                            {analysis.key_players.subcontractors.map((sub, i) => (
                                <div key={i} className="flex items-center justify-between px-3 py-2 bg-white rounded-lg border border-[#DFE6EE]">
                                    <div className="flex items-center gap-2">
                                        <span className="text-[10px] text-[#5B6B7D] font-medium">{sub.trade}</span>
                                        <span className="text-xs text-[#0E2B5C]">{sub.name}</span>
                                    </div>
                                    {sub.estimated_value && <span className="text-xs text-[#5B6B7D] font-mono">{formatCurrency(sub.estimated_value)}</span>}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </Section>

            {/* ── Red Flags & Anomalies ── */}
            {hasFlags && (
                <Section title="Red Flags & Anomalies" icon={AlertTriangle} count={(analysis.red_flags?.length ?? 0) + (analysis.anomalies?.length ?? 0)} reduceMotion={reduceMotion}>
                    <div className="space-y-4">
                        {analysis.red_flags.length > 0 && (
                            <RedFlagsChart flags={analysis.red_flags} />
                        )}
                        {analysis.anomalies.length > 0 && (
                            <div className="space-y-2">
                                <p className="text-[10px] text-[#5B6B7D] uppercase tracking-wider">Data Anomalies</p>
                                {analysis.anomalies.map((a, i) => (
                                    <div key={i} className="flex items-start gap-2.5 p-3 bg-white rounded-lg border border-[#DFE6EE]">
                                        <AlertTriangle size={13} className={a.severity === 'high' ? 'text-red-600' : a.severity === 'medium' ? 'text-amber-600' : 'text-[#5B6B7D]'} />
                                        <div>
                                            <p className="text-xs text-[#0E2B5C]">{a.description}</p>
                                            <span className="text-[10px] text-[#5B6B7D]">{a.type} &middot; {a.severity}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </Section>
            )}

            {/* ── Kill reason ── */}
            {analysis.kill_reason_if_skip && (
                <div className="px-5 py-3 border-t border-red-200 bg-red-50">
                    <div className="flex items-center gap-2">
                        <XCircle size={13} className="text-red-600" />
                        <span className="text-[11px] text-red-700 font-semibold">Skip Reason:</span>
                        <span className="text-xs text-[#5B6B7D]">{analysis.kill_reason_if_skip}</span>
                    </div>
                </div>
            )}
        </motion.div>
    );
}

/** Shared header for loading/error states */
function Header() {
    return (
        <div className="px-5 py-3 border-b border-[#DFE6EE] flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#00458B] flex items-center justify-center">
                <Brain size={16} className="text-white" />
            </div>
            <div>
                <h2 className="text-sm font-bold text-[#0E2B5C]">AI Permit Analysis</h2>
                <p className="text-[10px] text-[#5B6B7D]">Intelligence Engine v3.3</p>
            </div>
        </div>
    );
}
