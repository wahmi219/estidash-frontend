'use client';

import React, { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { PackageCheck, ExternalLink, RefreshCw, AlertCircle, CheckSquare, Square, PlusCircle } from 'lucide-react';
import PageHeader from '@/components/common/PageHeader';
import PermitPagination from '@/components/permits/PermitPagination';
import { apiService } from '@/services/api';
import { ReadyForLeadBankItem, ReadyForLeadBankResponse, BulkAddToLeadBankResponse, PermitPagination as PermitPaginationType } from '@/types';

// Real preparation queue — a row here is a QUALIFIED permit whose Contractor
// already has a usable email (backend: list_ready_for_lead_bank()). Filters
// wired here (agency_id/qualification_bucket/date range) map directly onto
// backend query columns; State and Trade/Scope are DISPLAYED per-row but not
// filterable yet -- no join/normalized taxonomy exists (see
// docs/phase9_frontend_api_contract.md, not fabricated here).

interface DataSourceOption { agency_id: string; source: string; city_key: string; }

// Phase 11.4 (EHUB-MSA-12): several stable, DISTINCT agencies share the same
// city-level display label (e.g. "Boise, ID" covers both a residential and a
// commercial permit feed with different agency_ids) — the filter previously
// showed both as an unlabeled, apparently-duplicate "Boise, ID" entry. This
// derives a short disambiguating suffix from each source's own city_key
// (e.g. "boise_commercial" -> "Commercial") without touching the stable
// agency_id used as the actual filter value.
function disambiguatedSourceLabel(source: DataSourceOption, allSources: DataSourceOption[]): string {
    const sameLabel = allSources.filter((s) => s.source === source.source);
    if (sameLabel.length <= 1) return source.source;
    const prefix = source.city_key.split('_')[0];
    const suffix = source.city_key.slice(prefix.length + 1);
    if (!suffix) return `${source.source} — General`;
    const humanized = suffix.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
    return `${source.source} — ${humanized}`;
}

const BUCKET_LABEL: Record<string, string> = {
    strategic: 'Strategic', strong: 'Strong', core: 'Core', opportunistic: 'Opportunistic',
};

function formatCurrency(value: number | null): string {
    if (value === null || value === undefined) return '—';
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value);
}

