'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { Inbox, ExternalLink, Search, RefreshCw, AlertCircle, PlayCircle, XCircle } from 'lucide-react';
import { useAppSelector } from '@/hooks/useAppDispatch';
import PageHeader from '@/components/common/PageHeader';
import { apiService } from '@/services/api';
import { ContactTask, ContactTaskListResponse } from '@/types';

// Contractor-centric queue: one Contractor ID appears as one row even with
// several eligible sibling permits attached (sibling_opportunity_count is
// how that's shown, per the backend enrichment -- backend commit d0391ca).
// Backend-supported filters only: status and assigned_to ("My Tasks").
// State/Data Source/Trade-Scope/Project Type/Qualification are DISPLAYED
// (the backend already resolves them per row) but not yet filterable here
// -- documented in docs/phase9_frontend_api_contract.md rather than faked.

const STATUS_OPTIONS: { value: string; label: string }[] = [
    { value: 'contact_info_needed', label: 'Needs Research' },
    { value: 'in_progress', label: 'In Progress' },
    { value: 'unable_to_find', label: 'Unable to Find' },
];

const STATUS_BADGE: Record<string, string> = {
    contact_info_needed: 'bg-amber-50 text-amber-700 border-amber-200',
    in_progress: 'bg-blue-50 text-blue-700 border-blue-200',
    ready: 'bg-green-50 text-green-700 border-green-200',
    unable_to_find: 'bg-gray-100 text-[#5B6B7D] border-gray-200',
};

function formatCurrency(value: number | null): string {
    if (value === null || value === undefined) return '—';
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value);
}

