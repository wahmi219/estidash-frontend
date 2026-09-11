'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
    ArrowLeft,
    AlertCircle,
    HardHat,
    MapPin,
    Mail,
    Phone,
    Globe,
    Hash,
    Shield,
    FileText,
    Calendar,
    Building2,
    ExternalLink,
} from 'lucide-react';
import { apiService } from '@/services/api';
import { ContractorRecord, PermitRecord, PermitPagination as PaginationType } from '@/types';
import {
    IdentityStrengthBadge,
    ContactabilityBadge,
    LicenseReadinessBadge,
    NameQualityFlag,
} from '@/components/contractors';
import PermitPaginationControls from '@/components/permits/PermitPagination';

// ============================================================================
// Helpers — local copies matching the formatting conventions already used in
// permits/[id]/page.tsx and PermitRow.tsx (neither export theirs to share).
// ============================================================================

function formatCurrency(value: number | null | undefined): string {
    if (value === null || value === undefined || value === 0) return '—';
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        maximumFractionDigits: 0,
    }).format(value);
}

function formatDate(dateStr: string | null | undefined): string {
    if (!dateStr) return '—';
    const parts = String(dateStr).split('T')[0].split('-');
    if (parts.length === 3 && parts[0].length === 4) {
        const d = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
        if (!isNaN(d.getTime())) {
            return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
        }
    }
    return String(dateStr);
}

const READINESS_COPY: Record<string, string> = {
    ready: 'License number and state are both on file.',
    needs_state: 'License number is on file, but the state that issued it is not — recovering the state is the blocking step before any registry lookup.',
    no_license: 'No license number is on file for this contractor.',
    invalid_format: 'The license number on file matches a placeholder or invalid pattern.',
};

function DetailRow({
    icon: Icon,
    label,
    value,
    href,
    mono,
}: {
    icon: React.ComponentType<{ size?: number; className?: string }>;
    label: string;
    value: string | null | undefined;
    href?: string;
    mono?: boolean;
}) {
    const isEmpty = !value;
    return (
        <div className="flex items-center gap-3 py-2 px-3 rounded-lg hover:bg-[#F7F9FB] transition-colors">
            <Icon size={14} className="text-[#5B6B7D] flex-shrink-0" />
            <span className="text-xs text-[#5B6B7D] uppercase tracking-wider w-24 flex-shrink-0">{label}</span>
            {href && !isEmpty ? (
                <a href={href} className={`text-sm text-[#00458B] hover:text-[#045CB4] transition-colors truncate ${mono ? 'font-mono text-xs' : ''}`}>
                    {value}
                </a>
            ) : (
                <span className={`text-sm truncate ${isEmpty ? 'text-[#5B6B7D] italic' : 'text-[#0E2B5C]'} ${mono ? 'font-mono text-xs' : ''}`}>
                    {isEmpty ? 'Not present' : value}
                </span>
            )}
        </div>
    );
}

function MetricCard({
    icon: Icon,
    label,
    value,
    subtext,
}: {
    icon: React.ComponentType<{ size?: number; className?: string }>;
    label: string;
    value: string;
    subtext?: string;
}) {
    const isEmpty = value === '—';
    return (
        <div className="bg-[#F7F9FB] border border-[#DFE6EE] rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
                <Icon size={14} className={isEmpty ? 'text-[#5B6B7D]' : 'text-[#00458B]'} />
                <span className="text-[11px] text-[#5B6B7D] uppercase tracking-wider font-medium">{label}</span>
            </div>
            <p className={`text-lg font-mono font-semibold ${isEmpty ? 'text-[#5B6B7D] italic text-sm' : 'text-[#0E2B5C]'}`}>
                {value}
            </p>
            {subtext && !isEmpty && <p className="text-[11px] text-[#5B6B7D] mt-1">{subtext}</p>}
        </div>
    );
}

// ============================================================================
// Main Page
// ============================================================================

