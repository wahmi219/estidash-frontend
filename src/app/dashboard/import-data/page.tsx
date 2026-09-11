'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Upload, Users, HardHat, Mail, Search, FileSpreadsheet, ArrowRight, CheckCircle2, Circle, ExternalLink } from 'lucide-react';
import PageHeader from '@/components/common/PageHeader';
import SectionHeading from '@/components/common/SectionHeading';

// Phase 9 Chunk 4 — Import Data FOUNDATION only. No real contractor/client
// dataset is imported here, and nothing in this page processes the 1.58M
// email master. Manual Permit Data is the one category with a real, tested
// backend today (the existing Excel upload at /dashboard/upload); the other
// five categories are an honest workflow preview -- each step is marked
// Available or Not Yet Available, and nothing fakes a success state.

type ImportType = {
    id: string;
    label: string;
    icon: React.ComponentType<{ size?: number; className?: string }>;
    description: string;
    backendReady: boolean;
};

const IMPORT_TYPES: ImportType[] = [
    {
        id: 'active-clients', label: 'Active Clients', icon: Users,
        description: 'Companies you currently do business with. Used to correctly mark existing Lead Bank relationships as Active Client rather than re-prospecting them.',
        backendReady: false,
    },
    {
        id: 'former-clients', label: 'Former / Existing Clients', icon: Users,
        description: 'Past clients, so outreach can respect relationship history instead of treating them as new prospects.',
        backendReady: false,
    },
    {
        id: 'contractor-database', label: 'Contractor Database', icon: HardHat,
        description: 'A bulk contractor roster to match against existing Contractor IDs — never a shortcut around identity verification.',
        backendReady: false,
    },
    {
        id: 'email-only-clients', label: 'Email-Only Existing Clients', icon: Mail,
        description: 'Client contacts known only by email. An email is never sufficient identity proof on its own — matches still require corroborating evidence before linking to a Contractor ID.',
        backendReady: false,
    },
    {
        id: 'contact-enrichment', label: 'Contact Enrichment', icon: Search,
        description: 'Supplemental contact details (phone, website, additional emails) for contractors that already exist in EHUB.',
        backendReady: false,
    },
    {
        id: 'manual-permit-data', label: 'Manual Permit Data', icon: FileSpreadsheet,
        description: 'CBSA/state-level permit statistics via Excel — the one category with a working import pipeline today.',
        backendReady: true,
    },
];

const WORKFLOW_STEPS = [
    { id: 'upload', label: 'Upload' },
    { id: 'detect', label: 'Detect' },
    { id: 'preview', label: 'Preview' },
    { id: 'clean', label: 'Clean / Validate' },
    { id: 'dedupe', label: 'Deduplicate' },
    { id: 'match', label: 'Match Contractor ID' },
    { id: 'review', label: 'Possible Match Review' },
    { id: 'confirm', label: 'Confirm Import' },
];

export default function ImportDataPage() {
    const [selected, setSelected] = useState<ImportType | null>(null);

    return (
        <div className="max-w-5xl mx-auto">
            <PageHeader
                icon={Upload}
                title="Import Data"
                subtitle="Foundation for bringing external contractor and client data into EHUB — no real dataset is imported by this page yet"
            />

            <div className="mb-6 px-4 py-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800">
                This is a workflow foundation, not a live import tool for five of the six categories below. No client, contractor,
                or email dataset is processed here until each step is genuinely backed by a tested backend pipeline.
            </div>

            <SectionHeading className="mb-3">1. Select Import Type</SectionHeading>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-8">
                {IMPORT_TYPES.map((t) => (
                    <button
                        key={t.id}
                        onClick={() => setSelected(t)}
                        className={`text-left p-4 rounded-lg border transition-colors ${
                            selected?.id === t.id ? 'border-[#00458B] bg-[#00458B]/5' : 'border-[#DFE6EE] bg-white hover:bg-[#F7F9FB]'
                        }`}
                    >
                        <div className="flex items-center gap-2 mb-1.5">
                            <t.icon size={16} className="text-[#00458B]" />
                            <span className="font-medium text-[#0E2B5C]">{t.label}</span>
                            {t.backendReady ? (
                                <span className="ml-auto text-[10px] font-semibold uppercase tracking-wide text-green-700 bg-green-50 border border-green-200 px-1.5 py-0.5 rounded">Available</span>
                            ) : (
                                <span className="ml-auto text-[10px] font-semibold uppercase tracking-wide text-[#5B6B7D] bg-gray-100 border border-gray-200 px-1.5 py-0.5 rounded">Preview Only</span>
                            )}
                        </div>
                        <p className="text-xs text-[#5B6B7D]">{t.description}</p>
                    </button>
                ))}
            </div>

            {selected && (
                <>
                    <SectionHeading className="mb-3">2. {selected.label} — Workflow</SectionHeading>
                    {selected.backendReady ? (
                        <div className="bg-white border border-[#DFE6EE] rounded-xl p-6 text-center">
                            <CheckCircle2 className="mx-auto mb-3 text-green-600" size={28} />
                            <p className="text-[#0E2B5C] font-medium mb-2">Manual Permit Data has a working import pipeline today.</p>
                            <Link
                                href="/dashboard/upload"
                                className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#00458B] text-white rounded-lg hover:bg-[#045CB4] text-sm"
                            >
                                Go to Excel Upload <ExternalLink size={14} />
                            </Link>
                        </div>
                    ) : (
                        <div className="bg-white border border-[#DFE6EE] rounded-xl p-6">
                            <div className="flex items-center flex-wrap gap-2 mb-6">
                                {WORKFLOW_STEPS.map((step, i) => (
                                    <React.Fragment key={step.id}>
                                        <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-gray-50 border border-gray-200 text-xs text-[#5B6B7D]">
                                            <Circle size={10} />
                                            {step.label}
                                        </div>
                                        {i < WORKFLOW_STEPS.length - 1 && <ArrowRight size={12} className="text-[#DFE6EE]" />}
                                    </React.Fragment>
                                ))}
                            </div>
                            <div className="border-2 border-dashed border-[#DFE6EE] rounded-lg p-10 text-center bg-[#F7F9FB]">
                                <Upload className="mx-auto mb-3 text-gray-300" size={28} />
                                <p className="text-[#0E2B5C] font-medium">File upload is not yet available for {selected.label}.</p>
                                <p className="text-sm text-[#5B6B7D] mt-1 max-w-md mx-auto">
                                    Detect / Preview / Clean / Deduplicate / Match Contractor ID / Possible Match Review / Confirm Import
                                    all require a tested backend pipeline for this category, which does not exist yet. Building it is
                                    pre-production follow-up work — no file is accepted or processed here in the meantime.
                                </p>
                            </div>
                        </div>
                    )}
                </>
            )}
        </div>
    );
}
