'use client';

import { useState, useEffect, useRef, useId } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import {
    Globe, Shield, Activity, Mail, Plus, RefreshCw, ChevronRight,
    CheckCircle, XCircle, AlertTriangle, Clock, Send, Users,
    Layers, TrendingUp, BarChart3, Search, X, Inbox, Play,
    Pause, Filter, ArrowUpDown, ExternalLink, Zap, Trash2, Pencil, Save,
    MessageSquare, ChevronDown, ChevronUp, Eye, EyeOff, Copy, CloudOff, Crown,
    HeartPulse, Archive,
} from 'lucide-react';
import {
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
    ResponsiveContainer,
} from 'recharts';
import { useAppDispatch, useAppSelector } from '@/hooks/useAppDispatch';
import {
    fetchDomains, fetchDomainDetail, fetchWarmupHistory,
    runDnsHealthCheck, startWarmup, completeWarmup,
    setSelectedDomain, clearError, setLeadFilters, resetLeadFilters,
    fetchCampaigns, createCampaign, startCampaign, pauseCampaign,
    fetchSendHistory, fetchLeads,
    fetchThreadContractors, fetchEmailThread,
    setSelectedThreadEmail, setThreadSearch,
    selectDomains, selectDomainsStatus, selectDomainsError,
    selectSelectedDomain, selectWarmupHistory,
    selectCampaigns, selectCampaignsStatus, selectCampaignsError,
    selectSendHistory, selectSendHistoryStatus,
    selectLeads, selectLeadsStatus, selectLeadsTotal, selectLeadFilters,
    selectThreadContractors, selectThreadContractorsStatus,
    selectSelectedThreadEmail, selectActiveThread, selectActiveThreadStatus,
    selectThreadSearch,
} from '@/store/slices/outreachSlice';
import { apiService } from '@/services/api';
import { useSelector } from 'react-redux';
import type { RootState } from '@/store/store';
import { hasRole, type Role } from '@/lib/roles';
import HealthTab from '@/components/outreach/HealthTab';
import type {
    SendingDomain, InboxProvider, WarmupHistoryEntry,
    CampaignOut, CampaignCreate, PermitLead,
    ThreadContractorSummary, ThreadItem, ReplyIntent,
} from '@/types';

// ─── Tabs ────────────────────────────────────────────────────────────────────

const TABS = ['Domains', 'Campaigns', 'Lead Queue', 'Send History', 'Threads', 'Health', 'Agents'] as const;
type Tab = typeof TABS[number];

// ─── Design helpers ───────────────────────────────────────────────────────────

const WARMUP_STATUS: Record<string, { label: string; badge: string; dot: string }> = {
    pending:  { label: 'Pending',  badge: 'bg-gray-500/15 text-gray-400',    dot: 'bg-gray-500'    },
    warming:  { label: 'Warming',  badge: 'bg-amber-500/15 text-amber-400',  dot: 'bg-amber-400'   },
    ready:    { label: 'Ready',    badge: 'bg-emerald-500/15 text-emerald-400', dot: 'bg-emerald-400' },
    degraded: { label: 'Degraded', badge: 'bg-rose-500/15 text-rose-400',    dot: 'bg-rose-500'    },
    retired:  { label: 'Retired',  badge: 'bg-gray-600/15 text-gray-500',    dot: 'bg-gray-600'    },
};

const CAMPAIGN_STATUS: Record<string, { badge: string }> = {
    draft:     { badge: 'bg-gray-500/15 text-gray-400'      },
    active:    { badge: 'bg-emerald-500/15 text-emerald-400' },
    paused:    { badge: 'bg-amber-500/15 text-amber-400'     },
    completed: { badge: 'bg-blue-500/15 text-blue-400'       },
};

const SEND_STATUS: Record<string, { badge: string }> = {
    queued:  { badge: 'bg-gray-500/15 text-gray-400'      },
    sent:    { badge: 'bg-emerald-500/15 text-emerald-400' },
    bounced: { badge: 'bg-orange-500/15 text-orange-400'  },
    failed:  { badge: 'bg-rose-500/15 text-rose-400'      },
};

function WarmupBadge({ status }: { status: string }) {
    const cfg = WARMUP_STATUS[status] ?? WARMUP_STATUS.pending;
    return (
        <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium ${cfg.badge}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot} ${status === 'warming' ? 'animate-pulse' : ''}`} />
            {cfg.label}
        </span>
    );
}

function StatusBadge({ status, map }: { status: string; map: Record<string, { badge: string }> }) {
    const cfg = map[status] ?? map.draft ?? { badge: 'bg-gray-500/15 text-gray-400' };
    return (
        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium capitalize ${cfg.badge}`}>
            {status}
        </span>
    );
}

function DnsBadge({ ok, label }: { ok: boolean; label: string }) {
    return (
        <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono uppercase tracking-widest ${ok ? 'bg-emerald-500/15 text-emerald-400' : 'bg-rose-500/15 text-rose-400'}`}>
            {ok ? <CheckCircle className="w-2.5 h-2.5" /> : <XCircle className="w-2.5 h-2.5" />}
            {label}
        </span>
    );
}

function ProviderBadge({ provider }: { provider: InboxProvider }) {
    return (
        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium ${provider === 'google' ? 'bg-blue-500/15 text-blue-400' : 'bg-purple-500/15 text-purple-400'}`}>
            {provider === 'google' ? 'GWS' : 'M365'}
        </span>
    );
}

function LeadScoreBadge({ score }: { score: number }) {
    const cls = score >= 70 ? 'bg-emerald-500/15 text-emerald-400'
               : score >= 40 ? 'bg-amber-500/15 text-amber-400'
               : 'bg-gray-500/15 text-gray-400';
    return (
        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-mono font-bold ${cls}`}>
            {score}
        </span>
    );
}

function ReputationBadge({ rep }: { rep?: string | null }) {
    if (!rep) return <span className="text-gray-600 text-[11px]">—</span>;
    const cls = rep === 'HIGH' ? 'bg-emerald-500/15 text-emerald-400'
              : rep === 'MEDIUM' ? 'bg-amber-500/15 text-amber-400'
              : rep === 'LOW' ? 'bg-orange-500/15 text-orange-400'
              : 'bg-rose-500/15 text-rose-400';
    return <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium ${cls}`}>{rep}</span>;
}

// ─── Domain Health (combined warmup_status + postmaster reputation) ────────────

interface DomainHealthCfg {
    label:  string;
    badge:  string;
    dot:    string;
    border: string;
    level:  'green' | 'amber' | 'red' | 'blue' | 'gray';
}

function getDomainHealth(domain: SendingDomain): DomainHealthCfg {
    const s   = domain.warmup_status;
    const rep = domain.postmaster_domain_reputation;

    if (s === 'pending') {
        const dnsReady = domain.dns_spf && domain.dns_dkim && domain.dns_dmarc && domain.dns_mx;
        return dnsReady
            ? { label: 'DNS Ready', badge: 'bg-cyan-500/15 text-cyan-400',  dot: 'bg-cyan-400',  border: 'border-l-cyan-600',  level: 'blue' as const }
            : { label: 'Pending',   badge: 'bg-gray-500/15 text-gray-400',  dot: 'bg-gray-500',  border: 'border-l-gray-700',  level: 'gray' as const };
    }
    if (s === 'warming')  return { label: 'Warming',  badge: 'bg-blue-500/15 text-blue-400',    dot: 'bg-blue-400',  border: 'border-l-blue-500',    level: 'blue'  };
    if (s === 'retired')  return { label: 'Retired',  badge: 'bg-gray-600/15 text-gray-500',    dot: 'bg-gray-600',  border: 'border-l-gray-800',    level: 'gray'  };
    if (s === 'degraded') return { label: 'Degraded', badge: 'bg-amber-500/15 text-amber-400',  dot: 'bg-amber-400', border: 'border-l-amber-500',   level: 'amber' };

    // warmup_status === 'ready' — use reputation to differentiate
    if (rep === 'BAD')  return { label: 'Critical',  badge: 'bg-rose-500/15 text-rose-400',    dot: 'bg-rose-400',  border: 'border-l-rose-500',    level: 'red'   };
    if (rep === 'LOW')  return { label: 'Degrading', badge: 'bg-amber-500/15 text-amber-400',  dot: 'bg-amber-400', border: 'border-l-amber-500',   level: 'amber' };
    return               { label: 'Ready',    badge: 'bg-emerald-500/15 text-emerald-400', dot: 'bg-emerald-400', border: 'border-l-emerald-500', level: 'green' };
}

function DomainHealthBadge({ domain }: { domain: SendingDomain }) {
    const h = getDomainHealth(domain);
    const pulse = h.level === 'red' || domain.warmup_status === 'warming';
    return (
        <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium ${h.badge}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${h.dot} ${pulse ? 'animate-pulse' : ''}`} />
            {h.label}
        </span>
    );
}

function Spinner({ className = '' }: { className?: string }) {
    return <RefreshCw className={`animate-spin ${className}`} />;
}

// ─── Warmup Chart ─────────────────────────────────────────────────────────────

function WarmupChart({ history }: { history: WarmupHistoryEntry[] }) {
    const gid = useId().replace(/:/g, '');
    const data = [...history]
        .sort((a, b) => a.date.localeCompare(b.date))
        .map(h => ({ date: h.date.slice(5), sent: h.sent_count, limit: h.ramp_limit }));

    if (!data.length) return <div className="h-52 flex items-center justify-center text-gray-600 text-sm">No warmup data yet</div>;

    return (
        <div className="h-52">
            <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                    <defs>
                        <linearGradient id={`wg-${gid}`} x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%"  stopColor="#06b6d4" stopOpacity={0.3} />
                            <stop offset="95%" stopColor="#06b6d4" stopOpacity={0}   />
                        </linearGradient>
                        <linearGradient id={`lg-${gid}`} x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%"  stopColor="#6366f1" stopOpacity={0.2} />
                            <stop offset="95%" stopColor="#6366f1" stopOpacity={0}   />
                        </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                    <XAxis dataKey="date" tick={{ fill: '#6b7280', fontSize: 10 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: '#6b7280', fontSize: 10 }} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={{ background: '#0a0a0f', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, fontSize: 12 }} labelStyle={{ color: '#9ca3af' }} itemStyle={{ color: '#e5e7eb' }} />
                    <Area type="monotone" dataKey="limit" stroke="#6366f1" strokeWidth={1} strokeDasharray="4 2" fill={`url(#lg-${gid})`} name="Ramp limit" />
                    <Area type="monotone" dataKey="sent"  stroke="#06b6d4" strokeWidth={2} fill={`url(#wg-${gid})`} name="Emails sent" />
                </AreaChart>
            </ResponsiveContainer>
        </div>
    );
}

// ─── Register Domain Modal ────────────────────────────────────────────────────

function RegisterDomainModal({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
    const pref = useReducedMotion();
    const d = pref ? 0 : 0.2;
    const [form, setForm] = useState({ domain: '', provider: 'google' as InboxProvider, dkim_selector: 'google' });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    async function submit(e: React.FormEvent) {
        e.preventDefault();
        setLoading(true); setError('');
        try { await apiService.registerDomain(form); onSaved(); onClose(); }
        catch (err: unknown) { setError((err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ?? 'Registration failed'); }
        finally { setLoading(false); }
    }

    return (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: d }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={onClose}>
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 8 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: d, type: 'spring', stiffness: 400, damping: 35 }}
                className="bg-gray-950 border border-white/[0.08] rounded-2xl p-6 w-full max-w-md shadow-2xl" onClick={e => e.stopPropagation()}>
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-xl bg-cyan-500/15"><Globe className="w-5 h-5 text-cyan-400" /></div>
                        <h2 className="text-lg font-semibold text-white">Register Domain</h2>
                    </div>
                    <button onClick={onClose} className="p-1.5 rounded-lg text-gray-500 hover:text-gray-300 hover:bg-white/5 focus-visible:ring-2 focus-visible:ring-cyan-400 transition-colors"><X className="w-4 h-4" /></button>
                </div>
                <form onSubmit={submit} className="space-y-4">
                    <div>
                        <label className="block text-[11px] uppercase tracking-widest text-gray-500 mb-1.5">Domain</label>
                        <input required placeholder="estimationhubco.com" value={form.domain} onChange={e => setForm(f => ({ ...f, domain: e.target.value }))}
                            className="w-full bg-white/5 border border-white/[0.08] rounded-xl px-3 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-cyan-400/50 transition-colors" />
                    </div>
                    <div>
                        <label className="block text-[11px] uppercase tracking-widest text-gray-500 mb-1.5">Provider</label>
                        <div className="flex gap-2">
                            {(['google', 'microsoft'] as InboxProvider[]).map(p => (
                                <button key={p} type="button"
                                    onClick={() => setForm(f => ({ ...f, provider: p, dkim_selector: p === 'google' ? 'google' : 'selector1' }))}
                                    className={`flex-1 py-2.5 rounded-xl text-sm font-medium border transition-colors focus-visible:ring-2 focus-visible:ring-cyan-400 ${form.provider === p ? 'bg-cyan-500/15 border-cyan-400/30 text-cyan-400' : 'bg-white/5 border-white/[0.08] text-gray-400 hover:text-gray-200'}`}>
                                    {p === 'google' ? 'Google Workspace' : 'Microsoft 365'}
                                </button>
                            ))}
                        </div>
                    </div>
                    <div>
                        <label className="block text-[11px] uppercase tracking-widest text-gray-500 mb-1.5">DKIM Selector</label>
                        <input value={form.dkim_selector} onChange={e => setForm(f => ({ ...f, dkim_selector: e.target.value }))}
                            className="w-full bg-white/5 border border-white/[0.08] rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-cyan-400/50 transition-colors" />
                        <p className="mt-1 text-[11px] text-gray-600">GWS: "google" · M365: "selector1"</p>
                    </div>
                    {error && <div className="flex items-center gap-2 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm"><AlertTriangle className="w-4 h-4 shrink-0" />{error}</div>}
                    <div className="flex gap-3 pt-2">
                        <button type="button" onClick={onClose} className="flex-1 py-2.5 rounded-xl text-sm text-gray-400 border border-white/[0.08] hover:bg-white/5 focus-visible:ring-2 focus-visible:ring-cyan-400 transition-colors">Cancel</button>
                        <button type="submit" disabled={loading} className="flex-1 py-2.5 rounded-xl text-sm font-medium bg-cyan-500 hover:bg-cyan-400 disabled:opacity-50 text-gray-950 focus-visible:ring-2 focus-visible:ring-cyan-400 transition-colors">
                            {loading ? 'Registering…' : 'Register'}
                        </button>
                    </div>
                </form>
            </motion.div>
        </motion.div>
    );
}

// ─── Create Campaign Modal ────────────────────────────────────────────────────

