'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import {
    ArrowLeft,
    Calendar,
    DollarSign,
    MapPin,
    Mail,
    Phone,
    User,
    Building2,
    FileText,
    Clock,
    ChevronDown,
    ChevronUp,
    ExternalLink,
    AlertCircle,
    Hammer,
    Home,
    Layers,
    Hash,
    Ruler,
    BarChart3,
    Users,
    Shield,
    Globe,
    ArrowRight,
    Copy,
    Check,
    Wand2,
    Loader2,
    TrendingUp,
    CheckCircle2,
    XCircle,
    Gauge,
} from 'lucide-react';
import { apiService } from '@/services/api';
import { PermitRecord } from '@/types';
import PermitAnalysis from './PermitAnalysis';
import ScoreBreakdownCard from './ScoreBreakdownCard';

// Dynamically import the map to avoid SSR issues with Leaflet
const PermitMap = dynamic(
    () => import('./PermitMap').then((mod) => mod.default),
    {
        ssr: false,
        loading: () => (
            <div className="w-full h-[300px] rounded-lg bg-[#F7F9FB] border border-[#DFE6EE] flex items-center justify-center text-[#5B6B7D]">
                <div className="flex items-center gap-2">
                    <MapPin size={18} />
                    Loading map...
                </div>
            </div>
        ),
    }
) as React.ComponentType<{
    latitude: number;
    longitude: number;
    address: string;
    permitNumber: string;
}>;

// ============================================================================
// Helpers
// ============================================================================

// Jurisdiction-reported status badges — mirrors the palette already shipped on
// the Permit Records list page (src/components/permits/PermitRow.tsx) so a
// permit's status chip looks identical whether seen from the list or detail view.
const GREEN = 'bg-green-50 text-green-700 border-green-200';
const BLUE = 'bg-blue-50 text-blue-700 border-blue-200';
const YELLOW = 'bg-yellow-50 text-yellow-800 border-yellow-200';
const ORANGE = 'bg-orange-50 text-orange-700 border-orange-200';
const RED = 'bg-red-50 text-red-700 border-red-200';
const PURPLE = 'bg-purple-50 text-purple-700 border-purple-200';
const GRAY = 'bg-gray-100 text-[#5B6B7D] border-gray-200';

const statusColors: Record<string, string> = {
    'ISSUED': GREEN, 'PERMIT ISSUED': GREEN, 'PERMIT': GREEN, 'OPEN': GREEN, 'ISSUE': GREEN,
    'APPROVED (NOT UNDER CONSTRUCTION)': GREEN, 'APRV_NR': GREEN, 'UNDER CONSTRUCTION': GREEN,
    'APPROVED TO CALL INSPECTION': GREEN, 'CERTIFICATE': GREEN, 'ISSUANCE FEES PAID': GREEN,
    'AWAITING PERMIT ISSUANCE': GREEN, 'FOUNDATION RELEASE': GREEN,
    'COMPLETED': BLUE, 'PERMIT FINALED': BLUE, 'FINAL': BLUE, 'COMPLETION REPORT RECEIVED': BLUE,
    'FINAL INSPECTION PASSED': BLUE, 'SIGNED-OFF': BLUE, 'REVIEWED': BLUE, 'REVIEWS COMPLETED': BLUE,
    'PENDING': YELLOW, 'APPLIED': YELLOW, 'ROUTE': YELLOW, 'APPLICATION RECEIVED': YELLOW, 'NEW': YELLOW,
    'PENDING PLANS REVIEW ASSIGNMENT': YELLOW, 'PENDING PLANS REVIEW': YELLOW, 'PENDING PRESCREEN REVIEW': YELLOW,
    'APPLICATION COMPLETED': YELLOW, 'PAID': YELLOW, 'IN PROCESS': YELLOW, 'PLAN REVIEW': YELLOW,
    'PLAN SET SUBMITTED': YELLOW, 'REVIEWS IN PROCESS': YELLOW, 'SCHEDULED': YELLOW,
    'SCHEDULED AND SUBMITTED': YELLOW, 'READY FOR ISSUANCE': YELLOW, 'READY FOR INTAKE': YELLOW,
    'FEES PAID': YELLOW, 'REVISION FEES PAID': YELLOW, 'FEES DUE': YELLOW, 'PHASED PERMITTING': YELLOW,
    'INITIATED': YELLOW, 'PENDING - BUILDING BY-LAW REVIEW': YELLOW,
    'ADDITIONAL INFO REQUESTED': ORANGE, 'CORRECTIONS REQUIRED': ORANGE, 'CORRECTIONS SUBMITTED': ORANGE,
    'AWAITING INFORMATION': ORANGE, 'AWAITING CLIENT REPLY': ORANGE, 'AWAITING REVISION ISSUANCE': ORANGE,
    'MORE INFORMATION REQUIRED': ORANGE, 'CALL NOTIFICATION RECEIVED': ORANGE,
    'INSPECTION FOLLOWUP': PURPLE, 'INSPECTING': PURPLE, 'SYSTEM INSPECTION': PURPLE, 'READY_FOR_INSPECTIONS': PURPLE,
    'CANCELLED': RED, 'VOID': RED, 'VOIDED': RED, 'DENIED': RED, 'REFUSED': RED, 'REVOKED': RED,
    'STOP WORK': RED, 'APPLICATION CANCELED': RED, 'WITHDRWN': RED, 'APPLICATION WITHDRAWN': RED, 'W/REFUND': RED,
    'HOLD': ORANGE, 'ON HOLD': ORANGE, 'HOLD - PENDING PLANS REVIEW': ORANGE, 'HOLD - PRESCREEN REVIEW': ORANGE,
    'SUSPENDED': ORANGE,
    'EXPIRED': GRAY, 'APP_EXP': GRAY, 'SYSTEM ABANDONED': GRAY, 'WELL ABANDONED': GRAY, 'DEMOLITIONS': GRAY,
    'SEPTIC SYSTEM ATTRIBUTES & CONDITIONS': GRAY, 'UNKNOWN': GRAY,
};

