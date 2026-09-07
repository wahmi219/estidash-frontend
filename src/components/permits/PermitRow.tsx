'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Calendar, ExternalLink, User, Wand2, Loader2, Star, CheckCircle2, XCircle } from 'lucide-react';
import { PermitRecord } from '@/types';
import { apiService } from '@/services/api';

interface PermitRowProps {
    permit: PermitRecord;
    isSelected?: boolean;
    onToggleSelect?: (id: string) => void;
    onViewDetails?: (permit: PermitRecord) => void;
}

// Light-theme status badges (Estimation Hub palette)
const GREEN = 'bg-green-50 text-green-700 border-green-200';
const BLUE = 'bg-blue-50 text-blue-700 border-blue-200';
const YELLOW = 'bg-yellow-50 text-yellow-800 border-yellow-200';
const ORANGE = 'bg-orange-50 text-orange-700 border-orange-200';
const RED = 'bg-red-50 text-red-700 border-red-200';
const PURPLE = 'bg-purple-50 text-purple-700 border-purple-200';
const GRAY = 'bg-gray-100 text-[#5B6B7D] border-gray-200';

const statusColors: Record<string, string> = {
    // Active / Issued
    'ISSUED': GREEN,
    'PERMIT ISSUED': GREEN,
    'PERMIT': GREEN,
    'OPEN': GREEN,
    'ISSUE': GREEN,
    'APPROVED (NOT UNDER CONSTRUCTION)': GREEN,
    'APRV_NR': GREEN,
    'UNDER CONSTRUCTION': GREEN,
    'APPROVED TO CALL INSPECTION': GREEN,
    'CERTIFICATE': GREEN,
    'ISSUANCE FEES PAID': GREEN,
    'AWAITING PERMIT ISSUANCE': GREEN,
    'FOUNDATION RELEASE': GREEN,
    // Completed / Finaled
    'COMPLETED': BLUE,
    'PERMIT FINALED': BLUE,
    'FINAL': BLUE,
    'COMPLETION REPORT RECEIVED': BLUE,
    'FINAL INSPECTION PASSED': BLUE,
    'SIGNED-OFF': BLUE,
    'REVIEWED': BLUE,
    'REVIEWS COMPLETED': BLUE,
    // Pending / In-progress
    'PENDING': YELLOW,
    'APPLIED': YELLOW,
    'ROUTE': YELLOW,
    'APPLICATION RECEIVED': YELLOW,
    'NEW': YELLOW,
    'PENDING PLANS REVIEW ASSIGNMENT': YELLOW,
    'PENDING PLANS REVIEW': YELLOW,
    'PENDING PRESCREEN REVIEW': YELLOW,
    'APPLICATION COMPLETED': YELLOW,
    'PAID': YELLOW,
    'IN PROCESS': YELLOW,
    'PLAN REVIEW': YELLOW,
    'PLAN SET SUBMITTED': YELLOW,
    'REVIEWS IN PROCESS': YELLOW,
    'SCHEDULED': YELLOW,
    'SCHEDULED AND SUBMITTED': YELLOW,
    'READY FOR ISSUANCE': YELLOW,
    'READY FOR INTAKE': YELLOW,
    'FEES PAID': YELLOW,
    'REVISION FEES PAID': YELLOW,
    'FEES DUE': YELLOW,
    'PHASED PERMITTING': YELLOW,
    'INITIATED': YELLOW,
    'PENDING - BUILDING BY-LAW REVIEW': YELLOW,
    // Needs attention
    'ADDITIONAL INFO REQUESTED': ORANGE,
    'CORRECTIONS REQUIRED': ORANGE,
    'CORRECTIONS SUBMITTED': ORANGE,
    'AWAITING INFORMATION': ORANGE,
    'AWAITING CLIENT REPLY': ORANGE,
    'AWAITING REVISION ISSUANCE': ORANGE,
    'MORE INFORMATION REQUIRED': ORANGE,
    'CALL NOTIFICATION RECEIVED': ORANGE,
    // Inspection-related
    'INSPECTION FOLLOWUP': PURPLE,
    'INSPECTING': PURPLE,
    'SYSTEM INSPECTION': PURPLE,
    'READY_FOR_INSPECTIONS': PURPLE,
    // Cancelled / Denied / Stopped
    'CANCELLED': RED,
    'VOID': RED,
    'VOIDED': RED,
    'DENIED': RED,
    'REFUSED': RED,
    'REVOKED': RED,
    'STOP WORK': RED,
    'APPLICATION CANCELED': RED,
    'WITHDRWN': RED,
    'APPLICATION WITHDRAWN': RED,
    'W/REFUND': RED,
    // Hold / Suspended
    'HOLD': ORANGE,
    'ON HOLD': ORANGE,
    'HOLD - PENDING PLANS REVIEW': ORANGE,
    'HOLD - PRESCREEN REVIEW': ORANGE,
    'SUSPENDED': ORANGE,
    // Inactive / Other
    'EXPIRED': GRAY,
    'APP_EXP': GRAY,
    'SYSTEM ABANDONED': GRAY,
    'WELL ABANDONED': GRAY,
    'DEMOLITIONS': GRAY,
    'SEPTIC SYSTEM ATTRIBUTES & CONDITIONS': GRAY,
    'UNKNOWN': GRAY,
};

