'use client';

import { useState, useEffect, useCallback, useId } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import {
    RefreshCw, CheckCircle, AlertCircle, Loader2, Trash2,
    ChevronDown, Clock, TrendingUp, TrendingDown, Minus,
    MapPin, Zap, Activity, BarChart2, History, Globe2,
    Settings, ArrowUpRight,
} from 'lucide-react';
import {
    AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer,
    CartesianGrid,
} from 'recharts';
import { apiService } from '@/services/api';
import {
    PermitCityInfo, CitySyncStatus, DeleteCityResponse,
    CityMonthlyStats, CitySyncHistoryEntry, CityZipEntry,
} from '@/types';

// ─── adapter palette ──────────────────────────────────────────────────────────
// Restrained Estimation Hub palette — blue / green / amber / gray only.
// No gradients, no glow shadows, no purple/pink. "ods" reuses a second blue
// tone since only four hue families are allowed for five source types.

const ADAPTER: Record<string, {
    label: string;
    text: string;
    chart: string;
    border: string;
    borderAccent: string;
    badgeBg: string;
}> = {
    arcgis:  {
        label: 'ArcGIS',
        text: 'text-emerald-700',
        chart: '#059669',
        border: 'border-emerald-200',
        borderAccent: 'border-l-emerald-500',
        badgeBg: 'bg-emerald-50 text-emerald-700',
    },
    socrata: {
        label: 'Socrata',
        text: 'text-blue-700',
        chart: '#00458B',
        border: 'border-blue-200',
        borderAccent: 'border-l-blue-500',
        badgeBg: 'bg-blue-50 text-blue-700',
    },
    ckan: {
        label: 'CKAN',
        text: 'text-amber-700',
        chart: '#d97706',
        border: 'border-amber-200',
        borderAccent: 'border-l-amber-500',
        badgeBg: 'bg-amber-50 text-amber-700',
    },
    csv: {
        label: 'CSV',
        text: 'text-[#5B6B7D]',
        chart: '#6b7280',
        border: 'border-gray-300',
        borderAccent: 'border-l-gray-400',
        badgeBg: 'bg-gray-100 text-[#5B6B7D]',
    },
    ods: {
        label: 'ODS',
        text: 'text-blue-800',
        chart: '#045CB4',
        border: 'border-blue-300',
        borderAccent: 'border-l-blue-600',
        badgeBg: 'bg-blue-50 text-blue-800',
    },
};

const DEFAULT_ADAPTER = {
    label: 'API',
    text: 'text-[#5B6B7D]',
    chart: '#6b7280',
    border: 'border-gray-200',
    borderAccent: 'border-l-gray-300',
    badgeBg: 'bg-gray-100 text-[#5B6B7D]',
};

function palette(source: string) {
    return ADAPTER[source.toLowerCase()] ?? DEFAULT_ADAPTER;
}

// ─── freshness ────────────────────────────────────────────────────────────────

function freshnessInfo(lastSyncAt: string | null | undefined) {
    if (!lastSyncAt) return { label: 'Never synced', color: 'text-[#5B6B7D]', dot: 'bg-gray-300' };
    const days = Math.floor((Date.now() - new Date(lastSyncAt).getTime()) / 86_400_000);
    if (days === 0) return { label: 'Today',        color: 'text-emerald-700', dot: 'bg-emerald-500' };
    if (days === 1) return { label: 'Yesterday',    color: 'text-emerald-700', dot: 'bg-emerald-500' };
    if (days <= 7)  return { label: `${days}d ago`, color: 'text-emerald-700', dot: 'bg-emerald-500' };
    if (days <= 30) return { label: `${days}d ago`, color: 'text-amber-700',   dot: 'bg-amber-500'   };
    return             { label: `${days}d ago`, color: 'text-red-700',     dot: 'bg-red-500'     };
}

// ─── custom tooltip ───────────────────────────────────────────────────────────

function CustomTooltip({ active, payload, label, chartColor }: {
    active?: boolean;
    payload?: { value: number }[];
    label?: string;
    chartColor?: string;
}) {
    if (!active || !payload?.length) return null;
    return (
        <div
            className="bg-white rounded-lg px-3.5 py-2.5 shadow-md border border-[#DFE6EE]"
            style={{ borderColor: chartColor ? `${chartColor}40` : undefined }}
        >
            <p className="text-[10px] text-[#5B6B7D] mb-1">{label}</p>
            <p className="text-base font-mono font-bold text-[#0E2B5C] tabular-nums">
                {payload[0].value.toLocaleString()}
            </p>
            <p className="text-[10px] text-[#5B6B7D] mt-0.5">permits</p>
        </div>
    );
}

