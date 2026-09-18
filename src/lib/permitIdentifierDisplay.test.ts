import { describe, expect, it } from 'vitest';
import { isUuidShapedIdentifier, permitNumberDisplay } from './permitIdentifierDisplay';

describe('isUuidShapedIdentifier', () => {
    it('recognizes a full 36-char UUID (external_permit_id case)', () => {
        expect(isUuidShapedIdentifier('3db030ad-e18b-4507-9164-94859301e244')).toBe(true);
    });

    it('recognizes a TRUNCATED UUID prefix (the real 20-char permit_number case)', () => {
        // Exact value observed in the Phase 11.12 audit — not a valid UUID
        // on its own (cut mid-group), which is why a strict UUID regex
        // would miss it.
        expect(isUuidShapedIdentifier('64e8c3e7-b5af-4e9a-b')).toBe(true);
        expect(isUuidShapedIdentifier('de32462d-9d2b-4856-a90a-051b565ce2f1')).toBe(true);
    });

    it('does NOT flag the system’s own "EXT-XXXXXXXX" fallback numbering', () => {
        expect(isUuidShapedIdentifier('EXT-4c560ad2')).toBe(false);
    });

    it('does not flag ordinary human permit numbers', () => {
        expect(isUuidShapedIdentifier('BLD-2024-01234')).toBe(false);
        expect(isUuidShapedIdentifier('24-0099821')).toBe(false);
        expect(isUuidShapedIdentifier('CH2024001234')).toBe(false);
    });

    it('does not flag short values even if hex-looking', () => {
        expect(isUuidShapedIdentifier('abc123')).toBe(false);
    });

    it('handles null/undefined/empty safely', () => {
        expect(isUuidShapedIdentifier(null)).toBe(false);
        expect(isUuidShapedIdentifier(undefined)).toBe(false);
        expect(isUuidShapedIdentifier('')).toBe(false);
    });
});

describe('permitNumberDisplay', () => {
    it('labels a UUID-shaped value as an internal reference, not "Permit #"', () => {
        const result = permitNumberDisplay('64e8c3e7-b5af-4e9a-b');
        expect(result.label).toBe('Internal Record ID');
        expect(result.isInternalReference).toBe(true);
        expect(result.value).toBe('64e8c3e7-b5af-4e9a-b');
    });

    it('keeps a real permit number labelled "Permit #"', () => {
        const result = permitNumberDisplay('BLD-2024-01234');
        expect(result.label).toBe('Permit #');
        expect(result.isInternalReference).toBe(false);
    });

    it('keeps the system’s EXT- fallback ID labelled "Permit #" (already a clear reference)', () => {
        const result = permitNumberDisplay('EXT-4c560ad2');
        expect(result.label).toBe('Permit #');
    });

    it('handles a missing permit number without crashing', () => {
        const result = permitNumberDisplay(null);
        expect(result.value).toBe('—');
        expect(result.isInternalReference).toBe(false);
    });
});
