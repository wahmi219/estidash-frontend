'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { ShieldAlert, ExternalLink, Search, RefreshCw, AlertCircle, PlayCircle } from 'lucide-react';
import PageHeader from '@/components/common/PageHeader';
import PermitPagination from '@/components/permits/PermitPagination';
import { apiService } from '@/services/api';
import type { MatchCandidate, MatchCandidateListResponse, PermitPagination as PermitPaginationType } from '@/types';

// Exception workflow: a row here means contractor identity could NOT be
// confirmed automatically -- the source permit's contractor_id stays NULL
// until a human resolves it. No County / Contractor Type filter (removed
// from MVP everywhere). Data Source is shown per-row (backend resolves it)
// but this queue's only server-side filters are status/outcome; State/
// Data Source/Qualification/Date are page-scoped display+client filters,
// documented in docs/phase9_frontend_api_contract.md.

const STATUS_OPTIONS = [
    { value: 'pending', label: 'Pending' },
    { value: 'assigned', label: 'Assigned' },
    { value: 'in_progress', label: 'In Progress' },
    { value: 'confirmed', label: 'Confirmed' },
    { value: 'created_new', label: 'Created New' },
    { value: 'rejected', label: 'Rejected' },
    { value: 'unable_to_verify', label: 'Unable to Verify' },
];

function fmtMoney(v: number | null): string {
    if (v == null) return '—';
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(v);
}

