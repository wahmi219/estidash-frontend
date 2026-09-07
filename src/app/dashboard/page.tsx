'use client';

import { motion } from 'framer-motion';
import { RefreshCw } from 'lucide-react';
import DashboardMetricCard from '@/components/dashboard/DashboardMetricCard';

const LATEST_SYNC_LABELS = ['New Permits', 'Qualified New', 'Invalid / Excluded New'];

const WORKFLOW_LABELS = ['Contractor Verification', 'Contact Info Needed', 'Ready for Lead Bank'];

// Future columns for the Priority States to Work shell below. Kept in one
// place so the header row and any later real implementation stay in sync.
const PRIORITY_STATES_COLUMNS = ['State', 'Coverage', 'Qualified Rate', 'Strategic / Strong', 'Contractor Backlog', 'Priority'];

export default function DashboardPage() {
    return (
        <div className="p-6 lg:p-8">
            {/* Header */}
            <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-8"
            >
                <h1 className="text-2xl font-bold text-[#0E2B5C]">Dashboard</h1>
                <p className="text-[#5B6B7D] mt-1">Permit and contractor activity</p>
            </motion.div>

            {/* Section 1 — Latest Sync. Sync Permit Sources stays a visual shell —
                real SyncRun wiring comes later after the production DB/scheduler
                audit; never derive these counts from issue_date/created_at. */}
            <section className="mb-8">
                <div className="flex items-center justify-between mb-3">
                    <h2 className="text-xs font-semibold text-[#5B6B7D] uppercase tracking-wide">
                        Latest Sync
                    </h2>
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
                    {LATEST_SYNC_LABELS.map((label) => (
                        <DashboardMetricCard key={label} label={label} />
                    ))}
                </div>
                <p className="text-xs text-[#5B6B7D] mt-2">
                    Sync metrics will populate once permit sync tracking is connected.
                </p>
            </section>

            {/* Section 2 — Current Qualified Workflow */}
            <section className="mb-8">
                <h2 className="text-xs font-semibold text-[#5B6B7D] uppercase tracking-wide mb-3">
                    Current Qualified Workflow
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {WORKFLOW_LABELS.map((label) => (
                        <DashboardMetricCard key={label} label={label} />
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
                <h2 className="text-xs font-semibold text-[#5B6B7D] uppercase tracking-wide mb-3">
                    Priority States to Work
                </h2>
                <div className="bg-white border border-[#DFE6EE] rounded-lg overflow-hidden">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="bg-[#F7F9FB] text-left text-[11px] font-semibold text-[#5B6B7D] uppercase tracking-wider">
                                {PRIORITY_STATES_COLUMNS.map((label) => (
                                    <th key={label} className="px-4 py-2.5">{label}</th>
                                ))}
                            </tr>
                        </thead>
                    </table>
                    <div className="px-4 py-8 text-center text-sm text-[#5B6B7D]">
                        Priority-state metrics will populate after permit coverage and workflow aggregation are connected.
                    </div>
                </div>
            </section>
        </div>
    );
}
