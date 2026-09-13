import type { MatchCandidate } from '@/types';

/**
 * Phase 11.3 (P1 — "Contractor Verification evidence remains insufficient
 * for safe resolution"): the independent re-audit found that this queue's
 * list view gives a reviewer no way to tell "name match, zero
 * corroboration" apart from "name match plus a real corroborating signal"
 * without opening every single candidate's detail page. This derives that
 * distinction from data the backend already returns (evidence.signals, a
 * list from {phone, address, email, license_number, city_state} —
 * contractor_similarity_service.matched_signals()) — no backend change
 * needed, since the signal list was already being computed and stored,
 * just never surfaced as a strength indicator.
 *
 * A candidate with a suggested contractor but NO signals beyond the name
 * match itself is explicitly "weak" — the exact case the master
 * specification requires a human never auto-link on alone.
 */
export interface EvidenceStrength {
    level: 'none' | 'weak' | 'corroborated';
    label: string;
    signals: string[];
}

const SIGNAL_LABELS: Record<string, string> = {
    phone: 'Phone', address: 'Address', email: 'Email',
    license_number: 'License #', city_state: 'City/State',
};

export function evidenceStrength(candidate: Pick<MatchCandidate, 'candidate_contractor_id' | 'evidence'>): EvidenceStrength {
    if (!candidate.candidate_contractor_id) {
        return { level: 'none', label: 'No candidate suggested', signals: [] };
    }
    const rawSignals = candidate.evidence && Array.isArray(candidate.evidence.signals)
        ? (candidate.evidence.signals as unknown[]).filter((s): s is string => typeof s === 'string')
        : [];
    if (rawSignals.length === 0) {
        return { level: 'weak', label: 'Weak — name match only, no corroboration', signals: [] };
    }
    const labels = rawSignals.map((s) => SIGNAL_LABELS[s] ?? s);
    return {
        level: 'corroborated',
        label: `Corroborated — ${labels.join(', ')}`,
        signals: labels,
    };
}
