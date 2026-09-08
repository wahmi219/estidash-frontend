'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { Database, RefreshCw, Settings2 } from 'lucide-react';
import { useAppDispatch, useAppSelector } from '@/hooks/useAppDispatch';
import {
    fetchPermitCities,
    selectAvailableCities,
} from '@/store/slices/permitsSlice';
import { CityDataSourceCard } from '@/components/permits';
import PageHeader from '@/components/common/PageHeader';
import { apiService } from '@/services/api';
import { CitySyncStatus, PermitCityInfo } from '@/types';

// ─── adapter tab colours (shared with CitySyncPanel) ────────────────────────
// Restrained Estimation Hub palette — blue / green / amber / gray only.
// No purple/pink/cyan-neon; "ods" reuses a second blue tone since only four
// hue families are allowed for five source types.

const ADAPTER_COLORS: Record<string, { bg: string; text: string; activeBg: string; activeBorder: string }> = {
    all:     { bg: 'bg-white',      text: 'text-[#5B6B7D]',  activeBg: 'bg-[#00458B]/10', activeBorder: 'border-[#00458B]/40' },
    socrata: { bg: 'bg-blue-50',    text: 'text-blue-700',    activeBg: 'bg-blue-100',     activeBorder: 'border-blue-400'     },
    arcgis:  { bg: 'bg-emerald-50', text: 'text-emerald-700', activeBg: 'bg-emerald-100',  activeBorder: 'border-emerald-400'  },
    ckan:    { bg: 'bg-amber-50',   text: 'text-amber-700',   activeBg: 'bg-amber-100',    activeBorder: 'border-amber-400'    },
    csv:     { bg: 'bg-gray-100',   text: 'text-[#5B6B7D]',   activeBg: 'bg-gray-200',     activeBorder: 'border-gray-400'     },
    ods:     { bg: 'bg-blue-50',    text: 'text-blue-800',    activeBg: 'bg-blue-100',     activeBorder: 'border-blue-500'     },
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
        <div className="p-6 lg:p-8 space-y-6">
            <PageHeader
                icon={Database}
                title="Data Sources"
                subtitle="Manage city data feeds, sync permit records, and monitor data quality"
                actions={
                    <>
                        <button
                            onClick={handleImportCrosswalk}
                            disabled={importingCrosswalk}
                            title="Import ZIP → County crosswalk from Census Bureau"
                            className="flex items-center gap-2 px-3 py-2 bg-white hover:bg-[#F7F9FB] border border-[#DFE6EE] rounded-lg text-[#5B6B7D] hover:text-[#0E2B5C] text-sm transition-colors disabled:opacity-50"
                        >
                            {importingCrosswalk
                                ? <RefreshCw size={14} className="animate-spin" />
                                : <Settings2 size={14} />}
                            {importingCrosswalk ? 'Importing…' : 'Import ZIP Crosswalk'}
                        </button>
                        <button
                            onClick={() => fetchStatuses(cities)}
                            disabled={loadingStatuses}
                            className="flex items-center gap-2 px-3 py-2 bg-white hover:bg-[#F7F9FB] border border-[#DFE6EE] rounded-lg text-[#5B6B7D] hover:text-[#0E2B5C] text-sm transition-colors disabled:opacity-50"
                        >
                            <RefreshCw size={14} className={loadingStatuses ? 'animate-spin' : ''} />
                            Refresh All
                        </button>
                    </>
                }
            />

            {/* Crosswalk status message */}
            {crosswalkMsg && (
                <div className="px-4 py-2 bg-[#00458B]/5 border border-[#00458B]/20 rounded-lg text-[#00458B] text-sm">
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
                                    : `${colors.bg} ${colors.text} border-transparent hover:border-[#DFE6EE]`}
                            `}
                        >
                            {adapter === 'all' ? 'All Sources' : adapter.toUpperCase()}
                            <span className={`
                                inline-flex items-center justify-center min-w-5 h-5 px-1 rounded-full text-[10px] font-semibold
                                ${isActive ? 'bg-black/10' : 'bg-black/5'}
                            `}>
                                {count}
                            </span>
                        </button>
                    );
                })}
            </div>

            {/* City card list (accordion) */}
            {filteredCities.length === 0 ? (
                <div className="text-center py-16 text-[#5B6B7D] text-sm">
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
        <div className="bg-white border border-[#DFE6EE] rounded-lg p-4">
            <p className={`font-bold text-[#0E2B5C] ${small ? 'text-base' : 'text-2xl'}`}>
                {value}
            </p>
            <p className="text-xs text-[#5B6B7D] mt-0.5">{label}</p>
        </div>
    );
}
