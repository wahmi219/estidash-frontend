'use client';

import { useEffect, useId, useState, useCallback } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import {
    Activity, RefreshCw, AlertTriangle, ShieldCheck, ShieldAlert,
    Inbox, Server, MessageSquare, TrendingUp, CheckCircle, XCircle,
} from 'lucide-react';
import {
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import { apiService } from '@/services/api';
import type {
    HealthOverview, DomainHealthRow, InboxHealthRow, DeliverabilityData,
    ReplyIntelligence, TechnicalStatus, RecommendationsResult,
} from '@/types';

// ─── Helpers ───────────────────────────────────────────────────────────────

function bandClasses(status: 'healthy' | 'warning' | 'critical' | string): string {
    if (status === 'healthy') return 'bg-emerald-500/15 text-emerald-400';
    if (status === 'warning') return 'bg-amber-500/15 text-amber-400';
    return 'bg-rose-500/15 text-rose-400';
}

function scoreText(score: number): string {
    if (score >= 80) return 'text-emerald-400';
    if (score >= 50) return 'text-amber-400';
    return 'text-rose-400';
}

const severityClasses: Record<string, string> = {
    critical: 'border-rose-500/40 bg-rose-500/[0.06]',
    warning: 'border-amber-500/40 bg-amber-500/[0.06]',
    info: 'border-cyan-500/40 bg-cyan-500/[0.06]',
};

const INTENT_LABEL: Record<string, string> = {
    hot_lead: 'Hot lead', soft: 'Soft', not_now: 'Not now', no: 'Not interested',
};

// ─── Card shell ──────────────────────────────────────────────────────────────

function Card({ title, subtitle, icon, children }: {
    title: string; subtitle?: string; icon: React.ReactNode; children: React.ReactNode;
}) {
    return (
        <div className="bg-gray-950/80 backdrop-blur-sm border border-white/[0.08] rounded-2xl p-5">
            <div className="flex items-center gap-3 mb-4">
                <div className="p-2 rounded-xl bg-cyan-500/15">{icon}</div>
                <div>
                    <h3 className="font-semibold text-white">{title}</h3>
                    {subtitle && <p className="text-xs text-gray-500">{subtitle}</p>}
                </div>
            </div>
            {children}
        </div>
    );
}

function Kpi({ label, value, tone }: { label: string; value: number | string; tone?: string }) {
    return (
        <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-4">
            <div className="text-[10px] uppercase tracking-widest text-gray-500 mb-1">{label}</div>
            <div className={`text-2xl font-mono font-bold ${tone ?? 'text-white'}`}>{value}</div>
        </div>
    );
}

// ─── Main ────────────────────────────────────────────────────────────────────

export default function HealthTab() {
    const pref = useReducedMotion();
    const gradientId = useId();

    const [overview, setOverview] = useState<HealthOverview | null>(null);
    const [domains, setDomains] = useState<DomainHealthRow[]>([]);
    const [inboxes, setInboxes] = useState<InboxHealthRow[]>([]);
    const [deliverability, setDeliverability] = useState<DeliverabilityData | null>(null);
    const [reply, setReply] = useState<ReplyIntelligence | null>(null);
    const [technical, setTechnical] = useState<TechnicalStatus | null>(null);
    const [recs, setRecs] = useState<RecommendationsResult | null>(null);
    const [loading, setLoading] = useState(true);
    const [recsLoading, setRecsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const loadAll = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const [ov, dom, inb, del, rep, tech, rc] = await Promise.all([
                apiService.getHealthOverview(),
                apiService.getDomainsHealth(),
                apiService.getInboxesHealth(),
                apiService.getDeliverability(),
                apiService.getReplyIntelligence(),
                apiService.getTechnicalStatus(),
                apiService.getHealthRecommendations(),
            ]);
            setOverview(ov); setDomains(dom); setInboxes(inb);
            setDeliverability(del); setReply(rep); setTechnical(tech); setRecs(rc);
        } catch {
            setError('Failed to load health data.');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { loadAll(); }, [loadAll]);

    const refreshRecs = async () => {
        setRecsLoading(true);
        try {
            setRecs(await apiService.refreshHealthRecommendations());
        } catch {
            /* keep prior recommendations on failure */
        } finally {
            setRecsLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center py-24 text-gray-500">
                <RefreshCw className="w-5 h-5 animate-spin mr-2" /> Loading health data…
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex items-center justify-center py-24 text-rose-400">
                <AlertTriangle className="w-5 h-5 mr-2" /> {error}
                <button onClick={loadAll} className="ml-4 underline text-gray-400 hover:text-white">Retry</button>
            </div>
        );
    }

    return (
        <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: pref ? 0 : 0.2 }}
            className="space-y-6"
        >
            {/* 1. Executive Overview */}
            {overview && (
                <Card title="Executive Overview" subtitle="Cold-email mission control" icon={<Activity className="w-5 h-5 text-cyan-400" />}>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                        <Kpi label="Domains Active" value={overview.domains_active} />
                        <Kpi label="Domains At Risk" value={overview.domains_at_risk} tone={overview.domains_at_risk > 0 ? 'text-rose-400' : 'text-white'} />
                        <Kpi label="Healthy Inboxes" value={overview.healthy_inboxes} tone="text-emerald-400" />
                        <Kpi label="Warmup Inboxes" value={overview.warmup_inboxes} tone="text-amber-400" />
                        <Kpi label="Paused Inboxes" value={overview.paused_inboxes} />
                        <Kpi label="In Spam (approx)" value={overview.inboxes_in_spam} tone={overview.inboxes_in_spam > 0 ? 'text-rose-400' : 'text-white'} />
                        <Kpi label="Sent Today" value={overview.emails_sent_today} />
                        <Kpi label="Replies Today" value={overview.replies_today} />
                        <Kpi label="Hot Leads Today" value={overview.hot_leads_today} tone="text-emerald-400" />
                        <Kpi label="Bounce Rate" value={`${overview.bounce_rate}%`} tone={overview.bounce_rate > 3 ? 'text-rose-400' : 'text-white'} />
                    </div>
                </Card>
            )}

            {/* 2. AI Recommendations */}
            <Card title="AI Recommendations" subtitle="Prioritized deliverability actions" icon={<ShieldAlert className="w-5 h-5 text-cyan-400" />}>
                <div className="flex justify-end -mt-12 mb-3">
                    <button
                        onClick={refreshRecs} disabled={recsLoading}
                        className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-white px-3 py-1.5 rounded-lg border border-white/[0.08] focus-visible:ring-2 focus-visible:ring-cyan-400 disabled:opacity-50"
                    >
                        <RefreshCw className={`w-3.5 h-3.5 ${recsLoading ? 'animate-spin' : ''}`} /> Refresh
                    </button>
                </div>
                {recs?.recommendations && recs.recommendations.length > 0 ? (
                    <div className="space-y-3">
                        {recs.recommendations.map((r, idx) => (
                            <div key={idx} className={`border rounded-xl p-4 ${severityClasses[r.severity] ?? severityClasses.info}`}>
                                <div className="flex items-center justify-between mb-1">
                                    <span className="font-mono text-sm text-white">{r.target}</span>
                                    <span className={`text-[10px] uppercase tracking-widest px-2 py-0.5 rounded-full ${bandClasses(r.severity === 'critical' ? 'critical' : r.severity === 'warning' ? 'warning' : 'healthy')}`}>
                                        {r.severity}
                                    </span>
                                </div>
                                <p className="text-sm text-gray-300">{r.issue}</p>
                                <p className="text-sm text-gray-400 mt-1">{r.recommendation}</p>
                                <p className="text-xs text-cyan-400 mt-2 font-medium">{r.suggested_action}</p>
                            </div>
                        ))}
                    </div>
                ) : (
                    <p className="text-sm text-gray-500">
                        {recs?.error ? `Could not generate recommendations: ${recs.error}` : 'No recommendations — the fleet looks healthy.'}
                    </p>
                )}
            </Card>

            {/* 3. Domain Health */}
            <Card title="Domain Health" subtitle="Deterministic 0–100 score per domain" icon={<ShieldCheck className="w-5 h-5 text-cyan-400" />}>
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="text-[10px] uppercase tracking-widest text-gray-500 border-b border-white/[0.06]">
                                <th className="py-2 pr-4">Domain</th><th className="py-2 pr-4">Score</th>
                                <th className="py-2 pr-4">Reputation</th><th className="py-2 pr-4">Sent</th>
                                <th className="py-2 pr-4">Bounce</th><th className="py-2 pr-4">Spam</th>
                                <th className="py-2 pr-4">SPF/DKIM/DMARC/MX</th><th className="py-2 pr-4">Warmup</th>
                            </tr>
                        </thead>
                        <tbody>
                            {domains.map(d => (
                                <tr key={d.id} className="border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors">
                                    <td className="py-2 pr-4 text-white">{d.domain}{d.is_primary && <span className="ml-2 text-[10px] text-amber-400">PRIMARY</span>}</td>
                                    <td className={`py-2 pr-4 font-mono tabular-nums font-bold ${scoreText(d.score)}`}>{d.score}</td>
                                    <td className="py-2 pr-4"><span className={`text-[11px] px-2 py-0.5 rounded-full ${bandClasses(d.status)}`}>{d.reputation}</span></td>
                                    <td className="py-2 pr-4 font-mono tabular-nums text-gray-300">{d.sent}</td>
                                    <td className="py-2 pr-4 font-mono tabular-nums text-gray-300">{d.bounce_rate}%</td>
                                    <td className="py-2 pr-4 font-mono tabular-nums text-gray-300">{d.spam_rate}%</td>
                                    <td className="py-2 pr-4">
                                        <span className="flex gap-1">
                                            {[d.dns.spf, d.dns.dkim, d.dns.dmarc, d.dns.mx].map((ok, i) => (
                                                ok ? <CheckCircle key={i} className="w-3.5 h-3.5 text-emerald-400" /> : <XCircle key={i} className="w-3.5 h-3.5 text-rose-400" />
                                            ))}
                                        </span>
                                    </td>
                                    <td className="py-2 pr-4 text-gray-400 text-xs">{d.warmup_status}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </Card>

            {/* 4. Inbox Health */}
            <Card title="Inbox Health" subtitle="Per-inbox score and load" icon={<Inbox className="w-5 h-5 text-cyan-400" />}>
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="text-[10px] uppercase tracking-widest text-gray-500 border-b border-white/[0.06]">
                                <th className="py-2 pr-4">Inbox</th><th className="py-2 pr-4">Score</th>
                                <th className="py-2 pr-4">Age</th><th className="py-2 pr-4">Today</th>
                                <th className="py-2 pr-4">Replies</th><th className="py-2 pr-4">Bounce</th>
                                <th className="py-2 pr-4">Last Positive</th>
                            </tr>
                        </thead>
                        <tbody>
                            {inboxes.map(i => (
                                <tr key={i.id} className="border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors">
                                    <td className="py-2 pr-4 text-white font-mono text-xs">{i.email}</td>
                                    <td className={`py-2 pr-4 font-mono tabular-nums font-bold ${scoreText(i.score)}`}>{i.score}</td>
                                    <td className="py-2 pr-4 font-mono tabular-nums text-gray-300">{i.age_days != null ? `${i.age_days}d` : '—'}</td>
                                    <td className="py-2 pr-4 font-mono tabular-nums text-gray-300">{i.sent_today}/{i.daily_limit}</td>
                                    <td className="py-2 pr-4 font-mono tabular-nums text-gray-300">{i.replies}</td>
                                    <td className="py-2 pr-4 font-mono tabular-nums text-gray-300">{i.bounce_rate}%</td>
                                    <td className="py-2 pr-4 text-gray-400 text-xs">{i.last_positive_reply ? new Date(i.last_positive_reply).toLocaleDateString() : '—'}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </Card>

            {/* 5. Deliverability + 6. Reply Intelligence */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {deliverability && (
                    <Card title="Deliverability" subtitle="Fleet score + 30-day trend" icon={<TrendingUp className="w-5 h-5 text-cyan-400" />}>
                        <div className={`text-4xl font-mono font-bold mb-4 ${scoreText(deliverability.deliverability_score)}`}>
                            {deliverability.deliverability_score}<span className="text-base text-gray-500"> / 100</span>
                        </div>
                        {deliverability.trend.length > 0 ? (
                            <div className="h-52">
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={deliverability.trend}>
                                        <defs>
                                            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="0%" stopColor="#10b981" stopOpacity={0.4} />
                                                <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" />
                                        <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#6b7280' }} />
                                        <YAxis tick={{ fontSize: 10, fill: '#6b7280' }} />
                                        <Tooltip contentStyle={{ background: '#0a0a0f', border: '1px solid #ffffff20', borderRadius: 8, fontSize: 12 }} />
                                        <Area type="monotone" dataKey="dkim_ratio" name="DKIM %" stroke="#10b981" fill={`url(#${gradientId})`} />
                                    </AreaChart>
                                </ResponsiveContainer>
                            </div>
                        ) : (
                            <p className="text-sm text-gray-500">No Postmaster trend data yet.</p>
                        )}
                        <div className="mt-4 text-xs text-gray-500 border-t border-white/[0.06] pt-3">
                            <span className="text-gray-400">Inbox placement test:</span> {deliverability.inbox_placement.reason}
                        </div>
                    </Card>
                )}

                {reply && (
                    <Card title="Reply Intelligence" subtitle="Sentiment over last 30 days" icon={<MessageSquare className="w-5 h-5 text-cyan-400" />}>
                        <div className="space-y-2 mb-4">
                            {Object.entries(reply.sentiment_pct).map(([intent, pct]) => (
                                <div key={intent}>
                                    <div className="flex justify-between text-xs mb-1">
                                        <span className="text-gray-400">{INTENT_LABEL[intent] ?? intent}</span>
                                        <span className="font-mono tabular-nums text-gray-300">{pct}% ({reply.counts[intent] ?? 0})</span>
                                    </div>
                                    <div className="h-1.5 bg-white/[0.05] rounded-full overflow-hidden">
                                        <div className={`h-full ${intent === 'hot_lead' ? 'bg-emerald-400' : intent === 'no' ? 'bg-rose-400' : 'bg-cyan-400'}`} style={{ width: `${pct}%` }} />
                                    </div>
                                </div>
                            ))}
                        </div>
                        <div className="text-[10px] uppercase tracking-widest text-gray-500 mb-2">Recent replies</div>
                        <div className="space-y-1 max-h-40 overflow-y-auto">
                            {reply.recent.length === 0 && <p className="text-sm text-gray-500">No replies yet.</p>}
                            {reply.recent.map((r, i) => (
                                <div key={i} className="flex items-center justify-between text-xs py-1 border-b border-white/[0.04]">
                                    <span className="text-gray-300 font-mono truncate max-w-[55%]">{r.from_email}</span>
                                    <span className={`px-2 py-0.5 rounded-full text-[10px] ${bandClasses(r.intent === 'hot_lead' ? 'healthy' : r.intent === 'no' ? 'critical' : 'warning')}`}>
                                        {r.intent ? (INTENT_LABEL[r.intent] ?? r.intent) : 'unclassified'}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </Card>
                )}
            </div>

            {/* 7. Technical Monitoring */}
            {technical && (
                <Card title="Technical Monitoring" subtitle="Send queues, scheduler & channels" icon={<Server className="w-5 h-5 text-cyan-400" />}>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
                        <Kpi label="Queued" value={technical.queues.queued} />
                        <Kpi label="Sent Today" value={technical.queues.sent_today} tone="text-emerald-400" />
                        <Kpi label="Failed Today" value={technical.queues.failed_today} tone={technical.queues.failed_today > 0 ? 'text-rose-400' : 'text-white'} />
                        <Kpi label="Bounced Today" value={technical.queues.bounced_today} tone={technical.queues.bounced_today > 0 ? 'text-amber-400' : 'text-white'} />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        <div>
                            <div className="text-[10px] uppercase tracking-widest text-gray-500 mb-2">Scheduler Jobs</div>
                            <div className="space-y-1">
                                {technical.jobs.map(j => (
                                    <div key={j.id} className="flex items-center justify-between text-xs py-1">
                                        <span className="text-gray-300 font-mono">{j.id}</span>
                                        <span className="flex items-center gap-2 text-gray-500">
                                            <span>{j.schedule}</span>
                                            {j.registered
                                                ? <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                                                : <XCircle className="w-3.5 h-3.5 text-rose-400" />}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                        <div>
                            <div className="text-[10px] uppercase tracking-widest text-gray-500 mb-2">Channels</div>
                            <div className="space-y-1">
                                {Object.entries(technical.channels).map(([name, ok]) => (
                                    <div key={name} className="flex items-center justify-between text-xs py-1">
                                        <span className="text-gray-300 font-mono">{name}</span>
                                        <span className={`px-2 py-0.5 rounded-full text-[10px] ${ok ? bandClasses('healthy') : bandClasses('warning')}`}>
                                            {ok ? 'configured' : 'not set'}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </Card>
            )}
        </motion.div>
    );
}
