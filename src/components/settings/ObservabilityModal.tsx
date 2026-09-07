'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    X,
    Activity,
    Zap,
    CheckCircle2,
    AlertCircle,
    ChevronDown,
    ChevronUp,
    ArrowRight,
    ArrowLeft,
} from 'lucide-react';
import { apiService, AgentRun } from '@/services/api';

interface ObservabilityModalProps {
    agentId: string;
    displayName: string;
    onClose: () => void;
}

function formatTokens(n: number): string {
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
    if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
    return String(n);
}

// Backend timestamps are serialized from naive UTC datetimes (datetime.utcnow(),
// no tzinfo) via Python's isoformat(), which produces a string with NO "Z" or
// offset suffix (e.g. "2026-07-19T20:50:59.040313"). JavaScript's Date parser
// treats a timezone-less ISO string as LOCAL time, not UTC -- silently
// shifting every timestamp by the viewer's own UTC offset. Append "Z" only
// when the string genuinely has no timezone marker already, so this is a
// no-op for any timestamp that's already correctly offset-qualified.
function parseUtcTimestamp(iso: string): Date {
    const hasTimezone = /[Zz]|[+-]\d{2}:?\d{2}$/.test(iso);
    return new Date(hasTimezone ? iso : `${iso}Z`);
}

