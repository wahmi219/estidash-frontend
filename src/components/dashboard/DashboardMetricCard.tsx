interface DashboardMetricCardProps {
    label: string;
    value?: string | number | null;
    icon: React.ComponentType<{ size?: number; className?: string }>;
    /** Category color, not a status derived from the value itself — the
     * value is still honestly "—" until real data is wired up. This just
     * lets the card communicate what KIND of metric it is at a glance. */
    accent: 'blue' | 'green' | 'amber' | 'red';
    /** True when the caller wraps this card in a link/button — adds a
     * hover/pressed affordance (shadow, border highlight, pointer cursor)
     * so a clickable card looks clickable. Purely visual; the actual
     * link/button semantics and keyboard focus ring belong to the
     * wrapping element (see app/dashboard/page.tsx's Latest Sync cards),
     * not this component, so a plain (non-clickable) card's appearance
     * and every existing caller stay pixel-identical by default. */
    clickable?: boolean;
}

const ACCENT_STYLES: Record<DashboardMetricCardProps['accent'], { iconBg: string; iconColor: string; edge: string }> = {
    blue:  { iconBg: 'bg-blue-50',    iconColor: 'text-[#00458B]',  edge: 'border-l-blue-300' },
    green: { iconBg: 'bg-emerald-50', iconColor: 'text-emerald-600', edge: 'border-l-emerald-300' },
    amber: { iconBg: 'bg-amber-50',   iconColor: 'text-amber-600',  edge: 'border-l-amber-300' },
    red:   { iconBg: 'bg-red-50',     iconColor: 'text-red-600',    edge: 'border-l-red-300' },
};

/**
 * KPI shell for the main Dashboard. Renders "—" until real data is wired up
 * (the /dashboard/mvp-stats endpoint, post production-DB restore) — never a
 * fabricated 0 or sample value. See the Phase 1 dashboard redesign plan.
 * Semantic accent communicates category (blue/green/amber/red) even while
 * the value itself stays an honest placeholder.
 */
export default function DashboardMetricCard({ label, value, icon: Icon, accent, clickable }: DashboardMetricCardProps) {
    const styles = ACCENT_STYLES[accent];
    const isEmpty = value == null;
    return (
        <div
            className={`bg-white border border-[#DFE6EE] border-l-4 ${styles.edge} rounded-lg p-4 ${
                clickable ? 'cursor-pointer transition-shadow hover:shadow-md hover:border-[#00458B]/40' : ''
            }`}
        >
            <div className="flex items-center gap-2 mb-2.5">
                <div className={`w-7 h-7 rounded-md ${styles.iconBg} flex items-center justify-center flex-shrink-0`}>
                    <Icon size={14} className={styles.iconColor} />
                </div>
                <p className="text-[13px] font-semibold text-[#0E2B5C]">{label}</p>
            </div>
            <p className={`text-[30px] font-bold tabular-nums leading-none ${isEmpty ? 'text-gray-300' : 'text-[#0E2B5C]'}`}>
                {value ?? '—'}
            </p>
        </div>
    );
}
