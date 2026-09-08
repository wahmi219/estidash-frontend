'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Copy, Check, Phone, Mail, MapPin } from 'lucide-react';
import { RegistryRecordListItem } from '@/types';

// Hover-revealed copy affordance on License Number, Phone, and Address —
// per plan section 6 feedback. Local per-button `copied` state, mirroring
// the pattern already used for raw-JSON copy on the permit detail page
// (no shared Toast component exists in this app).
function CopyButton({ value }: { value: string }) {
    const [copied, setCopied] = useState(false);

    async function handleCopy(e: React.MouseEvent) {
        e.stopPropagation();
        try {
            await navigator.clipboard.writeText(value);
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
        } catch {
            // clipboard not available; silently ignore
        }
    }

    return (
        <button
            onClick={handleCopy}
            title="Copy to clipboard"
            className="opacity-0 group-hover:opacity-100 focus-visible:opacity-100 transition-opacity shrink-0 text-[#5B6B7D] hover:text-[#00458B]"
        >
            {copied ? <Check size={12} className="text-emerald-600" /> : <Copy size={12} />}
        </button>
    );
}

const STATUS_STYLES: Record<string, string> = {
    A: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
};
const STATUS_DEFAULT = 'bg-gray-100 text-[#5B6B7D] border border-gray-200';

function StatusBadge({ code, description }: { code: string | null; description: string | null }) {
    if (!description) return <span className="text-gray-400 text-sm">—</span>;
    const classes = (code && STATUS_STYLES[code]) || STATUS_DEFAULT;
    return (
        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium ${classes}`}>
            {description}
        </span>
    );
}

interface RegistryRowProps {
    record: RegistryRecordListItem;
    // Only passed when the current result set actually spans more than one
    // underlying source (a merged SOURCE_GROUPS search, e.g. "New York (All
    // Sources)") -- a DOB General Contractor row and a DCWP Home
    // Improvement row are not interchangeable despite both being "New
    // York", so the badge only earns its space when it's adding real
    // information, not on an ordinary single-source search.
    showSource?: boolean;
}

const RegistryRow = React.forwardRef<HTMLTableRowElement, RegistryRowProps>(function RegistryRow(
    { record, showSource = false }: RegistryRowProps,
    ref,
) {
    const router = useRouter();
    const location = [record.city, record.address_state].filter(Boolean).join(', ');
    const fullAddress = [location, record.zip].filter(Boolean).join(' ');

    return (
        <tr
            ref={ref}
            onClick={() => router.push(`/dashboard/contractors/registry/${record.id}`)}
            className="group border-b border-[#DFE6EE] hover:bg-[#F7F9FB] transition-colors cursor-pointer"
        >
            {/* Business name + principal */}
            <td className="px-4 py-3">
                <div className="font-medium text-[#0E2B5C] truncate max-w-55" title={record.business_name ?? undefined}>
                    {record.business_name || '—'}
                </div>
                {record.primary_principal_name && (
                    <div className="text-xs text-[#5B6B7D] mt-0.5 truncate max-w-55">{record.primary_principal_name}</div>
                )}
                {showSource && record.source_display_name && (
                    <div className="inline-flex mt-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-blue-50 text-blue-700" title={record.source_display_name}>
                        {record.source_display_name}
                    </div>
                )}
            </td>

            {/* License number */}
            <td className="px-4 py-3">
                {record.license_number ? (
                    <div className="flex items-center gap-1.5 font-mono text-sm text-[#0E2B5C]">
                        {record.license_number}
                        <CopyButton value={record.license_number} />
                    </div>
                ) : (
                    <span className="text-gray-400 text-sm">—</span>
                )}
            </td>

            {/* Status */}
            <td className="px-4 py-3">
                <StatusBadge code={record.license_status_code} description={record.license_status_description} />
            </td>

            {/* Type */}
            <td className="px-4 py-3">
                <span className="text-sm text-[#5B6B7D] truncate max-w-[160px] block" title={record.license_type_description ?? undefined}>
                    {record.license_type_description || '—'}
                </span>
            </td>

            {/* Phone */}
            <td className="px-4 py-3">
                {record.phone ? (
                    <div className="flex items-center gap-1.5 text-sm text-[#5B6B7D]">
                        <Phone size={13} className="shrink-0 text-[#5B6B7D]" />
                        {record.phone}
                        <CopyButton value={record.phone} />
                    </div>
                ) : (
                    <span className="text-gray-400 text-sm">—</span>
                )}
            </td>

            {/* Email — only nyc_dob_license currently populates this */}
            <td className="px-4 py-3">
                {record.email ? (
                    <div className="flex items-center gap-1.5 text-sm text-[#5B6B7D]">
                        <Mail size={13} className="shrink-0 text-[#5B6B7D]" />
                        <span className="truncate max-w-45" title={record.email}>{record.email}</span>
                        <CopyButton value={record.email} />
                    </div>
                ) : (
                    <span className="text-gray-400 text-sm">—</span>
                )}
            </td>

            {/* Location */}
            <td className="px-4 py-3">
                {location ? (
                    <div className="flex items-center gap-1.5 text-sm text-[#5B6B7D]">
                        <MapPin size={13} className="shrink-0 text-[#5B6B7D]" />
                        {location}
                        <CopyButton value={fullAddress} />
                    </div>
                ) : (
                    <span className="text-gray-400 text-sm">—</span>
                )}
            </td>

            {/* Expiration */}
            <td className="px-4 py-3">
                <span className="text-sm text-[#5B6B7D] font-mono tabular-nums">
                    {record.license_expiration_date || '—'}
                </span>
            </td>

            {/* Current status */}
            <td className="px-4 py-3 text-center">
                {record.is_current ? (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-blue-50 text-blue-700">
                        Active
                    </span>
                ) : (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-gray-100 text-[#5B6B7D]">
                        Historic
                    </span>
                )}
            </td>
        </tr>
    );
});

export default React.memo(RegistryRow);
