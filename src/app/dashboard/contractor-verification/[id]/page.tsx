'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { ShieldAlert, ArrowLeft, AlertCircle, CheckCircle2, XCircle, HelpCircle, Link2 } from 'lucide-react';
import PageHeader from '@/components/common/PageHeader';
import SectionHeading from '@/components/common/SectionHeading';
import { apiService } from '@/services/api';
import type { MatchCandidate } from '@/types';

function fmtMoney(v: number | null): string {
    if (v == null) return '—';
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(v);
}

export default function VerificationCandidateDetailPage() {
    const params = useParams();
    const router = useRouter();
    const candidateId = params.id as string;

    const [candidate, setCandidate] = useState<MatchCandidate | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [busy, setBusy] = useState(false);
    const [actionError, setActionError] = useState<string | null>(null);
    const [aliasName, setAliasName] = useState('');
    const [newName, setNewName] = useState('');
    const [newLicense, setNewLicense] = useState('');
    const [newPhone, setNewPhone] = useState('');
    const [mode, setMode] = useState<'none' | 'existing' | 'alias' | 'new'>('none');

    const load = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const data = await apiService.get<MatchCandidate>(`/contractor-verification/candidates/${candidateId}`);
            setCandidate(data);
            setNewName(data.raw_name ?? '');
        } catch {
            setError('Failed to load this verification candidate.');
        } finally {
            setLoading(false);
        }
    }, [candidateId]);

    useEffect(() => { load(); }, [load]);

    async function runAction(fn: () => Promise<unknown>, redirectAfter = true) {
        setBusy(true);
        setActionError(null);
        try {
            await fn();
            if (redirectAfter) {
                router.push('/dashboard/contractor-verification');
            } else {
                await load();
            }
        } catch (err) {
            const message = err && typeof err === 'object' && 'message' in err ? String((err as { message: unknown }).message) : 'Action failed';
            setActionError(message);
        } finally {
            setBusy(false);
        }
    }

    if (loading) return <div className="max-w-5xl mx-auto p-8 text-center text-[#5B6B7D]">Loading…</div>;
    if (error || !candidate) return (
        <div className="max-w-5xl mx-auto">
            <div className="bg-red-50 border border-red-200 rounded-xl p-8 text-center">
                <AlertCircle className="mx-auto mb-2 text-red-500" size={24} />
                <p className="text-red-700 text-sm">{error ?? 'Candidate not found.'}</p>
            </div>
        </div>
    );

    const resolved = !['pending', 'assigned', 'in_progress'].includes(candidate.status);

    return (
        <div className="max-w-5xl mx-auto space-y-6">
            <Link href="/dashboard/contractor-verification" className="inline-flex items-center gap-1.5 text-sm text-[#5B6B7D] hover:text-[#00458B]">
                <ArrowLeft size={14} /> Back to Contractor Verification
            </Link>
            <PageHeader icon={ShieldAlert} title={candidate.raw_name ?? 'Verification Candidate'} subtitle={`Reason: ${candidate.reason.replace(/_/g, ' ')} · Status: ${candidate.status.replace(/_/g, ' ')}`} />

            {actionError && <div className="px-4 py-2 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg">{actionError}</div>}
            {resolved && (
                <div className="px-4 py-2 bg-gray-100 border border-gray-200 text-[#5B6B7D] text-sm rounded-lg">
                    This candidate is already resolved (status: {candidate.status.replace(/_/g, ' ')}) — a prior human decision is never overwritten.
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* SOURCE DATA */}
                <section className="bg-white border border-[#DFE6EE] rounded-xl p-5">
                    <SectionHeading className="mb-3">Source Data (this permit)</SectionHeading>
                    <div className="space-y-2 text-sm">
                        <Field label="Raw Name on Permit">{candidate.raw_name ?? '—'}</Field>
                        <Field label="Normalized Name">{candidate.normalized_name ?? '—'}</Field>
                        <Field label="Permit Number">{candidate.permit_number ?? '—'}</Field>
                        <Field label="Permit Type">{candidate.permit_type ?? '—'}</Field>
                        <Field label="Trade / Scope">{candidate.scope ?? '—'}</Field>
                        <Field label="Address">{candidate.project_address ?? '—'}</Field>
                        <Field label="State">{candidate.state_code ?? '—'}</Field>
                        <Field label="Data Source">{candidate.agency_name ?? '—'}</Field>
                        <Field label="Valuation">{fmtMoney(candidate.valuation)}</Field>
                        <Field label="Qualification">{candidate.qualification_bucket ? `${candidate.qualification_bucket} · ${candidate.score != null ? Math.round(candidate.score) : '—'}` : '—'}</Field>
                        <Field label="Issue Date">{candidate.issue_date ? new Date(candidate.issue_date).toLocaleDateString() : '—'}</Field>
                        {candidate.evidence && Object.keys(candidate.evidence).length > 0 && (
                            <Field label="Evidence">
                                <pre className="text-[11px] bg-[#F7F9FB] border border-[#DFE6EE] rounded p-2 overflow-x-auto">{JSON.stringify(candidate.evidence, null, 2)}</pre>
                            </Field>
                        )}
                    </div>
                </section>

                {/* EXISTING CANDIDATE */}
                <section className="bg-white border border-[#DFE6EE] rounded-xl p-5">
                    <SectionHeading className="mb-3">Suggested Existing Contractor</SectionHeading>
                    {candidate.candidate_contractor ? (
                        <div className="space-y-2 text-sm">
                            <Field label="Name">
                                <Link href={`/dashboard/contractors/${candidate.candidate_contractor.id}`} className="text-[#00458B] hover:underline">
                                    {candidate.candidate_contractor.name}
                                </Link>
                            </Field>
                            {candidate.candidate_contractor.aliases.length > 0 && (
                                <Field label="Known Aliases">{candidate.candidate_contractor.aliases.join(', ')}</Field>
                            )}
                            <Field label="License">{candidate.candidate_contractor.license_number ?? '—'} {candidate.candidate_contractor.license_type ? `(${candidate.candidate_contractor.license_type})` : ''}</Field>
                            <Field label="Phone">{candidate.candidate_contractor.phone ?? '—'}</Field>
                            <Field label="Website">{candidate.candidate_contractor.website ?? '—'}</Field>
                            <Field label="State">{candidate.candidate_contractor.state_code ?? '—'}</Field>
                            <Field label="Lead Bank Relationship">{candidate.candidate_contractor.has_lead_bank_relationship ? 'Yes — already in Lead Bank' : 'None yet'}</Field>
                        </div>
                    ) : (
                        <p className="text-sm text-[#5B6B7D]">No existing contractor was suggested for this permit — evidence was insufficient.</p>
                    )}
                    <p className="text-[11px] text-[#5B6B7D] mt-4">
                        Reminder: an email address alone is never treated as identity proof. Confirm using name, license, jurisdiction, address, phone, or website evidence together.
                    </p>
                </section>
            </div>

            {!resolved && (
                <section className="bg-white border border-[#DFE6EE] rounded-xl p-5">
                    <SectionHeading className="mb-3">Resolve</SectionHeading>
                    <div className="flex flex-wrap gap-2 mb-4">
                        {candidate.candidate_contractor && (
                            <>
                                <ModeButton icon={CheckCircle2} label="Confirm Existing Contractor" active={mode === 'existing'} onClick={() => setMode('existing')} />
                                <ModeButton icon={Link2} label="Confirm Alias (same company, different name)" active={mode === 'alias'} onClick={() => setMode('alias')} />
                            </>
                        )}
                        <ModeButton icon={CheckCircle2} label="Confirm New Distinct Contractor" active={mode === 'new'} onClick={() => setMode('new')} />
                        <button
                            disabled={busy}
                            onClick={() => runAction(() => apiService.post(`/contractor-verification/candidates/${candidateId}/reject`))}
                            className="flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg border border-red-200 bg-red-50 text-red-700 hover:bg-red-100 disabled:opacity-50"
                        >
                            <XCircle size={14} /> Reject Suggested Match
                        </button>
                        <button
                            disabled={busy}
                            onClick={() => runAction(() => apiService.post(`/contractor-verification/candidates/${candidateId}/unable-to-verify`))}
                            className="flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg border border-[#DFE6EE] bg-white text-[#5B6B7D] hover:bg-[#F7F9FB] disabled:opacity-50"
                        >
                            <HelpCircle size={14} /> Unable to Verify
                        </button>
                    </div>

                    {mode === 'existing' && candidate.candidate_contractor && (
                        <div className="border border-[#DFE6EE] rounded-lg p-4 bg-[#F7F9FB]">
                            <p className="text-sm text-[#0E2B5C] mb-2">Link this permit to <strong>{candidate.candidate_contractor.name}</strong>.</p>
                            <button
                                disabled={busy}
                                onClick={() => runAction(() => apiService.post(`/contractor-verification/candidates/${candidateId}/confirm-existing`, { contractor_id: candidate.candidate_contractor!.id }))}
                                className="px-3 py-1.5 text-sm bg-[#00458B] text-white rounded-lg hover:bg-[#045CB4] disabled:opacity-50"
                            >
                                Confirm — Link to Existing Contractor
                            </button>
                        </div>
                    )}

                    {mode === 'alias' && candidate.candidate_contractor && (
                        <div className="border border-[#DFE6EE] rounded-lg p-4 bg-[#F7F9FB] space-y-2">
                            <p className="text-sm text-[#0E2B5C]">Save &quot;{candidate.raw_name}&quot; as a confirmed alias of <strong>{candidate.candidate_contractor.name}</strong>.</p>
                            <input
                                value={aliasName}
                                onChange={(e) => setAliasName(e.target.value)}
                                placeholder="Alias name to save"
                                defaultValue={candidate.raw_name ?? ''}
                                className="w-full px-3 py-1.5 text-sm border border-[#DFE6EE] rounded-lg"
                            />
                            <button
                                disabled={busy || !(aliasName || candidate.raw_name)}
                                onClick={() => runAction(() => apiService.post(`/contractor-verification/candidates/${candidateId}/confirm-alias`, {
                                    contractor_id: candidate.candidate_contractor!.id, alias_name: aliasName || candidate.raw_name,
                                }))}
                                className="px-3 py-1.5 text-sm bg-[#00458B] text-white rounded-lg hover:bg-[#045CB4] disabled:opacity-50"
                            >
                                Confirm Alias &amp; Link
                            </button>
                        </div>
                    )}

                    {mode === 'new' && (
                        <div className="border border-[#DFE6EE] rounded-lg p-4 bg-[#F7F9FB] space-y-2">
                            <p className="text-sm text-[#0E2B5C] mb-2">Create exactly one new Contractor for this genuinely distinct company.</p>
                            <div className="grid grid-cols-2 gap-2">
                                <input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Company name (required)" className="px-3 py-1.5 text-sm border border-[#DFE6EE] rounded-lg col-span-2" />
                                <input value={newLicense} onChange={(e) => setNewLicense(e.target.value)} placeholder="License number (optional)" className="px-3 py-1.5 text-sm border border-[#DFE6EE] rounded-lg" />
                                <input value={newPhone} onChange={(e) => setNewPhone(e.target.value)} placeholder="Phone (optional)" className="px-3 py-1.5 text-sm border border-[#DFE6EE] rounded-lg" />
                            </div>
                            <button
                                disabled={busy || !newName.trim()}
                                onClick={() => runAction(() => apiService.post(`/contractor-verification/candidates/${candidateId}/confirm-new`, {
                                    name: newName.trim(), license_number: newLicense || undefined, phone: newPhone || undefined,
                                }))}
                                className="px-3 py-1.5 text-sm bg-[#00458B] text-white rounded-lg hover:bg-[#045CB4] disabled:opacity-50"
                            >
                                Create New Contractor &amp; Link
                            </button>
                        </div>
                    )}
                    <p className="text-[11px] text-[#5B6B7D] mt-4">
                        After confirmation: if the confirmed Contractor has a usable email, this permit routes to Ready for Lead Bank; otherwise it routes to Contact Info Needed. It never goes straight to Lead Bank unresolved.
                    </p>
                </section>
            )}
        </div>
    );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
    return (
        <div>
            <p className="text-[10px] uppercase tracking-wide text-[#5B6B7D] mb-0.5">{label}</p>
            <div className="text-[#0E2B5C]">{children}</div>
        </div>
    );
}

function ModeButton({ icon: Icon, label, active, onClick }: { icon: React.ComponentType<{ size?: number }>; label: string; active: boolean; onClick: () => void }) {
    return (
        <button
            onClick={onClick}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg border ${
                active ? 'border-[#00458B] bg-[#00458B]/10 text-[#00458B]' : 'border-[#DFE6EE] bg-white text-[#0E2B5C] hover:bg-[#F7F9FB]'
            }`}
        >
            <Icon size={14} /> {label}
        </button>
    );
}
