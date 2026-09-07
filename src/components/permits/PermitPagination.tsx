'use client';

import React from 'react';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';
import { PermitPagination as PaginationType } from '@/types';

interface PermitPaginationProps {
    pagination: PaginationType;
    onPageChange: (page: number) => void;
    onPageSizeChange: (size: number) => void;
}

const PAGE_SIZES = [10, 25, 50, 100, 500, 1000, 2000];

export default function PermitPagination({
    pagination,
    onPageChange,
    onPageSizeChange,
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
            <div className="text-sm text-gray-500 dark:text-gray-500">
                Showing <span className="text-gray-800 dark:text-gray-300">{startRecord.toLocaleString()}</span> to{' '}
                <span className="text-gray-800 dark:text-gray-300">{endRecord.toLocaleString()}</span> of{' '}
                <span className="text-gray-800 dark:text-gray-300">{totalLabel}</span> permits
            </div>

            <div className="flex items-center gap-4">
                {/* Page size selector */}
                <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-500">Show</span>
                    <select
                        value={pageSize}
                        onChange={(e) => onPageSizeChange(Number(e.target.value))}
                        className="px-2 py-1 bg-white dark:bg-white/3 border border-gray-300 dark:border-white/8 rounded-lg text-gray-900 dark:text-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/40 transition-colors"
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
                        className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-white/5 disabled:opacity-30 disabled:cursor-not-allowed text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 transition-colors"
                        title="First page"
                    >
                        <ChevronsLeft size={16} />
                    </button>

                    {/* Previous page */}
                    <button
                        onClick={() => onPageChange(page - 1)}
                        disabled={!canGoPrev}
                        className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-white/5 disabled:opacity-30 disabled:cursor-not-allowed text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 transition-colors"
                        title="Previous page"
                    >
                        <ChevronLeft size={16} />
                    </button>

                    {/* Page numbers */}
                    <div className="flex items-center gap-1 mx-1">
                        {getPageNumbers().map((p, idx) =>
                            p === 'ellipsis' ? (
                                <span key={`ellipsis-${idx}`} className="px-2 text-gray-500">
                                    ...
                                </span>
                            ) : (
                                <button
                                    key={p}
                                    onClick={() => onPageChange(p)}
                                    className={`min-w-[32px] h-8 px-2 rounded-lg text-sm font-medium transition-colors ${page === p
                                            ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'
                                            : 'hover:bg-gray-100 dark:hover:bg-white/5 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
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
                        className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-white/5 disabled:opacity-30 disabled:cursor-not-allowed text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 transition-colors"
                        title="Next page"
                    >
                        <ChevronRight size={16} />
                    </button>

                    {/* Last page */}
                    <button
                        onClick={() => onPageChange(totalPages)}
                        disabled={!canGoNext}
                        className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-white/5 disabled:opacity-30 disabled:cursor-not-allowed text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 transition-colors"
                        title="Last page"
                    >
                        <ChevronsRight size={16} />
                    </button>
                </div>
            </div>
        </div>
    );
}
