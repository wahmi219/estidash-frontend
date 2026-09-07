'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Gauge,
    Save,
    RotateCcw,
    Play,
    CheckCircle2,
    AlertCircle,
    History,
    RefreshCw,
    Clock,
    Users,
    Building2,
    Wrench,
    DollarSign,
    ShieldAlert,
    Layers,
    Ban,
    FlaskConical,
    ChevronDown,
    ChevronUp,
    ExternalLink,
} from 'lucide-react';
import { apiService } from '@/services/api';
import type { ScoringRubricDetail, ScoringStats, SampleScoreResult, CostEstimateStats } from '@/types';

type Status = 'idle' | 'saving' | 'saved' | 'error';

// Deep-set a value at a dotted/array path on a cloned object.
function setByPath(obj: Record<string, unknown>, path: (string | number)[], value: unknown): Record<string, unknown> {
    const next = structuredClone(obj);
    let cur: Record<string, unknown> = next as Record<string, unknown>;
    for (let i = 0; i < path.length - 1; i++) {
        cur = cur[path[i]] as Record<string, unknown>;
    }
    cur[path[path.length - 1]] = value;
    return next;
}

const BUCKET_COLORS: Record<string, string> = {
    strategic: 'text-emerald-400 bg-emerald-500/15',
    strong: 'text-cyan-400 bg-cyan-500/15',
    core: 'text-blue-400 bg-blue-500/15',
    opportunistic: 'text-amber-400 bg-amber-500/15',
    no_send: 'text-gray-400 bg-gray-500/15',
};

// Small numeric input used throughout the editor.
function NumField({ value, onChange, step = 1, width = 'w-20' }: {
    value: number | null | undefined;
    onChange: (v: number) => void;
    step?: number;
    width?: string;
}) {
    return (
        <input
            type="number"
            step={step}
            value={value ?? 0}
            onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
            className={`${width} px-2.5 py-1.5 rounded-lg bg-black/4 dark:bg-white/5 border border-gray-200 dark:border-white/10 text-gray-800 dark:text-gray-100 text-sm font-mono tabular-nums focus:border-cyan-500/50 focus:outline-none`}
        />
    );
}

function SectionCard({ icon, title, cap, children }: {
    icon: React.ReactNode; title: string; cap?: string; children: React.ReactNode;
}) {
    return (
        <div className="rounded-2xl border border-gray-200 dark:border-white/8 bg-black/2 dark:bg-white/2 overflow-hidden">
            <div className="px-5 py-3.5 border-b border-gray-200 dark:border-white/6 flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-linear-to-br from-cyan-500/20 to-purple-500/20 flex items-center justify-center">
                    {icon}
                </div>
                <h2 className="text-sm font-semibold text-gray-900 dark:text-white flex-1">{title}</h2>
                {cap && <span className="text-[10px] uppercase tracking-widest text-gray-500 font-mono">{cap}</span>}
            </div>
            <div className="px-5 py-4 space-y-3">{children}</div>
        </div>
    );
}

const Row = ({ label, children }: { label: string; children: React.ReactNode }) => (
    <div className="flex items-center justify-between gap-4">
        <span className="text-sm text-gray-600 dark:text-gray-300">{label}</span>
        <div className="flex items-center gap-2">{children}</div>
    </div>
);

const SECTION_KEYS = [
    { key: 'timing', short: 'T' },
    { key: 'project_complexity', short: 'C' },
    { key: 'trade_scope', short: 'Tr' },
    { key: 'contractor_contact', short: 'Co' },
    { key: 'valuation', short: 'V' },
    { key: 'site_context', short: 'S' },
];

