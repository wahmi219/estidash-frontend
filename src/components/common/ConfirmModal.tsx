'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { AlertTriangle, X } from 'lucide-react';

interface ConfirmModalProps {
    title: string;
    /** What will happen -- described plainly, in full sentences. */
    consequences: React.ReactNode;
    /** Rough scale of what's affected, e.g. "1 relationship" or "~12,000 permits". Optional. */
    affectedEstimate?: string;
    /** When set, the confirming action requires a non-empty reason and it is passed to onConfirm. */
    requireReason?: boolean;
    reasonLabel?: string;
    confirmLabel?: string;
    confirmVariant?: 'danger' | 'primary';
    onCancel: () => void;
    onConfirm: (reason?: string) => void | Promise<void>;
}

/**
 * Phase 11.7 (Workstream E/H) -- the shared, in-app replacement for a
 * native window.confirm() on any high-impact action (Lead Bank archive,
 * Settings Reset/Save Version/Fill costs/Run scoring, etc.). A native
 * confirm() blocks the whole tab and, per the Phase 11 Controlled
 * Functional Workflow Test, can wedge automated/remote browser control
 * entirely -- this renders as normal DOM, never blocks the event loop,
 * and always shows what will actually happen, not just "Are you sure?".
 */
export default function ConfirmModal({
    title, consequences, affectedEstimate, requireReason = false, reasonLabel = 'Reason',
    confirmLabel = 'Confirm', confirmVariant = 'danger', onCancel, onConfirm,
}: ConfirmModalProps) {
    const [reason, setReason] = useState('');
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const canConfirm = !requireReason || reason.trim().length > 0;

    const handleConfirm = async () => {
        if (!canConfirm || busy) return;
        setBusy(true);
        setError(null);
        try {
            await onConfirm(requireReason ? reason.trim() : undefined);
        } catch {
            setError('The action failed. Nothing was changed.');
            setBusy(false);
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
            onClick={busy ? undefined : onCancel}
        >
            <motion.div
                initial={{ opacity: 0, scale: 0.97, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ type: 'spring', stiffness: 400, damping: 35 }}
                onClick={(e) => e.stopPropagation()}
                className="w-full max-w-md rounded-2xl border border-[#DFE6EE] bg-white shadow-2xl overflow-hidden"
            >
                <div className="px-6 py-4 border-b border-[#DFE6EE] flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-amber-50 border border-amber-200 flex items-center justify-center shrink-0">
                            <AlertTriangle size={16} className="text-amber-600" />
                        </div>
                        <h2 className="text-sm font-semibold text-[#0E2B5C]">{title}</h2>
                    </div>
                    <button onClick={onCancel} disabled={busy} className="text-[#5B6B7D] hover:text-[#0E2B5C] disabled:opacity-40">
                        <X size={18} />
                    </button>
                </div>

                <div className="px-6 py-4 space-y-3">
                    <div className="text-sm text-[#5B6B7D]">{consequences}</div>
                    {affectedEstimate && (
                        <div className="text-xs text-[#0E2B5C] bg-[#F7F9FB] border border-[#DFE6EE] rounded-lg px-3 py-2">
                            Affects approximately: <span className="font-semibold">{affectedEstimate}</span>
                        </div>
                    )}
                    {requireReason && (
                        <div>
                            <label className="block text-[11px] uppercase tracking-wide text-[#5B6B7D] font-medium mb-1">{reasonLabel}</label>
                            <textarea
                                value={reason}
                                onChange={(e) => setReason(e.target.value)}
                                disabled={busy}
                                rows={3}
                                className="w-full text-sm border border-[#DFE6EE] rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#00458B]/30"
                                placeholder="Required — explain why"
                            />
                        </div>
                    )}
                    {error && <p className="text-xs text-red-600">{error}</p>}
                </div>

                <div className="px-6 py-4 border-t border-[#DFE6EE] flex items-center justify-end gap-2">
                    <button
                        onClick={onCancel}
                        disabled={busy}
                        className="px-3 py-1.5 text-sm text-[#5B6B7D] hover:text-[#0E2B5C] rounded-lg disabled:opacity-40"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleConfirm}
                        disabled={!canConfirm || busy}
                        className={`px-4 py-1.5 text-sm font-medium rounded-lg text-white disabled:opacity-50 ${
                            confirmVariant === 'danger' ? 'bg-red-600 hover:bg-red-700' : 'bg-[#00458B] hover:bg-[#045CB4]'
                        }`}
                    >
                        {busy ? 'Working…' : confirmLabel}
                    </button>
                </div>
            </motion.div>
        </motion.div>
    );
}
