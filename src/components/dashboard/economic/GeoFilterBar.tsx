'use client';

import { motion } from 'framer-motion';
import { MapPin, Building2, RefreshCw, ChevronDown } from 'lucide-react';
import clsx from 'clsx';
import { GeoState, GeoMetro } from '@/store/slices/economicSlice';

interface GeoFilterBarProps {
    states: GeoState[];
    metros: GeoMetro[];
    selectedState: string | null;
    selectedMetro: string | null;
    isGeoSyncing: boolean;
    onStateChange: (stateCode: string | null) => void;
    onMetroChange: (metroCode: string | null) => void;
    onSyncState: () => void;
}

const REGIONS: Record<string, string> = {
    Northeast: '#6366f1',
    South: '#f59e0b',
    Midwest: '#10b981',
    West: '#ef4444',
};

export function GeoFilterBar({
    states,
    metros,
    selectedState,
    selectedMetro,
    isGeoSyncing,
    onStateChange,
    onMetroChange,
    onSyncState,
}: GeoFilterBarProps) {
    // Group states by region
    const statesByRegion = states.reduce((acc, state) => {
        const region = state.region || 'Other';
        if (!acc[region]) acc[region] = [];
        acc[region].push(state);
        return acc;
    }, {} as Record<string, GeoState[]>);

    const selectedStateName = states.find(s => s.code === selectedState)?.name || null;
    const selectedMetroName = metros.find(m => m.metro_code === selectedMetro)?.metro_name || null;

    return (
        <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.1 }}
            className="bg-gradient-to-r from-white via-gray-50 to-white dark:from-gray-900/90 dark:via-gray-800/90 dark:to-gray-900/90 rounded-2xl p-5 border border-gray-200 dark:border-gray-700/50 shadow-xl backdrop-blur-sm"
        >
            <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-indigo-500/20 rounded-xl">
                    <MapPin className="w-5 h-5 text-indigo-400" />
                </div>
                <div>
                    <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Geographic Filter</h3>
                    <p className="text-xs text-gray-500">Compare data by state and metro area</p>
                </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
                {/* State Dropdown */}
                <div className="relative flex-1 min-w-[200px]">
                    <label className="text-xs text-gray-500 mb-1 block">State</label>
                    <div className="relative">
                        <select
                            value={selectedState || ''}
                            onChange={(e) => onStateChange(e.target.value || null)}
                            className="has-custom-chevron w-full bg-gray-100 dark:bg-gray-800/80 border border-gray-300 dark:border-gray-600/50 rounded-xl px-4 py-2.5 pr-10 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 transition-all cursor-pointer hover:border-gray-400 dark:hover:border-gray-500/70"
                        >
                            <option value="">All States (National)</option>
                            {Object.entries(statesByRegion).sort().map(([region, regionStates]) => (
                                <optgroup key={region} label={`── ${region} ──`}>
                                    {[...regionStates].sort((a, b) => a.name.localeCompare(b.name)).map(state => (
                                        <option key={state.code} value={state.code}>
                                            {state.name}
                                        </option>
                                    ))}
                                </optgroup>
                            ))}
                        </select>
                        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                    </div>
                </div>

                {/* Metro Dropdown */}
                <div className="relative flex-1 min-w-[200px]">
                    <label className="text-xs text-gray-500 mb-1 block">Metro Area</label>
                    <div className="relative">
                        <select
                            value={selectedMetro || ''}
                            onChange={(e) => onMetroChange(e.target.value || null)}
                            disabled={!selectedState || metros.length === 0}
                            className={clsx(
                                'has-custom-chevron w-full bg-gray-100 dark:bg-gray-800/80 border border-gray-300 dark:border-gray-600/50 rounded-xl px-4 py-2.5 pr-10 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 transition-all cursor-pointer hover:border-gray-400 dark:hover:border-gray-500/70',
                                (!selectedState || metros.length === 0) && 'opacity-50 cursor-not-allowed'
                            )}
                        >
                            <option value="">
                                {!selectedState ? 'Select a state first' : 'All Metros (State-wide)'}
                            </option>
                            {[...metros].sort((a, b) => a.metro_name.localeCompare(b.metro_name)).map(metro => (
                                <option key={metro.metro_code} value={metro.metro_code}>
                                    {metro.metro_name}
                                </option>
                            ))}
                        </select>
                        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                    </div>
                </div>

                {/* Sync Button */}
                <div className="flex flex-col justify-end">
                    <label className="text-xs text-gray-500 mb-1 block">&nbsp;</label>
                    <button
                        onClick={onSyncState}
                        disabled={!selectedState || isGeoSyncing}
                        className={clsx(
                            'flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium transition-all border',
                            selectedState
                                ? 'bg-indigo-500/20 text-indigo-400 hover:bg-indigo-500/30 border-indigo-500/30'
                                : 'bg-gray-100 dark:bg-gray-800/50 text-gray-500 border-gray-200 dark:border-gray-700/30 cursor-not-allowed',
                            'disabled:opacity-50 disabled:cursor-not-allowed'
                        )}
                    >
                        <RefreshCw className={clsx('w-4 h-4', isGeoSyncing && 'animate-spin')} />
                        {isGeoSyncing ? 'Syncing...' : 'Sync Data'}
                    </button>
                </div>
            </div>

            {/* Active Selection Badge */}
            {selectedState && (
                <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="mt-3 flex items-center gap-2 flex-wrap"
                >
                    <span className="text-xs text-gray-500">Viewing:</span>
                    <span className="px-3 py-1 bg-indigo-500/15 text-indigo-400 text-xs font-medium rounded-full border border-indigo-500/20">
                        <MapPin className="w-3 h-3 inline mr-1" />
                        {selectedStateName}
                    </span>
                    {selectedMetroName && (
                        <span className="px-3 py-1 bg-purple-500/15 text-purple-400 text-xs font-medium rounded-full border border-purple-500/20">
                            <Building2 className="w-3 h-3 inline mr-1" />
                            {selectedMetroName}
                        </span>
                    )}
                </motion.div>
            )}
        </motion.div>
    );
}
