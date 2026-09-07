interface DashboardMetricCardProps {
    label: string;
    value?: string | number | null;
}

/**
 * KPI shell for the main Dashboard. Renders "—" until real data is wired up
 * (the /dashboard/mvp-stats endpoint, post production-DB restore) — never a
 * fabricated 0 or sample value. See the Phase 1 dashboard redesign plan.
 */
export default function DashboardMetricCard({ label, value }: DashboardMetricCardProps) {
    return (
        <div className="bg-white border border-[#DFE6EE] rounded-lg p-4">
            <p className="text-[13px] font-semibold text-[#5B6B7D]">{label}</p>
            <p className="mt-2 text-[28px] font-bold text-[#0E2B5C] tabular-nums">
                {value ?? '—'}
            </p>
        </div>
    );
}