// Step 1 of the workflow: AI-fill missing costs (DB-grounded), then re-score.
// Self-contained — manages its own stats / run / poll so it doesn't entangle the
// rubric editor state.
function CostBackfillCard() {
    const [stats, setStats] = useState<CostEstimateStats | null>(null);
    const [loading, setLoading] = useState(true);
    const [running, setRunning] = useState(false);
    const [msg, setMsg] = useState<string | null>(null);
    const [minScore, setMinScore] = useState(30);
    const [concurrency, setConcurrency] = useState(6);
    const [maxTotal, setMaxTotal] = useState<number | ''>('');
    const [showOpts, setShowOpts] = useState(false);

    const load = useCallback(async () => {
        try { setStats(await apiService.getCostEstimateStats()); } catch { /* ignore */ }
        finally { setLoading(false); }
    }, []);
    useEffect(() => { load(); }, [load]);

    const run = async () => {
        setRunning(true); setMsg(null);
        try {
            const res = await apiService.runBulkCostEstimation({
                min_lead_score: minScore,
                concurrency,
                max_total: typeof maxTotal === 'number' && maxTotal > 0 ? maxTotal : 200000,
            });
            setMsg(res.message);
            // Poll until the run clears or progress stalls (long backfills run for
            // hours in the background regardless of this poll).
            let prev = -1; let stalled = 0;
            for (let i = 0; i < 360; i++) {
                await new Promise((r) => setTimeout(r, 5000));
                let s: CostEstimateStats | null = null;
                try { s = await apiService.getCostEstimateStats(); setStats(s); } catch { /* ignore */ }
                if (!s) continue;
                if (!s.running) { setMsg('Cost estimation finished.'); break; }
                if (s.remaining_unestimated === prev) {
                    stalled += 1;
                    if (stalled >= 6) { setMsg('Still running in the background — refresh later to see progress.'); break; }
                } else { stalled = 0; prev = s.remaining_unestimated; }
            }
        } catch (e) {
            setMsg((e as { message?: string })?.message || 'Failed to start cost estimation.');
        } finally { setRunning(false); }
    };

    const busy = running || !!stats?.running;

    return (
        <div className="mb-6 rounded-2xl border border-gray-200 dark:border-white/8 bg-black/2 dark:bg-white/2 p-5">
            <div className="flex items-center justify-between gap-4 flex-wrap">
                <div>
                    <h2 className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-1.5">
                        <DollarSign size={15} className="text-emerald-400" /> Step 1 · Fill missing costs (AI)
                    </h2>
                    <p className="text-xs text-gray-500">
                        Estimates cost for permits missing one — grounded on similar permits in our DB — and
                        re-scores each one inline (no separate re-score needed). Targets non-excluded permits
                        scoring ≥ {minScore}.
                        {stats
                            ? <> {stats.ai_estimated_count.toLocaleString()} AI-estimated · {stats.remaining_unestimated.toLocaleString()} still missing of {stats.missing_real_cost.toLocaleString()} no-cost permits.</>
                            : loading && <span className="text-gray-600"> Loading…</span>}
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <button onClick={() => setShowOpts((v) => !v)}
                        className="px-3 py-2 rounded-xl text-xs font-medium flex items-center gap-1.5 bg-black/4 dark:bg-white/5 border border-gray-200 dark:border-white/10 text-gray-500 hover:border-gray-400 dark:hover:border-white/20">
                        {showOpts ? <ChevronUp size={12} /> : <ChevronDown size={12} />} Options
                    </button>
                    <button onClick={run} disabled={busy}
                        className="px-4 py-2 rounded-xl text-sm font-semibold flex items-center gap-2 bg-linear-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-white shadow-lg shadow-emerald-500/20 disabled:opacity-60">
                        {busy ? <RefreshCw size={14} className="animate-spin" /> : <Play size={14} />}
                        {busy ? 'Estimating…' : 'Fill costs now'}
                    </button>
                </div>
            </div>
            <AnimatePresence>
                {showOpts && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                        className="mt-3 pt-3 border-t border-gray-200 dark:border-white/6 flex items-center gap-4 flex-wrap text-xs text-gray-500">
                        <label className="flex items-center gap-2">
                            <span>Target score ≥</span>
                            <input type="number" min={0} max={100} value={minScore}
                                onChange={(e) => setMinScore(parseInt(e.target.value) || 0)}
                                className="w-16 px-2 py-1.5 rounded-lg bg-black/4 dark:bg-white/5 border border-gray-200 dark:border-white/10 text-gray-800 dark:text-gray-100 font-mono tabular-nums focus:border-emerald-500/50 focus:outline-none" />
                        </label>
                        <label className="flex items-center gap-2">
                            <span>Concurrency</span>
                            <input type="number" min={1} max={12} value={concurrency}
                                onChange={(e) => setConcurrency(Math.min(12, Math.max(1, parseInt(e.target.value) || 1)))}
                                className="w-16 px-2 py-1.5 rounded-lg bg-black/4 dark:bg-white/5 border border-gray-200 dark:border-white/10 text-gray-800 dark:text-gray-100 font-mono tabular-nums focus:border-emerald-500/50 focus:outline-none" />
                        </label>
                        <label className="flex items-center gap-2">
                            <span>Max this run</span>
                            <input type="number" min={1} placeholder="all" value={maxTotal}
                                onChange={(e) => setMaxTotal(e.target.value === '' ? '' : parseInt(e.target.value) || '')}
                                className="w-24 px-2 py-1.5 rounded-lg bg-black/4 dark:bg-white/5 border border-gray-200 dark:border-white/10 text-gray-800 dark:text-gray-100 font-mono tabular-nums focus:border-emerald-500/50 focus:outline-none placeholder-gray-500" />
                        </label>
                    </motion.div>
                )}
            </AnimatePresence>
            {msg && <p className="mt-2 text-xs text-gray-500">{msg}</p>}
        </div>
    );
}

