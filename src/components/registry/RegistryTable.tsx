'use client';

import React, { useRef } from 'react';
import { ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { RegistryRecordListItem, PermitSorting } from '@/types';
import RegistryRow from './RegistryRow';
import RegistryTableSkeleton from './RegistryTableSkeleton';
import RegistryEmptyState from './RegistryEmptyState';

interface RegistryTableProps {
    records: RegistryRecordListItem[];
    isLoading: boolean;
    sorting: PermitSorting;
    onSort: (field: string) => void;
    onResetFilters?: () => void;
    hasFilters?: boolean;
}

interface SortableHeaderProps {
    field: string;
    label: string;
    currentSort: PermitSorting;
    onSort: (field: string) => void;
    align?: 'left' | 'right';
}

// Only columns backed by an indexed sort column on the backend
// (_SORT_COLUMN_MAP in contractor_registry_query_service.py) are sortable —
// mirrors PermitTable.tsx's SortableHeader, same fallback-to-default
// behavior server-side for anything else.
function SortableHeader({ field, label, currentSort, onSort, align = 'left' }: SortableHeaderProps) {
    const isActive = currentSort.field === field;

    return (
        <th
            className={`px-4 py-3 font-medium cursor-pointer hover:bg-gray-100 dark:hover:bg-white/2 transition-colors select-none ${align === 'right' ? 'text-right' : ''}`}
            onClick={() => onSort(field)}
        >
            <div className={`flex items-center gap-1 ${align === 'right' ? 'justify-end' : ''}`}>
                {label}
                <span className="text-gray-500">
                    {isActive ? (
                        currentSort.direction === 'asc' ? (
                            <ChevronUp size={14} className="text-cyan-400" />
                        ) : (
                            <ChevronDown size={14} className="text-cyan-400" />
                        )
                    ) : (
                        <ChevronsUpDown size={14} className="opacity-50" />
                    )}
                </span>
            </div>
        </th>
    );
}

export default function RegistryTable({
    records,
    isLoading,
    sorting,
    onSort,
    onResetFilters,
    hasFilters = false,
}: RegistryTableProps) {
    const scrollRef = useRef<HTMLDivElement>(null);

    // Virtualizer — always called before any early returns (Rules of Hooks),
    // same padding-spacer approach as PermitTable.tsx (no absolute
    // positioning needed). Right template given up to 160K+ rows per source.
    const rowVirtualizer = useVirtualizer({
        count: records.length,
        getScrollElement: () => scrollRef.current,
        estimateSize: () => 57,
        measureElement:
            typeof window !== 'undefined'
                ? (el) => el?.getBoundingClientRect().height ?? 57
                : undefined,
        overscan: 8,
    });

    if (isLoading) {
        return <RegistryTableSkeleton rows={10} />;
    }

    if (records.length === 0) {
        return <RegistryEmptyState hasFilters={hasFilters} onResetFilters={onResetFilters} />;
    }

    // Only meaningful for a merged SOURCE_GROUPS search (e.g. "New York
    // (All Sources)") -- an ordinary single-source search never has more
    // than one distinct source_key in its own result page, so the per-row
    // source badge stays hidden there (RegistryRow.tsx).
    const hasMultipleSources = new Set(records.map((r) => r.source_key)).size > 1;

    const virtualItems = rowVirtualizer.getVirtualItems();
    const totalHeight = rowVirtualizer.getTotalSize();
    const paddingTop = virtualItems.length > 0 ? virtualItems[0].start : 0;
    const paddingBottom =
        virtualItems.length > 0 ? totalHeight - virtualItems[virtualItems.length - 1].end : 0;

    return (
        <div
            ref={scrollRef}
            className="overflow-x-auto overflow-y-auto min-h-[320px]"
            style={{ maxHeight: 'calc(100vh - 460px)' }}
        >
            <table className="w-full text-left text-sm">
                <thead className="bg-gray-50 dark:bg-white/2 text-gray-600 dark:text-gray-400 border-b border-gray-200 dark:border-white/6 sticky top-0 z-10">
                    <tr>
                        <SortableHeader field="business_name" label="Business Name" currentSort={sorting} onSort={onSort} />
                        <th className="px-4 py-3 font-medium">License #</th>
                        <SortableHeader field="license_status" label="Status" currentSort={sorting} onSort={onSort} />
                        <th className="px-4 py-3 font-medium">Type</th>
                        <th className="px-4 py-3 font-medium">Phone</th>
                        <th className="px-4 py-3 font-medium">Email</th>
                        <SortableHeader field="city" label="Location" currentSort={sorting} onSort={onSort} />
                        <SortableHeader field="expiration_date" label="Expires" currentSort={sorting} onSort={onSort} />
                        <th className="px-4 py-3 font-medium text-center">Status</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-white/4">
                    {paddingTop > 0 && (
                        <tr aria-hidden>
                            <td colSpan={9} style={{ height: paddingTop, padding: 0 }} />
                        </tr>
                    )}

                    {virtualItems.map((virtualRow) => {
                        const record = records[virtualRow.index];
                        return (
                            <RegistryRow
                                key={record.id}
                                ref={rowVirtualizer.measureElement}
                                record={record}
                                showSource={hasMultipleSources}
                            />
                        );
                    })}

                    {paddingBottom > 0 && (
                        <tr aria-hidden>
                            <td colSpan={9} style={{ height: paddingBottom, padding: 0 }} />
                        </tr>
                    )}
                </tbody>
            </table>
        </div>
    );
}
