import { describe, expect, it } from 'vitest';
import { computeMissingContractorFields } from './contractorMissingFields';
import type { ContractorRecord } from '@/types';

function makeContractor(overrides: Partial<ContractorRecord> = {}): ContractorRecord {
    return {
        id: 'c1',
        name: 'Acme Roofing',
        license_number: 'LIC-123',
        license_type: null,
        license_expiry: null,
        phone: '555-0100',
        email: 'ops@acme.test',
        website: 'https://acme.test',
        address_line: '123 Main St',
        city: 'Chicago',
        state_code: 'IL',
        zip_code: '60601',
        extra_data: null,
        created_at: null,
        updated_at: null,
        permit_count: 0,
        latest_permit_date: null,
        contractor_types: [],
        ...overrides,
    } as ContractorRecord;
}

describe('computeMissingContractorFields', () => {
    it('returns no entries when every field is present', () => {
        expect(computeMissingContractorFields(makeContractor())).toEqual([]);
    });

    it('returns exactly one Phone entry when phone is missing, not two', () => {
        // phone is deliberately checked in both the identity and contact
        // signal sets (mirrors contractor_completeness_service.py) — this
        // is the exact condition that used to render two "Missing: Phone"
        // badges with a duplicate React key.
        const missing = computeMissingContractorFields(makeContractor({ phone: null }));
        const phoneEntries = missing.filter(f => f.label === 'Phone');
        expect(phoneEntries).toHaveLength(1);
        expect(phoneEntries[0].key).toBe('phone');
    });

    it('never produces two entries with the same key', () => {
        const missing = computeMissingContractorFields(
            makeContractor({ phone: '', email: null, website: null, address_line: null }),
        );
        const keys = missing.map(f => f.key);
        expect(new Set(keys).size).toBe(keys.length);
    });

    it('treats an empty string the same as a missing value, for every field this covers', () => {
        const missing = computeMissingContractorFields(
            makeContractor({ name: '', license_number: '', state_code: '', address_line: '', phone: '', email: '', website: '' }),
        );
        const keys = missing.map(f => f.key).sort();
        expect(keys).toEqual(['address_line', 'email', 'license_number', 'name', 'phone', 'state_code', 'website']);
    });

    it('reports Email and Website missing independently of Phone', () => {
        const missing = computeMissingContractorFields(makeContractor({ email: null, website: null }));
        expect(missing.map(f => f.key).sort()).toEqual(['email', 'website']);
    });
});
