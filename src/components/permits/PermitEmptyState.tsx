'use client';

import React from 'react';
import { FileX, RefreshCw } from 'lucide-react';

interface PermitEmptyStateProps {
    hasFilters?: boolean;
    onResetFilters?: () => void;
}

export default function PermitEmptyState({ hasFilters = false, onResetFilters }: PermitEmptyStateProps) {
    return (
        <div className="flex flex-col items-center justify-center py-16 px-4">
            <div className="w-16 h-16 rounded-full bg-[#F7F9FB] border border-[#DFE6EE] flex items-center justify-center mb-4">
                <FileX size={32} className="text-[#5B6B7D]" />
            </div>
            <h3 className="text-lg font-medium text-[#0E2B5C] mb-2">
                No permits found
            </h3>
            <p className="text-[#5B6B7D] text-center max-w-md mb-6">
                {hasFilters
                    ? 'No permits match your current filters. Try adjusting your search criteria or reset filters.'
                    : 'There are no permit records in the database yet. Sync data from a city to get started.'}
            </p>
            {hasFilters && onResetFilters && (
                <button
                    onClick={onResetFilters}
                    className="flex items-center gap-2 px-4 py-2 bg-white hover:bg-[#F7F9FB] border border-[#DFE6EE] rounded-lg text-[#0E2B5C] transition-colors"
                >
                    <RefreshCw size={16} />
                    Reset Filters
                </button>
            )}
        </div>
    );
}
