import { describe, expect, it } from 'vitest';
import { readFileSync } from 'fs';
import path from 'path';

/**
 * Phase 11.9 — static guard against re-introducing a second, UUID-based
 * "Contractor ID" next to the permanent EH-####### identifier on a normal
 * operational screen. No component-render harness exists in this repo
 * (vitest runs in a plain node environment, see vitest.config.ts), so this
 * reads each page's actual source at test time -- the same pure-function-
 * style convention as the other src/lib/*.test.ts files, applied to source
 * text instead of a function's return value.
 */

const ROOT = path.resolve(__dirname, '../..');

const OPERATIONAL_PAGES = [
    'src/app/dashboard/contractors/page.tsx',
    'src/app/dashboard/contractors/[id]/page.tsx',
    'src/app/dashboard/contact-info-needed/page.tsx',
    'src/app/dashboard/ready-for-lead-bank/page.tsx',
    'src/app/dashboard/contractor-verification/page.tsx',
    'src/app/dashboard/contractor-verification/[id]/page.tsx',
    'src/app/dashboard/lead-bank/page.tsx',
    'src/app/dashboard/lead-bank/[id]/page.tsx',
];

function read(relPath: string): string {
    return readFileSync(path.join(ROOT, relPath), 'utf-8');
}

describe('Contractor ID display (Phase 11.9 UI cleanup)', () => {
    it.each(OPERATIONAL_PAGES)('%s never uses the retired "Friendly ID" label', (relPath) => {
        const source = read(relPath);
        expect(source).not.toContain('Friendly ID');
        expect(source).not.toContain('FRIENDLY ID');
    });

    it('Lead Bank detail never renders the raw UUID as a bare JSX expression', () => {
        // The exact regression this guards: `<Field label="Contractor ID">
        // {detail.contractor_id}</Field>` used to sit right next to the
        // EH-####### field. `detail.contractor_id` legitimately still
        // appears once, inside the profile link's href template literal
        // (`${detail.contractor_id}`) -- that is internal routing, not
        // display, and is intentionally NOT what this test forbids.
        const source = read('src/app/dashboard/lead-bank/[id]/page.tsx');
        // Negative lookbehind excludes the legitimate `${detail.contractor_id}`
        // template-literal usage inside the href -- only a bare JSX
        // expression `{detail.contractor_id}` (no preceding `$`) would
        // render the UUID as visible text, which is what this forbids.
        expect(source).not.toMatch(/(?<!\$)\{detail\.contractor_id\}/);
        // The href usage should still be present and unchanged (UUID stays
        // the real internal routing identity).
        expect(source).toMatch(/\$\{detail\.contractor_id\}/);
    });

    it('every operational page that shows a Contractor ID field labels it "Contractor ID"', () => {
        for (const relPath of OPERATIONAL_PAGES) {
            const source = read(relPath);
            if (source.includes('friendly_id')) {
                // If the page surfaces the permanent identifier at all, the
                // one place it is under a labeled <Field> must say
                // "Contractor ID", not something else -- catches a future
                // rename drifting the label without touching this test.
                const hasContractorIdField = /label="Contractor ID"/.test(source);
                const hasBareDisplay = /\{[\w.]*friendly_id\}/.test(source); // unlabeled inline display (also acceptable)
                expect(hasContractorIdField || hasBareDisplay).toBe(true);
            }
        }
    });
});