// Permit-level score bucket — secondary detail shown next to the qualification badge.
const PERMIT_BUCKET_BADGE: Record<string, { label: string; cls: string }> = {
    strategic: { label: 'Strategic', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
    strong: { label: 'Strong', cls: 'bg-teal-50 text-teal-700 border-teal-200' },
    core: { label: 'Core', cls: 'bg-blue-50 text-blue-700 border-blue-200' },
    opportunistic: { label: 'Opportunistic', cls: 'bg-amber-50 text-amber-700 border-amber-200' },
    no_send: { label: 'No Send', cls: 'bg-gray-100 text-[#5B6B7D] border-gray-200' },
};

function formatCurrency(value: number | string | null | undefined): string {
    if (value === null || value === undefined || value === '' || value === 0) return '—';
    const num = typeof value === 'string' ? parseFloat(value.replace(/[$,]/g, '')) : value;
    if (isNaN(num) || num === 0) return '—';
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        maximumFractionDigits: 0,
    }).format(num);
}

function formatDate(dateStr: string | null | undefined): string {
    if (!dateStr) return '—';
    try {
        const str = String(dateStr);
        const parts = str.split('T')[0].split('-');
        if (parts.length === 3 && parts[0].length === 4) {
            const d = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
            if (!isNaN(d.getTime())) {
                return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
            }
        }
        return str;
    } catch {
        return String(dateStr);
    }
}

function formatShortDate(dateStr: string | null | undefined): string {
    if (!dateStr) return '—';
    try {
        const str = String(dateStr);
        const parts = str.split('T')[0].split('-');
        if (parts.length === 3 && parts[0].length === 4) {
            const d = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
            if (!isNaN(d.getTime())) {
                return d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
            }
        }
        return str;
    } catch {
        return String(dateStr);
    }
}

// ============================================================================
// Sub-components
// ============================================================================

/** Header qualification badge — mirrors PermitRow.tsx's QualificationCell logic
 * exactly: Qualified = !is_excluded && score_bucket set && score_bucket != 'no_send'.
 * Invalid/Excluded = is_excluded || score_bucket === 'no_send'. Never re-derive this
 * from any other field. */
function QualificationBadge({ isExcluded, scoreBucket }: { isExcluded: boolean; scoreBucket: string | null }) {
    const isInvalid = isExcluded || scoreBucket === 'no_send';
    const isQualified = !isExcluded && !!scoreBucket && scoreBucket !== 'no_send';

    if (isQualified) {
        return (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-green-50 text-green-700 border border-green-200">
                <CheckCircle2 size={13} /> Qualified
            </span>
        );
    }
    if (isInvalid) {
        return (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-red-50 text-red-700 border border-red-200">
                <XCircle size={13} /> Invalid / Excluded
            </span>
        );
    }
    return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-gray-100 text-[#5B6B7D] border border-gray-200">
            Not Scored
        </span>
    );
}

function SectionHeader({
    icon: Icon,
    title,
}: {
    icon: React.ComponentType<{ size?: number; className?: string }>;
    title: string;
}) {
    return (
        <div className="px-4 py-3 border-b border-[#DFE6EE] flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-[#F7F9FB] border border-[#DFE6EE] flex items-center justify-center">
                <Icon size={14} className="text-[#00458B]" />
            </div>
            <h2 className="text-xs font-semibold text-[#5B6B7D] uppercase tracking-wider">{title}</h2>
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
        <div className="bg-white border border-[#DFE6EE] rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
                <Icon size={14} className={isEmpty ? 'text-gray-300' : 'text-[#00458B]'} />
                <span className="text-[11px] text-[#5B6B7D] uppercase tracking-wider font-medium">{label}</span>
            </div>
            <p className={`text-lg font-semibold leading-tight ${isEmpty ? 'text-gray-300 italic text-sm' : 'text-[#0E2B5C]'}`}>
                {value}
            </p>
            {subtext && !isEmpty && (
                <p className="text-[11px] text-[#5B6B7D] mt-1">{subtext}</p>
            )}
        </div>
    );
}

