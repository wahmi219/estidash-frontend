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
            className="text-[#5B6B7D] hover:text-[#00458B] transition-colors flex-shrink-0"
        >
            {copied ? <Check size={12} className="text-emerald-600" /> : <Copy size={12} />}
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
        <div className="flex items-center gap-3 py-2 px-3 rounded-lg hover:bg-[#F7F9FB] transition-colors">
            <Icon size={14} className="text-[#5B6B7D] flex-shrink-0" />
            <span className="text-xs text-[#5B6B7D] uppercase tracking-wider w-32 flex-shrink-0">{label}</span>
            {href && !isEmpty ? (
                <a href={href} className={`text-sm text-[#00458B] hover:text-[#045CB4] transition-colors truncate ${mono ? 'font-mono text-xs' : ''}`}>
                    {value}
                </a>
            ) : (
                <span className={`text-sm truncate ${isEmpty ? 'text-gray-400 italic' : 'text-[#0E2B5C]'} ${mono ? 'font-mono text-xs' : ''}`}>
                    {isEmpty ? 'Not present' : value}
                </span>
            )}
            {copyable && !isEmpty && <CopyIconButton value={value as string} />}
        </div>
    );
}

function SectionCard({
    icon: Icon,
    title,
    children,
}: {
    icon: React.ComponentType<{ size?: number; className?: string }>;
    title: string;
    children: React.ReactNode;
}) {
    return (
        <div className="bg-white border border-[#DFE6EE] rounded-lg p-4 space-y-1">
            <h3 className="text-xs text-[#5B6B7D] uppercase tracking-wider font-semibold mb-2 flex items-center gap-2">
                <Icon size={13} /> {title}
            </h3>
            {children}
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
                <button onClick={() => router.back()} className="flex items-center gap-2 text-[#5B6B7D] hover:text-[#0E2B5C] transition-colors">
                    <ArrowLeft size={18} /> Back
                </button>
                <div className="animate-pulse space-y-4">
                    <div className="h-32 bg-[#F7F9FB] border border-[#DFE6EE] rounded-lg" />
                    <div className="grid grid-cols-2 gap-4">
                        <div className="h-64 bg-[#F7F9FB] border border-[#DFE6EE] rounded-lg" />
                        <div className="h-64 bg-[#F7F9FB] border border-[#DFE6EE] rounded-lg" />
                    </div>
                </div>
            </div>
        );
    }

    // Error state
    if (error || !record) {
        return (
            <div className="p-6 space-y-5 max-w-[1100px] mx-auto">
                <button onClick={() => router.back()} className="flex items-center gap-2 text-[#5B6B7D] hover:text-[#0E2B5C] transition-colors">
                    <ArrowLeft size={18} /> Back
                </button>
                <div className="flex flex-col items-center justify-center py-20 text-center">
                    <div className="w-16 h-16 rounded-lg bg-red-50 border border-red-200 flex items-center justify-center mb-4">
                        <AlertCircle size={28} className="text-red-600" />
                    </div>
                    <h2 className="text-xl font-semibold text-[#0E2B5C] mb-2">Registry Record Not Found</h2>
                    <p className="text-[#5B6B7D] max-w-md mb-6">{error || 'The registry record you are looking for could not be found.'}</p>
                    <button
                        onClick={() => router.push('/dashboard/contractors?view=registry')}
                        className="px-5 py-2.5 bg-[#00458B] hover:bg-[#045CB4] text-white rounded-lg transition-colors text-sm font-medium"
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
                className="flex items-center gap-2 text-[#5B6B7D] hover:text-[#0E2B5C] transition-colors group"
            >
                <ArrowLeft size={16} className="group-hover:-translate-x-0.5 transition-transform" />
                <span className="text-sm">Back</span>
            </button>

            {/* ─── HEADER ─── */}
            <div className="bg-white border border-[#DFE6EE] rounded-lg px-6 py-6">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                    <div className="space-y-3">
                        <div className="flex items-center gap-3 flex-wrap">
                            <div className="w-9 h-9 rounded-lg bg-blue-50 border border-blue-200 flex items-center justify-center flex-shrink-0">
                                <ShieldCheck size={18} className="text-[#00458B]" />
                            </div>
                            <h1 className="text-xl sm:text-2xl font-bold text-[#0E2B5C] tracking-tight">
                                {record.business_name || 'Unnamed Business'}
                            </h1>
                            {record.is_current ? (
                                <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200">
                                    Active
                                </span>
                            ) : (
                                <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-medium bg-gray-100 text-[#5B6B7D] border border-gray-200">
                                    Historic
                                </span>
                            )}
                        </div>

                        {record.license_status_description && (
                            <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-medium border ${
                                record.license_status_code === 'A'
                                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                    : 'bg-gray-100 text-[#5B6B7D] border-gray-200'
                            }`}>
                                {record.license_status_description}
                            </span>
                        )}

                        <div className="flex items-center gap-3 text-[#5B6B7D] text-sm flex-wrap">
                            {location && (
                                <span className="flex items-center gap-1.5">
                                    <MapPin size={13} className="text-[#5B6B7D]" />
                                    {location}
                                </span>
                            )}
                            {record.license_type_description && (
                                <span className="px-2 py-0.5 bg-[#F7F9FB] text-[#5B6B7D] border border-[#DFE6EE] rounded text-[11px]">
                                    {record.license_type_description}
                                </span>
                            )}
                        </div>
                    </div>

                    <div className="text-right flex-shrink-0">
                        <p className="text-sm font-mono font-semibold text-[#0E2B5C]">
                            {record.source_display_name}
                        </p>
                        <p className="text-[11px] text-[#5B6B7D] uppercase tracking-wider mt-1">Registry Source</p>
                    </div>
                </div>
            </div>

            {/* Official Identity + Contact */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <SectionCard icon={ShieldCheck} title="Official Identity">
                    <DetailRow icon={Hash} label="License #" value={record.license_number} mono copyable />
                    <DetailRow icon={FileText} label="License Type" value={record.license_type_description} />
                    <DetailRow icon={Building2} label="Business Type" value={record.business_type_description} />
                    <DetailRow icon={Hash} label="UBI" value={record.ubi} mono />
                    <DetailRow icon={UserRound} label="Principal" value={record.primary_principal_name} />
                    {record.specialties.length > 0 && (
                        <div className="flex items-center gap-3 py-2 px-3">
                            <Layers size={14} className="text-[#5B6B7D] flex-shrink-0" />
                            <span className="text-xs text-[#5B6B7D] uppercase tracking-wider w-32 flex-shrink-0">Specialties</span>
                            <div className="flex flex-wrap gap-1.5">
                                {record.specialties.map((s, i) => (
                                    <span key={i} className="px-2 py-0.5 bg-blue-50 text-blue-700 border border-blue-200 rounded text-[11px]">
                                        {String(s.description ?? s.code ?? 'Unknown')}
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}
                </SectionCard>

                <SectionCard icon={Phone} title="Contact & Location">
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

                    <p className="text-[11px] text-[#5B6B7D] mt-3 pt-3 border-t border-[#DFE6EE] leading-relaxed">
                        The business address state is the record&apos;s own on-file address —
                        it is independent of {record.source_display_name}, which is the
                        registry jurisdiction that issued this license.
                    </p>
                </SectionCard>
            </div>

            {/* License Timeline + Permit Intelligence relationship */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <SectionCard icon={Calendar} title="License Timeline">
                    <DetailRow icon={Calendar} label="Effective" value={formatDate(record.license_effective_date)} />
                    <DetailRow icon={Calendar} label="Expires" value={formatDate(record.license_expiration_date)} />
                    {record.suspend_date && (
                        <DetailRow icon={AlertCircle} label="Suspended" value={formatDate(record.suspend_date)} />
                    )}
                    {!record.is_current && record.disappeared_at && (
                        <DetailRow icon={AlertCircle} label="Disappeared" value={formatDateTime(record.disappeared_at)} />
                    )}
                    <div className="mt-3 pt-3 border-t border-[#DFE6EE] space-y-1">
                        <DetailRow icon={Calendar} label="First Seen" value={formatDateTime(record.first_seen_at)} />
                        <DetailRow icon={Calendar} label="Last Seen" value={formatDateTime(record.last_seen_at)} />
                        <DetailRow icon={Calendar} label="Source Synced" value={formatDateTime(record.last_synced_at)} />
                    </div>
                </SectionCard>

                <SectionCard icon={Link2} title="Permit Intelligence Relationship">
                    {record.match ? (
                        <Link
                            href={`/dashboard/contractors/${record.match.contractor_id}`}
                            className="flex items-center justify-between gap-3 px-3 py-2.5 mt-1 bg-[#F7F9FB] hover:bg-blue-50 rounded-lg transition-colors"
                        >
                            <span className="text-sm text-[#00458B] hover:text-[#045CB4] truncate">{record.match.contractor_name}</span>
                            <span className="flex items-center gap-1.5 flex-shrink-0">
                                <span className="px-1.5 py-0.5 bg-white text-[#5B6B7D] border border-[#DFE6EE] rounded text-[10px] uppercase tracking-wide">
                                    {record.match.match_tier.replace(/_/g, ' ')}
                                </span>
                                <ExternalLink size={12} className="text-[#5B6B7D]" />
                            </span>
                        </Link>
                    ) : (
                        <p className="text-sm text-[#5B6B7D] mt-1 leading-relaxed">
                            No matching Permit Intelligence contractor found. This registry
                            record has not been linked to any permit-linked contractor —
                            never inferred from name similarity alone.
                        </p>
                    )}
                </SectionCard>
            </div>

            {/* ─── DEVELOPER: RAW REGISTRY DATA ─── */}
            <div className="bg-white border border-[#DFE6EE] rounded-lg overflow-hidden">
                <div className="px-4 py-3 flex items-center justify-between border-b border-[#DFE6EE]">
                    <button onClick={toggleRawData} className="flex items-center gap-2.5 flex-1 text-left">
                        <div className="w-7 h-7 rounded-lg bg-[#F7F9FB] border border-[#DFE6EE] flex items-center justify-center flex-shrink-0">
                            <Layers size={14} className="text-[#5B6B7D]" />
                        </div>
                        <h2 className="text-xs font-semibold text-[#5B6B7D] uppercase tracking-wider">Developer — View Raw JSON</h2>
                        {rawPayload !== null && Object.keys(rawPayload).length > 0 && (
                            <span className="text-[11px] text-[#5B6B7D] font-normal normal-case ml-1">
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
                                    border-[#DFE6EE] text-[#5B6B7D] hover:bg-[#F7F9FB] hover:text-[#0E2B5C]"
                            >
                                {copiedRaw ? (
                                    <><Check size={12} className="text-emerald-600" /><span className="text-emerald-600">Copied</span></>
                                ) : (
                                    <><Copy size={12} /><span>Copy</span></>
                                )}
                            </button>
                        )}
                        <button onClick={toggleRawData} className="text-[#5B6B7D] p-1">
                            {showRawData ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                        </button>
                    </div>
                </div>
                {showRawData && (
                    <div className="px-4 pb-4">
                        <div className="mt-3 max-h-80 overflow-auto rounded-lg bg-[#F7F9FB] border border-[#DFE6EE] p-4">
                            {rawLoading ? (
                                <div className="flex items-center gap-2 text-[11px] text-[#5B6B7D] font-mono">
                                    <span className="animate-spin inline-block">⟳</span> Loading source data…
                                </div>
                            ) : rawPayload && Object.keys(rawPayload).length > 0 ? (
                                <pre className="text-[11px] text-[#5B6B7D] font-mono whitespace-pre-wrap break-words leading-relaxed">
                                    {JSON.stringify(rawPayload, null, 2)}
                                </pre>
                            ) : (
                                <p className="text-[11px] text-[#5B6B7D] font-mono italic">
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
