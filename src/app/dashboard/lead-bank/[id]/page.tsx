'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
    Wallet, ExternalLink, ArrowLeft, AlertCircle, PlayCircle, Send, Ban,
    ThumbsUp, ThumbsDown, MailWarning, StopCircle, UserCheck, Star,
} from 'lucide-react';
import PageHeader from '@/components/common/PageHeader';
import SectionHeading from '@/components/common/SectionHeading';
import { apiService } from '@/services/api';
import type {
    ManualOutreachRelationshipDetail, LeadOpportunityListResponse, LeadBankHistoryResponse,
    OutreachWorkflowDetail, ContractorRecord,
} from '@/types';

const RELATIONSHIP_STATUS_OPTIONS = [
    'prospect', 'warm_lead', 'active_opportunity', 'active_client',
    'former_client', 'not_interested', 'do_not_contact',
];

function fmtMoney(v: number | null): string {
    if (v == null) return '—';
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(v);
}
function fmtDateTime(v: string | null): string {
    if (!v) return '—';
    return new Date(v).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' });
}

export default function LeadBankRelationshipDetailPage() {
    const params = useParams();
    const relationshipId = params.id as string;

    const [detail, setDetail] = useState<ManualOutreachRelationshipDetail | null>(null);
    const [contractor, setContractor] = useState<ContractorRecord | null>(null);
    const [opportunities, setOpportunities] = useState<LeadOpportunityListResponse | null>(null);
    const [history, setHistory] = useState<LeadBankHistoryResponse | null>(null);
    const [workflow, setWorkflow] = useState<OutreachWorkflowDetail | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [actionError, setActionError] = useState<string | null>(null);
    const [busy, setBusy] = useState(false);

    const load = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const d = await apiService.get<ManualOutreachRelationshipDetail>(`/manual-outreach/relationships/${relationshipId}`);
            setDetail(d);
            const [c, opps, hist] = await Promise.all([
                apiService.getContractorById(d.contractor_id).catch(() => null),
                apiService.get<LeadOpportunityListResponse>(`/lead-bank-v2/relationships/${relationshipId}/opportunities`, { limit: 100 }),
                apiService.get<LeadBankHistoryResponse>(`/lead-bank-v2/relationships/${relationshipId}/history`, { limit: 50 }),
            ]);
            setContractor(c);
            setOpportunities(opps);
            setHistory(hist);
            if (d.active_workflow_id) {
                const wf = await apiService.get<OutreachWorkflowDetail>(`/manual-outreach/workflows/${d.active_workflow_id}`);
                setWorkflow(wf);
            } else {
                setWorkflow(null);
            }
        } catch {
            setError('Failed to load this Lead Bank relationship.');
        } finally {
            setLoading(false);
        }
    }, [relationshipId]);

    useEffect(() => { load(); }, [load]);

    async function runAction(fn: () => Promise<unknown>, confirmMsg?: string) {
        if (confirmMsg && !window.confirm(confirmMsg)) return;
        setBusy(true);
        setActionError(null);
        try {
            await fn();
            await load();
        } catch (err) {
            const message = err && typeof err === 'object' && 'message' in err ? String((err as { message: unknown }).message) : 'Action failed';
            setActionError(message);
        } finally {
            setBusy(false);
        }
    }

    if (loading) return <div className="max-w-5xl mx-auto p-8 text-center text-[#5B6B7D]">Loading…</div>;
    if (error || !detail) return (
        <div className="max-w-5xl mx-auto">
            <div className="bg-red-50 border border-red-200 rounded-xl p-8 text-center">
                <AlertCircle className="mx-auto mb-2 text-red-500" size={24} />
                <p className="text-red-700 text-sm">{error ?? 'Relationship not found.'}</p>
            </div>
        </div>
    );

    const canStartWorkflow = !detail.active_workflow_id;
    const currentStage = workflow?.stages.find((s) => s.id && s.status !== 'sent' && s.status !== 'stopped' && s.status !== 'skipped')
        ?? (workflow?.stages.length ? workflow.stages[workflow.stages.length - 1] : null);

    return (
        <div className="max-w-5xl mx-auto space-y-6">
            <Link href="/dashboard/lead-bank" className="inline-flex items-center gap-1.5 text-sm text-[#5B6B7D] hover:text-[#00458B]">
                <ArrowLeft size={14} /> Back to Lead Bank
            </Link>
            <PageHeader
                icon={Wallet}
                title={detail.company_name ?? 'Lead Bank Relationship'}
                subtitle={`Relationship ${detail.relationship_id}`}
            />

            {actionError && (
                <div className="px-4 py-2 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg">{actionError}</div>
            )}

            {detail.previously_contacted_new_project && (
                <div className="px-4 py-3 bg-purple-50 border border-purple-200 text-purple-800 text-sm rounded-lg">
                    Previously Contacted – New Project: this contractor was contacted before; a new opportunity has since arrived.
                    Prior owner, history, relationship status, and cooldown are all preserved below — no new workflow starts automatically.
                </div>
            )}

            {/* CONTRACTOR */}
            <section className="bg-white border border-[#DFE6EE] rounded-xl p-5">
                <div className="flex items-center justify-between mb-3">
                    <SectionHeading>Contractor</SectionHeading>
                    <Link href={`/dashboard/contractors/${detail.contractor_id}`} className="text-xs text-[#00458B] hover:underline flex items-center gap-1">
                        View Full Contractor Profile <ExternalLink size={11} />
                    </Link>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
                    <Field label="Company">{detail.company_name ?? '—'}</Field>
                    <Field label="Contractor ID"><span className="font-mono text-xs">{detail.contractor_id}</span></Field>
                    <Field label="Phone">{detail.phone ?? '—'}</Field>
                    <Field label="Website">{detail.website ?? '—'}</Field>
                    <Field label="Primary Email">{detail.primary_email ?? '—'}</Field>
                    <Field label="Alternate Usable Emails">{detail.usable_alternative_email_count}</Field>
                </div>
            </section>

            {/* CRM RELATIONSHIP */}
            <section className="bg-white border border-[#DFE6EE] rounded-xl p-5">
                <SectionHeading className="mb-3">CRM Relationship</SectionHeading>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm mb-4">
                    <Field label="Relationship Status">{detail.relationship_status.replace(/_/g, ' ')}</Field>
                    <Field label="Outreach Status">{detail.outreach_status.replace(/_/g, ' ')}</Field>
                    <Field label="Sales Owner">{detail.sales_owner_name ?? 'Unassigned'}</Field>
                    <Field label="Do Not Contact">{detail.dnc ? 'Yes' : 'No'}</Field>
                    <Field label="Last Contacted">{fmtDateTime(detail.last_contacted_at)}</Field>
                    <Field label="Cooldown Until">{fmtDateTime(detail.cooldown_until)}</Field>
                </div>
                <div className="flex flex-wrap gap-2">
                    {!detail.sales_owner_id && (
                        <ActionButton
                            icon={UserCheck} label="Claim for Me" busy={busy}
                            onClick={() => runAction(() => apiService.post(`/manual-outreach/relationships/${relationshipId}/claim`))}
                        />
                    )}
                    <RelationshipStatusControl
                        current={detail.relationship_status}
                        busy={busy}
                        onSave={(status) => runAction(
                            () => apiService.post(`/lead-bank-v2/relationships/${relationshipId}/status`, { status }),
                            status === 'do_not_contact' ? 'Set relationship status to Do Not Contact?' : undefined,
                        )}
                    />
                    {!detail.dnc ? (
                        <ActionButton
                            icon={Ban} label="Set Do Not Contact" variant="danger" busy={busy}
                            onClick={() => runAction(
                                () => apiService.post(`/lead-bank-v2/relationships/${relationshipId}/dnc`, { dnc: true }),
                                'Mark this contractor Do Not Contact? This suppresses all future outreach.',
                            )}
                        />
                    ) : (
                        <ActionButton
                            icon={Ban} label="Clear Do Not Contact" busy={busy}
                            onClick={() => runAction(() => apiService.post(`/lead-bank-v2/relationships/${relationshipId}/dnc`, { dnc: false }))}
                        />
                    )}
                </div>
            </section>

            {/* OPPORTUNITIES */}
            <section className="bg-white border border-[#DFE6EE] rounded-xl p-5">
                <SectionHeading className="mb-3">Opportunities ({opportunities?.total ?? 0})</SectionHeading>
                {!opportunities || opportunities.items.length === 0 ? (
                    <p className="text-sm text-[#5B6B7D]">No opportunities attached.</p>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead className="bg-[#F7F9FB] text-[10px] uppercase tracking-wide text-[#5B6B7D]">
                                <tr>
                                    <th className="text-left px-3 py-2">Permit</th>
                                    <th className="text-left px-3 py-2">Trade / Scope</th>
                                    <th className="text-left px-3 py-2">Address</th>
                                    <th className="text-right px-3 py-2">Valuation</th>
                                    <th className="text-left px-3 py-2">Qualification</th>
                                    <th className="text-left px-3 py-2">Issue Date</th>
                                    <th className="text-left px-3 py-2">Source</th>
                                    <th className="text-left px-3 py-2">Status</th>
                                    <th className="text-right px-3 py-2">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[#DFE6EE]">
                                {opportunities.items.map((o) => (
                                    <tr key={o.id}>
                                        <td className="px-3 py-2 text-[#0E2B5C]">{o.snapshot_permit_number ?? '—'}<div className="text-[11px] text-[#5B6B7D]">{o.snapshot_permit_type}</div></td>
                                        <td className="px-3 py-2 text-[#5B6B7D] max-w-[160px] truncate" title={o.snapshot_scope ?? ''}>{o.snapshot_scope ?? '—'}</td>
                                        <td className="px-3 py-2 text-[#5B6B7D] max-w-[180px] truncate" title={o.snapshot_address ?? ''}>{o.snapshot_address ?? '—'}</td>
                                        <td className="px-3 py-2 text-right font-mono text-[#0E2B5C]">{fmtMoney(o.snapshot_valuation)}</td>
                                        <td className="px-3 py-2 text-[#0E2B5C]">{o.snapshot_qualification_bucket ? `${o.snapshot_qualification_bucket} · ${o.snapshot_score != null ? Math.round(o.snapshot_score) : '—'}` : '—'}</td>
                                        <td className="px-3 py-2 text-[#5B6B7D]">{o.snapshot_issue_date ? new Date(o.snapshot_issue_date).toLocaleDateString() : '—'}</td>
                                        <td className="px-3 py-2 text-[#5B6B7D]">{o.snapshot_source_agency ?? '—'}</td>
                                        <td className="px-3 py-2">
                                            {o.status === 'primary' ? (
                                                <span className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide text-[#00458B]"><Star size={10} fill="currentColor" /> Primary</span>
                                            ) : (
                                                <span className="text-[10px] uppercase tracking-wide text-[#5B6B7D]">Open</span>
                                            )}
                                        </td>
                                        <td className="px-3 py-2 text-right">
                                            {o.status !== 'primary' && (
                                                <button
                                                    disabled={busy}
                                                    onClick={() => runAction(() => apiService.post(`/lead-bank-v2/relationships/${relationshipId}/primary-opportunity`, { opportunity_id: o.id, lock: true }))}
                                                    className="text-xs text-[#00458B] hover:underline disabled:opacity-50"
                                                >
                                                    Set as Primary
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </section>

            {/* OUTREACH */}
            <section className="bg-white border border-[#DFE6EE] rounded-xl p-5">
                <SectionHeading className="mb-3">Manual Outreach</SectionHeading>
                {canStartWorkflow ? (
                    <div>
                        <p className="text-sm text-[#5B6B7D] mb-3">No active outreach workflow. Starting one only tracks the workflow — EHUB never sends anything.</p>
                        <ActionButton
                            icon={PlayCircle} label="Start Outreach Workflow" busy={busy}
                            onClick={() => runAction(() => apiService.post('/manual-outreach/workflows', { relationship_id: relationshipId }))}
                        />
                    </div>
                ) : (
                    <div className="space-y-3">
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
                            <Field label="Workflow Status">{detail.active_workflow_status?.replace(/_/g, ' ') ?? '—'}</Field>
                            <Field label="Current Stage">{detail.current_stage_type?.replace(/_/g, ' ') ?? '—'}</Field>
                            <Field label="Stage Status">{detail.current_stage_status?.replace(/_/g, ' ') ?? '—'}</Field>
                            <Field label="Due At">{fmtDateTime(detail.current_stage_due_at)}</Field>
                        </div>
                        {currentStage && (currentStage.status === 'ready_for_outreach' || currentStage.status === 'due' || currentStage.status === 'pending') && (
                            <MarkSentPanel
                                selectedEmail={currentStage.selected_email}
                                contractorEmails={contractor?.emails ?? []}
                                busy={busy}
                                onMarkSent={() => runAction(
                                    () => apiService.post(`/manual-outreach/stages/${currentStage.id}/mark-sent`),
                                    'Use this only after you have actually sent this email from your own email account. Continue?',
                                )}
                                onSelectEmail={(email) => runAction(() => apiService.post(`/manual-outreach/stages/${currentStage.id}/select-email`, { email }))}
                            />
                        )}
                        <OutcomeActions
                            busy={busy}
                            emails={contractor?.emails ?? []}
                            onOutcome={(outcome, notes, badEmail) => runAction(
                                () => apiService.post(`/manual-outreach/relationships/${relationshipId}/outcome`, { outcome, notes, bad_email: badEmail }),
                                ['dnc', 'manual_stop', 'not_interested'].includes(outcome) ? `Record outcome "${outcome.replace(/_/g, ' ')}"? This may stop the active workflow.` : undefined,
                            )}
                        />
                    </div>
                )}
            </section>

            {/* HISTORY */}
            <section className="bg-white border border-[#DFE6EE] rounded-xl p-5">
                <SectionHeading className="mb-3">History</SectionHeading>
                {!history || history.items.length === 0 ? (
                    <p className="text-sm text-[#5B6B7D]">No recorded history yet.</p>
                ) : (
                    <ul className="space-y-2 text-sm">
                        {history.items.map((h, i) => (
                            <li key={i} className="flex items-start justify-between border-b border-[#F0F3F7] pb-2 last:border-0">
                                <div>
                                    <span className="text-[#0E2B5C] font-medium">{h.field_name.replace(/_/g, ' ')}</span>
                                    <span className="text-[#5B6B7D]"> {h.previous_value ?? '—'} → {h.new_value ?? '—'}</span>
                                    {h.changed_by && <span className="text-[11px] text-[#5B6B7D]"> by {h.changed_by}</span>}
                                </div>
                                <span className="text-[11px] text-[#5B6B7D] whitespace-nowrap ml-3">{fmtDateTime(h.changed_at)}</span>
                            </li>
                        ))}
                    </ul>
                )}
            </section>
        </div>
    );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
    return (
        <div>
            <p className="text-[10px] uppercase tracking-wide text-[#5B6B7D] mb-0.5">{label}</p>
            <p className="text-[#0E2B5C]">{children}</p>
        </div>
    );
}

function ActionButton({
    icon: Icon, label, onClick, busy, variant = 'default',
}: { icon: React.ComponentType<{ size?: number }>; label: string; onClick: () => void; busy: boolean; variant?: 'default' | 'danger' }) {
    return (
        <button
            onClick={onClick}
            disabled={busy}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg border disabled:opacity-50 ${
                variant === 'danger'
                    ? 'border-red-200 bg-red-50 text-red-700 hover:bg-red-100'
                    : 'border-[#DFE6EE] bg-white text-[#0E2B5C] hover:bg-[#F7F9FB]'
            }`}
        >
            <Icon size={14} /> {label}
        </button>
    );
}

function RelationshipStatusControl({ current, onSave, busy }: { current: string; onSave: (status: string) => void; busy: boolean }) {
    const [value, setValue] = useState(current);
    return (
        <div className="flex items-center gap-1.5">
            <select value={value} onChange={(e) => setValue(e.target.value)} className="px-2 py-1.5 text-sm border border-[#DFE6EE] rounded-lg">
                {RELATIONSHIP_STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>)}
            </select>
            <button
                disabled={busy || value === current}
                onClick={() => onSave(value)}
                className="px-3 py-1.5 text-sm bg-[#00458B] text-white rounded-lg hover:bg-[#045CB4] disabled:opacity-50"
            >
                Update Status
            </button>
        </div>
    );
}

function MarkSentPanel({
    selectedEmail, contractorEmails, busy, onMarkSent, onSelectEmail,
}: {
    selectedEmail: string | null; contractorEmails: { email: string; status: string }[];
    busy: boolean; onMarkSent: () => void; onSelectEmail: (email: string) => void;
}) {
    const usable = contractorEmails.filter((e) => e.status === 'usable');
    return (
        <div className="border border-[#DFE6EE] rounded-lg p-4 bg-[#F7F9FB]">
            <p className="text-sm font-medium text-[#0E2B5C] mb-1">Mark Sent</p>
            <p className="text-xs text-[#5B6B7D] mb-3">Use this after you have sent the email from your own email account. Selected email: <strong>{selectedEmail ?? 'not yet selected'}</strong></p>
            {usable.length > 1 && (
                <div className="flex items-center gap-2 mb-3">
                    <select
                        defaultValue={selectedEmail ?? ''}
                        onChange={(e) => e.target.value && onSelectEmail(e.target.value)}
                        className="px-2 py-1.5 text-sm border border-[#DFE6EE] rounded-lg"
                    >
                        <option value="" disabled>Change email…</option>
                        {usable.map((e) => <option key={e.email} value={e.email}>{e.email}</option>)}
                    </select>
                </div>
            )}
            <ActionButton icon={Send} label="Mark Sent" busy={busy} onClick={onMarkSent} />
            <p className="text-[11px] text-[#5B6B7D] mt-2">This does not send an email — it only records that you sent one manually. Safe to click once; a retry after success has no additional effect.</p>
        </div>
    );
}

function OutcomeActions({
    emails, busy, onOutcome,
}: { emails: { email: string; status: string }[]; busy: boolean; onOutcome: (outcome: string, notes?: string, badEmail?: string) => void }) {
    const [badEmailPicker, setBadEmailPicker] = useState(false);
    const [badEmail, setBadEmail] = useState('');
    const usable = emails.filter((e) => e.status === 'usable');

    return (
        <div>
            <p className="text-xs uppercase tracking-wide text-[#5B6B7D] mb-2 mt-2">Record Outcome</p>
            <div className="flex flex-wrap gap-2">
                <ActionButton icon={ThumbsUp} label="Replied" busy={busy} onClick={() => onOutcome('replied')} />
                <ActionButton icon={ThumbsUp} label="Interested / Warm Lead" busy={busy} onClick={() => onOutcome('interested')} />
                <ActionButton icon={ThumbsUp} label="Active Opportunity" busy={busy} onClick={() => onOutcome('active_opportunity')} />
                <ActionButton icon={ThumbsDown} label="Not Interested" busy={busy} onClick={() => onOutcome('not_interested')} />
                <ActionButton icon={Ban} label="Do Not Contact" variant="danger" busy={busy} onClick={() => onOutcome('dnc')} />
                <ActionButton icon={Ban} label="Unsubscribe" variant="danger" busy={busy} onClick={() => onOutcome('unsubscribe')} />
                <ActionButton icon={ThumbsDown} label="No Response" busy={busy} onClick={() => onOutcome('no_response')} />
                <ActionButton icon={MailWarning} label="Bad / Bounced Email" busy={busy} onClick={() => setBadEmailPicker(true)} />
                <ActionButton icon={StopCircle} label="Manual Stop" variant="danger" busy={busy} onClick={() => onOutcome('manual_stop')} />
            </div>
            {badEmailPicker && (
                <div className="mt-3 border border-[#DFE6EE] rounded-lg p-3 bg-[#F7F9FB]">
                    <p className="text-sm text-[#0E2B5C] mb-2">Which email bounced or was bad?</p>
                    <div className="flex items-center gap-2">
                        <select value={badEmail} onChange={(e) => setBadEmail(e.target.value)} className="px-2 py-1.5 text-sm border border-[#DFE6EE] rounded-lg flex-1">
                            <option value="">Select an email…</option>
                            {usable.map((e) => <option key={e.email} value={e.email}>{e.email}</option>)}
                        </select>
                        <button
                            disabled={!badEmail || busy}
                            onClick={() => { onOutcome('bad_email', undefined, badEmail); setBadEmailPicker(false); setBadEmail(''); }}
                            className="px-3 py-1.5 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
                        >
                            Confirm Bad Email
                        </button>
                        <button onClick={() => setBadEmailPicker(false)} className="px-3 py-1.5 text-sm text-[#5B6B7D] hover:text-[#0E2B5C]">Cancel</button>
                    </div>
                    <p className="text-[11px] text-[#5B6B7D] mt-2">
                        This is preserved in email history, never deleted. If a usable alternative exists it is shown on the Contractor profile — EHUB never automatically contacts it. If no usable email remains, this contractor returns to Contact Info Needed.
                    </p>
                </div>
            )}
        </div>
    );
}
