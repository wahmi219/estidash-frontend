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
    strategic: 'text-emerald-700',
    strong: 'text-blue-700',
    core: 'text-[#00458B]',
    opportunistic: 'text-amber-700',
    no_send: 'text-[#5B6B7D]',
};

function Card({ children }: { children: React.ReactNode }) {
    return (
        <section className="rounded-lg border border-[#DFE6EE] bg-white p-5">
            <div className="flex items-center gap-2 mb-4">
                <Gauge size={16} className="text-[#00458B]" />
                <h3 className="text-sm font-semibold text-[#0E2B5C]">Score breakdown</h3>
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
                <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-3 text-sm text-red-700">
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
                    <span className="text-3xl font-mono font-bold text-[#0E2B5C] tabular-nums">{Math.round(total)}</span>
                    <span className="text-sm text-[#5B6B7D]">/ 100</span>
                </div>
                <span className={`text-sm font-medium ${BUCKET_COLOR[bucket] || 'text-[#5B6B7D]'}`}>
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
                                <span className="text-[#0E2B5C]">{c.label}</span>
                                <div className="flex items-center gap-2">
                                    {s.label && <span className="text-[#5B6B7D]">{String(s.label).replace(/_/g, ' ')}</span>}
                                    <span className="font-mono tabular-nums text-[#0E2B5C]">{pts} / {c.max}</span>
                                </div>
                            </div>
                            <div className="h-1.5 rounded-full bg-[#F7F9FB] border border-[#DFE6EE] overflow-hidden">
                                <div className="h-full bg-[#00458B]" style={{ width: `${pct}%` }} />
                            </div>
                        </div>
                    );
                })}
            </div>

            {permit.contact_count != null && permit.contact_count > 0 && (
                <p className="mt-4 text-xs text-[#5B6B7D]">
                    {permit.contact_count} reachable contact{permit.contact_count === 1 ? '' : 's'} on this permit.
                </p>
            )}
        </Card>
    );
}
