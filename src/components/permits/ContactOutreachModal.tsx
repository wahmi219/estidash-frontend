'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import {
    X, Mail, RefreshCw, Send, AlertCircle, Loader2, Check, Users, Plus, Beaker, Ban, TriangleAlert, Search, Globe,
} from 'lucide-react';
import { PermitRecord, PermitContact, PermitContactRole, FindEmailReason } from '@/types';
import { apiService } from '@/services/api';

const FIND_EMAIL_REASON_LABELS: Record<FindEmailReason, string> = {
    no_company_name: 'No business name to search on.',
    business_not_found: 'No matching business found.',
    no_website_listed: 'Business found, but no website on file.',
    no_email_on_domain: 'Website found, but no email could be discovered.',
    verification_failed: 'A candidate email was found but failed verification.',
    previously_not_found: 'Already tried recently — no email found.',
};

interface ContactOutreachModalProps {
    permit: PermitRecord;
    onClose: () => void;
}

type Phase = 'select' | 'generating' | 'review' | 'error' | 'killed';

interface PricingBlock {
    cold_entry: string | null;
    ceiling: string | null;
    full_scope_target: string | null;
    rationale: string | null;
}

interface ResearchStatus {
    requested: boolean;
    enabled: boolean;
    provider: string | null;
    ran: boolean;
    cache_hit: boolean;
    facts_collected: number;
    facts_used: number;
    skipped_reason: string | null;
}

const WEB_SEARCH_UNAVAILABLE_REASON_LABELS: Record<string, string> = {
    collection_disabled: 'Web search is currently unavailable: research collection is off',
    consumption_disabled: 'Web search is currently unavailable: not enabled for email generation',
    no_api_key: 'Web search is currently unavailable: no API key configured',
    invalid_api_key: 'Web search is currently unavailable: invalid API key',
};

const ROLE_LABELS: Record<PermitContactRole, string> = {
    general_contractor: 'General Contractor',
    owner: 'Owner',
    subcontractor: 'Subcontractor',
    mep: 'MEP',
    applicant: 'Applicant',
    architect: 'Architect',
    other: 'Contact',
};

const ROLE_BADGE: Record<PermitContactRole, string> = {
    general_contractor: 'bg-cyan-500/15 text-cyan-400',
    owner: 'bg-emerald-500/15 text-emerald-400',
    subcontractor: 'bg-amber-500/15 text-amber-400',
    mep: 'bg-purple-500/15 text-purple-400',
    applicant: 'bg-blue-500/15 text-blue-400',
    architect: 'bg-pink-500/15 text-pink-400',
    other: 'bg-white/10 text-gray-300',
};

interface Variant {
    contactId: string;
    role: string | null;
    name: string | null;
    email: string | null;
    contractorId: string | null;
    subject: string;
    body: string;
    analysis: string | null;
    needsReview: boolean;
    gateFailures: string[];
    wordCount: number | null;
    sendStatus: 'idle' | 'sending' | 'sent' | 'error';
    sendMessage?: string;
    // Phase 9: mirrors the backend's send_eligible. A needs_review draft is
    // never auto-eligible — the user must explicitly approve it first
    // (reviewedApproved) before the Send button becomes clickable.
    sendEligible: boolean;
    reviewedApproved: boolean;
}

