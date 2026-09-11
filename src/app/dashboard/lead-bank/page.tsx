'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { Wallet, ExternalLink, Search, RefreshCw, AlertCircle, Ban, PlayCircle } from 'lucide-react';
import { useAppSelector } from '@/hooks/useAppDispatch';
import PageHeader from '@/components/common/PageHeader';
import { apiService } from '@/services/api';
import type {
    LeadBankRelationship, LeadBankRelationshipListResponse,
    DueOutreachResponse, DueOutreachStageItem,
} from '@/types';

// The Lead Bank CRM: one main row per CONTRACTOR RELATIONSHIP, never per
// permit. relationship_status (business relationship) and outreach_status
// (this round's contact mechanics) are deliberately separate axes -- shown
// as two distinct badges, never merged into one. Sales owner, cooldown,
// and "Previously Contacted -- New Project" are all real backend fields;
// nothing here is fabricated. County and Contractor Type are not filters
// anywhere in this product.

type Tab = 'relationships' | 'ready' | 'due';

const RELATIONSHIP_STATUS_OPTIONS = [
    { value: '', label: 'All Relationship Statuses' },
    { value: 'prospect', label: 'Prospect' },
    { value: 'warm_lead', label: 'Warm Lead' },
    { value: 'active_opportunity', label: 'Active Opportunity' },
    { value: 'active_client', label: 'Active Client' },
    { value: 'former_client', label: 'Former Client' },
    { value: 'not_interested', label: 'Not Interested' },
    { value: 'do_not_contact', label: 'Do Not Contact' },
];

const OUTREACH_STATUS_OPTIONS = [
    { value: '', label: 'All Outreach Statuses' },
    { value: 'ready', label: 'Ready for Outreach' },
    { value: 'active_outreach', label: 'Active Outreach' },
    { value: 'cooldown', label: 'Cooldown' },
    { value: 'previously_contacted_new_project', label: 'Previously Contacted – New Project' },
    { value: 'completed_no_response', label: 'Completed / No Response' },
    { value: 'delivery_issue', label: 'Delivery Issue' },
];

const RELATIONSHIP_BADGE: Record<string, string> = {
    prospect: 'bg-gray-100 text-[#5B6B7D] border-gray-200',
    warm_lead: 'bg-amber-50 text-amber-700 border-amber-200',
    active_opportunity: 'bg-blue-50 text-blue-700 border-blue-200',
    active_client: 'bg-green-50 text-green-700 border-green-200',
    former_client: 'bg-gray-100 text-[#5B6B7D] border-gray-200',
    not_interested: 'bg-red-50 text-red-700 border-red-200',
    do_not_contact: 'bg-red-100 text-red-800 border-red-300',
};

const OUTREACH_BADGE: Record<string, string> = {
    ready: 'bg-green-50 text-green-700 border-green-200',
    active_outreach: 'bg-blue-50 text-blue-700 border-blue-200',
    cooldown: 'bg-amber-50 text-amber-700 border-amber-200',
    previously_contacted_new_project: 'bg-purple-50 text-purple-700 border-purple-200',
    completed_no_response: 'bg-gray-100 text-[#5B6B7D] border-gray-200',
    delivery_issue: 'bg-red-50 text-red-700 border-red-200',
};

function label(options: { value: string; label: string }[], value: string): string {
    return options.find((o) => o.value === value)?.label ?? value;
}

function formatCurrency(value: number | null): string {
    if (value === null || value === undefined) return '—';
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value);
}

function formatDateTime(value: string | null): string {
    if (!value) return '—';
    return new Date(value).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
}