function formatDate(value: string | null): string {
    if (!value) return '—';
    return new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function ReadyForLeadBankPageInner() {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();

    // Phase 11.3 (P1: "page 2 can return page-1 content", "stale Showing
    // 1 to 100 of 439", "page state is not represented in the URL") —
    // page/pageSize/filters are now derived DIRECTLY from the URL on every
    // render, never mirrored into local useState. There is exactly one
    // source of truth, so there is nothing for local state to drift out
    // of sync with: reload re-derives from the URL that was reloaded;
    // browser back/forward re-render this component with the restored
    // searchParams (useSearchParams() reacts to history navigation, not
    // just to this component's own router calls) and this derivation
    // picks it up automatically; a shared link encodes exactly the page
    // being viewed. The previous version kept `page` in its own
    // useState, seeded ONCE from the URL at mount and never
    // re-synchronized from it afterward — that's what made back/forward
    // (and, combined with the stale-response race below, rapid page
    // clicks) unreliable.
    const page = useMemo(() => {
        const raw = Number(searchParams.get('page'));
        return Number.isFinite(raw) && raw >= 1 ? Math.floor(raw) : 1;
    }, [searchParams]);
    const pageSize = useMemo(() => {
        const raw = Number(searchParams.get('pageSize'));
        return Number.isFinite(raw) && raw > 0 ? Math.floor(raw) : 100;
    }, [searchParams]);
    const agencyId = searchParams.get('agency_id') ?? '';
    const qualificationBucket = searchParams.get('qualification_bucket') ?? '';
    const startDate = searchParams.get('start_date') ?? '';
    const endDate = searchParams.get('end_date') ?? '';

    /** Navigates to a new combination of page/pageSize/filters in one URL
     * update — always via push (not replace) so each page/filter change
     * is its own browser-history entry and back/forward can step through
     * them, per this phase's explicit "reload/back/forward preserve the
     * selected page" requirement. Any key omitted from `patch` keeps its
     * current value; pass `null` to remove a key (e.g. resetting page to
     * the implicit "1" by deleting it from the URL). */
    const navigate = useCallback((patch: Record<string, string | number | null>) => {
        const params = new URLSearchParams(searchParams.toString());
        for (const [key, value] of Object.entries(patch)) {
            if (value === null || value === '' || (key === 'page' && Number(value) <= 1) || (key === 'pageSize' && Number(value) === 100)) {
                params.delete(key);
            } else {
                params.set(key, String(value));
            }
        }
        const query = params.toString();
        router.push(query ? `${pathname}?${query}` : pathname, { scroll: false });
    }, [pathname, router, searchParams]);

    const setPage = useCallback((next: number) => navigate({ page: next }), [navigate]);
    const setAgencyId = useCallback((v: string) => navigate({ agency_id: v || null, page: null }), [navigate]);
    const setQualificationBucket = useCallback((v: string) => navigate({ qualification_bucket: v || null, page: null }), [navigate]);
    const setStartDate = useCallback((v: string) => navigate({ start_date: v || null, page: null }), [navigate]);
    const setEndDate = useCallback((v: string) => navigate({ end_date: v || null, page: null }), [navigate]);
    const setPageSize = useCallback((size: number) => navigate({ pageSize: size, page: null }), [navigate]);

    const [items, setItems] = useState<ReadyForLeadBankItem[]>([]);
    const [total, setTotal] = useState(0);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [dataSources, setDataSources] = useState<DataSourceOption[]>([]);

    const [selected, setSelected] = useState<Set<string>>(new Set());
    const [bulkAdding, setBulkAdding] = useState(false);
    const [bulkSummary, setBulkSummary] = useState<BulkAddToLeadBankResponse | null>(null);
    const [addingPermitId, setAddingPermitId] = useState<string | null>(null);
    const [actionError, setActionError] = useState<string | null>(null);
    // Phase 11.7 (CFW-04): a permit just attached via this session's own
    // action must stop looking newly actionable immediately, not only
    // after load()'s refetch completes -- covers any refetch latency and
    // makes the "already attached" state impossible to miss.
    const [attachedPermitIds, setAttachedPermitIds] = useState<Set<string>>(new Set());

    useEffect(() => {
        apiService.get<DataSourceOption[]>('/data-sources').then(setDataSources).catch(() => setDataSources([]));
    }, []);

    // Phase 11.3 (P1: "page 2 can return page-1 content") — a monotonic
    // request-sequence guard. Every call to load() stamps the in-flight
    // request with the NEXT sequence number; when a response resolves,
    // it's only applied to state if no NEWER request has been issued in
    // the meantime. Without this, a slower response for an OLDER page
    // (e.g. page 1, requested first but arriving last under real network
    // jitter) can overwrite the state after a faster response for a
    // NEWER page (e.g. page 2) has already rendered — exactly the
    // "page 2 shows page 1's rows" defect. This is a correctness
    // guarantee independent of network speed, not a timing workaround.
    const requestSeqRef = useRef(0);

    const load = useCallback(async () => {
        const seq = ++requestSeqRef.current;
        setLoading(true);
        setError(null);
        try {
            const params: Record<string, unknown> = { limit: pageSize, offset: (page - 1) * pageSize };
            if (agencyId) params.agency_id = agencyId;
            if (qualificationBucket) params.qualification_bucket = qualificationBucket;
            if (startDate) params.start_date = startDate;
            if (endDate) params.end_date = endDate;
            const data = await apiService.get<ReadyForLeadBankResponse>('/contractor-workflow/ready-for-lead-bank', params);
            if (requestSeqRef.current !== seq) return; // a newer request superseded this one — discard
            setItems(data.items);
            setTotal(data.total);
            setSelected(new Set());
        } catch (err) {
            if (requestSeqRef.current !== seq) return;
            const message = err && typeof err === 'object' && 'message' in err ? (err as { message: string }).message : 'Failed to load Ready for Lead Bank queue';
            setError(message);
        } finally {
            if (requestSeqRef.current === seq) setLoading(false);
        }
    }, [agencyId, qualificationBucket, startDate, endDate, page, pageSize]);

    useEffect(() => { load(); }, [load]);

    const pagination: PermitPaginationType = {
        page, pageSize, totalRecords: total,
        totalPages: Math.max(1, Math.ceil(total / pageSize)),
    };

    const allSelected = items.length > 0 && selected.size === items.length;

    function toggleAll() {
        setSelected(allSelected ? new Set() : new Set(items.map((i) => i.permit_id)));
    }

    function toggleOne(permitId: string) {
        setSelected((prev) => {
            const next = new Set(prev);
            if (next.has(permitId)) next.delete(permitId); else next.add(permitId);
            return next;
        });
    }

    const selectedRoutingPreview = useMemo(() => {
        const rows = items.filter((i) => selected.has(i.permit_id));
        const existing = rows.filter((r) => r.lead_bank_status === 'existing').length;
        const fresh = rows.length - existing;
        return { total: rows.length, existing, fresh };
    }, [items, selected]);

    async function handleBulkAdd() {
        if (selected.size === 0) return;
        setBulkAdding(true);
        setActionError(null);
        setBulkSummary(null);
        try {
            const submittedIds = Array.from(selected);
            const result = await apiService.post<BulkAddToLeadBankResponse>('/lead-bank-v2/opportunities/bulk', {
                permit_ids: submittedIds,
            });
            setBulkSummary(result);
            setAttachedPermitIds((prev) => {
                const next = new Set(prev);
                submittedIds.forEach((id) => next.add(id));
                return next;
            });
            setSelected(new Set());
            await load();
        } catch {
            setActionError('Bulk add failed. No opportunities were created.');
        } finally {
            setBulkAdding(false);
        }
    }

    async function handleAddOne(permitId: string) {
        setAddingPermitId(permitId);
        setActionError(null);
        try {
            await apiService.post('/lead-bank-v2/opportunities', { permit_id: permitId });
            setAttachedPermitIds((prev) => new Set(prev).add(permitId));
            await load();
        } catch {
            setActionError('Could not add this opportunity to Lead Bank.');
        } finally {
            setAddingPermitId(null);
        }
    }

    return (
        <div className="max-w-7xl mx-auto">
            <PageHeader
                icon={PackageCheck}
                title="Ready for Lead Bank"
                subtitle="Qualified opportunities with a confirmed contractor and usable contact, waiting to enter Lead Bank"
            />

            {/* Filters */}
            <div className="bg-white border border-[#DFE6EE] rounded-lg p-3 mb-4 flex items-center gap-3 flex-wrap">
                <select value={agencyId} onChange={(e) => setAgencyId(e.target.value)} className="px-3 py-1.5 text-sm border border-[#DFE6EE] rounded-lg">
                    <option value="">All Data Sources</option>
                    {dataSources.map((d) => (
                        <option key={d.agency_id} value={d.agency_id}>{disambiguatedSourceLabel(d, dataSources)}</option>
                    ))}
                </select>
                <select value={qualificationBucket} onChange={(e) => setQualificationBucket(e.target.value)} className="px-3 py-1.5 text-sm border border-[#DFE6EE] rounded-lg">
                    <option value="">All Qualifications</option>
                    {Object.entries(BUCKET_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                </select>
                <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="px-3 py-1.5 text-sm border border-[#DFE6EE] rounded-lg" />
                <span className="text-[#5B6B7D] text-sm">to</span>
                <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="px-3 py-1.5 text-sm border border-[#DFE6EE] rounded-lg" />
                <button onClick={load} className="ml-auto flex items-center gap-1.5 text-sm text-[#5B6B7D] hover:text-[#00458B]">
                    <RefreshCw size={14} /> Refresh
                </button>
            </div>

            {/* Bulk action bar */}
            {selected.size > 0 && (
                <div className="mb-4 bg-[#F7F9FB] border border-[#DFE6EE] rounded-lg px-4 py-3 flex items-center gap-4 flex-wrap">
                    <span className="text-sm text-[#0E2B5C] font-medium">{selectedRoutingPreview.total} selected</span>
                    <span className="text-xs text-[#5B6B7D]">
                        {selectedRoutingPreview.fresh} will create a new Lead Bank relationship · {selectedRoutingPreview.existing} will attach to an existing relationship
                    </span>
                    <button
                        onClick={handleBulkAdd}
                        disabled={bulkAdding}
                        className="ml-auto px-3 py-1.5 text-sm bg-[#00458B] text-white rounded-lg hover:bg-[#045CB4] disabled:opacity-50"
                    >
                        {bulkAdding ? 'Adding…' : `Add ${selected.size} to Lead Bank`}
                    </button>
                </div>
            )}

            {bulkSummary && (
                <div className="mb-4 bg-green-50 border border-green-200 rounded-lg px-4 py-3 text-sm text-green-800">
                    Routing result: {Object.entries(bulkSummary.counts).map(([status, count]) => `${count} ${status}`).join(' · ')}
                </div>
            )}

            {actionError && (
                <div className="mb-3 px-4 py-2 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg">{actionError}</div>
            )}

            {loading && (
                <div className="bg-white border border-[#DFE6EE] rounded-xl p-12 text-center text-[#5B6B7D]">Loading…</div>
            )}

            {!loading && error && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-8 text-center">
                    <AlertCircle className="mx-auto mb-2 text-red-500" size={24} />
                    <p className="text-red-700 text-sm">{error}</p>
                </div>
            )}

            {!loading && !error && items.length === 0 && (
                <div className="bg-white border border-[#DFE6EE] rounded-xl p-12 text-center">
                    <PackageCheck className="mx-auto mb-3 text-[#5B6B7D]" size={28} />
                    <p className="text-[#0E2B5C] font-medium">No eligible opportunities are waiting for Lead Bank.</p>
                    <p className="text-sm text-[#5B6B7D] mt-1">Try clearing filters, or check back after the next Contact Info Needed research pass.</p>
                </div>
            )}

            {!loading && !error && items.length > 0 && (
                <div className="bg-white border border-[#DFE6EE] rounded-xl overflow-hidden">
                    <div className="px-4 py-2 border-b border-[#DFE6EE] text-xs text-[#5B6B7D]">
                        {total} opportunit{total === 1 ? 'y' : 'ies'} waiting for Lead Bank
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead className="bg-[#F7F9FB] text-[10px] uppercase tracking-wide text-[#5B6B7D]">
                                <tr>
                                    <th className="px-4 py-2 w-8">
                                        <button onClick={toggleAll} className="text-[#5B6B7D]">
                                            {allSelected ? <CheckSquare size={14} /> : <Square size={14} />}
                                        </button>
                                    </th>
                                    <th className="text-left px-4 py-2">Contractor</th>
                                    <th className="text-left px-4 py-2">Email</th>
                                    <th className="text-left px-4 py-2">Permit</th>
                                    <th className="text-left px-4 py-2">Trade / Scope</th>
                                    <th className="text-left px-4 py-2">Project Address</th>
                                    <th className="text-right px-4 py-2">Valuation</th>
                                    <th className="text-left px-4 py-2">Qualification</th>
                                    <th className="text-left px-4 py-2">Issue Date</th>
                                    <th className="text-left px-4 py-2">Data Source</th>
                                    <th className="text-left px-4 py-2">Lead Bank</th>
                                    <th className="text-right px-4 py-2">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[#DFE6EE]">
                                {items.map((item) => (
                                    <tr key={item.permit_id} className="hover:bg-[#F7F9FB]">
                                        <td className="px-4 py-3">
                                            <button onClick={() => toggleOne(item.permit_id)} className="text-[#5B6B7D]">
                                                {selected.has(item.permit_id) ? <CheckSquare size={14} className="text-[#00458B]" /> : <Square size={14} />}
                                            </button>
                                        </td>
                                        <td className="px-4 py-3">
                                            <Link href={`/dashboard/contractors/${item.contractor_id}`} className="text-[#00458B] hover:text-[#045CB4] font-medium flex items-center gap-1">
                                                {item.contractor_name} <ExternalLink size={11} />
                                            </Link>
                                            <div className="text-[11px] text-[#5B6B7D] mt-0.5">{item.contractor_phone ?? '—'}</div>
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="text-[#0E2B5C]">{item.primary_email ?? '—'}</div>
                                            {item.additional_emails_count > 0 && (
                                                <div className="text-[11px] text-[#5B6B7D]">+{item.additional_emails_count} more</div>
                                            )}
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="text-[#0E2B5C]">{item.permit_number}</div>
                                            <div className="text-[11px] text-[#5B6B7D]">{item.permit_type}</div>
                                        </td>
                                        <td className="px-4 py-3 text-[#5B6B7D] max-w-[180px] truncate" title={item.scope ?? ''}>{item.scope ?? '—'}</td>
                                        <td className="px-4 py-3 text-[#5B6B7D] max-w-[200px]">
                                            <div className="truncate" title={item.project_address ?? ''}>{item.project_address ?? '—'}</div>
                                            <div className="text-[11px]">{item.state_code ?? ''}</div>
                                        </td>
                                        <td className="px-4 py-3 text-right font-mono text-[#0E2B5C]">{formatCurrency(item.valuation)}</td>
                                        <td className="px-4 py-3 text-[#0E2B5C]">
                                            {item.qualification_bucket ? `${BUCKET_LABEL[item.qualification_bucket] ?? item.qualification_bucket} · ${item.score != null ? Math.round(item.score) : '—'}` : '—'}
                                        </td>
                                        <td className="px-4 py-3 text-[#5B6B7D]">{formatDate(item.issue_date)}</td>
                                        <td className="px-4 py-3 text-[#5B6B7D]">{item.agency_name ?? '—'}</td>
                                        <td className="px-4 py-3">
                                            {item.lead_bank_status === 'existing' ? (
                                                <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wide border bg-blue-50 text-blue-700 border-blue-200">Existing</span>
                                            ) : (
                                                <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wide border bg-gray-100 text-[#5B6B7D] border-gray-200">New</span>
                                            )}
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                            {attachedPermitIds.has(item.permit_id) ? (
                                                <span className="inline-flex items-center gap-1 text-xs text-green-700 ml-auto">
                                                    <CheckSquare size={12} /> Attached
                                                </span>
                                            ) : (
                                                <button
                                                    onClick={() => handleAddOne(item.permit_id)}
                                                    disabled={addingPermitId === item.permit_id}
                                                    className="flex items-center gap-1 text-xs text-[#00458B] hover:underline disabled:opacity-50 ml-auto"
                                                >
                                                    <PlusCircle size={12} /> {item.lead_bank_status === 'existing' ? 'Add Opportunity' : 'Add to Lead Bank'}
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
                            onPageSizeChange={setPageSize}
                            itemLabel="opportunities"
                            maxPageSize={500}
                        />
                    </div>
                </div>
            )}
        </div>
    );
}

export default function ReadyForLeadBankPage() {
    return (
        <Suspense fallback={<div className="p-6 text-sm text-[#5B6B7D]">Loading…</div>}>
            <ReadyForLeadBankPageInner />
        </Suspense>
    );
}