function CreateCampaignModal({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
    const dispatch = useAppDispatch();
    const pref = useReducedMotion();
    const d = pref ? 0 : 0.2;
    const [form, setForm] = useState<CampaignCreate>({ name: '', template_type: 'email_agent', daily_limit: 50, use_web_search: false });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    async function submit(e: React.FormEvent) {
        e.preventDefault();
        setLoading(true); setError('');
        try {
            await dispatch(createCampaign(form)).unwrap();
            onSaved(); onClose();
        } catch (err: unknown) {
            setError(typeof err === 'string' ? err : 'Failed to create campaign');
        } finally {
            setLoading(false);
        }
    }

    return (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: d }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={onClose}>
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 8 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: d, type: 'spring', stiffness: 400, damping: 35 }}
                className="bg-gray-950 border border-white/[0.08] rounded-2xl p-6 w-full max-w-md shadow-2xl" onClick={e => e.stopPropagation()}>
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-xl bg-indigo-500/15"><Layers className="w-5 h-5 text-indigo-400" /></div>
                        <h2 className="text-lg font-semibold text-white">New Campaign</h2>
                    </div>
                    <button onClick={onClose} className="p-1.5 rounded-lg text-gray-500 hover:text-gray-300 hover:bg-white/5 focus-visible:ring-2 focus-visible:ring-indigo-400 transition-colors"><X className="w-4 h-4" /></button>
                </div>
                <form onSubmit={submit} className="space-y-4">
                    <div>
                        <label className="block text-[11px] uppercase tracking-widest text-gray-500 mb-1.5">Campaign Name</label>
                        <input required placeholder="Dallas MEP June 2026" value={form.name}
                            onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                            className="w-full bg-white/5 border border-white/[0.08] rounded-xl px-3 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-400/50 transition-colors" />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-[11px] uppercase tracking-widest text-gray-500 mb-1.5">Daily Limit</label>
                            <input type="number" min={1} max={500} value={form.daily_limit}
                                onChange={e => setForm(f => ({ ...f, daily_limit: parseInt(e.target.value) || 50 }))}
                                className="w-full bg-white/5 border border-white/[0.08] rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-400/50 transition-colors" />
                        </div>
                        <div>
                            <label className="block text-[11px] uppercase tracking-widest text-gray-500 mb-1.5">From Domain</label>
                            <input placeholder="auto" value={form.from_domain ?? ''}
                                onChange={e => setForm(f => ({ ...f, from_domain: e.target.value || null }))}
                                className="w-full bg-white/5 border border-white/[0.08] rounded-xl px-3 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-400/50 transition-colors" />
                        </div>
                    </div>
                    <label className="flex items-start gap-2.5 p-3 rounded-xl border border-white/[0.08] bg-white/[0.02] cursor-pointer">
                        <input type="checkbox" checked={form.use_web_search ?? false}
                            onChange={e => setForm(f => ({ ...f, use_web_search: e.target.checked }))}
                            className="mt-0.5 h-4 w-4 accent-indigo-500" />
                        <span>
                            <span className="block text-sm text-white font-medium">Use web search for this campaign</span>
                            <span className="block text-xs text-gray-500 mt-0.5">Lets Project Research fill gaps for every permit this campaign sends to — still requires web search to be enabled in Agent Settings</span>
                        </span>
                    </label>
                    {error && <div className="flex items-center gap-2 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm"><AlertTriangle className="w-4 h-4 shrink-0" />{error}</div>}
                    <div className="flex gap-3 pt-2">
                        <button type="button" onClick={onClose} className="flex-1 py-2.5 rounded-xl text-sm text-gray-400 border border-white/[0.08] hover:bg-white/5 focus-visible:ring-2 focus-visible:ring-indigo-400 transition-colors">Cancel</button>
                        <button type="submit" disabled={loading} className="flex-1 py-2.5 rounded-xl text-sm font-medium bg-indigo-500 hover:bg-indigo-400 disabled:opacity-50 text-white focus-visible:ring-2 focus-visible:ring-indigo-400 transition-colors">
                            {loading ? 'Creating…' : 'Create Campaign'}
                        </button>
                    </div>
                </form>
            </motion.div>
        </motion.div>
    );
}

// ─── Domain Drawer ─────────────────────────────────────────────────────────────

type DrawerInbox = { id: string; email: string; display_name?: string | null; status: string; daily_sent_today: number; daily_limit: number; has_app_password?: boolean };