function relativeTime(iso: string | null): string {
    if (!iso) return '—';
    const diffMs = Date.now() - parseUtcTimestamp(iso).getTime();
    const mins = Math.round(diffMs / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.round(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    return `${Math.round(hours / 24)}d ago`;
}

function formatDate(iso: string | null): string {
    if (!iso) return '—';
    return parseUtcTimestamp(iso).toLocaleDateString('en-US', {
        month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit',
    });
}

export default function ObservabilityModal({ agentId, displayName, onClose }: ObservabilityModalProps) {
    const [runs, setRuns] = useState<AgentRun[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [expandedId, setExpandedId] = useState<string | null>(null);

    const load = useCallback(async () => {
        setIsLoading(true);
        try {
            const result = await apiService.getAgentRuns(agentId, 50);
            setRuns(result);
        } catch {
            setRuns([]);
        } finally {
            setIsLoading(false);
        }
    }, [agentId]);

    useEffect(() => {
        load();
    }, [load]);

    useEffect(() => {
        const onKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', onKeyDown);
        return () => window.removeEventListener('keydown', onKeyDown);
    }, [onClose]);

    const totalTokens = runs.reduce((sum, r) => sum + (r.total_tokens || 0), 0);
    const successCount = runs.filter(r => r.success).length;

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
            onClick={onClose}
        >
            <motion.div
                initial={{ opacity: 0, scale: 0.97, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.97, y: 10 }}
                transition={{ type: 'spring', stiffness: 400, damping: 35 }}
                onClick={(e) => e.stopPropagation()}
                className="w-full max-w-4xl h-[88vh] rounded-2xl border border-gray-200 dark:border-white/8 bg-[var(--bg-primary)] shadow-2xl flex flex-col overflow-hidden"
            >
                {/* Header */}
                <div className="shrink-0 border-b border-gray-200 dark:border-white/6 px-6 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-cyan-500 flex items-center justify-center">
                            <Activity size={20} className="text-white" />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-gray-900 dark:text-white">Recent Runs</h2>
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                                <span className="text-cyan-400">{displayName}</span>
                                <span className="ml-2 text-gray-500">· last {runs.length} of up to 50 retained</span>
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2.5 rounded-xl bg-gray-100 dark:bg-white/4 hover:bg-gray-200 dark:hover:bg-white/8 border border-gray-200 dark:border-white/6 transition-all"
                        title="Close"
                        aria-label="Close observability panel"
                    >
                        <X size={16} />
                    </button>
                </div>

                {/* Aggregate strip */}
                {!isLoading && runs.length > 0 && (
                    <div className="shrink-0 px-6 py-3 border-b border-gray-200 dark:border-white/6 flex items-center gap-6 text-xs font-mono tabular-nums text-gray-500 dark:text-gray-400">
                        <span className="flex items-center gap-1.5"><Activity size={12} className="text-cyan-400" />{runs.length} runs shown</span>
                        <span className="flex items-center gap-1.5"><Zap size={12} className="text-yellow-400" />{formatTokens(totalTokens)} tokens</span>
                        <span className="flex items-center gap-1.5"><CheckCircle2 size={12} className="text-emerald-400" />{successCount}/{runs.length} succeeded</span>
                    </div>
                )}

                {/* Body */}
                <div className="flex-1 min-h-0 overflow-y-auto px-6 py-4 space-y-2">
                    {isLoading ? (
                        <div className="h-full flex items-center justify-center">
                            <motion.div
                                animate={{ rotate: 360 }}
                                transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
                                className="w-8 h-8 border-2 border-cyan-500/20 border-t-cyan-500 rounded-full"
                            />
                        </div>
                    ) : runs.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center text-center text-gray-500">
                            <Activity size={40} className="mb-3 opacity-30" />
                            <p>No runs recorded yet.</p>
                            <p className="text-xs mt-1">This agent&apos;s next call will show up here.</p>
                        </div>
                    ) : (
                        runs.map((run) => {
                            const isOpen = expandedId === run.id;
                            return (
                                <div
                                    key={run.id}
                                    className={`rounded-xl border transition-colors ${isOpen
                                        ? 'border-cyan-500/30 bg-cyan-500/[0.03]'
                                        : 'border-gray-200 dark:border-white/6 bg-black/2 dark:bg-white/2 hover:border-gray-300 dark:hover:border-white/12'
                                        }`}
                                >
                                    <button
                                        onClick={() => setExpandedId(isOpen ? null : run.id)}
                                        className="w-full flex items-center justify-between px-4 py-3 text-left"
                                    >
                                        <div className="flex items-center gap-3 min-w-0">
                                            {run.success ? (
                                                <CheckCircle2 size={14} className="text-emerald-400 shrink-0" />
                                            ) : (
                                                <AlertCircle size={14} className="text-red-400 shrink-0" />
                                            )}
                                            <span className="text-xs font-mono tabular-nums text-gray-500 shrink-0">{formatDate(run.created_at)}</span>
                                            {run.context_label && (
                                                <span className="text-xs text-gray-600 dark:text-gray-400 truncate">{run.context_label}</span>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-4 text-xs font-mono tabular-nums text-gray-500 shrink-0">
                                            {run.total_tokens != null && <span>{formatTokens(run.total_tokens)} tok</span>}
                                            {run.latency_ms != null && <span>{Math.round(run.latency_ms)}ms</span>}
                                            {isOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                                        </div>
                                    </button>

                                    <AnimatePresence>
                                        {isOpen && (
                                            <motion.div
                                                initial={{ height: 0, opacity: 0 }}
                                                animate={{ height: 'auto', opacity: 1 }}
                                                exit={{ height: 0, opacity: 0 }}
                                                transition={{ duration: 0.2 }}
                                                className="overflow-hidden"
                                            >
                                                <div className="px-4 pb-4 space-y-3">
                                                    <div className="flex flex-wrap items-center gap-3 text-[11px] text-gray-500">
                                                        {run.model && <span className="px-2 py-0.5 rounded-full bg-black/4 dark:bg-white/4 font-mono">{run.model}</span>}
                                                        {run.temperature != null && <span>temp {run.temperature}</span>}
                                                        {run.input_tokens != null && <span>{run.input_tokens} in</span>}
                                                        {run.output_tokens != null && <span>{run.output_tokens} out</span>}
                                                    </div>

                                                    {run.error && (
                                                        <div className="text-xs text-red-400 bg-red-500/5 border border-red-500/20 rounded-lg px-3 py-2">
                                                            {run.error}
                                                        </div>
                                                    )}

                                                    <div>
                                                        <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-widest text-gray-500 mb-1.5">
                                                            <ArrowRight size={11} className="text-cyan-400" />
                                                            Input
                                                        </div>
                                                        <pre className="max-h-64 overflow-auto rounded-lg border border-gray-200 dark:border-white/6 bg-black/2 dark:bg-white/2 p-3 text-xs font-mono text-gray-600 dark:text-gray-300 whitespace-pre-wrap break-words">
                                                            {run.input_content || '(no input captured)'}
                                                        </pre>
                                                    </div>

                                                    <div>
                                                        <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-widest text-gray-500 mb-1.5">
                                                            <ArrowLeft size={11} className="text-purple-400" />
                                                            Output
                                                        </div>
                                                        <pre className="max-h-64 overflow-auto rounded-lg border border-gray-200 dark:border-white/6 bg-black/2 dark:bg-white/2 p-3 text-xs font-mono text-gray-600 dark:text-gray-300 whitespace-pre-wrap break-words">
                                                            {run.output_content || '(no output captured)'}
                                                        </pre>
                                                    </div>
                                                </div>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </div>
                            );
                        })
                    )}
                </div>
            </motion.div>
        </motion.div>
    );
}

export { relativeTime, formatTokens };
