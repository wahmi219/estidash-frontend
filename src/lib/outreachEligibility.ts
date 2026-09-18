/**
 * Phase 11.4 (EHUB-MSA-01) — human-readable labels for the reason codes
 * app/services/outreach_eligibility_service.py's check_outreach_eligible()
 * returns. The backend gate is authoritative; this only translates its
 * codes into text an operator can act on. Keep in sync with that module's
 * `reasons.append(...)` calls.
 */
const REASON_LABELS: Record<string, string> = {
    outreach_disabled: 'Manual outreach is currently disabled',
    contractor_id_missing: 'No contractor is linked to this relationship',
    contractor_not_found: 'Linked contractor record not found',
    no_usable_primary_email: 'No usable email — Contact Info Needed',
    dnc: 'Do Not Contact',
    active_client_suppressed: 'Active Client — cold outreach blocked',
    former_client_suppressed: 'Former Client — requires owner reactivation',
    warm_lead_suppressed: 'Warm Lead — cold outreach blocked',
    active_opportunity_suppressed: 'Active Opportunity — cold outreach blocked',
    not_interested: 'Marked Not Interested',
    cooldown: 'In cooldown after recent contact',
    active_sequence_exists: 'A workflow is already active for this contractor',
    reply_lock: 'Reply lock is active',
    invalid_relationship_status: 'Relationship status is invalid',
    no_primary_opportunity: 'No current opportunity is attached',
    primary_opportunity_not_current: 'The primary opportunity is no longer current',
    relationship_not_found: 'Relationship not found',
    synthetic_qa_fixture: 'Synthetic QA fixture',
    archived: 'Relationship is archived',
};

// Final Pre-Reaudit Cleanup Part A — reasons strong enough that the stored
// outreach_status column becomes untrustworthy to display as-is (mirrors
// outreach_workflow_service.AUTHORITATIVE_STOP_REASONS / the "dominating
// state" concept on the backend). Deliberately excludes benign/transient
// reasons the stored status is SUPPOSED to already represent correctly
// (cooldown, an already-active sequence, the global manual-outreach kill
// switch, or a structural gap like a missing contractor) — those are not
// lies, just not "ready right now".
const STRONG_BLOCKING_REASONS = new Set([
    'dnc', 'not_interested', 'active_client_suppressed', 'former_client_suppressed',
    'warm_lead_suppressed', 'active_opportunity_suppressed', 'no_usable_primary_email',
    'synthetic_qa_fixture', 'archived', 'no_primary_opportunity',
]);

export function hasStrongBlockingReason(reasons: string[]): boolean {
    return reasons.some((r) => STRONG_BLOCKING_REASONS.has(r) || r.startsWith('primary_opportunity_'));
}

export function strongBlockingReasons(reasons: string[]): string[] {
    return reasons.filter((r) => STRONG_BLOCKING_REASONS.has(r) || r.startsWith('primary_opportunity_'));
}

function labelReason(reason: string): string {
    if (REASON_LABELS[reason]) return REASON_LABELS[reason];
    if (reason.startsWith('primary_opportunity_')) {
        const suffix = reason.replace('primary_opportunity_', '').replace(/_/g, ' ');
        return `Opportunity is no longer eligible (${suffix})`;
    }
    return reason.replace(/_/g, ' ');
}

/** The single reason to headline when Start Outreach is blocked — the
 * usable-email gap is surfaced first since it is the most common and most
 * actionable case (route the operator to Contact Info Needed), matching
 * the exact wording the master spec compliance audit asked for. */
export function primaryIneligibleReason(reasons: string[]): string | null {
    if (reasons.length === 0) return null;
    if (reasons.includes('no_usable_primary_email')) return REASON_LABELS.no_usable_primary_email;
    return labelReason(reasons[0]);
}

export function describeIneligibleReasons(reasons: string[]): string[] {
    return reasons.map(labelReason);
}
