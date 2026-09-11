'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { LayoutDashboard, RefreshCw, Activity, ListChecks, Flame, FileText, CheckCircle2, XCircle, ShieldAlert, Phone, Wallet, AlertTriangle, Lock, Clock, Send, CalendarClock } from 'lucide-react';
import DashboardMetricCard from '@/components/dashboard/DashboardMetricCard';
import PageHeader from '@/components/common/PageHeader';
import SectionHeading from '@/components/common/SectionHeading';
import { apiService } from '@/services/api';
import type { DataSourceHealthSummary, DashboardSummary } from '@/types';

const LATEST_SYNC_METRICS = [
    { label: 'New Permits', icon: FileText, accent: 'blue' as const },
    { label: 'Qualified New', icon: CheckCircle2, accent: 'green' as const },
    { label: 'Invalid / Excluded New', icon: XCircle, accent: 'red' as const },
];

// Real operational counts from GET /api/v1/dashboard/summary (Phase 9
// Chunk 4) -- each key's card links to the exact queue that count comes
// from, so a number here can never contradict its own drill-down.
const WORKFLOW_METRICS: { key: keyof DashboardSummary; label: string; icon: typeof ShieldAlert; accent: 'amber' | 'blue' | 'green' | 'red'; href: string }[] = [
    { key: 'contractor_verification_pending', label: 'Contractor Verification', icon: ShieldAlert, accent: 'amber', href: '/dashboard/contractor-verification' },
    { key: 'contact_info_needed', label: 'Contact Info Needed', icon: Phone, accent: 'blue', href: '/dashboard/contact-info-needed' },
    { key: 'ready_for_lead_bank', label: 'Ready for Lead Bank', icon: Wallet, accent: 'green', href: '/dashboard/ready-for-lead-bank' },
    { key: 'ready_for_outreach', label: 'Ready for Outreach', icon: Send, accent: 'blue', href: '/dashboard/lead-bank' },
    { key: 'follow_ups_due', label: 'Follow-ups Due', icon: CalendarClock, accent: 'amber', href: '/dashboard/lead-bank' },
    { key: 'lead_bank_total', label: 'Lead Bank Relationships', icon: Wallet, accent: 'green', href: '/dashboard/lead-bank' },
];

// Future columns for the Priority States to Work shell below. Kept in one
// place so the header row and any later real implementation stay in sync.
const PRIORITY_STATES_COLUMNS = ['State', 'Coverage', 'Qualified Rate', 'Strategic / Strong', 'Contractor Backlog', 'Priority'];

