'use client';

import { useState, useEffect, useCallback } from 'react';
import {
    Flame, RefreshCw, CheckCircle, Pause,
    Play, Square, Edit2, Save, X, Plus,
    Shield, Activity,
} from 'lucide-react';
import { apiService } from '@/services/api';
import WarmupStatusBadge from '@/components/warmup/WarmupStatusBadge';

// ─── Types ────────────────────────────────────────────────────────────────────

interface WarmupStrategy {
    id: string;
    name: string;
    strategy_type: string;
    instantly_daily_limit: number;
    instantly_increment: number;
    instantly_reply_rate: number;
    max_outreach_per_inbox: number;
    total_daily_cap: number;
    combined_engines: number;
    warmup_days: number;
    min_health_score_for_campaigns: number;
    degraded_health_score: number;
    min_inbox_placement_rate: number;
    max_spam_rate: number;
    is_system: boolean;
}

interface InboxSummary {
    inbox_id: string;
    email: string;
    domain_id: string;
    status: string;
    health_score: number | null;
    health_label: string;
    strategy_name: string | null;
    instantly_enrolled: boolean;
    current_warmup_day: number;
    started_at: string | null;
    last_sync_at: string | null;
}

interface DashboardData {
    total_inboxes: number;
    status_counts: Record<string, number>;
    avg_health_score: number | null;
    inboxes: InboxSummary[];
}

interface AvailableInbox {
    inbox_id: string;
    email: string;
    domain_id: string;
    domain_name: string;
    is_enrolled: boolean;
    warmup_status: string | null;
    health_score: number | null;
}

interface HealthMetrics {
    spam_rate: number | null;
    complaint_rate: number | null;
    inbox_placement: number | null;
    delivery_error_rate: number | null;
    bounce_rate: number | null;
    reply_rate: number | null;
    open_rate: number | null;
    promotions_rate: number | null;
    dns_health_pct: number | null;
    dns_detail: { spf: boolean; dkim: boolean; dmarc: boolean; mx: boolean } | null;
    sending_consistency: number | null;
    domain_age_days: number | null;
    mailbox_age_days: number | null;
}

interface HealthSummary {
    inbox_id: string;
    email: string;
    domain_id: string;
    domain_name: string;
    is_enrolled: boolean;
    warmup_status: string | null;
    warmup_score: number | null;
    composite_score: number;
    tier: string;
    metrics: HealthMetrics;
}

// ─── Tabs ─────────────────────────────────────────────────────────────────────

const TABS = ['Overview', 'Analytics', 'Strategies'] as const;
type Tab = typeof TABS[number];

// ─── Tier helpers (5-tier composite score) ────────────────────────────────────

const TIER_CONFIG: Record<string, { bg: string; badge: string; dot: string }> = {
    Healthy:  { bg: 'bg-green-500/5',   badge: 'bg-green-500/15 text-green-400 border-green-500/20',   dot: 'bg-green-400' },
    Good:     { bg: 'bg-emerald-400/5', badge: 'bg-emerald-400/15 text-emerald-400 border-emerald-400/20', dot: 'bg-emerald-400' },
    Warning:  { bg: 'bg-yellow-400/5',  badge: 'bg-yellow-400/15 text-yellow-400 border-yellow-400/20',  dot: 'bg-yellow-400' },
    Poor:     { bg: 'bg-orange-500/5',  badge: 'bg-orange-500/15 text-orange-400 border-orange-500/20',  dot: 'bg-orange-400' },
    Critical: { bg: 'bg-red-500/8',     badge: 'bg-red-500/15 text-red-400 border-red-500/20',           dot: 'bg-red-500' },
};

function tierBadge(tier: string) {
    const cfg = TIER_CONFIG[tier] ?? TIER_CONFIG['Critical'];
    return (
        <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium border ${cfg.badge}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
            {tier}
        </span>
    );
}

function tierRowBg(tier: string): string {
    return TIER_CONFIG[tier]?.bg ?? '';
}

function pct(v: number | null, decimals = 1): string {
    if (v === null || v === undefined) return '—';
    return `${(v * 100).toFixed(decimals)}%`;
}

function num(v: number | null): string {
    if (v === null || v === undefined) return '—';
    return String(v);
}

// ─── Health score helper ──────────────────────────────────────────────────────

function healthColor(score: number | null): string {
    if (score === null) return 'text-gray-400';
    if (score >= 80) return 'text-emerald-400';
    if (score >= 60) return 'text-yellow-400';
    if (score >= 50) return 'text-orange-400';
    return 'text-rose-400';
}

function healthBarColor(score: number | null): string {
    if (score === null) return 'bg-gray-600';
    if (score >= 80) return 'bg-emerald-500';
    if (score >= 60) return 'bg-yellow-400';
    if (score >= 50) return 'bg-orange-400';
    return 'bg-rose-500';
}

// ─── Strategy validation ──────────────────────────────────────────────────────

function capWarning(form: Partial<WarmupStrategy>): string | null {
    const limit    = form.instantly_daily_limit ?? 0;
    const outreach = form.max_outreach_per_inbox ?? 0;
    const cap      = form.total_daily_cap ?? 0;
    const combined = limit + outreach;
    if (combined > cap) {
        return `Combined engines (${limit} warmup + ${outreach} outreach = ${combined}) exceed total cap of ${cap}. Raise the cap or reduce the limits.`;
    }
    return null;
}

