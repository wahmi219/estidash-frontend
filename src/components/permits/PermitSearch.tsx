'use client';

import React from 'react';
import { Search, X } from 'lucide-react';

interface PermitSearchProps {
    value: string;
    onChange: (value: string) => void;
    onClear: () => void;
    placeholder?: string;
}

export default function PermitSearch({
    value,
    onChange,
    onClear,
    placeholder = 'Search permits...',
}: PermitSearchProps) {
    return (
        <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#5B6B7D]" />
            <input
                type="text"
                value={value}
                onChange={(e) => onChange(e.target.value)}
                placeholder={placeholder}
                className="w-full pl-9 pr-9 py-2 bg-white border border-[#DFE6EE] rounded-lg text-[#0E2B5C] placeholder-[#5B6B7D] focus:outline-none focus:ring-2 focus:ring-[#00458B]/25 focus:border-[#00458B] transition-colors"
            />
            {value && (
                <button
                    onClick={onClear}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#5B6B7D] hover:text-[#0E2B5C] transition-colors"
                >
                    <X size={14} />
                </button>
            )}
        </div>
    );
}