export default function DashboardPage() {
    const [health, setHealth] = useState<DataSourceHealthSummary | null>(null);
    const [healthLoading, setHealthLoading] = useState(true);
    const [summary, setSummary] = useState<DashboardSummary | null>(null);
    const [summaryLoading, setSummaryLoading] = useState(true);
    const [summaryUnauthorized, setSummaryUnauthorized] = useState(false);

    useEffect(() => {
        apiService.getDataSourcesHealthSummary()
            .then(setHealth)
            .catch(() => setHealth(null))
            .finally(() => setHealthLoading(false));
    }, []);

    useEffect(() => {
        apiService.get<DashboardSummary>('/dashboard/summary')
            .then(setSummary)
            .catch((err) => {
                const status = err && typeof err === 'object' && 'response' in err
                    ? (err as { response?: { status?: number } }).response?.status
                    : undefined;
                if (status === 401 || status === 403) setSummaryUnauthorized(true);
                setSummary(null);
            })
            .finally(() => setSummaryLoading(false));
    }, []);

    const needsAttention = health ? health.warning + health.failed + health.stuck + health.needs_auth : 0;

    return (
        <div className="p-6 lg:p-8">
            <PageHeader
                icon={LayoutDashboard}
                title="Dashboard"
                subtitle="Permit and contractor activity"
            />

            {/* Section 0 — Permit Source Health. Compact summary only (not a
                source list — that's Data Sources' job). Real counts from
                GET /api/v1/data-sources/health-summary (Phase 2C). Clicking
                through goes to Data Sources, filtered to whichever state
                needs attention when there's a clear one to jump to. */}
            <section className="mb-8">
                <div className="flex items-center justify-between mb-3">
                    <SectionHeading icon={Activity}>Permit Source Health</SectionHeading>
                    <Link
                        href={needsAttention > 0 ? '/dashboard/datasources?health=failed' : '/dashboard/datasources'}
                        className="text-xs font-medium text-[#00458B] hover:text-[#045CB4] transition-colors"
                    >
                        View Data Sources →
                    </Link>
                </div>
                <Link href="/dashboard/datasources" className="block">
                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
                        <DashboardMetricCard label="Healthy" value={healthLoading ? undefined : health?.healthy} icon={CheckCircle2} accent="green" />
                        <DashboardMetricCard label="Warning" value={healthLoading ? undefined : health?.warning} icon={AlertTriangle} accent="amber" />
                        <DashboardMetricCard label="Failed" value={healthLoading ? undefined : health?.failed} icon={XCircle} accent="red" />
                        <DashboardMetricCard label="Stuck" value={healthLoading ? undefined : health?.stuck} icon={Clock} accent="red" />
                        <DashboardMetricCard label="Needs Auth" value={healthLoading ? undefined : health?.needs_auth} icon={Lock} accent="amber" />
                    </div>
                </Link>
                {health && (
                    <p className="text-xs text-[#5B6B7D] mt-2">
                        {health.active} active of {health.configured} configured sources
                        {health.disabled > 0 && ` · ${health.disabled} disabled/retired`}
                    </p>
                )}
            </section>

            {/* Section 1 — Latest Sync. Sync Permit Sources stays a visual shell —
                real SyncRun wiring comes later after the production DB/scheduler
                audit; never derive these counts from issue_date/created_at. */}
            <section className="mb-8">
                <div className="flex items-center justify-between mb-3">
                    <SectionHeading icon={Activity}>Latest Sync</SectionHeading>
                    <button
                        type="button"
                        disabled
                        title="Sync wiring pending permit sync tracking"
                        className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-[#DFE6EE] bg-white text-[#5B6B7D] text-xs font-medium opacity-60 cursor-not-allowed"
                    >
                        <RefreshCw size={14} />
                        Sync Permit Sources
                    </button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {LATEST_SYNC_METRICS.map((m) => (
                        <DashboardMetricCard key={m.label} label={m.label} icon={m.icon} accent={m.accent} />
                    ))}
                </div>
                <p className="text-xs text-[#5B6B7D] mt-2">
                    Sync metrics will populate once permit sync tracking is connected.
                </p>
            </section>

            {/* Section 2 — Current Qualified Workflow. Real counts from
                GET /api/v1/dashboard/summary (Phase 9 Chunk 4) — each card
                links straight to the queue that count came from. */}
            <section className="mb-8">
                <div className="mb-3">
                    <SectionHeading icon={ListChecks}>Current Qualified Workflow</SectionHeading>
                </div>
                {summaryUnauthorized ? (
                    <div className="bg-white border border-[#DFE6EE] rounded-lg p-6 text-sm text-[#5B6B7D]">
                        Your role does not have access to workflow counts. Ask an admin if you need visibility into these queues.
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        {WORKFLOW_METRICS.map((m) => (
                            <Link key={m.key} href={m.href} className="block">
                                <DashboardMetricCard
                                    label={m.label}
                                    value={summaryLoading ? undefined : summary?.[m.key]}
                                    icon={m.icon}
                                    accent={m.accent}
                                />
                            </Link>
                        ))}
                    </div>
                )}
            </section>

            {/* Section 3 — Priority States to Work. Shows which states currently
                deserve the most contractor-research attention.

                COVERAGE RULE (not implemented yet — column/message shell only):
                A state should only be ranked when data coverage is sufficient and
                reasonably representative. States with partial/limited coverage
                should not be ranked purely from raw permit totals.

                Future ranking should consider:
                - source / jurisdiction coverage
                - total permits collected
                - qualified permits / total permits
                - Strategic + Strong / qualified permits
                - contractor verification backlog
                - contact-info backlog
                - minimum sample size

                A state with insufficient coverage should render as "Limited
                Coverage" / "Not Ranked" in the Priority column rather than being
                scored or ranked against fully-covered states. No fake rows are
                rendered here until that aggregation exists.

                No client-side aggregation — this is a column shell only,
                intentionally not loading permits to compute anything here.
                Real values arrive once a backend aggregation endpoint exists. */}
            <section>
                <div className="mb-3">
                    <SectionHeading icon={Flame}>Priority States to Work</SectionHeading>
                </div>
                <div className="bg-white border border-[#DFE6EE] rounded-lg overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="bg-[#F7F9FB] text-left text-[11px] font-semibold text-[#5B6B7D] uppercase tracking-wider border-b border-[#DFE6EE]">
                                    {PRIORITY_STATES_COLUMNS.map((label) => (
                                        <th key={label} className="px-4 py-2.5 whitespace-nowrap">{label}</th>
                                    ))}
                                </tr>
                            </thead>
                        </table>
                    </div>
                    <div className="flex flex-col items-center gap-2 px-4 py-10 text-center">
                        <Flame size={22} className="text-gray-300" />
                        <p className="text-sm text-[#5B6B7D] max-w-md">
                            Priority-state metrics will populate after permit coverage and workflow aggregation are connected.
                        </p>
                    </div>
                </div>
            </section>
        </div>
    );
}
