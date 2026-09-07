'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { Database, RefreshCw, Settings2 } from 'lucide-react';
import { useAppDispatch, useAppSelector } from '@/hooks/useAppDispatch';
import {
    fetchPermitCities,
    selectAvailableCities,
} from '@/store/slices/permitsSlice';
import { CityDataSourceCard } from '@/components/permits';
import { apiService } from '@/services/api';
import { CitySyncStatus, PermitCityInfo } from '@/types';

// ─── adapter tab colours (shared with CitySyncPanel) ────────────────────────

const ADAPTER_COLORS: Record<string, { bg: string; text: string; activeBg: string; activeBorder: string }> = {
    all:     { bg: 'bg-white/[0.04]',  text: 'text-gray-300',    activeBg: 'bg-indigo-500/15',  activeBorder: 'border-indigo-500/40'  },
    socrata: { bg: 'bg-blue-500/8',    text: 'text-blue-400',    activeBg: 'bg-blue-500/15',    activeBorder: 'border-blue-500/40'    },
    arcgis:  { bg: 'bg-emerald-500/8', text: 'text-emerald-400', activeBg: 'bg-emerald-500/15', activeBorder: 'border-emerald-500/40' },
    ckan:    { bg: 'bg-amber-500/8',   text: 'text-amber-400',   activeBg: 'bg-amber-500/15',   activeBorder: 'border-amber-500/40'   },
    csv:     { bg: 'bg-purple-500/8',  text: 'text-purple-400',  activeBg: 'bg-purple-500/15',  activeBorder: 'border-purple-500/40'  },
    ods:     { bg: 'bg-pink-500/8',    text: 'text-pink-400',    activeBg: 'bg-pink-500/15',    activeBorder: 'border-pink-500/40'    },
};

// ─── page ────────────────────────────────────────────────────────────────────

