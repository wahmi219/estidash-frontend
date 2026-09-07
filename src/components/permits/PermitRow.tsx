'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Calendar, ExternalLink, Mail, User, Wand2, Loader2, Star } from 'lucide-react';
import { PermitRecord } from '@/types';
import { apiService } from '@/services/api';

interface PermitRowProps {
    permit: PermitRecord;
    isSelected: boolean;
    onToggleSelect: (id: string) => void;
    onViewDetails?: (permit: PermitRecord) => void;
    onSendMessage?: (permit: PermitRecord) => void;
}

// Green — active / issued
const GREEN = 'bg-green-500/20 text-green-400 border-green-500/30';
// Blue — completed / finaled
const BLUE = 'bg-blue-500/20 text-blue-400 border-blue-500/30';
// Yellow — pending / in-progress
const YELLOW = 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
// Orange — needs attention / action required
const ORANGE = 'bg-orange-500/20 text-orange-400 border-orange-500/30';
// Red — cancelled / denied / stopped
const RED = 'bg-red-500/20 text-red-400 border-red-500/30';
// Purple — inspection-related
const PURPLE = 'bg-purple-500/20 text-purple-400 border-purple-500/30';
// Gray — inactive / unknown
const GRAY = 'bg-gray-500/20 text-gray-400 border-gray-500/30';

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

function formatDate(dateStr: string | null): string {
    if (!dateStr) return '—';
    try {
        // Parse YYYY-MM-DD manually to avoid timezone offset bugs
        const parts = dateStr.split('T')[0].split('-');
        if (parts.length === 3) {
            const year = parseInt(parts[0], 10);
            const month = parseInt(parts[1], 10) - 1;
            const day = parseInt(parts[2], 10);
            const d = new Date(year, month, day);
            return d.toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
            });
        }
        return dateStr;
    } catch {
        return dateStr;
    }
}

