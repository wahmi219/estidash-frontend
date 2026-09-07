'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { apiService } from '@/services/api';
import type { PermitRecord } from '@/types';

function formatAddedDate(value: string | null): string {
    if (!value) return '—';
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return '—';
    return parsed.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

// Every row here already passed the qualification=qualified filter, so the
// business state itself ("Qualified") is constant — the score bucket is the
// only informative part, shown as supporting detail underneath.
const BUCKET_LABEL: Record<string, string> = {
    strategic: 'Strategic',
    strong: 'Strong',
    core: 'Core',
    opportunistic: 'Opportunistic',
};

function QualificationCell({ permit }: { permit: PermitRecord }) {
    const bucketLabel = permit.score_bucket ? BUCKET_LABEL[permit.score_bucket] : null;
    return (
        <div>
            <span className="text-[11px] font-semibold text-emerald-700">Qualified</span>
            {bucketLabel && (
                <div className="text-[10px] text-[#5B6B7D] uppercase tracking-wide">{bucketLabel}</div>
            )}
        </div>
    );
}

/**
 * Real qualified-permit rows via the existing, already-viewer-safe
 * /permits/search endpoint (qualification=qualified, ordered by
 * PermitRecord.created_at — "recent" means recently added to Estimation Hub,
 * not the jurisdiction's issue_date). No backend changes, no fabricated data.
 */
export default function RecentPermitActivity() {
    const [permits, setPermits] = useState<PermitRecord[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let cancelled = false;

        async function load() {
            try {
                const response = await apiService.searchPermits({
                    qualification: 'qualified',
                    order_by: 'created_at',
                    order_desc: true,
                    limit: 10,
                    offset: 0,
                });
                if (!cancelled) setPermits(response.data);
            } catch {
                if (!cancelled) setError('Unable to load permit activity.');
            } finally {
                if (!cancelled) setIsLoading(false);
            }
        }

        load();
        return () => {
            cancelled = true;
        };
    }, []);

    return (
        <div className="bg-white border border-[#DFE6EE] rounded-lg">
            <div className="flex items-center justify-between px-5 py-4 border-b border-[#DFE6EE]">
                <h2 className="text-sm font-semibold text-[#0E2B5C]">Recent Qualified Permits</h2>
                <Link
                    href="/dashboard/permits?qualification=qualified"
                    className="text-xs font-medium text-[#00458B] hover:text-[#045CB4] transition-colors"
                >
                    View all permits
                </Link>
            </div>

            {isLoading ? (
                <div className="px-5 py-8 text-sm text-[#5B6B7D]">Loading…</div>
            ) : error ? (
                <div className="px-5 py-8 text-sm text-[#5B6B7D]">{error}</div>
            ) : permits.length === 0 ? (
                <div className="px-5 py-8 text-sm text-[#5B6B7D]">
                    No qualified permit activity available in the local database.
                </div>
            ) : (
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="text-left text-[11px] uppercase tracking-widest text-[#5B6B7D]">
                                <th className="px-5 py-2 font-medium">Added</th>
                                <th className="px-5 py-2 font-medium">Permit / Scope</th>
                                <th className="px-5 py-2 font-medium">Location</th>
                                <th className="px-5 py-2 font-medium">Contractor</th>
                                <th className="px-5 py-2 font-medium">Qualification</th>
                            </tr>
                        </thead>
                        <tbody>
                            {permits.map((permit) => (
                                <tr key={permit.id} className="border-t border-[#DFE6EE]">
                                    <td className="px-5 py-3 text-[#5B6B7D] tabular-nums whitespace-nowrap">
                                        {formatAddedDate(permit.created_at)}
                                    </td>
                                    <td className="px-5 py-3 max-w-xs">
                                        <div className="font-mono text-xs text-[#0E2B5C]">{permit.permit_number}</div>
                                        <div className="text-[#5B6B7D] truncate">
                                            {permit.work_description || permit.permit_type}
                                        </div>
                                    </td>
                                    <td className="px-5 py-3 text-[#5B6B7D] whitespace-nowrap">
                                        {permit.city ? `${permit.city}, ${permit.state_code}` : '—'}
                                    </td>
                                    <td className="px-5 py-3 text-[#5B6B7D]">
                                        {permit.contractor_id && permit.contractor_name ? (
                                            permit.contractor_name
                                        ) : (
                                            <span className="text-amber-700 text-xs font-medium">Verification Needed</span>
                                        )}
                                    </td>
                                    <td className="px-5 py-3">
                                        <QualificationCell permit={permit} />
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}
