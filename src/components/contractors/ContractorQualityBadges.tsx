'use client';

import React from 'react';
import { AlertTriangle } from 'lucide-react';
import type {
    ContractorIdentityStrength,
    ContractorContactability,
    ContractorLicenseReadiness,
    ContractorNameQuality,
} from '@/types';

// Phase 2A (2A.1/2A.2) deterministic, non-LLM data-quality indicators.
// "present" only — never implies "verified". See
// app/services/contractor_completeness_service.py for the exact rules.

const IDENTITY_STYLES: Record<ContractorIdentityStrength, { label: string; classes: string }> = {
    strong:   { label: 'Strong',   classes: 'bg-green-50 text-green-700 border border-green-200' },
    partial:  { label: 'Partial',  classes: 'bg-amber-50 text-amber-700 border border-amber-200' },
    minimal:  { label: 'Minimal',  classes: 'bg-gray-100 text-[#5B6B7D] border border-gray-200' },
};

export function IdentityStrengthBadge({ value }: { value: ContractorIdentityStrength }) {
    const style = IDENTITY_STYLES[value] ?? IDENTITY_STYLES.minimal;
    return (
        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wide ${style.classes}`}>
            {style.label}
        </span>
    );
}

const CONTACTABILITY_STYLES: Record<ContractorContactability, { label: string; classes: string }> = {
    reachable: { label: 'Reachable', classes: 'bg-blue-50 text-blue-700 border border-blue-200' },
    limited:   { label: 'Limited',   classes: 'bg-amber-50 text-amber-700 border border-amber-200' },
    none:      { label: 'None',      classes: 'bg-gray-100 text-[#5B6B7D] border border-gray-200' },
};

export function ContactabilityBadge({ value }: { value: ContractorContactability }) {
    const style = CONTACTABILITY_STYLES[value] ?? CONTACTABILITY_STYLES.none;
    return (
        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wide ${style.classes}`}>
            {style.label}
        </span>
    );
}

const READINESS_STYLES: Record<ContractorLicenseReadiness, { label: string; classes: string }> = {
    ready:          { label: 'Ready',          classes: 'bg-green-50 text-green-700 border border-green-200' },
    needs_state:    { label: 'Needs State',    classes: 'bg-amber-50 text-amber-700 border border-amber-200' },
    no_license:     { label: 'No License',     classes: 'bg-gray-100 text-[#5B6B7D] border border-gray-200' },
    invalid_format: { label: 'Invalid Format', classes: 'bg-red-50 text-red-700 border border-red-200' },
};

export function LicenseReadinessBadge({ value }: { value: ContractorLicenseReadiness }) {
    const style = READINESS_STYLES[value] ?? READINESS_STYLES.no_license;
    return (
        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wide ${style.classes}`}>
            {style.label}
        </span>
    );
}

export const LICENSE_READINESS_LABELS: Record<ContractorLicenseReadiness, string> = {
    ready: 'Ready',
    needs_state: 'Needs State',
    no_license: 'No License',
    invalid_format: 'Invalid Format',
};

// Inline icon only, not a full pill -- most rows are "ok" and shouldn't carry
// visual weight; this only draws attention on the minority of questionable
// names. Read-only signal, never hides or reorders anything (2026-07-30
// product decision).
export function NameQualityFlag({ value }: { value: ContractorNameQuality }) {
    if (value !== 'questionable') return null;
    return (
        <AlertTriangle
            size={12}
            className="text-amber-600 shrink-0"
            aria-label="Name may not be a real business name"
        />
    );
}
