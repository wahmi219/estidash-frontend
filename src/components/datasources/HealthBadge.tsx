import { CheckCircle2, AlertTriangle, XCircle, Clock, Lock, MinusCircle, HelpCircle } from 'lucide-react';
import type { SourceHealthState } from '@/types';

// Restrained health palette (Phase 2C spec) — green/amber/red/gray only,
// no gradients or neon. Stuck reuses the amber/red family (orange) so it
// reads as related-but-distinct from both Warning and Failed.
const HEALTH_STYLES: Record<SourceHealthState, { bg: string; text: string; border: string; icon: React.ComponentType<{ size?: number; className?: string }>; label: string }> = {
    HEALTHY:        { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', icon: CheckCircle2,  label: 'Healthy' },
    WARNING:        { bg: 'bg-amber-50',   text: 'text-amber-700',   border: 'border-amber-200',   icon: AlertTriangle, label: 'Warning' },
    FAILED:         { bg: 'bg-red-50',     text: 'text-red-700',     border: 'border-red-200',     icon: XCircle,       label: 'Failed' },
    STUCK:          { bg: 'bg-orange-50',  text: 'text-orange-700',  border: 'border-orange-200',  icon: Clock,         label: 'Stuck' },
    NEEDS_AUTH:     { bg: 'bg-amber-50',   text: 'text-amber-800',   border: 'border-amber-200',   icon: Lock,          label: 'Needs Auth' },
    DISABLED:       { bg: 'bg-gray-100',   text: 'text-gray-600',    border: 'border-gray-200',    icon: MinusCircle,   label: 'Disabled' },
    NEVER_VERIFIED: { bg: 'bg-gray-100',   text: 'text-gray-500',    border: 'border-gray-200',    icon: HelpCircle,    label: 'Never Verified' },
};

export function healthLabel(health: SourceHealthState): string {
    return HEALTH_STYLES[health]?.label ?? health;
}

export default function HealthBadge({ health, title }: { health: SourceHealthState; title?: string }) {
    const style = HEALTH_STYLES[health] ?? HEALTH_STYLES.NEVER_VERIFIED;
    const Icon = style.icon;
    return (
        <span
            title={title}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${style.bg} ${style.text} ${style.border}`}
        >
            <Icon size={12} />
            {style.label}
        </span>
    );
}