function InboxRow({
    inbox, domainId, onRefresh,
}: { inbox: DrawerInbox; domainId: string; onRefresh: () => void }) {
    const [editing, setEditing] = useState(false);
    const [limitVal, setLimitVal] = useState(String(inbox.daily_limit));
    const [saving, setSaving] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [pw, setPw] = useState<string | null>(null);
    const [showPw, setShowPw] = useState(false);
    const [pwLoading, setPwLoading] = useState(false);
    const [copied, setCopied] = useState(false);

    // App Password
    const [showAppPwForm, setShowAppPwForm] = useState(false);
    const [appPwVal, setAppPwVal] = useState('');
    const [appPwSaving, setAppPwSaving] = useState(false);
    const [appPwError, setAppPwError] = useState('');
    const [hasAppPw, setHasAppPw] = useState(inbox.has_app_password ?? false);

    async function saveLimit() {
        const n = parseInt(limitVal);
        if (!n || n < 1) return;
        setSaving(true);
        try {
            await apiService.updateInbox(domainId, inbox.id, { daily_limit: n });
            onRefresh();
            setEditing(false);
        } catch { /* ignore */ }
        finally { setSaving(false); }
    }

    async function handleDelete() {
        if (!confirm(`Delete inbox ${inbox.email}? This also removes the account from GWS/M365.`)) return;
        setDeleting(true);
        try {
            await apiService.deleteInbox(domainId, inbox.id);
            onRefresh();
        } catch { /* ignore */ }
        finally { setDeleting(false); }
    }

    async function fetchPassword() {
        if (pw) { setShowPw(v => !v); return; }
        setPwLoading(true);
        try {
            const data = await apiService.getInboxPassword(domainId, inbox.id);
            setPw(data.password);
            setShowPw(true);
        } catch { /* ignore */ }
        finally { setPwLoading(false); }
    }

    async function copyPw() {
        if (!pw) return;
        await navigator.clipboard.writeText(pw);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    }

    async function saveAppPassword() {
        if (!appPwVal.trim()) { setAppPwError('App Password cannot be empty'); return; }
        setAppPwSaving(true); setAppPwError('');
        try {
            await apiService.updateInbox(domainId, inbox.id, { smtp_password: appPwVal.trim() });
            setHasAppPw(true);
            setShowAppPwForm(false);
            setAppPwVal('');
        } catch {
            setAppPwError('Failed to save — check the password and try again');
        } finally {
            setAppPwSaving(false);
        }
    }

    return (
        <div className="p-3 bg-white/[0.03] border border-white/[0.06] rounded-xl space-y-2">
            <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                    <Mail className="w-3.5 h-3.5 text-gray-500 shrink-0" />
                    <span className="text-xs text-gray-300 font-mono truncate">{inbox.email}</span>
                    <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${inbox.status === 'active' ? 'bg-emerald-400' : 'bg-gray-500'}`} />
                </div>
                <div className="flex items-center gap-1 shrink-0">
                    {/* Show / hide SMTP password */}
                    <button onClick={fetchPassword} disabled={pwLoading} title="Show Gmail login password"
                        className="p-1 rounded-lg text-gray-500 hover:text-amber-400 hover:bg-amber-400/10 transition-colors disabled:opacity-40 focus-visible:ring-2 focus-visible:ring-amber-400">
                        {pwLoading ? <Spinner className="w-3 h-3" /> : showPw ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                    </button>
                    <button onClick={() => { setEditing(e => !e); setLimitVal(String(inbox.daily_limit)); }}
                        className="p-1 rounded-lg text-gray-500 hover:text-cyan-400 hover:bg-cyan-400/10 transition-colors focus-visible:ring-2 focus-visible:ring-cyan-400">
                        <Pencil className="w-3 h-3" />
                    </button>
                    <button onClick={handleDelete} disabled={deleting}
                        className="p-1 rounded-lg text-gray-500 hover:text-rose-400 hover:bg-rose-400/10 transition-colors disabled:opacity-40 focus-visible:ring-2 focus-visible:ring-rose-400">
                        {deleting ? <Spinner className="w-3 h-3" /> : <Trash2 className="w-3 h-3" />}
                    </button>
                </div>
            </div>

            {/* Password reveal row */}
            {showPw && pw && (
                <div className="flex items-center gap-2 px-2 py-1.5 bg-amber-500/5 border border-amber-500/15 rounded-lg">
                    <span className="text-[10px] uppercase tracking-widest text-amber-500/70 shrink-0">GWS Password</span>
                    <span className="flex-1 text-[11px] font-mono text-amber-300 break-all select-all">{pw}</span>
                    <button onClick={copyPw} title="Copy password"
                        className="p-1 rounded text-amber-500 hover:text-amber-300 hover:bg-amber-400/10 transition-colors shrink-0">
                        {copied ? <CheckCircle className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    </button>
                </div>
            )}

            {/* App Password row */}
            <div className="flex items-center gap-2">
                <span className="text-[10px] uppercase tracking-widest text-gray-600">App Password</span>
                {hasAppPw ? (
                    <span className="ml-auto flex items-center gap-1.5 text-[10px] text-emerald-400">
                        <CheckCircle className="w-3 h-3" /> Set
                        <button onClick={() => { setShowAppPwForm(v => !v); setAppPwVal(''); setAppPwError(''); }}
                            className="ml-1 text-gray-500 hover:text-cyan-400 transition-colors">
                            <Pencil className="w-3 h-3" />
                        </button>
                    </span>
                ) : (
                    <button onClick={() => setShowAppPwForm(v => !v)}
                        className="ml-auto flex items-center gap-1 text-[10px] text-amber-400 hover:text-amber-300 transition-colors">
                        <AlertTriangle className="w-3 h-3" /> Not set — click to add
                    </button>
                )}
            </div>
            {showAppPwForm && (
                <div className="space-y-2 p-2 bg-cyan-500/5 border border-cyan-500/15 rounded-lg">
                    <p className="text-[10px] text-cyan-400/70">
                        Generate an App Password in Google Account → Security → App Passwords, then paste it here.
                        This is used by Instantly for warmup sends.
                    </p>
                    <div className="flex items-center gap-2">
                        <input
                            type="password"
                            placeholder="xxxx xxxx xxxx xxxx"
                            value={appPwVal}
                            onChange={e => setAppPwVal(e.target.value)}
                            className="flex-1 bg-white/5 border border-white/[0.08] rounded-lg px-2 py-1.5 text-xs font-mono text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-cyan-400/50"
                        />
                        <button onClick={saveAppPassword} disabled={appPwSaving}
                            className="px-2.5 py-1.5 rounded-lg text-xs font-medium bg-cyan-500 hover:bg-cyan-400 disabled:opacity-50 text-gray-950 transition-colors shrink-0">
                            {appPwSaving ? '…' : 'Save'}
                        </button>
                        <button onClick={() => { setShowAppPwForm(false); setAppPwVal(''); setAppPwError(''); }}
                            className="p-1 text-gray-500 hover:text-gray-300 transition-colors">
                            <X className="w-3 h-3" />
                        </button>
                    </div>
                    {appPwError && <p className="text-[10px] text-rose-400">{appPwError}</p>}
                </div>
            )}

            {/* Daily limit row */}
            <div className="flex items-center gap-2">
                <span className="text-[10px] uppercase tracking-widest text-gray-600">Daily limit</span>
                {editing ? (
                    <div className="flex items-center gap-1.5 ml-auto">
                        <input
                            type="number" min={1} max={500}
                            value={limitVal}
                            onChange={e => setLimitVal(e.target.value)}
                            onKeyDown={e => { if (e.key === 'Enter') saveLimit(); if (e.key === 'Escape') setEditing(false); }}
                            className="w-16 bg-white/5 border border-white/[0.12] rounded-lg px-2 py-1 text-xs font-mono text-white text-center focus:outline-none focus:ring-2 focus:ring-cyan-400/50"
                            autoFocus
                        />
                        <button onClick={saveLimit} disabled={saving}
                            className="p-1 rounded-lg text-cyan-400 hover:bg-cyan-400/10 disabled:opacity-40 focus-visible:ring-2 focus-visible:ring-cyan-400 transition-colors">
                            {saving ? <Spinner className="w-3 h-3" /> : <Save className="w-3 h-3" />}
                        </button>
                        <button onClick={() => setEditing(false)} className="p-1 rounded-lg text-gray-500 hover:text-gray-300 transition-colors">
                            <X className="w-3 h-3" />
                        </button>
                    </div>
                ) : (
                    <span className="ml-auto text-[11px] font-mono text-white">
                        <span className="text-gray-400">{inbox.daily_sent_today}</span>
                        <span className="text-gray-600"> / </span>
                        <span>{inbox.daily_limit}</span>
                        <span className="text-gray-600 ml-1">today</span>
                    </span>
                )}
            </div>
        </div>
    );
}

function AddInboxForm({ domainId, onDone }: { domainId: string; onDone: () => void }) {
    const [form, setForm] = useState({ email_prefix: '', display_name: '', given_name: '', family_name: '', app_password: '' });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    async function submit(e: React.FormEvent) {
        e.preventDefault();
        setLoading(true); setError('');
        try {
            const { app_password, ...rest } = form;
            await apiService.addInbox(domainId, { ...rest, ...(app_password.trim() ? { app_password: app_password.trim() } : {}) });
            onDone();
        } catch (err: unknown) {
            setError((err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ?? 'Failed to add inbox');
        } finally {
            setLoading(false);
        }
    }

    return (
        <form onSubmit={submit} className="mt-3 p-3 bg-white/[0.03] border border-cyan-500/20 rounded-xl space-y-3">
            <p className="text-[10px] uppercase tracking-widest text-cyan-400/70">Add New Inbox</p>
            <div className="grid grid-cols-2 gap-2">
                <div>
                    <label className="block text-[10px] text-gray-500 mb-1">Email Prefix</label>
                    <input required placeholder="outreach3" value={form.email_prefix}
                        onChange={e => setForm(f => ({ ...f, email_prefix: e.target.value }))}
                        className="w-full bg-white/5 border border-white/[0.08] rounded-lg px-2 py-1.5 text-xs text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-cyan-400/50" />
                </div>
                <div>
                    <label className="block text-[10px] text-gray-500 mb-1">Display Name</label>
                    <input required placeholder="Jordan Lee — EstiGroup" value={form.display_name}
                        onChange={e => setForm(f => ({ ...f, display_name: e.target.value }))}
                        className="w-full bg-white/5 border border-white/[0.08] rounded-lg px-2 py-1.5 text-xs text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-cyan-400/50" />
                </div>
                <div>
                    <label className="block text-[10px] text-gray-500 mb-1">First Name</label>
                    <input placeholder="Jordan" value={form.given_name}
                        onChange={e => setForm(f => ({ ...f, given_name: e.target.value }))}
                        className="w-full bg-white/5 border border-white/[0.08] rounded-lg px-2 py-1.5 text-xs text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-cyan-400/50" />
                </div>
                <div>
                    <label className="block text-[10px] text-gray-500 mb-1">Last Name</label>
                    <input placeholder="Lee" value={form.family_name}
                        onChange={e => setForm(f => ({ ...f, family_name: e.target.value }))}
                        className="w-full bg-white/5 border border-white/[0.08] rounded-lg px-2 py-1.5 text-xs text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-cyan-400/50" />
                </div>
            </div>

            {/* App Password — optional at creation, can be added later from inbox row */}
            <div className="border-t border-white/[0.05] pt-2.5 space-y-1.5">
                <label className="block text-[10px] text-gray-500">
                    Gmail App Password <span className="text-gray-600">(optional — can be added after creation)</span>
                </label>
                <input
                    type="password"
                    placeholder="xxxx xxxx xxxx xxxx"
                    value={form.app_password}
                    onChange={e => setForm(f => ({ ...f, app_password: e.target.value }))}
                    className="w-full bg-white/5 border border-white/[0.08] rounded-lg px-2 py-1.5 text-xs font-mono text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-amber-400/40"
                />
                <p className="text-[10px] text-gray-600">
                    Google Account → Security → 2-Step Verification → App Passwords. Required for Instantly warmup.
                </p>
            </div>

            {error && <p className="text-[11px] text-rose-400">{error}</p>}
            <div className="flex gap-2">
                <button type="button" onClick={onDone} className="flex-1 py-1.5 rounded-lg text-xs text-gray-400 border border-white/[0.08] hover:bg-white/5 transition-colors">Cancel</button>
                <button type="submit" disabled={loading} className="flex-1 py-1.5 rounded-lg text-xs font-medium bg-cyan-500 hover:bg-cyan-400 disabled:opacity-50 text-gray-950 transition-colors">
                    {loading ? 'Creating…' : 'Create Inbox'}
                </button>
            </div>
        </form>
    );
}

type GwsSyncResult = {
    domain: string;
    synced: string[];
    orphaned: { email: string; name: string; suspended: boolean }[];
    missing: string[];
};

function DomainDrawer({ domain, onClose }: { domain: SendingDomain; onClose: () => void }) {
    const dispatch = useAppDispatch();
    const warmupHistory = useAppSelector(selectWarmupHistory);
    const selectedDomain = useAppSelector(selectSelectedDomain);
    const pref = useReducedMotion();
    const [busy, setBusy] = useState<string | null>(null);
    const [err, setErr] = useState('');
    const [showAddInbox, setShowAddInbox] = useState(false);
    const [syncResult, setSyncResult] = useState<GwsSyncResult | null>(null);
    const [syncLoading, setSyncLoading] = useState(false);
    const [deletingOrphan, setDeletingOrphan] = useState<string | null>(null);
    const [retiring, setRetiring] = useState(false);
    const [deleteStep, setDeleteStep] = useState<'idle' | 'confirm'>('idle');
    const [deleting, setDeleting] = useState(false);

    useEffect(() => {
        dispatch(fetchDomainDetail(domain.id));
        dispatch(fetchWarmupHistory(domain.id));
    }, [domain.id, dispatch]);

    const d = selectedDomain?.id === domain.id ? selectedDomain : domain;

    async function act(key: string, fn: () => Promise<unknown>) {
        setBusy(key); setErr('');
        try { await fn(); }
        catch (e: unknown) {
            const raw = typeof e === 'string' ? e : (e as { message?: string })?.message ?? '';
            const msg = raw.startsWith('DNS not ready')
                ? 'DNS not ready — run "DNS Health Check" first to see which records are missing.'
                : raw || `${key} failed`;
            setErr(msg);
        }
        finally { setBusy(null); }
    }

    function refreshDomain() {
        dispatch(fetchDomainDetail(domain.id));
        dispatch(fetchDomains());
    }

    async function runGwsSync() {
        setSyncLoading(true); setErr('');
        try {
            const data = await apiService.syncGwsUsers(d.id);
            setSyncResult(data);
        } catch {
            setErr('GWS sync failed — check service account permissions');
        } finally {
            setSyncLoading(false);
        }
    }

    async function retireDomain() {
        if (!confirm(`Retire domain "${d.domain}"?\n\nThis will mark the domain and all its inboxes as retired and stop all sending. The domain can be deleted after retiring.`)) return;
        setRetiring(true); setErr('');
        try {
            await apiService.retireDomain(d.id);
            refreshDomain();
        } catch (e: unknown) {
            setErr((e as { message?: string })?.message ?? 'Retire failed');
        } finally {
            setRetiring(false);
        }
    }

    async function deleteDomain() {
        setDeleting(true); setErr('');
        try {
            await apiService.deleteDomain(d.id);
            dispatch(fetchDomains());
            onClose();
        } catch (e: unknown) {
            setErr((e as { message?: string })?.message ?? 'Delete failed');
            setDeleteStep('idle');
        } finally {
            setDeleting(false);
        }
    }

    async function removeOrphan(email: string) {
        if (!confirm(`Permanently delete GWS user ${email}?\n\nThis cannot be undone.`)) return;
        setDeletingOrphan(email);
        try {
            await apiService.deleteGwsOrphan(d.id, email);
            setSyncResult(prev => prev
                ? { ...prev, orphaned: prev.orphaned.filter(o => o.email !== email) }
                : null
            );
        } catch {
            setErr(`Failed to delete GWS user ${email}`);
        } finally {
            setDeletingOrphan(null);
        }
    }

    const inboxes = (d as SendingDomain & { inboxes?: DrawerInbox[] }).inboxes ?? [];

    return (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: pref ? 0 : 0.2 }}
            className="fixed inset-0 z-40 flex justify-end" onClick={onClose}>
            <motion.div initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
                transition={{ duration: pref ? 0 : 0.25, type: 'spring', stiffness: 400, damping: 35 }}
                className="relative w-full max-w-xl h-full bg-gray-950 border-l border-white/[0.08] overflow-y-auto shadow-2xl" onClick={e => e.stopPropagation()}>
                <div className="sticky top-0 z-10 bg-gray-950/90 backdrop-blur-sm border-b border-white/[0.08] px-6 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-3 min-w-0">
                        <div className="p-2 rounded-xl bg-cyan-500/15 shrink-0"><Globe className="w-4 h-4 text-cyan-400" /></div>
                        <div className="min-w-0">
                            <p className="text-sm font-semibold text-white font-mono truncate">{d.domain}</p>
                            <div className="flex items-center gap-2 mt-0.5"><WarmupBadge status={d.warmup_status} /><ProviderBadge provider={d.provider} /></div>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-1.5 rounded-lg text-gray-500 hover:text-gray-300 hover:bg-white/5 focus-visible:ring-2 focus-visible:ring-cyan-400 transition-colors shrink-0"><X className="w-4 h-4" /></button>
                </div>
                <div className="p-6 space-y-6">
                    <div>
                        <p className="text-[10px] uppercase tracking-widest text-gray-500 mb-3">DNS Health</p>
                        <div className="flex flex-wrap gap-2">
                            <DnsBadge ok={d.dns_spf} label="SPF" />
                            <DnsBadge ok={d.dns_dkim} label="DKIM" />
                            <DnsBadge ok={d.dns_dmarc} label="DMARC" />
                            <DnsBadge ok={d.dns_mx} label="MX" />
                        </div>
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                        {[
                            { label: 'Sent today', value: `${d.daily_sent_today ?? 0} / ${d.daily_capacity ?? 0}` },
                            { label: 'Inboxes',    value: String(inboxes.length > 0 ? inboxes.length : (d.inbox_count ?? 0)) },
                            { label: 'Reputation', rep: d.postmaster_domain_reputation },
                        ].map(s => (
                            <div key={s.label} className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-3">
                                <p className="text-[10px] uppercase tracking-widest text-gray-500 mb-1">{s.label}</p>
                                {s.rep !== undefined
                                    ? <div className="mt-1"><ReputationBadge rep={s.rep} /></div>
                                    : <p className="text-lg font-mono font-bold text-white">{s.value}</p>}
                            </div>
                        ))}
                    </div>
                    <div>
                        <p className="text-[10px] uppercase tracking-widest text-gray-500 mb-3">Actions</p>
                        {err && <div className="flex items-center gap-2 p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs mb-3"><AlertTriangle className="w-3.5 h-3.5 shrink-0" />{err}</div>}
                        {(() => {
                            const warmupDaysElapsed = d.warmup_started_at
                                ? Math.floor((Date.now() - new Date(d.warmup_started_at).getTime()) / (1000 * 60 * 60 * 24))
                                : 0;
                            const warmupPeriodComplete = warmupDaysElapsed >= 30;
                            const daysRemaining = Math.max(0, 30 - warmupDaysElapsed);
                            return (
                                <>
                                    <div className="grid grid-cols-3 gap-2">
                                        {/* DNS Health Check */}
                                        <button onClick={() => act('dns', () => dispatch(runDnsHealthCheck(d.id)).unwrap())} disabled={busy === 'dns'}
                                            className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-xs font-medium bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.06] text-gray-300 disabled:opacity-40 disabled:cursor-not-allowed focus-visible:ring-2 focus-visible:ring-cyan-400 transition-colors">
                                            {busy === 'dns' ? <Spinner className="w-3.5 h-3.5 text-cyan-400" /> : <Shield className="w-3.5 h-3.5" />}
                                            DNS Health Check
                                        </button>

                                        {/* Start Warmup — becomes a status tile once warming */}
                                        {d.warmup_status === 'warming' ? (
                                            <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-xs font-medium bg-amber-500/10 border border-amber-500/20 text-amber-400">
                                                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse shrink-0" />
                                                Warming Up · Day {warmupDaysElapsed}
                                            </div>
                                        ) : (
                                            <button onClick={() => act('warmup', () => dispatch(startWarmup({ domainId: d.id })).unwrap())} disabled={busy === 'warmup' || d.warmup_status !== 'pending'}
                                                className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-xs font-medium bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.06] text-gray-300 disabled:opacity-40 disabled:cursor-not-allowed focus-visible:ring-2 focus-visible:ring-cyan-400 transition-colors">
                                                {busy === 'warmup' ? <Spinner className="w-3.5 h-3.5 text-cyan-400" /> : <Activity className="w-3.5 h-3.5" />}
                                                Start Warmup
                                            </button>
                                        )}

                                        {/* Mark Ready — only enabled after 30-day warmup period */}
                                        <button
                                            onClick={() => act('complete', () => dispatch(completeWarmup(d.id)).unwrap())}
                                            disabled={busy === 'complete' || d.warmup_status !== 'warming' || !warmupPeriodComplete}
                                            title={d.warmup_status === 'warming' && !warmupPeriodComplete ? `Available in ${daysRemaining} day${daysRemaining === 1 ? '' : 's'}` : undefined}
                                            className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-xs font-medium bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.06] text-gray-300 disabled:opacity-40 disabled:cursor-not-allowed focus-visible:ring-2 focus-visible:ring-cyan-400 transition-colors">
                                            {busy === 'complete' ? <Spinner className="w-3.5 h-3.5 text-cyan-400" /> : <CheckCircle className="w-3.5 h-3.5" />}
                                            Mark Ready
                                        </button>
                                    </div>

                                    {/* Warmup period hint below the grid */}
                                    {d.warmup_status === 'warming' && !warmupPeriodComplete && (
                                        <p className="mt-2 text-[11px] text-amber-400/70 flex items-center gap-1.5">
                                            <Activity className="w-3 h-3 shrink-0" />
                                            Mark Ready unlocks in {daysRemaining} day{daysRemaining === 1 ? '' : 's'} · warmup period ends at Day 30
                                        </p>
                                    )}
                                    {d.warmup_status === 'warming' && warmupPeriodComplete && (
                                        <p className="mt-2 text-[11px] text-emerald-400/70 flex items-center gap-1.5">
                                            <CheckCircle className="w-3 h-3 shrink-0" />
                                            30-day warmup complete — click Mark Ready to enable outreach
                                        </p>
                                    )}
                                </>
                            );
                        })()}
                        {/* Retire Domain — only shown when domain is active */}
                        {(d.warmup_status === 'warming' || d.warmup_status === 'ready' || d.warmup_status === 'degraded') && (
                            <button onClick={retireDomain} disabled={retiring}
                                className="mt-2 w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs font-medium border border-amber-500/20 text-amber-400/80 hover:bg-amber-500/10 hover:text-amber-300 disabled:opacity-40 disabled:cursor-not-allowed focus-visible:ring-2 focus-visible:ring-amber-400 transition-colors">
                                {retiring ? <Spinner className="w-3 h-3" /> : <Archive className="w-3 h-3" />}
                                Retire Domain
                            </button>
                        )}
                        {/* GWS Sync — only for Google domains */}
                        {d.provider === 'google' && (
                            <button onClick={runGwsSync} disabled={syncLoading}
                                className="mt-2 w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs font-medium border border-cyan-500/20 text-cyan-400/80 hover:bg-cyan-500/10 hover:text-cyan-300 disabled:opacity-40 disabled:cursor-not-allowed focus-visible:ring-2 focus-visible:ring-cyan-400 transition-colors">
                                {syncLoading ? <Spinner className="w-3 h-3" /> : <CloudOff className="w-3 h-3" />}
                                Sync GWS — find orphaned accounts
                            </button>
                        )}
                        {/* Skip DNS check — only shown when DNS not fully verified and domain is still pending */}
                        {d.warmup_status === 'pending' && (!d.dns_spf || !d.dns_dkim || !d.dns_dmarc) && (
                            <button
                                onClick={() => act('warmup-force', () => dispatch(startWarmup({ domainId: d.id, force: true })).unwrap())}
                                disabled={busy === 'warmup-force'}
                                className="mt-2 w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs font-medium border border-amber-500/20 text-amber-400/70 hover:bg-amber-500/10 hover:text-amber-300 disabled:opacity-40 disabled:cursor-not-allowed focus-visible:ring-2 focus-visible:ring-amber-400 transition-colors"
                            >
                                {busy === 'warmup-force' ? <Spinner className="w-3 h-3" /> : <Zap className="w-3 h-3" />}
                                Skip DNS Check &amp; Start Warmup
                            </button>
                        )}
                    </div>
                    <div>
                        <p className="text-[10px] uppercase tracking-widest text-gray-500 mb-3">Warmup Progress</p>
                        <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-4">
                            <WarmupChart history={warmupHistory?.history ?? []} />
                        </div>
                    </div>
                    {/* Inbox Management */}
                    <div>
                        <div className="flex items-center justify-between mb-3">
                            <p className="text-[10px] uppercase tracking-widest text-gray-500">
                                Inboxes ({inboxes.length})
                            </p>
                            <button
                                onClick={() => setShowAddInbox(v => !v)}
                                className="flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-medium text-cyan-400 hover:bg-cyan-400/10 border border-cyan-500/20 transition-colors focus-visible:ring-2 focus-visible:ring-cyan-400">
                                <Plus className="w-3 h-3" />Add Inbox
                            </button>
                        </div>
                        {inboxes.length === 0 && !showAddInbox && (
                            <p className="text-xs text-gray-600 italic">No inboxes provisioned yet. Click "Provision Inboxes" above.</p>
                        )}
                        <div className="space-y-2">
                            {inboxes.map(inbox => (
                                <InboxRow
                                    key={inbox.id}
                                    inbox={inbox}
                                    domainId={d.id}
                                    onRefresh={refreshDomain}
                                />
                            ))}
                        </div>
                        {showAddInbox && (
                            <AddInboxForm
                                domainId={d.id}
                                onDone={() => { setShowAddInbox(false); refreshDomain(); }}
                            />
                        )}
                    </div>

                    {/* GWS Sync Results */}
                    {syncResult && (
                        <div className="space-y-3">
                            <div className="flex items-center justify-between">
                                <p className="text-[10px] uppercase tracking-widest text-gray-500">GWS Sync Results</p>
                                <button onClick={() => setSyncResult(null)} className="p-1 rounded text-gray-600 hover:text-gray-300 transition-colors"><X className="w-3 h-3" /></button>
                            </div>

                            {/* Summary chips */}
                            <div className="flex flex-wrap gap-2">
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                    <CheckCircle className="w-2.5 h-2.5" /> {syncResult.synced.length} synced
                                </span>
                                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium border ${syncResult.orphaned.length > 0 ? 'bg-rose-500/10 text-rose-400 border-rose-500/20' : 'bg-white/[0.04] text-gray-500 border-white/[0.06]'}`}>
                                    <CloudOff className="w-2.5 h-2.5" /> {syncResult.orphaned.length} orphaned
                                </span>
                                {syncResult.missing.length > 0 && (
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20">
                                        <AlertTriangle className="w-2.5 h-2.5" /> {syncResult.missing.length} missing from GWS
                                    </span>
                                )}
                            </div>

                            {/* Orphaned users — safe to delete */}
                            {syncResult.orphaned.length > 0 && (
                                <div className="space-y-1.5">
                                    <p className="text-[10px] text-rose-400/70">These GWS accounts have no inbox row in the platform — they can be safely deleted:</p>
                                    {syncResult.orphaned.map(o => (
                                        <div key={o.email} className="flex items-center justify-between gap-2 px-3 py-2 bg-rose-500/5 border border-rose-500/15 rounded-lg">
                                            <div className="min-w-0">
                                                <p className="text-xs font-mono text-rose-300 truncate">{o.email}</p>
                                                <p className="text-[10px] text-gray-600">{o.name}{o.suspended ? ' · suspended' : ''}</p>
                                            </div>
                                            <button
                                                onClick={() => removeOrphan(o.email)}
                                                disabled={deletingOrphan === o.email}
                                                className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-medium text-rose-400 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 transition-colors disabled:opacity-40 shrink-0">
                                                {deletingOrphan === o.email ? <Spinner className="w-3 h-3" /> : <Trash2 className="w-3 h-3" />}
                                                Delete
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* Missing from GWS — informational only */}
                            {syncResult.missing.length > 0 && (
                                <div className="space-y-1">
                                    <p className="text-[10px] text-amber-400/70">These inboxes are in the platform but NOT found in GWS (may have been manually deleted):</p>
                                    {syncResult.missing.map(e => (
                                        <p key={e} className="text-xs font-mono text-amber-300/70 px-2">{e}</p>
                                    ))}
                                </div>
                            )}

                            {syncResult.orphaned.length === 0 && syncResult.missing.length === 0 && (
                                <p className="text-xs text-emerald-400/70 flex items-center gap-1.5">
                                    <CheckCircle className="w-3.5 h-3.5" /> Platform and GWS are in sync — no orphaned accounts found.
                                </p>
                            )}
                        </div>
                    )}
                    {/* Danger Zone — Delete Domain */}
                    <div className="border border-rose-500/20 rounded-xl p-4 space-y-3">
                        <p className="text-[10px] uppercase tracking-widest text-rose-400/70">Danger Zone</p>
                        <p className="text-xs text-gray-500">
                            Permanently removes this domain and all its inboxes from the platform.
                            {(d.warmup_status === 'warming' || d.warmup_status === 'ready') && (
                                <span className="block mt-1 text-amber-400/80">Retire the domain first before deleting.</span>
                            )}
                        </p>
                        {deleteStep === 'idle' ? (
                            <button
                                onClick={() => setDeleteStep('confirm')}
                                disabled={d.warmup_status === 'warming' || d.warmup_status === 'ready'}
                                className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium border border-rose-500/30 text-rose-400/80 hover:bg-rose-500/10 hover:text-rose-300 disabled:opacity-30 disabled:cursor-not-allowed focus-visible:ring-2 focus-visible:ring-rose-400 transition-colors">
                                <Trash2 className="w-3.5 h-3.5" />
                                Delete Domain
                            </button>
                        ) : (
                            <div className="space-y-2">
                                <p className="text-xs text-rose-300 font-medium">Are you sure? This cannot be undone.</p>
                                <div className="flex gap-2">
                                    <button
                                        onClick={deleteDomain}
                                        disabled={deleting}
                                        className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium bg-rose-600/20 border border-rose-500/40 text-rose-300 hover:bg-rose-600/30 disabled:opacity-40 disabled:cursor-not-allowed focus-visible:ring-2 focus-visible:ring-rose-400 transition-colors">
                                        {deleting ? <Spinner className="w-3 h-3" /> : <Trash2 className="w-3 h-3" />}
                                        Yes, delete
                                    </button>
                                    <button
                                        onClick={() => setDeleteStep('idle')}
                                        disabled={deleting}
                                        className="px-3 py-2 rounded-xl text-xs font-medium border border-white/10 text-gray-400 hover:text-gray-200 hover:bg-white/5 transition-colors">
                                        Cancel
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </motion.div>
        </motion.div>
    );
}

// ─── DOMAINS TAB ──────────────────────────────────────────────────────────────

function DomainsTab() {
    const dispatch = useAppDispatch();
    const domains = useAppSelector(selectDomains);
    const status  = useAppSelector(selectDomainsStatus);
    const error   = useAppSelector(selectDomainsError);
    const [showReg, setShowReg] = useState(false);
    const [drawer, setDrawer]   = useState<SendingDomain | null>(null);
    const [search, setSearch]   = useState('');
    const pref = useReducedMotion();

    useEffect(() => { if (status === 'idle') dispatch(fetchDomains()); }, [dispatch, status]);

    const filtered = domains.filter(d => d.domain.toLowerCase().includes(search.toLowerCase()));

    const stats = {
        total:     domains.length,
        ready:     domains.filter(d => getDomainHealth(d).level === 'green').length,
        warming:   domains.filter(d => getDomainHealth(d).level === 'blue').length,
        attention: domains.filter(d => getDomainHealth(d).level === 'amber').length,
        critical:  domains.filter(d => getDomainHealth(d).level === 'red').length,
        cap:       domains.reduce((s, d) => s + (d.daily_capacity ?? 0), 0),
    };

    return (
        <>
            <div className="grid grid-cols-2 lg:grid-cols-6 gap-3 mb-6">
                {[
                    { l: 'Total',     v: stats.total,     icon: <Globe className="w-4 h-4 text-cyan-400" />,         c: 'text-cyan-400'     },
                    { l: 'Ready',     v: stats.ready,     icon: <CheckCircle className="w-4 h-4 text-emerald-400" />, c: 'text-emerald-400'  },
                    { l: 'Warming',   v: stats.warming,   icon: <Activity className="w-4 h-4 text-blue-400" />,       c: 'text-blue-400'     },
                    { l: 'Attention', v: stats.attention, icon: <AlertTriangle className="w-4 h-4 text-amber-400" />, c: 'text-amber-400'    },
                    { l: 'Critical',  v: stats.critical,  icon: <AlertTriangle className="w-4 h-4 text-rose-400" />,  c: 'text-rose-400'     },
                    { l: 'Daily Cap', v: stats.cap,        icon: <Send className="w-4 h-4 text-indigo-400" />,         c: 'text-indigo-400'   },
                ].map((k, i) => (
                    <motion.div key={k.l} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: pref ? 0 : i * 0.04, duration: pref ? 0 : 0.18 }}
                        className="bg-gray-950/80 backdrop-blur-sm border border-white/[0.08] rounded-2xl p-4">
                        <div className="flex items-center gap-2 mb-2">{k.icon}<span className="text-[10px] uppercase tracking-widest text-gray-500">{k.l}</span></div>
                        <p className={`text-2xl font-mono font-bold ${k.c}`}>{k.v.toLocaleString()}</p>
                    </motion.div>
                ))}
            </div>

            <div className="bg-gray-950/80 backdrop-blur-sm border border-white/[0.08] rounded-2xl overflow-hidden">
                <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-white/[0.06]">
                    <div className="relative flex-1 max-w-xs">
                        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-500" />
                        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search domains…"
                            className="w-full pl-8 pr-3 py-2 bg-white/5 border border-white/[0.06] rounded-xl text-sm text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-cyan-400/40 transition-colors" />
                    </div>
                    <div className="flex items-center gap-2">
                        <button onClick={() => dispatch(fetchDomains())} disabled={status === 'loading'}
                            className="p-2 rounded-xl text-gray-500 hover:text-gray-200 hover:bg-white/5 focus-visible:ring-2 focus-visible:ring-cyan-400 transition-colors disabled:opacity-50">
                            <RefreshCw className={`w-4 h-4 ${status === 'loading' ? 'animate-spin' : ''}`} />
                        </button>
                        <button onClick={() => setShowReg(true)}
                            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium bg-cyan-500 hover:bg-cyan-400 text-gray-950 focus-visible:ring-2 focus-visible:ring-cyan-400 transition-colors">
                            <Plus className="w-3.5 h-3.5" />Register Domain
                        </button>
                    </div>
                </div>
                {error && (
                    <div className="flex items-center gap-2 px-4 py-3 bg-rose-500/10 border-b border-rose-500/20 text-rose-400 text-sm">
                        <AlertTriangle className="w-4 h-4 shrink-0" />{error}
                        <button onClick={() => dispatch(clearError())} className="ml-auto"><X className="w-3.5 h-3.5" /></button>
                    </div>
                )}
                {status === 'loading' && !domains.length
                    ? <div className="p-8 space-y-3">{[...Array(3)].map((_, i) => <div key={i} className="h-12 rounded-xl bg-white/[0.03] animate-pulse" />)}</div>
                    : filtered.length === 0
                    ? (
                        <div className="flex flex-col items-center justify-center py-20 text-center">
                            <div className="p-4 rounded-2xl bg-cyan-500/10 mb-4"><Globe className="w-10 h-10 text-cyan-400/50" /></div>
                            <p className="text-gray-400 font-medium mb-1">{search ? 'No matching domains' : 'No domains registered yet'}</p>
                            <p className="text-gray-600 text-sm mb-6">{search ? 'Try a different search term' : 'Register your first sending domain to get started'}</p>
                            {!search && <button onClick={() => setShowReg(true)} className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium bg-cyan-500 hover:bg-cyan-400 text-gray-950 transition-colors"><Plus className="w-4 h-4" />Register Domain</button>}
                        </div>
                    )
                    : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead><tr className="border-b border-white/[0.06]">
                                    {['Domain', 'Health', 'DNS', 'Reputation', 'Sent Today', 'Inboxes', ''].map(h => (
                                        <th key={h} className="px-4 py-2.5 text-[10px] uppercase tracking-widest text-gray-500 font-medium">{h}</th>
                                    ))}
                                </tr></thead>
                                <tbody>
                                    {filtered.map((dom, i) => (
                                        <motion.tr key={dom.id}
                                            initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
                                            transition={{ duration: pref ? 0 : 0.15, delay: pref ? 0 : i * 0.03 }}
                                            className={`border-b border-white/[0.04] hover:bg-white/[0.02] group cursor-pointer transition-colors border-l-2 ${getDomainHealth(dom).border}`}
                                            onClick={() => setDrawer(dom)}>
                                            <td className="px-4 py-3">
                                                <div className="flex items-center gap-2">
                                                    {dom.is_primary
                                                        ? <Crown className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                                                        : <Globe className="w-3.5 h-3.5 text-gray-500 shrink-0" />}
                                                    <span className="text-sm font-mono text-white">{dom.domain}</span>
                                                    <ProviderBadge provider={dom.provider} />
                                                    {dom.is_primary && (
                                                        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-500/15 text-amber-400 font-medium">Primary</span>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-4 py-3"><DomainHealthBadge domain={dom} /></td>
                                            <td className="px-4 py-3">
                                                <div className="flex items-center gap-1">
                                                    <DnsBadge ok={dom.dns_spf}  label="SPF"   />
                                                    <DnsBadge ok={dom.dns_dkim} label="DKIM"  />
                                                    <DnsBadge ok={dom.dns_dmarc}label="DMARC" />
                                                    <DnsBadge ok={dom.dns_mx}   label="MX"    />
                                                </div>
                                            </td>
                                            <td className="px-4 py-3"><ReputationBadge rep={dom.postmaster_domain_reputation} /></td>
                                            <td className="px-4 py-3">
                                                <span className="text-sm font-mono tabular-nums text-white">{dom.daily_sent_today ?? 0}</span>
                                                <span className="text-[11px] text-gray-600 ml-1">/ {dom.daily_capacity ?? 0}</span>
                                            </td>
                                            <td className="px-4 py-3"><span className="text-sm font-mono tabular-nums text-white">{dom.inbox_count ?? 0}</span></td>
                                            <td className="px-4 py-3">
                                                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <button
                                                        onClick={async e => {
                                                            e.stopPropagation();
                                                            await apiService.setDomainPrimary(dom.id, !dom.is_primary);
                                                            dispatch(fetchDomains());
                                                        }}
                                                        title={dom.is_primary ? 'Remove primary flag' : 'Set as primary domain'}
                                                        className={`p-1.5 rounded-lg transition-colors focus-visible:ring-2 focus-visible:ring-amber-400 ${dom.is_primary ? 'text-amber-400 hover:text-gray-400 hover:bg-white/5' : 'text-gray-500 hover:text-amber-400 hover:bg-amber-400/10'}`}>
                                                        <Crown className="w-3.5 h-3.5" />
                                                    </button>
                                                    <button onClick={e => { e.stopPropagation(); dispatch(runDnsHealthCheck(dom.id)); }}
                                                        title="Run DNS health check"
                                                        className="p-1.5 rounded-lg text-gray-500 hover:text-cyan-400 hover:bg-cyan-400/10 focus-visible:ring-2 focus-visible:ring-cyan-400 transition-colors">
                                                        <Shield className="w-3.5 h-3.5" />
                                                    </button>
                                                    <ChevronRight className="w-3.5 h-3.5 text-gray-600" />
                                                </div>
                                            </td>
                                        </motion.tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )
                }
            </div>
            <AnimatePresence>
                {showReg && <RegisterDomainModal onClose={() => setShowReg(false)} onSaved={() => dispatch(fetchDomains())} />}
            </AnimatePresence>
            <AnimatePresence>
                {drawer && <DomainDrawer domain={drawer} onClose={() => setDrawer(null)} />}
            </AnimatePresence>
        </>
    );
}

// ─── CAMPAIGNS TAB ────────────────────────────────────────────────────────────

function CampaignsTab() {
    const dispatch   = useAppDispatch();
    const campaigns  = useAppSelector(selectCampaigns);
    const status     = useAppSelector(selectCampaignsStatus);
    const error      = useAppSelector(selectCampaignsError);
    const [showNew, setShowNew] = useState(false);
    const [busy, setBusy]       = useState<string | null>(null);
    const pref = useReducedMotion();

    useEffect(() => { if (status === 'idle') dispatch(fetchCampaigns()); }, [dispatch, status]);

    async function toggle(c: CampaignOut) {
        setBusy(c.id);
        try {
            if (c.status === 'active') await dispatch(pauseCampaign(c.id)).unwrap();
            else await dispatch(startCampaign(c.id)).unwrap();
        } catch { /* error shown via Redux */ }
        finally { setBusy(null); }
    }

    const stats = {
        total:   campaigns.length,
        active:  campaigns.filter(c => c.status === 'active').length,
        sent:    campaigns.reduce((s, c) => s + c.sent_count, 0),
        replied: campaigns.reduce((s, c) => s + c.replied_count, 0),
    };

    return (
        <>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
                {[
                    { l: 'Total Campaigns', v: stats.total,   c: 'text-indigo-400' },
                    { l: 'Active',          v: stats.active,  c: 'text-emerald-400' },
                    { l: 'Emails Sent',     v: stats.sent,    c: 'text-cyan-400' },
                    { l: 'Replies',         v: stats.replied, c: 'text-amber-400' },
                ].map((k, i) => (
                    <motion.div key={k.l} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: pref ? 0 : i * 0.04, duration: pref ? 0 : 0.18 }}
                        className="bg-gray-950/80 backdrop-blur-sm border border-white/[0.08] rounded-2xl p-4">
                        <p className="text-[10px] uppercase tracking-widest text-gray-500 mb-2">{k.l}</p>
                        <p className={`text-2xl font-mono font-bold ${k.c}`}>{k.v.toLocaleString()}</p>
                    </motion.div>
                ))}
            </div>

            <div className="bg-gray-950/80 backdrop-blur-sm border border-white/[0.08] rounded-2xl overflow-hidden">
                <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.06]">
                    <span className="text-sm font-medium text-gray-300">Campaigns</span>
                    <div className="flex items-center gap-2">
                        <button onClick={() => dispatch(fetchCampaigns())} disabled={status === 'loading'}
                            className="p-2 rounded-xl text-gray-500 hover:text-gray-200 hover:bg-white/5 focus-visible:ring-2 focus-visible:ring-indigo-400 transition-colors disabled:opacity-50">
                            <RefreshCw className={`w-4 h-4 ${status === 'loading' ? 'animate-spin' : ''}`} />
                        </button>
                        <button onClick={() => setShowNew(true)}
                            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium bg-indigo-500 hover:bg-indigo-400 text-white focus-visible:ring-2 focus-visible:ring-indigo-400 transition-colors">
                            <Plus className="w-3.5 h-3.5" />New Campaign
                        </button>
                    </div>
                </div>
                {error && (
                    <div className="flex items-center gap-2 px-4 py-3 bg-rose-500/10 border-b border-rose-500/20 text-rose-400 text-sm">
                        <AlertTriangle className="w-4 h-4 shrink-0" />{error}
                    </div>
                )}
                {status === 'loading' && !campaigns.length
                    ? <div className="p-8 space-y-3">{[...Array(3)].map((_, i) => <div key={i} className="h-14 rounded-xl bg-white/[0.03] animate-pulse" />)}</div>
                    : campaigns.length === 0
                    ? (
                        <div className="flex flex-col items-center justify-center py-20 text-center">
                            <div className="p-4 rounded-2xl bg-indigo-500/10 mb-4"><Layers className="w-10 h-10 text-indigo-400/50" /></div>
                            <p className="text-gray-400 font-medium mb-1">No campaigns yet</p>
                            <p className="text-gray-600 text-sm mb-6">Create your first campaign to start bulk outreach</p>
                            <button onClick={() => setShowNew(true)} className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium bg-indigo-500 hover:bg-indigo-400 text-white transition-colors"><Plus className="w-4 h-4" />New Campaign</button>
                        </div>
                    )
                    : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead><tr className="border-b border-white/[0.06]">
                                    {['Campaign', 'Status', 'Recipients', 'Sent', 'Replies', 'Daily Limit', 'Created', ''].map(h => (
                                        <th key={h} className="px-4 py-2.5 text-[10px] uppercase tracking-widest text-gray-500 font-medium">{h}</th>
                                    ))}
                                </tr></thead>
                                <tbody>
                                    {campaigns.map((c, i) => (
                                        <motion.tr key={c.id}
                                            initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
                                            transition={{ duration: pref ? 0 : 0.15, delay: pref ? 0 : i * 0.03 }}
                                            className="border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors">
                                            <td className="px-4 py-3">
                                                <p className="text-sm font-medium text-white">{c.name}</p>
                                                <p className="text-[11px] text-gray-500">{c.from_domain ?? 'auto'}</p>
                                            </td>
                                            <td className="px-4 py-3"><StatusBadge status={c.status} map={CAMPAIGN_STATUS} /></td>
                                            <td className="px-4 py-3"><span className="text-sm font-mono tabular-nums text-white">{c.total_recipients.toLocaleString()}</span></td>
                                            <td className="px-4 py-3"><span className="text-sm font-mono tabular-nums text-cyan-400">{c.sent_count.toLocaleString()}</span></td>
                                            <td className="px-4 py-3"><span className="text-sm font-mono tabular-nums text-amber-400">{c.replied_count.toLocaleString()}</span></td>
                                            <td className="px-4 py-3"><span className="text-sm font-mono tabular-nums text-white">{c.daily_limit}</span></td>
                                            <td className="px-4 py-3"><span className="text-[11px] text-gray-500">{c.created_at.slice(0, 10)}</span></td>
                                            <td className="px-4 py-3">
                                                <button
                                                    onClick={() => toggle(c)}
                                                    disabled={busy === c.id || c.status === 'completed'}
                                                    className="p-1.5 rounded-lg focus-visible:ring-2 focus-visible:ring-indigo-400 transition-colors disabled:opacity-40"
                                                    title={c.status === 'active' ? 'Pause' : 'Start'}
                                                >
                                                    {busy === c.id
                                                        ? <Spinner className="w-4 h-4 text-gray-500" />
                                                        : c.status === 'active'
                                                        ? <Pause className="w-4 h-4 text-amber-400" />
                                                        : <Play className="w-4 h-4 text-emerald-400" />}
                                                </button>
                                            </td>
                                        </motion.tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )
                }
            </div>
            <AnimatePresence>
                {showNew && <CreateCampaignModal onClose={() => setShowNew(false)} onSaved={() => dispatch(fetchCampaigns())} />}
            </AnimatePresence>
        </>
    );
}

// ─── LEAD QUEUE TAB ───────────────────────────────────────────────────────────

function LeadQueueTab() {
    const dispatch = useAppDispatch();
    const leads    = useAppSelector(selectLeads);
    const status   = useAppSelector(selectLeadsStatus);
    const total    = useAppSelector(selectLeadsTotal);
    const filters  = useAppSelector(selectLeadFilters);
    const pref = useReducedMotion();

    useEffect(() => { if (status === 'idle') dispatch(fetchLeads(filters)); }, [dispatch, status]); // eslint-disable-line

    const [localFilters, setLocalFilters] = useState(filters);
    const [now] = useState(() => Date.now());

    function applyFilters() {
        dispatch(setLeadFilters(localFilters));
        dispatch(fetchLeads(localFilters));
    }

    return (
        <div className="space-y-4">
            {/* Filter bar */}
            <div className="bg-gray-950/80 backdrop-blur-sm border border-white/[0.08] rounded-2xl p-4">
                <div className="flex items-center gap-2 mb-3">
                    <Filter className="w-4 h-4 text-gray-500" />
                    <span className="text-xs font-medium text-gray-400 uppercase tracking-widest">Filters</span>
                </div>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                    <div>
                        <label className="block text-[10px] uppercase tracking-widest text-gray-500 mb-1">Min Cost ($)</label>
                        <input type="number" value={localFilters.min_cost ?? 100000}
                            onChange={e => setLocalFilters(f => ({ ...f, min_cost: Number(e.target.value) }))}
                            className="w-full bg-white/5 border border-white/[0.06] rounded-xl px-3 py-2 text-sm text-white font-mono focus:outline-none focus:ring-2 focus:ring-cyan-400/40 transition-colors" />
                    </div>
                    <div>
                        <label className="block text-[10px] uppercase tracking-widest text-gray-500 mb-1">Max Cost ($)</label>
                        <input type="number" value={localFilters.max_cost ?? 5000000}
                            onChange={e => setLocalFilters(f => ({ ...f, max_cost: Number(e.target.value) }))}
                            className="w-full bg-white/5 border border-white/[0.06] rounded-xl px-3 py-2 text-sm text-white font-mono focus:outline-none focus:ring-2 focus:ring-cyan-400/40 transition-colors" />
                    </div>
                    <div>
                        <label className="block text-[10px] uppercase tracking-widest text-gray-500 mb-1">Days Since Issued</label>
                        <input type="number" min={1} max={365} value={localFilters.days_since_issued ?? 30}
                            onChange={e => setLocalFilters(f => ({ ...f, days_since_issued: Number(e.target.value) }))}
                            className="w-full bg-white/5 border border-white/[0.06] rounded-xl px-3 py-2 text-sm text-white font-mono focus:outline-none focus:ring-2 focus:ring-cyan-400/40 transition-colors" />
                    </div>
                    <div>
                        <label className="block text-[10px] uppercase tracking-widest text-gray-500 mb-1">Permit Types</label>
                        <input placeholder="electrical,plumbing,hvac…" value={localFilters.permit_types ?? ''}
                            onChange={e => setLocalFilters(f => ({ ...f, permit_types: e.target.value }))}
                            className="w-full bg-white/5 border border-white/[0.06] rounded-xl px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-cyan-400/40 transition-colors" />
                    </div>
                </div>
                <div className="flex items-center justify-between mt-3">
                    <button onClick={() => { dispatch(resetLeadFilters()); setLocalFilters(filters); }}
                        className="text-xs text-gray-500 hover:text-gray-300 transition-colors">Reset to defaults</button>
                    <button onClick={applyFilters} disabled={status === 'loading'}
                        className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium bg-cyan-500 hover:bg-cyan-400 disabled:opacity-50 text-gray-950 focus-visible:ring-2 focus-visible:ring-cyan-400 transition-colors">
                        {status === 'loading' ? <Spinner className="w-3.5 h-3.5" /> : <Search className="w-3.5 h-3.5" />}
                        {status === 'loading' ? 'Loading…' : 'Apply Filters'}
                    </button>
                </div>
            </div>

            {/* Results table */}
            <div className="bg-gray-950/80 backdrop-blur-sm border border-white/[0.08] rounded-2xl overflow-hidden">
                <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.06]">
                    <span className="text-sm text-gray-400">
                        {status === 'loading' ? 'Loading…' : <><span className="font-mono text-white">{total}</span> leads found</>}
                    </span>
                    <div className="flex items-center gap-1 text-[11px] text-gray-500">
                        <ArrowUpDown className="w-3 h-3" />
                        Sorted by lead score
                    </div>
                </div>
                {status === 'loading' && !leads.length
                    ? <div className="p-8 space-y-3">{[...Array(5)].map((_, i) => <div key={i} className="h-12 rounded-xl bg-white/[0.03] animate-pulse" />)}</div>
                    : leads.length === 0
                    ? (
                        <div className="flex flex-col items-center justify-center py-20 text-center">
                            <div className="p-4 rounded-2xl bg-white/[0.03] mb-4"><Users className="w-10 h-10 text-gray-600" /></div>
                            <p className="text-gray-400 font-medium mb-1">No leads match these filters</p>
                            <p className="text-gray-600 text-sm">Try widening the cost range or increasing the days filter</p>
                        </div>
                    )
                    : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead><tr className="border-b border-white/[0.06]">
                                    {['Score', 'Permit', 'Type', 'Est. Cost', 'Contractor', 'Email', 'City', 'Days Old'].map(h => (
                                        <th key={h} className="px-4 py-2.5 text-[10px] uppercase tracking-widest text-gray-500 font-medium">{h}</th>
                                    ))}
                                </tr></thead>
                                <tbody>
                                    {leads.map((lead: PermitLead, i: number) => {
                                        const daysOld = lead.issue_date
                                            ? Math.floor((now - new Date(lead.issue_date).getTime()) / 86400000)
                                            : null;
                                        return (
                                            <motion.tr key={lead.id}
                                                initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
                                                transition={{ duration: pref ? 0 : 0.12, delay: pref ? 0 : Math.min(i * 0.02, 0.3) }}
                                                className="border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors">
                                                <td className="px-4 py-3"><LeadScoreBadge score={lead.lead_score} /></td>
                                                <td className="px-4 py-3">
                                                    <span className="text-xs font-mono text-gray-400">{lead.permit_number}</span>
                                                </td>
                                                <td className="px-4 py-3">
                                                    <span className="text-sm text-white truncate max-w-[140px] block">{lead.permit_type}</span>
                                                </td>
                                                <td className="px-4 py-3">
                                                    <span className="text-sm font-mono tabular-nums text-white">
                                                        {lead.estimated_cost ? `$${(lead.estimated_cost / 1000).toFixed(0)}k` : '—'}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3">
                                                    <span className="text-sm text-gray-300 truncate max-w-[160px] block">{lead.contractor_name ?? '—'}</span>
                                                </td>
                                                <td className="px-4 py-3">
                                                    {lead.contractor_email
                                                        ? <span className="text-xs font-mono text-cyan-400 truncate max-w-[180px] block">{lead.contractor_email}</span>
                                                        : <span className="text-gray-600 text-xs">—</span>}
                                                </td>
                                                <td className="px-4 py-3">
                                                    <span className="text-sm text-gray-400">{lead.city ?? '—'}{lead.state ? `, ${lead.state}` : ''}</span>
                                                </td>
                                                <td className="px-4 py-3">
                                                    {daysOld !== null
                                                        ? <span className={`text-sm font-mono tabular-nums ${daysOld <= 7 ? 'text-emerald-400' : daysOld <= 30 ? 'text-amber-400' : 'text-gray-400'}`}>{daysOld}d</span>
                                                        : <span className="text-gray-600 text-xs">—</span>}
                                                </td>
                                            </motion.tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )
                }
            </div>
        </div>
    );
}

// ─── SEND HISTORY TAB ─────────────────────────────────────────────────────────

function SendHistoryTab() {
    const dispatch     = useAppDispatch();
    const sendHistory  = useAppSelector(selectSendHistory);
    const histStatus   = useAppSelector(selectSendHistoryStatus);
    const pref = useReducedMotion();

    useEffect(() => { if (histStatus === 'idle') dispatch(fetchSendHistory({ limit: 100 })); }, [dispatch, histStatus]);

    const stats = {
        total:   sendHistory.length,
        sent:    sendHistory.filter(s => s.status === 'sent').length,
        bounced: sendHistory.filter(s => s.status === 'bounced').length,
        failed:  sendHistory.filter(s => s.status === 'failed').length,
    };

    return (
        <>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
                {[
                    { l: 'Total Logged', v: stats.total,   c: 'text-white'        },
                    { l: 'Sent',         v: stats.sent,    c: 'text-emerald-400'  },
                    { l: 'Bounced',      v: stats.bounced, c: 'text-orange-400'   },
                    { l: 'Failed',       v: stats.failed,  c: 'text-rose-400'     },
                ].map((k, i) => (
                    <motion.div key={k.l} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: pref ? 0 : i * 0.04, duration: pref ? 0 : 0.18 }}
                        className="bg-gray-950/80 backdrop-blur-sm border border-white/[0.08] rounded-2xl p-4">
                        <p className="text-[10px] uppercase tracking-widest text-gray-500 mb-2">{k.l}</p>
                        <p className={`text-2xl font-mono font-bold ${k.c}`}>{k.v.toLocaleString()}</p>
                    </motion.div>
                ))}
            </div>

            <div className="bg-gray-950/80 backdrop-blur-sm border border-white/[0.08] rounded-2xl overflow-hidden">
                <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.06]">
                    <span className="text-sm font-medium text-gray-300">Email Send Log</span>
                    <button onClick={() => dispatch(fetchSendHistory({ limit: 100 }))} disabled={histStatus === 'loading'}
                        className="p-2 rounded-xl text-gray-500 hover:text-gray-200 hover:bg-white/5 focus-visible:ring-2 focus-visible:ring-cyan-400 transition-colors disabled:opacity-50">
                        <RefreshCw className={`w-4 h-4 ${histStatus === 'loading' ? 'animate-spin' : ''}`} />
                    </button>
                </div>
                {histStatus === 'loading' && !sendHistory.length
                    ? <div className="p-8 space-y-3">{[...Array(5)].map((_, i) => <div key={i} className="h-12 rounded-xl bg-white/[0.03] animate-pulse" />)}</div>
                    : sendHistory.length === 0
                    ? (
                        <div className="flex flex-col items-center justify-center py-20 text-center">
                            <div className="p-4 rounded-2xl bg-white/[0.03] mb-4"><TrendingUp className="w-10 h-10 text-gray-600" /></div>
                            <p className="text-gray-400 font-medium mb-1">No emails sent yet</p>
                            <p className="text-gray-600 text-sm">Start a campaign or use the Message button on a permit to send</p>
                        </div>
                    )
                    : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead><tr className="border-b border-white/[0.06]">
                                    {['Status', 'To', 'Subject', 'Contractor', 'Permit', 'Sent At'].map(h => (
                                        <th key={h} className="px-4 py-2.5 text-[10px] uppercase tracking-widest text-gray-500 font-medium">{h}</th>
                                    ))}
                                </tr></thead>
                                <tbody>
                                    {sendHistory.map((s, i) => (
                                        <motion.tr key={s.id}
                                            initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
                                            transition={{ duration: pref ? 0 : 0.12, delay: pref ? 0 : Math.min(i * 0.02, 0.3) }}
                                            className="border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors">
                                            <td className="px-4 py-3"><StatusBadge status={s.status} map={SEND_STATUS} /></td>
                                            <td className="px-4 py-3"><span className="text-xs font-mono text-cyan-400">{s.to_email}</span></td>
                                            <td className="px-4 py-3"><span className="text-sm text-gray-300 truncate max-w-[200px] block">{s.subject}</span></td>
                                            <td className="px-4 py-3"><span className="text-sm text-gray-400 truncate max-w-[140px] block">{s.contractor_name ?? '—'}</span></td>
                                            <td className="px-4 py-3"><span className="text-xs font-mono text-gray-500">{s.permit_number ?? '—'}</span></td>
                                            <td className="px-4 py-3"><span className="text-xs text-gray-500">{s.sent_at ? new Date(s.sent_at).toLocaleString() : '—'}</span></td>
                                        </motion.tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )
                }
            </div>
        </>
    );
}

// ─── Threads Tab ─────────────────────────────────────────────────────────────

const INTENT_CONFIG: Record<ReplyIntent, { label: string; badge: string }> = {
    hot_lead: { label: 'Hot Lead',        badge: 'bg-emerald-500/15 text-emerald-400' },
    soft:     { label: 'Soft Interest',   badge: 'bg-cyan-500/15 text-cyan-400'       },
    not_now:  { label: 'Not Now',         badge: 'bg-amber-500/15 text-amber-400'     },
    no:       { label: 'Not Interested',  badge: 'bg-rose-500/15 text-rose-400'       },
};

function IntentBadge({ intent }: { intent: ReplyIntent | null }) {
    if (!intent) return null;
    const cfg = INTENT_CONFIG[intent];
    return (
        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium ${cfg.badge}`}>
            {cfg.label}
        </span>
    );
}

function ThreadBubble({ item }: { item: ThreadItem }) {
    const [expanded, setExpanded] = useState(false);
    const isSent = item.direction === 'sent';
    const body = item.body_text ?? '';
    const truncated = body.length > 280 && !expanded;
    const displayBody = truncated ? body.slice(0, 280) + '…' : body;

    return (
        <div className={`flex ${isSent ? 'justify-end' : 'justify-start'} mb-3`}>
            <div className={`max-w-[75%] ${isSent
                ? 'bg-cyan-500/10 border border-cyan-500/20 rounded-2xl rounded-tr-sm'
                : 'bg-white/[0.06] border border-white/[0.08] rounded-2xl rounded-tl-sm'
            } px-4 py-3`}>
                {item.subject && (
                    <p className="text-[11px] font-semibold text-gray-400 mb-1 truncate">{item.subject}</p>
                )}
                <p className="text-sm text-gray-200 leading-relaxed whitespace-pre-wrap break-words">{displayBody}</p>
                {body.length > 280 && (
                    <button onClick={() => setExpanded(e => !e)}
                        className="mt-1 flex items-center gap-0.5 text-[11px] text-cyan-400 hover:text-cyan-300 transition-colors">
                        {expanded ? <><ChevronUp className="w-3 h-3" />Show less</> : <><ChevronDown className="w-3 h-3" />Read more</>}
                    </button>
                )}
                <div className={`flex items-center gap-2 mt-2 ${isSent ? 'justify-end' : 'justify-start'}`}>
                    {!isSent && item.reply_intent && <IntentBadge intent={item.reply_intent} />}
                    {isSent && item.status && (
                        <StatusBadge status={item.status} map={SEND_STATUS} />
                    )}
                    <span className="text-[10px] font-mono text-gray-600 tabular-nums">
                        {new Date(item.timestamp).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </span>
                </div>
            </div>
        </div>
    );
}

type SendingInboxRow = {
    id: string; email: string; display_name: string; domain: string;
    provider: string; status: string; message_count: number; last_message_at: string | null;
};

type InboxConversation = {
    contact_email: string; contact_name: string | null; contractor_id: string | null;
    sent_count: number; received_count: number;
    last_direction: 'sent' | 'received' | null;
    last_subject: string | null; last_preview: string | null;
    last_message_at: string | null; latest_reply_intent: string | null;
    has_unread: boolean;
};

type WarmupThread = { thread_id: string; subject: string; snippet: string; from: string; to?: string; date: string; message_count: number; direction: 'sent' | 'received'; source?: 'inbox' | 'sent' | 'spam' | 'promotions'; labels?: string[]; is_labeled: boolean; body?: string };
type WarmupMessage = { id: string; from: string; to: string; subject: string; date: string; body: string; snippet: string; direction: 'sent' | 'received' };
type WarmupThreadDetail = { thread_id: string; subject: string; messages: WarmupMessage[]; error?: string };

function ThreadsTab() {
    const dispatch      = useAppDispatch();
    const activeThread  = useAppSelector(selectActiveThread);
    const threadStatus  = useAppSelector(selectActiveThreadStatus);
    const pref          = useReducedMotion();

    // Inboxes
    const [inboxes, setInboxes]               = useState<SendingInboxRow[]>([]);
    const [inboxesLoading, setInboxesLoading] = useState(false);
    const [selectedInbox, setSelectedInbox]   = useState<SendingInboxRow | null>(null);

    // Conversations for selected inbox
    const [convos, setConvos]               = useState<InboxConversation[]>([]);
    const [convosLoading, setConvosLoading] = useState(false);
    const [selectedConvo, setSelectedConvo] = useState<InboxConversation | null>(null);

    // View: 'list' = conversation list, 'thread' = chat bubbles + compose
    const [view, setView] = useState<'list' | 'thread'>('list');

    // Compose / reply form
    const [compose, setCompose] = useState({ to: '', subject: '', body: '' });
    const [showCompose, setShowCompose] = useState(false);
    const [sending, setSending]         = useState(false);
    const [sendErr, setSendErr]         = useState('');

    // IMAP poll
    const [polling, setPolling] = useState(false);

    // Archived inboxes (deleted/retired inboxes that still have message history)
    type ArchivedInbox = {
        inbox_email: string;
        conversation_count: number;
        last_activity_at: string | null;
        conversations: InboxConversation[];
    };
    const [archivedInboxes, setArchivedInboxes] = useState<ArchivedInbox[]>([]);
    const [showArchived, setShowArchived]       = useState(false);
    const [selectedArchived, setSelectedArchived] = useState<ArchivedInbox | null>(null);

    const [chatBottom, setChatBottom] = useState<HTMLDivElement | null>(null);

    // Warmup threads (unified with outreach in one list)
    const [warmupThreads, setWarmupThreads]       = useState<WarmupThread[]>([]);
    const [warmupDwdError, setWarmupDwdError]     = useState<string | null>(null);
    const [selectedWarmupThread, setSelectedWarmupThread] = useState<WarmupThread | null>(null);
    const [warmupDetail, setWarmupDetail]         = useState<WarmupThreadDetail | null>(null);
    const [warmupDetailLoading, setWarmupDetailLoading] = useState(false);

    // Per-inbox data cache — avoids re-fetching when switching between inboxes
    type InboxCache = { convos: InboxConversation[]; warmup: WarmupThread[]; warmupError: string | null; at: number };
    const cache = useRef<Map<string, InboxCache>>(new Map());
    const CACHE_TTL = 5 * 60 * 1000; // 5 min

    useEffect(() => { loadInboxes(); }, []);

    // Auto-refresh every 30 s. ThreadsTab only mounts when the Threads tab is
    // active, so no activeTab guard needed — the interval is always relevant.
    const selectedInboxEmailRef = useRef<string | null>(null);
    useEffect(() => {
        selectedInboxEmailRef.current = selectedInbox?.email ?? null;
    }, [selectedInbox]);

    useEffect(() => {
        const id = setInterval(() => {
            loadInboxes();
            const email = selectedInboxEmailRef.current;
            if (email) {
                cache.current.delete(email);
                loadInboxData(email, true);
            }
        }, 30_000);
        return () => clearInterval(id);
    }, []);

    useEffect(() => {
        if (chatBottom && activeThread) chatBottom.scrollIntoView({ behavior: pref ? 'auto' : 'smooth' });
    }, [activeThread, chatBottom, pref]);

    async function loadInboxes() {
        setInboxesLoading(true);
        try {
            const [active, archived] = await Promise.all([
                apiService.listSendingInboxes(),
                apiService.getArchivedInboxConversations(),
            ]);
            setInboxes(active);
            setArchivedInboxes(archived);
        }
        catch { /* ignore */ } finally { setInboxesLoading(false); }
    }

    async function loadInboxData(email: string, forceRefresh = false) {
        const hit = cache.current.get(email);
        // Show cached data immediately — inbox switches feel instant
        if (hit) {
            setConvos(hit.convos);
            setWarmupThreads(hit.warmup);
            setWarmupDwdError(hit.warmupError);
            if (!forceRefresh && Date.now() - hit.at < CACHE_TTL) return;
        }

        // Step 1: load convos (fast DB query) first so the list appears immediately
        if (!hit) setConvosLoading(true);
        let convosData: InboxConversation[] = hit?.convos ?? [];
        try {
            convosData = await apiService.getInboxConversations(email);
            setConvos(convosData);
        } catch { /* ignore */ } finally { setConvosLoading(false); }

        // Step 2: load Gmail threads in the background — don't block convo display
        apiService.getWarmupThreads(email).then(warmupData => {
            // Only update if the user is still on the same inbox
            if (selectedInboxEmailRef.current !== email) return;
            setWarmupThreads(warmupData.threads);
            setWarmupDwdError(warmupData.error ?? null);
            cache.current.set(email, {
                convos: convosData,
                warmup: warmupData.threads,
                warmupError: warmupData.error ?? null,
                at: Date.now(),
            });
        }).catch(() => {});

        // Update cache with convos immediately so re-visits are fast
        if (!hit) {
            cache.current.set(email, { convos: convosData, warmup: [], warmupError: null, at: Date.now() });
        }
    }

    async function handleFetchInbox() {
        setPolling(true);
        try {
            await apiService.triggerImapPoll();
            await loadInboxes();
            if (selectedInbox) {
                cache.current.delete(selectedInbox.email);
                await loadInboxData(selectedInbox.email, true);
            }
        } catch { /* ignore */ } finally { setPolling(false); }
    }

    async function pickWarmupThread(t: WarmupThread) {
        setSelectedWarmupThread(t); setSelectedConvo(null);
        setWarmupDetail(null); setWarmupDetailLoading(true); setView('thread');
        try { setWarmupDetail(await apiService.getWarmupThread(selectedInbox!.email, t.thread_id)); }
        catch { /* ignore */ } finally { setWarmupDetailLoading(false); }
    }

    function pickInbox(inbox: SendingInboxRow) {
        setSelectedInbox(inbox);
        setSelectedArchived(null);
        setSelectedConvo(null);
        setSelectedWarmupThread(null); setWarmupDetail(null);
        setView('list');
        setShowCompose(false);
        loadInboxData(inbox.email);
    }

    function pickArchivedInbox(a: ArchivedInbox) {
        setSelectedArchived(a);
        setSelectedInbox(null);
        setConvos(a.conversations);
        setSelectedConvo(null);
        setView('list');
        setShowCompose(false);
    }

    function pickConvo(c: InboxConversation) {
        setSelectedConvo(c);
        setView('thread');
        setShowCompose(false);
        dispatch(setSelectedThreadEmail(c.contact_email));
        dispatch(fetchEmailThread(c.contact_email));
        // Mark all received messages from this contact as read so the unread
        // badge on the inbox row decrements. Fire-and-forget — UI is still usable
        // if this fails (e.g. network blip).
        if (selectedInbox) {
            apiService.markInboxConversationRead(selectedInbox.email, c.contact_email).catch(() => {});
        }
    }

    function openReply() {
        if (!selectedConvo) return;
        const lastSubject = selectedConvo.last_subject ?? '';
        setCompose({
            to: selectedConvo.contact_email,
            subject: lastSubject.startsWith('Re:') ? lastSubject : `Re: ${lastSubject}`,
            body: '',
        });
        setShowCompose(true);
    }

    function openNewEmail() {
        setCompose({ to: '', subject: '', body: '' });
        setShowCompose(true);
    }

    async function handleSend(e: React.FormEvent) {
        e.preventDefault();
        if (!selectedInbox || !compose.to || !compose.subject || !compose.body) return;
        setSending(true); setSendErr('');
        try {
            await apiService.sendFromInbox({
                inbox_id: selectedInbox.id,
                to_email: compose.to,
                subject: compose.subject,
                body: compose.body,
                contractor_id: selectedConvo?.contractor_id ?? undefined,
            });
            setShowCompose(false);
            setCompose({ to: '', subject: '', body: '' });
            // Refresh conversation list and thread
            cache.current.delete(selectedInbox.email);
            await loadInboxData(selectedInbox.email, true);
            if (selectedConvo) dispatch(fetchEmailThread(selectedConvo.contact_email));
        } catch (err: unknown) {
            setSendErr((err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ?? 'Send failed');
        } finally { setSending(false); }
    }

    const totalUnread = inboxes.reduce((s, i) => s + i.message_count, 0);

    function fmtDate(d: string | null) {
        if (!d) return '';
        const dt = new Date(d);
        const now = new Date();
        if (dt.toDateString() === now.toDateString()) return dt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        return dt.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    }

    return (
        <div className="flex h-[calc(100vh-240px)] min-h-[560px] bg-gray-950/80 backdrop-blur-sm border border-white/[0.08] rounded-2xl overflow-hidden">

            {/* ── Col 1: Sending Inboxes ─────────────────────────────────────── */}
            <div className="w-56 flex-shrink-0 border-r border-white/[0.08] flex flex-col bg-gray-950/60">
                <div className="px-3 py-3 border-b border-white/[0.06] flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                        <span className="text-[10px] uppercase tracking-widest text-gray-500 font-medium">Inboxes</span>
                        {totalUnread > 0 && (
                            <span title={`${totalUnread} unread message${totalUnread !== 1 ? 's' : ''}`} className="inline-flex items-center justify-center min-w-[16px] h-4 px-1 rounded-full bg-cyan-500/20 text-[9px] font-mono font-bold text-cyan-400 animate-pulse">{totalUnread}</span>
                        )}
                    </div>
                    <div className="flex items-center gap-0.5">
                        <button onClick={handleFetchInbox} disabled={polling} title="Check for new emails"
                            className="flex items-center gap-1 px-1.5 py-1 rounded-lg text-[10px] font-medium text-cyan-400 bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/20 transition-colors disabled:opacity-40">
                            <Inbox className={`w-2.5 h-2.5 ${polling ? 'animate-pulse' : ''}`} />
                            {polling ? '…' : 'Check'}
                        </button>
                        <button onClick={loadInboxes} disabled={inboxesLoading} className="p-1 rounded text-gray-600 hover:text-gray-300 transition-colors disabled:opacity-40">
                            <RefreshCw className={`w-2.5 h-2.5 ${inboxesLoading ? 'animate-spin' : ''}`} />
                        </button>
                    </div>
                </div>
                <div className="flex-1 overflow-y-auto py-1">
                    {inboxesLoading && !inboxes.length
                        ? <div className="p-2 space-y-1">{[...Array(3)].map((_, i) => <div key={i} className="h-10 rounded-lg bg-white/[0.03] animate-pulse" />)}</div>
                        : inboxes.length === 0
                        ? <p className="text-[11px] text-gray-600 text-center py-8 px-3">No inboxes. Add one in Domains tab.</p>
                        : inboxes.map(inbox => {
                        const spamCount = selectedInbox?.id === inbox.id
                            ? warmupThreads.filter(t => (t.source ?? 'inbox') === 'spam').length
                            : 0;
                        return (
                            <button key={inbox.id} onClick={() => pickInbox(inbox)}
                                className={`w-full px-3 py-2.5 text-left hover:bg-white/[0.04] transition-colors ${selectedInbox?.id === inbox.id ? 'bg-cyan-500/8 border-l-2 border-l-cyan-500/60' : ''}`}>
                                <div className="flex items-center justify-between gap-1">
                                    <div className="flex items-center gap-1.5 min-w-0">
                                        <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${inbox.message_count > 0 ? 'bg-cyan-400' : 'bg-gray-600'}`} />
                                        <p className="text-[11px] font-mono text-gray-300 truncate">{inbox.email.split('@')[0]}</p>
                                    </div>
                                    <div className="flex items-center gap-1 shrink-0">
                                        {spamCount > 0 && (
                                            <span title={`${spamCount} spam`} className="text-[9px] font-mono font-bold text-red-400 bg-red-500/15 rounded-full px-1">{spamCount}</span>
                                        )}
                                        {inbox.message_count > 0 && (
                                            <span title={`${inbox.message_count} unread`} className="text-[9px] font-mono font-bold text-cyan-400 bg-cyan-500/15 rounded-full px-1">{inbox.message_count}</span>
                                        )}
                                    </div>
                                </div>
                                <p className="text-[10px] text-gray-600 pl-3 truncate">@{inbox.email.split('@')[1]}</p>
                            </button>
                        );
                    })
                    }

                    {/* ── Archived Inboxes section ───────────────────────── */}
                    {archivedInboxes.length > 0 && (
                        <div className="mt-2 border-t border-white/[0.05]">
                            <button onClick={() => setShowArchived(v => !v)}
                                className="w-full flex items-center justify-between px-3 py-2 text-left hover:bg-white/[0.02] transition-colors">
                                <div className="flex items-center gap-1.5">
                                    <CloudOff className="w-3 h-3 text-gray-600" />
                                    <span className="text-[10px] uppercase tracking-widest text-gray-600 font-medium">Archived</span>
                                    <span className="text-[9px] font-mono text-gray-700 bg-white/5 rounded px-1">{archivedInboxes.length}</span>
                                </div>
                                {showArchived ? <ChevronUp className="w-3 h-3 text-gray-700" /> : <ChevronDown className="w-3 h-3 text-gray-700" />}
                            </button>
                            {showArchived && archivedInboxes.map(a => (
                                <button key={a.inbox_email} onClick={() => pickArchivedInbox(a)}
                                    className={`w-full px-3 py-2 text-left hover:bg-white/[0.03] transition-colors ${selectedArchived?.inbox_email === a.inbox_email ? 'bg-white/[0.04] border-l-2 border-l-gray-500/50' : 'pl-4'}`}>
                                    <div className="flex items-center justify-between gap-1">
                                        <p className="text-[11px] font-mono text-gray-500 truncate">{a.inbox_email.split('@')[0]}</p>
                                        <span className="text-[9px] font-mono text-gray-600 bg-white/5 rounded-full px-1 shrink-0">{a.conversation_count}</span>
                                    </div>
                                    <p className="text-[10px] text-gray-700 truncate">@{a.inbox_email.split('@')[1]}</p>
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* ── Col 2: Conversation List ───────────────────────────────────── */}
            <div className="w-72 flex-shrink-0 border-r border-white/[0.08] flex flex-col">
                {!selectedInbox && !selectedArchived ? (
                    <div className="flex flex-col items-center justify-center flex-1 text-center px-6">
                        <Mail className="w-8 h-8 text-gray-700 mb-2" />
                        <p className="text-gray-500 text-sm">Select an inbox</p>
                    </div>
                ) : (
                    <>
                        <div className="px-3 pt-3 pb-2 border-b border-white/[0.06] flex-shrink-0">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-1.5 min-w-0">
                                    {selectedArchived && <CloudOff className="w-3 h-3 text-gray-600 shrink-0" />}
                                    <p className={`text-xs font-mono truncate ${selectedArchived ? 'text-gray-500' : 'text-white'}`}>
                                        {selectedInbox?.email ?? selectedArchived?.inbox_email}
                                    </p>
                                </div>
                                {selectedInbox && (
                                    <div className="flex items-center gap-1 shrink-0">
                                        <button onClick={openNewEmail} title="Compose new email"
                                            className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-medium text-cyan-400 bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/20 transition-colors">
                                            <Plus className="w-3 h-3" />New
                                        </button>
                                        <button onClick={() => { cache.current.delete(selectedInbox.email); loadInboxData(selectedInbox.email, true); }}
                                            disabled={convosLoading}
                                            className="p-1 rounded text-gray-600 hover:text-gray-300 transition-colors disabled:opacity-40">
                                            <RefreshCw className={`w-2.5 h-2.5 ${convosLoading ? 'animate-spin' : ''}`} />
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                        {warmupDwdError && (
                            <div className="mx-3 mt-2 mb-1 px-3 py-2 rounded-lg bg-amber-500/10 border border-amber-500/20 text-[10px] text-amber-400 flex items-center gap-1.5 flex-shrink-0">
                                <AlertTriangle className="w-3 h-3 shrink-0" />
                                <span className="truncate">Gmail: {warmupDwdError}</span>
                            </div>
                        )}
                        <div className="flex-1 overflow-y-auto">
                            {(() => {
                                // Merge outreach convos + gmail threads into one sorted list.
                                // Skip 'inbox' Gmail threads — those emails are already captured
                                // by the IMAP poller and appear as outreach convos with Reply support.
                                type UItem =
                                    | { kind: 'outreach'; date: string; c: InboxConversation }
                                    | { kind: 'warmup';   date: string; t: WarmupThread };

                                const unified: UItem[] = [
                                    ...convos.map(c => ({ kind: 'outreach' as const, date: c.last_message_at ?? '', c })),
                                    ...warmupThreads
                                        .filter(t => (t.source ?? 'inbox') !== 'inbox')
                                        .map(t => ({ kind: 'warmup' as const, date: t.date, t })),
                                ].sort((a, b) => (b.date > a.date ? 1 : -1));

                                if (convosLoading && unified.length === 0)
                                    return <div className="p-3 space-y-2">{[...Array(4)].map((_, i) => <div key={i} className="h-14 rounded-xl bg-white/[0.03] animate-pulse" />)}</div>;

                                if (unified.length === 0)
                                    return (
                                        <div className="flex flex-col items-center justify-center h-full text-center px-6 py-12">
                                            <MessageSquare className="w-7 h-7 text-gray-700 mb-2" />
                                            <p className="text-gray-500 text-sm">No messages yet</p>
                                            <p className="text-gray-700 text-xs mt-1">Send an email or wait for warmup activity</p>
                                            <button onClick={openNewEmail} className="mt-4 flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium text-cyan-400 bg-cyan-500/10 border border-cyan-500/20 hover:bg-cyan-500/20 transition-colors">
                                                <Plus className="w-3 h-3" />Compose New Email
                                            </button>
                                        </div>
                                    );

                                return unified.map(item => {
                                    if (item.kind === 'outreach') {
                                        const c = item.c;
                                        const isSelected = selectedConvo?.contact_email === c.contact_email;
                                        return (
                                            <button key={`o-${c.contact_email}`} onClick={() => pickConvo(c)}
                                                className={`w-full px-3 py-2.5 text-left border-b border-white/[0.04] hover:bg-white/[0.03] transition-colors ${isSelected ? 'bg-white/[0.05] border-l-2 border-l-cyan-500/50' : ''}`}>
                                                <div className="flex items-start justify-between gap-2 mb-0.5">
                                                    <div className="flex items-center gap-1.5 min-w-0">
                                                        {c.received_count > 0 && <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 shrink-0" />}
                                                        <p className="text-[11px] font-medium text-gray-200 truncate">{c.contact_name ?? c.contact_email}</p>
                                                    </div>
                                                    <div className="flex items-center gap-1 shrink-0">
                                                        {c.latest_reply_intent && <IntentBadge intent={c.latest_reply_intent as import('@/types').ReplyIntent} />}
                                                        <span className="text-[10px] font-mono text-gray-600 tabular-nums">{fmtDate(c.last_message_at)}</span>
                                                    </div>
                                                </div>
                                                {c.contact_name && <p className="text-[10px] font-mono text-gray-600 truncate pl-3 mb-0.5">{c.contact_email}</p>}
                                                <p className="text-[10px] text-gray-500 truncate pl-3">{c.last_subject}</p>
                                                <div className="flex items-center gap-2 mt-0.5 pl-3">
                                                    <span className="text-[9px] text-gray-700">{c.sent_count}↑ {c.received_count}↓</span>
                                                </div>
                                            </button>
                                        );
                                    }
                                    const t = item.t;
                                    const isSelected = selectedWarmupThread?.thread_id === t.thread_id;
                                    const src = (t.source ?? 'inbox') as 'inbox' | 'sent' | 'spam' | 'promotions';
                                    const srcBadge =
                                        src === 'spam'        ? <span className="text-[9px] px-1 py-px rounded bg-red-500/15 text-red-400/80 font-medium">spam</span> :
                                        src === 'promotions'  ? <span className="text-[9px] px-1 py-px rounded bg-amber-500/15 text-amber-400/80 font-medium">promo</span> :
                                        src === 'sent'        ? <span className="text-[9px] px-1 py-px rounded bg-gray-700/60 text-gray-500 font-medium">sent</span> :
                                        null;
                                    return (
                                        <button key={`w-${t.thread_id}`} onClick={() => pickWarmupThread(t)}
                                            className={`w-full px-3 py-2.5 text-left border-b border-white/[0.04] hover:bg-white/[0.03] transition-colors group ${isSelected ? 'bg-purple-500/5 border-l-2 border-l-purple-500/40' : ''}`}>
                                            <div className="flex items-start justify-between gap-2 mb-0.5">
                                                <div className="flex items-center gap-1.5 min-w-0">
                                                    <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${src === 'spam' ? 'bg-red-400/70' : t.direction === 'received' ? 'bg-emerald-400/80' : 'bg-purple-400/60'}`} />
                                                    <p className="text-[11px] font-medium text-gray-300 truncate">{t.subject}</p>
                                                </div>
                                                <div className="flex items-center gap-1 shrink-0">
                                                    {src === 'spam' && (
                                                        <button
                                                            onClick={async e => {
                                                                e.stopPropagation();
                                                                if (!selectedInbox) return;
                                                                await apiService.trashGmailThread(selectedInbox.email, t.thread_id);
                                                                setWarmupThreads(prev => prev.filter(x => x.thread_id !== t.thread_id));
                                                                if (selectedWarmupThread?.thread_id === t.thread_id) {
                                                                    setSelectedWarmupThread(null); setWarmupDetail(null); setView('list');
                                                                }
                                                            }}
                                                            title="Move to Trash"
                                                            className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-red-500/20 text-red-400/70 hover:text-red-400 transition-all"
                                                        >
                                                            <Trash2 className="w-3 h-3" />
                                                        </button>
                                                    )}
                                                    <span className="text-[10px] font-mono text-gray-600 tabular-nums">{fmtDate(t.date)}</span>
                                                </div>
                                            </div>
                                            <p className="text-[10px] text-gray-600 truncate pl-3">{t.snippet}</p>
                                            <div className="flex items-center gap-2 mt-0.5 pl-3">
                                                {srcBadge}
                                                <span className={`text-[9px] ${t.direction === 'received' ? 'text-emerald-400/60' : 'text-purple-400/50'}`}>{t.direction === 'received' ? '↓' : '↑'} {t.message_count}msg</span>
                                            </div>
                                        </button>
                                    );
                                });
                            })()}
                        </div>
                    </>
                )}
            </div>

            {/* ── Col 3: Thread + Compose ────────────────────────────────────── */}
            <div className="flex-1 flex flex-col overflow-hidden">
                {/* ── Warmup thread detail (read-only) ── */}
                {selectedWarmupThread ? (
                    <div className="flex flex-col h-full">
                        <div className="px-5 py-3 border-b border-white/[0.08] flex items-center gap-2 flex-shrink-0">
                            <button onClick={() => { setSelectedWarmupThread(null); setWarmupDetail(null); setView('list'); }}
                                className="p-1 rounded-lg text-gray-500 hover:text-gray-200 hover:bg-white/5 transition-colors shrink-0">
                                <ChevronRight className="w-3.5 h-3.5 rotate-180" />
                            </button>
                            <div className="min-w-0 flex-1">
                                <p className="text-sm font-semibold text-white truncate">{selectedWarmupThread.subject}</p>
                                <p className="text-[10px] text-gray-500">{selectedWarmupThread.message_count} msg · warmup</p>
                            </div>
                            <span className="shrink-0 inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-medium bg-purple-500/10 text-purple-400 border border-purple-500/20">
                                {selectedWarmupThread.direction === 'received' ? '↓ received' : '↑ sent'}
                            </span>
                        </div>
                        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
                            {warmupDetailLoading ? (
                                <div className="space-y-3">{[...Array(3)].map((_, i) => (
                                    <div key={i} className={`flex ${i % 2 === 0 ? 'justify-end' : 'justify-start'}`}>
                                        <div className="h-16 w-64 rounded-2xl bg-white/[0.04] animate-pulse" />
                                    </div>
                                ))}</div>
                            ) : warmupDetail?.error ? (
                                <p className="text-xs text-rose-400 text-center mt-8">{warmupDetail.error}</p>
                            ) : (warmupDetail?.messages ?? []).map((msg) => {
                                const isSent = msg.direction === 'sent';
                                const body = msg.body || msg.snippet || '(no content)';
                                return (
                                    <div key={msg.id} className={`flex ${isSent ? 'justify-end' : 'justify-start'}`}>
                                        <div className={`max-w-[75%] px-4 py-3 rounded-2xl ${isSent
                                            ? 'bg-purple-500/10 border border-purple-500/20 rounded-tr-sm'
                                            : 'bg-white/[0.06] border border-white/[0.08] rounded-tl-sm'}`}>
                                            <p className="text-[10px] text-gray-500 mb-1 truncate">{isSent ? `To: ${msg.to}` : `From: ${msg.from}`}</p>
                                            <p className="text-sm text-gray-200 leading-relaxed whitespace-pre-wrap break-words">{body}</p>
                                            <p className={`text-[10px] font-mono text-gray-600 mt-2 ${isSent ? 'text-right' : 'text-left'}`}>
                                                {new Date(msg.date).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                            </p>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                ) : ((!selectedInbox && !selectedArchived) || (!selectedConvo && !showCompose)) ? (
                    <div className="flex flex-col items-center justify-center flex-1 text-center px-8">
                        <div className="p-4 rounded-2xl bg-white/[0.03] mb-3">
                            <MessageSquare className="w-9 h-9 text-gray-700" />
                        </div>
                        <p className="text-gray-400 font-medium mb-1">Select a conversation</p>
                        <p className="text-gray-600 text-sm">Or compose a new email from any inbox</p>
                    </div>
                ) : showCompose && !view.startsWith('thread') ? (
                    /* ── Compose (new email, no conversation selected) ── */
                    <ComposePanel
                        inboxEmail={selectedInbox?.email ?? ''}
                        compose={compose} setCompose={setCompose}
                        onSend={handleSend} onCancel={() => setShowCompose(false)}
                        sending={sending} error={sendErr}
                        title="New Email"
                    />
                ) : view === 'thread' && selectedConvo ? (
                    <>
                        {/* Thread header */}
                        <div className="px-5 py-3 border-b border-white/[0.08] flex items-center justify-between flex-shrink-0">
                            <div className="flex items-center gap-2 min-w-0">
                                <button onClick={() => { setView('list'); setShowCompose(false); }}
                                    className="p-1 rounded-lg text-gray-500 hover:text-gray-200 hover:bg-white/5 transition-colors shrink-0">
                                    <ChevronRight className="w-3.5 h-3.5 rotate-180" />
                                </button>
                                <div className="min-w-0">
                                    <p className="text-sm font-semibold text-white truncate">
                                        {selectedConvo.contact_name ?? selectedConvo.contact_email}
                                    </p>
                                    {selectedConvo.contact_name && (
                                        <p className="text-[10px] font-mono text-gray-500 truncate">{selectedConvo.contact_email}</p>
                                    )}
                                </div>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                                {activeThread && <IntentBadge intent={activeThread.latest_reply_intent} />}
                                {activeThread && (
                                    <span className="text-[10px] font-mono text-gray-600">
                                        {activeThread.total_sent}↑ {activeThread.total_received}↓
                                    </span>
                                )}
                                {!selectedArchived && (
                                    <>
                                        <button onClick={openReply}
                                            className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-medium text-cyan-400 bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/20 transition-colors">
                                            <Send className="w-3 h-3" />Reply
                                        </button>
                                        <button onClick={() => dispatch(fetchEmailThread(selectedConvo.contact_email))}
                                            disabled={threadStatus === 'loading'}
                                            className="p-1.5 rounded-lg text-gray-500 hover:text-gray-200 hover:bg-white/5 transition-colors disabled:opacity-50">
                                            <RefreshCw className={`w-3.5 h-3.5 ${threadStatus === 'loading' ? 'animate-spin' : ''}`} />
                                        </button>
                                    </>
                                )}
                            </div>
                        </div>

                        {/* Thread bubbles */}
                        <div className="flex-1 overflow-y-auto px-5 py-4 min-h-0">
                            {threadStatus === 'loading' && !activeThread ? (
                                <div className="space-y-3">
                                    {[...Array(3)].map((_, i) => (
                                        <div key={i} className={`flex ${i % 2 === 0 ? 'justify-end' : 'justify-start'}`}>
                                            <div className="h-16 w-64 rounded-2xl bg-white/[0.04] animate-pulse" />
                                        </div>
                                    ))}
                                </div>
                            ) : !activeThread || activeThread.items.length === 0 ? (
                                <div className="flex flex-col items-center justify-center h-full text-center">
                                    <p className="text-gray-500 text-sm">No messages yet — click Reply to start</p>
                                </div>
                            ) : (
                                <>
                                    {activeThread.items.map((item, i) => (
                                        <motion.div key={item.id}
                                            initial={{ opacity: 0, y: pref ? 0 : 8 }} animate={{ opacity: 1, y: 0 }}
                                            transition={{ duration: pref ? 0 : 0.12, delay: pref ? 0 : Math.min(i * 0.03, 0.4) }}>
                                            <ThreadBubble item={item} />
                                        </motion.div>
                                    ))}
                                    <div ref={el => setChatBottom(el)} />
                                </>
                            )}
                        </div>

                        {/* Inline compose / reply */}
                        {showCompose && (
                            <ComposePanel
                                inboxEmail={selectedInbox?.email ?? ''}
                                compose={compose} setCompose={setCompose}
                                onSend={handleSend} onCancel={() => setShowCompose(false)}
                                sending={sending} error={sendErr}
                                title={`Reply to ${selectedConvo.contact_email}`}
                                inline
                            />
                        )}
                    </>
                ) : null}
            </div>
        </div>
    );
}

// ── Compose Panel ─────────────────────────────────────────────────────────────

function ComposePanel({
    inboxEmail, compose, setCompose, onSend, onCancel, sending, error, title, inline = false,
}: {
    inboxEmail: string;
    compose: { to: string; subject: string; body: string };
    setCompose: (v: { to: string; subject: string; body: string }) => void;
    onSend: (e: React.FormEvent) => void;
    onCancel: () => void;
    sending: boolean;
    error: string;
    title: string;
    inline?: boolean;
}) {
    const cls = inline
        ? 'border-t border-white/[0.08] bg-gray-950/80 flex-shrink-0'
        : 'flex-1 flex flex-col bg-gray-950/60';

    return (
        <form onSubmit={onSend} className={cls}>
            <div className="px-5 py-3 border-b border-white/[0.06] flex items-center justify-between">
                <div>
                    <p className="text-sm font-semibold text-white">{title}</p>
                    <p className="text-[10px] font-mono text-gray-600">From: {inboxEmail}</p>
                </div>
                <button type="button" onClick={onCancel} className="p-1.5 rounded-lg text-gray-500 hover:text-gray-200 hover:bg-white/5 transition-colors">
                    <X className="w-3.5 h-3.5" />
                </button>
            </div>
            <div className="px-5 py-3 space-y-2 flex-1 flex flex-col">
                <input
                    required type="email" placeholder="To: recipient@example.com"
                    value={compose.to} onChange={e => setCompose({ ...compose, to: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-white/[0.04] border border-white/[0.08] text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-cyan-500/40"
                />
                <input
                    required type="text" placeholder="Subject"
                    value={compose.subject} onChange={e => setCompose({ ...compose, subject: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-white/[0.04] border border-white/[0.08] text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-cyan-500/40"
                />
                <textarea
                    required placeholder="Type your message…"
                    value={compose.body} onChange={e => setCompose({ ...compose, body: e.target.value })}
                    rows={inline ? 4 : 8}
                    className="w-full flex-1 px-3 py-2 rounded-xl bg-white/[0.04] border border-white/[0.08] text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-cyan-500/40 resize-none"
                />
                {error && (
                    <div className="flex items-center gap-2 text-xs text-rose-400 bg-rose-500/10 border border-rose-500/20 rounded-xl px-3 py-2">
                        <AlertTriangle className="w-3.5 h-3.5 shrink-0" />{error}
                    </div>
                )}
                <div className="flex justify-end gap-2">
                    <button type="button" onClick={onCancel}
                        className="px-4 py-2 rounded-xl text-sm text-gray-400 hover:text-gray-200 hover:bg-white/5 transition-colors">
                        Cancel
                    </button>
                    <button type="submit" disabled={sending}
                        className="flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-semibold bg-cyan-500 hover:bg-cyan-400 text-gray-950 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
                        {sending ? <Spinner className="w-4 h-4" /> : <Send className="w-3.5 h-3.5" />}
                        {sending ? 'Sending…' : 'Send'}
                    </button>
                </div>
            </div>
        </form>
    );
}

// ─── AGENTS TAB ───────────────────────────────────────────────────────────────

type AgentInbox = {
    inbox_id: string; domain_id: string; email: string; display_name: string | null;
    domain: string; status: string | null; warmup_health_score: number | null;
    warmup_status: string | null; daily_sent_today: number; daily_limit: number;
    assigned_at: string;
};
type AgentRow = {
    user_id: number; full_name: string; email: string; status: string;
    assigned_inboxes: AgentInbox[];
};
type AllInbox = {
    id: string; email: string; display_name: string | null; domain: string;
    status: string | null; warmup_health_score: number | null; warmup_status: string | null;
};

function AgentsTab() {
    const [agents, setAgents] = useState<AgentRow[]>([]);
    const [allInboxes, setAllInboxes] = useState<AllInbox[]>([]);
    const [loading, setLoading] = useState(true);
    const [assigningFor, setAssigningFor] = useState<number | null>(null);
    const [selectedInbox, setSelectedInbox] = useState<string>('');
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);
    // password reveal: inboxId → password string | 'loading' | null
    const [passwords, setPasswords] = useState<Record<string, string | 'loading' | null>>({});
    const [copied, setCopied] = useState<string | null>(null);

    const load = async () => {
        setLoading(true);
        setError(null);
        try {
            const [a, i] = await Promise.all([
                apiService.listAgentsWithInboxes(),
                apiService.listAvailableInboxes(),
            ]);
            setAgents(a);
            setAllInboxes(i);
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Failed to load');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { load(); }, []);

    const handleAssign = async (userId: number) => {
        if (!selectedInbox) return;
        setBusy(true);
        try {
            await apiService.assignInboxToAgent(userId, selectedInbox);
            setAssigningFor(null);
            setSelectedInbox('');
            await load();
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Failed to assign');
        } finally {
            setBusy(false);
        }
    };

    const handleRemove = async (userId: number, inboxId: string) => {
        setBusy(true);
        try {
            await apiService.removeInboxFromAgent(userId, inboxId);
            await load();
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Failed to remove');
        } finally {
            setBusy(false);
        }
    };

    const fetchPassword = async (inbox: AgentInbox) => {
        const cur = passwords[inbox.inbox_id];
        if (cur && cur !== 'loading') {
            // toggle hide
            setPasswords((p) => ({ ...p, [inbox.inbox_id]: null }));
            return;
        }
        setPasswords((p) => ({ ...p, [inbox.inbox_id]: 'loading' }));
        try {
            const data = await apiService.getInboxPassword(inbox.domain_id, inbox.inbox_id);
            setPasswords((p) => ({ ...p, [inbox.inbox_id]: data.password }));
        } catch {
            setPasswords((p) => ({ ...p, [inbox.inbox_id]: null }));
        }
    };

    const copyPw = async (inboxId: string, pw: string) => {
        await navigator.clipboard.writeText(pw);
        setCopied(inboxId);
        setTimeout(() => setCopied((c) => (c === inboxId ? null : c)), 2000);
    };

    const healthColor = (score: number | null) => {
        if (score === null) return 'text-gray-500';
        if (score >= 80) return 'text-emerald-400';
        if (score >= 50) return 'text-amber-400';
        return 'text-rose-400';
    };

    if (loading) return (
        <div className="flex items-center justify-center h-40 text-gray-500 text-sm">
            <RefreshCw className="w-4 h-4 animate-spin mr-2" /> Loading…
        </div>
    );

    return (
        <div className="space-y-4">
            {error && (
                <div className="rounded-xl border border-rose-500/20 bg-rose-500/5 px-4 py-3 text-rose-400 text-sm flex items-center gap-2">
                    <XCircle className="w-4 h-4 shrink-0" /> {error}
                </div>
            )}

            <div className="flex items-center justify-between mb-2">
                <p className="text-gray-400 text-sm">
                    Assign specific sending inboxes to outreach agents. Agents can only send from their allotted inboxes.
                </p>
                <button onClick={load} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-gray-400 text-xs border border-white/10">
                    <RefreshCw className="w-3 h-3" /> Refresh
                </button>
            </div>

            {agents.length === 0 && (
                <div className="text-center py-16 text-gray-500 text-sm">No outreach agents found.</div>
            )}

            <div className="space-y-3">
                {agents.map((agent) => {
                    const isAssigning = assigningFor === agent.user_id;
                    const assignedIds = new Set(agent.assigned_inboxes.map((i) => i.inbox_id));
                    const available = allInboxes.filter((i) => !assignedIds.has(i.id));

                    return (
                        <div key={agent.user_id}
                            className="rounded-2xl border border-white/[0.08] bg-gray-950/80 backdrop-blur-sm p-5 space-y-4">
                            {/* Agent header */}
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-cyan-500/15 flex items-center justify-center">
                                    <Crown className="w-4 h-4 text-cyan-400" />
                                </div>
                                <div>
                                    <p className="text-white text-sm font-medium">{agent.full_name}</p>
                                    <p className="text-gray-500 text-xs font-mono">{agent.email}</p>
                                </div>
                                <div className="ml-auto flex items-center gap-2">
                                    <span className="text-[10px] uppercase tracking-widest text-gray-500">
                                        {agent.assigned_inboxes.length} inbox{agent.assigned_inboxes.length !== 1 ? 'es' : ''}
                                    </span>
                                    {!isAssigning && (
                                        <button
                                            onClick={() => { setAssigningFor(agent.user_id); setSelectedInbox(''); }}
                                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 border border-cyan-500/20 text-xs font-medium"
                                        >
                                            <Plus className="w-3 h-3" /> Assign inbox
                                        </button>
                                    )}
                                </div>
                            </div>

                            {/* Assign dropdown */}
                            {isAssigning && (
                                <div className="flex items-center gap-2 p-3 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                                    <select
                                        value={selectedInbox}
                                        onChange={(e) => setSelectedInbox(e.target.value)}
                                        className="flex-1 bg-white/[0.05] border border-white/10 rounded-lg px-3 py-1.5 text-white text-xs focus:outline-none focus:border-cyan-500/50"
                                    >
                                        <option value="">Select inbox…</option>
                                        {available.map((i) => (
                                            <option key={i.id} value={i.id}>
                                                {i.email} ({i.domain}) {i.warmup_health_score != null ? `· ${i.warmup_health_score}%` : ''}
                                            </option>
                                        ))}
                                    </select>
                                    <button
                                        onClick={() => handleAssign(agent.user_id)}
                                        disabled={!selectedInbox || busy}
                                        className="px-3 py-1.5 rounded-lg bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 border border-cyan-500/20 text-xs font-medium disabled:opacity-50"
                                    >
                                        {busy ? <RefreshCw className="w-3 h-3 animate-spin" /> : 'Assign'}
                                    </button>
                                    <button onClick={() => setAssigningFor(null)} className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-gray-400 border border-white/10 text-xs">
                                        Cancel
                                    </button>
                                </div>
                            )}

                            {/* Inbox list */}
                            {agent.assigned_inboxes.length > 0 ? (
                                <div className="rounded-xl border border-white/[0.06] overflow-hidden">
                                    <table className="w-full text-xs">
                                        <thead>
                                            <tr className="border-b border-white/[0.06] text-gray-500">
                                                <th className="px-4 py-2 text-left font-normal uppercase tracking-widest text-[10px]">Inbox</th>
                                                <th className="px-4 py-2 text-left font-normal uppercase tracking-widest text-[10px]">Domain</th>
                                                <th className="px-4 py-2 text-left font-normal uppercase tracking-widest text-[10px]">Health</th>
                                                <th className="px-4 py-2 text-left font-normal uppercase tracking-widest text-[10px]">Warmup</th>
                                                <th className="px-4 py-2 text-left font-normal uppercase tracking-widest text-[10px]">Sent today</th>
                                                <th className="px-4 py-2 text-left font-normal uppercase tracking-widest text-[10px]">Password</th>
                                                <th className="px-4 py-2" />
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {agent.assigned_inboxes.map((inbox) => {
                                                const pw = passwords[inbox.inbox_id];
                                                const isLoading = pw === 'loading';
                                                const isVisible = !!pw && pw !== 'loading';
                                                return (
                                                <tr key={inbox.inbox_id} className="border-b border-white/[0.04] last:border-0 hover:bg-white/[0.02]">
                                                    <td className="px-4 py-2.5">
                                                        <p className="text-white font-mono">{inbox.email}</p>
                                                        {inbox.display_name && <p className="text-gray-500 text-[10px]">{inbox.display_name}</p>}
                                                    </td>
                                                    <td className="px-4 py-2.5 text-gray-400">{inbox.domain}</td>
                                                    <td className={`px-4 py-2.5 font-mono font-bold ${healthColor(inbox.warmup_health_score)}`}>
                                                        {inbox.warmup_health_score != null ? `${inbox.warmup_health_score}%` : '—'}
                                                    </td>
                                                    <td className="px-4 py-2.5">
                                                        <WarmupBadge status={inbox.warmup_status ?? 'pending'} />
                                                    </td>
                                                    <td className="px-4 py-2.5 font-mono text-white">
                                                        {inbox.daily_sent_today} <span className="text-gray-500">/ {inbox.daily_limit}</span>
                                                    </td>
                                                    <td className="px-4 py-2.5">
                                                        <div className="flex items-center gap-1.5">
                                                            <button
                                                                onClick={() => fetchPassword(inbox)}
                                                                disabled={isLoading}
                                                                title={isVisible ? 'Hide password' : 'Show password'}
                                                                className="p-1 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white transition-colors disabled:opacity-50"
                                                            >
                                                                {isLoading
                                                                    ? <RefreshCw className="w-3 h-3 animate-spin" />
                                                                    : isVisible
                                                                        ? <EyeOff className="w-3 h-3" />
                                                                        : <Eye className="w-3 h-3" />}
                                                            </button>
                                                            {isVisible && (
                                                                <>
                                                                    <span className="font-mono text-[11px] text-amber-300 max-w-[140px] truncate select-all" title={pw}>
                                                                        {pw}
                                                                    </span>
                                                                    <button
                                                                        onClick={() => copyPw(inbox.inbox_id, pw)}
                                                                        title="Copy password"
                                                                        className="p-1 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
                                                                    >
                                                                        {copied === inbox.inbox_id
                                                                            ? <CheckCircle className="w-3 h-3 text-emerald-400" />
                                                                            : <Copy className="w-3 h-3" />}
                                                                    </button>
                                                                </>
                                                            )}
                                                        </div>
                                                    </td>
                                                    <td className="px-4 py-2.5 text-right">
                                                        <button
                                                            onClick={() => handleRemove(agent.user_id, inbox.inbox_id)}
                                                            disabled={busy}
                                                            className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 text-[10px] disabled:opacity-50"
                                                        >
                                                            <Trash2 className="w-3 h-3" /> Remove
                                                        </button>
                                                    </td>
                                                </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            ) : (
                                <p className="text-gray-600 text-xs text-center py-3">No inboxes assigned yet.</p>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

// ─── PAGE ─────────────────────────────────────────────────────────────────────

export default function OutreachPage() {
    const pref = useReducedMotion();
    const [activeTab, setActiveTab] = useState<Tab>('Lead Queue');

    const { user } = useSelector((s: RootState) => s.auth);
    const userRole = (user?.role ?? 'viewer') as Role;
    const canSeeHealth = hasRole(userRole, 'admin');
    const canSeeAgents = hasRole(userRole, 'super_admin');
    // Campaigns/Domains/Send History are the actual send/campaign-creation-
    // capable surfaces of this legacy automated-email system (start/create/
    // pause a campaign, manage sending domains) -- under this product's
    // "EHUB never sends email" direction (see CLAUDE.md), these are gated at
    // the strictest bar already used on this page (super_admin, same as
    // Agents) rather than left at the page's own admin floor
    // (PAGE_MIN_ROLES['/dashboard/outreach'], enforced by AuthGuard) that
    // Lead Queue/Threads/Health share. This is frontend defense-in-depth
    // only -- the backend's role gate + OUTREACH_ENABLED kill switch are the
    // actual enforcement and are unchanged by this.
    const canSeeCampaigns = hasRole(userRole, 'super_admin');
    const canSeeDomains = hasRole(userRole, 'super_admin');
    const canSeeSendHistory = hasRole(userRole, 'super_admin');
    const visibleTabs = TABS.filter(t =>
        (t !== 'Health' || canSeeHealth) &&
        (t !== 'Agents' || canSeeAgents) &&
        (t !== 'Campaigns' || canSeeCampaigns) &&
        (t !== 'Domains' || canSeeDomains) &&
        (t !== 'Send History' || canSeeSendHistory)
    );

    // If a restricted tab is active but no longer visible, fall back to the
    // first tab this user can actually see.
    const effectiveTab: Tab = visibleTabs.includes(activeTab) ? activeTab : (visibleTabs[0] ?? 'Lead Queue');

    return (
        <div className="p-6 lg:p-8">
            <motion.div initial={{ opacity: 0, y: pref ? 0 : -16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: pref ? 0 : 0.2 }} className="mb-6">
                <div className="flex items-center gap-3 mb-1">
                    <div className="p-2 rounded-xl bg-cyan-500/15"><Send className="w-5 h-5 text-cyan-400" /></div>
                    <h1 className="text-2xl font-bold text-white">Cold Email Outreach</h1>
                </div>
                <p className="text-gray-500 text-sm ml-[52px]">Domain management, campaigns, lead queue, and send history</p>
            </motion.div>

            {/* Tabs */}
            <div className="flex gap-1 p-1 bg-white/[0.03] border border-white/[0.06] rounded-xl w-fit mb-6">
                {visibleTabs.map(tab => (
                    <button key={tab} onClick={() => setActiveTab(tab)}
                        className={`relative px-4 py-2 rounded-lg text-sm font-medium transition-colors focus-visible:ring-2 focus-visible:ring-cyan-400 ${effectiveTab === tab ? 'text-white' : 'text-gray-500 hover:text-gray-300'}`}>
                        {effectiveTab === tab && (
                            <motion.div layoutId="tab-pill" className="absolute inset-0 bg-white/[0.08] rounded-lg"
                                transition={{ type: 'spring', stiffness: 400, damping: 35 }} />
                        )}
                        <span className="relative flex items-center gap-1.5">
                            {tab === 'Domains'      && <Globe className="w-3.5 h-3.5" />}
                            {tab === 'Campaigns'    && <Layers className="w-3.5 h-3.5" />}
                            {tab === 'Lead Queue'   && <Users className="w-3.5 h-3.5" />}
                            {tab === 'Send History' && <TrendingUp className="w-3.5 h-3.5" />}
                            {tab === 'Threads'      && <MessageSquare className="w-3.5 h-3.5" />}
                            {tab === 'Health'       && <HeartPulse className="w-3.5 h-3.5" />}
                            {tab === 'Agents'       && <Crown className="w-3.5 h-3.5" />}
                            {tab}
                        </span>
                    </button>
                ))}
            </div>

            <AnimatePresence mode="wait">
                <motion.div key={effectiveTab}
                    initial={{ opacity: 0, y: pref ? 0 : 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: pref ? 0 : -4 }}
                    transition={{ duration: pref ? 0 : 0.15 }}>
                    {effectiveTab === 'Domains'      && <DomainsTab />}
                    {effectiveTab === 'Campaigns'    && <CampaignsTab />}
                    {effectiveTab === 'Lead Queue'   && <LeadQueueTab />}
                    {effectiveTab === 'Send History' && <SendHistoryTab />}
                    {effectiveTab === 'Threads'      && <ThreadsTab />}
                    {effectiveTab === 'Health'       && <HealthTab />}
                    {effectiveTab === 'Agents'       && <AgentsTab />}
                </motion.div>
            </AnimatePresence>
        </div>
    );
}
