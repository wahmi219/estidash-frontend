'use client';

import React, { Suspense, useEffect, useCallback, useState } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { useSelector } from 'react-redux';
import {
    HardHat,
    RefreshCw,
    AlertCircle,
    Search,
    X,
    ChevronDown,
    ChevronUp,
    Mail,
    Phone,
    MapPin,
    FileText,
    ArrowUpDown,
    Send,
    Star,
    ShieldCheck,
} from 'lucide-react';
import { useAppDispatch, useAppSelector } from '@/hooks/useAppDispatch';
import {
    fetchContractors,
    fetchContractorTypes,
    fetchContractorStates,
    fetchContractorCities,
    setFilters,
    resetFilters,
    setPage,
    setPageSize,
    setSorting,
    hydrateFromUrl,
    selectContractors,
    selectContractorsStatus,
    selectContractorsError,
    selectContractorFilters,
    selectContractorPagination,
    selectContractorSorting,
    selectAvailableTypes,
    selectAvailableStates,
    selectAvailableCities,
} from '@/store/slices/contractorsSlice';
import {
    fetchRegistryRecords,
    fetchRegistrySources,
    setFilters as setRegistryFilters,
    resetFilters as resetRegistryFilters,
    setSource as setRegistrySource,
    setPage as setRegistryPage,
    setPageSize as setRegistryPageSize,
    setSorting as setRegistrySorting,
    hydrateFromUrl as hydrateRegistryFromUrl,
    selectRegistryRecords,
    selectRegistryStatus,
    selectRegistryError,
    selectRegistryFilters,
    selectRegistryPagination,
    selectRegistrySorting,
    selectRegistrySources,
    selectRegistrySourcesStatus,
} from '@/store/slices/registrySlice';
import { PermitPagination } from '@/components/permits';
import {
    ContractorFiltersPanel,
    IdentityStrengthBadge,
    ContactabilityBadge,
    LicenseReadinessBadge,
    NameQualityFlag,
} from '@/components/contractors';
import { RegistryStatsCard, RegistryFiltersPanel, RegistryTable } from '@/components/registry';
import { ContractorFilters, ContractorRecord, RegistryFilters } from '@/types';
import { apiService } from '@/services/api';
import { hasRole } from '@/lib/roles';
import type { RootState } from '@/store/store';
import type { Role } from '@/lib/roles';

type ContractorsView = 'permit-contractors' | 'registry';

// Debounce helper
function useDebounce<T>(value: T, delay: number): T {
    const [debouncedValue, setDebouncedValue] = React.useState(value);

    useEffect(() => {
        const handler = setTimeout(() => setDebouncedValue(value), delay);
        return () => clearTimeout(handler);
    }, [value, delay]);

    return debouncedValue;
}

// ============================================================================
// Score Badge
// ============================================================================

const BUCKET_STYLES: Record<string, { label: string; classes: string }> = {
    strategic:      { label: 'Strategic',      classes: 'bg-amber-500/15 text-amber-400 border border-amber-500/20' },
    strong:         { label: 'Strong',          classes: 'bg-green-500/15 text-green-400 border border-green-500/20' },
    volume_engine:  { label: 'Volume',          classes: 'bg-blue-500/15 text-blue-400 border border-blue-500/20' },
    opportunistic:  { label: 'Opportunistic',   classes: 'bg-gray-500/15 text-gray-400 border border-gray-500/20' },
    unqualified:    { label: 'Unqualified',     classes: 'bg-red-500/10 text-red-500 border border-red-500/15' },
};

