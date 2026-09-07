'use client';

import React, { useRef } from 'react';
import { ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { PermitRecord, PermitSorting } from '@/types';
import PermitRow from './PermitRow';
import PermitTableSkeleton from './PermitTableSkeleton';
import PermitEmptyState from './PermitEmptyState';

interface PermitTableProps {
    permits: PermitRecord[];
    isLoading: boolean;
    sorting: PermitSorting;
    onSort: (field: string) => void;
    onViewDetails?: (permit: PermitRecord) => void;
    onSendMessage?: (permit: PermitRecord) => void;
    onResetFilters?: () => void;
    hasFilters?: boolean;
    selectedIds: Set<string>;
    onToggleSelect: (id: string) => void;
    onToggleSelectAll: () => void;
    allSelected: boolean;
    someSelected: boolean;
}

interface SortableHeaderProps {
    field: string;
    label: string;
    currentSort: PermitSorting;
    onSort: (field: string) => void;
    align?: 'left' | 'right';
}

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

export default function PermitTable({
    permits,
    isLoading,
    sorting,
    onSort,
    onViewDetails,
    onSendMessage,
    onResetFilters,
    hasFilters = false,
    selectedIds,
    onToggleSelect,
    onToggleSelectAll,
    allSelected,
    someSelected,
}: PermitTableProps) {
    const scrollRef = useRef<HTMLDivElement>(null);

    // Virtualizer — always called before any early returns (Rules of Hooks).
    // measureElement enables dynamic row height tracking so rows with extra
    // lines (county, subtype, badge) are measured correctly after first paint.
    const rowVirtualizer = useVirtualizer({
        count: permits.length,
        getScrollElement: () => scrollRef.current,
        estimateSize: () => 57,
        measureElement:
            typeof window !== 'undefined'
                ? (el) => el?.getBoundingClientRect().height ?? 57
                : undefined,
        overscan: 8,
    });

    if (isLoading) {
        return <PermitTableSkeleton rows={10} />;
    }

    if (permits.length === 0) {
        return <PermitEmptyState hasFilters={hasFilters} onResetFilters={onResetFilters} />;
    }

    const virtualItems = rowVirtualizer.getVirtualItems();
    const totalHeight = rowVirtualizer.getTotalSize();
    const paddingTop = virtualItems.length > 0 ? virtualItems[0].start : 0;
    const paddingBottom =
        virtualItems.length > 0 ? totalHeight - virtualItems[virtualItems.length - 1].end : 0;

    return (
        // overflow-y-auto makes this the scroll container; the virtualizer watches it.
        // max-h leaves room for the page chrome above and the pagination bar below.
        // min-h-[320px] prevents the table from collapsing on small viewports.
        <div
            ref={scrollRef}
            className="overflow-x-auto overflow-y-auto min-h-[320px]"
            style={{ maxHeight: 'calc(100vh - 400px)' }}
        >
            <table className="w-full text-left text-sm">
                {/* sticky so the header stays visible while the body scrolls */}
                <thead className="bg-gray-50 dark:bg-white/2 text-gray-600 dark:text-gray-400 border-b border-gray-200 dark:border-white/6 sticky top-0 z-10">
                    <tr>
                        <th className="px-4 py-3 w-10">
                            <input
                                type="checkbox"
                                checked={allSelected}
                                ref={(el) => { if (el) el.indeterminate = someSelected && !allSelected; }}
                                onChange={onToggleSelectAll}
                                className="w-4 h-4 rounded border-gray-400 dark:border-gray-600 bg-transparent text-cyan-500 focus:ring-cyan-500/30 cursor-pointer"
                            />
                        </th>
                        <SortableHeader field="issue_date" label="Date" currentSort={sorting} onSort={onSort} />
                        <SortableHeader field="permit_number" label="Permit #" currentSort={sorting} onSort={onSort} />
                        <SortableHeader field="permit_type" label="Type" currentSort={sorting} onSort={onSort} />
                        <SortableHeader field="city" label="City" currentSort={sorting} onSort={onSort} />
                        <th className="px-4 py-3 font-medium">Contractor</th>
                        <SortableHeader field="status" label="Status" currentSort={sorting} onSort={onSort} />
                        <SortableHeader field="estimated_cost" label="Est. Cost" currentSort={sorting} onSort={onSort} align="right" />
                        <SortableHeader field="lead_score" label="Score" currentSort={sorting} onSort={onSort} align="right" />
                        <th className="px-4 py-3 font-medium w-28">Actions</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-white/4">
                    {/* Top spacer — represents all rows scrolled above the viewport */}
                    {paddingTop > 0 && (
                        <tr aria-hidden>
                            <td colSpan={10} style={{ height: paddingTop, padding: 0 }} />
                        </tr>
                    )}

                    {virtualItems.map((virtualRow) => {
                        const permit = permits[virtualRow.index];
                        return (
                            <PermitRow
                                key={permit.id}
                                ref={rowVirtualizer.measureElement}
                                permit={permit}
                                isSelected={selectedIds.has(permit.id)}
                                onToggleSelect={onToggleSelect}
                                onViewDetails={onViewDetails}
                                onSendMessage={onSendMessage}
                            />
                        );
                    })}

                    {/* Bottom spacer — represents all rows not yet scrolled into view */}
                    {paddingBottom > 0 && (
                        <tr aria-hidden>
                            <td colSpan={10} style={{ height: paddingBottom, padding: 0 }} />
                        </tr>
                    )}
                </tbody>
            </table>
        </div>
    );
}
