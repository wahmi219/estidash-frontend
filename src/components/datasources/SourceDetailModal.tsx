'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { X, RefreshCw, Database, Clock, History, AlertCircle } from 'lucide-react';
import { apiService } from '@/services/api';
import type { DataSourceDetail } from '@/types';
import HealthBadge from './HealthBadge';
import { formatDateTime, formatDateOnly, formatDuration, relativeTime } from './dateUtils';

interface SourceDetailModalProps {
    agencyId: string;
    onClose: () => void;
    onRunSyncTriggered?: () => void;
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
    return (
        <div>
            <p className="text-[10px] uppercase tracking-wider text-[#5B6B7D] font-medium">{label}</p>
            <p className="text-sm text-[#0E2B5C] font-medium mt-0.5">{value}</p>
        </div>
    );
}

export default function SourceDetailModal({ agencyId, onClose, onRunSyncTriggered }: SourceDetailModalProps) {
    const [detail, setDetail] = useState<DataSourceDetail | null>(null);
    const [loading, setLoading] = useState(true);
    const [running, setRunning] = useState(false);
    const [runMsg, setRunMsg] = useState<string | null>(null);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const d = await apiService.getDataSourceDetail(agencyId);
            setDetail(d);
        } catch {
            setDetail(null);
        } finally {
            setLoading(false);
        }
    }, [agencyId]);

    useEffect(() => { load(); }, [load]);

    useEffect(() => {
        const onKeyDown = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
        window.addEventListener('keydown', onKeyDown);
        return () => window.removeEventListener('keydown', onKeyDown);
    }, [onClose]);

    const handleRunSync = async () => {
        if (!detail) return;
        setRunning(true);
        setRunMsg(null);
        try {
            const r = await apiService.syncPermits(detail.city_key, true);
            setRunMsg(r.status === 'started' || r.status === 'success' ? 'Sync started' : `Sync: ${r.status}`);
            onRunSyncTriggered?.();
            setTimeout(load, 1500);
        } catch (err: unknown) {
            const d = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
            setRunMsg(d ? `Failed: ${d}` : 'Failed to start sync');
        } finally {
            setRunning(false);
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
            onClick={onClose}
        >
            <motion.div
                initial={{ opacity: 0, scale: 0.97, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ type: 'spring', stiffness: 400, damping: 35 }}
                onClick={(e) => e.stopPropagation()}
                className="w-full max-w-3xl max-h-[88vh] rounded-2xl border border-[#DFE6EE] bg-white shadow-2xl flex flex-col overflow-hidden"
            >
                {/* Header */}
                <div className="shrink-0 border-b border-[#DFE6EE] px-6 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-[#F7F9FB] border border-[#DFE6EE] flex items-center justify-center">
                            <Database size={18} className="text-[#00458B]" />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-[#0E2B5C]">{detail?.source ?? 'Loading…'}</h2>
                            <p className="text-xs text-[#5B6B7D]">{detail?.connector} · {detail?.city_key}</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-lg bg-[#F7F9FB] hover:bg-[#DFE6EE] border border-[#DFE6EE] transition-colors"
                        aria-label="Close"
                    >
                        <X size={16} className="text-[#5B6B7D]" />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
                    {loading && <p className="text-sm text-[#5B6B7D] py-8 text-center">Loading source detail…</p>}

                    {!loading && !detail && (
                        <p className="text-sm text-red-600 py-8 text-center">Could not load this source.</p>
                    )}

                    {!loading && detail && (
                        <>
                            {/* Status strip */}
                            <div className="flex items-center gap-3 flex-wrap">
                                <HealthBadge health={detail.health} title={detail.health_reason} />
                                {!detail.enabled && (
                                    <span className="text-xs text-[#5B6B7D]">
                                        Disabled{detail.disabled_reason ? ` — ${detail.disabled_reason}` : ''}
                                    </span>
                                )}
                                {detail.currently_running && (
                                    <span className="inline-flex items-center gap-1 text-xs text-[#00458B]">
                                        <RefreshCw size={12} className="animate-spin" /> Sync in progress
                                    </span>
                                )}
                            </div>
                            <p className="text-xs text-[#5B6B7D] -mt-4">{detail.health_reason}</p>

                            {/* Core fields */}
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 bg-[#F7F9FB] border border-[#DFE6EE] rounded-lg p-4">
                                <Field label="City / County" value={detail.source} />
                                <Field label="State" value={detail.state || '—'} />
                                <Field label="Connector" value={detail.connector} />
                                <Field label="Cadence" value={`${detail.cadence_minutes} min`} />
                                <Field label="Lookback" value={`${detail.lookback_hours}h`} />
                                <Field label="Records" value={detail.records.toLocaleString()} />
                                <Field label="Last Attempt" value={relativeTime(detail.last_success ?? null) === 'Never' ? '—' : formatDateTime(detail.last_success)} />
                                <Field label="Last Success" value={formatDateTime(detail.last_success)} />
                                <Field label="Next Sync" value={formatDateTime(detail.next_sync)} />
                                <Field label="Latest Permit" value={formatDateOnly(detail.latest_permit)} />
                                <Field label="Watermark" value={detail.watermark ? formatDateTime(detail.watermark) : '—'} />
                                <Field label="Consecutive Failures" value={detail.consecutive_failure_count} />
                            </div>

                            {detail.last_error_summary && (
                                <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-lg p-3">
                                    <AlertCircle size={14} className="text-red-600 mt-0.5 shrink-0" />
                                    <p className="text-xs text-red-700 break-words">{detail.last_error_summary}</p>
                                </div>
                            )}

                            {/* Run Sync — reuses the existing, already admin-gated
                                POST /permits/sync/{city} endpoint. No new write
                                path introduced here. */}
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={handleRunSync}
                                    disabled={running || !detail.enabled}
                                    title={!detail.enabled ? 'Source is disabled' : undefined}
                                    className="flex items-center gap-2 px-3 py-2 bg-[#00458B] hover:bg-[#045CB4] disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-lg text-sm font-medium transition-colors"
                                >
                                    {running ? <RefreshCw size={14} className="animate-spin" /> : <RefreshCw size={14} />}
                                    Run Sync
                                </button>
                                {runMsg && <span className="text-xs text-[#5B6B7D]">{runMsg}</span>}
                            </div>

                            {/* Recent sync history */}
                            <div>
                                <div className="flex items-center gap-2 mb-2">
                                    <History size={14} className="text-[#00458B]" />
                                    <h3 className="text-sm font-semibold text-[#0E2B5C]">Recent Sync History</h3>
                                </div>
                                {detail.recent_syncs.length === 0 ? (
                                    <p className="text-xs text-[#5B6B7D]">No sync attempts recorded yet.</p>
                                ) : (
                                    <div className="border border-[#DFE6EE] rounded-lg overflow-hidden">
                                        <div className="overflow-x-auto">
                                            <table className="w-full text-xs">
                                                <thead>
                                                    <tr className="bg-[#F7F9FB] text-left text-[10px] font-semibold text-[#5B6B7D] uppercase tracking-wider border-b border-[#DFE6EE]">
                                                        <th className="px-3 py-2">Started</th>
                                                        <th className="px-3 py-2">Status</th>
                                                        <th className="px-3 py-2 text-right">Fetched</th>
                                                        <th className="px-3 py-2 text-right">Inserted</th>
                                                        <th className="px-3 py-2 text-right">Updated</th>
                                                        <th className="px-3 py-2 text-right">Skipped</th>
                                                        <th className="px-3 py-2 text-right">Failed</th>
                                                        <th className="px-3 py-2 text-right">Quarantined</th>
                                                        <th className="px-3 py-2 flex items-center gap-1"><Clock size={11} />Duration</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {detail.recent_syncs.map((s) => (
                                                        <tr key={s.id} className="border-b border-[#F0F3F7] last:border-0">
                                                            <td className="px-3 py-2 text-[#0E2B5C] whitespace-nowrap">{formatDateTime(s.started_at)}</td>
                                                            <td className="px-3 py-2">
                                                                <span className={
                                                                    s.status === 'success' ? 'text-emerald-700' :
                                                                    s.status === 'partial' ? 'text-amber-700' :
                                                                    s.status === 'running' ? 'text-[#00458B]' :
                                                                    'text-red-700'
                                                                }>
                                                                    {s.status}
                                                                </span>
                                                            </td>
                                                            <td className="px-3 py-2 text-right tabular-nums text-[#0E2B5C]">{s.records_fetched}</td>
                                                            <td className="px-3 py-2 text-right tabular-nums text-[#0E2B5C]">{s.records_inserted}</td>
                                                            <td className="px-3 py-2 text-right tabular-nums text-[#0E2B5C]">{s.records_updated}</td>
                                                            <td className="px-3 py-2 text-right tabular-nums text-[#0E2B5C]">{s.records_skipped}</td>
                                                            <td className="px-3 py-2 text-right tabular-nums text-[#0E2B5C]">{s.records_failed}</td>
                                                            <td className="px-3 py-2 text-right tabular-nums text-[#0E2B5C]">{s.records_quarantined}</td>
                                                            <td className="px-3 py-2 text-[#5B6B7D] whitespace-nowrap">{formatDuration(s.duration_seconds)}</td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                        {detail.recent_syncs.some(s => s.error_message) && (
                                            <div className="px-3 py-2 border-t border-[#DFE6EE] space-y-1">
                                                {detail.recent_syncs.filter(s => s.error_message).slice(0, 3).map(s => (
                                                    <p key={s.id} className="text-[11px] text-red-600 break-words">
                                                        {formatDateTime(s.started_at)}: {s.error_message}
                                                    </p>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </>
                    )}
                </div>
            </motion.div>
        </motion.div>
    );
}
