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
    onResetFilters?: () => void;
    hasFilters?: boolean;
    // Selection/delete UI is entirely optional — omitted for roles that can't
    // delete, which also hides the checkbox column (see dashboard/permits/page.tsx).
    selectedIds?: Set<string>;
    onToggleSelect?: (id: string) => void;
    onToggleSelectAll?: () => void;
    allSelected?: boolean;
    someSelected?: boolean;
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
            className={`px-4 py-3 font-medium cursor-pointer hover:bg-[#F7F9FB] transition-colors select-none ${align === 'right' ? 'text-right' : ''}`}
            onClick={() => onSort(field)}
        >
            <div className={`flex items-center gap-1 ${align === 'right' ? 'justify-end' : ''}`}>
                {label}
                <span className="text-[#5B6B7D]">
                    {isActive ? (
                        currentSort.direction === 'asc' ? (
                            <ChevronUp size={14} className="text-[#00458B]" />
                        ) : (
                            <ChevronDown size={14} className="text-[#00458B]" />
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
    onResetFilters,
    hasFilters = false,
    selectedIds,
    onToggleSelect,
    onToggleSelectAll,
    allSelected = false,
    someSelected = false,
}: PermitTableProps) {
    const scrollRef = useRef<HTMLDivElement>(null);
    const showSelection = Boolean(onToggleSelect && onToggleSelectAll);
    const columnCount = showSelection ? 8 : 7;

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
                <thead className="bg-[#F7F9FB] text-[#5B6B7D] border-b border-[#DFE6EE] sticky top-0 z-10">
                    <tr>
                        {showSelection && (
                            <th className="px-4 py-3 w-10">
                                <input
                                    type="checkbox"
                                    checked={allSelected}
                                    ref={(el) => { if (el) el.indeterminate = someSelected && !allSelected; }}
                                    onChange={onToggleSelectAll}
                                    className="w-4 h-4 rounded border-[#DFE6EE] bg-white text-[#00458B] focus:ring-[#00458B]/30 cursor-pointer"
                                />
                            </th>
                        )}
                        <SortableHeader field="created_at" label="Added" currentSort={sorting} onSort={onSort} />
                        <SortableHeader field="permit_number" label="Permit / Project Scope" currentSort={sorting} onSort={onSort} />
                        <SortableHeader field="city" label="Location" currentSort={sorting} onSort={onSort} />
                        <th className="px-4 py-3 font-medium">Contractor</th>
                        <SortableHeader field="estimated_cost" label="Value" currentSort={sorting} onSort={onSort} align="right" />
                        <SortableHeader field="lead_score" label="Qualification" currentSort={sorting} onSort={onSort} align="right" />
                        <th className="px-4 py-3 font-medium w-20">Actions</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-[#DFE6EE]">
                    {/* Top spacer — represents all rows scrolled above the viewport */}
                    {paddingTop > 0 && (
                        <tr aria-hidden>
                            <td colSpan={columnCount} style={{ height: paddingTop, padding: 0 }} />
                        </tr>
                    )}

                    {virtualItems.map((virtualRow) => {
                        const permit = permits[virtualRow.index];
                        return (
                            <PermitRow
                                key={permit.id}
                                ref={rowVirtualizer.measureElement}
                                permit={permit}
                                isSelected={showSelection ? (selectedIds?.has(permit.id) ?? false) : undefined}
                                onToggleSelect={onToggleSelect}
                                onViewDetails={onViewDetails}
                            />
                        );
                    })}

                    {/* Bottom spacer — represents all rows not yet scrolled into view */}
                    {paddingBottom > 0 && (
                        <tr aria-hidden>
                            <td colSpan={columnCount} style={{ height: paddingBottom, padding: 0 }} />
                        </tr>
                    )}
                </tbody>
            </table>
        </div>
    );
}