const BUCKET_BADGE: Record<string, { label: string; cls: string }> = {
    strategic:     { label: 'Strategic',  cls: 'bg-amber-500/20 text-amber-400 border-amber-500/30' },
    strong:        { label: 'Strong',     cls: 'bg-green-500/20 text-green-400 border-green-500/30' },
    volume_engine: { label: 'Volume',     cls: 'bg-blue-500/20 text-blue-400 border-blue-500/30' },
    opportunistic: { label: 'Opport.',   cls: 'bg-gray-500/20 text-gray-400 border-gray-500/30' },
    unqualified:   { label: 'Unqualif.', cls: 'bg-red-500/15 text-red-400 border-red-500/20' },
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

// Permit-level lead score (from the scoring rubric) — distinct from the
// contractor score above.
const PERMIT_BUCKET_BADGE: Record<string, { label: string; cls: string }> = {
    strategic:     { label: 'Strategic', cls: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' },
    strong:        { label: 'Strong',    cls: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30' },
    core:          { label: 'Core',      cls: 'bg-blue-500/20 text-blue-400 border-blue-500/30' },
    opportunistic: { label: 'Opport.',   cls: 'bg-amber-500/20 text-amber-400 border-amber-500/30' },
    no_send:       { label: 'No Send',   cls: 'bg-gray-500/20 text-gray-400 border-gray-500/30' },
};

function PermitScoreBadge({ bucket, tier, score, excluded, reason }: {
    bucket: string | null; tier: string | null; score: number | null; excluded: boolean; reason: string | null;
}) {
    if (excluded) {
        return (
            <div className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded border text-[10px] font-semibold uppercase tracking-wide bg-red-500/10 text-red-400 border-red-500/20"
                title={reason ? `Excluded: ${reason.replace(/_/g, ' ')}` : 'Excluded'}>
                Excluded
            </div>
        );
    }
    if (!bucket) return null;
    const b = PERMIT_BUCKET_BADGE[bucket];
    if (!b) return null;
    return (
        <div className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded border text-[10px] font-semibold uppercase tracking-wide ${b.cls}`}
            title={`Permit score${tier ? ` · Tier ${tier}` : ''}`}>
            {b.label}
            {tier && <span className="opacity-80">·{tier}</span>}
            {score != null && <span className="font-mono opacity-70 ml-0.5">{score.toFixed(0)}</span>}
        </div>
    );
}

const PermitRow = React.forwardRef<HTMLTableRowElement, PermitRowProps>(function PermitRow(
    { permit, isSelected, onToggleSelect, onViewDetails, onSendMessage }: PermitRowProps,
    ref,
) {
    const statusClass = statusColors[permit.status] || GRAY;
    const contractorName = permit.contractor_name || '—';
    const hasContractor = !!permit.contractor_name;

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

    return (
        <tr
            ref={ref}
            className={`hover:bg-gray-50 dark:hover:bg-white/2 transition-colors group cursor-pointer ${isSelected ? 'bg-cyan-50 dark:bg-cyan-500/6' : ''}`}
            onClick={() => onViewDetails?.(permit)}
        >
            {/* Checkbox */}
            <td className="px-4 py-3 w-10">
                <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={(e) => { e.stopPropagation(); onToggleSelect(permit.id); }}
                    onClick={(e) => e.stopPropagation()}
                    className="w-4 h-4 rounded border-gray-400 dark:border-gray-600 bg-transparent text-cyan-500 focus:ring-cyan-500/30 cursor-pointer"
                />
            </td>

            {/* Date */}
            <td className="px-4 py-3 text-gray-700 dark:text-gray-300 whitespace-nowrap">
                <div className="flex items-center gap-2">
                    <Calendar size={14} className="text-gray-400 dark:text-gray-500" />
                    {formatDate(permit.issue_date || permit.application_date)}
                </div>
                {permit.days_since_issue != null && (
                    <div className={`mt-0.5 text-xs font-medium ${
                        permit.days_since_issue <= 15
                            ? 'text-cyan-400'
                            : permit.days_since_issue <= 30
                            ? 'text-green-400'
                            : permit.days_since_issue <= 60
                            ? 'text-yellow-400'
                            : 'text-gray-500'
                    }`}>
                        {permit.days_since_issue}d ago
                    </div>
                )}
            </td>

            {/* Permit Number */}
            <td className="px-4 py-3 font-mono text-sm text-gray-900 dark:text-gray-200">
                {permit.permit_number}
            </td>

            {/* Type */}
            <td className="px-4 py-3 text-gray-900 dark:text-gray-200 max-w-35">
                <div className="truncate" title={permit.permit_type}>
                    {permit.permit_type}
                </div>
                {permit.permit_subtype && (
                    <div className="text-xs text-gray-500 truncate" title={permit.permit_subtype}>
                        {permit.permit_subtype}
                    </div>
                )}
            </td>

            {/* City */}
            <td className="px-4 py-3 text-gray-900 dark:text-gray-200 whitespace-nowrap">
                <div>{permit.city}, {permit.state_code}</div>
                {permit.county_name && (
                    <div className="text-xs text-gray-500 mt-0.5">{permit.county_name}</div>
                )}
            </td>

            {/* Contractor */}
            <td className="px-4 py-3 text-gray-900 dark:text-gray-200 max-w-40">
                <div className="flex items-center gap-2">
                    <User size={14} className="text-gray-400 dark:text-gray-500 shrink-0" />
                    {/* contractor_id is only ever the real PermitRecord.contractor_id FK
                        (never the denormalized api_specific_fields fallback that
                        contractor_name can come from) -- only link when it's present. */}
                    {permit.contractor_id ? (
                        <Link
                            href={`/dashboard/contractors/${permit.contractor_id}`}
                            onClick={(e) => e.stopPropagation()}
                            className="truncate text-cyan-400 hover:text-cyan-300 transition-colors"
                            title={contractorName}
                        >
                            {contractorName}
                        </Link>
                    ) : (
                        <span className="truncate" title={contractorName}>
                            {contractorName}
                        </span>
                    )}
                </div>
                {permit.contractor_email && (
                    <div className="text-xs text-gray-500 truncate ml-5.5" title={permit.contractor_email}>
                        {permit.contractor_email}
                    </div>
                )}
                <ContractorScoreBadge bucket={permit.contractor_score_bucket} score={permit.contractor_lead_score} />
            </td>

            {/* Status */}
            <td className="px-4 py-3">
                <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${statusClass}`}>
                    {permit.status}
                </span>
            </td>

            {/* Estimated Cost */}
            <td className="px-4 py-3 text-right font-mono">
                {permit.estimated_cost != null ? (
                    <span className="text-gray-900 dark:text-gray-200">
                        {formatCurrency(permit.estimated_cost)}
                    </span>
                ) : (generatedCost ?? permit.ai_estimated_cost != null) ? (
                    <span
                        className="text-amber-600 dark:text-amber-400 italic"
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
                        className="inline-flex items-center gap-1 text-gray-400 dark:text-gray-600 hover:text-amber-500 dark:hover:text-amber-400 transition-colors disabled:cursor-not-allowed"
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

            {/* Lead Score */}
            <td className="px-4 py-3 text-right">
                <PermitScoreBadge
                    bucket={permit.score_bucket ?? null}
                    tier={permit.score_tier ?? null}
                    score={permit.lead_score ?? null}
                    excluded={!!permit.is_excluded}
                    reason={permit.exclude_reason ?? null}
                />
            </td>

            {/* Actions */}
            <td className="px-4 py-3">
                <div className="flex items-center gap-2">
                    {/* Send Message - always visible if contractor exists */}
                    {hasContractor && onSendMessage && (
                        <button
                            onClick={(e) => { e.stopPropagation(); onSendMessage(permit); }}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 hover:text-cyan-300 border border-cyan-500/20 transition-all text-xs font-medium"
                            title={`Message ${contractorName}`}
                        >
                            <Mail size={12} />
                            Message
                        </button>
                    )}
                    {/* View Details - visible on hover */}
                    {onViewDetails && (
                        <button
                            onClick={(e) => { e.stopPropagation(); onViewDetails(permit); }}
                            className="p-1 hover:bg-gray-100 dark:hover:bg-white/10 rounded text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors opacity-0 group-hover:opacity-100"
                            title="View details"
                        >
                            <ExternalLink size={14} />
                        </button>
                    )}
                </div>
            </td>
        </tr>
    );
});

// Memoized so a row only re-renders when its own props change (e.g. its
// selection state), instead of every row re-rendering on any parent update.
export default React.memo(PermitRow);
