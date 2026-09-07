'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { RefreshCw, Database, CheckCircle, AlertCircle, Loader2, ChevronDown, ChevronUp, Trash2 } from 'lucide-react';
import { apiService } from '@/services/api';
import { PermitCityInfo, CitySyncStatus, DeleteCityResponse } from '@/types';

interface CitySyncPanelProps {
    cities: PermitCityInfo[];
    onSyncComplete?: () => void;
}

interface CityWithStatus extends PermitCityInfo {
    syncStatus?: CitySyncStatus;
    isSyncing?: boolean;
    isDeleting?: boolean;
    syncError?: string;
    deleteResult?: DeleteCityResponse | null;
}

const ADAPTER_COLORS: Record<string, { bg: string; text: string; activeBg: string; activeBorder: string }> = {
    all:     { bg: 'bg-white/[0.04]', text: 'text-gray-300', activeBg: 'bg-indigo-500/15', activeBorder: 'border-indigo-500/40' },
    socrata: { bg: 'bg-blue-500/8', text: 'text-blue-400', activeBg: 'bg-blue-500/15', activeBorder: 'border-blue-500/40' },
    arcgis:  { bg: 'bg-emerald-500/8', text: 'text-emerald-400', activeBg: 'bg-emerald-500/15', activeBorder: 'border-emerald-500/40' },
    ckan:    { bg: 'bg-amber-500/8', text: 'text-amber-400', activeBg: 'bg-amber-500/15', activeBorder: 'border-amber-500/40' },
    csv:     { bg: 'bg-purple-500/8', text: 'text-purple-400', activeBg: 'bg-purple-500/15', activeBorder: 'border-purple-500/40' },
};

