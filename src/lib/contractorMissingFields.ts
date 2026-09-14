import type { ContractorRecord } from '@/types';

export interface MissingContractorField {
    /** Stable identifier for the underlying Contractor data field — used as
     * the React list key. Never the display label: two signals can share a
     * label (see `phone` below) without being the same list item, and using
     * the label as the key would collide in that case. */
    key: string;
    label: string;
    present: boolean;
}

/**
 * Identity/contact fields used for the "missing fields" data-quality list —
 * mirrors the exact 5+3 signals identity_strength/contactability are
 * computed from server-side (contractor_completeness_service.py), so this
 * list never implies more/less than what those badges already represent.
 *
 * contractor_completeness_service.py documents that `phone` deliberately
 * contributes to BOTH identity_strength and contactability — it is one
 * underlying fact about the contractor, checked in two different scoring
 * contexts, not two facts. When it's missing, this must render as exactly
 * one "Missing: Phone" entry, not two, so the result is deduplicated by
 * `key` (the underlying field, not the display label and not array index —
 * index would only hide any future genuine duplicate, not rule it out).
 */
export function computeMissingContractorFields(
    contractor: Pick<ContractorRecord, 'name' | 'license_number' | 'state_code' | 'address_line' | 'phone' | 'email' | 'website' | 'canonical_email' | 'canonical_email_checked'>,
): MissingContractorField[] {
    // Contractor Contact Summary Consistency fix: "is email present" must
    // be answered from the canonical, normalized Contractor Email state
    // (canonical_email, backed by contractor_emails child rows), never the
    // legacy `email` column — a contractor with a usable canonical email
    // added via Contact Info Needed research must never show "Missing:
    // Email" just because that address never got backfilled into the
    // legacy column (which Phase 5+ deliberately never does). Falls back
    // to the legacy field only when canonical_email_checked is falsy (a
    // list row, where the canonical lookup never ran) — a detail row that
    // WAS checked and genuinely has no usable email must not fall back to
    // the legacy column, or a contractor with only a bad/unusable legacy
    // address would wrongly show as having email.
    const hasEmail = contractor.canonical_email_checked
        ? !!contractor.canonical_email
        : !!contractor.email;
    const identityFields: MissingContractorField[] = [
        { key: 'name', label: 'Name', present: !!contractor.name },
        { key: 'license_number', label: 'License number', present: !!contractor.license_number },
        { key: 'state_code', label: 'State', present: !!contractor.state_code },
        { key: 'address_line', label: 'Address', present: !!contractor.address_line },
        { key: 'phone', label: 'Phone', present: !!contractor.phone },
    ];
    const contactFields: MissingContractorField[] = [
        { key: 'email', label: 'Email', present: hasEmail },
        { key: 'phone', label: 'Phone', present: !!contractor.phone },
        { key: 'website', label: 'Website', present: !!contractor.website },
    ];

    const byKey = new Map<string, MissingContractorField>();
    for (const field of [...identityFields, ...contactFields]) {
        if (!field.present && !byKey.has(field.key)) {
            byKey.set(field.key, field);
        }
    }
    return Array.from(byKey.values());
}