export default function LeadBankPage() {
    const currentUser = useAppSelector((s) => s.auth.user);
    const [tab, setTab] = useState<Tab>('relationships');

    return (
        <div className="max-w-7xl mx-auto">
            <PageHeader
                icon={Wallet}
                title="Lead Bank"
                subtitle="One Contractor ID, one relationship, many opportunities — the contractor-centric sales workspace"
            />

            <div className="flex items-center gap-1 mb-4 border-b border-[#DFE6EE]">
                {([
                    { id: 'relationships' as Tab, label: 'All Relationships' },
                    { id: 'ready' as Tab, label: 'Ready for Outreach' },
                    { id: 'due' as Tab, label: 'Follow-ups Due' },
                ]).map((t) => (
                    <button
                        key={t.id}
                        onClick={() => setTab(t.id)}
                        className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
                            tab === t.id ? 'border-[#00458B] text-[#00458B]' : 'border-transparent text-[#5B6B7D] hover:text-[#0E2B5C]'
                        }`}
                    >
                        {t.label}
                    </button>
                ))}
            </div>

            {tab === 'relationships' && <RelationshipsTab currentUserId={currentUser?.id ?? null} />}
            {tab === 'ready' && <ReadyForOutreachTab />}
            {tab === 'due' && <FollowUpsDueTab />}
        </div>
    );
}

// ─── All Relationships ───────────────────────────────────────────────────────

function RelationshipsTab({ currentUserId }: { currentUserId: number | null }) {
    const [items, setItems] = useState<LeadBankRelationship[]>([]);
    const [total, setTotal] = useState(0);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [relationshipStatus, setRelationshipStatus] = useState('');
    const [outreachStatus, setOutreachStatus] = useState('');
    const [myLeadsOnly, setMyLeadsOnly] = useState(false);
    const [showDnc, setShowDnc] = useState(false);
    const [search, setSearch] = useState('');

    const load = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const params: Record<string, unknown> = { limit: 200 };
            if (relationshipStatus) params.status = relationshipStatus;
            if (outreachStatus) params.outreach_status = outreachStatus;
            if (myLeadsOnly && currentUserId) params.sales_owner_id = currentUserId;
            if (!showDnc) params.dnc = false;
            const data = await apiService.get<LeadBankRelationshipListResponse>('/lead-bank-v2/relationships', params);
            setItems(data.items);
            setTotal(data.total);
        } catch (err) {
            const message = err && typeof err === 'object' && 'message' in err ? (err as { message: string }).message : 'Failed to load Lead Bank';
            setError(message);
        } finally {
            setLoading(false);
        }
    }, [relationshipStatus, outreachStatus, myLeadsOnly, showDnc, currentUserId]);

    useEffect(() => { load(); }, [load]);

    const visible = search.trim()
        ? items.filter((r) => (r.contractor_name ?? '').toLowerCase().includes(search.trim().toLowerCase())
            || (r.contractor_email ?? '').toLowerCase().includes(search.trim().toLowerCase()))
        : items;

    return (
        <div>
            <div className="bg-white border border-[#DFE6EE] rounded-lg p-3 mb-4 flex items-center gap-3 flex-wrap">
                <div className="relative flex-1 min-w-[200px] max-w-xs">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#5B6B7D]" />
                    <input
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Search company or email (this page)"
                        className="w-full pl-8 pr-3 py-1.5 text-sm border border-[#DFE6EE] rounded-lg focus-visible:ring-2 focus-visible:ring-[#00458B] outline-none"
                    />
                </div>
                <select value={relationshipStatus} onChange={(e) => setRelationshipStatus(e.target.value)} className="px-3 py-1.5 text-sm border border-[#DFE6EE] rounded-lg">
                    {RELATIONSHIP_STATUS_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
                <select value={outreachStatus} onChange={(e) => setOutreachStatus(e.target.value)} className="px-3 py-1.5 text-sm border border-[#DFE6EE] rounded-lg">
                    {OUTREACH_STATUS_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
                <label className="flex items-center gap-2 text-sm text-[#5B6B7D] cursor-pointer">
                    <input type="checkbox" checked={myLeadsOnly} onChange={(e) => setMyLeadsOnly(e.target.checked)} disabled={!currentUserId} />
                    My Leads
                </label>
                <label className="flex items-center gap-2 text-sm text-[#5B6B7D] cursor-pointer">
                    <input type="checkbox" checked={showDnc} onChange={(e) => setShowDnc(e.target.checked)} />
                    Show Do Not Contact
                </label>
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
                    <Wallet className="mx-auto mb-3 text-[#5B6B7D]" size={28} />
                    <p className="text-[#0E2B5C] font-medium">No Lead Bank relationships match the current filters.</p>
                    <p className="text-sm text-[#5B6B7D] mt-1">Relationships are created from Ready for Lead Bank.</p>
                </div>
            )}

            {!loading && !error && visible.length > 0 && (
                <div className="bg-white border border-[#DFE6EE] rounded-xl overflow-hidden">
                    <div className="px-4 py-2 border-b border-[#DFE6EE] text-xs text-[#5B6B7D]">
                        {total} relationship{total === 1 ? '' : 's'}
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead className="bg-[#F7F9FB] text-[10px] uppercase tracking-wide text-[#5B6B7D]">
                                <tr>
                                    <th className="text-left px-4 py-2">Company</th>
                                    <th className="text-left px-4 py-2">Relationship</th>
                                    <th className="text-left px-4 py-2">Outreach</th>
                                    <th className="text-left px-4 py-2">Primary Opportunity</th>
                                    <th className="text-left px-4 py-2">Owner</th>
                                    <th className="text-right px-4 py-2">Opps</th>
                                    <th className="text-left px-4 py-2">Last Contacted</th>
                                    <th className="text-left px-4 py-2">Cooldown</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[#DFE6EE]">
                                {visible.map((r) => (
                                    <tr key={r.id} className="hover:bg-[#F7F9FB]">
                                        <td className="px-4 py-3">
                                            <Link href={`/dashboard/lead-bank/${r.id}`} className="text-[#00458B] hover:text-[#045CB4] font-medium flex items-center gap-1">
                                                {r.contractor_name ?? 'Unknown'} <ExternalLink size={11} />
                                            </Link>
                                            <div className="text-[11px] text-[#5B6B7D] mt-0.5">{r.contractor_email ?? '—'} · {r.contractor_state_code ?? '—'}</div>
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wide border ${RELATIONSHIP_BADGE[r.relationship_status] ?? RELATIONSHIP_BADGE.prospect}`}>
                                                {label(RELATIONSHIP_STATUS_OPTIONS, r.relationship_status)}
                                            </span>
                                            {r.dnc && <span className="ml-1 inline-flex items-center gap-0.5 text-[10px] text-red-700"><Ban size={10} /> DNC</span>}
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wide border ${OUTREACH_BADGE[r.outreach_status] ?? OUTREACH_BADGE.ready}`}>
                                                {label(OUTREACH_STATUS_OPTIONS, r.outreach_status)}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="text-[#0E2B5C]">{r.primary_opportunity_permit_number ?? '—'}</div>
                                            <div className="text-[11px] text-[#5B6B7D]">
                                                {r.primary_opportunity_qualification_bucket ? `${r.primary_opportunity_qualification_bucket} · ${r.primary_opportunity_score != null ? Math.round(r.primary_opportunity_score) : '—'}` : ''}
                                                {r.primary_opportunity_valuation ? ` · ${formatCurrency(r.primary_opportunity_valuation)}` : ''}
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 text-[#5B6B7D]">{r.sales_owner_name ?? 'Unassigned'}</td>
                                        <td className="px-4 py-3 text-right text-[#0E2B5C]">{r.opportunity_count}</td>
                                        <td className="px-4 py-3 text-[#5B6B7D]">{formatDateTime(r.last_contacted_at)}</td>
                                        <td className="px-4 py-3 text-[#5B6B7D]">{r.cooldown_until ? formatDateTime(r.cooldown_until) : '—'}</td>
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

// ─── Ready for Outreach ──────────────────────────────────────────────────────

interface ReadyItem { relationship_id: string; contractor_id: string; outreach_status: string; }

function ReadyForOutreachTab() {
    const [items, setItems] = useState<ReadyItem[]>([]);
    const [total, setTotal] = useState(0);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [startingId, setStartingId] = useState<string | null>(null);
    const [actionError, setActionError] = useState<string | null>(null);

    const load = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const data = await apiService.get<{ total: number; items: ReadyItem[] }>('/manual-outreach/ready', { limit: 200 });
            setItems(data.items);
            setTotal(data.total);
        } catch {
            setError('Failed to load Ready for Outreach');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { load(); }, [load]);

    async function handleStart(relationshipId: string) {
        setStartingId(relationshipId);
        setActionError(null);
        try {
            await apiService.post('/manual-outreach/workflows', { relationship_id: relationshipId });
            await load();
        } catch {
            setActionError('Could not start this outreach workflow — it may currently be blocked by eligibility rules.');
        } finally {
            setStartingId(null);
        }
    }

    if (loading) return <div className="bg-white border border-[#DFE6EE] rounded-xl p-12 text-center text-[#5B6B7D]">Loading…</div>;
    if (error) return (
        <div className="bg-red-50 border border-red-200 rounded-xl p-8 text-center">
            <AlertCircle className="mx-auto mb-2 text-red-500" size={24} /><p className="text-red-700 text-sm">{error}</p>
        </div>
    );
    if (items.length === 0) return (
        <div className="bg-white border border-[#DFE6EE] rounded-xl p-12 text-center">
            <PlayCircle className="mx-auto mb-3 text-[#5B6B7D]" size={28} />
            <p className="text-[#0E2B5C] font-medium">No relationships are currently ready for outreach.</p>
        </div>
    );

    return (
        <div className="bg-white border border-[#DFE6EE] rounded-xl overflow-hidden">
            <div className="px-4 py-2 border-b border-[#DFE6EE] text-xs text-[#5B6B7D]">{total} ready</div>
            {actionError && <div className="px-4 py-2 bg-red-50 border-b border-red-200 text-red-700 text-sm">{actionError}</div>}
            <div className="divide-y divide-[#DFE6EE]">
                {items.map((item) => (
                    <div key={item.relationship_id} className="px-4 py-3 flex items-center justify-between">
                        <Link href={`/dashboard/lead-bank/${item.relationship_id}`} className="text-[#00458B] hover:text-[#045CB4] font-medium flex items-center gap-1">
                            View Relationship <ExternalLink size={11} />
                        </Link>
                        <button
                            onClick={() => handleStart(item.relationship_id)}
                            disabled={startingId === item.relationship_id}
                            className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-[#00458B] text-white rounded-lg hover:bg-[#045CB4] disabled:opacity-50"
                        >
                            <PlayCircle size={14} /> Start Outreach Workflow
                        </button>
                    </div>
                ))}
            </div>
            <p className="px-4 py-2 text-[11px] text-[#5B6B7D] bg-[#F7F9FB] border-t border-[#DFE6EE]">
                Starting a workflow does not send anything — the employee sends the email manually from their own account, then returns here to Mark Sent.
            </p>
        </div>
    );
}

// ─── Follow-ups Due ──────────────────────────────────────────────────────────

function FollowUpsDueTab() {
    const [items, setItems] = useState<DueOutreachStageItem[]>([]);
    const [total, setTotal] = useState(0);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const data = await apiService.get<DueOutreachResponse>('/manual-outreach/due', { limit: 200 });
            setItems(data.items);
            setTotal(data.total);
        } catch {
            setError('Failed to load follow-ups due');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { load(); }, [load]);

    const [now] = useState(() => Date.now());

    if (loading) return <div className="bg-white border border-[#DFE6EE] rounded-xl p-12 text-center text-[#5B6B7D]">Loading…</div>;
    if (error) return (
        <div className="bg-red-50 border border-red-200 rounded-xl p-8 text-center">
            <AlertCircle className="mx-auto mb-2 text-red-500" size={24} /><p className="text-red-700 text-sm">{error}</p>
        </div>
    );
    if (items.length === 0) return (
        <div className="bg-white border border-[#DFE6EE] rounded-xl p-12 text-center">
            <p className="text-[#0E2B5C] font-medium">No follow-ups are due right now.</p>
        </div>
    );

    return (
        <div className="bg-white border border-[#DFE6EE] rounded-xl overflow-hidden">
            <div className="px-4 py-2 border-b border-[#DFE6EE] text-xs text-[#5B6B7D]">{total} stage{total === 1 ? '' : 's'} due or ready</div>
            <div className="overflow-x-auto">
                <table className="w-full text-sm">
                    <thead className="bg-[#F7F9FB] text-[10px] uppercase tracking-wide text-[#5B6B7D]">
                        <tr>
                            <th className="text-left px-4 py-2">Stage</th>
                            <th className="text-left px-4 py-2">Status</th>
                            <th className="text-left px-4 py-2">Due At</th>
                            <th className="text-right px-4 py-2">Action</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-[#DFE6EE]">
                        {items.map((s) => {
                            const overdue = !!s.due_at && new Date(s.due_at).getTime() < now;
                            return (
                                <tr key={s.stage_id} className="hover:bg-[#F7F9FB]">
                                    <td className="px-4 py-3 text-[#0E2B5C]">{s.stage_type.replace(/_/g, ' ')}</td>
                                    <td className="px-4 py-3">
                                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wide border ${overdue ? 'bg-red-50 text-red-700 border-red-200' : 'bg-blue-50 text-blue-700 border-blue-200'}`}>
                                            {overdue ? 'Overdue' : s.status.replace(/_/g, ' ')}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 text-[#5B6B7D]">{formatDateTime(s.due_at)}</td>
                                    <td className="px-4 py-3 text-right">
                                        <Link href={`/dashboard/lead-bank/${s.relationship_id}`} className="text-xs text-[#00458B] hover:underline">
                                            Open Relationship
                                        </Link>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