export function CitySyncPanel({ cities, onSyncComplete }: CitySyncPanelProps) {
    const [cityStatuses, setCityStatuses] = useState<CityWithStatus[]>([]);
    const [isLoadingStatuses, setIsLoadingStatuses] = useState(false);
    const [isCollapsed, setIsCollapsed] = useState(true);
    const [recordLimits, setRecordLimits] = useState<Record<string, number>>({});
    const [fetchAll, setFetchAll] = useState<Record<string, boolean>>({});
    const [cityDateRanges, setCityDateRanges] = useState<Record<string, { startDate: string; endDate: string }>>({});
    const [confirmDeleteCity, setConfirmDeleteCity] = useState<string | null>(null);
    const [activeAdapter, setActiveAdapter] = useState<string>('all');

    const DEFAULT_LIMIT = 1000;

    // Compute adapter counts
    const adapterCounts = useMemo(() => {
        const counts: Record<string, number> = { all: cities.length };
        cities.forEach((city) => {
            counts[city.source] = (counts[city.source] || 0) + 1;
        });
        return counts;
    }, [cities]);

    // Get unique adapter types present in cities
    const adapterTypes = useMemo(() => {
        const types = new Set(cities.map((c) => c.source));
        return ['all', ...Array.from(types).sort()];
    }, [cities]);

    // Filter cities by selected adapter
    const filteredCityStatuses = useMemo(() => {
        if (activeAdapter === 'all') return cityStatuses;
        return cityStatuses.filter((c) => c.source === activeAdapter);
    }, [cityStatuses, activeAdapter]);

    const fetchAllStatuses = useCallback(async () => {
        if (cities.length === 0) return;

        setIsLoadingStatuses(true);
        const updatedCities: CityWithStatus[] = await Promise.all(
            cities.map(async (city) => {
                try {
                    const status = await apiService.getCitySyncStatus(city.key);
                    return { ...city, syncStatus: status };
                } catch {
                    return { ...city };
                }
            })
        );
        setCityStatuses(updatedCities);
        setIsLoadingStatuses(false);
    }, [cities]);

    useEffect(() => {
        fetchAllStatuses();
    }, [fetchAllStatuses]);

    /** Returns { startDate, endDate } strings for a rolling 3-month window ending today. */
    const getThreeMonthWindow = () => {
        const today = new Date();
        const start = new Date(today);
        start.setMonth(start.getMonth() - 3);
        // Clamp to valid day (e.g. May 31 → Feb 28)
        if (start.getMonth() !== ((today.getMonth() - 3 + 12) % 12)) {
            start.setDate(0); // last day of the previous month
        }
        const fmt = (d: Date) => d.toISOString().split('T')[0];
        return { startDate: fmt(start), endDate: fmt(today) };
    };

    const handleDateChange = (cityKey: string, field: 'startDate' | 'endDate', value: string) => {
        setCityDateRanges(prev => ({
            ...prev,
            [cityKey]: { ...(prev[cityKey] || getThreeMonthWindow()), [field]: value },
        }));
    };

    const getCityDateRange = (cityKey: string) => {
        return cityDateRanges[cityKey] || getThreeMonthWindow();
    };

    const handleSync = async (cityKey: string) => {
        setCityStatuses(prev =>
            prev.map(c =>
                c.key === cityKey
                    ? { ...c, isSyncing: true, syncError: undefined }
                    : c
            )
        );

        try {
            const limit = fetchAll[cityKey] ? undefined : (recordLimits[cityKey] || DEFAULT_LIMIT);
            const { startDate, endDate } = getCityDateRange(cityKey);

            // Snapshot the current latest_sync started_at BEFORE triggering.
            // The poll will detect a new sync when started_at changes — completely
            // immune to clock skew and stale "running" logs from previous attempts.
            let baselineStartedAt: string | undefined;
            try {
                const before = await apiService.getCitySyncStatus(cityKey);
                baselineStartedAt = (before.latest_sync as Record<string, unknown> | undefined)
                    ?.started_at as string | undefined;
            } catch {
                // City has never been synced — baseline stays undefined
            }

            // Fire async — returns immediately with status "started"
            await apiService.syncPermits(cityKey, true, limit, startDate, endDate);

            // CSV cities (e.g. San Diego) download 150K+ records from large files —
            // they routinely take 30-50 min; give them 90 minutes before giving up.
            const citySource = cityStatuses.find(c => c.key === cityKey)?.source;
            const MAX_WAIT_MS = citySource === 'csv' ? 90 * 60 * 1000 : 20 * 60 * 1000;
            const POLL_MS = 3000;
            const deadline = Date.now() + MAX_WAIT_MS;

            await new Promise<void>((resolve, reject) => {
                const poll = async () => {
                    if (Date.now() > deadline) {
                        const timeoutMins = citySource === 'csv' ? 90 : 20;
                        reject(new Error(`Sync timed out after ${timeoutMins} minutes`));
                        return;
                    }
                    try {
                        const status = await apiService.getCitySyncStatus(cityKey);
                        const latestSync = status.latest_sync as Record<string, unknown> | undefined;
                        const syncStatus = latestSync?.status as string | undefined;
                        const syncStartedAt = latestSync?.started_at as string | undefined;

                        // A new sync log has appeared when started_at differs from baseline
                        const isNewSync = syncStartedAt !== undefined &&
                            syncStartedAt !== baselineStartedAt;

                        if (isNewSync && syncStatus === 'success') {
                            setCityStatuses(prev =>
                                prev.map(c => c.key === cityKey ? { ...c, syncStatus: status, isSyncing: false } : c)
                            );
                            onSyncComplete?.();
                            resolve();
                        } else if (isNewSync && syncStatus === 'failed') {
                            const errorMsg = (latestSync?.error_message as string | undefined)
                                || 'Sync failed — check server logs';
                            setCityStatuses(prev =>
                                prev.map(c => c.key === cityKey ? { ...c, syncStatus: status, isSyncing: false, syncError: errorMsg } : c)
                            );
                            reject(new Error(errorMsg));
                        } else {
                            // Still running or log not yet created — keep polling
                            setTimeout(poll, POLL_MS);
                        }
                    } catch (pollErr) {
                        // Status fetch failed — keep trying until deadline
                        setTimeout(poll, POLL_MS);
                    }
                };
                // Small delay to let the background job create its log entry
                setTimeout(poll, 1000);
            });

        } catch (error) {
            const errorMsg = error instanceof Error ? error.message : 'Sync failed';
            setCityStatuses(prev =>
                prev.map(c =>
                    c.key === cityKey
                        ? { ...c, isSyncing: false, syncError: errorMsg }
                        : c
                )
            );
        }
    };

    const handleDeleteClick = async (cityKey: string) => {
        if (confirmDeleteCity !== cityKey) {
            // First click - dry run to show what will be deleted
            setCityStatuses(prev =>
                prev.map(c =>
                    c.key === cityKey
                        ? { ...c, isDeleting: true, syncError: undefined, deleteResult: null }
                        : c
                )
            );
            try {
                const result = await apiService.deleteCityPermits(cityKey, false);
                setCityStatuses(prev =>
                    prev.map(c =>
                        c.key === cityKey
                            ? { ...c, isDeleting: false, deleteResult: result }
                            : c
                    )
                );
                setConfirmDeleteCity(cityKey);
            } catch (error) {
                const errorMsg = error instanceof Error ? error.message : 'Delete check failed';
                setCityStatuses(prev =>
                    prev.map(c =>
                        c.key === cityKey
                            ? { ...c, isDeleting: false, syncError: errorMsg }
                            : c
                    )
                );
            }
            return;
        }

        // Second click - confirmed delete
        setCityStatuses(prev =>
            prev.map(c =>
                c.key === cityKey
                    ? { ...c, isDeleting: true, syncError: undefined }
                    : c
            )
        );

        try {
            await apiService.deleteCityPermits(cityKey, true);

            // Refresh status after delete
            let newStatus: CitySyncStatus | undefined;
            try {
                newStatus = await apiService.getCitySyncStatus(cityKey);
            } catch {
                // Status may 404 after delete - that's fine
            }

            setCityStatuses(prev =>
                prev.map(c =>
                    c.key === cityKey
                        ? {
                            ...c,
                            isDeleting: false,
                            deleteResult: null,
                            syncStatus: newStatus || { city: cityKey, last_sync_at: null, last_sync_status: null, total_records: 0 },
                        }
                        : c
                )
            );
            setConfirmDeleteCity(null);
            onSyncComplete?.();
        } catch (error) {
            const errorMsg = error instanceof Error ? error.message : 'Delete failed';
            setCityStatuses(prev =>
                prev.map(c =>
                    c.key === cityKey
                        ? { ...c, isDeleting: false, syncError: errorMsg }
                        : c
                )
            );
            setConfirmDeleteCity(null);
        }
    };

    const handleCancelDelete = (cityKey: string) => {
        setConfirmDeleteCity(null);
        setCityStatuses(prev =>
            prev.map(c =>
                c.key === cityKey ? { ...c, deleteResult: null } : c
            )
        );
    };

    const handleLimitChange = (cityKey: string, value: string) => {
        const numValue = parseInt(value) || DEFAULT_LIMIT;
        setRecordLimits(prev => ({ ...prev, [cityKey]: Math.min(Math.max(numValue, 100), 10000) }));
    };

    const formatDate = (dateStr: string | null) => {
        if (!dateStr) return 'Never';
        const date = new Date(dateStr);
        return date.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    const getStatusColor = (status: string | null) => {
        if (!status) return 'text-gray-400';
        if (status === 'success') return 'text-green-400';
        if (status === 'failed') return 'text-red-400';
        if (status === 'running') return 'text-yellow-400';
        return 'text-gray-400';
    };

    if (cities.length === 0) return null;

    return (
        <div className="bg-gray-800/50 rounded-xl border border-gray-700 overflow-hidden mb-6">
            {/* Collapsible Header */}
            <button
                onClick={() => setIsCollapsed(!isCollapsed)}
                className="w-full flex items-center justify-between p-4 hover:bg-gray-700/30 transition-colors"
            >
                <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                    <Database className="w-5 h-5 text-indigo-400" />
                    City Data Sources
                    <span className="text-sm font-normal text-gray-400">({cities.length})</span>
                </h3>
                <div className="flex items-center gap-3">
                    {!isCollapsed && (
                        <span
                            onClick={(e) => { e.stopPropagation(); fetchAllStatuses(); }}
                            className="text-sm text-gray-400 hover:text-white flex items-center gap-1"
                        >
                            <RefreshCw className={`w-4 h-4 ${isLoadingStatuses ? 'animate-spin' : ''}`} />
                        </span>
                    )}
                    {isCollapsed ? <ChevronDown className="w-5 h-5 text-gray-400" /> : <ChevronUp className="w-5 h-5 text-gray-400" />}
                </div>
            </button>

            {/* Content */}
            {!isCollapsed && (
                <div className="p-4 pt-0">
                    {/* Adapter Filter Tabs */}
                    <div className="flex items-center gap-2 mb-4 flex-wrap">
                        {adapterTypes.map((adapter) => {
                            const isActive = activeAdapter === adapter;
                            const colors = ADAPTER_COLORS[adapter] || ADAPTER_COLORS.all;
                            const count = adapterCounts[adapter] || 0;
                            return (
                                <button
                                    key={adapter}
                                    onClick={() => setActiveAdapter(adapter)}
                                    className={`
                                        inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium
                                        border transition-all duration-150
                                        ${isActive
                                            ? `${colors.activeBg} ${colors.text} ${colors.activeBorder}`
                                            : `${colors.bg} ${colors.text} border-transparent hover:border-white/10`
                                        }
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

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {filteredCityStatuses.map((city) => (
                            <div key={city.key} className="bg-gray-900/50 rounded-lg border border-gray-700 p-4">
                                <div className="mb-3 flex items-start justify-between">
                                    <div>
                                        <h4 className="font-medium text-white">{city.name}</h4>
                                        <p className="text-xs text-gray-500">{city.domain || city.source.toUpperCase()}</p>
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                        {city.stale && (
                                            <span className="text-[10px] px-1.5 py-0.5 rounded font-medium bg-yellow-500/15 text-yellow-400" title="This data source is no longer updated">
                                                STALE
                                            </span>
                                        )}
                                        {city.irrelevant && (
                                            <span className="text-[10px] px-1.5 py-0.5 rounded font-medium bg-gray-500/20 text-gray-400" title="Not construction-relevant — sync disabled">
                                                IRRELEVANT
                                            </span>
                                        )}
                                        <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
                                            city.source === 'arcgis' ? 'bg-emerald-500/15 text-emerald-400' :
                                            city.source === 'ckan' ? 'bg-amber-500/15 text-amber-400' :
                                            city.source === 'csv' ? 'bg-purple-500/15 text-purple-400' :
                                            'bg-blue-500/15 text-blue-400'
                                        }`}>
                                            {city.source.toUpperCase()}
                                        </span>
                                    </div>
                                </div>

                                {city.syncError && (
                                    <div className="mb-3 p-2 bg-red-500/10 border border-red-500/20 rounded text-red-400 text-xs">
                                        {city.syncError}
                                    </div>
                                )}

                                {/* Delete confirmation banner */}
                                {city.deleteResult && confirmDeleteCity === city.key && (
                                    <div className="mb-3 p-2 bg-amber-500/10 border border-amber-500/20 rounded text-xs">
                                        <p className="text-amber-300 font-medium mb-1">Confirm deletion:</p>
                                        <p className="text-amber-400/80">
                                            {city.deleteResult.agencies?.map(a =>
                                                `${a.permit_count.toLocaleString()} permits`
                                            ).join(', ') || 'No records found'}
                                        </p>
                                        <div className="flex gap-2 mt-2">
                                            <button
                                                onClick={() => handleDeleteClick(city.key)}
                                                disabled={city.isDeleting}
                                                className="px-2 py-1 bg-red-600 hover:bg-red-500 text-white rounded text-xs font-medium flex items-center gap-1"
                                            >
                                                {city.isDeleting ? (
                                                    <Loader2 className="w-3 h-3 animate-spin" />
                                                ) : (
                                                    <Trash2 className="w-3 h-3" />
                                                )}
                                                Yes, Delete All
                                            </button>
                                            <button
                                                onClick={() => handleCancelDelete(city.key)}
                                                className="px-2 py-1 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded text-xs"
                                            >
                                                Cancel
                                            </button>
                                        </div>
                                    </div>
                                )}

                                <div className="space-y-2 text-sm mb-4">
                                    <div className="flex items-center justify-between">
                                        <span className="text-gray-400">Records</span>
                                        <span className="text-white font-medium">
                                            {city.syncStatus?.total_records?.toLocaleString() ?? '—'}
                                        </span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span className="text-gray-400">Last Sync</span>
                                        <span className="text-gray-300 text-xs">
                                            {formatDate(city.syncStatus?.last_sync_at ?? null)}
                                        </span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span className="text-gray-400">Status</span>
                                        <span className={`flex items-center gap-1 ${getStatusColor(city.syncStatus?.last_sync_status ?? null)}`}>
                                            {city.syncStatus?.last_sync_status === 'success' && <CheckCircle className="w-3 h-3" />}
                                            {city.syncStatus?.last_sync_status === 'failed' && <AlertCircle className="w-3 h-3" />}
                                            {city.syncStatus?.last_sync_status ?? '—'}
                                        </span>
                                    </div>
                                </div>

                                {/* Date Range — hidden for stale/irrelevant cities */}
                                {!city.stale && !city.irrelevant && (
                                    <div className="grid grid-cols-2 gap-2 mb-2">
                                        <div>
                                            <label className="block text-[10px] text-gray-500 mb-1">From</label>
                                            <input
                                                type="date"
                                                value={getCityDateRange(city.key).startDate}
                                                onChange={(e) => handleDateChange(city.key, 'startDate', e.target.value)}
                                                className="w-full px-2 py-1.5 bg-gray-800 border border-gray-600 rounded text-xs text-white"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-[10px] text-gray-500 mb-1">To</label>
                                            <input
                                                type="date"
                                                value={getCityDateRange(city.key).endDate}
                                                onChange={(e) => handleDateChange(city.key, 'endDate', e.target.value)}
                                                className="w-full px-2 py-1.5 bg-gray-800 border border-gray-600 rounded text-xs text-white"
                                            />
                                        </div>
                                    </div>
                                )}

                                {/* Sync Controls */}
                                {city.stale ? (
                                    <div className="flex items-center gap-2 px-2 py-2 bg-yellow-500/8 border border-yellow-500/20 rounded text-xs text-yellow-400/80">
                                        <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                                        Data source no longer updated — sync unavailable
                                    </div>
                                ) : city.irrelevant ? (
                                    <div className="flex items-center gap-2 px-2 py-2 bg-gray-500/10 border border-gray-500/20 rounded text-xs text-gray-500">
                                        <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                                        Not construction-relevant — sync disabled
                                    </div>
                                ) : (
                                    <>
                                        <div className="flex items-center gap-2 mb-2">
                                            <label className="flex items-center gap-1.5 cursor-pointer select-none">
                                                <input
                                                    type="checkbox"
                                                    checked={!!fetchAll[city.key]}
                                                    onChange={(e) => setFetchAll(prev => ({ ...prev, [city.key]: e.target.checked }))}
                                                    className="w-3.5 h-3.5 accent-indigo-500"
                                                />
                                                <span className="text-xs text-gray-400">Fetch All</span>
                                            </label>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <input
                                                type="number"
                                                placeholder="1000"
                                                min={100}
                                                max={10000}
                                                disabled={!!fetchAll[city.key]}
                                                value={fetchAll[city.key] ? '' : (recordLimits[city.key] || '')}
                                                onChange={(e) => handleLimitChange(city.key, e.target.value)}
                                                className={`flex-1 px-2 py-1.5 bg-gray-800 border border-gray-600 rounded text-sm text-white placeholder-gray-500 ${fetchAll[city.key] ? 'opacity-40 cursor-not-allowed' : ''}`}
                                            />
                                            <button
                                                onClick={() => handleSync(city.key)}
                                                disabled={city.isSyncing || city.isDeleting}
                                                className={`px-3 py-1.5 rounded-lg text-sm font-medium flex items-center gap-1.5 ${city.isSyncing || city.isDeleting
                                                    ? 'bg-gray-700 text-gray-400 cursor-not-allowed'
                                                    : 'bg-indigo-600 hover:bg-indigo-500 text-white'
                                                }`}
                                            >
                                                {city.isSyncing ? (
                                                    <><Loader2 className="w-4 h-4 animate-spin" /> Syncing</>
                                                ) : (
                                                    <><RefreshCw className="w-4 h-4" /> Sync</>
                                                )}
                                            </button>
                                            <button
                                                onClick={() => handleDeleteClick(city.key)}
                                                disabled={city.isSyncing || city.isDeleting || confirmDeleteCity === city.key}
                                                title="Delete all records for this city"
                                                className={`p-1.5 rounded-lg ${
                                                    city.isSyncing || city.isDeleting || confirmDeleteCity === city.key
                                                        ? 'text-gray-600 cursor-not-allowed'
                                                        : 'text-gray-400 hover:text-red-400 hover:bg-red-500/10'
                                                }`}
                                            >
                                                {city.isDeleting ? (
                                                    <Loader2 className="w-4 h-4 animate-spin" />
                                                ) : (
                                                    <Trash2 className="w-4 h-4" />
                                                )}
                                            </button>
                                        </div>
                                    </>
                                )}
                            </div>
                        ))}
                    </div>

                    {/* Empty state when adapter filter has no results */}
                    {filteredCityStatuses.length === 0 && activeAdapter !== 'all' && (
                        <div className="text-center py-8 text-gray-500 text-sm">
                            No cities found for {activeAdapter.toUpperCase()} adapter.
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

export default CitySyncPanel;
