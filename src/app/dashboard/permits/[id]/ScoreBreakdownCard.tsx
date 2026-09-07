'use client';

import { Gauge, Ban } from 'lucide-react';
import type { PermitRecord } from '@/types';

// Category labels + the standard rubric maxes (Lead Scoring v5.0). The rubric
// endpoint is admin-only, so we show the standard caps here; they match the
// shipped defaults and only drift if a super admin retunes the caps.
// Master Scoring Rubric v5 — six categories summing to 100.
const CATEGORIES: { key: string; label: string; max: number }[] = [
    { key: 'timing', label: 'Timing & Stage', max: 25 },
    { key: 'project_complexity', label: 'Complexity', max: 25 },
    { key: 'trade_scope', label: 'Trade Scope', max: 15 },
    { key: 'contractor_contact', label: 'Contractor / Contact', max: 15 },
    { key: 'valuation', label: 'Valuation', max: 10 },
    { key: 'site_context', label: 'Site Context', max: 10 },
];

const BUCKET_LABEL: Record<string, string> = {
    strategic: 'Strategic',
    strong: 'Strong',
    core: 'Core',
    opportunistic: 'Opportunistic',
    no_send: 'No Send',
};

const BUCKET_COLOR: Record<string, string> = {
    strategic: 'text-emerald-400',
    strong: 'text-cyan-400',
    core: 'text-blue-400',
    opportunistic: 'text-amber-400',
    no_send: 'text-gray-400',
};

function Card({ children }: { children: React.ReactNode }) {
    return (
        <section className="rounded-2xl border border-white/[0.08] bg-gray-950/80 backdrop-blur-sm p-5">
            <div className="flex items-center gap-2 mb-4">
                <Gauge size={16} className="text-cyan-400" />
                <h3 className="text-sm font-semibold text-white">Score breakdown</h3>
            </div>
            {children}
        </section>
    );
}

export default function ScoreBreakdownCard({ permit }: { permit: PermitRecord }) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const bd = (permit.score_breakdown ?? null) as any;

    // Not scored yet.
    if (!bd && permit.lead_score == null && !permit.is_excluded) return null;

    // Excluded by a hard gate.
    if (permit.is_excluded || bd?.excluded) {
        const reason = (permit.exclude_reason || bd?.reason || 'excluded').replace(/_/g, ' ');
        return (
            <Card>
                <div className="flex items-center gap-2 rounded-xl border border-rose-500/20 bg-rose-500/10 px-3 py-3 text-sm text-rose-300">
                    <Ban size={15} className="shrink-0" />
                    <span>
                        <span className="font-medium">Excluded — {reason}.</span>{' '}
                        Excluded permits aren&apos;t scored or distributed to agents.
                    </span>
                </div>
            </Card>
        );
    }

    const sections = bd?.sections ?? {};
    const total = bd?.total ?? permit.lead_score ?? 0;
    const bucket = bd?.bucket ?? permit.score_bucket ?? '';

    return (
        <Card>
            {/* Total → bucket */}
            <div className="flex items-baseline justify-between mb-4">
                <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-mono font-bold text-white tabular-nums">{Math.round(total)}</span>
                    <span className="text-sm text-gray-500">/ 100</span>
                </div>
                <span className={`text-sm font-medium ${BUCKET_COLOR[bucket] || 'text-gray-300'}`}>
                    {BUCKET_LABEL[bucket] || bucket}
                </span>
            </div>

            {/* Per-category rows */}
            <div className="space-y-2.5">
                {CATEGORIES.map((c) => {
                    const s = sections[c.key] || {};
                    const pts = Number(s.points ?? 0);
                    const pct = c.max ? Math.min(100, (pts / c.max) * 100) : 0;
                    return (
                        <div key={c.key}>
                            <div className="flex items-center justify-between text-xs mb-1">
                                <span className="text-gray-300">{c.label}</span>
                                <div className="flex items-center gap-2">
                                    {s.label && <span className="text-gray-500">{String(s.label).replace(/_/g, ' ')}</span>}
                                    <span className="font-mono tabular-nums text-gray-200">{pts} / {c.max}</span>
                                </div>
                            </div>
                            <div className="h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
                                <div className="h-full bg-cyan-500/70" style={{ width: `${pct}%` }} />
                            </div>
                        </div>
                    );
                })}
            </div>

            {permit.contact_count != null && permit.contact_count > 0 && (
                <p className="mt-4 text-xs text-gray-500">
                    {permit.contact_count} reachable contact{permit.contact_count === 1 ? '' : 's'} on this permit.
                </p>
            )}
        </Card>
    );
}