function DateTimeline({ dates }: {
    dates: { label: string; value: string | null | undefined; icon: React.ComponentType<{ size?: number; className?: string }> }[];
}) {
    const validDates = dates.filter(d => d.value);
    if (validDates.length === 0) return null;

    return (
        <div className="flex items-center gap-0 overflow-x-auto py-2">
            {dates.map((d, i) => {
                const hasValue = !!d.value;
                const Icon = d.icon;
                return (
                    <React.Fragment key={d.label}>
                        <div className={`flex flex-col items-center min-w-[100px] px-2 ${hasValue ? '' : 'opacity-40'}`}>
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center mb-1.5 border ${hasValue
                                    ? 'bg-blue-50 border-blue-200'
                                    : 'bg-[#F7F9FB] border-[#DFE6EE]'
                                }`}>
                                <Icon size={14} className={hasValue ? 'text-[#00458B]' : 'text-gray-300'} />
                            </div>
                            <span className="text-[10px] text-[#5B6B7D] uppercase tracking-wider">{d.label}</span>
                            <span className={`text-xs font-medium mt-0.5 ${hasValue ? 'text-[#0E2B5C]' : 'text-gray-300'}`}>
                                {hasValue ? formatShortDate(d.value) : '—'}
                            </span>
                        </div>
                        {i < dates.length - 1 && (
                            <div className="flex-shrink-0 mt-[-18px]">
                                <ArrowRight size={12} className={dates[i + 1]?.value ? 'text-blue-300' : 'text-gray-200'} />
                            </div>
                        )}
                    </React.Fragment>
                );
            })}
        </div>
    );
}

function DetailRow({
    icon: Icon,
    label,
    value,
    mono,
    href,
}: {
    icon: React.ComponentType<{ size?: number; className?: string }>;
    label: string;
    value: string | null | undefined;
    mono?: boolean;
    href?: string;
}) {
    const displayValue = value || '—';
    const isEmpty = !value;
    return (
        <div className="flex items-center gap-3 py-2 px-3 rounded-lg hover:bg-[#F7F9FB] transition-colors">
            <Icon size={14} className="text-[#5B6B7D] flex-shrink-0" />
            <span className="text-xs text-[#5B6B7D] uppercase tracking-wider w-28 flex-shrink-0">{label}</span>
            {href && !isEmpty ? (
                <a href={href} className={`text-sm text-[#00458B] hover:text-[#045CB4] transition-colors ${mono ? 'font-mono text-xs' : ''}`}>
                    {displayValue}
                </a>
            ) : (
                <span className={`text-sm ${isEmpty ? 'text-gray-300 italic' : 'text-[#0E2B5C]'} ${mono ? 'font-mono text-xs' : ''} truncate`}>
                    {displayValue}
                </span>
            )}
        </div>
    );
}

function DataCompleteness({ permit }: { permit: PermitRecord }) {
    const fields = [
        permit.issue_date, permit.application_date, permit.estimated_cost,
        permit.full_address, permit.zip_code, permit.latitude, permit.longitude,
        permit.contractor_name, permit.work_description, permit.permit_class,
        permit.housing_units, permit.square_footage, permit.owner_name,
    ];
    const filled = fields.filter(f => f !== null && f !== undefined && f !== '' && f !== 0).length;
    const total = fields.length;
    const pct = Math.round((filled / total) * 100);
    const color = pct >= 70 ? 'bg-emerald-500' : pct >= 40 ? 'bg-amber-500' : 'bg-red-500';

    return (
        <div className="flex items-center gap-3">
            <div className="flex-1 h-1.5 bg-[#DFE6EE] rounded-full overflow-hidden">
                <div className={`h-full ${color} rounded-full`} style={{ width: `${pct}%` }} />
            </div>
            <span className="text-[11px] text-[#5B6B7D] font-mono whitespace-nowrap">
                {filled}/{total} fields
            </span>
        </div>
    );
}

// ============================================================================
// Main Page Component
// ============================================================================

export default function PermitDetailPage() {
    const params = useParams();
    const router = useRouter();
    const permitId = params.id as string;

    const [permit, setPermit] = useState<PermitRecord | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [showRawData, setShowRawData] = useState(false);
    const [rawPayload, setRawPayload] = useState<Record<string, unknown> | null>(null);
    const [rawPayloadLoading, setRawPayloadLoading] = useState(false);
    const [rawFetched, setRawFetched] = useState(false);
    const [copied, setCopied] = useState(false);

    const [aiCostEstimate, setAiCostEstimate] = useState<{
        low_estimate: number | null;
        high_estimate: number | null;
        midpoint: number | null;
        confidence: string | null;
        reasoning: string | null;
    } | null>(null);
    const [generatingAiCost, setGeneratingAiCost] = useState(false);
    const [aiCostError, setAiCostError] = useState<string | null>(null);

    useEffect(() => {
        // Reset raw-payload state when navigating between permits — it is now
        // loaded lazily, only when the user expands the "Raw API Data" section.
        setRawPayload(null);
        setRawFetched(false);
        setShowRawData(false);
        async function fetchPermit() {
            try {
                setLoading(true);
                setError(null);
                const permitData = await apiService.getPermitById(permitId);
                setPermit(permitData);
            } catch (err) {
                const message =
                    err && typeof err === 'object' && 'message' in err
                        ? (err as { message: string }).message
                        : 'Failed to load permit details';
                setError(message);
            } finally {
                setLoading(false);
            }
        }
        if (permitId) fetchPermit();
    }, [permitId]);

    // Fetch the (potentially large) raw source payload on demand. Falls back to
    // the permit's api_specific_fields when no separate raw payload is stored.
    async function loadRawPayload() {
        if (rawFetched || rawPayloadLoading) return;
        setRawPayloadLoading(true);
        try {
            const rawData = await apiService.getPermitRawPayload(permitId).catch(() => null);
            if (rawData && Object.keys(rawData).length > 0) {
                setRawPayload(rawData);
            } else if (permit?.api_specific_fields && Object.keys(permit.api_specific_fields).length > 0) {
                setRawPayload(permit.api_specific_fields as Record<string, unknown>);
            } else {
                setRawPayload({});
            }
        } finally {
            setRawFetched(true);
            setRawPayloadLoading(false);
        }
    }

    function toggleRawData() {
        setShowRawData(prev => {
            const next = !prev;
            if (next && !rawFetched) loadRawPayload();
            return next;
        });
    }

    async function handleCopyRawData() {
        if (!rawPayload) return;
        try {
            await navigator.clipboard.writeText(JSON.stringify(rawPayload, null, 2));
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch {
            // clipboard not available; silently ignore
        }
    }

    async function handleGenerateAiCost() {
        if (!permit || generatingAiCost) return;
        setGeneratingAiCost(true);
        setAiCostError(null);
        try {
            const result = await apiService.estimatePermitCost({
                permit_data: {
                    id: permit.id,
                    permit_number: permit.permit_number,
                    permit_type: permit.permit_type,
                    permit_subtype: permit.permit_subtype,
                    permit_class: permit.permit_class,
                    work_description: permit.work_description,
                    square_footage: permit.square_footage,
                    stories: permit.stories,
                    housing_units: permit.housing_units,
                    city: permit.city,
                    state_code: permit.state_code,
                    zip_code: permit.zip_code,
                    api_specific_fields: permit.api_specific_fields,
                    updated_at: permit.updated_at,
                },
                permit_id: permit.id,
                use_cache: false,
            });
            if (result.success && result.estimate) {
                setAiCostEstimate(result.estimate);
            } else {
                setAiCostError(result.error || 'Estimation failed — please try again.');
            }
        } catch {
            setAiCostError('Request failed — check your connection and try again.');
        } finally {
            setGeneratingAiCost(false);
        }
    }

    // Loading state
    if (loading) {
        return (
            <div className="p-6 space-y-6 max-w-[1100px] mx-auto">
                <button onClick={() => router.back()} className="flex items-center gap-2 text-[#5B6B7D] hover:text-[#0E2B5C] transition-colors">
                    <ArrowLeft size={18} /> Back
                </button>
                <div className="animate-pulse space-y-4">
                    <div className="h-32 bg-[#F7F9FB] border border-[#DFE6EE] rounded-lg" />
                    <div className="grid grid-cols-4 gap-3">
                        {[1, 2, 3, 4].map(i => <div key={i} className="h-24 bg-[#F7F9FB] border border-[#DFE6EE] rounded-lg" />)}
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="h-64 bg-[#F7F9FB] border border-[#DFE6EE] rounded-lg" />
                        <div className="h-64 bg-[#F7F9FB] border border-[#DFE6EE] rounded-lg" />
                    </div>
                </div>
            </div>
        );
    }

    // Error state
    if (error || !permit) {
        return (
            <div className="p-6 space-y-6 max-w-[1100px] mx-auto">
                <button onClick={() => router.back()} className="flex items-center gap-2 text-[#5B6B7D] hover:text-[#0E2B5C] transition-colors">
                    <ArrowLeft size={18} /> Back
                </button>
                <div className="flex flex-col items-center justify-center py-20 text-center">
                    <div className="w-16 h-16 rounded-lg bg-red-50 border border-red-200 flex items-center justify-center mb-4">
                        <AlertCircle size={28} className="text-red-600" />
                    </div>
                    <h2 className="text-xl font-semibold text-[#0E2B5C] mb-2">Permit Not Found</h2>
                    <p className="text-[#5B6B7D] max-w-md mb-6">{error || 'The permit you are looking for could not be found.'}</p>
                    <button
                        onClick={() => router.push('/dashboard/permits')}
                        className="px-5 py-2.5 bg-[#00458B] hover:bg-[#045CB4] text-white rounded-lg transition-colors text-sm font-medium"
                    >
                        Return to Permits
                    </button>
                </div>
            </div>
        );
    }

    const status = statusColors[permit.status] || GRAY;
    const hasLocation = permit.latitude != null && permit.longitude != null;
    const hasContractor = !!permit.contractor_name;
    const displaySubtype = permit.permit_subtype || permit.permit_class;
    const isExcluded = !!permit.is_excluded;
    const scoreBucket = permit.score_bucket ?? null;
    const bucketBadge = !isExcluded && scoreBucket ? PERMIT_BUCKET_BADGE[scoreBucket] : null;

    return (
        <div className="p-6 space-y-5 max-w-[1100px] mx-auto">
            {/* Back Button */}
            <button
                onClick={() => router.back()}
                className="flex items-center gap-2 text-[#5B6B7D] hover:text-[#0E2B5C] transition-colors group"
            >
                <ArrowLeft size={16} className="group-hover:-translate-x-0.5 transition-transform" />
                <span className="text-sm">Back to Permits</span>
            </button>

            {/* ─── HEADER ─── */}
            <div className="bg-white border border-[#DFE6EE] rounded-lg px-6 py-6">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                    <div className="space-y-3">
                        {/* Permit number + qualification + status */}
                        <div className="flex items-center gap-2.5 flex-wrap">
                            <h1 className="text-xl sm:text-2xl font-bold text-[#0E2B5C] tracking-tight">
                                #{permit.permit_number}
                            </h1>
                            <QualificationBadge isExcluded={isExcluded} scoreBucket={scoreBucket} />
                            {bucketBadge && (
                                <span className={`inline-flex items-center px-2 py-1 rounded-lg text-[10px] font-semibold uppercase tracking-wide border ${bucketBadge.cls}`}>
                                    {bucketBadge.label}
                                </span>
                            )}
                            <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-medium border ${status}`}>
                                {permit.status}
                            </span>
                        </div>

                        {/* Meta row */}
                        <div className="flex items-center gap-3 text-[#5B6B7D] text-sm flex-wrap">
                            {permit.city && (
                                <span className="flex items-center gap-1.5">
                                    <MapPin size={13} className="text-[#5B6B7D]" />
                                    {permit.city}, {permit.state_code}
                                </span>
                            )}
                            <span className="text-gray-300">•</span>
                            <span className="flex items-center gap-1.5">
                                <FileText size={13} className="text-[#5B6B7D]" />
                                {permit.permit_type}
                                {displaySubtype && <span className="text-[#5B6B7D]"> — {displaySubtype}</span>}
                            </span>
                            {permit.community && (
                                <>
                                    <span className="text-gray-300">•</span>
                                    <span className="px-2 py-0.5 bg-[#F7F9FB] text-[#5B6B7D] border border-[#DFE6EE] rounded text-[11px] capitalize">
                                        {permit.community}
                                    </span>
                                </>
                            )}
                        </div>

                        {/* Data completeness */}
                        <div className="max-w-xs">
                            <DataCompleteness permit={permit} />
                        </div>
                    </div>

                    {/* Cost display */}
                    <div className="text-right flex-shrink-0">
                        {permit.estimated_cost != null && permit.estimated_cost > 0 ? (
                            <>
                                <p className="text-3xl font-bold text-[#0E2B5C] font-mono">
                                    {formatCurrency(permit.estimated_cost)}
                                </p>
                                <p className="text-[11px] text-[#5B6B7D] uppercase tracking-wider mt-1">Estimated Cost</p>
                            </>
                        ) : (aiCostEstimate?.midpoint ?? permit.ai_estimated_cost) ? (
                            <>
                                <p className="text-3xl font-bold text-amber-600 font-mono italic">
                                    ~{formatCurrency(aiCostEstimate?.midpoint ?? permit.ai_estimated_cost)}
                                </p>
                                <p className="text-[11px] text-amber-600/80 uppercase tracking-wider mt-1">
                                    AI Estimate · {(aiCostEstimate?.confidence ?? permit.ai_cost_confidence) || 'low'} confidence
                                </p>
                            </>
                        ) : (
                            <div className="text-right">
                                <p className="text-lg text-gray-300 font-mono">—</p>
                                <p className="text-[11px] text-gray-300 uppercase tracking-wider mt-1">Cost N/A</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* ─── KEY METRICS BAR ─── */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <MetricCard
                    icon={Calendar}
                    label="Issue Date"
                    value={formatDate(permit.issue_date)}
                />
                <MetricCard
                    icon={DollarSign}
                    label="Total Fee"
                    value={formatCurrency(permit.total_fee)}
                />
                <MetricCard
                    icon={Home}
                    label="Housing Units"
                    value={permit.housing_units ? String(permit.housing_units) : '—'}
                />
                <MetricCard
                    icon={Ruler}
                    label="Square Footage"
                    value={permit.square_footage ? `${permit.square_footage.toLocaleString()} sq ft` : '—'}
                />
            </div>

            {/* ═══ SECTION: PROJECT / SCOPE ═══ */}
            <div className="bg-white border border-[#DFE6EE] rounded-lg overflow-hidden">
                <SectionHeader icon={Hammer} title="Project / Scope" />
                <div className="p-5 space-y-4">
                    {permit.work_description ? (
                        <p className="text-sm text-[#0E2B5C] leading-relaxed whitespace-pre-wrap">{permit.work_description}</p>
                    ) : (
                        <p className="text-sm text-gray-300 italic">No work description on file.</p>
                    )}

                    {/* AI Cost Estimate — only offered when no jurisdiction-reported valuation exists */}
                    {permit.estimated_cost == null && (
                        <div className="border border-[#DFE6EE] rounded-lg overflow-hidden">
                            <div className="px-4 py-3 border-b border-[#DFE6EE] flex items-center justify-between flex-wrap gap-2">
                                <div className="flex items-center gap-2.5">
                                    <div className="w-7 h-7 rounded-lg bg-amber-50 border border-amber-200 flex items-center justify-center">
                                        <Wand2 size={14} className="text-amber-600" />
                                    </div>
                                    <h3 className="text-xs font-semibold text-[#5B6B7D] uppercase tracking-wider">AI Cost Estimate</h3>
                                    {(aiCostEstimate ?? permit.ai_estimated_cost) && (
                                        <span className="text-[10px] px-2 py-0.5 bg-amber-50 text-amber-700 border border-amber-200 rounded-full uppercase tracking-wide">
                                            {aiCostEstimate?.confidence ?? permit.ai_cost_confidence ?? 'low'} confidence
                                        </span>
                                    )}
                                </div>
                                {!(aiCostEstimate ?? permit.ai_estimated_cost) && (
                                    <button
                                        onClick={handleGenerateAiCost}
                                        disabled={generatingAiCost}
                                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 transition-colors text-xs font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        {generatingAiCost ? (
                                            <><Loader2 size={12} className="animate-spin" /> Estimating…</>
                                        ) : (
                                            <><Wand2 size={12} /> Generate Estimate</>
                                        )}
                                    </button>
                                )}
                                {(aiCostEstimate ?? permit.ai_estimated_cost) && !generatingAiCost && (
                                    <button
                                        onClick={handleGenerateAiCost}
                                        className="text-[11px] text-[#5B6B7D] hover:text-amber-700 transition-colors"
                                        title="Regenerate estimate"
                                    >
                                        Regenerate
                                    </button>
                                )}
                            </div>

                            {aiCostError && (
                                <div className="px-4 py-3 flex items-center gap-2 text-xs text-red-600">
                                    <AlertCircle size={13} />
                                    {aiCostError}
                                </div>
                            )}

                            {generatingAiCost && !aiCostEstimate && (
                                <div className="px-4 py-6 flex items-center justify-center gap-2 text-xs text-[#5B6B7D]">
                                    <Loader2 size={14} className="animate-spin text-amber-600" />
                                    Analyzing permit data and generating estimate…
                                </div>
                            )}

                            {(aiCostEstimate ?? permit.ai_estimated_cost != null) && (() => {
                                const est = aiCostEstimate;
                                const midpoint = est?.midpoint ?? permit.ai_estimated_cost;
                                const low = est?.low_estimate;
                                const high = est?.high_estimate;
                                const reasoning = est?.reasoning;
                                return (
                                    <div className="px-5 py-4 space-y-4">
                                        <div className="flex items-end gap-4">
                                            <div className="text-center">
                                                <p className="text-[10px] text-[#5B6B7D] uppercase tracking-wider mb-1">Low</p>
                                                <p className="text-base font-mono text-[#5B6B7D]">{low ? formatCurrency(low) : '—'}</p>
                                            </div>
                                            <div className="flex-1 flex flex-col items-center">
                                                <div className="flex items-center gap-1 mb-1">
                                                    <TrendingUp size={12} className="text-amber-600" />
                                                    <p className="text-[10px] text-amber-700 uppercase tracking-wider">Midpoint</p>
                                                </div>
                                                <p className="text-2xl font-bold font-mono text-amber-600">
                                                    {midpoint ? formatCurrency(midpoint) : '—'}
                                                </p>
                                            </div>
                                            <div className="text-center">
                                                <p className="text-[10px] text-[#5B6B7D] uppercase tracking-wider mb-1">High</p>
                                                <p className="text-base font-mono text-[#5B6B7D]">{high ? formatCurrency(high) : '—'}</p>
                                            </div>
                                        </div>
                                        {low && high && midpoint && (
                                            <div className="relative h-1.5 bg-[#DFE6EE] rounded-full overflow-hidden">
                                                <div
                                                    className="absolute top-1/2 -translate-y-1/2 w-2.5 h-2.5 bg-amber-600 rounded-full border-2 border-white"
                                                    style={{ left: `${((midpoint - low) / (high - low)) * 100}%`, transform: 'translate(-50%, -50%)' }}
                                                />
                                            </div>
                                        )}
                                        {reasoning && (
                                            <p className="text-xs text-[#5B6B7D] leading-relaxed border-t border-[#DFE6EE] pt-3">
                                                {reasoning}
                                            </p>
                                        )}
                                        <p className="text-[10px] text-gray-400 italic">
                                            AI-generated estimate · not a formal appraisal
                                        </p>
                                    </div>
                                );
                            })()}

                            {!(aiCostEstimate ?? permit.ai_estimated_cost != null) && !generatingAiCost && !aiCostError && (
                                <div className="px-5 py-5 text-center text-xs text-[#5B6B7D]">
                                    No cost data available. Click <span className="text-amber-700">Generate Estimate</span> to use AI to estimate the project cost from the permit description and scope.
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* ═══ SECTION: PERMIT DETAILS + CONTRACTOR ═══ */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Permit Details */}
                <div className="bg-white border border-[#DFE6EE] rounded-lg overflow-hidden">
                    <SectionHeader icon={FileText} title="Permit Details" />
                    <div className="p-2">
                        <DetailRow icon={Hash} label="External ID" value={permit.external_permit_id} mono />
                        <DetailRow icon={Layers} label="Class" value={permit.permit_class} />
                        <DetailRow icon={BarChart3} label="Stories" value={permit.stories ? String(permit.stories) : null} />
                        <DetailRow icon={Hash} label="Parcel / PIN" value={permit.parcel_number} mono />
                        <DetailRow icon={Globe} label="Community" value={permit.community} />
                    </div>
                    <div className="px-5 pb-4">
                        <DateTimeline
                            dates={[
                                { label: 'Applied', value: permit.application_date, icon: FileText },
                                { label: 'Issued', value: permit.issue_date, icon: Calendar },
                                { label: 'Expires', value: permit.expiration_date, icon: Clock },
                                { label: 'Completed', value: permit.completion_date, icon: Shield },
                            ]}
                        />
                    </div>
                </div>

                {/* Contractor */}
                <div className="bg-white border border-[#DFE6EE] rounded-lg overflow-hidden">
                    <SectionHeader icon={User} title="Contractor" />
                    <div className="p-4 space-y-3">
                        {hasContractor ? (
                            <div className="flex items-center gap-3 py-2 px-3 bg-[#F7F9FB] rounded-lg">
                                <div className="w-9 h-9 rounded-full bg-emerald-50 border border-emerald-200 flex items-center justify-center flex-shrink-0">
                                    <Building2 size={16} className="text-emerald-700" />
                                </div>
                                <div className="min-w-0">
                                    {/* contractor_id is only the real PermitRecord.contractor_id FK
                                        (never the denormalized fallback contractor_name can come
                                        from) -- only link when it's present. */}
                                    {permit.contractor_id ? (
                                        <Link
                                            href={`/dashboard/contractors/${permit.contractor_id}`}
                                            className="text-sm font-semibold text-[#00458B] hover:text-[#045CB4] transition-colors truncate block"
                                        >
                                            {permit.contractor_name}
                                        </Link>
                                    ) : (
                                        <p className="text-sm font-semibold text-[#0E2B5C] truncate">{permit.contractor_name}</p>
                                    )}
                                    {permit.license_number && (
                                        <p className="text-[11px] text-[#5B6B7D] font-mono">License: {permit.license_number}</p>
                                    )}
                                </div>
                            </div>
                        ) : (
                            <div className="flex items-center gap-3 py-2 px-3 bg-[#F7F9FB] rounded-lg text-gray-400">
                                <User size={16} />
                                <p className="italic text-xs">No contractor info</p>
                            </div>
                        )}

                        {permit.owner_name && permit.owner_name !== permit.contractor_name && (
                            <div className="flex items-center gap-3 py-2 px-3 bg-[#F7F9FB] rounded-lg">
                                <Users size={14} className="text-[#5B6B7D]" />
                                <div>
                                    <p className="text-[10px] text-[#5B6B7D] uppercase tracking-wider">Owner</p>
                                    <p className="text-xs text-[#0E2B5C] truncate">{permit.owner_name}</p>
                                </div>
                            </div>
                        )}

                        {permit.contractor_email ? (
                            <a href={`mailto:${permit.contractor_email}`}
                                className="flex items-center gap-3 px-3 py-2.5 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg transition-colors group">
                                <Mail size={14} className="text-[#00458B]" />
                                <span className="text-xs text-[#00458B] truncate">{permit.contractor_email}</span>
                                <ExternalLink size={12} className="ml-auto text-[#00458B]/50 flex-shrink-0" />
                            </a>
                        ) : (
                            <div className="flex items-center gap-3 px-3 py-2 bg-[#F7F9FB] rounded-lg">
                                <Mail size={14} className="text-gray-300" />
                                <span className="text-xs text-gray-400 italic">No email available</span>
                            </div>
                        )}

                        <div className="flex items-center gap-3 px-3 py-2 bg-[#F7F9FB] rounded-lg">
                            <Phone size={14} className={permit.contractor_phone ? 'text-[#5B6B7D]' : 'text-gray-300'} />
                            <span className={`text-xs ${permit.contractor_phone ? 'text-[#0E2B5C]' : 'text-gray-400 italic'}`}>
                                {permit.contractor_phone || 'No phone available'}
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            {/* ═══ SECTION: QUALIFICATION / SCORING ═══ */}
            <div className="space-y-4">
                <div className="flex items-center gap-2.5 px-1">
                    <div className="w-7 h-7 rounded-lg bg-[#F7F9FB] border border-[#DFE6EE] flex items-center justify-center">
                        <Gauge size={14} className="text-[#00458B]" />
                    </div>
                    <h2 className="text-xs font-semibold text-[#5B6B7D] uppercase tracking-wider">Qualification / Scoring</h2>
                </div>

                {/* Qualification logic is fixed and must never be re-derived here:
                    Qualified = !is_excluded && score_bucket set && score_bucket != 'no_send'
                    Invalid/Excluded = is_excluded || score_bucket === 'no_send' */}
                <div className="bg-white border border-[#DFE6EE] rounded-lg px-5 py-4 flex items-center justify-between flex-wrap gap-3">
                    <div className="flex items-center gap-3 flex-wrap">
                        <QualificationBadge isExcluded={isExcluded} scoreBucket={scoreBucket} />
                        {bucketBadge && (
                            <span className={`inline-flex items-center px-2 py-1 rounded-lg text-[10px] font-semibold uppercase tracking-wide border ${bucketBadge.cls}`}>
                                {bucketBadge.label}
                            </span>
                        )}
                        {isExcluded && permit.exclude_reason && (
                            <span className="text-xs text-[#5B6B7D]">
                                Reason: {permit.exclude_reason.replace(/_/g, ' ')}
                            </span>
                        )}
                    </div>
                    {permit.lead_score != null && (
                        <span className="text-sm font-mono text-[#0E2B5C]">
                            {Math.round(permit.lead_score)} <span className="text-[#5B6B7D] text-xs">/ 100</span>
                        </span>
                    )}
                </div>

                <ScoreBreakdownCard permit={permit} />
                <PermitAnalysis permit={permit} />
            </div>

            {/* ═══ SECTION: SOURCE / RECORD INFORMATION ═══ */}
            <div className="bg-white border border-[#DFE6EE] rounded-lg overflow-hidden">
                <SectionHeader icon={Globe} title="Source / Record Information" />
                <div className="p-5 space-y-5">
                    {/* Location */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        <div>
                            <DetailRow icon={MapPin} label="Address" value={permit.full_address} />
                            <DetailRow icon={Hash} label="Zip Code" value={permit.zip_code} mono />
                            <DetailRow
                                icon={Globe}
                                label="Coordinates"
                                value={hasLocation ? `${permit.latitude!.toFixed(5)}, ${permit.longitude!.toFixed(5)}` : null}
                                mono
                            />
                        </div>
                        <div>
                            {hasLocation ? (
                                <div className="rounded-lg overflow-hidden border border-[#DFE6EE] h-[160px]">
                                    <PermitMap
                                        latitude={permit.latitude!}
                                        longitude={permit.longitude!}
                                        address={permit.full_address || 'Permit location'}
                                        permitNumber={permit.permit_number}
                                    />
                                </div>
                            ) : (
                                <div className="h-[160px] rounded-lg bg-[#F7F9FB] border border-dashed border-[#DFE6EE] flex flex-col items-center justify-center text-gray-400 gap-1">
                                    <MapPin size={18} />
                                    <p className="text-[11px]">No location data</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Raw API Data */}
                    <div className="border border-[#DFE6EE] rounded-lg overflow-hidden">
                        <div className="px-4 py-3 flex items-center justify-between border-b border-[#DFE6EE]">
                            <button
                                onClick={toggleRawData}
                                className="flex items-center gap-2.5 flex-1 text-left"
                            >
                                <div className="w-7 h-7 rounded-lg bg-[#F7F9FB] border border-[#DFE6EE] flex items-center justify-center flex-shrink-0">
                                    <Layers size={14} className="text-[#5B6B7D]" />
                                </div>
                                <h3 className="text-xs font-semibold text-[#5B6B7D] uppercase tracking-wider">Raw API Data</h3>
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
                                        title="Copy raw API data to clipboard"
                                        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-medium border transition-colors
                                            border-[#DFE6EE] text-[#5B6B7D] hover:bg-[#F7F9FB] hover:text-[#0E2B5C]"
                                    >
                                        {copied ? (
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
                                    {rawPayloadLoading ? (
                                        <div className="flex items-center gap-2 text-[11px] text-[#5B6B7D] font-mono">
                                            <Loader2 size={12} className="animate-spin" /> Loading source data…
                                        </div>
                                    ) : rawPayload && Object.keys(rawPayload).length > 0 ? (
                                        <pre className="text-[11px] text-[#5B6B7D] font-mono whitespace-pre-wrap break-words leading-relaxed">
                                            {JSON.stringify(rawPayload, null, 2)}
                                        </pre>
                                    ) : (
                                        <p className="text-[11px] text-[#5B6B7D] font-mono italic">
                                            No raw payload stored for this permit.
                                        </p>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Record timestamps */}
                    <div className="flex items-center justify-between text-[11px] text-[#5B6B7D] pt-1">
                        <span>Created {formatDate(permit.created_at)}</span>
                        <span>Updated {formatDate(permit.updated_at)}</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
