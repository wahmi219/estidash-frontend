'use client';

import { useEffect, useState, useMemo, useCallback, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Database, RefreshCw, Search, Eye } from 'lucide-react';
import PageHeader from '@/components/common/PageHeader';
import { apiService } from '@/services/api';
import type { DataSourceSummary, SourceHealthState } from '@/types';
import HealthBadge, { healthLabel } from '@/components/datasources/HealthBadge';
import SourceDetailModal from '@/components/datasources/SourceDetailModal';
import { formatDateTime, formatDateOnly } from '@/components/datasources/dateUtils';

const HEALTH_STATES: SourceHealthState[] = ['HEALTHY', 'WARNING', 'FAILED', 'STUCK', 'NEEDS_AUTH', 'DISABLED', 'NEVER_VERIFIED'];

const CONNECTOR_COLORS: Record<string, string> = {
    Socrata: 'bg-blue-50 text-blue-700',
    ArcGIS: 'bg-emerald-50 text-emerald-700',
    CKAN: 'bg-amber-50 text-amber-700',
    CSV: 'bg-gray-100 text-[#5B6B7D]',
    ODS: 'bg-blue-50 text-blue-800',
};

function DataSourcesPageInner() {
    const searchParams = useSearchParams();

    const [sources, setSources] = useState<DataSourceSummary[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [stateFilter, setStateFilter] = useState('all');
    const [connectorFilter, setConnectorFilter] = useState('all');
    const [healthFilter, setHealthFilter] = useState<string>(searchParams.get('health')?.toUpperCase() ?? 'all');
    const [selectedAgencyId, setSelectedAgencyId] = useState<string | null>(null);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const data = await apiService.getDataSources();
            setSources(data);
        } catch {
            setSources([]);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { load(); }, [load]);

    const states = useMemo(
        () => Array.from(new Set(sources.map(s => s.state).filter(Boolean))).sort(),
        [sources]
    );
    const connectors = useMemo(
        () => Array.from(new Set(sources.map(s => s.connector))).sort(),
        [sources]
    );

    const filtered = useMemo(() => {
        const q = search.trim().toLowerCase();
        return sources
            .filter(s => !q || s.source.toLowerCase().includes(q) || s.city_key.toLowerCase().includes(q))
            .filter(s => stateFilter === 'all' || s.state === stateFilter)
            .filter(s => connectorFilter === 'all' || s.connector === connectorFilter)
            .filter(s => healthFilter === 'all' || s.health === healthFilter)
            // Default view: active (enabled/schedulable) sources first, then alphabetical.
            .sort((a, b) => {
                if (a.enabled !== b.enabled) return a.enabled ? -1 : 1;
                return a.source.localeCompare(b.source);
            });
    }, [sources, search, stateFilter, connectorFilter, healthFilter]);

    const activeCount = useMemo(() => sources.filter(s => s.enabled).length, [sources]);
    const needsAttentionCount = useMemo(
        () => sources.filter(s => ['FAILED', 'STUCK', 'WARNING', 'NEEDS_AUTH'].includes(s.health)).length,
        [sources]
    );
    const totalRecords = useMemo(() => sources.reduce((sum, s) => sum + s.records, 0), [sources]);

    return (
        <div className="p-6 lg:p-8 space-y-6">
            <PageHeader
                icon={Database}
                title="Data Sources"
                subtitle="Source health, sync schedule, and coverage across all configured permit feeds"
                actions={
                    <button
                        onClick={load}
                        disabled={loading}
                        className="flex items-center gap-2 px-3 py-2 bg-white hover:bg-[#F7F9FB] border border-[#DFE6EE] rounded-lg text-[#5B6B7D] hover:text-[#0E2B5C] text-sm transition-colors disabled:opacity-50"
                    >
                        <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
                        Refresh
                    </button>
                }
            />

            {/* Summary chips */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <SummaryChip label="Configured Sources" value={sources.length.toString()} />
                <SummaryChip label="Active / Schedulable" value={activeCount.toString()} />
                <SummaryChip label="Needs Attention" value={needsAttentionCount.toString()} />
                <SummaryChip label="Total Records" value={totalRecords.toLocaleString()} />
            </div>

            {/* Filters */}
            <div className="flex items-center gap-3 flex-wrap">
                <div className="relative flex-1 min-w-[220px] max-w-sm">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#5B6B7D]" />
                    <input
                        type="text"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Search source or city…"
                        className="w-full pl-9 pr-3 py-2 bg-white border border-[#DFE6EE] rounded-lg text-sm text-[#0E2B5C] placeholder:text-[#5B6B7D] focus:outline-none focus:ring-2 focus:ring-[#00458B]/30 focus:border-[#00458B]"
                    />
                </div>
                <FilterSelect label="State" value={stateFilter} onChange={setStateFilter} options={states} />
                <FilterSelect label="Connector" value={connectorFilter} onChange={setConnectorFilter} options={connectors} />
                <FilterSelect
                    label="Health"
                    value={healthFilter}
                    onChange={setHealthFilter}
                    options={HEALTH_STATES}
                    optionLabel={(h) => healthLabel(h as SourceHealthState)}
                />
            </div>

            {/* Table */}
            <div className="bg-white border border-[#DFE6EE] rounded-lg overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="bg-[#F7F9FB] text-left text-[11px] font-semibold text-[#5B6B7D] uppercase tracking-wider border-b border-[#DFE6EE]">
                                <th className="px-4 py-2.5">Source / City</th>
                                <th className="px-4 py-2.5">State</th>
                                <th className="px-4 py-2.5">Connector</th>
                                <th className="px-4 py-2.5">Last Success</th>
                                <th className="px-4 py-2.5">Latest Permit</th>
                                <th className="px-4 py-2.5">Next Sync</th>
                                <th className="px-4 py-2.5">Health</th>
                                <th className="px-4 py-2.5 text-right">Records</th>
                                <th className="px-4 py-2.5">Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filtered.map((s) => (
                                <tr
                                    key={s.agency_id}
                                    className={`border-b border-[#F0F3F7] last:border-0 hover:bg-[#F7F9FB] cursor-pointer transition-colors ${!s.enabled ? 'opacity-60' : ''}`}
                                    onClick={() => setSelectedAgencyId(s.agency_id)}
                                >
                                    <td className="px-4 py-3">
                                        <p className="font-medium text-[#0E2B5C]">{s.source}</p>
                                        <p className="text-xs text-[#5B6B7D]">{s.city_key}</p>
                                    </td>
                                    <td className="px-4 py-3 text-[#5B6B7D]">{s.state || '—'}</td>
                                    <td className="px-4 py-3">
                                        <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${CONNECTOR_COLORS[s.connector] ?? 'bg-gray-100 text-[#5B6B7D]'}`}>
                                            {s.connector}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 text-[#0E2B5C] whitespace-nowrap">{formatDateTime(s.last_success)}</td>
                                    <td className="px-4 py-3 text-[#0E2B5C] whitespace-nowrap">{formatDateOnly(s.latest_permit)}</td>
                                    <td className="px-4 py-3 text-[#5B6B7D] whitespace-nowrap">{s.enabled ? formatDateTime(s.next_sync) : '—'}</td>
                                    <td className="px-4 py-3">
                                        <HealthBadge health={s.health} title={s.health_reason} />
                                    </td>
                                    <td className="px-4 py-3 text-right tabular-nums text-[#0E2B5C]">{s.records.toLocaleString()}</td>
                                    <td className="px-4 py-3">
                                        <button
                                            onClick={(e) => { e.stopPropagation(); setSelectedAgencyId(s.agency_id); }}
                                            className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-white hover:bg-[#F7F9FB] border border-[#DFE6EE] rounded-md text-xs text-[#5B6B7D] hover:text-[#0E2B5C] transition-colors"
                                        >
                                            <Eye size={12} /> View
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                {!loading && filtered.length === 0 && (
                    <div className="text-center py-14 text-[#5B6B7D] text-sm">
                        {sources.length === 0 ? 'Loading sources…' : 'No sources match the current filters.'}
                    </div>
                )}
            </div>

            {selectedAgencyId && (
                <SourceDetailModal
                    agencyId={selectedAgencyId}
                    onClose={() => setSelectedAgencyId(null)}
                    onRunSyncTriggered={load}
                />
            )}
        </div>
    );
}

function SummaryChip({ label, value }: { label: string; value: string }) {
    return (
        <div className="bg-white border border-[#DFE6EE] rounded-lg p-4">
            <p className="text-2xl font-bold text-[#0E2B5C]">{value}</p>
            <p className="text-xs text-[#5B6B7D] mt-0.5">{label}</p>
        </div>
    );
}

function FilterSelect({
    label, value, onChange, options, optionLabel,
}: {
    label: string;
    value: string;
    onChange: (v: string) => void;
    options: string[];
    optionLabel?: (v: string) => string;
}) {
    return (
        <select
            value={value}
            onChange={(e) => onChange(e.target.value)}
            aria-label={label}
            className="px-3 py-2 bg-white border border-[#DFE6EE] rounded-lg text-sm text-[#0E2B5C] focus:outline-none focus:ring-2 focus:ring-[#00458B]/30 focus:border-[#00458B]"
        >
            <option value="all">All {label}</option>
            {options.map((o) => (
                <option key={o} value={o}>{optionLabel ? optionLabel(o) : o}</option>
            ))}
        </select>
    );
}

export default function DataSourcesPage() {
    return (
        <Suspense fallback={<div className="p-6 lg:p-8 text-sm text-[#5B6B7D]">Loading…</div>}>
            <DataSourcesPageInner />
        </Suspense>
    );
}