// ─── Empty strategy form ──────────────────────────────────────────────────────

const EMPTY_STRATEGY: Partial<WarmupStrategy> = {
    name: '',
    strategy_type: 'custom',
    instantly_daily_limit: 10,
    instantly_increment: 1,
    instantly_reply_rate: 40,
    max_outreach_per_inbox: 15,
    total_daily_cap: 25,
    warmup_days: 30,
    min_health_score_for_campaigns: 80,
    degraded_health_score: 50,
    min_inbox_placement_rate: 0.85,
    max_spam_rate: 0.05,
};

// =============================================================================
// MAIN PAGE
// =============================================================================

export default function WarmupPage() {
    const [activeTab, setActiveTab] = useState<Tab>('Overview');
    const [dashboard, setDashboard] = useState<DashboardData | null>(null);
    const [strategies, setStrategies] = useState<WarmupStrategy[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [actionLoading, setActionLoading] = useState<string | null>(null);

    // Analytics tab
    const [healthSummary, setHealthSummary] = useState<HealthSummary[]>([]);
    const [healthLoading, setHealthLoading] = useState(false);

    // Strategy form
    const [showStrategyForm, setShowStrategyForm] = useState(false);
    const [editingStrategy, setEditingStrategy] = useState<WarmupStrategy | null>(null);
    const [strategyForm, setStrategyForm] = useState<Partial<WarmupStrategy>>(EMPTY_STRATEGY);
    const [strategyError, setStrategyError] = useState<string | null>(null);
    const [savingStrategy, setSavingStrategy] = useState(false);

    // Available (unenrolled) inboxes
    const [availableInboxes, setAvailableInboxes] = useState<AvailableInbox[]>([]);

    // Enroll dialog
    const [enrollInboxId, setEnrollInboxId] = useState<string | null>(null);
    const [enrollStrategyId, setEnrollStrategyId] = useState<string>('');

    // ─── Data fetching ────────────────────────────────────────────────────────

    const fetchDashboard = useCallback(async () => {
        try {
            const data = await apiService.get<DashboardData>('/warmup/dashboard');
            setDashboard(data);
        } catch (e: any) {
            setError(e?.message ?? 'Failed to load warmup dashboard');
        }
    }, []);

    const fetchStrategies = useCallback(async () => {
        try {
            const data = await apiService.get<WarmupStrategy[]>('/warmup/strategies');
            setStrategies(data);
        } catch (e: any) {
            setError(e?.message ?? 'Failed to load strategies');
        }
    }, []);

    const fetchAvailable = useCallback(async () => {
        try {
            const data = await apiService.get<AvailableInbox[]>('/warmup/inboxes/available');
            setAvailableInboxes(data);
        } catch {
            // non-fatal
        }
    }, []);

    const fetchHealthSummary = useCallback(async () => {
        setHealthLoading(true);
        try {
            const data = await apiService.get<HealthSummary[]>('/warmup/inboxes/health-summary');
            setHealthSummary(data);
        } catch {
            setHealthSummary([]);
        } finally {
            setHealthLoading(false);
        }
    }, []);

    useEffect(() => {
        (async () => {
            setLoading(true);
            await Promise.all([fetchDashboard(), fetchStrategies(), fetchAvailable()]);
            setLoading(false);
        })();
    }, [fetchDashboard, fetchStrategies, fetchAvailable]);

    useEffect(() => {
        if (activeTab === 'Analytics') fetchHealthSummary();
    }, [activeTab, fetchHealthSummary]);

    // ─── Actions ─────────────────────────────────────────────────────────────

    async function enrollInbox(inboxId: string, strategyId: string) {
        setActionLoading(`enroll-${inboxId}`);
        try {
            await apiService.post(`/warmup/inbox/${inboxId}/enroll`, { strategy_id: strategyId });
            setEnrollInboxId(null);
            await Promise.all([fetchDashboard(), fetchAvailable()]);
        } catch (e: any) {
            alert(e?.message ?? 'Enrollment failed');
        } finally {
            setActionLoading(null);
        }
    }

    async function inboxAction(action: 'pause' | 'resume' | 'stop', inboxId: string) {
        setActionLoading(`${action}-${inboxId}`);
        try {
            await apiService.post(`/warmup/inbox/${inboxId}/${action}`, {});
            await fetchDashboard();
        } catch (e: any) {
            alert(e?.message ?? `${action} failed`);
        } finally {
            setActionLoading(null);
        }
    }

    async function triggerSync() {
        setActionLoading('sync');
        try {
            await apiService.post('/warmup/sync', {});
            await fetchDashboard();
        } catch (e: any) {
            alert(e?.message ?? 'Sync failed');
        } finally {
            setActionLoading(null);
        }
    }

    async function saveStrategy() {
        const warning = capWarning(strategyForm);
        if (warning) { setStrategyError(warning); return; }
        if (!strategyForm.name?.trim()) { setStrategyError('Name is required'); return; }
        setSavingStrategy(true);
        try {
            if (editingStrategy) {
                await apiService.put(`/warmup/strategies/${editingStrategy.id}`, strategyForm);
            } else {
                await apiService.post('/warmup/strategies', strategyForm);
            }
            await fetchStrategies();
            setShowStrategyForm(false);
            setEditingStrategy(null);
            setStrategyForm(EMPTY_STRATEGY);
            setStrategyError(null);
        } catch (e: any) {
            setStrategyError(e?.message ?? 'Save failed');
        } finally {
            setSavingStrategy(false);
        }
    }

    async function deleteStrategy(id: string) {
        if (!confirm('Delete this strategy?')) return;
        try {
            await apiService.delete(`/warmup/strategies/${id}`);
            await fetchStrategies();
        } catch (e: any) {
            alert(e?.message ?? 'Delete failed');
        }
    }

    // ─── Render ───────────────────────────────────────────────────────────────

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <RefreshCw className="animate-spin text-orange-400" size={28} />
            </div>
        );
    }

    return (
        <div className="p-6 space-y-6 max-w-7xl mx-auto">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <Flame className="text-orange-400" size={26} />
                    <div>
                        <h1 className="text-xl font-semibold text-white">Inbox Warmup</h1>
                        <p className="text-sm text-gray-400">Instantly-powered warmup · Dual-engine send management</p>
                    </div>
                </div>
                <button
                    onClick={triggerSync}
                    disabled={actionLoading === 'sync'}
                    className="flex items-center gap-2 px-3 py-1.5 text-sm bg-gray-700 hover:bg-gray-600 text-gray-200 rounded-lg transition-colors disabled:opacity-50"
                >
                    <RefreshCw size={14} className={actionLoading === 'sync' ? 'animate-spin' : ''} />
                    Sync Now
                </button>
            </div>

            {error && (
                <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-lg text-rose-400 text-sm">
                    {error}
                </div>
            )}

            {/* KPI cards */}
            {dashboard && (
                <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                    {[
                        { label: 'Total Inboxes', value: dashboard.total_inboxes, icon: <Flame size={16} />, color: 'text-orange-400' },
                        { label: 'Warming Up', value: dashboard.status_counts['warming'] ?? 0, icon: <Activity size={16} />, color: 'text-blue-400' },
                        { label: 'Ready', value: dashboard.status_counts['completed'] ?? 0, icon: <CheckCircle size={16} />, color: 'text-emerald-400' },
                        { label: 'Paused', value: dashboard.status_counts['paused'] ?? 0, icon: <Pause size={16} />, color: 'text-amber-400' },
                        { label: 'Avg Health', value: dashboard.avg_health_score ? `${Math.round(dashboard.avg_health_score)}%` : '—', icon: <Shield size={16} />, color: 'text-purple-400' },
                    ].map(kpi => (
                        <div key={kpi.label} className="bg-gray-800/60 border border-gray-700/50 rounded-xl p-4">
                            <div className={`flex items-center gap-2 text-xs font-medium mb-1 ${kpi.color}`}>
                                {kpi.icon} {kpi.label}
                            </div>
                            <div className="text-2xl font-bold text-white">{kpi.value}</div>
                        </div>
                    ))}
                </div>
            )}

            {/* Tabs */}
            <div className="flex gap-1 border-b border-gray-700">
                {TABS.map(tab => (
                    <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                            activeTab === tab
                                ? 'border-orange-400 text-orange-400'
                                : 'border-transparent text-gray-400 hover:text-gray-200'
                        }`}
                    >
                        {tab}
                    </button>
                ))}
            </div>

            {/* ── Tab: Overview ─────────────────────────────────────────────── */}
            {activeTab === 'Overview' && dashboard && (
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="text-left text-gray-400 border-b border-gray-700">
                                <th className="pb-2 pr-4">Email</th>
                                <th className="pb-2 pr-4">Status</th>
                                <th className="pb-2 pr-4">Health</th>
                                <th className="pb-2 pr-4">Strategy</th>
                                <th className="pb-2 pr-4">Day #</th>
                                <th className="pb-2 pr-4">Last Sync</th>
                                <th className="pb-2">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-800">
                            {dashboard.inboxes.map(inbox => (
                                <tr key={inbox.inbox_id} className="hover:bg-gray-800/40">
                                    <td className="py-2.5 pr-4 font-mono text-xs text-gray-200">{inbox.email}</td>
                                    <td className="py-2.5 pr-4">
                                        <WarmupStatusBadge status={inbox.status} />
                                    </td>
                                    <td className="py-2.5 pr-4">
                                        {inbox.health_score !== null ? (
                                            <div className="flex items-center gap-2">
                                                <div className="w-16 h-1.5 rounded-full bg-gray-700">
                                                    <div
                                                        className={`h-full rounded-full ${healthBarColor(inbox.health_score)}`}
                                                        style={{ width: `${inbox.health_score}%` }}
                                                    />
                                                </div>
                                                <span className={`text-xs font-semibold ${healthColor(inbox.health_score)}`}>
                                                    {inbox.health_score}%
                                                </span>
                                            </div>
                                        ) : (
                                            <span className="text-gray-500 text-xs">—</span>
                                        )}
                                    </td>
                                    <td className="py-2.5 pr-4 text-gray-400 text-xs">{inbox.strategy_name ?? '—'}</td>
                                    <td className="py-2.5 pr-4 text-gray-400 text-xs">{inbox.current_warmup_day}</td>
                                    <td className="py-2.5 pr-4 text-gray-500 text-xs">
                                        {inbox.last_sync_at ? new Date(inbox.last_sync_at).toLocaleDateString() : '—'}
                                    </td>
                                    <td className="py-2.5">
                                        <InboxActions
                                            inbox={inbox}
                                            strategies={strategies}
                                            actionLoading={actionLoading}
                                            enrollInboxId={enrollInboxId}
                                            enrollStrategyId={enrollStrategyId}
                                            setEnrollInboxId={setEnrollInboxId}
                                            setEnrollStrategyId={setEnrollStrategyId}
                                            onEnroll={enrollInbox}
                                            onAction={inboxAction}
                                        />
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* ── Unenrolled inboxes ────────────────────────────────────────── */}
            {activeTab === 'Overview' && (() => {
                const unenrolled = availableInboxes.filter(i => !i.is_enrolled);
                if (unenrolled.length === 0) return null;
                return (
                    <div className="mt-6">
                        <div className="flex items-center gap-2 mb-3">
                            <Plus size={14} className="text-gray-400" />
                            <h3 className="text-sm font-medium text-gray-400">
                                Not Yet Enrolled ({unenrolled.length})
                            </h3>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="text-left text-gray-500 border-b border-gray-700/50">
                                        <th className="pb-2 pr-4">Email</th>
                                        <th className="pb-2 pr-4">Domain</th>
                                        <th className="pb-2">Enroll</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-800/50">
                                    {unenrolled.map(inbox => (
                                        <tr key={inbox.inbox_id} className="hover:bg-gray-800/30">
                                            <td className="py-2.5 pr-4 font-mono text-xs text-gray-300">{inbox.email}</td>
                                            <td className="py-2.5 pr-4 text-xs text-gray-500">{inbox.domain_name}</td>
                                            <td className="py-2.5">
                                                {enrollInboxId === inbox.inbox_id ? (
                                                    <div className="flex items-center gap-2">
                                                        <select
                                                            value={enrollStrategyId}
                                                            onChange={e => setEnrollStrategyId(e.target.value)}
                                                            className="bg-gray-700 border border-gray-600 text-gray-200 rounded px-2 py-1 text-xs"
                                                        >
                                                            <option value="">Pick strategy…</option>
                                                            {strategies.map(s => (
                                                                <option key={s.id} value={s.id}>{s.name}</option>
                                                            ))}
                                                        </select>
                                                        <button
                                                            disabled={!enrollStrategyId || actionLoading === `enroll-${inbox.inbox_id}`}
                                                            onClick={() => enrollInbox(inbox.inbox_id, enrollStrategyId)}
                                                            className="px-2 py-1 text-xs bg-orange-500 hover:bg-orange-600 text-white rounded disabled:opacity-50"
                                                        >
                                                            {actionLoading === `enroll-${inbox.inbox_id}` ? '…' : 'Start'}
                                                        </button>
                                                        <button onClick={() => setEnrollInboxId(null)} className="text-gray-400 hover:text-white">
                                                            <X size={12} />
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <button
                                                        onClick={() => { setEnrollInboxId(inbox.inbox_id); setEnrollStrategyId(''); }}
                                                        className="flex items-center gap-1.5 px-2.5 py-1 text-xs bg-orange-500/15 text-orange-400 hover:bg-orange-500/25 border border-orange-500/20 rounded-lg transition-colors"
                                                    >
                                                        <Flame size={11} /> Enroll in Warmup
                                                    </button>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                );
            })()}

            {/* ── Tab: Analytics ────────────────────────────────────────────── */}
            {activeTab === 'Analytics' && (
                <div className="space-y-3">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-gray-400">
                                Composite health score per inbox — Postmaster (domain) + email sends + reply rate.
                                <span className="text-gray-500"> Warmup Pool score (Instantly) shown separately.</span>
                            </p>
                        </div>
                        <button
                            onClick={fetchHealthSummary}
                            disabled={healthLoading}
                            className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-gray-700 hover:bg-gray-600 text-gray-200 rounded-lg transition-colors disabled:opacity-50"
                        >
                            <RefreshCw size={12} className={healthLoading ? 'animate-spin' : ''} />
                            Refresh
                        </button>
                    </div>

                    {healthLoading && healthSummary.length === 0 && (
                        <div className="flex items-center justify-center py-20">
                            <RefreshCw className="animate-spin text-gray-500" size={22} />
                        </div>
                    )}

                    {!healthLoading && healthSummary.length === 0 && (
                        <div className="text-center py-16 text-gray-500 text-sm">
                            No active inboxes found. Enroll inboxes in the Overview tab first.
                        </div>
                    )}

                    {healthSummary.length > 0 && (
                        <div className="overflow-x-auto rounded-xl border border-gray-700/50">
                            <table className="w-full text-xs min-w-300">
                                <thead>
                                    <tr className="text-left text-gray-500 border-b border-gray-700 bg-gray-800/80">
                                        <th className="px-3 py-2.5 font-medium">Email</th>
                                        <th className="px-3 py-2.5 font-medium">Tier</th>
                                        <th className="px-3 py-2.5 font-medium text-right">Score</th>
                                        <th className="px-3 py-2.5 font-medium text-right" title="Warmup pool health from Instantly">Warmup Pool</th>
                                        <th className="px-3 py-2.5 font-medium text-right" title="Postmaster spam_rate 7-day avg">Spam Rate</th>
                                        <th className="px-3 py-2.5 font-medium text-right" title="1 - Postmaster delivery_error_rate">Inbox Placement</th>
                                        <th className="px-3 py-2.5 font-medium text-right" title="Bounced / Total from email_sends (30d)">Bounce Rate</th>
                                        <th className="px-3 py-2.5 font-medium text-right" title="SUM(open_count) / sent (30d) — requires tracking pixel">Opens</th>
                                        <th className="px-3 py-2.5 font-medium text-right" title="Seed-inbox Gmail API check (daily job 10:10 UTC)">Promotions %</th>
                                        <th className="px-3 py-2.5 font-medium text-right" title="Replies / Sent (30d)">Reply Rate</th>
                                        <th className="px-3 py-2.5 font-medium text-center" title="SPF + DKIM + DMARC + MX">DNS</th>
                                        <th className="px-3 py-2.5 font-medium text-right" title="Active send days / 30">Consistency</th>
                                        <th className="px-3 py-2.5 font-medium text-right">Domain Age</th>
                                        <th className="px-3 py-2.5 font-medium text-right">Inbox Age</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-700/40">
                                    {healthSummary.map(row => {
                                        const m = row.metrics;
                                        const rowBg = tierRowBg(row.tier);
                                        const dnsCount = m.dns_detail
                                            ? [m.dns_detail.spf, m.dns_detail.dkim, m.dns_detail.dmarc, m.dns_detail.mx].filter(Boolean).length
                                            : null;
                                        return (
                                            <tr key={row.inbox_id} className={`${rowBg} hover:bg-gray-800/40 transition-colors`}>
                                                <td className="px-3 py-2.5">
                                                    <div className="font-mono text-gray-200">{row.email}</div>
                                                    <div className="text-gray-500 mt-0.5">{row.domain_name}</div>
                                                </td>
                                                <td className="px-3 py-2.5">{tierBadge(row.tier)}</td>
                                                <td className="px-3 py-2.5 text-right">
                                                    <span className="font-bold text-white">{row.composite_score}</span>
                                                    <span className="text-gray-500">/100</span>
                                                </td>
                                                <td className="px-3 py-2.5 text-right text-gray-400">
                                                    {row.warmup_score !== null ? `${row.warmup_score}` : '—'}
                                                </td>
                                                <td className="px-3 py-2.5 text-right">
                                                    <MetricCell value={m.spam_rate} formatter={v => pct(v, 2)} dangerAbove={0.02} warnAbove={0.01} invert={false} />
                                                </td>
                                                <td className="px-3 py-2.5 text-right">
                                                    <MetricCell value={m.inbox_placement} formatter={v => pct(v)} dangerBelow={0.85} warnBelow={0.95} invert={true} />
                                                </td>
                                                <td className="px-3 py-2.5 text-right">
                                                    <MetricCell value={m.bounce_rate} formatter={v => pct(v, 2)} dangerAbove={0.05} warnAbove={0.02} invert={false} />
                                                </td>
                                                <td className="px-3 py-2.5 text-right">
                                                    <MetricCell value={m.open_rate} formatter={v => pct(v)} dangerBelow={0.10} warnBelow={0.20} invert={true} />
                                                </td>
                                                <td className="px-3 py-2.5 text-right">
                                                    <MetricCell value={m.promotions_rate} formatter={v => pct(v)} dangerAbove={0.50} warnAbove={0.30} invert={false} />
                                                </td>
                                                <td className="px-3 py-2.5 text-right">
                                                    <MetricCell value={m.reply_rate} formatter={v => pct(v)} dangerBelow={0.02} warnBelow={0.05} invert={true} />
                                                </td>
                                                <td className="px-3 py-2.5 text-center">
                                                    {dnsCount !== null ? (
                                                        <span className={`font-medium ${dnsCount === 4 ? 'text-emerald-400' : dnsCount >= 3 ? 'text-yellow-400' : 'text-red-400'}`}>
                                                            {dnsCount}/4
                                                        </span>
                                                    ) : '—'}
                                                </td>
                                                <td className="px-3 py-2.5 text-right">
                                                    <MetricCell value={m.sending_consistency} formatter={v => pct(v)} dangerBelow={0.50} warnBelow={0.80} invert={true} />
                                                </td>
                                                <td className="px-3 py-2.5 text-right text-gray-400">
                                                    {m.domain_age_days !== null ? `${m.domain_age_days}d` : '—'}
                                                </td>
                                                <td className="px-3 py-2.5 text-right text-gray-400">
                                                    {m.mailbox_age_days !== null ? `${m.mailbox_age_days}d` : '—'}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {/* Legend */}
                    <div className="flex items-center gap-4 flex-wrap text-xs text-gray-500 pt-1">
                        <span className="font-medium text-gray-400">Tiers:</span>
                        {Object.entries(TIER_CONFIG).map(([tier, cfg]) => (
                            <span key={tier} className="flex items-center gap-1">
                                <span className={`w-2 h-2 rounded-full ${cfg.dot}`} />{tier}
                            </span>
                        ))}
                        <span className="ml-2">· Opens + Promotions % populate after pixel hits + daily placement job run.</span>
                    </div>
                </div>
            )}

            {/* ── Tab: Strategies ───────────────────────────────────────────── */}
            {activeTab === 'Strategies' && (
                <div className="space-y-4">
                    <div className="flex justify-end">
                        <button
                            onClick={() => { setShowStrategyForm(true); setEditingStrategy(null); setStrategyForm(EMPTY_STRATEGY); setStrategyError(null); }}
                            className="flex items-center gap-2 px-3 py-1.5 text-sm bg-orange-500 hover:bg-orange-600 text-white rounded-lg transition-colors"
                        >
                            <Plus size={14} /> New Strategy
                        </button>
                    </div>

                    {/* Strategy list */}
                    <div className="space-y-3">
                        {strategies.map(s => (
                            <div key={s.id} className="bg-gray-800/60 border border-gray-700/50 rounded-xl p-4">
                                <div className="flex items-start justify-between">
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <span className="font-medium text-white">{s.name}</span>
                                            {s.is_system && (
                                                <span className="text-xs bg-gray-600/40 text-gray-400 px-1.5 py-0.5 rounded">System</span>
                                            )}
                                        </div>
                                        <div className="mt-2 grid grid-cols-2 md:grid-cols-4 gap-x-6 gap-y-1 text-xs text-gray-400">
                                            <span>Warmup: <span className="text-blue-400 font-medium">{s.instantly_daily_limit}/day</span></span>
                                            <span>Outreach: <span className="text-orange-400 font-medium">{s.max_outreach_per_inbox}/day</span></span>
                                            <span>Total Cap: <span className="text-gray-200 font-medium">{s.total_daily_cap}/day</span></span>
                                            <span>Warmup Days: <span className="text-gray-200 font-medium">{s.warmup_days}d</span></span>
                                            <span>Reply Rate: <span className="text-gray-200 font-medium">{s.instantly_reply_rate}%</span></span>
                                            <span>Min Health: <span className="text-emerald-400 font-medium">{s.min_health_score_for_campaigns}%</span></span>
                                            <span>Degrade: <span className="text-amber-400 font-medium">&lt;{s.degraded_health_score}%</span></span>
                                            <span>Max Spam: <span className="text-rose-400 font-medium">{(s.max_spam_rate * 100).toFixed(0)}%</span></span>
                                        </div>
                                        {/* Combined load indicator */}
                                        <div className="mt-2 flex items-center gap-2">
                                            <div className="text-xs text-gray-500">
                                                Combined: {s.combined_engines} / {s.total_daily_cap} emails/day
                                            </div>
                                            <div className="flex-1 max-w-32 h-1.5 rounded-full bg-gray-700">
                                                <div
                                                    className={`h-full rounded-full ${s.combined_engines > s.total_daily_cap ? 'bg-rose-500' : 'bg-emerald-500'}`}
                                                    style={{ width: `${Math.min((s.combined_engines / s.total_daily_cap) * 100, 100)}%` }}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2 ml-4 shrink-0">
                                        <button
                                            onClick={() => { setEditingStrategy(s); setStrategyForm(s); setShowStrategyForm(true); setStrategyError(null); }}
                                            className="p-1.5 text-gray-400 hover:text-gray-200 hover:bg-gray-700 rounded transition-colors"
                                        >
                                            <Edit2 size={14} />
                                        </button>
                                        {!s.is_system && (
                                            <button
                                                onClick={() => deleteStrategy(s.id)}
                                                className="p-1.5 text-gray-400 hover:text-rose-400 hover:bg-rose-500/10 rounded transition-colors"
                                            >
                                                <X size={14} />
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Strategy form drawer */}
                    {showStrategyForm && (
                        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
                            <div className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                                <div className="flex items-center justify-between p-5 border-b border-gray-700">
                                    <h2 className="font-semibold text-white">
                                        {editingStrategy ? `Edit: ${editingStrategy.name}` : 'New Warmup Strategy'}
                                    </h2>
                                    <button onClick={() => setShowStrategyForm(false)} className="text-gray-400 hover:text-white">
                                        <X size={18} />
                                    </button>
                                </div>
                                <div className="p-5 space-y-4">
                                    <StrategyForm
                                        form={strategyForm}
                                        onChange={setStrategyForm}
                                        error={strategyError}
                                        isSystem={editingStrategy?.is_system ?? false}
                                    />
                                </div>
                                <div className="flex items-center justify-end gap-3 p-5 border-t border-gray-700">
                                    <button
                                        onClick={() => setShowStrategyForm(false)}
                                        className="px-4 py-2 text-sm text-gray-400 hover:text-white transition-colors"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={saveStrategy}
                                        disabled={savingStrategy || !!capWarning(strategyForm)}
                                        className="flex items-center gap-2 px-4 py-2 text-sm bg-orange-500 hover:bg-orange-600 text-white rounded-lg transition-colors disabled:opacity-50"
                                    >
                                        {savingStrategy ? <RefreshCw size={14} className="animate-spin" /> : <Save size={14} />}
                                        Save Strategy
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

// =============================================================================
// METRIC CELL — color-codes a single metric value
// =============================================================================

function MetricCell({
    value,
    formatter,
    dangerAbove,
    warnAbove,
    dangerBelow,
    warnBelow,
    invert: _invert,
}: {
    value: number | null;
    formatter: (v: number) => string;
    dangerAbove?: number;
    warnAbove?: number;
    dangerBelow?: number;
    warnBelow?: number;
    invert?: boolean;
}) {
    if (value === null || value === undefined) {
        return <span className="text-gray-600">—</span>;
    }

    let color = 'text-gray-300';
    if (dangerAbove !== undefined && value > dangerAbove)   color = 'text-red-400';
    else if (warnAbove !== undefined && value > warnAbove)  color = 'text-yellow-400';
    else if (dangerBelow !== undefined && value < dangerBelow) color = 'text-red-400';
    else if (warnBelow !== undefined && value < warnBelow)  color = 'text-yellow-400';
    else                                                     color = 'text-emerald-400';

    return <span className={`font-medium ${color}`}>{formatter(value)}</span>;
}

// =============================================================================
// STRATEGY FORM COMPONENT
// =============================================================================

function StrategyForm({
    form,
    onChange,
    error,
    isSystem,
}: {
    form: Partial<WarmupStrategy>;
    onChange: (f: Partial<WarmupStrategy>) => void;
    error: string | null;
    isSystem: boolean;
}) {
    const set = (key: keyof WarmupStrategy, val: any) => onChange({ ...form, [key]: val });
    const warning = capWarning(form);

    return (
        <div className="space-y-5">
            {error && (
                <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-lg text-rose-400 text-sm">{error}</div>
            )}

            {/* Name */}
            <Field label="Name">
                <input
                    type="text"
                    value={form.name ?? ''}
                    onChange={e => set('name', e.target.value)}
                    placeholder="e.g. My Custom Strategy"
                    className="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white"
                />
            </Field>

            <div className="border-t border-gray-700 pt-4">
                <p className="text-xs font-semibold text-blue-400 uppercase tracking-wider mb-3">Instantly Warmup Settings</p>
                <div className="grid grid-cols-3 gap-3">
                    <NumberField label="Daily Warmup Limit" note="emails/day Instantly sends" value={form.instantly_daily_limit ?? 20} min={5} max={100} onChange={v => set('instantly_daily_limit', v)} />
                    <NumberField label="Daily Increment"    note="extra emails per ramp day" value={form.instantly_increment ?? 2}    min={1} max={10}  onChange={v => set('instantly_increment', v)} />
                    <NumberField label="Reply Rate %"       note="% of warmup emails replied to" value={form.instantly_reply_rate ?? 50} min={20} max={80} onChange={v => set('instantly_reply_rate', v)} />
                </div>
            </div>

            <div className="border-t border-gray-700 pt-4">
                <p className="text-xs font-semibold text-orange-400 uppercase tracking-wider mb-3">Outreach Cap</p>
                <div className="grid grid-cols-2 gap-3">
                    <NumberField label="Max Outreach Per Inbox" note="campaign/message-button sends/day" value={form.max_outreach_per_inbox ?? 15} min={0} max={25} onChange={v => set('max_outreach_per_inbox', v)} />
                    <div>
                        <NumberField label="Total Daily Cap" note="hard ceiling — max 25 emails/inbox/day" value={form.total_daily_cap ?? 25} min={5} max={25} onChange={v => set('total_daily_cap', v)} />
                        {/* Live combined sum indicator */}
                        <div className={`mt-1.5 text-xs font-medium ${warning ? 'text-rose-400' : 'text-emerald-400'}`}>
                            {(form.instantly_daily_limit ?? 0)} warmup + {(form.max_outreach_per_inbox ?? 0)} outreach = {(form.instantly_daily_limit ?? 0) + (form.max_outreach_per_inbox ?? 0)} / {form.total_daily_cap ?? 0} cap
                            {warning && <span className="block text-rose-400 mt-0.5">⚠ {warning}</span>}
                        </div>
                    </div>
                </div>
            </div>

            <div className="border-t border-gray-700 pt-4">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Warmup Duration</p>
                <NumberField label="Warmup Days" note="days before inbox is marked Ready" value={form.warmup_days ?? 42} min={14} max={180} onChange={v => set('warmup_days', v)} />
            </div>

            <div className="border-t border-gray-700 pt-4">
                <p className="text-xs font-semibold text-emerald-400 uppercase tracking-wider mb-3">Health Thresholds</p>
                <div className="grid grid-cols-2 gap-3">
                    <NumberField label="Min Health for Campaigns" note="below this → inbox excluded from outreach" value={form.min_health_score_for_campaigns ?? 80} min={30} max={100} onChange={v => set('min_health_score_for_campaigns', v)} />
                    <NumberField label="Degrade Threshold"        note="below this → log health_degraded event"   value={form.degraded_health_score ?? 50}          min={20} max={90}  onChange={v => set('degraded_health_score', v)} />
                    <FloatField  label="Min Inbox Placement Rate" note="warn if landed_inbox/sent falls below"     value={form.min_inbox_placement_rate ?? 0.85}     min={0} max={1}   step={0.01} onChange={v => set('min_inbox_placement_rate', v)} />
                    <FloatField  label="Max Spam Rate"            note="warn/degrade if landed_spam/sent exceeds"  value={form.max_spam_rate ?? 0.05}                min={0} max={0.5} step={0.01} onChange={v => set('max_spam_rate', v)} />
                </div>
            </div>
        </div>
    );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
    return (
        <div>
            <label className="block text-xs font-medium text-gray-400 mb-1">{label}</label>
            {children}
        </div>
    );
}

function NumberField({ label, note, value, min, max, onChange }: { label: string; note: string; value: number; min: number; max: number; onChange: (v: number) => void }) {
    return (
        <Field label={label}>
            <input
                type="number"
                value={value}
                min={min}
                max={max}
                onChange={e => onChange(Number(e.target.value))}
                className="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white"
            />
            <p className="text-xs text-gray-500 mt-0.5">{note}</p>
        </Field>
    );
}

function FloatField({ label, note, value, min, max, step, onChange }: { label: string; note: string; value: number; min: number; max: number; step: number; onChange: (v: number) => void }) {
    return (
        <Field label={label}>
            <input
                type="number"
                value={value}
                min={min}
                max={max}
                step={step}
                onChange={e => onChange(parseFloat(e.target.value))}
                className="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white"
            />
            <p className="text-xs text-gray-500 mt-0.5">{note}</p>
        </Field>
    );
}

// =============================================================================
// INBOX ACTIONS COMPONENT
// =============================================================================

function InboxActions({
    inbox,
    strategies,
    actionLoading,
    enrollInboxId,
    enrollStrategyId,
    setEnrollInboxId,
    setEnrollStrategyId,
    onEnroll,
    onAction,
}: {
    inbox: InboxSummary;
    strategies: WarmupStrategy[];
    actionLoading: string | null;
    enrollInboxId: string | null;
    enrollStrategyId: string;
    setEnrollInboxId: (id: string | null) => void;
    setEnrollStrategyId: (id: string) => void;
    onEnroll: (inboxId: string, strategyId: string) => void;
    onAction: (action: 'pause' | 'resume' | 'stop', inboxId: string) => void;
}) {
    const isEnrolling = enrollInboxId === inbox.inbox_id;

    if (inbox.status === 'not_started' || !inbox.instantly_enrolled) {
        return isEnrolling ? (
            <div className="flex items-center gap-2">
                <select
                    value={enrollStrategyId}
                    onChange={e => setEnrollStrategyId(e.target.value)}
                    className="bg-gray-700 border border-gray-600 text-gray-200 rounded px-2 py-1 text-xs"
                >
                    <option value="">Select strategy…</option>
                    {strategies.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
                <button
                    disabled={!enrollStrategyId || actionLoading === `enroll-${inbox.inbox_id}`}
                    onClick={() => onEnroll(inbox.inbox_id, enrollStrategyId)}
                    className="px-2 py-1 text-xs bg-blue-500 hover:bg-blue-600 text-white rounded disabled:opacity-50"
                >
                    {actionLoading === `enroll-${inbox.inbox_id}` ? '…' : 'Confirm'}
                </button>
                <button onClick={() => setEnrollInboxId(null)} className="text-gray-400 hover:text-white">
                    <X size={12} />
                </button>
            </div>
        ) : (
            <button
                onClick={() => { setEnrollInboxId(inbox.inbox_id); setEnrollStrategyId(''); }}
                className="flex items-center gap-1 px-2 py-1 text-xs bg-blue-500/15 text-blue-400 hover:bg-blue-500/25 rounded transition-colors"
            >
                <Flame size={11} /> Enroll
            </button>
        );
    }

    return (
        <div className="flex items-center gap-1">
            {inbox.status === 'warming' && (
                <button
                    onClick={() => onAction('pause', inbox.inbox_id)}
                    disabled={actionLoading === `pause-${inbox.inbox_id}`}
                    className="p-1.5 text-gray-400 hover:text-amber-400 hover:bg-amber-500/10 rounded transition-colors disabled:opacity-50"
                    title="Pause warmup"
                >
                    <Pause size={13} />
                </button>
            )}
            {inbox.status === 'paused' && (
                <button
                    onClick={() => onAction('resume', inbox.inbox_id)}
                    disabled={actionLoading === `resume-${inbox.inbox_id}`}
                    className="p-1.5 text-gray-400 hover:text-emerald-400 hover:bg-emerald-500/10 rounded transition-colors disabled:opacity-50"
                    title="Resume warmup"
                >
                    <Play size={13} />
                </button>
            )}
            <button
                onClick={() => { if (confirm('Stop warmup for this inbox?')) onAction('stop', inbox.inbox_id); }}
                disabled={actionLoading === `stop-${inbox.inbox_id}`}
                className="p-1.5 text-gray-400 hover:text-rose-400 hover:bg-rose-500/10 rounded transition-colors disabled:opacity-50"
                title="Stop warmup"
            >
                <Square size={13} />
            </button>
        </div>
    );
}
