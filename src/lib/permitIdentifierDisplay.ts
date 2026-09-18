/**
 * Phase 11.13 Part 32 (Phase 11.12 J1) — a permit whose source has no
 * human-readable permit number stores a UUID (or a truncated UUID prefix)
 * in `permit_number`, because ingestion falls back to the source's own
 * record identifier when no real number exists. The audit found this
 * rendered identically to a real permit number, labelled "Permit #" and
 * shown in Lead Bank opportunity cards the same way — visually implying a
 * business identifier that isn't one.
 *
 * Measured against the live pilot DB (Phase 11.12): 657 permits have a
 * `permit_number` that is UUID-shaped, often truncated to 20 characters
 * (e.g. "64e8c3e7-b5af-4e9a-b" — a UUID cut mid-group, not a valid UUID
 * string on its own, so a strict UUID regex would miss it).
 * `external_permit_id` is never null, but for these same 657 rows it is
 * ALSO a UUID — the source genuinely has no human-meaningful number, so
 * there is no better field to fall back to. This is a presentation fix,
 * not a data fix: don't claim a business identifier exists when the only
 * value on file is a raw source record ID.
 *
 * Distinct from — and must NOT flag — the system's own "EXT-XXXXXXXX"
 * fallback numbering (47 permits): that is a deliberately generated,
 * already-clearly-labelled internal reference, not a raw UUID leak.
 */

// UUID canonical hyphen positions (8-4-4-4-12 grouping): index 8, 13, 18, 23.
// Checked positionally rather than with a single regex because a TRUNCATED
// UUID (cut off mid-group, as ingestion produces) is not itself a valid
// UUID string — position-by-position matching against the canonical
// template correctly recognizes a truncated prefix, where a strict
// full-UUID regex would not.
const UUID_HYPHEN_POSITIONS = new Set([8, 13, 18, 23]);
const MIN_UUID_PREFIX_LENGTH = 16; // below this, hex-looking is too ambiguous with a short real permit number

export function isUuidShapedIdentifier(value: string | null | undefined): boolean {
    if (!value) return false;
    const s = value.trim();
    if (s.length < MIN_UUID_PREFIX_LENGTH || s.length > 36) return false;

    for (let i = 0; i < s.length; i++) {
        const ch = s[i];
        if (UUID_HYPHEN_POSITIONS.has(i)) {
            if (ch !== '-') return false;
        } else if (!/[0-9a-f]/i.test(ch)) {
            return false;
        }
    }
    return true;
}

/** What to show where a page currently labels this value "Permit #". */
export function permitNumberDisplay(permitNumber: string | null | undefined): {
    value: string;
    label: string;
    isInternalReference: boolean;
} {
    if (!permitNumber) {
        return { value: '—', label: 'Permit #', isInternalReference: false };
    }
    if (isUuidShapedIdentifier(permitNumber)) {
        return { value: permitNumber, label: 'Internal Record ID', isInternalReference: true };
    }
    return { value: permitNumber, label: 'Permit #', isInternalReference: false };
}
