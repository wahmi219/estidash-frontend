'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
    ArrowLeft,
    AlertCircle,
    ShieldCheck,
    MapPin,
    Phone,
    Mail,
    Hash,
    FileText,
    Calendar,
    Building2,
    UserRound,
    Layers,
    Link2,
    Copy,
    Check,
    ChevronDown,
    ChevronUp,
    ExternalLink,
} from 'lucide-react';
import { apiService } from '@/services/api';
import { RegistryRecordDetail } from '@/types';

// ============================================================================
// Helpers — local copies matching the formatting conventions already used in
// contractors/[id]/page.tsx and permits/[id]/page.tsx (neither export theirs
// to share, same convention followed here).
// ============================================================================

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

function formatDateTime(dateStr: string | null | undefined): string {
    if (!dateStr) return '—';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return String(dateStr);
    return d.toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function CopyIconButton({ value }: { value: string }) {
    const [copied, setCopied] = useState(false);
    async function handleCopy() {
        try {
            await navigator.clipboard.writeText(value);
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
        } catch {
            // clipboard not available; silently ignore
        }
    }
    return (
        <button
            onClick={handleCopy}
            title="Copy to clipboard"
            className="text-gray-500 hover:text-cyan-400 transition-colors flex-shrink-0"
        >
            {copied ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
        </button>
    );
}

function DetailRow({
    icon: Icon,
    label,
    value,
    href,
    mono,
    copyable,
}: {
    icon: React.ComponentType<{ size?: number; className?: string }>;
    label: string;
    value: string | null | undefined;
    href?: string;
    mono?: boolean;
    copyable?: boolean;
}) {
    const isEmpty = !value;
    return (
        <div className="flex items-center gap-3 py-2 px-3 rounded-lg hover:bg-black/2 dark:hover:bg-white/2 transition-colors">
            <Icon size={14} className="text-gray-600 flex-shrink-0" />
            <span className="text-xs text-gray-500 uppercase tracking-wider w-32 flex-shrink-0">{label}</span>
            {href && !isEmpty ? (
                <a href={href} className={`text-sm text-cyan-400 hover:text-cyan-300 transition-colors truncate ${mono ? 'font-mono text-xs' : ''}`}>
                    {value}
                </a>
            ) : (
                <span className={`text-sm truncate ${isEmpty ? 'text-gray-600 italic' : 'text-gray-700 dark:text-gray-200'} ${mono ? 'font-mono text-xs' : ''}`}>
                    {isEmpty ? 'Not present' : value}
                </span>
            )}
            {copyable && !isEmpty && <CopyIconButton value={value as string} />}
        </div>
    );
}

// ============================================================================
// Main Page
// ============================================================================

export default function RegistryDetailPage() {
    const params = useParams();
    const router = useRouter();
    const recordId = params.id as string;

    const [record, setRecord] = useState<RegistryRecordDetail | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Developer — Raw JSON: single-row fetch, only on expand (plan section 8,
    // 11 point 7 — include_raw never touches the list path).
    const [showRawData, setShowRawData] = useState(false);
    const [rawPayload, setRawPayload] = useState<Record<string, unknown> | null>(null);
    const [rawLoading, setRawLoading] = useState(false);
    const [rawFetched, setRawFetched] = useState(false);
    const [copiedRaw, setCopiedRaw] = useState(false);

    useEffect(() => {
        if (!recordId) return;
        async function fetchRecord() {
            try {
                setLoading(true);
                setError(null);
                const data = await apiService.getRegistryRecord(recordId);
                setRecord(data);
            } catch (err) {
                const message =
                    err && typeof err === 'object' && 'message' in err
                        ? (err as { message: string }).message
                        : 'Failed to load registry record';
                setError(message);
            } finally {
                setLoading(false);
            }
        }
        fetchRecord();
    }, [recordId]);

    async function loadRawPayload() {
        if (rawFetched || rawLoading) return;
        setRawLoading(true);
        try {
            const detail = await apiService.getRegistryRecord(recordId, true);
            setRawPayload(detail.raw_payload ?? {});
        } catch {
            setRawPayload({});
        } finally {
            setRawFetched(true);
            setRawLoading(false);
        }
    }

    function toggleRawData() {
        setShowRawData((prev) => {
            const next = !prev;
            if (next && !rawFetched) loadRawPayload();
            return next;
        });
    }

    async function handleCopyRawData() {
        if (!rawPayload) return;
        try {
            await navigator.clipboard.writeText(JSON.stringify(rawPayload, null, 2));
            setCopiedRaw(true);
            setTimeout(() => setCopiedRaw(false), 2000);
        } catch {
            // clipboard not available; silently ignore
        }
    }

    // Loading state
    if (loading) {
        return (
            <div className="p-6 space-y-5 max-w-[1100px] mx-auto">
                <button onClick={() => router.back()} className="flex items-center gap-2 text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors">
                    <ArrowLeft size={18} /> Back
                </button>
                <div className="animate-pulse space-y-4">
                    <div className="h-32 bg-black/2 dark:bg-white/3 rounded-2xl" />
                    <div className="grid grid-cols-2 gap-4">
                        <div className="h-64 bg-black/2 dark:bg-white/3 rounded-xl" />
                        <div className="h-64 bg-black/2 dark:bg-white/3 rounded-xl" />
                    </div>
                </div>
            </div>
        );
    }

    // Error state
    if (error || !record) {
        return (
            <div className="p-6 space-y-5 max-w-[1100px] mx-auto">
                <button onClick={() => router.back()} className="flex items-center gap-2 text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors">
                    <ArrowLeft size={18} /> Back
                </button>
                <div className="flex flex-col items-center justify-center py-20 text-center">
                    <div className="w-16 h-16 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center mb-4">
                        <AlertCircle size={28} className="text-red-400" />
                    </div>
                    <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">Registry Record Not Found</h2>
                    <p className="text-gray-500 dark:text-gray-400 max-w-md mb-6">{error || 'The registry record you are looking for could not be found.'}</p>
                    <button
                        onClick={() => router.push('/dashboard/contractors?view=registry')}
                        className="px-5 py-2.5 bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/20 text-cyan-400 rounded-lg transition-colors text-sm font-medium"
                    >
                        Return to Official Registry
                    </button>
                </div>
            </div>
        );
    }

    const location = [record.city, record.address_state].filter(Boolean).join(', ');
    const fullAddress = [record.address_line1, record.address_line2, location, record.zip].filter(Boolean).join(', ');

    return (
        <div className="p-6 space-y-5 max-w-[1100px] mx-auto">
            {/* Back Button */}
            <button
                onClick={() => router.back()}
                className="flex items-center gap-2 text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors group"
            >
                <ArrowLeft size={16} className="group-hover:-translate-x-0.5 transition-transform" />
                <span className="text-sm">Back</span>
            </button>

            {/* ─── HERO HEADER ─── */}
            <div className="relative overflow-hidden rounded-2xl border border-gray-200 dark:border-white/8">
                <div className="absolute inset-0 bg-gradient-to-br from-cyan-50 via-white to-blue-50 dark:from-cyan-950/40 dark:via-gray-900/60 dark:to-blue-950/30" />
                <div className="absolute top-0 right-0 w-96 h-96 bg-cyan-500/5 dark:bg-cyan-500/4 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />

                <div className="relative px-6 py-6">
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                        <div className="space-y-3">
                            <div className="flex items-center gap-3 flex-wrap">
                                <ShieldCheck size={22} className="text-cyan-400" />
                                <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white tracking-tight">
                                    {record.business_name || 'Unnamed Business'}
                                </h1>
                                {record.is_current ? (
                                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-cyan-500/10 text-cyan-400">
                                        Active
                                    </span>
                                ) : (
                                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-gray-500/10 text-gray-500">
                                        Historic
                                    </span>
                                )}
                            </div>

                            {record.license_status_description && (
                                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium ${
                                    record.license_status_code === 'A'
                                        ? 'bg-green-500/15 text-green-400 border border-green-500/20'
                                        : 'bg-gray-500/15 text-gray-400 border border-gray-500/20'
                                }`}>
                                    {record.license_status_description}
                                </span>
                            )}

                            <div className="flex items-center gap-3 text-gray-500 dark:text-gray-400 text-sm flex-wrap">
                                {location && (
                                    <span className="flex items-center gap-1.5">
                                        <MapPin size={13} className="text-gray-500" />
                                        {location}
                                    </span>
                                )}
                                {record.license_type_description && (
                                    <span className="px-2 py-0.5 bg-purple-500/10 text-purple-400 border border-purple-500/15 rounded text-[11px]">
                                        {record.license_type_description}
                                    </span>
                                )}
                            </div>
                        </div>

                        <div className="text-right flex-shrink-0">
                            <p className="text-sm font-mono font-semibold text-gray-700 dark:text-gray-200">
                                {record.source_display_name}
                            </p>
                            <p className="text-[11px] text-gray-500 uppercase tracking-wider mt-1">Registry Source</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Official Identity + Contact */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-black/2 dark:bg-white/3 border border-gray-200 dark:border-white/6 rounded-xl p-4 space-y-1">
                    <h3 className="text-xs text-gray-500 uppercase tracking-wider font-semibold mb-2 flex items-center gap-2">
                        <ShieldCheck size={13} /> Official Identity
                    </h3>
                    <DetailRow icon={Hash} label="License #" value={record.license_number} mono copyable />
                    <DetailRow icon={FileText} label="License Type" value={record.license_type_description} />
                    <DetailRow icon={Building2} label="Business Type" value={record.business_type_description} />
                    <DetailRow icon={Hash} label="UBI" value={record.ubi} mono />
                    <DetailRow icon={UserRound} label="Principal" value={record.primary_principal_name} />
                    {record.specialties.length > 0 && (
                        <div className="flex items-center gap-3 py-2 px-3">
                            <Layers size={14} className="text-gray-600 flex-shrink-0" />
                            <span className="text-xs text-gray-500 uppercase tracking-wider w-32 flex-shrink-0">Specialties</span>
                            <div className="flex flex-wrap gap-1.5">
                                {record.specialties.map((s, i) => (
                                    <span key={i} className="px-2 py-0.5 bg-cyan-500/10 text-cyan-400 border border-cyan-500/15 rounded text-[11px]">
                                        {String(s.description ?? s.code ?? 'Unknown')}
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                <div className="bg-black/2 dark:bg-white/3 border border-gray-200 dark:border-white/6 rounded-xl p-4 space-y-1">
                    <h3 className="text-xs text-gray-500 uppercase tracking-wider font-semibold mb-2 flex items-center gap-2">
                        <Phone size={13} /> Contact & Location
                    </h3>
                    <DetailRow icon={Phone} label="Phone" value={record.phone} href={record.phone ? `tel:${record.phone}` : undefined} copyable />
                    <DetailRow icon={Mail} label="Email" value={record.email} href={record.email ? `mailto:${record.email}` : undefined} copyable />
                    <DetailRow icon={MapPin} label="Address" value={fullAddress || null} copyable />
                    <DetailRow icon={Building2} label="City" value={record.city} />
                    <DetailRow
                        icon={MapPin}
                        label="Business Addr. State"
                        value={record.address_state}
                    />
                    <DetailRow icon={Hash} label="ZIP" value={record.zip} mono />

                    <p className="text-[11px] text-gray-500 mt-3 pt-3 border-t border-gray-200 dark:border-white/6 leading-relaxed">
                        The business address state is the record&apos;s own on-file address —
                        it is independent of {record.source_display_name}, which is the
                        registry jurisdiction that issued this license.
                    </p>
                </div>
            </div>

            {/* License Timeline + Permit Intelligence relationship */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-black/2 dark:bg-white/3 border border-gray-200 dark:border-white/6 rounded-xl p-4 space-y-1">
                    <h3 className="text-xs text-gray-500 uppercase tracking-wider font-semibold mb-2 flex items-center gap-2">
                        <Calendar size={13} /> License Timeline
                    </h3>
                    <DetailRow icon={Calendar} label="Effective" value={formatDate(record.license_effective_date)} />
                    <DetailRow icon={Calendar} label="Expires" value={formatDate(record.license_expiration_date)} />
                    {record.suspend_date && (
                        <DetailRow icon={AlertCircle} label="Suspended" value={formatDate(record.suspend_date)} />
                    )}
                    {!record.is_current && record.disappeared_at && (
                        <DetailRow icon={AlertCircle} label="Disappeared" value={formatDateTime(record.disappeared_at)} />
                    )}
                    <div className="mt-3 pt-3 border-t border-gray-200 dark:border-white/6 space-y-1">
                        <DetailRow icon={Calendar} label="First Seen" value={formatDateTime(record.first_seen_at)} />
                        <DetailRow icon={Calendar} label="Last Seen" value={formatDateTime(record.last_seen_at)} />
                        <DetailRow icon={Calendar} label="Source Synced" value={formatDateTime(record.last_synced_at)} />
                    </div>
                </div>

                <div className="bg-black/2 dark:bg-white/3 border border-gray-200 dark:border-white/6 rounded-xl p-4">
                    <h3 className="text-xs text-gray-500 uppercase tracking-wider font-semibold mb-2 flex items-center gap-2">
                        <Link2 size={13} /> Permit Intelligence Relationship
                    </h3>
                    {record.match ? (
                        <Link
                            href={`/dashboard/contractors/${record.match.contractor_id}`}
                            className="flex items-center justify-between gap-3 px-3 py-2.5 mt-1 bg-black/2 dark:bg-white/2 hover:bg-black/4 dark:hover:bg-white/4 rounded-lg transition-colors"
                        >
                            <span className="text-sm text-cyan-400 hover:text-cyan-300 truncate">{record.match.contractor_name}</span>
                            <span className="flex items-center gap-1.5 flex-shrink-0">
                                <span className="px-1.5 py-0.5 bg-gray-500/10 text-gray-400 border border-gray-500/15 rounded text-[10px] uppercase tracking-wide">
                                    {record.match.match_tier.replace(/_/g, ' ')}
                                </span>
                                <ExternalLink size={12} className="text-gray-500" />
                            </span>
                        </Link>
                    ) : (
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 leading-relaxed">
                            No matching Permit Intelligence contractor found. This registry
                            record has not been linked to any permit-linked contractor —
                            never inferred from name similarity alone.
                        </p>
                    )}
                </div>
            </div>

            {/* ─── DEVELOPER: RAW REGISTRY DATA ─── */}
            <div className="bg-black/2 dark:bg-white/2 border border-gray-200 dark:border-white/6 rounded-xl overflow-hidden">
                <div className="px-4 py-3 flex items-center justify-between border-b border-gray-200 dark:border-white/6">
                    <button onClick={toggleRawData} className="flex items-center gap-2.5 flex-1 text-left">
                        <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-gray-500 to-gray-600 flex items-center justify-center flex-shrink-0">
                            <Layers size={14} className="text-white" />
                        </div>
                        <h2 className="text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">Developer — View Raw JSON</h2>
                        {rawPayload !== null && Object.keys(rawPayload).length > 0 && (
                            <span className="text-[11px] text-gray-500 font-normal normal-case ml-1">
                                ({Object.keys(rawPayload).length} fields)
                            </span>
                        )}
                    </button>
                    <div className="flex items-center gap-2">
                        {rawPayload && Object.keys(rawPayload).length > 0 && (
                            <button
                                onClick={handleCopyRawData}
                                title="Copy raw registry data to clipboard"
                                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-medium border transition-colors
                                    border-gray-200 dark:border-white/10 text-gray-500 dark:text-gray-400
                                    hover:bg-gray-100 dark:hover:bg-white/6 hover:text-gray-700 dark:hover:text-gray-200"
                            >
                                {copiedRaw ? (
                                    <><Check size={12} className="text-emerald-400" /><span className="text-emerald-400">Copied</span></>
                                ) : (
                                    <><Copy size={12} /><span>Copy</span></>
                                )}
                            </button>
                        )}
                        <button onClick={toggleRawData} className="text-gray-500 p-1">
                            {showRawData ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                        </button>
                    </div>
                </div>
                {showRawData && (
                    <div className="px-4 pb-4">
                        <div className="mt-3 max-h-80 overflow-auto rounded-lg bg-gray-100 dark:bg-black/30 p-4">
                            {rawLoading ? (
                                <div className="flex items-center gap-2 text-[11px] text-gray-500 dark:text-gray-400 font-mono">
                                    <span className="animate-spin inline-block">⟳</span> Loading source data…
                                </div>
                            ) : rawPayload && Object.keys(rawPayload).length > 0 ? (
                                <pre className="text-[11px] text-gray-500 dark:text-gray-400 font-mono whitespace-pre-wrap break-words leading-relaxed">
                                    {JSON.stringify(rawPayload, null, 2)}
                                </pre>
                            ) : (
                                <p className="text-[11px] text-gray-500 dark:text-gray-400 font-mono italic">
                                    No raw payload stored for this record.
                                </p>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