function formatDate(value: string | null): string {
    if (!value) return '—';
    return new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

const BUCKET_LABEL: Record<string, string> = {
    strategic: 'Strategic', strong: 'Strong', core: 'Core', opportunistic: 'Opport.',
};

export default function ContactInfoNeededPage() {
    const currentUserEmail = useAppSelector((s) => s.auth.user?.email) ?? null;

    const [tasks, setTasks] = useState<ContactTask[]>([]);
    const [total, setTotal] = useState(0);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [statusFilter, setStatusFilter] = useState('contact_info_needed');
    const [myTasksOnly, setMyTasksOnly] = useState(false);
    const [search, setSearch] = useState('');
    const [actioningId, setActioningId] = useState<string | null>(null);
    const [actionError, setActionError] = useState<string | null>(null);

    const load = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const params: Record<string, unknown> = { status: statusFilter, limit: 100 };
            if (myTasksOnly && currentUserEmail) params.assigned_to = currentUserEmail;
            const data = await apiService.get<ContactTaskListResponse>('/contractor-workflow/contact-tasks', params);
            setTasks(data.items);
            setTotal(data.total);
        } catch (err) {
            const message = err && typeof err === 'object' && 'message' in err ? (err as { message: string }).message : 'Failed to load Contact Info Needed queue';
            setError(message);
        } finally {
            setLoading(false);
        }
    }, [statusFilter, myTasksOnly, currentUserEmail]);

    useEffect(() => { load(); }, [load]);

    const visibleTasks = search.trim()
        ? tasks.filter((t) => (t.contractor_name ?? '').toLowerCase().includes(search.trim().toLowerCase()))
        : tasks;

    async function handleStart(taskId: string) {
        setActioningId(taskId);
        setActionError(null);
        try {
            await apiService.post(`/contractor-workflow/contact-tasks/${taskId}/start`);
            await load();
        } catch {
            setActionError('Could not start research on this task');
        } finally {
            setActioningId(null);
        }
    }

    async function handleUnableToFind(taskId: string) {
        setActioningId(taskId);
        setActionError(null);
        try {
            await apiService.post(`/contractor-workflow/contact-tasks/${taskId}/unable-to-find`);
            await load();
        } catch {
            setActionError('Could not mark this task Unable to Find');
        } finally {
            setActioningId(null);
        }
    }

    return (
        <div className="max-w-7xl mx-auto">
            <PageHeader
                icon={Inbox}
                title="Contact Info Needed"
                subtitle="Confirmed contractors with a qualified opportunity but no usable email yet"
            />

            {/* Filters */}
            <div className="bg-white border border-[#DFE6EE] rounded-lg p-3 mb-4 flex items-center gap-3 flex-wrap">
                <div className="relative flex-1 min-w-[200px] max-w-xs">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#5B6B7D]" />
                    <input
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Search by company name"
                        className="w-full pl-8 pr-3 py-1.5 text-sm border border-[#DFE6EE] rounded-lg focus-visible:ring-2 focus-visible:ring-[#00458B] outline-none"
                    />
                </div>
                <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="px-3 py-1.5 text-sm border border-[#DFE6EE] rounded-lg"
                >
                    {STATUS_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
                <label className="flex items-center gap-2 text-sm text-[#5B6B7D] cursor-pointer">
                    <input type="checkbox" checked={myTasksOnly} onChange={(e) => setMyTasksOnly(e.target.checked)} />
                    My Tasks
                </label>
                <button onClick={load} className="ml-auto flex items-center gap-1.5 text-sm text-[#5B6B7D] hover:text-[#00458B]">
                    <RefreshCw size={14} /> Refresh
                </button>
            </div>

            {actionError && (
                <div className="mb-3 px-4 py-2 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg">{actionError}</div>
            )}

            {/* Loading */}
            {loading && (
                <div className="bg-white border border-[#DFE6EE] rounded-xl p-12 text-center text-[#5B6B7D]">Loading…</div>
            )}

            {/* Error */}
            {!loading && error && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-8 text-center">
                    <AlertCircle className="mx-auto mb-2 text-red-500" size={24} />
                    <p className="text-red-700 text-sm">{error}</p>
                </div>
            )}

            {/* Empty */}
            {!loading && !error && visibleTasks.length === 0 && (
                <div className="bg-white border border-[#DFE6EE] rounded-xl p-12 text-center">
                    <Inbox className="mx-auto mb-3 text-[#5B6B7D]" size={28} />
                    <p className="text-[#0E2B5C] font-medium">No contractors currently require contact research.</p>
                    <p className="text-sm text-[#5B6B7D] mt-1">
                        {statusFilter === 'contact_info_needed' ? 'The queue is clear for this status.' : 'Try a different status filter.'}
                    </p>
                </div>
            )}

            {/* Table */}
            {!loading && !error && visibleTasks.length > 0 && (
                <div className="bg-white border border-[#DFE6EE] rounded-xl overflow-hidden">
                    <div className="px-4 py-2 border-b border-[#DFE6EE] text-xs text-[#5B6B7D]">
                        {total} task{total === 1 ? '' : 's'}
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead className="bg-[#F7F9FB] text-[10px] uppercase tracking-wide text-[#5B6B7D]">
                                <tr>
                                    <th className="text-left px-4 py-2">Contractor</th>
                                    <th className="text-left px-4 py-2">Status</th>
                                    <th className="text-left px-4 py-2">Opportunity</th>
                                    <th className="text-left px-4 py-2">Data Source</th>
                                    <th className="text-right px-4 py-2">Valuation</th>
                                    <th className="text-left px-4 py-2">Qualification</th>
                                    <th className="text-left px-4 py-2">Issue Date</th>
                                    <th className="text-left px-4 py-2">Assigned</th>
                                    <th className="text-right px-4 py-2">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[#DFE6EE]">
                                {visibleTasks.map((t) => (
                                    <tr key={t.id} className="hover:bg-[#F7F9FB]">
                                        <td className="px-4 py-3">
                                            <Link href={`/dashboard/contractors/${t.contractor_id}`} className="text-[#00458B] hover:text-[#045CB4] font-medium flex items-center gap-1">
                                                {t.contractor_name ?? 'Unknown'} <ExternalLink size={11} />
                                            </Link>
                                            <div className="text-[11px] text-[#5B6B7D] mt-0.5">
                                                {t.contractor_phone ?? '—'} · {t.contractor_state_code ?? '—'}
                                                {t.sibling_opportunity_count > 0 && (
                                                    <span className="ml-1.5 px-1 py-0.5 bg-[#F7F9FB] border border-[#DFE6EE] rounded text-[10px]">+{t.sibling_opportunity_count} more</span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wide border ${STATUS_BADGE[t.status] ?? STATUS_BADGE.contact_info_needed}`}>
                                                {t.status.replace(/_/g, ' ')}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="text-[#0E2B5C]">{t.current_permit_number ?? '—'}</div>
                                            <div className="text-[11px] text-[#5B6B7D]">{t.current_permit_type ?? ''} {t.current_project_address ? `· ${t.current_project_address}` : ''}</div>
                                        </td>
                                        <td className="px-4 py-3 text-[#5B6B7D]">{t.current_agency_name ?? '—'}</td>
                                        <td className="px-4 py-3 text-right font-mono text-[#0E2B5C]">{formatCurrency(t.current_valuation)}</td>
                                        <td className="px-4 py-3 text-[#0E2B5C]">
                                            {t.current_qualification_bucket ? `${BUCKET_LABEL[t.current_qualification_bucket] ?? t.current_qualification_bucket} · ${t.current_score != null ? Math.round(t.current_score) : '—'}` : '—'}
                                        </td>
                                        <td className="px-4 py-3 text-[#5B6B7D]">{formatDate(t.current_issue_date)}</td>
                                        <td className="px-4 py-3 text-[#5B6B7D]">{t.assigned_to ?? 'Unassigned'}</td>
                                        <td className="px-4 py-3 text-right">
                                            {(t.status === 'contact_info_needed' || t.status === 'in_progress') && (
                                                <div className="flex items-center justify-end gap-2">
                                                    {t.status === 'contact_info_needed' && (
                                                        <button
                                                            onClick={() => handleStart(t.id)}
                                                            disabled={actioningId === t.id}
                                                            className="flex items-center gap-1 text-xs text-[#00458B] hover:underline disabled:opacity-50"
                                                        >
                                                            <PlayCircle size={12} /> Start
                                                        </button>
                                                    )}
                                                    <button
                                                        onClick={() => handleUnableToFind(t.id)}
                                                        disabled={actioningId === t.id}
                                                        className="flex items-center gap-1 text-xs text-[#5B6B7D] hover:text-red-600 disabled:opacity-50"
                                                    >
                                                        <XCircle size={12} /> Unable to Find
                                                    </button>
                                                </div>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
}
