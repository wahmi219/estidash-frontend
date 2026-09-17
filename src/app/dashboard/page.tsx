'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { LayoutDashboard, RefreshCw, Activity, ListChecks, FileText, CheckCircle2, XCircle, ShieldAlert, Phone, Wallet, AlertTriangle, Lock, Clock, Send, CalendarClock } from 'lucide-react';
import DashboardMetricCard from '@/components/dashboard/DashboardMetricCard';
import PageHeader from '@/components/common/PageHeader';
import SectionHeading from '@/components/common/SectionHeading';
import { apiService } from '@/services/api';
import type { DataSourceHealthSummary, DashboardSummary } from '@/types';
import { latestSyncHref } from '@/lib/latestSyncDrilldown';

// Phase 11.2 P1-01 — GET /api/v1/dashboard/latest-sync response shape.
// sync_log_id (EHUB Latest Sync Dashboard Drill-Down) is the persisted
// APISyncLog id every card below links to — Permit Records filters on
// this exact column, never a date range, so a card's count and its
// drill-down's result count can never disagree.
interface LatestSyncSummary {
    sync_log_id: string;
    agency_id: string;
    source: string;
    completed_at: string;
    status: string;
    new_permits: number;
    qualified_new: number;
    invalid_excluded_new: number;
}

// Real operational counts from GET /api/v1/dashboard/summary (Phase 9
// Chunk 4) -- each key's card links to the exact queue that count comes
// from, so a number here can never contradict its own drill-down.
const WORKFLOW_METRICS: { key: keyof DashboardSummary; label: string; icon: typeof ShieldAlert; accent: 'amber' | 'blue' | 'green' | 'red'; href: string }[] = [
    // Phase 11.12 C1 — see the matching comment on Permit Records'
    // saved view. This card is a count of open verification TASKS.
    { key: 'contractor_verification_pending', label: 'Contractor Verification Tasks', icon: ShieldAlert, accent: 'amber', href: '/dashboard/contractor-verification' },
    { key: 'contact_info_needed', label: 'Contact Info Needed', icon: Phone, accent: 'blue', href: '/dashboard/contact-info-needed' },
    { key: 'ready_for_lead_bank', label: 'Ready for Lead Bank', icon: Wallet, accent: 'green', href: '/dashboard/ready-for-lead-bank' },
    { key: 'ready_for_outreach', label: 'Ready for Outreach', icon: Send, accent: 'blue', href: '/dashboard/lead-bank' },
    { key: 'follow_ups_due', label: 'Follow-ups Due', icon: CalendarClock, accent: 'amber', href: '/dashboard/lead-bank' },
    { key: 'lead_bank_total', label: 'Lead Bank Relationships', icon: Wallet, accent: 'green', href: '/dashboard/lead-bank' },
];

export default function DashboardPage() {
    const [health, setHealth] = useState<DataSourceHealthSummary | null>(null);
    const [healthLoading, setHealthLoading] = useState(true);
    const [summary, setSummary] = useState<DashboardSummary | null>(null);
    const [summaryLoading, setSummaryLoading] = useState(true);
    const [summaryUnauthorized, setSummaryUnauthorized] = useState(false);
    const [latestSync, setLatestSync] = useState<LatestSyncSummary | null>(null);
    const [latestSyncLoading, setLatestSyncLoading] = useState(true);

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

    useEffect(() => {
        apiService.get<{ latest_sync: LatestSyncSummary | null }>('/dashboard/latest-sync')
            .then((res) => setLatestSync(res.latest_sync))
            .catch(() => setLatestSync(null))
            .finally(() => setLatestSyncLoading(false));
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
                {health && !health.scheduler_enabled && (
                    <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mt-2">
                        Source sync is disabled in this environment — Warning/staleness states above
                        reflect historical record only, not a currently-running scheduler.
                    </p>
                )}
            </section>

            {/* Section 1 — Latest Sync. Phase 11.2 P1-01: wired to real
                api_sync_logs history via GET /api/v1/dashboard/latest-sync
                (dashboard_service.get_latest_sync_summary) — previously a
                permanent visual shell that never queried anything. Sync
                Permit Sources stays a disabled button: this is read-only
                reporting on already-completed runs, not a trigger, and
                global source sync stays off regardless. */}
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
                    {latestSync ? (
                        <>
                            <Link
                                href={latestSyncHref(latestSync)}
                                aria-label={`View the ${latestSync.new_permits} permits from the latest completed sync for ${latestSync.source}`}
                                className="block rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00458B] focus-visible:ring-offset-2"
                            >
                                <DashboardMetricCard label="New Permits" value={latestSync.new_permits} icon={FileText} accent="blue" clickable />
                            </Link>
                            <Link
                                href={latestSyncHref(latestSync, 'qualified')}
                                aria-label={`View the ${latestSync.qualified_new} qualified permits from the latest completed sync for ${latestSync.source}`}
                                className="block rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00458B] focus-visible:ring-offset-2"
                            >
                                <DashboardMetricCard label="Qualified New" value={latestSync.qualified_new} icon={CheckCircle2} accent="green" clickable />
                            </Link>
                            <Link
                                href={latestSyncHref(latestSync, 'invalid')}
                                aria-label={`View the ${latestSync.invalid_excluded_new} invalid or excluded permits from the latest completed sync for ${latestSync.source}`}
                                className="block rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00458B] focus-visible:ring-offset-2"
                            >
                                <DashboardMetricCard label="Invalid / Excluded New" value={latestSync.invalid_excluded_new} icon={XCircle} accent="red" clickable />
                            </Link>
                        </>
                    ) : (
                        <>
                            {/* No completed sync run has ever existed (or still loading) —
                                nothing to link to; DashboardMetricCard renders "—", never a
                                fabricated 0, exactly as before this feature. */}
                            <DashboardMetricCard label="New Permits" value={undefined} icon={FileText} accent="blue" />
                            <DashboardMetricCard label="Qualified New" value={undefined} icon={CheckCircle2} accent="green" />
                            <DashboardMetricCard label="Invalid / Excluded New" value={undefined} icon={XCircle} accent="red" />
                        </>
                    )}
                </div>
                <p className="text-xs text-[#5B6B7D] mt-2">
                    {latestSyncLoading
                        ? 'Loading…'
                        : latestSync
                            ? `${latestSync.source} — completed ${new Date(latestSync.completed_at).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}`
                            : 'No completed sync run found yet.'}
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

        </div>
    );
}