export default function ContractorDetailPage() {
    const params = useParams();
    const router = useRouter();
    const contractorId = params.id as string;

    const [contractor, setContractor] = useState<ContractorRecord | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [permits, setPermits] = useState<PermitRecord[]>([]);
    const [permitsLoading, setPermitsLoading] = useState(true);
    const [permitsError, setPermitsError] = useState<string | null>(null);
    const [pagination, setPagination] = useState<PaginationType>({
        page: 1,
        pageSize: 25,
        totalRecords: 0,
        totalPages: 0,
    });

    const [emailActionError, setEmailActionError] = useState<string | null>(null);
    const [newEmail, setNewEmail] = useState('');
    const [addingEmail, setAddingEmail] = useState(false);

    const refetchContractor = useCallback(async () => {
        if (!contractorId) return;
        try {
            setError(null);
            const data = await apiService.getContractorById(contractorId);
            setContractor(data);
        } catch (err) {
            const message =
                err && typeof err === 'object' && 'message' in err
                    ? (err as { message: string }).message
                    : 'Failed to load contractor details';
            setError(message);
        } finally {
            setLoading(false);
        }
    }, [contractorId]);

    useEffect(() => {
        if (!contractorId) return;
        setLoading(true);
        refetchContractor();
    }, [contractorId, refetchContractor]);

    async function handleAddEmail(e: React.FormEvent) {
        e.preventDefault();
        if (!newEmail.trim()) return;
        setAddingEmail(true);
        setEmailActionError(null);
        try {
            await apiService.addContractorEmail(contractorId, newEmail.trim());
            setNewEmail('');
            await refetchContractor();
        } catch (err) {
            const message =
                err && typeof err === 'object' && 'message' in err
                    ? (err as { message: string }).message
                    : 'Could not add email';
            setEmailActionError(message);
        } finally {
            setAddingEmail(false);
        }
    }

    async function handleSetPrimary(emailId: string) {
        setEmailActionError(null);
        try {
            await apiService.setContractorEmailPrimary(contractorId, emailId);
            await refetchContractor();
        } catch {
            setEmailActionError('Could not set this email as Primary');
        }
    }

    async function handleMarkUnusable(email: string) {
        setEmailActionError(null);
        try {
            await apiService.markContractorEmailUnusable(contractorId, email);
            await refetchContractor();
        } catch {
            setEmailActionError('Could not mark this email unusable');
        }
    }

    const fetchPermits = useCallback(async (page: number, pageSize: number) => {
        if (!contractorId) return;
        try {
            setPermitsLoading(true);
            setPermitsError(null);
            const offset = (page - 1) * pageSize;
            const result = await apiService.getContractorPermits(contractorId, pageSize, offset);
            setPermits(result.data);
            setPagination({
                page,
                pageSize,
                totalRecords: result.total,
                totalPages: Math.max(1, Math.ceil(result.total / pageSize)),
            });
        } catch {
            setPermitsError('Failed to load permit history');
        } finally {
            setPermitsLoading(false);
        }
    }, [contractorId]);

    useEffect(() => {
        fetchPermits(1, 25);
    }, [fetchPermits]);

    // Loading state
    if (loading) {
        return (
            <div className="p-6 space-y-5 max-w-[1100px] mx-auto bg-[#F7F9FB] min-h-screen">
                <button onClick={() => router.back()} className="flex items-center gap-2 text-[#5B6B7D] hover:text-[#0E2B5C] transition-colors">
                    <ArrowLeft size={18} /> Back
                </button>
                <div className="animate-pulse space-y-4">
                    <div className="h-32 bg-[#DFE6EE] rounded-xl" />
                    <div className="grid grid-cols-3 gap-3">
                        {[1, 2, 3].map(i => <div key={i} className="h-24 bg-[#DFE6EE] rounded-xl" />)}
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="h-64 bg-[#DFE6EE] rounded-xl" />
                        <div className="h-64 bg-[#DFE6EE] rounded-xl" />
                    </div>
                </div>
            </div>
        );
    }

    // Error state
    if (error || !contractor) {
        return (
            <div className="p-6 space-y-5 max-w-[1100px] mx-auto bg-[#F7F9FB] min-h-screen">
                <button onClick={() => router.back()} className="flex items-center gap-2 text-[#5B6B7D] hover:text-[#0E2B5C] transition-colors">
                    <ArrowLeft size={18} /> Back
                </button>
                <div className="flex flex-col items-center justify-center py-20 text-center">
                    <div className="w-16 h-16 rounded-2xl bg-red-50 border border-red-200 flex items-center justify-center mb-4">
                        <AlertCircle size={28} className="text-red-600" />
                    </div>
                    <h2 className="text-xl font-semibold text-[#0E2B5C] mb-2">Contractor Not Found</h2>
                    <p className="text-[#5B6B7D] max-w-md mb-6">{error || 'The contractor you are looking for could not be found.'}</p>
                    <button
                        onClick={() => router.push('/dashboard/contractors')}
                        className="px-5 py-2.5 bg-[#00458B]/10 hover:bg-[#00458B]/20 border border-[#00458B]/20 text-[#00458B] rounded-lg transition-colors text-sm font-medium"
                    >
                        Return to Contractors
                    </button>
                </div>
            </div>
        );
    }

    const summary = contractor.permit_summary;

    // Identity/contact fields used for the "missing fields" data-quality list —
    // mirrors the exact 5+3 signals identity_strength/contactability are
    // computed from server-side (contractor_completeness_service.py), so this
    // list never implies more/less than what those badges already represent.
    const identityFields: { label: string; present: boolean }[] = [
        { label: 'Name', present: !!contractor.name },
        { label: 'License number', present: !!contractor.license_number },
        { label: 'State', present: !!contractor.state_code },
        { label: 'Address', present: !!contractor.address_line },
        { label: 'Phone', present: !!contractor.phone },
    ];
    const contactFields: { label: string; present: boolean }[] = [
        { label: 'Email', present: !!contractor.email },
        { label: 'Phone', present: !!contractor.phone },
        { label: 'Website', present: !!contractor.website },
    ];
    const missingFields = [...identityFields, ...contactFields].filter(f => !f.present);

    const conflicts = (contractor.extra_data?.ingestion_contact_conflicts ?? null) as Record<string, unknown> | null;
    const similarRecords = contractor.possible_similar_records ?? [];

    return (
        <div className="p-6 space-y-5 max-w-[1100px] mx-auto bg-[#F7F9FB] min-h-screen">
            {/* Back Button */}
            <button
                onClick={() => router.back()}
                className="flex items-center gap-2 text-[#5B6B7D] hover:text-[#0E2B5C] transition-colors group"
            >
                <ArrowLeft size={16} className="group-hover:-translate-x-0.5 transition-transform" />
                <span className="text-sm">Back to Contractors</span>
            </button>

            {/* ─── HEADER CARD ─── */}
            <div className="bg-white border border-[#DFE6EE] rounded-xl px-6 py-6">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                    <div className="space-y-3">
                        <div className="flex items-center gap-3 flex-wrap">
                            <div className="w-10 h-10 rounded-lg bg-[#00458B] flex items-center justify-center text-white shrink-0">
                                <HardHat size={20} />
                            </div>
                            <h1 className="text-xl sm:text-2xl font-bold text-[#0E2B5C] tracking-tight">
                                {contractor.name}
                            </h1>
                            <NameQualityFlag value={contractor.name_quality} />
                        </div>
                        {contractor.name_quality === 'questionable' && (
                            <p className="text-xs text-amber-700">
                                This name may not be a real business name — it looks like it came from bad source data during ingestion, not a real contractor. Shown as recorded.
                            </p>
                        )}

                        <div className="flex items-center gap-2 flex-wrap">
                            <IdentityStrengthBadge value={contractor.identity_strength} />
                            <ContactabilityBadge value={contractor.contactability} />
                            <LicenseReadinessBadge value={contractor.license_readiness} />
                        </div>

                        <div className="flex items-center gap-3 text-[#5B6B7D] text-sm flex-wrap">
                            {(contractor.city || contractor.state_code) && (
                                <span className="flex items-center gap-1.5">
                                    <MapPin size={13} className="text-[#5B6B7D]" />
                                    {[contractor.city, contractor.state_code].filter(Boolean).join(', ')}
                                </span>
                            )}
                            {contractor.contractor_types.length > 0 && (
                                <span className="flex items-center gap-1.5 flex-wrap">
                                    {contractor.contractor_types.map(t => (
                                        <span key={t} className="px-2 py-0.5 bg-[#F7F9FB] text-[#5B6B7D] border border-[#DFE6EE] rounded text-[11px] capitalize">
                                            {t}
                                        </span>
                                    ))}
                                </span>
                            )}
                        </div>
                    </div>

                    <div className="text-right flex-shrink-0">
                        <p className="text-3xl font-bold text-[#00458B] font-mono">
                            {(summary?.total ?? contractor.permit_count).toLocaleString()}
                        </p>
                        <p className="text-[11px] text-[#5B6B7D] uppercase tracking-wider mt-1">Total Permits</p>
                    </div>
                </div>
            </div>

            {/* Permit summary metrics */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <MetricCard icon={Calendar} label="First Seen" value={formatDate(summary?.first_seen)} />
                <MetricCard icon={Calendar} label="Last Seen" value={formatDate(summary?.last_seen ?? contractor.latest_permit_date)} />
                <MetricCard
                    icon={Building2}
                    label="Top City"
                    value={summary?.top_cities?.[0]?.city ?? '—'}
                    subtext={summary?.top_cities?.[0] ? `${summary.top_cities[0].count} permits` : undefined}
                />
            </div>

            {/* Identity + Contact */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-white border border-[#DFE6EE] rounded-xl p-4 space-y-1">
                    <h3 className="text-xs text-[#5B6B7D] uppercase tracking-wider font-semibold mb-2 flex items-center gap-2">
                        <Shield size={13} /> Identity
                    </h3>
                    <DetailRow icon={Hash} label="License #" value={contractor.license_number} mono />
                    <DetailRow icon={FileText} label="License Type" value={contractor.license_type} />
                    <DetailRow icon={MapPin} label="State" value={contractor.state_code} />
                    <DetailRow icon={MapPin} label="Address" value={contractor.address_line} />

                    {/* License Enrichment Readiness — non-interactive status card, not a
                        button. Registry lookups are a later phase; this only shows what's
                        already known. */}
                    <div className="mt-3 pt-3 border-t border-[#DFE6EE]">
                        <p className="text-[11px] text-[#5B6B7D] uppercase tracking-wider font-medium mb-2">
                            License Enrichment Readiness
                        </p>
                        <div className="flex items-center gap-2 mb-1.5">
                            <LicenseReadinessBadge value={contractor.license_readiness} />
                        </div>
                        <p className="text-xs text-[#5B6B7D] leading-relaxed">
                            {READINESS_COPY[contractor.license_readiness]}
                        </p>
                    </div>
                </div>

                <div className="bg-white border border-[#DFE6EE] rounded-xl p-4 space-y-1">
                    <h3 className="text-xs text-[#5B6B7D] uppercase tracking-wider font-semibold mb-2 flex items-center gap-2">
                        <Mail size={13} /> Contact Information
                    </h3>
                    <DetailRow icon={Mail} label="Email" value={contractor.email} href={contractor.email ? `mailto:${contractor.email}` : undefined} />
                    <DetailRow icon={Phone} label="Phone" value={contractor.phone} href={contractor.phone ? `tel:${contractor.phone}` : undefined} />
                    <DetailRow icon={Globe} label="Website" value={contractor.website} href={contractor.website ?? undefined} />

                    {/* Terminology discipline: these fields are only ever shown as
                        "present" — never "verified". Verification would require an
                        external lookup, which this phase deliberately does not do. */}
                    <p className="text-[11px] text-[#5B6B7D] mt-3 pt-3 border-t border-[#DFE6EE] leading-relaxed">
                        Values shown above are as recorded from permit data — presence only,
                        not independently verified.
                    </p>
                </div>
            </div>

            {/* Data Quality */}
            <div className="bg-white border border-[#DFE6EE] rounded-xl p-4">
                <h3 className="text-xs text-[#5B6B7D] uppercase tracking-wider font-semibold mb-3">Data Quality</h3>
                {missingFields.length === 0 ? (
                    <p className="text-sm text-[#5B6B7D]">All identity and contact fields are present.</p>
                ) : (
                    <div className="flex flex-wrap gap-2">
                        {missingFields.map(f => (
                            <span key={f.label} className="px-2 py-1 bg-amber-50 text-amber-700 border border-amber-200 rounded text-[11px]">
                                Missing: {f.label}
                            </span>
                        ))}
                    </div>
                )}
                {conflicts && Object.keys(conflicts).length > 0 && (
                    <div className="mt-3 pt-3 border-t border-[#DFE6EE]">
                        <p className="text-[11px] text-[#5B6B7D] uppercase tracking-wider font-medium mb-2">
                            Recorded Contact Conflicts
                        </p>
                        <p className="text-xs text-[#5B6B7D] mb-2 leading-relaxed">
                            A different value was seen for these fields during ingestion but not applied,
                            since a value already existed.
                        </p>
                        <div className="flex flex-wrap gap-2">
                            {Object.entries(conflicts).map(([field, value]) => (
                                <span key={field} className="px-2 py-1 bg-gray-100 text-[#5B6B7D] border border-[#DFE6EE] rounded text-[11px] font-mono">
                                    {field}: {String(value)}
                                </span>
                            ))}
                        </div>
                    </div>
                )}
                {similarRecords.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-[#DFE6EE]">
                        <p className="text-[11px] text-[#5B6B7D] uppercase tracking-wider font-medium mb-2">
                            Possible Similar Records
                        </p>
                        <p className="text-xs text-[#5B6B7D] mb-2 leading-relaxed">
                            These contractors have a matching normalized name plus at least one other
                            matching field (phone, address, email, license, or city/state) — not
                            necessarily duplicates. No records are merged automatically.
                        </p>
                        <div className="space-y-1.5">
                            {similarRecords.map(m => (
                                <Link
                                    key={m.id}
                                    href={`/dashboard/contractors/${m.id}`}
                                    className="flex items-center justify-between gap-3 px-3 py-2 bg-[#F7F9FB] hover:bg-[#DFE6EE] rounded-lg transition-colors"
                                >
                                    <span className="text-sm text-[#00458B] hover:text-[#045CB4] truncate">{m.name}</span>
                                    <span className="flex items-center gap-1.5 flex-shrink-0">
                                        {m.matched_signals.map(sig => (
                                            <span key={sig} className="px-1.5 py-0.5 bg-gray-100 text-[#5B6B7D] border border-[#DFE6EE] rounded text-[10px] uppercase tracking-wide">
                                                {sig.replace('_', ' + ')}
                                            </span>
                                        ))}
                                        <span className="text-[11px] text-[#5B6B7D] font-mono">{m.permit_count} permits</span>
                                    </span>
                                </Link>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* Emails — Contractor Master's own email list, distinct from
                Contact Information above (which shows the legacy single
                Contractor.email column). Multiple emails, one Primary,
                usability tracked per-address; email is a contact channel,
                never treated as company identity. */}
            <div className="bg-white border border-[#DFE6EE] rounded-xl p-4">
                <h3 className="text-xs text-[#5B6B7D] uppercase tracking-wider font-semibold mb-3 flex items-center gap-2">
                    <Mail size={13} /> Emails
                </h3>
                {emailActionError && (
                    <p className="text-xs text-red-600 mb-2">{emailActionError}</p>
                )}
                {(!contractor.emails || contractor.emails.length === 0) ? (
                    <p className="text-sm text-[#5B6B7D] mb-3">No emails on file yet.</p>
                ) : (
                    <div className="space-y-1.5 mb-3">
                        {contractor.emails.map((e) => (
                            <div key={e.id} className="flex items-center justify-between gap-3 px-3 py-2 bg-[#F7F9FB] rounded-lg text-sm">
                                <div className="flex items-center gap-2 min-w-0">
                                    <span className="truncate text-[#0E2B5C]">{e.email}</span>
                                    {e.is_primary && (
                                        <span className="shrink-0 px-1.5 py-0.5 bg-[#00458B]/10 text-[#00458B] border border-[#00458B]/20 rounded text-[10px] font-semibold uppercase tracking-wide">Primary</span>
                                    )}
                                    <span className={`shrink-0 px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wide border ${
                                        e.status === 'usable' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-red-50 text-red-700 border-red-200'
                                    }`}>
                                        {e.status}
                                    </span>
                                </div>
                                <div className="flex items-center gap-2 shrink-0">
                                    {!e.is_primary && e.status === 'usable' && (
                                        <button onClick={() => handleSetPrimary(e.id)} className="text-xs text-[#00458B] hover:underline">
                                            Set Primary
                                        </button>
                                    )}
                                    {e.status === 'usable' && (
                                        <button onClick={() => handleMarkUnusable(e.email)} className="text-xs text-[#5B6B7D] hover:text-red-600">
                                            Mark Bad
                                        </button>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
                <form onSubmit={handleAddEmail} className="flex items-center gap-2">
                    <input
                        type="email"
                        value={newEmail}
                        onChange={(e) => setNewEmail(e.target.value)}
                        placeholder="Add an email address"
                        className="flex-1 px-3 py-1.5 text-sm border border-[#DFE6EE] rounded-lg focus-visible:ring-2 focus-visible:ring-[#00458B] outline-none"
                    />
                    <button
                        type="submit"
                        disabled={addingEmail || !newEmail.trim()}
                        className="px-3 py-1.5 text-sm bg-[#00458B] hover:bg-[#045CB4] disabled:opacity-50 text-white rounded-lg transition-colors"
                    >
                        {addingEmail ? 'Adding…' : 'Add'}
                    </button>
                </form>
            </div>

            {/* Aliases */}
            {contractor.aliases && contractor.aliases.length > 0 && (
                <div className="bg-white border border-[#DFE6EE] rounded-xl p-4">
                    <h3 className="text-xs text-[#5B6B7D] uppercase tracking-wider font-semibold mb-3 flex items-center gap-2">
                        <Shield size={13} /> Aliases
                    </h3>
                    <div className="flex flex-wrap gap-2">
                        {contractor.aliases.map((a) => (
                            <span key={a} className="px-2 py-1 bg-[#F7F9FB] text-[#0E2B5C] border border-[#DFE6EE] rounded text-xs">{a}</span>
                        ))}
                    </div>
                </div>
            )}

            {/* Licenses — deliberately a LIST, not a single field. The
                backend's contractor_licenses child table isn't built yet
                (Phase 9 requirement update) -- today's single
                license_number/license_type shows as one item so this
                section needs no rework once the child table ships. Never
                fabricates additional licenses. */}
            <div className="bg-white border border-[#DFE6EE] rounded-xl p-4">
                <h3 className="text-xs text-[#5B6B7D] uppercase tracking-wider font-semibold mb-3 flex items-center gap-2">
                    <Hash size={13} /> Licenses
                </h3>
                {contractor.license_number ? (
                    <div className="flex items-center justify-between px-3 py-2 bg-[#F7F9FB] rounded-lg text-sm">
                        <span className="font-mono text-[#0E2B5C]">{contractor.license_number}</span>
                        <span className="text-xs text-[#5B6B7D]">{contractor.license_type || '—'}</span>
                    </div>
                ) : (
                    <p className="text-sm text-[#5B6B7D]">No license on file.</p>
                )}
                <p className="text-[11px] text-[#5B6B7D] mt-3 pt-3 border-t border-[#DFE6EE] leading-relaxed">
                    Multi-license support (a company holding more than one trade license) is an
                    approved future architecture change, not yet built — this list shows exactly
                    what the backend has today.
                </p>
            </div>

            {/* CRM — Lead Bank V2 relationship, if one exists. A new
                qualified permit for this Contractor ID always reuses this
                same relationship; it never creates a second one. */}
            <div className="bg-white border border-[#DFE6EE] rounded-xl p-4">
                <h3 className="text-xs text-[#5B6B7D] uppercase tracking-wider font-semibold mb-3 flex items-center gap-2">
                    <Building2 size={13} /> Lead Bank / CRM
                </h3>
                {contractor.lead_bank ? (
                    <div className="grid grid-cols-2 gap-3 text-sm">
                        <DetailRow icon={Shield} label="Relationship Status" value={contractor.lead_bank.relationship_status.replace(/_/g, ' ')} />
                        <DetailRow icon={Mail} label="Outreach Status" value={contractor.lead_bank.outreach_status.replace(/_/g, ' ')} />
                        <DetailRow icon={Hash} label="Sales Owner" value={contractor.lead_bank.sales_owner_id ? `User #${contractor.lead_bank.sales_owner_id}` : 'Unassigned'} />
                        <DetailRow icon={AlertCircle} label="Do Not Contact" value={contractor.lead_bank.dnc ? 'Yes' : 'No'} />
                    </div>
                ) : (
                    <p className="text-sm text-[#5B6B7D]">
                        No Lead Bank relationship yet — this contractor is not already in another
                        company&apos;s record; adding a Ready-for-Lead-Bank opportunity will create one.
                    </p>
                )}
            </div>

            {/* Permit History */}
            <div className="bg-white border border-[#DFE6EE] rounded-xl p-4">
                <h3 className="text-xs text-[#5B6B7D] uppercase tracking-wider font-semibold mb-3">Permit History</h3>

                {permitsError && (
                    <p className="text-sm text-red-600 mb-3">{permitsError}</p>
                )}

                {permitsLoading ? (
                    <div className="animate-pulse space-y-2">
                        {[1, 2, 3].map(i => <div key={i} className="h-10 bg-[#F7F9FB] rounded-lg" />)}
                    </div>
                ) : permits.length === 0 ? (
                    <p className="text-sm text-[#5B6B7D]">No permits on file for this contractor.</p>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="text-left text-[10px] uppercase tracking-widest text-[#5B6B7D] border-b border-[#DFE6EE]">
                                    <th className="py-2 pr-3 font-medium">Permit #</th>
                                    <th className="py-2 pr-3 font-medium">Type</th>
                                    <th className="py-2 pr-3 font-medium">Status</th>
                                    <th className="py-2 pr-3 font-medium">City</th>
                                    <th className="py-2 pr-3 font-medium">Issued</th>
                                    <th className="py-2 pr-3 font-medium text-right">Cost</th>
                                    <th className="py-2 pl-3 font-medium w-8" />
                                </tr>
                            </thead>
                            <tbody>
                                {permits.map(p => (
                                    <tr
                                        key={p.id}
                                        onClick={() => router.push(`/dashboard/permits/${p.id}`)}
                                        className="border-b border-[#DFE6EE] hover:bg-[#F7F9FB] cursor-pointer transition-colors"
                                    >
                                        <td className="py-2 pr-3 font-mono text-xs text-[#0E2B5C]">{p.permit_number}</td>
                                        <td className="py-2 pr-3 text-[#0E2B5C]">{p.permit_type}</td>
                                        <td className="py-2 pr-3 text-[#5B6B7D]">{p.status}</td>
                                        <td className="py-2 pr-3 text-[#5B6B7D]">{p.city}{p.state_code ? `, ${p.state_code}` : ''}</td>
                                        <td className="py-2 pr-3 font-mono text-xs text-[#5B6B7D]">{formatDate(p.issue_date || p.application_date)}</td>
                                        <td className="py-2 pr-3 font-mono text-xs text-right text-[#0E2B5C]">{formatCurrency(p.estimated_cost)}</td>
                                        <td className="py-2 pl-3 text-[#5B6B7D]">
                                            <ExternalLink size={12} />
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                {!permitsLoading && permits.length > 0 && (
                    <div className="mt-3">
                        <PermitPaginationControls
                            pagination={pagination}
                            onPageChange={(page) => fetchPermits(page, pagination.pageSize)}
                            onPageSizeChange={(size) => fetchPermits(1, size)}
                        />
                    </div>
                )}
            </div>
        </div>
    );
}
