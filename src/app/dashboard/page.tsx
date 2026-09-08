'use client';

import { LayoutDashboard, RefreshCw, Activity, ListChecks, Flame, FileText, CheckCircle2, XCircle, ShieldAlert, Phone, Wallet } from 'lucide-react';
import DashboardMetricCard from '@/components/dashboard/DashboardMetricCard';
import PageHeader from '@/components/common/PageHeader';
import SectionHeading from '@/components/common/SectionHeading';

const LATEST_SYNC_METRICS = [
    { label: 'New Permits', icon: FileText, accent: 'blue' as const },
    { label: 'Qualified New', icon: CheckCircle2, accent: 'green' as const },
    { label: 'Invalid / Excluded New', icon: XCircle, accent: 'red' as const },
];

const WORKFLOW_METRICS = [
    { label: 'Contractor Verification', icon: ShieldAlert, accent: 'amber' as const },
    { label: 'Contact Info Needed', icon: Phone, accent: 'blue' as const },
    { label: 'Ready for Lead Bank', icon: Wallet, accent: 'green' as const },
];

// Future columns for the Priority States to Work shell below. Kept in one
// place so the header row and any later real implementation stay in sync.
const PRIORITY_STATES_COLUMNS = ['State', 'Coverage', 'Qualified Rate', 'Strategic / Strong', 'Contractor Backlog', 'Priority'];

export default function DashboardPage() {
    return (
        <div className="p-6 lg:p-8">
            <PageHeader
                icon={LayoutDashboard}
                title="Dashboard"
                subtitle="Permit and contractor activity"
            />

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

            {/* Section 2 — Current Qualified Workflow */}
            <section className="mb-8">
                <div className="mb-3">
                    <SectionHeading icon={ListChecks}>Current Qualified Workflow</SectionHeading>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {WORKFLOW_METRICS.map((m) => (
                        <DashboardMetricCard key={m.label} label={m.label} icon={m.icon} accent={m.accent} />
                    ))}
                </div>
                <p className="text-xs text-[#5B6B7D] mt-2">
                    Workflow counts will populate after the production DB / contractor workflow audit.
                </p>
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
