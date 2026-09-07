'use client';

import React, { useEffect, useMemo, useState } from 'react';
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
            <div className="w-full h-[300px] rounded-xl bg-black/2 dark:bg-white/3 border border-gray-200 dark:border-white/6 flex items-center justify-center text-gray-500">
                <div className="animate-pulse flex items-center gap-2">
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

const statusConfig: Record<string, { bg: string; text: string; glow: string }> = {
    ISSUED: { bg: 'bg-emerald-500/15', text: 'text-emerald-400', glow: 'shadow-emerald-500/20' },
    COMPLETED: { bg: 'bg-blue-500/15', text: 'text-blue-400', glow: 'shadow-blue-500/20' },
    PENDING: { bg: 'bg-amber-500/15', text: 'text-amber-400', glow: 'shadow-amber-500/20' },
    CANCELLED: { bg: 'bg-red-500/15', text: 'text-red-400', glow: 'shadow-red-500/20' },
    EXPIRED: { bg: 'bg-gray-500/15', text: 'text-gray-400', glow: 'shadow-gray-500/20' },
    UNKNOWN: { bg: 'bg-purple-500/15', text: 'text-purple-400', glow: 'shadow-purple-500/20' },
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

function MetricCard({
    icon: Icon,
    label,
    value,
    subtext,
    accentClass = 'text-cyan-400',
}: {
    icon: React.ComponentType<{ size?: number; className?: string }>;
    label: string;
    value: string;
    subtext?: string;
    accentClass?: string;
}) {
    const isEmpty = value === '—';
    return (
        <div className="bg-black/2 dark:bg-white/3 hover:bg-black/4 dark:hover:bg-white/5 border border-gray-200 dark:border-white/6 rounded-xl p-4 transition-all duration-300 group">
            <div className="flex items-center gap-2 mb-2">
                <Icon size={14} className={isEmpty ? 'text-gray-600' : accentClass} />
                <span className="text-[11px] text-gray-500 uppercase tracking-wider font-medium">{label}</span>
            </div>
            <p className={`text-lg font-semibold ${isEmpty ? 'text-gray-600 italic text-sm' : 'text-gray-900 dark:text-white'} leading-tight`}>
                {value}
            </p>
            {subtext && !isEmpty && (
                <p className="text-[11px] text-gray-500 mt-1">{subtext}</p>
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
                        <div className={`flex flex-col items-center min-w-[100px] px-2 ${hasValue ? '' : 'opacity-30'}`}>
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center mb-1.5 ${hasValue
                                    ? 'bg-cyan-500/20 border border-cyan-500/30'
                                    : 'bg-black/2 dark:bg-white/3 border border-gray-200 dark:border-white/6'
                                }`}>
                                <Icon size={14} className={hasValue ? 'text-cyan-400' : 'text-gray-600'} />
                            </div>
                            <span className="text-[10px] text-gray-500 uppercase tracking-wider">{d.label}</span>
                            <span className={`text-xs font-medium mt-0.5 ${hasValue ? 'text-gray-600 dark:text-gray-300' : 'text-gray-300 dark:text-gray-700'}`}>
                                {hasValue ? formatShortDate(d.value) : '—'}
                            </span>
                        </div>
                        {i < dates.length - 1 && (
                            <div className="flex-shrink-0 mt-[-18px]">
                                <ArrowRight size={12} className={`${dates[i + 1]?.value ? 'text-cyan-500/40' : 'text-gray-300 dark:text-gray-700'}`} />
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
        <div className="flex items-center gap-3 py-2 px-3 rounded-lg hover:bg-black/2 dark:hover:bg-white/2 transition-colors">
            <Icon size={14} className="text-gray-600 flex-shrink-0" />
            <span className="text-xs text-gray-500 uppercase tracking-wider w-28 flex-shrink-0">{label}</span>
            {href && !isEmpty ? (
                <a href={href} className={`text-sm text-cyan-400 hover:text-cyan-300 transition-colors ${mono ? 'font-mono text-xs' : ''}`}>
                    {displayValue}
                </a>
            ) : (
                <span className={`text-sm ${isEmpty ? 'text-gray-600 italic' : 'text-gray-700 dark:text-gray-200'} ${mono ? 'font-mono text-xs' : ''} truncate`}>
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
            <div className="flex-1 h-1.5 bg-gray-200 dark:bg-white/6 rounded-full overflow-hidden">
                <div
                    className={`h-full ${color} rounded-full transition-all duration-1000`}
                    style={{ width: `${pct}%` }}
                />
            </div>
            <span className="text-[11px] text-gray-500 font-mono whitespace-nowrap">
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
                <button onClick={() => router.back()} className="flex items-center gap-2 text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors">
                    <ArrowLeft size={18} /> Back
                </button>
                <div className="animate-pulse space-y-4">
                    <div className="h-32 bg-black/2 dark:bg-white/3 rounded-2xl" />
                    <div className="grid grid-cols-4 gap-3">
                        {[1, 2, 3, 4].map(i => <div key={i} className="h-24 bg-black/2 dark:bg-white/3 rounded-xl" />)}
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="h-64 bg-black/2 dark:bg-white/3 rounded-xl" />
                        <div className="h-64 bg-black/2 dark:bg-white/3 rounded-xl" />
                    </div>
                </div>
            </div>
        );
    }

    // Error state
    if (error || !permit) {
        return (
            <div className="p-6 space-y-6 max-w-[1100px] mx-auto">
                <button onClick={() => router.back()} className="flex items-center gap-2 text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors">
                    <ArrowLeft size={18} /> Back
                </button>
                <div className="flex flex-col items-center justify-center py-20 text-center">
                    <div className="w-16 h-16 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center mb-4">
                        <AlertCircle size={28} className="text-red-400" />
                    </div>
                    <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">Permit Not Found</h2>
                    <p className="text-gray-500 dark:text-gray-400 max-w-md mb-6">{error || 'The permit you are looking for could not be found.'}</p>
                    <button
                        onClick={() => router.push('/dashboard/permits')}
                        className="px-5 py-2.5 bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/20 text-cyan-400 rounded-lg transition-colors text-sm font-medium"
                    >
                        Return to Permits
                    </button>
                </div>
            </div>
        );
    }

    const status = statusConfig[permit.status] || statusConfig.UNKNOWN;
    const hasLocation = permit.latitude != null && permit.longitude != null;
    const hasContractor = !!permit.contractor_name;
    const displaySubtype = permit.permit_subtype || permit.permit_class;

    return (
        <div className="p-6 space-y-5 max-w-[1100px] mx-auto">
            {/* Back Button */}
            <button
                onClick={() => router.back()}
                className="flex items-center gap-2 text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors group"
            >
                <ArrowLeft size={16} className="group-hover:-translate-x-0.5 transition-transform" />
                <span className="text-sm">Back to Permits</span>
            </button>

            {/* ─── HERO HEADER ─── */}
            <div className="relative overflow-hidden rounded-2xl border border-gray-200 dark:border-white/8">
                {/* Gradient background */}
                <div className="absolute inset-0 bg-gradient-to-br from-cyan-50 via-white to-purple-50 dark:from-cyan-950/40 dark:via-gray-900/60 dark:to-purple-950/30" />
                <div className="absolute top-0 right-0 w-96 h-96 bg-cyan-500/5 dark:bg-cyan-500/4 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />

                <div className="relative px-6 py-6">
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                        <div className="space-y-3">
                            {/* Permit number + status */}
                            <div className="flex items-center gap-3 flex-wrap">
                                <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white tracking-tight">
                                    #{permit.permit_number}
                                </h1>
                                <span className={`inline-flex items-center px-3 py-1 rounded-lg text-xs font-bold border border-gray-200 dark:border-white/8 shadow-lg ${status.bg} ${status.text} ${status.glow}`}>
                                    {permit.status}
                                </span>
                            </div>

                            {/* Meta row */}
                            <div className="flex items-center gap-3 text-gray-500 dark:text-gray-400 text-sm flex-wrap">
                                {permit.city && (
                                    <span className="flex items-center gap-1.5">
                                        <MapPin size={13} className="text-gray-500" />
                                        {permit.city}, {permit.state_code}
                                    </span>
                                )}
                                <span className="text-gray-300 dark:text-gray-700">•</span>
                                <span className="flex items-center gap-1.5">
                                    <FileText size={13} className="text-gray-500" />
                                    {permit.permit_type}
                                    {displaySubtype && <span className="text-gray-600"> — {displaySubtype}</span>}
                                </span>
                                {permit.community && (
                                    <>
                                        <span className="text-gray-300 dark:text-gray-700">•</span>
                                        <span className="px-2 py-0.5 bg-purple-500/10 text-purple-400 border border-purple-500/15 rounded text-[11px] capitalize">
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
                                    <p className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-400 font-mono">
                                        {formatCurrency(permit.estimated_cost)}
                                    </p>
                                    <p className="text-[11px] text-gray-500 uppercase tracking-wider mt-1">Estimated Cost</p>
                                </>
                            ) : (aiCostEstimate?.midpoint ?? permit.ai_estimated_cost) ? (
                                <>
                                    <p className="text-3xl font-bold text-amber-400 font-mono italic">
                                        ~{formatCurrency(aiCostEstimate?.midpoint ?? permit.ai_estimated_cost)}
                                    </p>
                                    <p className="text-[11px] text-amber-500/70 uppercase tracking-wider mt-1">
                                        AI Estimate · {(aiCostEstimate?.confidence ?? permit.ai_cost_confidence) || 'low'} confidence
                                    </p>
                                </>
                            ) : (
                                <div className="text-right">
                                    <p className="text-lg text-gray-600 font-mono">—</p>
                                    <p className="text-[11px] text-gray-600 uppercase tracking-wider mt-1">Cost N/A</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* ─── KEY METRICS BAR ─── */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <MetricCard
                    icon={Calendar}
                    label="Issue Date"
                    value={formatDate(permit.issue_date)}
                    accentClass="text-emerald-400"
                />
                <MetricCard
                    icon={DollarSign}
                    label="Total Fee"
                    value={formatCurrency(permit.total_fee)}
                    accentClass="text-amber-400"
                />
                <MetricCard
                    icon={Home}
                    label="Housing Units"
                    value={permit.housing_units ? String(permit.housing_units) : '—'}
                    accentClass="text-blue-400"
                />
                <MetricCard
                    icon={Ruler}
                    label="Square Footage"
                    value={permit.square_footage ? `${permit.square_footage.toLocaleString()} sq ft` : '—'}
                    accentClass="text-purple-400"
                />
            </div>

            {/* ─── DATE TIMELINE ─── */}
            <div className="bg-black/2 dark:bg-white/2 border border-gray-200 dark:border-white/6 rounded-xl px-5 py-3">
                <DateTimeline
                    dates={[
                        { label: 'Applied', value: permit.application_date, icon: FileText },
                        { label: 'Issued', value: permit.issue_date, icon: Calendar },
                        { label: 'Expires', value: permit.expiration_date, icon: Clock },
                        { label: 'Completed', value: permit.completion_date, icon: Shield },
                    ]}
                />
            </div>

            {/* ─── RAW API DATA ─── */}
            <div className="bg-black/2 dark:bg-white/2 border border-gray-200 dark:border-white/6 rounded-xl overflow-hidden">
                <div className="px-4 py-3 flex items-center justify-between border-b border-gray-200 dark:border-white/6">
                    <button
                        onClick={toggleRawData}
                        className="flex items-center gap-2.5 flex-1 text-left"
                    >
                        <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-gray-500 to-gray-600 flex items-center justify-center flex-shrink-0">
                            <Layers size={14} className="text-white" />
                        </div>
                        <h2 className="text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">Raw API Data</h2>
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
                                title="Copy raw API data to clipboard"
                                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-medium border transition-colors
                                    border-gray-200 dark:border-white/10 text-gray-500 dark:text-gray-400
                                    hover:bg-gray-100 dark:hover:bg-white/6 hover:text-gray-700 dark:hover:text-gray-200"
                            >
                                {copied ? (
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
                            {rawPayloadLoading ? (
                                <div className="flex items-center gap-2 text-[11px] text-gray-500 dark:text-gray-400 font-mono">
                                    <span className="animate-spin inline-block">⟳</span> Loading source data…
                                </div>
                            ) : rawPayload && Object.keys(rawPayload).length > 0 ? (
                                <pre className="text-[11px] text-gray-500 dark:text-gray-400 font-mono whitespace-pre-wrap break-words leading-relaxed">
                                    {JSON.stringify(rawPayload, null, 2)}
                                </pre>
                            ) : (
                                <p className="text-[11px] text-gray-500 dark:text-gray-400 font-mono italic">
                                    No raw payload stored for this permit.
                                </p>
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* ─── MAIN CONTENT GRID ─── */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                {/* Column 1: Permit Details */}
                <div className="bg-black/2 dark:bg-white/2 border border-gray-200 dark:border-white/6 rounded-xl overflow-hidden">
                    <div className="px-4 py-3 border-b border-gray-200 dark:border-white/6 flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center">
                            <FileText size={14} className="text-white" />
                        </div>
                        <h2 className="text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">Permit Details</h2>
                    </div>
                    <div className="p-2">
                        <DetailRow icon={Hash} label="External ID" value={permit.external_permit_id} mono />
                        <DetailRow icon={Layers} label="Class" value={permit.permit_class} />
                        <DetailRow icon={BarChart3} label="Stories" value={permit.stories ? String(permit.stories) : null} />
                        <DetailRow icon={Hash} label="Parcel / PIN" value={permit.parcel_number} mono />
                        <DetailRow icon={Globe} label="Community" value={permit.community} />
                    </div>
                </div>

                {/* Column 2: Contractor & Owner */}
                <div className="bg-black/2 dark:bg-white/2 border border-gray-200 dark:border-white/6 rounded-xl overflow-hidden">
                    <div className="px-4 py-3 border-b border-gray-200 dark:border-white/6 flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center">
                            <User size={14} className="text-white" />
                        </div>
                        <h2 className="text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">Contractor</h2>
                    </div>
                    <div className="p-4 space-y-3">
                        {hasContractor ? (
                            <div className="flex items-center gap-3 py-2 px-3 bg-black/2 dark:bg-white/2 rounded-lg">
                                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center flex-shrink-0">
                                    <Building2 size={16} className="text-white" />
                                </div>
                                <div className="min-w-0">
                                    {/* contractor_id is only the real PermitRecord.contractor_id FK
                                        (never the denormalized fallback contractor_name can come
                                        from) -- only link when it's present. */}
                                    {permit.contractor_id ? (
                                        <Link
                                            href={`/dashboard/contractors/${permit.contractor_id}`}
                                            className="text-sm font-semibold text-cyan-400 hover:text-cyan-300 transition-colors truncate block"
                                        >
                                            {permit.contractor_name}
                                        </Link>
                                    ) : (
                                        <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">{permit.contractor_name}</p>
                                    )}
                                    {permit.license_number && (
                                        <p className="text-[11px] text-gray-500 font-mono">License: {permit.license_number}</p>
                                    )}
                                </div>
                            </div>
                        ) : (
                            <div className="flex items-center gap-3 py-2 px-3 bg-black/2 dark:bg-white/2 rounded-lg text-gray-600">
                                <User size={16} />
                                <p className="italic text-xs">No contractor info</p>
                            </div>
                        )}

                        {permit.owner_name && permit.owner_name !== permit.contractor_name && (
                            <div className="flex items-center gap-3 py-2 px-3 bg-black/2 dark:bg-white/2 rounded-lg">
                                <Users size={14} className="text-gray-500" />
                                <div>
                                    <p className="text-[10px] text-gray-500 uppercase tracking-wider">Owner</p>
                                    <p className="text-xs text-gray-600 dark:text-gray-300 truncate">{permit.owner_name}</p>
                                </div>
                            </div>
                        )}

                        {permit.contractor_email ? (
                            <a href={`mailto:${permit.contractor_email}`}
                                className="flex items-center gap-3 px-3 py-2.5 bg-cyan-500/8 hover:bg-cyan-500/12 border border-cyan-500/15 rounded-lg transition-colors group">
                                <Mail size={14} className="text-cyan-400" />
                                <span className="text-xs text-cyan-400 group-hover:text-cyan-300 truncate">{permit.contractor_email}</span>
                                <ExternalLink size={12} className="ml-auto text-cyan-500/40 flex-shrink-0" />
                            </a>
                        ) : (
                            <div className="flex items-center gap-3 px-3 py-2 bg-black/2 dark:bg-white/2 rounded-lg">
                                <Mail size={14} className="text-gray-600" />
                                <span className="text-xs text-gray-600 italic">No email available</span>
                            </div>
                        )}

                        <div className="flex items-center gap-3 px-3 py-2 bg-black/2 dark:bg-white/2 rounded-lg">
                            <Phone size={14} className={permit.contractor_phone ? 'text-gray-500 dark:text-gray-400' : 'text-gray-600'} />
                            <span className={`text-xs ${permit.contractor_phone ? 'text-gray-600 dark:text-gray-300' : 'text-gray-600 italic'}`}>
                                {permit.contractor_phone || 'No phone available'}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Column 3: Location Summary */}
                <div className="bg-black/2 dark:bg-white/2 border border-gray-200 dark:border-white/6 rounded-xl overflow-hidden">
                    <div className="px-4 py-3 border-b border-gray-200 dark:border-white/6 flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
                            <MapPin size={14} className="text-white" />
                        </div>
                        <h2 className="text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">Location</h2>
                    </div>
                    <div className="p-2">
                        <DetailRow icon={MapPin} label="Address" value={permit.full_address} />
                        <DetailRow icon={Hash} label="Zip Code" value={permit.zip_code} mono />
                        <DetailRow
                            icon={Globe}
                            label="Coordinates"
                            value={hasLocation ? `${permit.latitude!.toFixed(5)}, ${permit.longitude!.toFixed(5)}` : null}
                            mono
                        />
                    </div>
                    {/* Mini map preview */}
                    {hasLocation && (
                        <div className="px-3 pb-3">
                            <div className="rounded-lg overflow-hidden border border-gray-200 dark:border-white/6 h-[140px]">
                                <PermitMap
                                    latitude={permit.latitude!}
                                    longitude={permit.longitude!}
                                    address={permit.full_address || 'Permit location'}
                                    permitNumber={permit.permit_number}
                                />
                            </div>
                        </div>
                    )}
                    {!hasLocation && (
                        <div className="px-3 pb-3">
                            <div className="h-[100px] rounded-lg bg-black/2 dark:bg-white/2 border border-gray-200 dark:border-white/6 border-dashed flex flex-col items-center justify-center text-gray-400 dark:text-gray-600 gap-1">
                                <MapPin size={18} />
                                <p className="text-[11px]">No location data</p>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* ─── WORK DESCRIPTION ─── */}
            {permit.work_description && (
                <div className="bg-black/2 dark:bg-white/2 border border-gray-200 dark:border-white/6 rounded-xl overflow-hidden">
                    <div className="px-4 py-3 border-b border-gray-200 dark:border-white/6 flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center">
                            <Hammer size={14} className="text-white" />
                        </div>
                        <h2 className="text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">Work Description</h2>
                    </div>
                    <div className="px-5 py-4">
                        <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed whitespace-pre-wrap">{permit.work_description}</p>
                    </div>
                </div>
            )}

            {/* ─── AI COST ESTIMATE ─── */}
            {permit.estimated_cost == null && (
                <div className="bg-black/2 dark:bg-white/2 border border-gray-200 dark:border-white/6 rounded-xl overflow-hidden">
                    <div className="px-4 py-3 border-b border-gray-200 dark:border-white/6 flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center">
                                <Wand2 size={14} className="text-white" />
                            </div>
                            <h2 className="text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">AI Cost Estimate</h2>
                            {(aiCostEstimate ?? permit.ai_estimated_cost) && (
                                <span className="text-[10px] px-2 py-0.5 bg-amber-500/10 text-amber-500 border border-amber-500/20 rounded-full uppercase tracking-wide">
                                    {aiCostEstimate?.confidence ?? permit.ai_cost_confidence ?? 'low'} confidence
                                </span>
                            )}
                        </div>
                        {!(aiCostEstimate ?? permit.ai_estimated_cost) && (
                            <button
                                onClick={handleGenerateAiCost}
                                disabled={generatingAiCost}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-500 hover:text-amber-400 border border-amber-500/20 transition-all text-xs font-medium disabled:opacity-50 disabled:cursor-not-allowed"
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
                                className="text-[11px] text-gray-500 hover:text-amber-400 transition-colors"
                                title="Regenerate estimate"
                            >
                                Regenerate
                            </button>
                        )}
                    </div>

                    {/* Content */}
                    {aiCostError && (
                        <div className="px-4 py-3 flex items-center gap-2 text-xs text-red-400">
                            <AlertCircle size={13} />
                            {aiCostError}
                        </div>
                    )}

                    {generatingAiCost && !aiCostEstimate && (
                        <div className="px-4 py-6 flex items-center justify-center gap-2 text-xs text-gray-500">
                            <Loader2 size={14} className="animate-spin text-amber-400" />
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
                                {/* Range bar */}
                                <div className="flex items-end gap-4">
                                    <div className="text-center">
                                        <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">Low</p>
                                        <p className="text-base font-mono text-gray-600 dark:text-gray-400">{low ? formatCurrency(low) : '—'}</p>
                                    </div>
                                    <div className="flex-1 flex flex-col items-center">
                                        <div className="flex items-center gap-1 mb-1">
                                            <TrendingUp size={12} className="text-amber-400" />
                                            <p className="text-[10px] text-amber-500 uppercase tracking-wider">Midpoint</p>
                                        </div>
                                        <p className="text-2xl font-bold font-mono text-amber-400">
                                            {midpoint ? formatCurrency(midpoint) : '—'}
                                        </p>
                                    </div>
                                    <div className="text-center">
                                        <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">High</p>
                                        <p className="text-base font-mono text-gray-600 dark:text-gray-400">{high ? formatCurrency(high) : '—'}</p>
                                    </div>
                                </div>
                                {/* Visual range bar */}
                                {low && high && midpoint && (
                                    <div className="relative h-1.5 bg-gray-200 dark:bg-white/6 rounded-full overflow-hidden">
                                        <div className="absolute inset-0 bg-gradient-to-r from-amber-300/40 via-amber-400 to-amber-300/40 rounded-full" />
                                        <div
                                            className="absolute top-1/2 -translate-y-1/2 w-2.5 h-2.5 bg-amber-400 rounded-full border-2 border-white dark:border-gray-900 shadow"
                                            style={{ left: `${((midpoint - low) / (high - low)) * 100}%`, transform: 'translate(-50%, -50%)' }}
                                        />
                                    </div>
                                )}
                                {/* Reasoning */}
                                {reasoning && (
                                    <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed border-t border-gray-200 dark:border-white/6 pt-3">
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
                        <div className="px-5 py-5 text-center text-xs text-gray-500">
                            No cost data available. Click <span className="text-amber-400">Generate Estimate</span> to use AI to estimate the project cost from the permit description and scope.
                        </div>
                    )}
                </div>
            )}

            {/* ─── FULL MAP (when coordinates available) ─── */}
            {hasLocation && (
                <div className="bg-black/2 dark:bg-white/2 border border-gray-200 dark:border-white/6 rounded-xl overflow-hidden">
                    <div className="px-4 py-3 border-b border-gray-200 dark:border-white/6 flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
                                <Globe size={14} className="text-white" />
                            </div>
                            <h2 className="text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">Permit Location</h2>
                        </div>
                        {permit.full_address && (
                            <span className="text-xs text-gray-500 hidden sm:block">{permit.full_address}</span>
                        )}
                    </div>
                    <div className="h-[300px]">
                        <PermitMap
                            latitude={permit.latitude!}
                            longitude={permit.longitude!}
                            address={permit.full_address || 'Permit location'}
                            permitNumber={permit.permit_number}
                        />
                    </div>
                </div>
            )}

            {/* ─── SCORE BREAKDOWN ─── */}
            <ScoreBreakdownCard permit={permit} />

            {/* ─── AI PERMIT ANALYSIS ─── */}
            <PermitAnalysis permit={permit} />

            {/* ─── FOOTER ─── */}
            <div className="flex items-center justify-between text-[11px] text-gray-600 px-1 pb-6">
                <span>Created {formatDate(permit.created_at)}</span>
                <span>Updated {formatDate(permit.updated_at)}</span>
            </div>
        </div>
    );
}
