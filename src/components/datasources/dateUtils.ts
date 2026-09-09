// Backend timestamps are serialized from naive UTC datetimes (datetime.utcnow(),
// no tzinfo) via Python's isoformat() — no "Z"/offset suffix. JS's Date parser
// treats a timezone-less ISO string as LOCAL time, silently shifting every
// timestamp by the viewer's UTC offset. Same fix as ObservabilityModal.tsx.
export function parseUtcTimestamp(iso: string): Date {
    const hasTimezone = /[Zz]|[+-]\d{2}:?\d{2}$/.test(iso);
    return new Date(hasTimezone ? iso : `${iso}Z`);
}

export function relativeTime(iso: string | null): string {
    if (!iso) return 'Never';
    const diffMs = Date.now() - parseUtcTimestamp(iso).getTime();
    const mins = Math.round(diffMs / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.round(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    return `${Math.round(hours / 24)}d ago`;
}

export function formatDateTime(iso: string | null): string {
    if (!iso) return '—';
    return parseUtcTimestamp(iso).toLocaleDateString('en-US', {
        month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
    });
}

// latest_permit is a plain DATE ("2026-06-01"), not a datetime — no
// timezone ambiguity, format directly.
export function formatDateOnly(isoDate: string | null): string {
    if (!isoDate) return '—';
    const d = new Date(`${isoDate}T00:00:00`);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export function formatDuration(seconds: number | null): string {
    if (seconds == null) return '—';
    if (seconds < 60) return `${Math.round(seconds)}s`;
    const mins = Math.floor(seconds / 60);
    const secs = Math.round(seconds % 60);
    if (mins < 60) return `${mins}m ${secs}s`;
    const hours = Math.floor(mins / 60);
    return `${hours}h ${mins % 60}m`;
}