function formatCurrency(value: number | null): string {
    if (value === null || value === 0) return '—';
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        maximumFractionDigits: 0,
    }).format(value);
}

// Parses a YYYY-MM-DD (date-only) string manually to avoid timezone offset bugs.
function parseDateOnly(dateStr: string): Date | null {
    const parts = dateStr.split('T')[0].split('-');
    if (parts.length !== 3) return null;
    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    const day = parseInt(parts[2], 10);
    return new Date(year, month, day);
}

// Abbreviated, no year — used for the secondary "Permit: Aug 29" line in the Added cell.
function formatShortDate(dateStr: string | null): string | null {
    if (!dateStr) return null;
    const d = parseDateOnly(dateStr);
    if (!d) return dateStr;
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

// created_at is a full timestamp (with time/timezone) — safe to hand straight to Date,
// unlike the date-only fields above which need manual parsing to dodge TZ shift.
function formatDateTime(dateStr: string): string {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
    });
}

// Contractor-side lead score bucket (distinct from the permit-level qualification below)
const BUCKET_BADGE: Record<string, { label: string; cls: string }> = {
    strategic:     { label: 'Strategic',  cls: 'bg-amber-50 text-amber-700 border-amber-200' },
    strong:        { label: 'Strong',     cls: 'bg-green-50 text-green-700 border-green-200' },
    volume_engine: { label: 'Volume',     cls: 'bg-blue-50 text-blue-700 border-blue-200' },
    opportunistic: { label: 'Opport.',    cls: 'bg-gray-100 text-[#5B6B7D] border-gray-200' },
    unqualified:   { label: 'Unqualif.',  cls: 'bg-red-50 text-red-700 border-red-200' },
};

function ContractorScoreBadge({ bucket, score }: { bucket: string | null; score: number | null }) {
    if (!bucket) return null;
    const b = BUCKET_BADGE[bucket];
    if (!b) return null;
    return (
        <div className={`mt-1 ml-5.5 inline-flex items-center gap-1 px-1.5 py-0.5 rounded border text-[10px] font-semibold uppercase tracking-wide ${b.cls}`}>
            {bucket === 'strategic' && <Star size={8} className="shrink-0" />}
            {b.label}
            {score != null && <span className="font-mono opacity-70 ml-0.5">{score.toFixed(0)}</span>}
        </div>
    );
}