function ScoreBadge({ score, bucket }: { score: number | null; bucket: string | null }) {
    if (score === null || bucket === null) {
        return <span className="text-gray-600 text-xs">—</span>;
    }
    const style = BUCKET_STYLES[bucket] ?? { label: bucket, classes: 'bg-gray-500/15 text-gray-400' };
    return (
        <div className="flex flex-col items-start gap-0.5">
            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wide ${style.classes}`}>
                {bucket === 'strategic' && <Star size={9} className="shrink-0" />}
                {style.label}
            </span>
            <span className="text-xs font-mono text-gray-500">{score.toFixed(0)}/100</span>
        </div>
    );
}

// ============================================================================
// Contractor Table Row
// ============================================================================

function ContractorRow({
    contractor,
    canSendCard,
}: {
    contractor: ContractorRecord;
    canSendCard: boolean;
}) {
    const router = useRouter();
    const types = contractor.contractor_types;
    const [sending, setSending] = useState(false);
    const [sent, setSent] = useState(false);
    const [sendError, setSendError] = useState<string | null>(null);

    const isQualified = contractor.score_bucket === 'strategic' || contractor.score_bucket === 'strong';

    const handleSendCard = useCallback(async () => {
        setSending(true);
        setSendError(null);
        try {
            const result = await apiService.sendRetainerCard(contractor.id);
            if (result.success) {
                setSent(true);
            } else {
                setSendError(result.error || 'Failed to send');
            }
        } catch {
            setSendError('Request failed');
        } finally {
            setSending(false);
        }
    }, [contractor.id]);

    return (
        <tr
            onClick={() => router.push(`/dashboard/contractors/${contractor.id}`)}
            className="border-b border-gray-100 dark:border-white/4 hover:bg-gray-50 dark:hover:bg-white/3 transition-colors cursor-pointer"
        >
            {/* Name */}
            <td className="px-4 py-3">
                <div className="flex items-center gap-1.5">
                    <span
                        className="font-medium text-gray-700 dark:text-gray-200 truncate max-w-[200px]"
                        title={contractor.name_quality === 'questionable' ? `${contractor.name} (may not be a real business name)` : contractor.name}
                    >
                        {contractor.name}
                    </span>
                    <NameQualityFlag value={contractor.name_quality} />
                </div>
                {contractor.license_number && (
                    <div className="text-xs text-gray-500 mt-0.5">
                        {contractor.license_number}
                    </div>
                )}
            </td>

            {/* Score */}
            <td className="px-4 py-3">
                <ScoreBadge score={contractor.lead_score} bucket={contractor.score_bucket} />
            </td>

            {/* Type(s) */}
            <td className="px-4 py-3">
                <div className="flex flex-wrap gap-1">
                    {types.length > 0 ? (
                        types.map((t, i) => (
                            <span
                                key={i}
                                className="inline-block px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 text-[11px] font-medium"
                            >
                                {t}
                            </span>
                        ))
                    ) : (
                        <span className="text-gray-600 text-sm">-</span>
                    )}
                </div>
            </td>

            {/* Email */}
            <td className="px-4 py-3">
                {contractor.email ? (
                    <a
                        href={`mailto:${contractor.email}`}
                        onClick={(e) => e.stopPropagation()}
                        className="flex items-center gap-1.5 text-sm text-gray-600 dark:text-gray-300 hover:text-cyan-400 transition-colors truncate max-w-[200px]"
                        title={contractor.email}
                    >
                        <Mail size={13} className="shrink-0 text-gray-500" />
                        {contractor.email}
                    </a>
                ) : (
                    <span className="text-gray-600 text-sm">-</span>
                )}
            </td>

            {/* Phone */}
            <td className="px-4 py-3">
                {contractor.phone ? (
                    <div className="flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400">
                        <Phone size={13} className="shrink-0 text-gray-500" />
                        {contractor.phone}
                    </div>
                ) : (
                    <span className="text-gray-600 text-sm">-</span>
                )}
            </td>

            {/* City */}
            <td className="px-4 py-3">
                {contractor.city ? (
                    <div className="flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400">
                        <MapPin size={13} className="shrink-0 text-gray-500" />
                        {contractor.city}
                        {contractor.state_code ? `, ${contractor.state_code}` : ''}
                    </div>
                ) : (
                    <span className="text-gray-600 text-sm">-</span>
                )}
            </td>

            {/* Permits */}
            <td className="px-4 py-3 text-center">
                <div className="flex items-center justify-center gap-1.5 text-sm">
                    <FileText size={13} className="text-gray-500" />
                    <span className="text-gray-600 dark:text-gray-300">{contractor.permit_count}</span>
                </div>
            </td>

            {/* Identity Strength */}
            <td className="px-4 py-3">
                <IdentityStrengthBadge value={contractor.identity_strength} />
            </td>

            {/* Contactability */}
            <td className="px-4 py-3">
                <ContactabilityBadge value={contractor.contactability} />
            </td>

            {/* License Readiness */}
            <td className="px-4 py-3">
                <LicenseReadinessBadge value={contractor.license_readiness} />
            </td>

            {/* Send Card */}
            {canSendCard && (
                <td className="px-4 py-3 text-center">
                    {isQualified && contractor.email ? (
                        <div className="flex flex-col items-center gap-0.5">
                            <button
                                onClick={(e) => { e.stopPropagation(); handleSendCard(); }}
                                disabled={sending || sent}
                                title={sent ? 'Card sent' : 'Send retainer card'}
                                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-colors disabled:opacity-60
                                    ${sent
                                        ? 'bg-green-500/15 text-green-400 border border-green-500/20'
                                        : 'bg-amber-500/10 text-amber-400 border border-amber-500/20 hover:bg-amber-500/20'
                                    }`}
                            >
                                <Send size={11} className={sending ? 'animate-pulse' : ''} />
                                {sent ? 'Sent' : sending ? 'Sending…' : 'Send Card'}
                            </button>
                            {sendError && (
                                <span className="text-[10px] text-red-400 max-w-25 text-center leading-tight">{sendError}</span>
                            )}
                        </div>
                    ) : (
                        <span className="text-gray-700 text-xs">—</span>
                    )}
                </td>
            )}
        </tr>
    );
}

