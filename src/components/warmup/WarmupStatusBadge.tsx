'use client';

const STATUS_CONFIG: Record<string, { label: string; classes: string; dot: string }> = {
    warming:     { label: 'Warming Up',  classes: 'bg-blue-500/15 text-blue-400',     dot: 'bg-blue-400 animate-pulse' },
    maintenance: { label: 'Maintenance', classes: 'bg-teal-500/15 text-teal-400',     dot: 'bg-teal-400' },
    completed:   { label: 'Ready',       classes: 'bg-emerald-500/15 text-emerald-400', dot: 'bg-emerald-400' },
    paused:      { label: 'Paused',      classes: 'bg-amber-500/15 text-amber-400',   dot: 'bg-amber-400' },
    not_started: { label: 'Not Started', classes: 'bg-gray-500/15 text-gray-400',     dot: 'bg-gray-500' },
    failed:      { label: 'Failed',      classes: 'bg-rose-500/15 text-rose-400',     dot: 'bg-rose-500' },
};

interface WarmupStatusBadgeProps {
    status: string;
    className?: string;
}

export default function WarmupStatusBadge({ status, className = '' }: WarmupStatusBadgeProps) {
    const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG['not_started'];
    return (
        <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium ${cfg.classes} ${className}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
            {cfg.label}
        </span>
    );
}
