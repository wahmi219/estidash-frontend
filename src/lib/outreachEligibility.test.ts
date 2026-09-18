import { describe, it, expect } from 'vitest';
import { hasStrongBlockingReason, strongBlockingReasons, primaryIneligibleReason } from './outreachEligibility';

// Final Pre-Reaudit Cleanup Part A — the Lead Bank detail page uses these
// to decide whether "Outreach Status" should show the stored value or
// "Blocked". Pins the exact classification live-pilot regressions relied
// on (Otis/Metropolitan: manual_stop's downstream effects; BYRON:
// not_interested + no usable email).

describe('hasStrongBlockingReason', () => {
    it('is true for a strong CRM-state reason (not_interested)', () => {
        expect(hasStrongBlockingReason(['not_interested'])).toBe(true);
    });

    it('is true for no usable canonical email', () => {
        expect(hasStrongBlockingReason(['no_usable_primary_email'])).toBe(true);
    });

    it('is true for a synthetic fixture or archived relationship', () => {
        expect(hasStrongBlockingReason(['synthetic_qa_fixture'])).toBe(true);
        expect(hasStrongBlockingReason(['archived'])).toBe(true);
    });

    it('is true for any primary_opportunity_* failure reason', () => {
        expect(hasStrongBlockingReason(['primary_opportunity_terminal'])).toBe(true);
    });

    it('is false for benign/transient reasons the stored status already represents correctly', () => {
        expect(hasStrongBlockingReason(['cooldown'])).toBe(false);
        expect(hasStrongBlockingReason(['active_sequence_exists'])).toBe(false);
        expect(hasStrongBlockingReason(['outreach_disabled'])).toBe(false);
        expect(hasStrongBlockingReason(['reply_lock'])).toBe(false);
    });

    it('is false for an empty reason list', () => {
        expect(hasStrongBlockingReason([])).toBe(false);
    });

    it('is true when a strong reason is mixed with benign ones', () => {
        expect(hasStrongBlockingReason(['cooldown', 'dnc'])).toBe(true);
    });
});

describe('strongBlockingReasons', () => {
    it('filters out benign reasons, keeping only strong ones', () => {
        expect(strongBlockingReasons(['cooldown', 'not_interested', 'reply_lock'])).toEqual(['not_interested']);
    });

    it('returns an empty array when nothing is strong', () => {
        expect(strongBlockingReasons(['cooldown', 'active_sequence_exists'])).toEqual([]);
    });
});

describe('primaryIneligibleReason', () => {
    it('returns null for an empty reason list', () => {
        expect(primaryIneligibleReason([])).toBeNull();
    });

    it('prioritizes the usable-email gap over other reasons', () => {
        expect(primaryIneligibleReason(['cooldown', 'no_usable_primary_email'])).toBe('No usable email — Contact Info Needed');
    });
});