function SampleResultsTable({ results }: { results: SampleScoreResult[] }) {
    return (
        <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-white/8 max-h-[480px] overflow-y-auto">
            <table className="w-full text-sm border-collapse">
                <thead className="sticky top-0 z-10 bg-gray-100 dark:bg-gray-900">
                    <tr>
                        <th className="px-3 py-2 text-left text-[10px] uppercase tracking-widest text-gray-500 font-medium">Permit</th>
                        <th className="px-3 py-2 text-left text-[10px] uppercase tracking-widest text-gray-500 font-medium">Scope</th>
                        <th className="px-3 py-2 text-center text-[10px] uppercase tracking-widest text-gray-500 font-medium">Score</th>
                        <th className="px-3 py-2 text-left text-[10px] uppercase tracking-widest text-gray-500 font-medium">Sections (T · C · Tr · Co · V · S)</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-white/5">
                    {results.map((r) => (
                        <tr key={r.permit_id} className="hover:bg-black/2 dark:hover:bg-white/2 transition-colors">
                            <td className="px-3 py-2 whitespace-nowrap">
                                {r.permit_number ? (
                                    <a href={`/dashboard/permits/${r.permit_id}`} target="_blank" rel="noreferrer"
                                        className="flex items-center gap-1 font-mono text-xs text-cyan-400 hover:text-cyan-300">
                                        {r.permit_number} <ExternalLink size={10} />
                                    </a>
                                ) : (
                                    <span className="font-mono text-xs text-gray-500">{r.permit_id.slice(0, 8)}…</span>
                                )}
                            </td>
                            <td className="px-3 py-2 max-w-[260px]">
                                <span className="text-xs text-gray-400 line-clamp-2 leading-snug">{r.work_description || '—'}</span>
                            </td>
                            <td className="px-3 py-2 text-center whitespace-nowrap">
                                {r.excluded ? (
                                    <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-red-500/15 text-red-400 uppercase tracking-wide">
                                        {r.exclude_reason?.replace(/_/g, ' ') ?? 'excluded'}
                                    </span>
                                ) : (
                                    <div className="flex flex-col items-center gap-0.5">
                                        <span className="font-mono font-bold text-white text-sm tabular-nums">{r.total}</span>
                                        <span className={`px-1.5 py-0.5 rounded text-[9px] font-semibold uppercase tracking-wide ${BUCKET_COLORS[r.bucket ?? ''] ?? 'text-gray-400 bg-gray-500/15'}`}>
                                            {r.bucket ?? '—'}
                                        </span>
                                    </div>
                                )}
                            </td>
                            <td className="px-3 py-2 whitespace-nowrap">
                                {r.excluded ? (
                                    <span className="text-xs text-gray-600">—</span>
                                ) : (
                                    <span className="font-mono text-xs text-gray-400 tabular-nums">
                                        {SECTION_KEYS.map(({ key, short }) => {
                                            const pts = r.sections[key]?.points ?? 0;
                                            return `${short}:${pts}`;
                                        }).join(' · ')}
                                    </span>
                                )}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

export default function PermitScoringPage() {
    const [rubric, setRubric] = useState<ScoringRubricDetail | null>(null);
    const [content, setContent] = useState<Record<string, any> | null>(null); // eslint-disable-line @typescript-eslint/no-explicit-any
    const [stats, setStats] = useState<ScoringStats | null>(null);
    const [versions, setVersions] = useState<ScoringRubricDetail[]>([]);
    const [showVersions, setShowVersions] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [statsLoading, setStatsLoading] = useState(true);
    const [status, setStatus] = useState<Status>('idle');
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const [running, setRunning] = useState(false);
    const [runMsg, setRunMsg] = useState<string | null>(null);
    const [runLimit, setRunLimit] = useState<number | ''>('');
    const [showAdvanced, setShowAdvanced] = useState(false);
    const [sampleN, setSampleN] = useState(50);
    const [sampleOnlyUnscored, setSampleOnlyUnscored] = useState(true);
    const [sampleRunning, setSampleRunning] = useState(false);
    const [sampleResults, setSampleResults] = useState<SampleScoreResult[] | null>(null);
    const [sampleError, setSampleError] = useState<string | null>(null);

    const dirty = !!content && !!rubric && JSON.stringify(content) !== JSON.stringify(rubric.content);

    // The rubric loads fast (cached); render the editor as soon as it arrives.
    const loadRubric = useCallback(async () => {
        try {
            const r = await apiService.getScoringRubric();
            setRubric(r);
            setContent(structuredClone(r.content));
        } catch (e) {
            console.error('Failed to load scoring rubric', e);
        } finally {
            setIsLoading(false);
        }
    }, []);

    // Stats are heavier (full-table aggregates) — load them in the background so
    // they never block the editor from rendering.
    const loadStats = useCallback(async (refresh = false) => {
        setStatsLoading(true);
        try {
            setStats(await apiService.getScoringStats(refresh));
        } catch (e) {
            console.error('Failed to load scoring stats', e);
        } finally {
            setStatsLoading(false);
        }
    }, []);

    useEffect(() => { loadRubric(); loadStats(); }, [loadRubric, loadStats]);

    const set = (path: (string | number)[], value: unknown) =>
        setContent((c) => (c ? setByPath(c, path, value) : c));

    const handleSave = async () => {
        if (!content) return;
        setStatus('saving'); setErrorMsg(null);
        try {
            const updated = await apiService.updateScoringRubric(content);
            setRubric(updated);
            setContent(structuredClone(updated.content));
            setStatus('saved');
            setTimeout(() => setStatus('idle'), 3000);
        } catch (e: unknown) {
            setStatus('error');
            const detail = (e as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
            setErrorMsg(detail || 'Failed to save rubric');
        }
    };

    const handleReset = async () => {
        if (!confirm('Reset the rubric to the default v5.0 values? This creates a new active version.')) return;
        setStatus('saving');
        try {
            const updated = await apiService.resetScoringRubric();
            setRubric(updated);
            setContent(structuredClone(updated.content));
            setStatus('saved');
            setTimeout(() => setStatus('idle'), 3000);
        } catch {
            setStatus('error');
            setErrorMsg('Failed to reset rubric');
        }
    };

    const handleSample = async () => {
        setSampleRunning(true); setSampleResults(null); setSampleError(null);
        try {
            const res = await apiService.scoreSample({ n: sampleN, only_unscored: sampleOnlyUnscored });
            setSampleResults(res.results);
        } catch {
            setSampleError('Sample scoring failed — check backend logs.');
        } finally {
            setSampleRunning(false);
        }
    };

    const handleRun = async () => {
        setRunning(true); setRunMsg(null);
        try {
            const res = await apiService.runPermitScoring({
                only_unscored: true,
                ...(runLimit !== '' ? { limit: runLimit } : {}),
            });
            setRunMsg(res.message);
            // Poll stats every 5s until the processed count reaches the total or
            // stops changing (job finished / stalled). Caps at ~20 min.
            let prevProcessed = -1;
            let stalledPolls = 0;
            for (let i = 0; i < 240; i++) {
                await new Promise((r) => setTimeout(r, 5000));
                let s: ScoringStats | null = null;
                try { s = await apiService.getScoringStats(true); setStats(s); } catch { /* ignore */ }
                if (!s) continue;
                const processed = s.scored + s.excluded;
                if (processed >= s.total_permits) { setRunMsg('Scoring complete.'); break; }
                if (processed === prevProcessed) {
                    stalledPolls += 1;
                    // ~45s of no movement → assume the run finished or stopped.
                    if (stalledPolls >= 9) { setRunMsg(`Scoring stopped at ${processed.toLocaleString()} of ${s.total_permits.toLocaleString()} — re-run to resume.`); break; }
                } else {
                    stalledPolls = 0;
                    prevProcessed = processed;
                }
            }
        } catch {
            setRunMsg('Failed to start scoring — check your role and try again.');
        } finally {
            setRunning(false);
        }
    };

    const openVersions = async () => {
        setShowVersions((v) => !v);
        if (versions.length === 0) {
            try { setVersions(await apiService.getScoringRubricVersions()); } catch { /* ignore */ }
        }
    };

    const activateVersion = async (id: string) => {
        try {
            const updated = await apiService.activateScoringRubricVersion(id);
            setRubric(updated);
            setContent(structuredClone(updated.content));
            setVersions(await apiService.getScoringRubricVersions());
        } catch { /* ignore */ }
    };

    if (isLoading || !content) {
        return (
            <div className="p-6 lg:p-8 flex items-center justify-center min-h-[60vh]">
                <motion.div animate={{ rotate: 360 }} transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
                    className="w-10 h-10 border-2 border-cyan-500/20 border-t-cyan-500 rounded-full" />
            </div>
        );
    }

    const capsSum = ['timing', 'project_complexity', 'trade_scope', 'contractor_contact', 'valuation', 'site_context']
        .reduce((acc, k) => acc + (content[k]?.max || 0), 0);
    const maxScore = content.max_score ?? 100;

    return (
        <div className="p-6 lg:p-8 max-w-6xl mx-auto">
            {/* Header */}
            <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
                <div className="flex items-start justify-between gap-4 flex-wrap">
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-xl bg-linear-to-br from-orange-500/20 to-red-500/20">
                            <Gauge className="w-6 h-6 text-orange-400" />
                        </div>
                        <div>
                            <h1 className="text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white">Permit Scoring</h1>
                            <p className="text-gray-500 dark:text-gray-400 text-sm">
                                Tune the lead-scoring rubric — changes apply on next scoring run, no redeploy.
                                <span className="ml-2 font-mono text-gray-400">v{rubric?.version ?? 0}</span>
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <button onClick={openVersions}
                            className="px-3 py-2 rounded-xl text-sm font-medium flex items-center gap-2 bg-black/4 dark:bg-white/5 border border-gray-200 dark:border-white/10 text-gray-600 dark:text-gray-300 hover:border-cyan-500/30">
                            <History size={14} /> History
                        </button>
                        <button onClick={handleReset}
                            className="px-3 py-2 rounded-xl text-sm font-medium flex items-center gap-2 bg-black/4 dark:bg-white/5 border border-gray-200 dark:border-white/10 text-gray-600 dark:text-gray-300 hover:border-amber-500/30">
                            <RotateCcw size={14} /> Reset
                        </button>
                        <button onClick={handleSave} disabled={!dirty || status === 'saving'}
                            className={`px-4 py-2 rounded-xl text-sm font-semibold flex items-center gap-2 transition-all ${dirty
                                ? 'bg-linear-to-r from-cyan-500 to-purple-600 hover:from-cyan-400 hover:to-purple-500 text-white shadow-lg shadow-cyan-500/20'
                                : 'bg-black/4 dark:bg-white/4 text-gray-500 cursor-not-allowed border border-gray-200 dark:border-white/6'}`}>
                            {status === 'saving' ? <RefreshCw size={14} className="animate-spin" /> : <Save size={14} />}
                            Save Version
                        </button>
                    </div>
                </div>

                {/* validity / status line */}
                <div className="mt-3 flex items-center gap-3 flex-wrap text-sm">
                    <span className={`px-2.5 py-1 rounded-lg font-mono ${capsSum === maxScore ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}>
                        Section caps: {capsSum} / {maxScore}
                    </span>
                    {capsSum !== maxScore && (
                        <span className="text-red-400 flex items-center gap-1"><AlertCircle size={13} /> Caps must sum to {maxScore} to save</span>
                    )}
                    <AnimatePresence>
                        {status === 'saved' && (
                            <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                                className="flex items-center gap-1.5 text-emerald-400"><CheckCircle2 size={14} /> Saved as new version</motion.span>
                        )}
                        {status === 'error' && (
                            <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                                className="flex items-center gap-1.5 text-red-400"><AlertCircle size={14} /> {errorMsg}</motion.span>
                        )}
                    </AnimatePresence>
                </div>
            </motion.div>

            {/* Version history */}
            <AnimatePresence>
                {showVersions && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                        className="mb-6 rounded-2xl border border-gray-200 dark:border-white/8 bg-black/2 dark:bg-white/2 overflow-hidden">
                        <div className="px-5 py-3 border-b border-gray-200 dark:border-white/6 text-sm font-semibold text-gray-900 dark:text-white">Version history</div>
                        <div className="divide-y divide-gray-200 dark:divide-white/6 max-h-64 overflow-y-auto">
                            {versions.map((v) => (
                                <div key={v.id} className="px-5 py-2.5 flex items-center justify-between text-sm">
                                    <div className="flex items-center gap-3">
                                        <span className="font-mono text-gray-400">v{v.version}</span>
                                        {v.is_active && <span className="text-[10px] uppercase tracking-widest text-emerald-400">Active</span>}
                                        <span className="text-gray-500">{v.created_by}</span>
                                        {v.notes && <span className="text-gray-500 italic truncate max-w-xs">{v.notes}</span>}
                                    </div>
                                    {!v.is_active && v.id && (
                                        <button onClick={() => activateVersion(v.id!)}
                                            className="px-2.5 py-1 rounded-lg text-xs bg-cyan-500/10 text-cyan-400 hover:bg-cyan-500/20">Activate</button>
                                    )}
                                </div>
                            ))}
                            {versions.length === 0 && <div className="px-5 py-4 text-gray-500 text-sm">No saved versions yet.</div>}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Step 1 — AI cost backfill (DB-grounded, re-scores inline) */}
            <CostBackfillCard />

            {/* Run + stats banner */}
            <div className="mb-6 rounded-2xl border border-gray-200 dark:border-white/8 bg-black/2 dark:bg-white/2 p-5">
                <div className="flex items-center justify-between gap-4 flex-wrap">
                    <div>
                        <h2 className="text-sm font-semibold text-gray-900 dark:text-white">Step 2 · Backfill / re-score</h2>
                        <p className="text-xs text-gray-500">
                            Permits are scored automatically on sync. Use this only to backfill existing
                            permits or re-score after a rubric change — it scores rows not yet on the active
                            rubric (v{stats?.rubric_version ?? rubric?.version ?? 0}).
                            {stats
                                ? <> {stats.scored.toLocaleString()} scored · {stats.excluded.toLocaleString()} excluded of {stats.total_permits.toLocaleString()} total.</>
                                : statsLoading && <span className="text-gray-600"> Loading totals…</span>}
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        <button onClick={() => setShowAdvanced((v) => !v)}
                            className="px-3 py-2 rounded-xl text-xs font-medium flex items-center gap-1.5 bg-black/4 dark:bg-white/5 border border-gray-200 dark:border-white/10 text-gray-500 hover:border-gray-400 dark:hover:border-white/20">
                            {showAdvanced ? <ChevronUp size={12} /> : <ChevronDown size={12} />} Options
                        </button>
                        <button onClick={handleRun} disabled={running || !!stats?.scoring_active}
                            className="px-4 py-2 rounded-xl text-sm font-semibold flex items-center gap-2 bg-linear-to-r from-orange-500 to-red-500 hover:from-orange-400 hover:to-red-400 text-white shadow-lg shadow-orange-500/20 disabled:opacity-60">
                            {(running || stats?.scoring_active) ? <RefreshCw size={14} className="animate-spin" /> : <Play size={14} />}
                            {(running || stats?.scoring_active) ? 'Scoring…' : 'Run scoring now'}
                        </button>
                    </div>
                </div>
                <AnimatePresence>
                    {showAdvanced && (
                        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                            className="mt-3 pt-3 border-t border-gray-200 dark:border-white/6 flex items-center gap-4 flex-wrap">
                            <label className="flex items-center gap-2 text-xs text-gray-500">
                                <span className="w-10 text-right">Limit</span>
                                <input
                                    type="number"
                                    min={1}
                                    placeholder="all"
                                    value={runLimit}
                                    onChange={(e) => setRunLimit(e.target.value === '' ? '' : parseInt(e.target.value) || '')}
                                    className="w-24 px-2.5 py-1.5 rounded-lg bg-black/4 dark:bg-white/5 border border-gray-200 dark:border-white/10 text-gray-800 dark:text-gray-100 text-sm font-mono tabular-nums focus:border-orange-500/50 focus:outline-none placeholder-gray-500"
                                />
                                <span className="text-gray-600">permits (leave blank to score all)</span>
                            </label>
                        </motion.div>
                    )}
                </AnimatePresence>
                {runMsg && <p className="mt-2 text-xs text-gray-500">{runMsg}</p>}
                {stats && (
                    <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
                        {content.buckets.map((b: { key: string; label: string }) => (
                            <div key={b.key} className={`px-3 py-2 rounded-xl ${BUCKET_COLORS[b.key] || 'bg-gray-500/10 text-gray-400'}`}>
                                <p className="text-[10px] uppercase tracking-widest opacity-80">{b.label}</p>
                                <p className="text-xl font-mono font-bold tabular-nums">{(stats.by_bucket[b.key] || 0).toLocaleString()}</p>
                            </div>
                        ))}
                    </div>
                )}
                {stats && Object.keys(stats.by_tier).length > 0 && (
                    <div className="mt-2 flex items-center gap-3 text-xs text-gray-500">
                        <span>Tiers:</span>
                        {Object.entries(stats.by_tier).map(([t, n]) => (
                            <span key={t} className="font-mono">Tier {t}: {n.toLocaleString()}</span>
                        ))}
                    </div>
                )}
            </div>

            {/* Test Sample panel */}
            <div className="mb-6 rounded-2xl border border-gray-200 dark:border-white/8 bg-black/2 dark:bg-white/2 overflow-hidden">
                <div className="px-5 py-3.5 border-b border-gray-200 dark:border-white/6 flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-linear-to-br from-purple-500/20 to-indigo-500/20 flex items-center justify-center">
                        <FlaskConical size={16} className="text-purple-400" />
                    </div>
                    <div className="flex-1">
                        <h2 className="text-sm font-semibold text-gray-900 dark:text-white">Test Sample — score without saving</h2>
                        <p className="text-xs text-gray-500 mt-0.5">Runs the active rubric against N recent permits in memory. No DB writes — instant feedback for rubric changes.</p>
                    </div>
                </div>
                <div className="px-5 py-4 space-y-4">
                    <div className="flex items-center gap-4 flex-wrap">
                        <label className="flex items-center gap-2 text-sm text-gray-500">
                            <span>Sample</span>
                            <input
                                type="number"
                                min={1}
                                max={500}
                                value={sampleN}
                                onChange={(e) => setSampleN(Math.min(500, Math.max(1, parseInt(e.target.value) || 1)))}
                                className="w-20 px-2.5 py-1.5 rounded-lg bg-black/4 dark:bg-white/5 border border-gray-200 dark:border-white/10 text-gray-800 dark:text-gray-100 text-sm font-mono tabular-nums focus:border-purple-500/50 focus:outline-none"
                            />
                            <span>permits</span>
                        </label>
                        <label className="flex items-center gap-2 text-sm text-gray-500 cursor-pointer select-none">
                            <input type="checkbox" checked={sampleOnlyUnscored}
                                onChange={(e) => setSampleOnlyUnscored(e.target.checked)}
                                className="w-4 h-4 accent-purple-500 rounded" />
                            Only unscored
                        </label>
                        <button onClick={handleSample} disabled={sampleRunning}
                            className="px-4 py-2 rounded-xl text-sm font-semibold flex items-center gap-2 bg-linear-to-r from-purple-500 to-indigo-600 hover:from-purple-400 hover:to-indigo-500 text-white shadow-lg shadow-purple-500/20 disabled:opacity-60">
                            {sampleRunning ? <RefreshCw size={14} className="animate-spin" /> : <FlaskConical size={14} />}
                            {sampleRunning ? 'Sampling…' : 'Run test sample'}
                        </button>
                        {sampleResults && (
                            <button onClick={() => setSampleResults(null)}
                                className="text-xs text-gray-500 hover:text-gray-300 underline underline-offset-2">
                                Clear
                            </button>
                        )}
                    </div>
                    {sampleError && <p className="text-xs text-red-400">{sampleError}</p>}
                    {sampleResults && <SampleResultsTable results={sampleResults} />}
                </div>
            </div>

            {/* Editor grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                {/* 01 Timing & Stage — bands carry base points; edit the base. */}
                <SectionCard icon={<Clock size={16} className="text-cyan-400" />} title="01 · Timing & Stage" cap={`/ ${content.timing?.max ?? 0}`}>
                    {Object.entries(content.timing?.bands || {}).map(([k, b]) => (
                        <Row key={k} label={(b as { label?: string }).label || k.replace(/_/g, ' ')}>
                            <NumField value={(b as { base?: number }).base} onChange={(v) => set(['timing', 'bands', k, 'base'], v)} />
                        </Row>
                    ))}
                    <div className="pt-2 border-t border-gray-200 dark:border-white/6 space-y-3">
                        <p className="text-[10px] uppercase tracking-widest text-gray-500">Modifiers (added on top)</p>
                        {Object.keys(content.timing?.modifiers || {}).map((k) => (
                            <Row key={k} label={k.replace(/_/g, ' ')}>
                                <NumField value={content.timing.modifiers[k]} onChange={(v) => set(['timing', 'modifiers', k], v)} />
                            </Row>
                        ))}
                    </div>
                    <Row label="Section cap"><NumField value={content.timing?.max} onChange={(v) => set(['timing', 'max'], v)} /></Row>
                </SectionCard>

                {/* 02 Project Complexity */}
                <SectionCard icon={<Building2 size={16} className="text-cyan-400" />} title="02 · Project Complexity" cap={`/ ${content.project_complexity?.max ?? 0}`}>
                    {(content.project_complexity?.rules || []).map((r: { key: string; base: number }, i: number) => (
                        <Row key={r.key} label={r.key.replace(/_/g, ' ')}>
                            <NumField value={r.base} onChange={(v) => set(['project_complexity', 'rules', i, 'base'], v)} />
                        </Row>
                    ))}
                    <Row label="Default (no match)"><NumField value={content.project_complexity?.default?.base} onChange={(v) => set(['project_complexity', 'default', 'base'], v)} /></Row>
                    <div className="pt-2 border-t border-gray-200 dark:border-white/6 space-y-3">
                        <p className="text-[10px] uppercase tracking-widest text-gray-500">Add-once modifiers</p>
                        {Object.entries(content.project_complexity?.modifiers || {}).map(([k, m]) => (
                            <Row key={k} label={k.replace(/_/g, ' ')}>
                                <NumField value={(m as { points?: number }).points} onChange={(v) => set(['project_complexity', 'modifiers', k, 'points'], v)} />
                            </Row>
                        ))}
                    </div>
                    <Row label="Section cap"><NumField value={content.project_complexity?.max} onChange={(v) => set(['project_complexity', 'max'], v)} /></Row>
                </SectionCard>

                {/* 03 Trade Scope Fit — by distinct strong-trade count */}
                <SectionCard icon={<Wrench size={16} className="text-cyan-400" />} title="03 · Trade Scope Fit" cap={`/ ${content.trade_scope?.max ?? 0}`}>
                    {Object.entries(content.trade_scope?.bands || {}).map(([k, b]) => (
                        <Row key={k} label={(b as { label?: string }).label || k.replace(/_/g, ' ')}>
                            <NumField value={(b as { base?: number }).base} onChange={(v) => set(['trade_scope', 'bands', k, 'base'], v)} />
                        </Row>
                    ))}
                    <Row label="Section cap"><NumField value={content.trade_scope?.max} onChange={(v) => set(['trade_scope', 'max'], v)} /></Row>
                </SectionCard>

                {/* 04 Contractor / Contact Data */}
                <SectionCard icon={<Users size={16} className="text-cyan-400" />} title="04 · Contractor / Contact" cap={`/ ${content.contractor_contact?.max ?? 0}`}>
                    {Object.entries(content.contractor_contact?.bands || {}).map(([k, b]) => (
                        <Row key={k} label={(b as { label?: string }).label || k.replace(/_/g, ' ')}>
                            <NumField value={(b as { base?: number }).base} onChange={(v) => set(['contractor_contact', 'bands', k, 'base'], v)} />
                        </Row>
                    ))}
                    <p className="text-xs text-gray-500 pt-1">Contact quality only — owner / homeowner score low but are never excluded.</p>
                    <Row label="Section cap"><NumField value={content.contractor_contact?.max} onChange={(v) => set(['contractor_contact', 'max'], v)} /></Row>
                </SectionCard>

                {/* 05 Valuation */}
                <SectionCard icon={<DollarSign size={16} className="text-cyan-400" />} title="05 · Valuation" cap={`/ ${content.valuation?.max ?? 0}`}>
                    {(content.valuation?.brackets || []).map((b: { label: string; base: number }, i: number) => (
                        <Row key={i} label={b.label}>
                            <NumField value={b.base} onChange={(v) => set(['valuation', 'brackets', i, 'base'], v)} />
                        </Row>
                    ))}
                    <Row label="Unknown valuation (fallback)"><NumField value={content.valuation?.unknown_points} onChange={(v) => set(['valuation', 'unknown_points'], v)} /></Row>
                    <Row label="Use AI cost fallback">
                        <input type="checkbox" checked={!!content.valuation?.use_ai_cost_fallback}
                            onChange={(e) => set(['valuation', 'use_ai_cost_fallback'], e.target.checked)}
                            className="w-4 h-4 accent-cyan-500" />
                    </Row>
                    <Row label="Min AI confidence">
                        <select value={content.valuation?.ai_cost_min_confidence}
                            onChange={(e) => set(['valuation', 'ai_cost_min_confidence'], e.target.value)}
                            className="px-2.5 py-1.5 rounded-lg bg-black/4 dark:bg-white/5 border border-gray-200 dark:border-white/10 text-sm text-gray-700 dark:text-gray-200">
                            <option value="low">low</option><option value="medium">medium</option><option value="high">high</option>
                        </select>
                    </Row>
                    <Row label="Section cap"><NumField value={content.valuation?.max} onChange={(v) => set(['valuation', 'max'], v)} /></Row>
                </SectionCard>

                {/* 06 Jurisdiction / Site Context */}
                <SectionCard icon={<ShieldAlert size={16} className="text-cyan-400" />} title="06 · Site Context" cap={`/ ${content.site_context?.max ?? 0}`}>
                    {(content.site_context?.rules || []).map((r: { key: string; label?: string; base: number; requires_verified_source?: boolean }, i: number) => (
                        <Row key={r.key} label={(r.label || r.key.replace(/_/g, ' ')) + (r.requires_verified_source ? ' (needs data)' : '')}>
                            <NumField value={r.base} onChange={(v) => set(['site_context', 'rules', i, 'base'], v)} />
                        </Row>
                    ))}
                    <Row label="Default (no signal)"><NumField value={content.site_context?.default?.base} onChange={(v) => set(['site_context', 'default', 'base'], v)} /></Row>
                    <Row label="Section cap"><NumField value={content.site_context?.max} onChange={(v) => set(['site_context', 'max'], v)} /></Row>
                </SectionCard>

                {/* Auto-excludes */}
                <SectionCard icon={<Ban size={16} className="text-red-400" />} title="Auto-Exclude Gates">
                    {Object.keys(content.excludes).map((k) => (
                        <Row key={k} label={k.replace(/_/g, ' ')}>
                            {'max_value' in content.excludes[k] && (
                                <NumField value={content.excludes[k].max_value} step={1000} width="w-28"
                                    onChange={(v) => set(['excludes', k, 'max_value'], v)} />
                            )}
                            <input type="checkbox" checked={!!content.excludes[k].enabled}
                                onChange={(e) => set(['excludes', k, 'enabled'], e.target.checked)}
                                className="w-4 h-4 accent-red-500" />
                        </Row>
                    ))}
                    <p className="text-xs text-gray-500 pt-1">Excluded permits are flagged and kept, but never assigned to agents.</p>
                </SectionCard>

                {/* Buckets + tiers */}
                <SectionCard icon={<Layers size={16} className="text-cyan-400" />} title="Score Buckets → Tiers">
                    {content.buckets.map((b: { key: string; label: string; min_score: number }, i: number) => (
                        <div key={b.key} className="flex items-center justify-between gap-3">
                            <span className={`text-sm px-2 py-0.5 rounded-md ${BUCKET_COLORS[b.key] || 'text-gray-400'}`}>{b.label}</span>
                            <div className="flex items-center gap-2">
                                <span className="text-xs text-gray-500">≥</span>
                                <NumField value={b.min_score} onChange={(v) => set(['buckets', i, 'min_score'], v)} />
                                <select value={content.bucket_tiers[b.key] ?? ''}
                                    onChange={(e) => set(['bucket_tiers', b.key], e.target.value || null)}
                                    className="px-2.5 py-1.5 rounded-lg bg-black/4 dark:bg-white/5 border border-gray-200 dark:border-white/10 text-sm text-gray-700 dark:text-gray-200">
                                    <option value="">—</option><option value="A">Tier A</option><option value="B">Tier B</option><option value="C">Tier C</option>
                                </select>
                            </div>
                        </div>
                    ))}
                    <p className="text-xs text-gray-500 pt-1">Buckets must stay ordered by descending cutoff. Tier drives the downstream lead-bank split.</p>
                </SectionCard>
            </div>
        </div>
    );
}