export default function DataSourcesPage() {
    const dispatch = useAppDispatch();
    const cities = useAppSelector(selectAvailableCities);

    const [activeAdapter, setActiveAdapter] = useState('all');
    const [syncStatuses, setSyncStatuses]   = useState<Record<string, CitySyncStatus>>({});
    const [loadingStatuses, setLoadingStatuses] = useState(false);
    const [activeCardKey, setActiveCardKey] = useState<string | null>(null);
    const [importingCrosswalk, setImportingCrosswalk] = useState(false);
    const [crosswalkMsg, setCrosswalkMsg]   = useState<string | null>(null);
    const [liveTotal, setLiveTotal]         = useState<number | null>(null);

    // Load cities and live permit count on mount
    useEffect(() => {
        dispatch(fetchPermitCities());
        apiService.getTotalPermitCount().then(r => setLiveTotal(r.total)).catch(() => {});
    }, [dispatch]);

    // Open the first non-stale city once cities are loaded
    useEffect(() => {
        if (cities.length > 0 && activeCardKey === null) {
            const first = cities.find(c => !c.stale && !c.irrelevant) ?? cities[0];
            setActiveCardKey(first.key);
        }
    }, [cities, activeCardKey]);

    // Fetch sync statuses for all cities
    const fetchStatuses = useCallback(async (cityList: PermitCityInfo[]) => {
        if (cityList.length === 0) return;
        setLoadingStatuses(true);
        const results = await Promise.allSettled(
            cityList.map(c => apiService.getCitySyncStatus(c.key).then(s => ({ key: c.key, status: s })))
        );
        const map: Record<string, CitySyncStatus> = {};
        for (const r of results) {
            if (r.status === 'fulfilled') map[r.value.key] = r.value.status;
        }
        setSyncStatuses(map);
        setLoadingStatuses(false);
    }, []);

    useEffect(() => {
        if (cities.length > 0) fetchStatuses(cities);
    }, [cities, fetchStatuses]);

    // Adapter counts + unique adapter types
    const adapterCounts = useMemo(() => {
        const counts: Record<string, number> = { all: cities.length };
        cities.forEach(c => { counts[c.source] = (counts[c.source] || 0) + 1; });
        return counts;
    }, [cities]);

    const adapterTypes = useMemo(() => {
        const types = new Set(cities.map(c => c.source));
        return ['all', ...Array.from(types).sort()];
    }, [cities]);

    const filteredCities = useMemo(() => (
        activeAdapter === 'all' ? cities : cities.filter(c => c.source === activeAdapter)
    ), [cities, activeAdapter]);

    const handleStatusRefresh = useCallback((city: string, status: CitySyncStatus) => {
        setSyncStatuses(prev => ({ ...prev, [city]: status }));
    }, []);

    const handleImportCrosswalk = async () => {
        setImportingCrosswalk(true);
        setCrosswalkMsg(null);
        try {
            const r = await apiService.importZipCrosswalk();
            setCrosswalkMsg(r.message);
        } catch (err: unknown) {
            const detail = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
            setCrosswalkMsg(detail ? `Import failed: ${detail}` : 'Import failed — check server logs for details');
        } finally {
            setImportingCrosswalk(false);
        }
    };

    // Summary stats — use live DB count so this matches the Permits page
    const totalRecords = liveTotal;
    const activeCities = useMemo(
        () => cities.filter(c => !c.stale && !c.irrelevant).length,
        [cities]
    );
    const lastSyncTimes = Object.values(syncStatuses)
        .map(s => s.last_sync_at)
        .filter(Boolean) as string[];
    const mostRecentSync = lastSyncTimes.length
        ? new Date(Math.max(...lastSyncTimes.map(t => new Date(t).getTime()))).toLocaleDateString('en-US', {
            month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
          })
        : 'Never';

    return (
        <div className="p-6 space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between flex-wrap gap-3">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
                            <Database size={20} className="text-white" />
                        </div>
                        Data Sources
                    </h1>
                    <p className="text-gray-500 mt-1 text-sm">
                        Manage city data feeds, sync permit records, and monitor data quality
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={handleImportCrosswalk}
                        disabled={importingCrosswalk}
                        title="Import ZIP → County crosswalk from Census Bureau"
                        className="flex items-center gap-2 px-3 py-2 bg-black/4 dark:bg-white/5 hover:bg-black/5 dark:hover:bg-white/8 border border-gray-200 dark:border-white/10 rounded-lg text-gray-600 dark:text-gray-300 text-sm transition-colors disabled:opacity-50"
                    >
                        {importingCrosswalk
                            ? <RefreshCw size={14} className="animate-spin" />
                            : <Settings2 size={14} />}
                        {importingCrosswalk ? 'Importing…' : 'Import ZIP Crosswalk'}
                    </button>
                    <button
                        onClick={() => fetchStatuses(cities)}
                        disabled={loadingStatuses}
                        className="flex items-center gap-2 px-3 py-2 bg-black/4 dark:bg-white/5 hover:bg-black/5 dark:hover:bg-white/8 border border-gray-200 dark:border-white/10 rounded-lg text-gray-600 dark:text-gray-300 text-sm transition-colors disabled:opacity-50"
                    >
                        <RefreshCw size={14} className={loadingStatuses ? 'animate-spin' : ''} />
                        Refresh All
                    </button>
                </div>
            </div>

            {/* Crosswalk status message */}
            {crosswalkMsg && (
                <div className="px-4 py-2 bg-indigo-500/10 border border-indigo-500/20 rounded-lg text-indigo-400 text-sm">
                    {crosswalkMsg}
                </div>
            )}

            {/* Summary chips */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <SummaryChip label="Total Cities" value={cities.length.toString()} />
                <SummaryChip label="Active Sources" value={activeCities.toString()} />
                <SummaryChip label="Total Records" value={totalRecords != null ? totalRecords.toLocaleString() : '—'} />
                <SummaryChip label="Last Sync" value={mostRecentSync} small />
            </div>

            {/* Adapter filter tabs */}
            <div className="flex items-center gap-2 flex-wrap">
                {adapterTypes.map(adapter => {
                    const isActive = activeAdapter === adapter;
                    const colors = ADAPTER_COLORS[adapter] ?? ADAPTER_COLORS.all;
                    const count = adapterCounts[adapter] ?? 0;
                    return (
                        <button
                            key={adapter}
                            onClick={() => setActiveAdapter(adapter)}
                            className={`
                                inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium
                                border transition-all duration-150
                                ${isActive
                                    ? `${colors.activeBg} ${colors.text} ${colors.activeBorder}`
                                    : `${colors.bg} ${colors.text} border-transparent hover:border-white/10`}
                            `}
                        >
                            {adapter === 'all' ? 'All Sources' : adapter.toUpperCase()}
                            <span className={`
                                inline-flex items-center justify-center min-w-5 h-5 px-1 rounded-full text-[10px] font-semibold
                                ${isActive ? 'bg-white/10' : 'bg-white/5'}
                            `}>
                                {count}
                            </span>
                        </button>
                    );
                })}
            </div>

            {/* City card list (accordion) */}
            {filteredCities.length === 0 ? (
                <div className="text-center py-16 text-gray-500 text-sm">
                    {cities.length === 0 ? 'Loading cities…' : `No cities found for ${activeAdapter.toUpperCase()}`}
                </div>
            ) : (
                <div className="space-y-2">
                    {filteredCities.map(city => (
                        <CityDataSourceCard
                            key={city.key}
                            city={city}
                            syncStatus={syncStatuses[city.key]}
                            isExpanded={activeCardKey === city.key}
                            onToggle={() => setActiveCardKey(prev => prev === city.key ? null : city.key)}
                            onSyncComplete={() => fetchStatuses(cities)}
                            onStatusRefresh={status => handleStatusRefresh(city.key, status)}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}

// ─── summary chip ─────────────────────────────────────────────────────────────

function SummaryChip({ label, value, small }: { label: string; value: string; small?: boolean }) {
    return (
        <div className="bg-black/2 dark:bg-white/3 border border-gray-200 dark:border-white/8 rounded-xl p-4">
            <p className={`font-bold text-gray-900 dark:text-white ${small ? 'text-base' : 'text-2xl'}`}>
                {value}
            </p>
            <p className="text-xs text-gray-500 mt-0.5">{label}</p>
        </div>
    );
}