// Permit-level score bucket (secondary detail under the business qualification state)
const PERMIT_BUCKET_BADGE: Record<string, { label: string; cls: string }> = {
    strategic:     { label: 'Strategic', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
    strong:        { label: 'Strong',    cls: 'bg-cyan-50 text-cyan-700 border-cyan-200' },
    core:          { label: 'Core',      cls: 'bg-blue-50 text-blue-700 border-blue-200' },
    opportunistic: { label: 'Opport.',   cls: 'bg-amber-50 text-amber-700 border-amber-200' },
    no_send:       { label: 'No Send',   cls: 'bg-gray-100 text-[#5B6B7D] border-gray-200' },
};

// Primary = the business qualification state (Qualified / Invalid & Excluded) — mirrors
// the backend's `qualification` filter exactly. Secondary = the existing score-bucket
// badge, kept as supporting detail underneath (never shown as the primary label on its
// own — a bucket like "Strategic" is not itself the qualification state).
function QualificationCell({ bucket, tier, score, excluded, reason }: {
    bucket: string | null; tier: string | null; score: number | null; excluded: boolean; reason: string | null;
}) {
    const isInvalid = excluded || bucket === 'no_send';
    const isQualified = !excluded && !!bucket && bucket !== 'no_send';

    const bucketBadge = excluded ? null : (bucket ? PERMIT_BUCKET_BADGE[bucket] : null);

    return (
        <div className="flex flex-col items-end gap-1">
            {isQualified && (
                <span className="inline-flex items-center gap-1 text-xs font-semibold text-green-700">
                    <CheckCircle2 size={12} className="shrink-0" />
                    Qualified
                </span>
            )}
            {isInvalid && (
                <span
                    className="inline-flex items-center gap-1 text-xs font-semibold text-red-700"
                    title={reason ? `Excluded: ${reason.replace(/_/g, ' ')}` : undefined}
                >
                    <XCircle size={12} className="shrink-0" />
                    Invalid / Excluded
                </span>
            )}
            {bucketBadge && (
                <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded border text-[10px] font-semibold uppercase tracking-wide ${bucketBadge.cls}`}
                    title={`Score bucket${tier ? ` · Tier ${tier}` : ''}`}>
                    {bucketBadge.label}
                    {tier && <span className="opacity-80">·{tier}</span>}
                    {score != null && <span className="font-mono opacity-70 ml-0.5">{score.toFixed(0)}</span>}
                </span>
            )}
            {isInvalid && bucket === 'no_send' && !bucketBadge && (
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded border text-[10px] font-semibold uppercase tracking-wide bg-gray-100 text-[#5B6B7D] border-gray-200">
                    No Send
                </span>
            )}
        </div>
    );
}

const PermitRow = React.forwardRef<HTMLTableRowElement, PermitRowProps>(function PermitRow(
    { permit, isSelected, onToggleSelect, onViewDetails }: PermitRowProps,
    ref,
) {
    const statusClass = statusColors[permit.status] || GRAY;
    const contractorName = permit.contractor_name || null;
    const showSelection = onToggleSelect !== undefined;

    const [generatingCost, setGeneratingCost] = useState(false);
    const [generatedCost, setGeneratedCost] = useState<{ midpoint: number; confidence: string } | null>(null);

    async function handleGenerateCost(e: React.MouseEvent) {
        e.stopPropagation();
        if (generatingCost) return;
        setGeneratingCost(true);
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
            if (result.success && result.estimate?.midpoint) {
                setGeneratedCost({
                    midpoint: result.estimate.midpoint,
                    confidence: result.estimate.confidence ?? 'low',
                });
            }
        } catch {
            // silently fail — user can retry
        } finally {
            setGeneratingCost(false);
        }
    }

    const permitDateShort = formatShortDate(permit.issue_date || permit.application_date);

    return (
        <tr
            ref={ref}
            className={`hover:bg-[#F7F9FB] transition-colors group cursor-pointer ${isSelected ? 'bg-[#00458B]/5' : ''}`}
            onClick={() => onViewDetails?.(permit)}
        >
            {/* Checkbox — only rendered when selection is enabled (admin/super_admin) */}
            {showSelection && (
                <td className="px-4 py-3 w-10">
                    <input
                        type="checkbox"
                        checked={!!isSelected}
                        onChange={(e) => { e.stopPropagation(); onToggleSelect?.(permit.id); }}
                        onClick={(e) => e.stopPropagation()}
                        className="w-4 h-4 rounded border-[#DFE6EE] bg-white text-[#00458B] focus:ring-[#00458B]/30 cursor-pointer"
                    />
                </td>
            )}

            {/* Added — primary: Estimation Hub added timestamp, secondary: jurisdiction Permit Date */}
            <td className="px-4 py-3 text-[#0E2B5C] whitespace-nowrap">
                <div className="flex items-center gap-2">
                    <Calendar size={14} className="text-[#5B6B7D]" />
                    {formatDateTime(permit.created_at)}
                </div>
                {permitDateShort && (
                    <div className="mt-0.5 text-xs text-[#5B6B7D]">
                        Permit: {permitDateShort}
                    </div>
                )}
            </td>

            {/* Permit / Project Scope */}
            <td className="px-4 py-3 text-[#0E2B5C] max-w-60">
                <div className="font-mono text-sm">{permit.permit_number}</div>
                <div className="text-xs text-[#5B6B7D] truncate" title={permit.permit_type}>
                    {permit.permit_type}
                    {permit.permit_subtype ? ` · ${permit.permit_subtype}` : ''}
                </div>
                <span className={`inline-flex items-center mt-1 px-2 py-0.5 rounded text-[10px] font-medium border ${statusClass}`}>
                    {permit.status}
                </span>
            </td>

            {/* Location */}
            <td className="px-4 py-3 text-[#0E2B5C] whitespace-nowrap">
                <div>{permit.city}, {permit.state_code}</div>
                {permit.county_name && (
                    <div className="text-xs text-[#5B6B7D] mt-0.5">{permit.county_name}</div>
                )}
            </td>

            {/* Contractor — contractor_id (link to the Contractor Master), not contractor_name,
                is the authoritative signal that Contractor Verification is complete. A name can
                exist from denormalized source data without ever being linked to a Contractor
                record, so "has a name" must never be read as "verification done". */}
            <td className="px-4 py-3 text-[#0E2B5C] max-w-40">
                <div className="flex items-center gap-2">
                    <User size={14} className="text-[#5B6B7D] shrink-0" />
                    {permit.contractor_id ? (
                        <Link
                            href={`/dashboard/contractors/${permit.contractor_id}`}
                            onClick={(e) => e.stopPropagation()}
                            className="truncate text-[#00458B] hover:text-[#045CB4] transition-colors"
                            title={contractorName ?? undefined}
                        >
                            {contractorName}
                        </Link>
                    ) : contractorName ? (
                        <span className="truncate" title={contractorName}>
                            {contractorName}
                        </span>
                    ) : (
                        <span className="truncate text-[#5B6B7D] italic">
                            Contractor Not Identified
                        </span>
                    )}
                </div>
                {/* Unlinked — whether or not a name is known — always needs verification. */}
                {!permit.contractor_id && (
                    <div className="text-xs text-amber-700 font-medium ml-5.5 mt-0.5">
                        Verification Needed
                    </div>
                )}
                {permit.contractor_email && (
                    <div className="text-xs text-[#5B6B7D] truncate ml-5.5" title={permit.contractor_email}>
                        {permit.contractor_email}
                    </div>
                )}
                <ContractorScoreBadge bucket={permit.contractor_score_bucket} score={permit.contractor_lead_score} />
            </td>

            {/* Value */}
            <td className="px-4 py-3 text-right font-mono">
                {permit.estimated_cost != null ? (
                    <span className="text-[#0E2B5C]">
                        {formatCurrency(permit.estimated_cost)}
                    </span>
                ) : (generatedCost ?? permit.ai_estimated_cost != null) ? (
                    <span
                        className="text-amber-700 italic"
                        title={`AI estimated (confidence: ${
                            generatedCost?.confidence ?? permit.ai_cost_confidence ?? 'unknown'
                        })`}
                    >
                        ~{formatCurrency(generatedCost?.midpoint ?? permit.ai_estimated_cost)}
                    </span>
                ) : (
                    <button
                        onClick={handleGenerateCost}
                        disabled={generatingCost}
                        className="inline-flex items-center gap-1 text-[#5B6B7D] hover:text-amber-700 transition-colors disabled:cursor-not-allowed"
                        title="Generate AI cost estimate"
                    >
                        {generatingCost ? (
                            <Loader2 size={12} className="animate-spin" />
                        ) : (
                            <Wand2 size={12} />
                        )}
                        <span className="text-xs opacity-0 group-hover:opacity-100 transition-opacity">
                            {generatingCost ? '…' : 'Estimate'}
                        </span>
                    </button>
                )}
            </td>

            {/* Qualification — primary business state, score bucket as secondary detail */}
            <td className="px-4 py-3 text-right">
                <QualificationCell
                    bucket={permit.score_bucket ?? null}
                    tier={permit.score_tier ?? null}
                    score={permit.lead_score ?? null}
                    excluded={!!permit.is_excluded}
                    reason={permit.exclude_reason ?? null}
                />
            </td>

            {/* Actions */}
            <td className="px-4 py-3">
                {onViewDetails && (
                    <button
                        onClick={(e) => { e.stopPropagation(); onViewDetails(permit); }}
                        className="p-1 hover:bg-[#F7F9FB] rounded text-[#5B6B7D] hover:text-[#0E2B5C] transition-colors"
                        title="View details"
                    >
                        <ExternalLink size={14} />
                    </button>
                )}
            </td>
        </tr>
    );
});

// Memoized so a row only re-renders when its own props change (e.g. its
// selection state), instead of every row re-rendering on any parent update.
export default React.memo(PermitRow);