export default function ContactOutreachModal({ permit, onClose }: ContactOutreachModalProps) {
    const reduce = useReducedMotion();
    const [phase, setPhase] = useState<Phase>('select');
    const [contacts, setContacts] = useState<PermitContact[]>([]);
    const [selected, setSelected] = useState<Set<string>>(new Set());
    const [loadingContacts, setLoadingContacts] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [variants, setVariants] = useState<Variant[]>([]);
    const [instructions, setInstructions] = useState('');
    const [isRegenerating, setIsRegenerating] = useState(false);
    const [emailDrafts, setEmailDrafts] = useState<Record<string, string>>({});
    const [killReason, setKillReason] = useState<string | null>(null);
    const [pricing, setPricing] = useState<PricingBlock | null>(null);
    const [findState, setFindState] = useState<Record<string, 'idle' | 'loading' | 'not_found' | 'error'>>({});
    const [findMessage, setFindMessage] = useState<Record<string, string>>({});
    const [useWebSearch, setUseWebSearch] = useState(false);
    const [webSearchAvailability, setWebSearchAvailability] = useState<{ available: boolean; reason: string | null } | null>(null);
    const [researchStatus, setResearchStatus] = useState<ResearchStatus | null>(null);

    const contractorName = permit.contractor_name || 'this permit';

    useEffect(() => {
        apiService.getResearchAvailability()
            .then((res) => setWebSearchAvailability({ available: res.available, reason: res.reason }))
            .catch(() => setWebSearchAvailability({ available: false, reason: null }));
    }, []);

    const loadContacts = useCallback(async () => {
        setLoadingContacts(true);
        setError(null);
        try {
            const data = await apiService.getPermitContacts(permit.id);
            setContacts(data);
            // Pre-select contacts that already have an email.
            setSelected(new Set(data.filter((c) => c.email).map((c) => c.id)));
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load contacts');
        } finally {
            setLoadingContacts(false);
        }
    }, [permit.id]);

    useEffect(() => {
        loadContacts();
    }, [loadContacts]);

    const toggle = (id: string) => {
        setSelected((prev) => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    const saveEmail = async (contact: PermitContact, demo: boolean) => {
        const value = (emailDrafts[contact.id] || '').trim();
        if (!value) return;
        try {
            const updated = demo
                ? await apiService.setPermitContactDemoEmail(permit.id, contact.id, value)
                : await apiService.savePermitContact(permit.id, contact.id, { email: value });
            setContacts((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
            setSelected((prev) => new Set(prev).add(updated.id));
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to save email');
        }
    };

    const findEmail = async (contact: PermitContact) => {
        setFindState((s) => ({ ...s, [contact.id]: 'loading' }));
        setFindMessage((m) => ({ ...m, [contact.id]: '' }));
        try {
            const res = await apiService.findPermitContactEmail(permit.id, contact.id);
            if (res.found) {
                setContacts((prev) => prev.map((c) => (c.id === res.contact.id ? res.contact : c)));
                setSelected((prev) => new Set(prev).add(res.contact.id));
                setFindState((s) => ({ ...s, [contact.id]: 'idle' }));
            } else {
                setFindState((s) => ({ ...s, [contact.id]: 'not_found' }));
                setFindMessage((m) => ({
                    ...m,
                    [contact.id]: res.reason ? FIND_EMAIL_REASON_LABELS[res.reason] : 'No email found.',
                }));
            }
        } catch (err) {
            setFindState((s) => ({ ...s, [contact.id]: 'error' }));
            setFindMessage((m) => ({ ...m, [contact.id]: err instanceof Error ? err.message : 'Lookup failed' }));
        }
    };

    const selectedContacts = contacts.filter((c) => selected.has(c.id));
    const allSelectedHaveEmail = selectedContacts.length > 0 && selectedContacts.every((c) => c.email);

    const buildPermitContext = (): Record<string, unknown> => ({
        permit_type: permit.permit_type,
        permit_subtype: permit.permit_subtype,
        city: permit.city,
        state_code: permit.state_code,
        status: permit.status,
        estimated_cost: permit.estimated_cost,
        total_fee: permit.total_fee,
        work_description: permit.work_description,
        full_address: permit.full_address,
        issue_date: permit.issue_date,
    });

    const generate = useCallback(async () => {
        setPhase('generating');
        setError(null);
        setKillReason(null);
        try {
            const result = await apiService.generateOutreachBatch({
                contractor_name: permit.contractor_name,
                permit_number: permit.permit_number,
                permit_id: permit.id,
                permit_context: buildPermitContext(),
                contacts: selectedContacts.map((c) => ({
                    role: c.role,
                    name: c.name,
                    company: c.company,
                    email: c.email,
                    contractor_id: c.contractor_id,
                })),
                instructions: instructions.trim() || null,
                use_web_search: useWebSearch,
            });

            setResearchStatus(result.research);

            if (result.killed) {
                setKillReason(result.kill_reason || 'This lead was excluded before writing.');
                setPhase('killed');
                return;
            }

            if (!result.success) {
                setError('Email generation failed for all contacts.');
                setPhase('error');
                return;
            }

            setPricing(result.pricing);
            const newVariants: Variant[] = result.variants.map((v, i) => ({
                contactId: selectedContacts[i]?.id ?? `${i}`,
                role: v.role,
                name: v.name,
                email: v.email,
                contractorId: v.contractor_id,
                subject: v.email_subject || '',
                body: v.email_body || '',
                analysis: v.analysis,
                needsReview: v.needs_review,
                gateFailures: v.gate_failures || [],
                wordCount: v.word_count,
                sendStatus: v.success ? 'idle' : 'error',
                sendMessage: v.error || undefined,
                sendEligible: v.send_eligible,
                reviewedApproved: false,
            }));
            setVariants(newVariants);
            setEmailDrafts({});
            setPhase('review');
        } catch (err) {
            setError(err instanceof Error ? err.message : 'An unexpected error occurred');
            setPhase('error');
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [permit, selectedContacts, instructions, useWebSearch]);

    const handleRegenerate = async () => {
        setIsRegenerating(true);
        await generate();
        setIsRegenerating(false);
    };

    const updateVariant = (idx: number, patch: Partial<Variant>) => {
        setVariants((prev) => prev.map((v, i) => (i === idx ? { ...v, ...patch } : v)));
    };

    const sendOne = async (idx: number) => {
        const v = variants[idx];
        // Phase 9: a needs_review draft can only send after the user has
        // explicitly approved it (reviewedApproved) — this mirrors the
        // server-side check in send-batch, so a stale client state can
        // never bypass it (the server rejects it either way).
        if (!v.email || (!v.sendEligible && !v.reviewedApproved)) return;
        updateVariant(idx, { sendStatus: 'sending' });
        try {
            const res = await apiService.sendOutreachBatch({
                permit_id: permit.id,
                permit_number: permit.permit_number,
                items: [{
                    to_email: v.email,
                    subject: v.subject,
                    body: v.body,
                    role: v.role,
                    contractor_id: v.contractorId,
                    needs_review: v.needsReview,
                    approved: v.reviewedApproved,
                }],
            });
            const r = res.results[0];
            updateVariant(idx, {
                sendStatus: r?.success ? 'sent' : 'error',
                sendMessage: r?.message,
            });
        } catch (err) {
            updateVariant(idx, { sendStatus: 'error', sendMessage: err instanceof Error ? err.message : 'Send failed' });
        }
    };

    const sendAll = async () => {
        // Phase 9: "Send all" only ever sends drafts that are eligible or
        // have been explicitly approved — a needs_review draft the user
        // hasn't reviewed yet is silently skipped here (not sent, not
        // errored), same as it always was for a missing email address.
        const pending = variants.filter((v) => v.email && v.sendStatus !== 'sent' && (v.sendEligible || v.reviewedApproved));
        if (pending.length === 0) return;
        setVariants((prev) => prev.map((v) => (pending.includes(v) ? { ...v, sendStatus: 'sending' } : v)));
        try {
            const res = await apiService.sendOutreachBatch({
                permit_id: permit.id,
                permit_number: permit.permit_number,
                items: pending.map((v) => ({
                    to_email: v.email as string,
                    subject: v.subject,
                    body: v.body,
                    role: v.role,
                    contractor_id: v.contractorId,
                    needs_review: v.needsReview,
                    approved: v.reviewedApproved,
                })),
            });
            const byEmail = new Map(res.results.map((r) => [r.to_email, r]));
            setVariants((prev) => prev.map((v) => {
                if (!v.email || v.sendStatus === 'sent') return v;
                const r = byEmail.get(v.email);
                return r ? { ...v, sendStatus: r.success ? 'sent' : 'error', sendMessage: r.message } : v;
            }));
        } catch (err) {
            setVariants((prev) => prev.map((v) => (v.sendStatus === 'sending'
                ? { ...v, sendStatus: 'error', sendMessage: err instanceof Error ? err.message : 'Send failed' }
                : v)));
        }
    };

    const sendAllDemo = async () => {
        // Phase 9: demo sends are still gated — needs_review isn't a
        // production-safety-only concern, a demo send with a bad draft is
        // still a bad test of what the recipient would have seen.
        const pending = variants.filter((v) => v.email && v.sendStatus !== 'sent' && (v.sendEligible || v.reviewedApproved));
        if (pending.length === 0) return;
        setVariants((prev) => prev.map((v) => (pending.includes(v) ? { ...v, sendStatus: 'sending' } : v)));
        try {
            const res = await apiService.sendOutreachBatch({
                permit_id: permit.id,
                permit_number: permit.permit_number,
                items: pending.map((v) => ({
                    to_email: v.email as string,
                    subject: v.subject,
                    body: v.body,
                    role: v.role,
                    contractor_id: v.contractorId,
                    needs_review: v.needsReview,
                    approved: v.reviewedApproved,
                })),
                is_demo: true,
            });
            const byEmail = new Map(res.results.map((r) => [r.to_email, r]));
            setVariants((prev) => prev.map((v) => {
                if (!v.email || v.sendStatus === 'sent') return v;
                const r = byEmail.get(v.email);
                return r ? { ...v, sendStatus: r.success ? 'sent' : 'error', sendMessage: r.message } : v;
            }));
        } catch (err) {
            setVariants((prev) => prev.map((v) => (v.sendStatus === 'sending'
                ? { ...v, sendStatus: 'error', sendMessage: err instanceof Error ? err.message : 'Send failed' }
                : v)));
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: reduce ? 0 : 0.15 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
            onClick={onClose}
        >
            <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                transition={{ duration: reduce ? 0 : 0.2 }}
                onClick={(e) => e.stopPropagation()}
                className="bg-[#1a1d2e] border border-white/10 rounded-2xl max-w-3xl w-full mx-4 shadow-2xl max-h-[88vh] flex flex-col"
            >
                {/* Header */}
                <div className="p-5 border-b border-white/[0.06] flex items-start justify-between">
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <Users size={18} className="text-cyan-400" />
                            <h2 className="text-lg font-semibold text-white">Outreach — {contractorName}</h2>
                        </div>
                        <p className="text-sm text-gray-400">
                            {permit.permit_number} &middot; {permit.city}{permit.state_code ? `, ${permit.state_code}` : ''} &middot; {permit.permit_type}
                            {permit.estimated_cost ? ` · $${permit.estimated_cost.toLocaleString()}` : ''}
                        </p>
                    </div>
                    <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/[0.06] text-gray-400 hover:text-white transition-colors focus-visible:ring-2 focus-visible:ring-cyan-500">
                        <X size={18} />
                    </button>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto p-5">
                    {/* ── Contact selection ── */}
                    {phase === 'select' && (
                        <div className="space-y-3">
                            <p className="text-xs uppercase tracking-widest text-gray-500">Select contacts</p>
                            {loadingContacts ? (
                                <div className="flex items-center justify-center py-12 gap-3 text-gray-400">
                                    <Loader2 size={20} className="animate-spin text-cyan-400" /> Loading contacts…
                                </div>
                            ) : contacts.length === 0 ? (
                                <p className="text-sm text-gray-400 py-8 text-center">No contacts found for this permit.</p>
                            ) : (
                                contacts.map((c) => {
                                    const role = c.role as PermitContactRole;
                                    return (
                                        <div key={c.id} className={`rounded-xl border p-3 transition-colors ${selected.has(c.id) ? 'border-cyan-500/40 bg-cyan-500/[0.04]' : 'border-white/[0.08] bg-white/[0.02]'}`}>
                                            <div className="flex items-start gap-3">
                                                <input
                                                    type="checkbox"
                                                    checked={selected.has(c.id)}
                                                    disabled={!c.email}
                                                    onChange={() => toggle(c.id)}
                                                    className="mt-1 h-4 w-4 accent-cyan-500 disabled:opacity-40"
                                                />
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-2 flex-wrap">
                                                        <span className={`text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded ${ROLE_BADGE[role]}`}>
                                                            {ROLE_LABELS[role]}
                                                        </span>
                                                        <span className="text-sm text-white font-medium truncate">{c.name || c.company || '—'}</span>
                                                        {c.is_demo && <span className="text-[10px] text-amber-400">(demo)</span>}
                                                    </div>
                                                    {c.email ? (
                                                        <p className="text-xs text-gray-400 mt-0.5 font-mono">{c.email}</p>
                                                    ) : (
                                                        <>
                                                            <div className="mt-2 flex items-center gap-2">
                                                                <input
                                                                    type="email"
                                                                    placeholder="Add email…"
                                                                    value={emailDrafts[c.id] || ''}
                                                                    onChange={(e) => setEmailDrafts((d) => ({ ...d, [c.id]: e.target.value }))}
                                                                    className="flex-1 px-2 py-1.5 bg-white/[0.04] border border-white/10 rounded-lg text-white text-xs focus:outline-none focus:border-cyan-500/50"
                                                                />
                                                                <button onClick={() => saveEmail(c, false)} title="Save email"
                                                                    className="inline-flex items-center gap-1 px-2 py-1.5 rounded-lg bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 border border-cyan-500/20 text-xs">
                                                                    <Plus size={12} /> Save
                                                                </button>
                                                                <button onClick={() => saveEmail(c, true)} title="Use as demo email"
                                                                    className="inline-flex items-center gap-1 px-2 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-gray-300 border border-white/10 text-xs">
                                                                    <Beaker size={12} /> Demo
                                                                </button>
                                                                <button onClick={() => findEmail(c)} disabled={findState[c.id] === 'loading'} title="Look up a business email automatically"
                                                                    className="inline-flex items-center gap-1 px-2 py-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 text-xs disabled:opacity-50">
                                                                    {findState[c.id] === 'loading' ? <Loader2 size={12} className="animate-spin" /> : <Search size={12} />} Find email
                                                                </button>
                                                            </div>
                                                            {(findState[c.id] === 'not_found' || findState[c.id] === 'error') && (
                                                                <p className={`text-[11px] mt-1 ${findState[c.id] === 'error' ? 'text-rose-400' : 'text-amber-400'}`}>
                                                                    {findMessage[c.id]}
                                                                </p>
                                                            )}
                                                        </>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })
                            )}

                            {/* Per-generation web search override — can only narrow the
                                global admin settings, never widen them. */}
                            <div className={`rounded-xl border p-3 flex items-start gap-2.5 ${webSearchAvailability?.available ? 'border-white/[0.08] bg-white/[0.02]' : 'border-white/[0.06] bg-white/[0.01] opacity-60'}`}>
                                <input
                                    type="checkbox"
                                    id="use-web-search"
                                    checked={useWebSearch}
                                    disabled={!webSearchAvailability?.available}
                                    onChange={(e) => setUseWebSearch(e.target.checked)}
                                    className="mt-0.5 h-4 w-4 accent-cyan-500 disabled:opacity-40"
                                />
                                <label htmlFor="use-web-search" className="flex-1 min-w-0">
                                    <span className="flex items-center gap-1.5 text-sm text-white font-medium">
                                        <Globe size={13} className="text-emerald-400" /> Use web search
                                    </span>
                                    <p className="text-xs text-gray-500 mt-0.5">
                                        {webSearchAvailability?.available
                                            ? 'Let Project Research fill gaps the permit record doesn’t state — adds latency'
                                            : webSearchAvailability?.reason
                                                ? WEB_SEARCH_UNAVAILABLE_REASON_LABELS[webSearchAvailability.reason] || 'Web search is currently unavailable'
                                                : 'Web search is currently unavailable'}
                                    </p>
                                </label>
                            </div>
                        </div>
                    )}

                    {phase === 'generating' && (
                        <div className="flex flex-col items-center justify-center py-16 gap-4">
                            <Loader2 size={36} className="text-cyan-400 animate-spin" />
                            <p className="text-gray-300 text-sm">Generating tailored emails for {selectedContacts.length} contact(s)…</p>
                        </div>
                    )}

                    {phase === 'error' && (
                        <div className="flex flex-col items-center justify-center py-16 gap-4">
                            <div className="p-3 rounded-xl bg-rose-500/20"><AlertCircle size={24} className="text-rose-400" /></div>
                            <p className="text-gray-300 text-sm text-center max-w-md">{error}</p>
                            <button onClick={() => setPhase('select')} className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 border border-cyan-500/20 text-sm font-medium">
                                Back to contacts
                            </button>
                        </div>
                    )}

                    {phase === 'killed' && (
                        <div className="flex flex-col items-center justify-center py-16 gap-4">
                            <div className="p-3 rounded-xl bg-gray-500/20"><Ban size={24} className="text-gray-400" /></div>
                            <p className="text-white text-sm font-medium">Lead excluded</p>
                            <p className="text-gray-400 text-sm text-center max-w-md">{killReason}</p>
                            <button onClick={() => setPhase('select')} className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 border border-cyan-500/20 text-sm font-medium">
                                Back to contacts
                            </button>
                        </div>
                    )}

                    {/* ── Review ── */}
                    {phase === 'review' && (
                        <div className="space-y-4">
                            {pricing && (
                                <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-3">
                                    <p className="text-[10px] uppercase tracking-widest text-gray-500 mb-2">Pricing (not shown in email)</p>
                                    <div className="grid grid-cols-3 gap-3 text-sm">
                                        <div>
                                            <p className="text-[10px] text-gray-500">Cold entry</p>
                                            <p className="text-white font-mono">{pricing.cold_entry || '—'}</p>
                                        </div>
                                        <div>
                                            <p className="text-[10px] text-gray-500">Ceiling</p>
                                            <p className="text-white font-mono">{pricing.ceiling || '—'}</p>
                                        </div>
                                        <div>
                                            <p className="text-[10px] text-gray-500">Full-scope target</p>
                                            <p className="text-white font-mono">{pricing.full_scope_target || '—'}</p>
                                        </div>
                                    </div>
                                    {pricing.rationale && (
                                        <p className="text-xs text-gray-400 mt-2">{pricing.rationale}</p>
                                    )}
                                </div>
                            )}
                            {researchStatus && researchStatus.requested && (
                                <div className={`rounded-xl border p-3 flex items-center gap-2 text-xs ${researchStatus.enabled && researchStatus.facts_used > 0
                                    ? 'border-emerald-500/20 bg-emerald-500/[0.04] text-emerald-400'
                                    : 'border-white/[0.08] bg-white/[0.02] text-gray-400'}`}>
                                    <Globe size={13} />
                                    {researchStatus.enabled && researchStatus.facts_used > 0
                                        ? `Web search: used, ${researchStatus.facts_used} fact${researchStatus.facts_used === 1 ? '' : 's'}`
                                        : researchStatus.enabled
                                            ? 'Web search: ran, no usable facts survived review'
                                            : 'Web search: requested but unavailable'}
                                </div>
                            )}
                            {variants.map((v, idx) => {
                                const role = (v.role || 'other') as PermitContactRole;
                                return (
                                    <div key={v.contactId} className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-4 space-y-3">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <span className={`text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded ${ROLE_BADGE[role]}`}>{ROLE_LABELS[role]}</span>
                                            <span className="text-sm text-white font-medium">{v.name || '—'}</span>
                                            <span className="text-xs text-gray-500 font-mono">{v.email}</span>
                                            {v.wordCount !== null && (
                                                <span className="text-[10px] text-gray-500 font-mono ml-auto">{v.wordCount} words</span>
                                            )}
                                        </div>
                                        {v.needsReview && (
                                            <div className="flex items-start gap-2 rounded-lg bg-amber-500/10 border border-amber-500/20 px-2.5 py-2">
                                                <TriangleAlert size={13} className="text-amber-400 mt-0.5 shrink-0" />
                                                <div className="text-xs text-amber-300 space-y-1.5 flex-1">
                                                    <p className="font-medium">Needs review — didn&apos;t pass all quality checks</p>
                                                    {v.gateFailures.length > 0 && (
                                                        <ul className="list-disc list-inside text-amber-300/80">
                                                            {v.gateFailures.map((f, i) => <li key={i}>{f}</li>)}
                                                        </ul>
                                                    )}
                                                    <label className="flex items-center gap-1.5 pt-0.5 cursor-pointer select-none">
                                                        <input
                                                            type="checkbox"
                                                            checked={v.reviewedApproved}
                                                            onChange={(e) => updateVariant(idx, { reviewedApproved: e.target.checked })}
                                                            className="accent-amber-400"
                                                        />
                                                        <span>I&apos;ve reviewed this draft and approve sending it anyway</span>
                                                    </label>
                                                </div>
                                            </div>
                                        )}
                                        <input
                                            type="text"
                                            value={v.subject}
                                            onChange={(e) => updateVariant(idx, { subject: e.target.value })}
                                            className="w-full px-3 py-2 bg-white/[0.04] border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:border-cyan-500/50"
                                        />
                                        <textarea
                                            value={v.body}
                                            onChange={(e) => updateVariant(idx, { body: e.target.value })}
                                            rows={8}
                                            className="w-full px-3 py-2 bg-white/[0.04] border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:border-cyan-500/50 resize-y font-mono"
                                        />
                                        <div className="flex items-center justify-end gap-2">
                                            {v.sendMessage && v.sendStatus === 'error' && (
                                                <span className="text-xs text-rose-400">{v.sendMessage}</span>
                                            )}
                                            <button
                                                onClick={() => sendOne(idx)}
                                                disabled={!v.email || v.sendStatus === 'sending' || v.sendStatus === 'sent' || (!v.sendEligible && !v.reviewedApproved)}
                                                title={!v.sendEligible && !v.reviewedApproved ? 'Approve the review checkbox above before sending' : undefined}
                                                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                                                    v.sendStatus === 'sent' ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                                                        : 'bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 border border-cyan-500/20'}`}
                                            >
                                                {v.sendStatus === 'sending' ? <><Loader2 size={12} className="animate-spin" /> Sending…</>
                                                    : v.sendStatus === 'sent' ? <><Check size={12} /> Sent</>
                                                        : <><Send size={12} /> Send</>}
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}

                            {/* Comment + regenerate */}
                            <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-3 space-y-2">
                                <label className="text-[10px] uppercase tracking-widest text-gray-500">Adjust / regenerate</label>
                                <textarea
                                    value={instructions}
                                    onChange={(e) => setInstructions(e.target.value)}
                                    rows={2}
                                    placeholder="e.g. make it more concise, mention our local references…"
                                    className="w-full px-3 py-2 bg-white/[0.04] border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:border-cyan-500/50 resize-y"
                                />
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-white/[0.06] flex items-center gap-2 flex-wrap">
                    {phase === 'select' && (
                        <>
                            <span className="text-xs text-gray-400">{selectedContacts.length} selected</span>
                            <div className="flex-1" />
                            <button
                                onClick={generate}
                                disabled={!allSelectedHaveEmail}
                                title={!allSelectedHaveEmail ? 'Select at least one contact with an email' : ''}
                                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 border border-cyan-500/20 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <Mail size={14} /> Generate emails
                            </button>
                        </>
                    )}
                    {phase === 'review' && (
                        <>
                            <button onClick={() => setPhase('select')} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 border border-white/10 text-xs font-medium">
                                Back
                            </button>
                            <button onClick={handleRegenerate} disabled={isRegenerating}
                                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 border border-white/10 text-xs font-medium disabled:opacity-50">
                                <RefreshCw size={13} className={isRegenerating ? 'animate-spin' : ''} /> Regenerate
                            </button>
                            <div className="flex-1" />
                            <button
                                onClick={sendAllDemo}
                                disabled={!variants.some((v) => v.email && v.sendStatus !== 'sent' && (v.sendEligible || v.reviewedApproved))}
                                title="Send via a warming inbox — does not count against quota"
                                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/20 text-xs font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <Beaker size={13} /> Test Send (Warmup)
                            </button>
                            <button onClick={sendAll}
                                disabled={!variants.some((v) => v.email && v.sendStatus !== 'sent' && (v.sendEligible || v.reviewedApproved))}
                                title={variants.some((v) => v.needsReview && !v.reviewedApproved) ? 'Some drafts need review — approve them individually first, or Send all skips them' : undefined}
                                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 border border-cyan-500/20 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed">
                                <Send size={14} /> Send all
                            </button>
                        </>
                    )}
                </div>
            </motion.div>
        </motion.div>
    );
}