// ============================================================================
// Sortable Header
// ============================================================================

function SortHeader({
    label,
    field,
    currentField,
    currentDirection,
    onSort,
    className = '',
}: {
    label: string;
    field: string;
    currentField: string;
    currentDirection: 'asc' | 'desc';
    onSort: (field: string) => void;
    className?: string;
}) {
    const isActive = currentField === field;
    return (
        <th
            className={`px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:text-gray-700 dark:hover:text-gray-200 transition-colors select-none ${className}`}
            onClick={() => onSort(field)}
        >
            <div className="flex items-center gap-1">
                {label}
                {isActive ? (
                    currentDirection === 'desc' ? (
                        <ChevronDown size={14} className="text-cyan-400" />
                    ) : (
                        <ChevronUp size={14} className="text-cyan-400" />
                    )
                ) : (
                    <ArrowUpDown size={12} className="text-gray-600" />
                )}
            </div>
        </th>
    );
}

// ============================================================================
// Main Page Content
// ============================================================================

function ContractorsPageContent() {
    const dispatch = useAppDispatch();
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();

    // Which dataset is showing — "Permit Contractors" (the permit-linked
    // directory, existing) vs "Official Registry" (synced state license
    // registries, new). Never merged: separate Redux slices, separate API
    // endpoints, separate URL-sync effects below (each guarded by `view` so
    // they don't clobber each other's query params).
    const [view, setView] = useState<ContractorsView>(() =>
        searchParams.get('view') === 'registry' ? 'registry' : 'permit-contractors'
    );

    const contractors = useAppSelector(selectContractors);
    const status = useAppSelector(selectContractorsStatus);
    const error = useAppSelector(selectContractorsError);
    const filters = useAppSelector(selectContractorFilters);
    const pagination = useAppSelector(selectContractorPagination);
    const sorting = useAppSelector(selectContractorSorting);
    const availableTypes = useAppSelector(selectAvailableTypes);
    const availableStates = useAppSelector(selectAvailableStates);
    const availableCities = useAppSelector(selectAvailableCities);

    const registryRecords = useAppSelector(selectRegistryRecords);
    const registryStatus = useAppSelector(selectRegistryStatus);
    const registryError = useAppSelector(selectRegistryError);
    const registryFilters = useAppSelector(selectRegistryFilters);
    const registryPagination = useAppSelector(selectRegistryPagination);
    const registrySorting = useAppSelector(selectRegistrySorting);
    const registrySources = useAppSelector(selectRegistrySources);
    const registrySourcesStatus = useAppSelector(selectRegistrySourcesStatus);

    const { user } = useSelector((s: RootState) => s.auth);
    const userRole = (user?.role ?? 'viewer') as Role;
    const canSendCard = hasRole(userRole, 'outreach');

    const debouncedSearch = useDebounce(filters.search, 300);
    const debouncedRegistrySearch = useDebounce(registryFilters.search, 300);
    const debouncedRegistryLicense = useDebounce(registryFilters.licenseNumber, 300);

    // Hydrate from URL on mount
    useEffect(() => {
        const urlFilters: Partial<ContractorFilters> = {};
        const search = searchParams.get('search');
        const type = searchParams.get('type');
        const city = searchParams.get('city');

        if (search) urlFilters.search = search;
        if (type) urlFilters.contractorType = type;
        if (city) urlFilters.city = city;

        const page = searchParams.get('page');
        const pageSize = searchParams.get('pageSize');
        const sortField = searchParams.get('sort');
        const sortDir = searchParams.get('dir') as 'asc' | 'desc' | null;

        dispatch(hydrateFromUrl({
            filters: Object.keys(urlFilters).length > 0 ? urlFilters : undefined,
            page: page ? parseInt(page) : undefined,
            pageSize: pageSize ? parseInt(pageSize) : undefined,
            sortField: sortField || undefined,
            sortDir: sortDir || undefined,
        }));

        dispatch(fetchContractorTypes());
        dispatch(fetchContractorStates());

        // Registry hydration uses r-prefixed param names so it never
        // collides with the contractor params parsed above when both
        // happen to be present in the URL at once.
        const registryUrlFilters: Partial<RegistryFilters> = {};
        const source = searchParams.get('source');
        const rsearch = searchParams.get('rsearch');
        const rlicense = searchParams.get('rlicense');
        const rcity = searchParams.get('rcity');
        const rstate = searchParams.get('rstate');
        const rzip = searchParams.get('rzip');
        const rcurrent = searchParams.get('rcurrent');

        if (source) registryUrlFilters.sourceKey = source;
        if (rsearch) registryUrlFilters.search = rsearch;
        if (rlicense) registryUrlFilters.licenseNumber = rlicense;
        if (rcity) registryUrlFilters.city = rcity;
        if (rstate) registryUrlFilters.addressState = rstate;
        if (rzip) registryUrlFilters.zip = rzip;
        if (rcurrent) registryUrlFilters.isCurrent = rcurrent === 'true';

        const rpage = searchParams.get('rpage');
        const rpageSize = searchParams.get('rpageSize');
        const rsort = searchParams.get('rsort');
        const rdir = searchParams.get('rdir') as 'asc' | 'desc' | null;

        dispatch(hydrateRegistryFromUrl({
            filters: Object.keys(registryUrlFilters).length > 0 ? registryUrlFilters : undefined,
            page: rpage ? parseInt(rpage) : undefined,
            pageSize: rpageSize ? parseInt(rpageSize) : undefined,
            sortField: rsort || undefined,
            sortDir: rdir || undefined,
        }));

        // Cheap aggregate call — needed immediately for the Source selector
        // and stats card regardless of which tab is active on first paint.
        dispatch(fetchRegistrySources());
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    // Cascade City options off the selected State, mirroring the
    // Metro -> State -> County -> City filter hierarchy used elsewhere
    // (permits/counties page). Runs on mount too (stateCode starts null,
    // fetching the full unscoped city list), then re-fetches whenever the
    // State filter changes.
    useEffect(() => {
        dispatch(fetchContractorCities(filters.stateCode || undefined));
    }, [dispatch, filters.stateCode]);

    // Sync Permit Contractors state to URL — only while that tab is active,
    // so switching to Official Registry doesn't overwrite its own params.
    useEffect(() => {
        if (view !== 'permit-contractors') return;
        const params = new URLSearchParams();
        if (filters.search) params.set('search', filters.search);
        if (filters.contractorType) params.set('type', filters.contractorType);
        if (filters.city) params.set('city', filters.city);
        if (pagination.page > 1) params.set('page', pagination.page.toString());
        if (pagination.pageSize !== 25) params.set('pageSize', pagination.pageSize.toString());
        if (sorting.field !== 'name') params.set('sort', sorting.field);
        if (sorting.direction !== 'asc') params.set('dir', sorting.direction);

        const newUrl = params.toString() ? `${pathname}?${params}` : pathname;
        router.replace(newUrl, { scroll: false });
    }, [view, filters, pagination.page, pagination.pageSize, sorting, pathname, router]);

    // Sync Official Registry state to URL — mirror of the above, active
    // only on that tab.
    useEffect(() => {
        if (view !== 'registry') return;
        const params = new URLSearchParams();
        params.set('view', 'registry');
        if (registryFilters.sourceKey) params.set('source', registryFilters.sourceKey);
        if (registryFilters.search) params.set('rsearch', registryFilters.search);
        if (registryFilters.licenseNumber) params.set('rlicense', registryFilters.licenseNumber);
        if (registryFilters.city) params.set('rcity', registryFilters.city);
        if (registryFilters.addressState) params.set('rstate', registryFilters.addressState);
        if (registryFilters.zip) params.set('rzip', registryFilters.zip);
        if (!registryFilters.isCurrent) params.set('rcurrent', 'false');
        if (registryPagination.page > 1) params.set('rpage', registryPagination.page.toString());
        if (registryPagination.pageSize !== 50) params.set('rpageSize', registryPagination.pageSize.toString());
        if (registrySorting.field !== 'business_name') params.set('rsort', registrySorting.field);
        if (registrySorting.direction !== 'asc') params.set('rdir', registrySorting.direction);

        router.replace(`${pathname}?${params}`, { scroll: false });
    }, [view, registryFilters, registryPagination.page, registryPagination.pageSize, registrySorting, pathname, router]);

    // Fetch contractors when filters/pagination/sorting change
    useEffect(() => {
        dispatch(fetchContractors());
    }, [
        dispatch,
        filters.contractorType,
        filters.city,
        filters.stateCode,
        filters.hasEmail,
        filters.scoreBucket,
        filters.hasLicense,
        filters.hasPhone,
        filters.hasWebsite,
        filters.licenseReadiness,
        debouncedSearch,
        pagination.page,
        pagination.pageSize,
        sorting.field,
        sorting.direction,
    ]);

    // Fetch registry records when filters/pagination/sorting change
    useEffect(() => {
        dispatch(fetchRegistryRecords());
    }, [
        dispatch,
        registryFilters.sourceKey,
        registryFilters.licenseStatus,
        registryFilters.licenseType,
        registryFilters.businessType,
        registryFilters.city,
        registryFilters.addressState,
        registryFilters.zip,
        registryFilters.hasPhone,
        registryFilters.hasEmail,
        registryFilters.isCurrent,
        debouncedRegistrySearch,
        debouncedRegistryLicense,
        registryPagination.page,
        registryPagination.pageSize,
        registrySorting.field,
        registrySorting.direction,
    ]);

    const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        dispatch(setFilters({ search: e.target.value }));
    }, [dispatch]);

    const handleSearchClear = useCallback(() => {
        dispatch(setFilters({ search: '' }));
    }, [dispatch]);

    const handleTypeChange = useCallback((type: string | null) => {
        dispatch(setFilters({ contractorType: type }));
    }, [dispatch]);

    const handleBucketChange = useCallback((bucket: string | null) => {
        dispatch(setFilters({ scoreBucket: bucket }));
    }, [dispatch]);

    const handlePanelFilterChange = useCallback((patch: Partial<ContractorFilters>) => {
        dispatch(setFilters(patch));
    }, [dispatch]);

    const handleResetFilters = useCallback(() => {
        dispatch(resetFilters());
    }, [dispatch]);

    const handlePageChange = useCallback((page: number) => {
        dispatch(setPage(page));
    }, [dispatch]);

    const handlePageSizeChange = useCallback((size: number) => {
        dispatch(setPageSize(size));
    }, [dispatch]);

    const handleSort = useCallback((field: string) => {
        const newDirection: 'asc' | 'desc' =
            sorting.field === field && sorting.direction === 'asc' ? 'desc' : 'asc';
        dispatch(setSorting({ field, direction: newDirection }));
    }, [dispatch, sorting]);

    const handleRefresh = useCallback(() => {
        dispatch(fetchContractors());
    }, [dispatch]);

    const handleRegistrySourceChange = useCallback((sourceKey: string) => {
        dispatch(setRegistrySource(sourceKey));
    }, [dispatch]);

    const handleRegistryFilterChange = useCallback((patch: Partial<RegistryFilters>) => {
        dispatch(setRegistryFilters(patch));
    }, [dispatch]);

    const handleRegistryResetFilters = useCallback(() => {
        dispatch(resetRegistryFilters());
    }, [dispatch]);

    const handleRegistryPageChange = useCallback((page: number) => {
        dispatch(setRegistryPage(page));
    }, [dispatch]);

    const handleRegistryPageSizeChange = useCallback((size: number) => {
        dispatch(setRegistryPageSize(size));
    }, [dispatch]);

    const handleRegistrySort = useCallback((field: string) => {
        const newDirection: 'asc' | 'desc' =
            registrySorting.field === field && registrySorting.direction === 'asc' ? 'desc' : 'asc';
        dispatch(setRegistrySorting({ field, direction: newDirection }));
    }, [dispatch, registrySorting]);

    const handleRegistryRefresh = useCallback(() => {
        dispatch(fetchRegistryRecords());
    }, [dispatch]);

    const isLoading = status === 'loading';
    const isRegistryLoading = registryStatus === 'loading';

    const hasActiveFilters = Boolean(
        filters.search || filters.contractorType || filters.city || filters.stateCode || filters.hasEmail !== null || filters.scoreBucket ||
        filters.hasLicense !== null || filters.hasPhone !== null || filters.hasWebsite !== null || filters.licenseReadiness
    );

    const hasActiveRegistryFilters = Boolean(
        registryFilters.search || registryFilters.licenseNumber || registryFilters.licenseStatus ||
        registryFilters.licenseType || registryFilters.businessType || registryFilters.city ||
        registryFilters.addressState || registryFilters.zip || registryFilters.hasPhone !== null ||
        registryFilters.hasEmail !== null || !registryFilters.isCurrent
    );

    const selectedRegistrySource = registrySources.find((s) => s.source_key === registryFilters.sourceKey) ?? null;

    return (
        <div className="p-6 space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-linear-to-br from-orange-500 to-amber-600 flex items-center justify-center">
                            <HardHat size={20} />
                        </div>
                        Contractors
                    </h1>
                    <p className="text-gray-500 mt-1">
                        Browse and search licensed contractors
                    </p>
                </div>
                <button
                    onClick={view === 'registry' ? handleRegistryRefresh : handleRefresh}
                    disabled={view === 'registry' ? isRegistryLoading : isLoading}
                    className="flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/8 border border-gray-200 dark:border-white/10 rounded-lg text-gray-600 dark:text-gray-300 transition-colors disabled:opacity-50"
                >
                    <RefreshCw size={16} className={(view === 'registry' ? isRegistryLoading : isLoading) ? 'animate-spin' : ''} />
                    Refresh
                </button>
            </div>

            {/* View switcher — "Permit Contractors" (permit-linked directory) vs
                "Official Registry" (synced state license registries). Two
                distinct datasets, never merged — see plan Context section. */}
            <div className="flex items-center gap-1 p-1 bg-gray-100 dark:bg-white/4 rounded-xl w-fit">
                <button
                    onClick={() => setView('permit-contractors')}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                        view === 'permit-contractors'
                            ? 'bg-white dark:bg-white/10 text-gray-900 dark:text-white shadow-sm'
                            : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                    }`}
                >
                    <HardHat size={15} />
                    Permit Contractors
                </button>
                <button
                    onClick={() => setView('registry')}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                        view === 'registry'
                            ? 'bg-white dark:bg-white/10 text-gray-900 dark:text-white shadow-sm'
                            : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                    }`}
                >
                    <ShieldCheck size={15} />
                    Official Registry
                </button>
            </div>

            {view === 'permit-contractors' && (
            <>
            {/* Search + Filters */}
            <div className="flex flex-col sm:flex-row gap-4">
                {/* Search */}
                <div className="relative max-w-md flex-1">
                    <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                    <input
                        type="text"
                        value={filters.search}
                        onChange={handleSearchChange}
                        placeholder="Search by name, email, phone, license..."
                        className="w-full pl-10 pr-10 py-2.5 bg-gray-100 dark:bg-white/4 border border-gray-200 dark:border-white/8 rounded-xl text-gray-700 dark:text-gray-200 text-sm placeholder-gray-500 focus:outline-none focus:border-cyan-500/40 transition-colors"
                    />
                    {filters.search && (
                        <button
                            onClick={handleSearchClear}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300"
                        >
                            <X size={14} />
                        </button>
                    )}
                </div>

                {/* Type filter */}
                <div className="relative">
                    <select
                        value={filters.contractorType || ''}
                        onChange={(e) => handleTypeChange(e.target.value || null)}
                        className="pl-4 pr-8 py-2.5 bg-gray-100 dark:bg-white/4 border border-gray-200 dark:border-white/8 rounded-xl text-gray-700 dark:text-gray-200 text-sm appearance-none cursor-pointer focus:outline-none focus:border-cyan-500/40 transition-colors"
                    >
                        <option value="">All Types</option>
                        {availableTypes.map((t) => (
                            <option key={t} value={t}>{t}</option>
                        ))}
                    </select>
                    <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
                </div>

                {/* Score bucket filter */}
                <div className="relative">
                    <select
                        value={filters.scoreBucket || ''}
                        onChange={(e) => handleBucketChange(e.target.value || null)}
                        className="pl-4 pr-8 py-2.5 bg-gray-100 dark:bg-white/4 border border-gray-200 dark:border-white/8 rounded-xl text-gray-700 dark:text-gray-200 text-sm appearance-none cursor-pointer focus:outline-none focus:border-cyan-500/40 transition-colors"
                    >
                        <option value="">All Scores</option>
                        <option value="strategic">⭐ Strategic (85+)</option>
                        <option value="strong">Strong (70–84)</option>
                        <option value="volume_engine">Volume (55–69)</option>
                        <option value="opportunistic">Opportunistic (40–54)</option>
                        <option value="unqualified">Unqualified (&lt;40)</option>
                    </select>
                    <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
                </div>

                {/* Reset filters */}
                {hasActiveFilters && (
                    <button
                        onClick={handleResetFilters}
                        className="flex items-center gap-1.5 px-3 py-2 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
                    >
                        <X size={14} />
                        Clear filters
                    </button>
                )}
            </div>

            {/* Additional filters (Phase 2A, 2A.2) — state, city, has-license/phone/website, license readiness */}
            <ContractorFiltersPanel
                filters={filters}
                onFilterChange={handlePanelFilterChange}
                availableStates={availableStates}
                availableCities={availableCities}
            />

            {/* Error Banner */}
            {error && (
                <div className="flex items-center gap-3 p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400">
                    <AlertCircle size={20} />
                    <span>{error}</span>
                    <button
                        onClick={handleRefresh}
                        className="ml-auto text-sm underline hover:no-underline"
                    >
                        Try again
                    </button>
                </div>
            )}

            {/* Table */}
            <div className="bg-white dark:bg-white/2 border border-gray-200 dark:border-white/6 rounded-xl overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="border-b border-gray-200 dark:border-white/8 bg-gray-50 dark:bg-white/2">
                                <SortHeader
                                    label="Name"
                                    field="name"
                                    currentField={sorting.field}
                                    currentDirection={sorting.direction}
                                    onSort={handleSort}
                                />
                                <SortHeader
                                    label="Score"
                                    field="lead_score"
                                    currentField={sorting.field}
                                    currentDirection={sorting.direction}
                                    onSort={handleSort}
                                />
                                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                    Type(s)
                                </th>
                                <SortHeader
                                    label="Email"
                                    field="email"
                                    currentField={sorting.field}
                                    currentDirection={sorting.direction}
                                    onSort={handleSort}
                                />
                                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                    Phone
                                </th>
                                <SortHeader
                                    label="City"
                                    field="city"
                                    currentField={sorting.field}
                                    currentDirection={sorting.direction}
                                    onSort={handleSort}
                                />
                                <SortHeader
                                    label="Permits"
                                    field="permit_count"
                                    currentField={sorting.field}
                                    currentDirection={sorting.direction}
                                    onSort={handleSort}
                                    className="text-center"
                                />
                                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                    Identity
                                </th>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                    Contactability
                                </th>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                    License
                                </th>
                                {canSendCard && (
                                    <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                        Retainer
                                    </th>
                                )}
                            </tr>
                        </thead>
                        <tbody>
                            {isLoading ? (
                                Array.from({ length: 10 }).map((_, i) => (
                                    <tr key={i} className="border-b border-gray-100 dark:border-white/4">
                                        {Array.from({ length: canSendCard ? 11 : 10 }).map((_, j) => (
                                            <td key={j} className="px-4 py-3">
                                                <div className="h-4 bg-gray-200 dark:bg-white/4 rounded animate-pulse" />
                                            </td>
                                        ))}
                                    </tr>
                                ))
                            ) : contractors.length === 0 ? (
                                <tr>
                                    <td colSpan={canSendCard ? 11 : 10} className="px-4 py-20 text-center">
                                        <HardHat size={48} className="mx-auto mb-4 text-gray-600 opacity-40" />
                                        <p className="text-gray-500 text-lg mb-1">
                                            {hasActiveFilters ? 'No contractors match your filters' : 'No contractors found'}
                                        </p>
                                        <p className="text-gray-600 text-sm">
                                            {hasActiveFilters
                                                ? 'Try adjusting your search or filters'
                                                : 'Import contractors from a GeoJSON file to get started'
                                            }
                                        </p>
                                        {hasActiveFilters && (
                                            <button
                                                onClick={handleResetFilters}
                                                className="mt-4 px-4 py-2 bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/8 border border-gray-200 dark:border-white/10 rounded-lg text-gray-600 dark:text-gray-300 text-sm transition-colors"
                                            >
                                                Clear all filters
                                            </button>
                                        )}
                                    </td>
                                </tr>
                            ) : (
                                contractors.map((contractor) => (
                                    <ContractorRow key={contractor.id} contractor={contractor} canSendCard={canSendCard} />
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                {contractors.length > 0 && (
                    <div className="border-t border-gray-200 dark:border-white/6">
                        <PermitPagination
                            pagination={pagination}
                            onPageChange={handlePageChange}
                            onPageSizeChange={handlePageSizeChange}
                        />
                    </div>
                )}
            </div>
            </>
            )}

            {view === 'registry' && (
            <>
            {/* Registry Stats / Overview card — makes the "0 matched" reality
                visible up front (per plan section 6a) rather than only
                discoverable by scrolling an empty-feeling table. */}
            <RegistryStatsCard source={selectedRegistrySource} loading={registrySourcesStatus === 'loading' && registrySources.length === 0} />

            {/* Source selector + filters */}
            <RegistryFiltersPanel
                filters={registryFilters}
                onFilterChange={handleRegistryFilterChange}
                onSourceChange={handleRegistrySourceChange}
                sources={registrySources}
            />

            {/* Error Banner */}
            {registryError && (
                <div className="flex items-center gap-3 p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400">
                    <AlertCircle size={20} />
                    <span>{registryError}</span>
                    <button
                        onClick={handleRegistryRefresh}
                        className="ml-auto text-sm underline hover:no-underline"
                    >
                        Try again
                    </button>
                </div>
            )}

            {/* Table */}
            <div className="bg-white dark:bg-white/2 border border-gray-200 dark:border-white/6 rounded-xl overflow-hidden">
                <RegistryTable
                    records={registryRecords}
                    isLoading={isRegistryLoading}
                    sorting={registrySorting}
                    onSort={handleRegistrySort}
                    onResetFilters={handleRegistryResetFilters}
                    hasFilters={hasActiveRegistryFilters}
                />

                {/* Pagination */}
                {registryRecords.length > 0 && (
                    <div className="border-t border-gray-200 dark:border-white/6">
                        <PermitPagination
                            pagination={registryPagination}
                            onPageChange={handleRegistryPageChange}
                            onPageSizeChange={handleRegistryPageSizeChange}
                        />
                    </div>
                )}
            </div>
            </>
            )}
        </div>
    );
}

// Loading fallback
function ContractorsPageLoading() {
    return (
        <div className="p-6 space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-linear-to-br from-orange-500 to-amber-600 flex items-center justify-center">
                        <HardHat size={20} />
                    </div>
                    Contractors
                </h1>
                <p className="text-gray-500 mt-1">Browse and search licensed contractors</p>
            </div>
            <div className="bg-white dark:bg-white/2 border border-gray-200 dark:border-white/6 rounded-xl overflow-hidden">
                <table className="w-full">
                    <tbody>
                        {Array.from({ length: 10 }).map((_, i) => (
                            <tr key={i} className="border-b border-gray-100 dark:border-white/4">
                                {Array.from({ length: 6 }).map((_, j) => (
                                    <td key={j} className="px-4 py-3">
                                        <div className="h-4 bg-gray-200 dark:bg-white/4 rounded animate-pulse" />
                                    </td>
                                ))}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

export default function ContractorsPage() {
    return (
        <Suspense fallback={<ContractorsPageLoading />}>
            <ContractorsPageContent />
        </Suspense>
    );
}
