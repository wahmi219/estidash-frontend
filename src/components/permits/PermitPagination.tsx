'use client';

import React from 'react';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';
import { PermitPagination as PaginationType } from '@/types';

interface PermitPaginationProps {
    pagination: PaginationType;
    onPageChange: (page: number) => void;
    onPageSizeChange: (size: number) => void;
    /** Noun for the "Showing X to Y of Z ___" line. Defaults to "permits" so
     * every existing Permit Records call site is unaffected. */
    itemLabel?: string;
}

const PAGE_SIZES = [10, 25, 50, 100, 500, 1000, 2000];

export default function PermitPagination({
    pagination,
    onPageChange,
    onPageSizeChange,
    itemLabel = 'permits',
}: PermitPaginationProps) {
    const { page, pageSize, totalRecords, totalPages, totalIsEstimate } = pagination;

    const startRecord = totalRecords === 0 ? 0 : (page - 1) * pageSize + 1;
    const endRecord = Math.min(page * pageSize, totalRecords);
    // The unfiltered total is a fast planner estimate, not an exact count.
    const totalLabel = `${totalIsEstimate ? '~' : ''}${totalRecords.toLocaleString()}`;

    const canGoPrev = page > 1;
    const canGoNext = page < totalPages;

    // Generate page numbers to show
    const getPageNumbers = () => {
        const pages: (number | 'ellipsis')[] = [];
        const showPages = 5;

        if (totalPages <= showPages) {
            for (let i = 1; i <= totalPages; i++) pages.push(i);
        } else {
            // Always show first page
            pages.push(1);

            if (page > 3) pages.push('ellipsis');

            // Show pages around current
            for (let i = Math.max(2, page - 1); i <= Math.min(totalPages - 1, page + 1); i++) {
                if (!pages.includes(i)) pages.push(i);
            }

            if (page < totalPages - 2) pages.push('ellipsis');

            // Always show last page
            if (totalPages > 1) pages.push(totalPages);
        }

        return pages;
    };

    return (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 py-4 px-2">
            {/* Records info */}
            <div className="text-sm text-[#5B6B7D]">
                Showing <span className="text-[#0E2B5C] font-medium">{startRecord.toLocaleString()}</span> to{' '}
                <span className="text-[#0E2B5C] font-medium">{endRecord.toLocaleString()}</span> of{' '}
                <span className="text-[#0E2B5C] font-medium">{totalLabel}</span> {itemLabel}
            </div>

            <div className="flex items-center gap-4">
                {/* Page size selector */}
                <div className="flex items-center gap-2">
                    <span className="text-sm text-[#5B6B7D]">Show</span>
                    <select
                        value={pageSize}
                        onChange={(e) => onPageSizeChange(Number(e.target.value))}
                        className="px-2 py-1 bg-white border border-[#DFE6EE] rounded-lg text-[#0E2B5C] text-sm focus:outline-none focus:ring-2 focus:ring-[#00458B]/25 transition-colors"
                    >
                        {PAGE_SIZES.map((size) => (
                            <option key={size} value={size}>
                                {size}
                            </option>
                        ))}
                    </select>
                </div>

                {/* Pagination controls */}
                <div className="flex items-center gap-1">
                    {/* First page */}
                    <button
                        onClick={() => onPageChange(1)}
                        disabled={!canGoPrev}
                        className="p-1.5 rounded-lg hover:bg-[#F7F9FB] disabled:opacity-30 disabled:cursor-not-allowed text-[#5B6B7D] hover:text-[#0E2B5C] transition-colors"
                        title="First page"
                    >
                        <ChevronsLeft size={16} />
                    </button>

                    {/* Previous page */}
                    <button
                        onClick={() => onPageChange(page - 1)}
                        disabled={!canGoPrev}
                        className="p-1.5 rounded-lg hover:bg-[#F7F9FB] disabled:opacity-30 disabled:cursor-not-allowed text-[#5B6B7D] hover:text-[#0E2B5C] transition-colors"
                        title="Previous page"
                    >
                        <ChevronLeft size={16} />
                    </button>

                    {/* Page numbers */}
                    <div className="flex items-center gap-1 mx-1">
                        {getPageNumbers().map((p, idx) =>
                            p === 'ellipsis' ? (
                                <span key={`ellipsis-${idx}`} className="px-2 text-[#5B6B7D]">
                                    ...
                                </span>
                            ) : (
                                <button
                                    key={p}
                                    onClick={() => onPageChange(p)}
                                    className={`min-w-[32px] h-8 px-2 rounded-lg text-sm font-medium transition-colors ${page === p
                                            ? 'bg-[#00458B]/10 text-[#00458B] border border-[#00458B]/30'
                                            : 'hover:bg-[#F7F9FB] text-[#5B6B7D] hover:text-[#0E2B5C]'
                                        }`}
                                >
                                    {p}
                                </button>
                            )
                        )}
                    </div>

                    {/* Next page */}
                    <button
                        onClick={() => onPageChange(page + 1)}
                        disabled={!canGoNext}
                        className="p-1.5 rounded-lg hover:bg-[#F7F9FB] disabled:opacity-30 disabled:cursor-not-allowed text-[#5B6B7D] hover:text-[#0E2B5C] transition-colors"
                        title="Next page"
                    >
                        <ChevronRight size={16} />
                    </button>

                    {/* Last page */}
                    <button
                        onClick={() => onPageChange(totalPages)}
                        disabled={!canGoNext}
                        className="p-1.5 rounded-lg hover:bg-[#F7F9FB] disabled:opacity-30 disabled:cursor-not-allowed text-[#5B6B7D] hover:text-[#0E2B5C] transition-colors"
                        title="Last page"
                    >
                        <ChevronsRight size={16} />
                    </button>
                </div>
            </div>
        </div>
    );
}
