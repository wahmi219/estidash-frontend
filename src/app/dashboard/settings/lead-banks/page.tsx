'use client';

import { useState, useEffect, useCallback, FormEvent } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Wallet, Plus, X, AlertCircle, RefreshCw, Loader2, Mail, Target, Split, CheckCircle2,
    RotateCcw, Users, UserCheck, ArrowLeft, ChevronRight,
} from 'lucide-react';
import { apiService } from '@/services/api';
import type { LeadBank, UserRecord, LeadDistributionResult } from '@/types';

const TIERS = ['A', 'B', 'C'] as const;

interface StateRow {
    state_code: string;
    tier: string;
}

export default function LeadBanksPage() {
    const [banks, setBanks] = useState<LeadBank[]>([]);
    const [users, setUsers] = useState<UserRecord[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [showCreate, setShowCreate] = useState(false);
    const [showDistribute, setShowDistribute] = useState(false);

    const load = useCallback(async (silent = false) => {
        if (!silent) { setLoading(true); setError(null); }
        try {
            const [bankData, userData] = await Promise.all([
                apiService.listLeadBanks(),
                apiService.listUsers().catch(() => [] as UserRecord[]),
            ]);
            setBanks(bankData);
            setUsers(userData);
        } catch (err) {
            if (!silent) setError(err instanceof Error ? err.message : 'Failed to load lead banks');
        } finally {
            if (!silent) setLoading(false);
        }
    }, []);

    // Initial load + a quiet 20s background refresh so contacted counts stay live
    // as outreach agents send (no spinner flash).
    useEffect(() => {
        load();
        const t = setInterval(() => load(true), 20000);
        return () => clearInterval(t);
    }, [load]);


    return (
        <div className="p-6 max-w-6xl mx-auto">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div>
                    <div className="flex items-center gap-2">
                        <Wallet size={22} className="text-cyan-400" />
                        <h1 className="text-2xl font-semibold text-white">Lead Banks</h1>
                    </div>
                    <p className="text-sm text-gray-400 mt-1">
                        Allocate lead quotas and assigned states to outreach agents, and monitor consumption.
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <button onClick={() => load()} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 border border-white/10 text-sm">
                        <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Refresh
                    </button>
                    <button onClick={() => setShowDistribute(true)} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-purple-500/10 hover:bg-purple-500/20 text-purple-300 border border-purple-500/20 text-sm font-medium">
                        <Split size={14} /> Distribute leads
                    </button>
                    <button onClick={() => setShowCreate(true)} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 border border-cyan-500/20 text-sm font-medium">
                        <Plus size={14} /> New bank
                    </button>
                </div>
            </div>

            {error && (
                <div className="mb-4 flex items-center gap-2 rounded-xl border border-rose-500/20 bg-rose-500/10 px-3 py-2 text-sm text-rose-400">
                    <AlertCircle size={14} /> {error}
                </div>
            )}

            {loading ? (
                <div className="flex items-center justify-center py-20 gap-3 text-gray-400">
                    <Loader2 size={20} className="animate-spin text-cyan-400" /> Loading…
                </div>
            ) : banks.length === 0 ? (
                <div className="rounded-2xl border border-white/[0.08] bg-gray-950/80 p-12 text-center text-gray-400">
                    No lead banks yet. Create one to allocate leads to an agent.
                </div>
            ) : (
                <div className="grid gap-4 sm:grid-cols-2">
                    {banks.map((b) => {
                        return (
                            <div key={b.id} className="rounded-2xl border border-white/[0.08] bg-gray-950/80 backdrop-blur-sm p-5">
                                <div className="flex items-start justify-between">
                                    <div>
                                        <h3 className="text-white font-medium">{b.name}</h3>
                                        <p className="text-xs text-gray-500">{b.agent_email || `User #${b.agent_user_id}`}</p>
                                    </div>
                                    <span className={`text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded ${b.status === 'active' ? 'bg-emerald-500/15 text-emerald-400' : 'bg-white/10 text-gray-400'}`}>
                                        {b.status}
                                    </span>
                                </div>

                                {/* Outreach progress — real: emails sent / permits assigned to this bank */}
                                <div className="mt-4">
                                    <div className="flex items-center justify-between text-xs mb-1">
                                        <span className="text-gray-500 uppercase tracking-widest text-[10px]">Leads contacted</span>
                                        <span className="font-mono tabular-nums text-cyan-400">{b.contacted_pct}%</span>
                                    </div>
                                    <div className="h-2 rounded-full bg-white/[0.06] overflow-hidden">
                                        <div className="h-full bg-cyan-500" style={{ width: `${Math.min(100, b.contacted_pct)}%` }} />
                                    </div>
                                    <p className="text-xs text-gray-400 mt-1 font-mono tabular-nums">
                                        {b.emails_sent.toLocaleString()} / {b.assigned_permits.toLocaleString()} leads contacted
                                    </p>
                                </div>

                                {/* Stats */}
                                <div className="mt-4 grid grid-cols-2 gap-3">
                                    <div className="rounded-xl bg-white/[0.02] border border-white/[0.06] p-3">
                                        <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-widest text-gray-500"><Mail size={12} /> Emails sent</div>
                                        <div className="text-xl font-mono font-bold text-white tabular-nums">{b.emails_sent.toLocaleString()}</div>
                                    </div>
                                    <div className="rounded-xl bg-white/[0.02] border border-white/[0.06] p-3">
                                        <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-widest text-gray-500"><Target size={12} /> Assigned leads</div>
                                        <div className="text-xl font-mono font-bold text-white tabular-nums">{b.assigned_permits.toLocaleString()}</div>
                                    </div>
                                </div>

                                {/* States */}
                                <div className="mt-4 flex flex-wrap gap-1.5">
                                    {b.states.map((s) => (
                                        <span key={s.state_code} className="text-[11px] font-mono px-1.5 py-0.5 rounded bg-white/[0.04] border border-white/10 text-gray-300">
                                            {s.state_code}<span className="text-gray-500">·{s.tier}</span>
                                        </span>
                                    ))}
                                    {b.states.length === 0 && <span className="text-xs text-gray-500">No states assigned</span>}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            <AnimatePresence>
                {showCreate && (
                    <CreateBankModal
                        users={users}
                        onClose={() => setShowCreate(false)}
                        onCreated={() => { setShowCreate(false); load(); }}
                    />
                )}
                {showDistribute && (
                    <DistributeModal
                        users={users}
                        onClose={() => setShowDistribute(false)}
                        onDistributed={() => { setShowDistribute(false); load(); }}
                    />
                )}
            </AnimatePresence>
        </div>
    );
}

const BUCKET_LABELS: Record<string, string> = {
    strategic: 'Strategic',
    strong: 'Strong',
    core: 'Core',
    opportunistic: 'Opport.',
};

type DistMode = 'all' | 'reset' | 'specific';

const DIST_MODES: { id: DistMode; label: string; desc: string; icon: typeof Split }[] = [
    {
        id: 'all',
        label: 'New leads → all agents',
        desc: 'Assign only new / unassigned leads, spread evenly across every agent. Existing assignments are untouched.',
        icon: Users,
    },
    {
        id: 'specific',
        label: 'New leads → specific agents',
        desc: 'Assign only new / unassigned leads, but only to the agents you choose below.',
        icon: UserCheck,
    },
    {
        id: 'reset',
        label: 'Redistribute everything',
        desc: 'Wipe current assignments and re-split all leads across every agent. Already-emailed contractors stay with their agent.',
        icon: RotateCcw,
    },
];

function DistributeModal({ users, onClose, onDistributed }: { users: UserRecord[]; onClose: () => void; onDistributed: () => void }) {
    const outreachAgents = users.filter((u) => u.role === 'outreach' && u.status === 'active');

    const [step, setStep] = useState<'choose' | 'preview'>('choose');
    const [mode, setMode] = useState<DistMode>('all');
    const [selectedAgents, setSelectedAgents] = useState<number[]>([]);

    const [preview, setPreview] = useState<LeadDistributionResult | null>(null);
    const [loading, setLoading] = useState(false);
    const [running, setRunning] = useState(false);
    const [done, setDone] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Mode → (reset, agentIds) — the only place the three modes map to the API.
    const reset = mode === 'reset';
    const agentIds = mode === 'specific' ? selectedAgents : undefined;

    const toggleAgent = (id: number) =>
        setSelectedAgents((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));

    // API errors are rejected as a plain { message, status } object (not an Error),
    // so read .message to surface the real backend detail instead of a generic string.
    const errMsg = (err: unknown, fallback: string) =>
        (err as { message?: string })?.message || (err instanceof Error ? err.message : fallback);

    const goPreview = async () => {
        setStep('preview'); setLoading(true); setError(null); setDone(false);
        try {
            setPreview(await apiService.distributeLeads(true, reset, agentIds)); // dry run
        } catch (err) {
            setError(errMsg(err, 'Failed to preview distribution'));
        } finally {
            setLoading(false);
        }
    };

    const apply = async () => {
        setRunning(true); setError(null);
        try {
            // Real run is applied in the background; keep the dry-run preview visible
            // as the projected split and show a "started" confirmation.
            await apiService.distributeLeads(false, reset, agentIds);
            setDone(true);
        } catch (err) {
            setError(errMsg(err, 'Failed to distribute'));
        } finally {
            setRunning(false);
        }
    };

    const canContinue = mode !== 'specific' || selectedAgents.length > 0;
    const buckets = preview?.buckets ?? Object.keys(BUCKET_LABELS);
    const activeMode = DIST_MODES.find((m) => m.id === mode)!;

    return (
        <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
            onClick={onClose}
        >
            <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }}
                onClick={(e) => e.stopPropagation()}
                className="bg-[#1a1d2e] border border-white/10 rounded-2xl max-w-3xl w-full mx-4 shadow-2xl max-h-[88vh] flex flex-col"
            >
                <div className="p-5 border-b border-white/[0.06] flex items-center justify-between">
                    <div>
                        <h2 className="text-lg font-semibold text-white flex items-center gap-2"><Split size={18} className="text-purple-300" /> Distribute leads</h2>
                        <p className="text-xs text-gray-500 mt-0.5">
                            {step === 'choose'
                                ? 'Choose how you want to split leads — a contractor is always kept as one lead for one agent.'
                                : <>Preview · <span className="text-gray-400">{activeMode.label}</span></>}
                        </p>
                    </div>
                    <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/[0.06] text-gray-400 hover:text-white"><X size={18} /></button>
                </div>

                <div className="flex-1 overflow-y-auto p-5 space-y-3">
                    {error && (
                        <div className="flex items-center gap-2 rounded-xl border border-rose-500/20 bg-rose-500/10 px-3 py-2 text-sm text-rose-400">
                            <AlertCircle size={14} /> {error}
                        </div>
                    )}

                    {/* ── STEP 1: choose how to split ─────────────────────────── */}
                    {step === 'choose' && (
                        <>
                            <div className="space-y-2">
                                {DIST_MODES.map((m) => {
                                    const Icon = m.icon;
                                    const active = mode === m.id;
                                    return (
                                        <button
                                            key={m.id}
                                            onClick={() => setMode(m.id)}
                                            className={`w-full text-left flex items-start gap-3 rounded-xl border px-4 py-3 transition-colors ${active ? 'border-purple-500/40 bg-purple-500/10' : 'border-white/[0.08] bg-white/[0.02] hover:bg-white/[0.04]'}`}
                                        >
                                            <span className={`mt-0.5 ${active ? 'text-purple-300' : 'text-gray-500'}`}><Icon size={18} /></span>
                                            <span className="flex-1">
                                                <span className={`block text-sm font-medium ${active ? 'text-white' : 'text-gray-200'}`}>{m.label}</span>
                                                <span className="block text-xs text-gray-500 mt-0.5">{m.desc}</span>
                                            </span>
                                            <span className={`mt-1 w-4 h-4 rounded-full border ${active ? 'border-purple-400 bg-purple-500' : 'border-white/20'}`} />
                                        </button>
                                    );
                                })}
                            </div>

                            {/* Agent picker — only for "specific agents" */}
                            {mode === 'specific' && (
                                <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-3">
                                    <div className="text-[10px] uppercase tracking-widest text-gray-500 mb-2">Pick agents to receive new leads</div>
                                    {outreachAgents.length === 0 ? (
                                        <div className="text-xs text-gray-500">No active outreach agents.</div>
                                    ) : (
                                        <div className="grid sm:grid-cols-2 gap-2">
                                            {outreachAgents.map((u) => {
                                                const checked = selectedAgents.includes(u.id);
                                                return (
                                                    <label key={u.id} className={`flex items-center gap-2 rounded-lg border px-3 py-2 cursor-pointer text-sm ${checked ? 'border-purple-500/40 bg-purple-500/10 text-white' : 'border-white/10 bg-white/[0.02] text-gray-300 hover:bg-white/[0.04]'}`}>
                                                        <input type="checkbox" checked={checked} onChange={() => toggleAgent(u.id)} className="w-4 h-4 accent-purple-500" />
                                                        <span className="truncate">{u.full_name || u.email}</span>
                                                    </label>
                                                );
                                            })}
                                        </div>
                                    )}
                                    {mode === 'specific' && selectedAgents.length === 0 && (
                                        <p className="text-xs text-amber-400/80 mt-2">Select at least one agent to continue.</p>
                                    )}
                                </div>
                            )}
                        </>
                    )}

                    {/* ── STEP 2: preview the computed split ──────────────────── */}
                    {step === 'preview' && (
                        <>
                            {done && (
                                <div className="flex items-center gap-2 rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-400">
                                    <CheckCircle2 size={14} /> Distribution started — assigning ~{(preview?.totals.assigned ?? 0).toLocaleString()} permits in the background. Bank totals update on this page within a few seconds.
                                </div>
                            )}

                            {loading ? (
                                <div className="flex items-center justify-center py-12 gap-3 text-gray-400">
                                    <Loader2 size={20} className="animate-spin text-purple-300" /> Computing split…
                                </div>
                            ) : preview && preview.agents.length === 0 ? (
                                <div className="text-center text-gray-400 py-8">{preview.message || 'No active outreach agents to distribute to.'}</div>
                            ) : preview ? (
                                <>
                                    <div className="text-xs text-gray-400 space-y-1">
                                        <div>
                                            {done ? 'Applied' : 'This run assigns'} · <span className="font-mono">{(preview.totals.assigned ?? 0).toLocaleString()}</span> permits
                                            {mode === 'specific' ? <> to <span className="font-mono">{preview.agent_count}</span> selected agent{preview.agent_count === 1 ? '' : 's'}</> : <> across <span className="font-mono">{preview.agent_count}</span> agents</>}
                                        </div>
                                        <div className="text-gray-500">
                                            <span className="font-mono">{(preview.total_scored ?? 0).toLocaleString()}</span> scored ·
                                            <span className="font-mono"> {(preview.already_assigned ?? 0).toLocaleString()}</span> already assigned
                                            {reset && (preview.preserved ?? 0) > 0 && (
                                                <> · <span className="font-mono">{(preview.preserved ?? 0).toLocaleString()}</span> already-contacted kept with their agent</>
                                            )}
                                        </div>
                                        {!done && (preview.totals.assigned ?? 0) === 0 && (preview.already_assigned ?? 0) > 0 && !reset && (
                                            <div className="text-amber-400/80">No new / unassigned leads to distribute. Go back and pick “Redistribute everything” to re-split existing leads.</div>
                                        )}
                                    </div>
                                    <div className="rounded-xl border border-white/[0.08] overflow-x-auto">
                                        <table className="w-full text-sm">
                                            <thead className="bg-white/[0.03] text-[10px] uppercase tracking-widest text-gray-500">
                                                <tr>
                                                    <th className="text-left px-3 py-2">Agent</th>
                                                    {buckets.map((b) => (
                                                        <th key={b} className="text-right px-2 py-2">{BUCKET_LABELS[b] ?? b}</th>
                                                    ))}
                                                    <th className="text-right px-3 py-2">Total</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-white/[0.06]">
                                                {preview.agents.map((a) => (
                                                    <tr key={a.agent_user_id} className={a.in_pool === false ? 'opacity-50' : ''}>
                                                        <td className="px-3 py-2 text-gray-200">
                                                            {a.email || a.bank_name}
                                                            {a.in_pool === false && <span className="ml-1.5 text-[10px] text-gray-500">(not in pool)</span>}
                                                        </td>
                                                        {buckets.map((b) => (
                                                            <td key={b} className="px-2 py-2 text-right font-mono text-gray-300">{a.assigned[b] ?? 0}</td>
                                                        ))}
                                                        <td className="px-3 py-2 text-right font-mono text-white">{a.assigned.total ?? 0}</td>
                                                    </tr>
                                                ))}
                                                <tr className="bg-white/[0.02] font-medium">
                                                    <td className="px-3 py-2 text-gray-400">Total</td>
                                                    {buckets.map((b) => (
                                                        <td key={b} className="px-2 py-2 text-right font-mono text-gray-400">{(preview.totals[b] ?? 0).toLocaleString()}</td>
                                                    ))}
                                                    <td className="px-3 py-2 text-right font-mono text-gray-300">{(preview.totals.assigned ?? 0).toLocaleString()}</td>
                                                </tr>
                                            </tbody>
                                        </table>
                                    </div>
                                    {mode === 'specific' && preview.agents.some((a) => a.in_pool === false && (a.assigned.total ?? 0) > 0) && (
                                        <p className="text-xs text-gray-500">
                                            Dimmed agents aren’t in your selected pool but still receive leads for contractors they already own — so a contractor is never split.
                                        </p>
                                    )}
                                </>
                            ) : null}
                        </>
                    )}
                </div>

                <div className="p-4 border-t border-white/[0.06] flex justify-end gap-2">
                    {step === 'choose' && (
                        <>
                            <button onClick={onClose} className="px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 border border-white/10 text-sm">Cancel</button>
                            <button onClick={goPreview} disabled={!canContinue}
                                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-purple-500/15 hover:bg-purple-500/25 text-purple-200 border border-purple-500/30 text-sm font-medium disabled:opacity-50">
                                Continue <ChevronRight size={14} />
                            </button>
                        </>
                    )}
                    {step === 'preview' && !done && (
                        <>
                            <button onClick={() => { setStep('choose'); setPreview(null); setError(null); }} disabled={running}
                                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 border border-white/10 text-sm disabled:opacity-50">
                                <ArrowLeft size={14} /> Back
                            </button>
                            {preview && preview.agents.length > 0 && (
                                <button onClick={apply} disabled={running || loading || ((preview.totals.assigned ?? 0) === 0)}
                                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-purple-500/15 hover:bg-purple-500/25 text-purple-200 border border-purple-500/30 text-sm font-medium disabled:opacity-50">
                                    {running ? <><Loader2 size={14} className="animate-spin" /> Distributing…</> : `Distribute ${(preview.totals.assigned ?? 0).toLocaleString()} permits`}
                                </button>
                            )}
                        </>
                    )}
                    {step === 'preview' && done && (
                        <button onClick={onDistributed} className="px-4 py-2 rounded-xl bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 border border-cyan-500/20 text-sm font-medium">Done</button>
                    )}
                </div>
            </motion.div>
        </motion.div>
    );
}

function CreateBankModal({ users, onClose, onCreated }: {
    users: UserRecord[];
    onClose: () => void;
    onCreated: () => void;
}) {
    const outreachUsers = users.filter((u) => u.role === 'outreach' || u.role === 'admin');
    const [name, setName] = useState('');
    const [agentId, setAgentId] = useState<number | ''>(outreachUsers[0]?.id ?? '');
    const [totalLeads, setTotalLeads] = useState(10000);
    const [weeklyTarget, setWeeklyTarget] = useState<number | ''>('');
    const [states, setStates] = useState<StateRow[]>([{ state_code: '', tier: 'A' }]);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const addState = () => setStates((s) => [...s, { state_code: '', tier: 'B' }]);
    const removeState = (i: number) => setStates((s) => s.filter((_, idx) => idx !== i));
    const updateState = (i: number, patch: Partial<StateRow>) =>
        setStates((s) => s.map((row, idx) => (idx === i ? { ...row, ...patch } : row)));

    const submit = async (e: FormEvent) => {
        e.preventDefault();
        if (!agentId) { setError('Select an agent'); return; }
        setSubmitting(true);
        setError(null);
        try {
            await apiService.createLeadBank({
                name: name.trim(),
                agent_user_id: agentId as number,
                total_leads: totalLeads,
                weekly_target: weeklyTarget === '' ? null : weeklyTarget,
                states: states
                    .filter((s) => s.state_code.trim().length === 2)
                    .map((s) => ({ state_code: s.state_code.toUpperCase(), tier: s.tier })),
            });
            onCreated();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to create bank');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
            onClick={onClose}
        >
            <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }}
                onClick={(e) => e.stopPropagation()}
                className="bg-[#1a1d2e] border border-white/10 rounded-2xl max-w-lg w-full mx-4 shadow-2xl max-h-[88vh] flex flex-col"
            >
                <div className="p-5 border-b border-white/[0.06] flex items-center justify-between">
                    <h2 className="text-lg font-semibold text-white">New Lead Bank</h2>
                    <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/[0.06] text-gray-400 hover:text-white"><X size={18} /></button>
                </div>

                <form onSubmit={submit} className="flex-1 overflow-y-auto p-5 space-y-4">
                    {error && (
                        <div className="flex items-center gap-2 rounded-xl border border-rose-500/20 bg-rose-500/10 px-3 py-2 text-sm text-rose-400">
                            <AlertCircle size={14} /> {error}
                        </div>
                    )}

                    <div>
                        <label className="text-[10px] uppercase tracking-widest text-gray-500">Bank name</label>
                        <input value={name} onChange={(e) => setName(e.target.value)} required
                            placeholder="Bank A — Agent 1"
                            className="mt-1 w-full px-3 py-2 bg-white/[0.04] border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:border-cyan-500/50" />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="text-[10px] uppercase tracking-widest text-gray-500">Agent</label>
                            <select value={agentId} onChange={(e) => setAgentId(e.target.value ? Number(e.target.value) : '')}
                                className="mt-1 w-full px-3 py-2 bg-white/[0.04] border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:border-cyan-500/50">
                                <option value="">Select…</option>
                                {outreachUsers.map((u) => (
                                    <option key={u.id} value={u.id}>{u.full_name || u.email}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="text-[10px] uppercase tracking-widest text-gray-500">Quota (leads/mo)</label>
                            <input type="number" min={1} value={totalLeads} onChange={(e) => setTotalLeads(Number(e.target.value))}
                                className="mt-1 w-full px-3 py-2 bg-white/[0.04] border border-white/10 rounded-lg text-white text-sm font-mono focus:outline-none focus:border-cyan-500/50" />
                        </div>
                    </div>

                    <div>
                        <label className="text-[10px] uppercase tracking-widest text-gray-500">Weekly target (optional)</label>
                        <input type="number" min={0} value={weeklyTarget} onChange={(e) => setWeeklyTarget(e.target.value ? Number(e.target.value) : '')}
                            className="mt-1 w-full px-3 py-2 bg-white/[0.04] border border-white/10 rounded-lg text-white text-sm font-mono focus:outline-none focus:border-cyan-500/50" />
                    </div>

                    <div>
                        <div className="flex items-center justify-between">
                            <label className="text-[10px] uppercase tracking-widest text-gray-500">Assigned states</label>
                            <button type="button" onClick={addState} className="inline-flex items-center gap-1 text-xs text-cyan-400 hover:text-cyan-300">
                                <Plus size={12} /> Add
                            </button>
                        </div>
                        <div className="mt-2 space-y-2">
                            {states.map((s, i) => (
                                <div key={i} className="flex items-center gap-2">
                                    <input value={s.state_code} maxLength={2} placeholder="TX"
                                        onChange={(e) => updateState(i, { state_code: e.target.value.toUpperCase() })}
                                        className="w-20 px-2 py-1.5 bg-white/[0.04] border border-white/10 rounded-lg text-white text-sm font-mono uppercase focus:outline-none focus:border-cyan-500/50" />
                                    <select value={s.tier} onChange={(e) => updateState(i, { tier: e.target.value })}
                                        className="px-2 py-1.5 bg-white/[0.04] border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:border-cyan-500/50">
                                        {TIERS.map((t) => <option key={t} value={t}>Tier {t}</option>)}
                                    </select>
                                    {states.length > 1 && (
                                        <button type="button" onClick={() => removeState(i)} className="p-1.5 rounded-lg hover:bg-white/[0.06] text-gray-500 hover:text-rose-400">
                                            <X size={14} />
                                        </button>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                </form>

                <div className="p-4 border-t border-white/[0.06] flex justify-end gap-2">
                    <button onClick={onClose} className="px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 border border-white/10 text-sm">Cancel</button>
                    <button onClick={submit} disabled={submitting}
                        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 border border-cyan-500/20 text-sm font-medium disabled:opacity-50">
                        {submitting ? <><Loader2 size={14} className="animate-spin" /> Creating…</> : 'Create bank'}
                    </button>
                </div>
            </motion.div>
        </motion.div>
    );
}
