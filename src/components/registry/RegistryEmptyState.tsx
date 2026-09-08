'use client';

import React from 'react';
import { ShieldOff, RefreshCw } from 'lucide-react';

interface RegistryEmptyStateProps {
    hasFilters?: boolean;
    onResetFilters?: () => void;
}

export default function RegistryEmptyState({ hasFilters = false, onResetFilters }: RegistryEmptyStateProps) {
    return (
        <div className="flex flex-col items-center justify-center py-16 px-4">
            <div className="w-16 h-16 rounded-full bg-[#F7F9FB] border border-[#DFE6EE] flex items-center justify-center mb-4">
                <ShieldOff size={32} className="text-[#5B6B7D]" />
            </div>
            <h3 className="text-lg font-medium text-[#0E2B5C] mb-2">
                No registry records found
            </h3>
            <p className="text-[#5B6B7D] text-center max-w-md mb-6">
                {hasFilters
                    ? 'No records match your current filters. Try adjusting your search criteria or reset filters.'
                    : 'No records have been synced for this registry source yet.'}
            </p>
            {hasFilters && onResetFilters && (
                <button
                    onClick={onResetFilters}
                    className="flex items-center gap-2 px-4 py-2 bg-white hover:bg-[#F7F9FB] border border-[#DFE6EE] rounded-lg text-[#5B6B7D] hover:text-[#0E2B5C] transition-colors"
                >
                    <RefreshCw size={16} />
                    Reset Filters
                </button>
            )}
        </div>
    );
}