export default function ContractorVerificationPage() {
    const [items, setItems] = useState<MatchCandidate[]>([]);
    const [total, setTotal] = useState(0);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [statusFilter, setStatusFilter] = useState('pending');
    const [search, setSearch] = useState('');
    const [startingId, setStartingId] = useState<string | null>(null);
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(100);

    const load = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const data = await apiService.get<MatchCandidateListResponse>('/contractor-verification/candidates', {
                status: statusFilter, limit: pageSize, offset: (page - 1) * pageSize,
            });
            setItems(data.items);
            setTotal(data.total);
        } catch (err) {
            const message = err && typeof err === 'object' && 'message' in err ? (err as { message: string }).message : 'Failed to load Contractor Verification queue';
            setError(message);
        } finally {
            setLoading(false);
        }
    }, [statusFilter, page, pageSize]);

    useEffect(() => { load(); }, [load]);

    // Reset to page 1 whenever the server-side filter changes so we never
    // land on an out-of-range page for the new, smaller result set.
    useEffect(() => { setPage(1); }, [statusFilter]);

    const pagination: PermitPaginationType = {
        page, pageSize, totalRecords: total,
        totalPages: Math.max(1, Math.ceil(total / pageSize)),
    };

    const visible = search.trim()
        ? items.filter((c) => (c.raw_name ?? '').toLowerCase().includes(search.trim().toLowerCase())
            || (c.candidate_contractor?.name ?? '').toLowerCase().includes(search.trim().toLowerCase()))
        : items;

    async function handleStartResearch(id: string) {
        setStartingId(id);
        try {
            await apiService.post(`/contractor-verification/candidates/${id}/start-research`);
            await load();
        } finally {
            setStartingId(null);
        }
    }

    return (
        <div className="max-w-7xl mx-auto">
            <PageHeader
                icon={ShieldAlert}
                title="Contractor Verification"
                subtitle="Permits where contractor identity could not be confirmed automatically — resolve before any Lead Bank eligibility"
            />

            <div className="bg-white border border-[#DFE6EE] rounded-lg p-3 mb-4 flex items-center gap-3 flex-wrap">
                <div className="relative flex-1 min-w-[200px] max-w-xs">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#5B6B7D]" />
                    <input
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Search source or candidate name"
                        className="w-full pl-8 pr-3 py-1.5 text-sm border border-[#DFE6EE] rounded-lg focus-visible:ring-2 focus-visible:ring-[#00458B] outline-none"
                    />
                </div>
                <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="px-3 py-1.5 text-sm border border-[#DFE6EE] rounded-lg">
                    {STATUS_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
                <button onClick={load} className="ml-auto flex items-center gap-1.5 text-sm text-[#5B6B7D] hover:text-[#00458B]">
                    <RefreshCw size={14} /> Refresh
                </button>
            </div>

            {loading && <div className="bg-white border border-[#DFE6EE] rounded-xl p-12 text-center text-[#5B6B7D]">Loading…</div>}

            {!loading && error && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-8 text-center">
                    <AlertCircle className="mx-auto mb-2 text-red-500" size={24} />
                    <p className="text-red-700 text-sm">{error}</p>
                </div>
            )}

            {!loading && !error && visible.length === 0 && (
                <div className="bg-white border border-[#DFE6EE] rounded-xl p-12 text-center">
                    <ShieldAlert className="mx-auto mb-3 text-[#5B6B7D]" size={28} />
                    <p className="text-[#0E2B5C] font-medium">No contractor identities are waiting for verification.</p>
                </div>
            )}

            {!loading && !error && visible.length > 0 && (
                <div className="bg-white border border-[#DFE6EE] rounded-xl overflow-hidden">
                    <div className="px-4 py-2 border-b border-[#DFE6EE] text-xs text-[#5B6B7D]">{total} candidate{total === 1 ? '' : 's'}</div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead className="bg-[#F7F9FB] text-[10px] uppercase tracking-wide text-[#5B6B7D]">
                                <tr>
                                    <th className="text-left px-4 py-2">Source Name / Permit</th>
                                    <th className="text-left px-4 py-2">Trade / Scope</th>
                                    <th className="text-left px-4 py-2">Address</th>
                                    <th className="text-right px-4 py-2">Valuation</th>
                                    <th className="text-left px-4 py-2">Qualification</th>
                                    <th className="text-left px-4 py-2">Reason</th>
                                    <th className="text-left px-4 py-2">Possible Match</th>
                                    <th className="text-left px-4 py-2">Status</th>
                                    <th className="text-right px-4 py-2">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[#DFE6EE]">
                                {visible.map((c) => (
                                    <tr key={c.id} className="hover:bg-[#F7F9FB]">
                                        <td className="px-4 py-3">
                                            <Link href={`/dashboard/contractor-verification/${c.id}`} className="text-[#00458B] hover:text-[#045CB4] font-medium flex items-center gap-1">
                                                {c.raw_name ?? 'Unknown'} <ExternalLink size={11} />
                                            </Link>
                                            <div className="text-[11px] text-[#5B6B7D] mt-0.5">{c.permit_number ?? '—'} · {c.state_code ?? '—'} · {c.agency_name ?? '—'}</div>
                                        </td>
                                        <td className="px-4 py-3 text-[#5B6B7D] max-w-[160px] truncate" title={c.scope ?? ''}>{c.permit_type ?? ''} {c.scope ? `· ${c.scope}` : ''}</td>
                                        <td className="px-4 py-3 text-[#5B6B7D] max-w-[180px] truncate" title={c.project_address ?? ''}>{c.project_address ?? '—'}</td>
                                        <td className="px-4 py-3 text-right font-mono text-[#0E2B5C]">{fmtMoney(c.valuation)}</td>
                                        <td className="px-4 py-3 text-[#0E2B5C]">{c.qualification_bucket ? `${c.qualification_bucket} · ${c.score != null ? Math.round(c.score) : '—'}` : '—'}</td>
                                        <td className="px-4 py-3 text-[#5B6B7D]">{c.reason.replace(/_/g, ' ')}</td>
                                        <td className="px-4 py-3 text-[#0E2B5C]">
                                            {c.candidate_contractor ? c.candidate_contractor.name : <span className="text-[#5B6B7D]">None</span>}
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wide border bg-amber-50 text-amber-700 border-amber-200">
                                                {c.status.replace(/_/g, ' ')}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                            {c.status === 'pending' && (
                                                <button
                                                    onClick={() => handleStartResearch(c.id)}
                                                    disabled={startingId === c.id}
                                                    className="flex items-center gap-1 text-xs text-[#00458B] hover:underline ml-auto disabled:opacity-50"
                                                >
                                                    <PlayCircle size={12} /> Start Research
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    <div className="border-t border-[#DFE6EE]">
                        <PermitPagination
                            pagination={pagination}
                            onPageChange={setPage}
                            onPageSizeChange={(size) => { setPageSize(size); setPage(1); }}
                            itemLabel="candidates"
                        />
                    </div>
                </div>
            )}
        </div>
    );
}
