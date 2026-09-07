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
            <div className="w-16 h-16 rounded-full bg-gray-100 dark:bg-white/[0.03] flex items-center justify-center mb-4">
                <ShieldOff size={32} className="text-gray-500" />
            </div>
            <h3 className="text-lg font-medium text-gray-700 dark:text-gray-300 mb-2">
                No registry records found
            </h3>
            <p className="text-gray-500 text-center max-w-md mb-6">
                {hasFilters
                    ? 'No records match your current filters. Try adjusting your search criteria or reset filters.'
                    : 'No records have been synced for this registry source yet.'}
            </p>
            {hasFilters && onResetFilters && (
                <button
                    onClick={onResetFilters}
                    className="flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-white/[0.05] hover:bg-gray-200 dark:hover:bg-white/[0.08] border border-gray-200 dark:border-white/[0.1] rounded-lg text-gray-700 dark:text-gray-300 transition-colors"
                >
                    <RefreshCw size={16} />
                    Reset Filters
                </button>
            )}
        </div>
    );
}