// ─── sync status dot ─────────────────────────────────────────────────────────

function SyncDot({ status }: { status: string | null | undefined }) {
    const color =
        status === 'success' ? 'bg-emerald-500' :
        status === 'failed'  ? 'bg-red-500'     :
        status === 'running' ? 'bg-amber-500 animate-pulse' :
        'bg-gray-300';
    return <span className={`inline-block w-2 h-2 rounded-full flex-shrink-0 ${color}`} />;
}

// ─── animation variants ───────────────────────────────────────────────────────

const kpiContainerVariants = {
    hidden: {},
    show: { transition: { staggerChildren: 0.05 } },
};

const kpiItemVariants = {
    hidden: { opacity: 0, y: 8 },
    show:   { opacity: 1, y: 0, transition: { duration: 0.22, ease: 'easeOut' as const } },
};

// ─── main component ───────────────────────────────────────────────────────────

interface CityDataSourceCardProps {
    city: PermitCityInfo;
    syncStatus?: CitySyncStatus;
    isExpanded: boolean;
    onToggle: () => void;
    onSyncComplete?: () => void;
    onStatusRefresh?: (status: CitySyncStatus) => void;
}

export function CityDataSourceCard({
    city,
    syncStatus,
    isExpanded,
    onToggle,
    onSyncComplete,
    onStatusRefresh,
}: CityDataSourceCardProps) {
    const pal = palette(city.source);
    const freshness = freshnessInfo(syncStatus?.last_sync_at);
    const latestSync = syncStatus?.latest_sync as Record<string, unknown> | undefined;
    const latestInserted = latestSync?.records_inserted as number | undefined;
    const gradientId = useId().replace(/:/g, '');
    const shouldReduce = useReducedMotion();

    // analytics state
    const [monthly, setMonthly]             = useState<CityMonthlyStats[]>([]);
    const [history, setHistory]             = useState<CitySyncHistoryEntry[]>([]);
    const [zipRows, setZipRows]             = useState<CityZipEntry[]>([]);
    const [loadedMonthly, setLoadedMonthly] = useState(false);
    const [loadedHistory, setLoadedHistory] = useState(false);
    const [activeTab, setActiveTab]         = useState<'chart' | 'history' | 'zip'>('chart');
    const [loadingZip, setLoadingZip]       = useState(false);

    // sync controls
    const [isSyncing, setIsSyncing]         = useState(false);
    const [isDeleting, setIsDeleting]       = useState(false);
    const [syncError, setSyncError]         = useState<string>();
    const [confirmDelete, setConfirmDelete] = useState(false);
    const [deleteResult, setDeleteResult]   = useState<DeleteCityResponse | null>(null);
    const [showControls, setShowControls]   = useState(false);
    const [fetchAll, setFetchAll]           = useState(false);
    const [recordLimit, setRecordLimit]     = useState(1000);
    const [dateRange, setDateRange]         = useState(() => {
        const today = new Date();
        const start = new Date(today);
        start.setMonth(start.getMonth() - 3);
        const fmt = (d: Date) => d.toISOString().split('T')[0];
        return { startDate: fmt(start), endDate: fmt(today) };
    });

    // lazy load on first expand
    useEffect(() => {
        if (!isExpanded) return;
        if (!loadedMonthly) {
            apiService.getCityMonthlyStats(city.key, 6)
                .then(setMonthly)
                .catch(() => {})
                .finally(() => setLoadedMonthly(true));
        }
        if (!loadedHistory) {
            apiService.getCitySyncHistory(city.key, 10)
                .then(setHistory)
                .catch(() => {})
                .finally(() => setLoadedHistory(true));
        }
    }, [isExpanded, city.key, loadedMonthly, loadedHistory]);

    const handleTabZip = useCallback(async () => {
        setActiveTab('zip');
        if (zipRows.length > 0 || loadingZip) return;
        setLoadingZip(true);
        try {
            const rows = await apiService.getCityZipSummary(city.key, 10);
            setZipRows(rows);
        } catch {}
        setLoadingZip(false);
    }, [city.key, zipRows.length, loadingZip]);

    const handleSync = useCallback(async () => {
        setIsSyncing(true);
        setSyncError(undefined);
        try {
            let baselineStartedAt: string | undefined;
            try {
                const before = await apiService.getCitySyncStatus(city.key);
                baselineStartedAt = (before.latest_sync as Record<string, unknown> | undefined)
                    ?.started_at as string | undefined;
            } catch {}
            const limit = fetchAll ? undefined : recordLimit;
            await apiService.syncPermits(city.key, true, limit, dateRange.startDate, dateRange.endDate);
            const MAX_WAIT = city.source === 'csv' ? 90 * 60_000 : 20 * 60_000;
            const deadline = Date.now() + MAX_WAIT;
            await new Promise<void>((resolve, reject) => {
                const poll = async () => {
                    if (Date.now() > deadline) { reject(new Error('Sync timed out')); return; }
                    try {
                        const status = await apiService.getCitySyncStatus(city.key);
                        const ls = status.latest_sync as Record<string, unknown> | undefined;
                        const isNew = ls?.started_at !== undefined && ls.started_at !== baselineStartedAt;
                        if (isNew && ls?.status === 'success') {
                            onStatusRefresh?.(status);
                            onSyncComplete?.();
                            apiService.getCityMonthlyStats(city.key, 6).then(setMonthly).catch(() => {});
                            apiService.getCitySyncHistory(city.key, 10).then(setHistory).catch(() => {});
                            resolve();
                        } else if (isNew && ls?.status === 'failed') {
                            reject(new Error((ls?.error_message as string | undefined) || 'Sync failed'));
                        } else {
                            setTimeout(poll, 3000);
                        }
                    } catch { setTimeout(poll, 3000); }
                };
                setTimeout(poll, 1000);
            });
        } catch (err) {
            setSyncError(err instanceof Error ? err.message : 'Sync failed');
        } finally {
            setIsSyncing(false);
        }
    }, [city.key, city.source, fetchAll, recordLimit, dateRange, onSyncComplete, onStatusRefresh]);

    const handleDelete = useCallback(async () => {
        if (!confirmDelete) {
            setIsDeleting(true);
            try {
                const result = await apiService.deleteCityPermits(city.key, false);
                setDeleteResult(result);
                setConfirmDelete(true);
            } catch (err) {
                setSyncError(err instanceof Error ? err.message : 'Delete check failed');
            } finally { setIsDeleting(false); }
            return;
        }
        setIsDeleting(true);
        try {
            await apiService.deleteCityPermits(city.key, true);
            const s = await apiService.getCitySyncStatus(city.key).catch(() => undefined);
            if (s) onStatusRefresh?.(s);
            setConfirmDelete(false);
            setDeleteResult(null);
            onSyncComplete?.();
        } catch (err) {
            setSyncError(err instanceof Error ? err.message : 'Delete failed');
        } finally { setIsDeleting(false); }
    }, [city.key, confirmDelete, onSyncComplete, onStatusRefresh]);

    const syncRate = history.length
        ? Math.round(history.filter(h => h.status === 'success').length / history.length * 100)
        : null;

    const trendDir = monthly.length >= 2
        ? monthly[monthly.length - 1].count > monthly[monthly.length - 2].count ? 'up'
        : monthly[monthly.length - 1].count < monthly[monthly.length - 2].count ? 'down'
        : 'flat'
        : 'flat';

    const bodyTransition = shouldReduce
        ? { duration: 0 }
        : { duration: 0.3, ease: [0.4, 0, 0.2, 1] as [number, number, number, number] };

    // ── render ────────────────────────────────────────────────────────────────
    return (
        <motion.div
            layout
            className={`
                relative overflow-hidden rounded-lg border-l-4 border transition-all duration-300 bg-white
                ${isExpanded
                    ? `${pal.borderAccent} ${pal.border} shadow-sm`
                    : `border-l-transparent border-[#DFE6EE] hover:border-l-gray-200`
                }
            `}
        >
            {/* ── Header / collapsed row ──────────────────────────────────── */}
            <button
                onClick={onToggle}
                className="w-full flex items-center gap-4 px-5 py-4 text-left group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00458B]/30 rounded-t-lg"
            >
                {/* City info */}
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2.5 mb-1.5">
                        <span className={`w-2 h-2 rounded-full flex-shrink-0 ${freshness.dot}`} />
                        <span className="font-semibold text-[#0E2B5C] text-sm leading-none tracking-tight">{city.name}</span>
                        {city.stale && (
                            <span className="text-[9px] px-1.5 py-0.5 rounded-md font-bold tracking-wide bg-amber-50 text-amber-700 uppercase">Stale</span>
                        )}
                        {city.irrelevant && (
                            <span className="text-[9px] px-1.5 py-0.5 rounded-md font-bold tracking-wide bg-gray-100 text-[#5B6B7D] uppercase">Irrelevant</span>
                        )}
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                        <span className={`text-[10px] px-2.5 py-0.5 rounded-full font-bold tracking-wider ${pal.badgeBg}`}>
                            {pal.label}
                        </span>
                        {city.state_code && (
                            <span className="flex items-center gap-1 text-[10px] text-[#5B6B7D]">
                                <MapPin size={9} />
                                {city.state_code}
                            </span>
                        )}
                        {city.metro_name && (
                            <span className="text-[10px] text-[#5B6B7D] truncate hidden sm:block">{city.metro_name}</span>
                        )}
                    </div>
                </div>

                {/* Right-side compact stats */}
                <div className="flex items-center gap-3 flex-shrink-0">
                    {/* Total records */}
                    <div className="hidden md:block text-right">
                        <p className="text-sm font-mono font-bold text-[#0E2B5C] tabular-nums leading-none">
                            {syncStatus?.total_records != null
                                ? syncStatus.total_records.toLocaleString()
                                : <span className="text-gray-300">—</span>}
                        </p>
                        <p className="text-[10px] text-[#5B6B7D] mt-0.5 uppercase tracking-wider">records</p>
                    </div>

                    {/* Delta badge */}
                    {latestInserted != null && latestInserted > 0 && (
                        <div className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-50 border border-emerald-200">
                            <ArrowUpRight size={11} className="text-emerald-700" />
                            <span className="text-xs font-mono font-bold text-emerald-700 tabular-nums">
                                +{latestInserted.toLocaleString()}
                            </span>
                        </div>
                    )}

                    {/* Trend icon */}
                    {monthly.length >= 2 && (
                        trendDir === 'up'   ? <TrendingUp  size={15} className="text-emerald-600" /> :
                        trendDir === 'down' ? <TrendingDown size={15} className="text-red-600" />   :
                        <Minus size={15} className="text-gray-300" />
                    )}

                    {/* Freshness */}
                    <div className="hidden sm:block text-right">
                        <p className={`text-xs font-mono font-medium ${freshness.color} leading-none tabular-nums`}>
                            {freshness.label}
                        </p>
                        <p className="text-[10px] text-[#5B6B7D] mt-0.5 uppercase tracking-wider">last sync</p>
                    </div>

                    {/* Animated chevron */}
                    <motion.div
                        animate={{ rotate: isExpanded ? 180 : 0 }}
                        transition={shouldReduce ? { duration: 0 } : { duration: 0.25, ease: 'easeInOut' }}
                        className="w-7 h-7 rounded-lg flex items-center justify-center bg-[#F7F9FB] group-hover:bg-gray-100 transition-colors"
                    >
                        <ChevronDown size={15} className="text-[#5B6B7D]" />
                    </motion.div>
                </div>
            </button>

            {/* ── Expanded body ────────────────────────────────────────────── */}
            <AnimatePresence initial={false}>
                {isExpanded && (
                    <motion.div
                        key="body"
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={bodyTransition}
                        className="overflow-hidden"
                    >
                        <div className="px-5 pb-6 space-y-5 border-t border-[#DFE6EE]">

                            {/* ── KPI row (staggered) ──────────────────────── */}
                            <motion.div
                                className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-5"
                                variants={shouldReduce ? {} : kpiContainerVariants}
                                initial="hidden"
                                animate="show"
                            >
                                <KpiChip
                                    icon={<Activity size={13} />}
                                    label="Total Records"
                                    value={syncStatus?.total_records?.toLocaleString() ?? '—'}
                                    accent={pal.text}
                                    shouldReduce={shouldReduce ?? false}
                                />
                                <KpiChip
                                    icon={<Zap size={13} />}
                                    label="New This Sync"
                                    value={latestInserted != null ? `+${latestInserted.toLocaleString()}` : '—'}
                                    accent={latestInserted ? 'text-emerald-700' : 'text-[#5B6B7D]'}
                                    shouldReduce={shouldReduce ?? false}
                                />
                                <KpiChip
                                    icon={<Clock size={13} />}
                                    label="Last Sync"
                                    value={freshness.label}
                                    accent={freshness.color}
                                    shouldReduce={shouldReduce ?? false}
                                />
                                <KpiChip
                                    icon={<CheckCircle size={13} />}
                                    label="Success Rate"
                                    value={syncRate != null ? `${syncRate}%` : '—'}
                                    accent={
                                        syncRate == null ? 'text-[#5B6B7D]' :
                                        syncRate >= 80   ? 'text-emerald-700' :
                                        syncRate >= 50   ? 'text-amber-700' :
                                        'text-red-700'
                                    }
                                    shouldReduce={shouldReduce ?? false}
                                />
                            </motion.div>

                            {/* Domain */}
                            {city.domain && (
                                <div className="flex items-center gap-1.5 -mt-2">
                                    <Globe2 size={11} className="text-[#5B6B7D]" />
                                    <span className="text-[11px] text-[#5B6B7D]">{city.domain}</span>
                                </div>
                            )}

                            {/* ── Error / delete confirm ───────────────────── */}
                            {syncError && (
                                <div className="flex items-center gap-2 px-3 py-2.5 bg-red-50 border border-red-200 rounded-lg text-red-700 text-xs">
                                    <AlertCircle size={13} className="flex-shrink-0" />
                                    {syncError}
                                </div>
                            )}

                            {deleteResult && confirmDelete && (
                                <div className="px-3 py-3 bg-amber-50 border border-amber-200 rounded-lg text-xs">
                                    <p className="text-amber-800 font-semibold mb-1">Confirm permanent deletion</p>
                                    <p className="text-amber-700 mb-2">
                                        {deleteResult.agencies?.map(a => `${a.permit_count.toLocaleString()} permits`).join(', ') || 'No records found'}
                                    </p>
                                    <div className="flex gap-2">
                                        <button onClick={handleDelete} disabled={isDeleting}
                                            className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors focus-visible:ring-2 focus-visible:ring-red-400 focus-visible:outline-none">
                                            {isDeleting ? <Loader2 size={11} className="animate-spin" /> : <Trash2 size={11} />}
                                            Delete All
                                        </button>
                                        <button onClick={() => { setConfirmDelete(false); setDeleteResult(null); }}
                                            className="px-3 py-1.5 bg-white hover:bg-[#F7F9FB] border border-[#DFE6EE] text-[#5B6B7D] rounded-lg text-xs transition-colors focus-visible:ring-2 focus-visible:ring-[#00458B]/30 focus-visible:outline-none">
                                            Cancel
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* ── Tab bar ─────────────────────────────────── */}
                            <div className="flex gap-1 p-1 bg-[#F7F9FB] rounded-lg border border-[#DFE6EE]">
                                {[
                                    { id: 'chart',   icon: <BarChart2 size={12} />,  label: '6-Month Trend' },
                                    { id: 'history', icon: <History size={12} />,    label: 'Sync History'  },
                                    { id: 'zip',     icon: <MapPin size={12} />,     label: 'ZIP → County'  },
                                ].map(tab => (
                                    <button
                                        key={tab.id}
                                        onClick={() => tab.id === 'zip' ? handleTabZip() : setActiveTab(tab.id as typeof activeTab)}
                                        className={`
                                            flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-md text-xs font-medium transition-all duration-200
                                            focus-visible:ring-2 focus-visible:ring-[#00458B]/30 focus-visible:outline-none
                                            ${activeTab === tab.id
                                                ? `bg-white ${pal.text} shadow-sm border border-[#DFE6EE]`
                                                : 'text-[#5B6B7D] hover:text-[#0E2B5C] hover:bg-white/60'
                                            }
                                        `}
                                    >
                                        {tab.icon}
                                        <span className="hidden sm:inline">{tab.label}</span>
                                    </button>
                                ))}
                            </div>

                            {/* ── Tab: 6-month area chart ──────────────────── */}
                            {activeTab === 'chart' && (
                                <div className="h-52">
                                    {!loadedMonthly ? (
                                        <div className="h-full flex items-center justify-center">
                                            <Loader2 size={20} className={`animate-spin ${pal.text} opacity-50`} />
                                        </div>
                                    ) : monthly.length === 0 ? (
                                        <div className="h-full flex flex-col items-center justify-center gap-2">
                                            <BarChart2 size={28} className="text-gray-300" />
                                            <p className="text-xs text-[#5B6B7D]">No dated permit records yet</p>
                                        </div>
                                    ) : (
                                        <ResponsiveContainer width="100%" height="100%">
                                            <AreaChart
                                                data={monthly}
                                                margin={{ top: 6, right: 4, left: -20, bottom: 0 }}
                                            >
                                                <defs>
                                                    <linearGradient id={`grad-${gradientId}`} x1="0" y1="0" x2="0" y2="1">
                                                        <stop offset="0%"   stopColor={pal.chart} stopOpacity={0.35} />
                                                        <stop offset="65%"  stopColor={pal.chart} stopOpacity={0.08} />
                                                        <stop offset="100%" stopColor={pal.chart} stopOpacity={0.02} />
                                                    </linearGradient>
                                                </defs>
                                                <CartesianGrid
                                                    vertical={false}
                                                    strokeDasharray="3 3"
                                                    stroke="#DFE6EE"
                                                />
                                                <XAxis
                                                    dataKey="label"
                                                    tick={{ fontSize: 10, fill: '#5B6B7D', fontFamily: 'var(--font-geist-mono)' }}
                                                    tickLine={false}
                                                    axisLine={false}
                                                    tickFormatter={(v: string) => v.split(' ')[0]}
                                                />
                                                <YAxis
                                                    tick={{ fontSize: 10, fill: '#5B6B7D', fontFamily: 'var(--font-geist-mono)' }}
                                                    tickLine={false}
                                                    axisLine={false}
                                                    width={40}
                                                    tickFormatter={(v: number) =>
                                                        v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v)
                                                    }
                                                />
                                                <Tooltip
                                                    content={<CustomTooltip chartColor={pal.chart} />}
                                                    cursor={{ stroke: pal.chart, strokeOpacity: 0.2, strokeWidth: 1 }}
                                                />
                                                <Area
                                                    type="monotone"
                                                    dataKey="count"
                                                    stroke={pal.chart}
                                                    strokeWidth={2.5}
                                                    fill={`url(#grad-${gradientId})`}
                                                    dot={false}
                                                    activeDot={{
                                                        fill: pal.chart,
                                                        strokeWidth: 2,
                                                        stroke: '#ffffff',
                                                        r: 5,
                                                    }}
                                                    isAnimationActive={!shouldReduce}
                                                />
                                            </AreaChart>
                                        </ResponsiveContainer>
                                    )}
                                </div>
                            )}

                            {/* ── Tab: Sync history ────────────────────────── */}
                            {activeTab === 'history' && (
                                <div>
                                    {!loadedHistory ? (
                                        <div className="h-32 flex items-center justify-center">
                                            <Loader2 size={18} className={`animate-spin ${pal.text} opacity-50`} />
                                        </div>
                                    ) : history.length === 0 ? (
                                        <div className="h-32 flex flex-col items-center justify-center gap-2">
                                            <History size={24} className="text-gray-300" />
                                            <p className="text-xs text-[#5B6B7D]">No sync history yet</p>
                                        </div>
                                    ) : (
                                        <div className="space-y-0 relative">
                                            {/* Spine line */}
                                            <div
                                                className="absolute left-[7px] top-3 bottom-3 w-px opacity-25"
                                                style={{ background: pal.chart }}
                                            />
                                            {history.map((h, i) => (
                                                <div key={i} className="flex items-start gap-3 pl-1">
                                                    <div className="flex flex-col items-center pt-1 flex-shrink-0">
                                                        <SyncDot status={h.status} />
                                                        {i < history.length - 1 && (
                                                            <div className="w-px flex-1 bg-transparent my-0.5 min-h-5" />
                                                        )}
                                                    </div>
                                                    <div className="flex-1 pb-3.5 min-w-0">
                                                        <div className="flex items-center justify-between gap-2">
                                                            <span className="text-[11px] font-mono text-[#5B6B7D] tabular-nums">
                                                                {new Date(h.started_at).toLocaleDateString('en-US', {
                                                                    month: 'short', day: 'numeric',
                                                                    hour: '2-digit', minute: '2-digit',
                                                                })}
                                                            </span>
                                                            <div className="flex items-center gap-2 flex-shrink-0">
                                                                {h.records_inserted > 0 && (
                                                                    <span
                                                                        className="text-[11px] font-mono font-bold tabular-nums"
                                                                        style={{ color: pal.chart }}
                                                                    >
                                                                        +{h.records_inserted.toLocaleString()}
                                                                    </span>
                                                                )}
                                                                <span className={`
                                                                    text-[10px] font-medium px-1.5 py-0.5 rounded-md
                                                                    ${h.status === 'success' ? 'bg-emerald-50 text-emerald-700' :
                                                                      h.status === 'failed'  ? 'bg-red-50 text-red-700' :
                                                                      'bg-gray-100 text-[#5B6B7D]'}
                                                                `}>{h.status}</span>
                                                            </div>
                                                        </div>
                                                        {h.status === 'failed' && h.error_message && (
                                                            <p className="text-[10px] text-red-600 mt-0.5 truncate">{h.error_message}</p>
                                                        )}
                                                        {h.status === 'success' && (
                                                            <p className="text-[10px] font-mono text-[#5B6B7D] mt-0.5 tabular-nums">
                                                                {h.records_fetched.toLocaleString()} fetched
                                                                {h.records_updated > 0 && ` · ${h.records_updated.toLocaleString()} updated`}
                                                            </p>
                                                        )}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* ── Tab: ZIP → County ────────────────────────── */}
                            {activeTab === 'zip' && (
                                <div>
                                    {loadingZip ? (
                                        <div className="h-32 flex items-center justify-center">
                                            <Loader2 size={18} className={`animate-spin ${pal.text} opacity-50`} />
                                        </div>
                                    ) : zipRows.length === 0 ? (
                                        <div className="h-32 flex flex-col items-center justify-center gap-2">
                                            <MapPin size={24} className="text-gray-300" />
                                            <p className="text-xs text-[#5B6B7D]">No ZIP data — run a sync first</p>
                                        </div>
                                    ) : (
                                        <div className="space-y-2">
                                            {zipRows.map((z, i) => {
                                                const pct = zipRows[0].permit_count > 0
                                                    ? z.permit_count / zipRows[0].permit_count
                                                    : 0;
                                                return (
                                                    <div key={i} className="flex items-center gap-3">
                                                        <span className="text-xs font-mono text-[#5B6B7D] w-12 flex-shrink-0 text-right tabular-nums">
                                                            {z.zip_code}
                                                        </span>
                                                        <div className="flex-1 relative h-6 flex items-center">
                                                            <div className="absolute inset-y-0 left-0 rounded-md bg-[#F7F9FB] w-full" />
                                                            <motion.div
                                                                className="absolute inset-y-0 left-0 rounded-md"
                                                                style={{ background: `${pal.chart}35` }}
                                                                initial={shouldReduce ? { width: `${pct * 100}%` } : { width: 0 }}
                                                                animate={{ width: `${pct * 100}%` }}
                                                                transition={{ duration: 0.55, delay: i * 0.05, ease: 'easeOut' }}
                                                            />
                                                            <span className="relative text-[11px] text-[#0E2B5C] pl-2.5 truncate">
                                                                {z.county_name ?? '—'}
                                                                {z.state_code && <span className="text-[#5B6B7D]"> · {z.state_code}</span>}
                                                            </span>
                                                        </div>
                                                        <span className="text-xs font-mono tabular-nums text-[#5B6B7D] flex-shrink-0">
                                                            {z.permit_count.toLocaleString()}
                                                        </span>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* ── Sync controls (collapsible) ──────────────── */}
                            {!city.stale && !city.irrelevant && (
                                <div className="border-t border-[#DFE6EE] pt-4">
                                    <button
                                        onClick={() => setShowControls(v => !v)}
                                        className="flex items-center gap-2 text-xs text-[#5B6B7D] hover:text-[#0E2B5C] transition-colors mb-3 focus-visible:ring-2 focus-visible:ring-[#00458B]/30 focus-visible:outline-none rounded"
                                    >
                                        <Settings size={12} />
                                        Sync Controls
                                        <motion.div
                                            animate={{ rotate: showControls ? 180 : 0 }}
                                            transition={shouldReduce ? { duration: 0 } : { duration: 0.2 }}
                                        >
                                            <ChevronDown size={11} />
                                        </motion.div>
                                    </button>

                                    <AnimatePresence>
                                        {showControls && (
                                            <motion.div
                                                initial={{ height: 0, opacity: 0 }}
                                                animate={{ height: 'auto', opacity: 1 }}
                                                exit={{ height: 0, opacity: 0 }}
                                                transition={shouldReduce ? { duration: 0 } : { duration: 0.2 }}
                                                className="overflow-hidden space-y-3"
                                            >
                                                {/* Date range */}
                                                <div className="grid grid-cols-2 gap-2">
                                                    <div>
                                                        <label className="block text-[10px] text-[#5B6B7D] mb-1 uppercase tracking-wider">From</label>
                                                        <input type="date" value={dateRange.startDate}
                                                            onChange={e => setDateRange(r => ({ ...r, startDate: e.target.value }))}
                                                            className="w-full px-2.5 py-1.5 bg-white border border-[#DFE6EE] rounded-lg text-xs text-[#0E2B5C] focus:border-[#00458B] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00458B]/30"
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="block text-[10px] text-[#5B6B7D] mb-1 uppercase tracking-wider">To</label>
                                                        <input type="date" value={dateRange.endDate}
                                                            onChange={e => setDateRange(r => ({ ...r, endDate: e.target.value }))}
                                                            className="w-full px-2.5 py-1.5 bg-white border border-[#DFE6EE] rounded-lg text-xs text-[#0E2B5C] focus:border-[#00458B] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00458B]/30"
                                                        />
                                                    </div>
                                                </div>

                                                {/* Controls row */}
                                                <div className="flex items-center gap-3 flex-wrap">
                                                    <label className="flex items-center gap-1.5 cursor-pointer select-none">
                                                        <input type="checkbox" checked={fetchAll}
                                                            onChange={e => setFetchAll(e.target.checked)}
                                                            className="w-3.5 h-3.5 accent-[#00458B]"
                                                        />
                                                        <span className="text-xs text-[#5B6B7D]">Fetch All</span>
                                                    </label>
                                                    {!fetchAll && (
                                                        <input type="number" placeholder="1000" min={100} max={10000}
                                                            value={recordLimit}
                                                            onChange={e => setRecordLimit(Math.min(Math.max(parseInt(e.target.value) || 1000, 100), 10000))}
                                                            className="w-24 px-2.5 py-1.5 bg-white border border-[#DFE6EE] rounded-lg text-xs font-mono text-[#0E2B5C] focus:outline-none focus:border-[#00458B]"
                                                        />
                                                    )}
                                                    <div className="flex items-center gap-2 ml-auto">
                                                        <button onClick={handleSync} disabled={isSyncing || isDeleting}
                                                            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-200 focus-visible:ring-2 focus-visible:ring-[#00458B]/40 focus-visible:outline-none min-h-[44px] ${
                                                                isSyncing || isDeleting
                                                                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                                                    : 'bg-[#00458B] hover:bg-[#045CB4] text-white'
                                                            }`}>
                                                            {isSyncing
                                                                ? <><Loader2 size={14} className="animate-spin" /> Syncing…</>
                                                                : <><RefreshCw size={14} /> Sync</>}
                                                        </button>
                                                        <button onClick={handleDelete} disabled={isSyncing || isDeleting}
                                                            title="Delete all records for this city"
                                                            className={`p-2.5 rounded-lg transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center focus-visible:ring-2 focus-visible:ring-red-400 focus-visible:outline-none ${
                                                                isSyncing || isDeleting
                                                                    ? 'text-gray-300 cursor-not-allowed'
                                                                    : 'text-[#5B6B7D] hover:text-red-700 hover:bg-red-50'
                                                            }`}>
                                                            {isDeleting
                                                                ? <Loader2 size={14} className="animate-spin" />
                                                                : <Trash2 size={14} />}
                                                        </button>
                                                    </div>
                                                </div>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </div>
                            )}

                            {/* Stale / irrelevant notice */}
                            {city.stale && (
                                <div className="flex items-center gap-2 px-3 py-2.5 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800">
                                    <AlertCircle size={12} className="flex-shrink-0" />
                                    Data source is no longer updated — sync unavailable
                                </div>
                            )}
                            {city.irrelevant && (
                                <div className="flex items-center gap-2 px-3 py-2.5 bg-gray-100 border border-gray-200 rounded-lg text-xs text-[#5B6B7D]">
                                    <AlertCircle size={12} className="flex-shrink-0" />
                                    Not construction-relevant — sync disabled
                                </div>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
}

// ─── KPI chip ─────────────────────────────────────────────────────────────────

function KpiChip({ icon, label, value, accent, shouldReduce }: {
    icon: React.ReactNode;
    label: string;
    value: string;
    accent: string;
    shouldReduce: boolean;
}) {
    return (
        <motion.div
            variants={shouldReduce ? {} : kpiItemVariants}
            className="bg-[#F7F9FB] border border-[#DFE6EE] rounded-lg p-3.5 space-y-2 hover:bg-gray-100 transition-colors group"
        >
            <div className={`flex items-center gap-1.5 ${accent}`}>
                {icon}
                <span className="text-[10px] font-medium uppercase tracking-widest">{label}</span>
            </div>
            <p className={`text-2xl font-mono font-bold leading-none tabular-nums ${
                accent !== 'text-[#5B6B7D]' ? accent : 'text-[#5B6B7D]'
            }`}>
                {value}
            </p>
        </motion.div>
    );
}

export default CityDataSourceCard;
