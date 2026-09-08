'use client';

import React, { Suspense, useEffect, useCallback, useState } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import {
    HardHat,
    RefreshCw,
    AlertCircle,
    ChevronDown,
    ChevronUp,
    Mail,
    Phone,
    MapPin,
    FileText,
    ArrowUpDown,
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
import PageHeader from '@/components/common/PageHeader';
import { ContractorFilters, ContractorRecord, RegistryFilters } from '@/types';

type ContractorsView = 'permit-contractors' | 'registry';

// ============================================================================
// Contractor Table Row
// ============================================================================

function ContractorRow({ contractor }: { contractor: ContractorRecord }) {
    const router = useRouter();
    const types = contractor.contractor_types;

    return (
        <tr
            onClick={() => router.push(`/dashboard/contractors/${contractor.id}`)}
            className="border-b border-[#DFE6EE] hover:bg-[#F7F9FB] transition-colors cursor-pointer"
        >
            {/* Contractor */}
            <td className="px-4 py-3">
                <div className="flex items-center gap-1.5">
                    <span
                        className="font-medium text-[#0E2B5C] truncate max-w-[220px]"
                        title={contractor.name_quality === 'questionable' ? `${contractor.name} (may not be a real business name)` : contractor.name}
                    >
                        {contractor.name}
                    </span>
                    <NameQualityFlag value={contractor.name_quality} />
                </div>
                {types.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1">
                        {types.map((t, i) => (
                            <span
                                key={i}
                                className="inline-block px-1.5 py-0.5 rounded bg-[#F7F9FB] text-[#5B6B7D] text-[10px] font-medium border border-[#DFE6EE]"
                            >
                                {t}
                            </span>
                        ))}
                    </div>
                )}
            </td>

            {/* Permits */}
            <td className="px-4 py-3 text-center">
                <div className="flex items-center justify-center gap-1.5 text-sm">
                    <FileText size={13} className="text-[#5B6B7D]" />
                    <span className="text-[#0E2B5C] font-mono">{contractor.permit_count}</span>
                </div>
            </td>

            {/* Contactability */}
            <td className="px-4 py-3">
                <ContactabilityBadge value={contractor.contactability} />
            </td>

            {/* Identity */}
            <td className="px-4 py-3">
                <IdentityStrengthBadge value={contractor.identity_strength} />
            </td>

            {/* License */}
            <td className="px-4 py-3">
                <LicenseReadinessBadge value={contractor.license_readiness} />
                {contractor.license_number && (
                    <div className="text-xs text-[#5B6B7D] font-mono mt-0.5">{contractor.license_number}</div>
                )}
            </td>

            {/* Location */}
            <td className="px-4 py-3">
                {contractor.city ? (
                    <div className="flex items-center gap-1.5 text-sm text-[#5B6B7D]">
                        <MapPin size={13} className="shrink-0 text-[#5B6B7D]" />
                        {contractor.city}
                        {contractor.state_code ? `, ${contractor.state_code}` : ''}
                    </div>
                ) : (
                    <span className="text-[#5B6B7D] text-sm">—</span>
                )}
            </td>

            {/* Contact */}
            <td className="px-4 py-3">
                {contractor.email ? (
                    <a
                        href={`mailto:${contractor.email}`}
                        onClick={(e) => e.stopPropagation()}
                        className="flex items-center gap-1.5 text-sm text-[#00458B] hover:text-[#045CB4] transition-colors truncate max-w-[200px]"
                        title={contractor.email}
                    >
                        <Mail size={13} className="shrink-0" />
                        {contractor.email}
                    </a>
                ) : (
                    <span className="text-[#5B6B7D] text-sm">—</span>
                )}
                {contractor.phone && (
                    <div className="flex items-center gap-1.5 text-xs text-[#5B6B7D] mt-0.5">
                        <Phone size={11} className="shrink-0" />
                        {contractor.phone}
                    </div>
                )}
            </td>
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
            className={`px-4 py-3 text-left text-xs font-semibold text-[#5B6B7D] uppercase tracking-wider cursor-pointer hover:text-[#0E2B5C] transition-colors select-none ${className}`}
            onClick={() => onSort(field)}
        >
            <div className="flex items-center gap-1">
                {label}
                {isActive ? (
                    currentDirection === 'desc' ? (
                        <ChevronDown size={14} className="text-[#00458B]" />
                    ) : (
                        <ChevronUp size={14} className="text-[#00458B]" />
                    )
                ) : (
                    <ArrowUpDown size={12} className="text-[#5B6B7D] opacity-50" />
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
    // registries). Never merged: separate Redux slices, separate API
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

    // Debounce helper
    function useDebounce<T>(value: T, delay: number): T {
        const [debouncedValue, setDebouncedValue] = React.useState(value);
        useEffect(() => {
            const handler = setTimeout(() => setDebouncedValue(value), delay);
            return () => clearTimeout(handler);
        }, [value, delay]);
        return debouncedValue;
    }

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

    const handleSearchChange = useCallback((value: string) => {
        dispatch(setFilters({ search: value }));
    }, [dispatch]);

    const handleSearchClear = useCallback(() => {
        dispatch(setFilters({ search: '' }));
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
        filters.search || filters.contractorType || filters.city || filters.stateCode || filters.hasEmail !== null ||
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
        <div className="p-6 lg:p-8 space-y-4 bg-[#F7F9FB] min-h-screen">
            <PageHeader
                icon={HardHat}
                title="Contractors"
                subtitle="Browse and review permit-linked contractors"
                actions={
                    <button
                        onClick={view === 'registry' ? handleRegistryRefresh : handleRefresh}
                        disabled={view === 'registry' ? isRegistryLoading : isLoading}
                        className="flex items-center gap-2 px-4 py-2 bg-white hover:bg-[#F7F9FB] border border-[#DFE6EE] rounded-lg text-[#0E2B5C] transition-colors disabled:opacity-50"
                    >
                        <RefreshCw size={16} className={(view === 'registry' ? isRegistryLoading : isLoading) ? 'animate-spin' : ''} />
                        Refresh
                    </button>
                }
            />

            {/* View switcher — "Permit Contractors" (permit-linked directory) vs
                "Official Registry" (synced state license registries). Two
                distinct datasets, never merged. */}
            <div className="flex items-center gap-1 p-1 bg-white border border-[#DFE6EE] rounded-lg w-fit">
                <button
                    onClick={() => setView('permit-contractors')}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                        view === 'permit-contractors'
                            ? 'bg-[#00458B] text-white'
                            : 'text-[#5B6B7D] hover:text-[#0E2B5C] hover:bg-[#F7F9FB]'
                    }`}
                >
                    <HardHat size={15} />
                    Permit Contractors
                </button>
                <button
                    onClick={() => setView('registry')}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                        view === 'registry'
                            ? 'bg-[#00458B] text-white'
                            : 'text-[#5B6B7D] hover:text-[#0E2B5C] hover:bg-[#F7F9FB]'
                    }`}
                >
                    <ShieldCheck size={15} />
                    Official Registry
                </button>
            </div>

            {view === 'permit-contractors' && (
            <>
            {/* Compact filter toolbar */}
            <ContractorFiltersPanel
                filters={filters}
                onFilterChange={handlePanelFilterChange}
                onReset={handleResetFilters}
                availableStates={availableStates}
                availableCities={availableCities}
                availableTypes={availableTypes}
                searchValue={filters.search}
                onSearchChange={handleSearchChange}
                onSearchClear={handleSearchClear}
            />

            {/* Error Banner */}
            {error && (
                <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700">
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
            <div className="bg-white border border-[#DFE6EE] rounded-xl overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="border-b border-[#DFE6EE] bg-[#F7F9FB]">
                                <SortHeader
                                    label="Contractor"
                                    field="name"
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
                                <th className="px-4 py-3 text-left text-xs font-semibold text-[#5B6B7D] uppercase tracking-wider">
                                    Contactability
                                </th>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-[#5B6B7D] uppercase tracking-wider">
                                    Identity Strength
                                </th>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-[#5B6B7D] uppercase tracking-wider">
                                    License
                                </th>
                                <SortHeader
                                    label="Location"
                                    field="city"
                                    currentField={sorting.field}
                                    currentDirection={sorting.direction}
                                    onSort={handleSort}
                                />
                                <SortHeader
                                    label="Contact"
                                    field="email"
                                    currentField={sorting.field}
                                    currentDirection={sorting.direction}
                                    onSort={handleSort}
                                />
                            </tr>
                        </thead>
                        <tbody>
                            {isLoading ? (
                                Array.from({ length: 10 }).map((_, i) => (
                                    <tr key={i} className="border-b border-[#DFE6EE]">
                                        {Array.from({ length: 7 }).map((_, j) => (
                                            <td key={j} className="px-4 py-3">
                                                <div className="h-4 bg-[#DFE6EE] rounded animate-pulse" />
                                            </td>
                                        ))}
                                    </tr>
                                ))
                            ) : contractors.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="px-4 py-20 text-center">
                                        <HardHat size={48} className="mx-auto mb-4 text-[#DFE6EE]" />
                                        <p className="text-[#0E2B5C] text-lg mb-1">
                                            {hasActiveFilters ? 'No contractors match your filters' : 'No contractors found'}
                                        </p>
                                        <p className="text-[#5B6B7D] text-sm">
                                            {hasActiveFilters
                                                ? 'Try adjusting your search or filters'
                                                : 'Import contractors from a GeoJSON file to get started'
                                            }
                                        </p>
                                        {hasActiveFilters && (
                                            <button
                                                onClick={handleResetFilters}
                                                className="mt-4 px-4 py-2 bg-white hover:bg-[#F7F9FB] border border-[#DFE6EE] rounded-lg text-[#0E2B5C] text-sm transition-colors"
                                            >
                                                Clear all filters
                                            </button>
                                        )}
                                    </td>
                                </tr>
                            ) : (
                                contractors.map((contractor) => (
                                    <ContractorRow key={contractor.id} contractor={contractor} />
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                {contractors.length > 0 && (
                    <div className="border-t border-[#DFE6EE]">
                        <PermitPagination
                            pagination={pagination}
                            onPageChange={handlePageChange}
                            onPageSizeChange={handlePageSizeChange}
                            itemLabel="contractors"
                        />
                    </div>
                )}
            </div>
            </>
            )}

            {view === 'registry' && (
            <>
            {/* Registry Stats / Overview card — makes the "0 matched" reality
                visible up front rather than only discoverable by scrolling an
                empty-feeling table. */}
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
                <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700">
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
            <div className="bg-white border border-[#DFE6EE] rounded-xl overflow-hidden">
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
                    <div className="border-t border-[#DFE6EE]">
                        <PermitPagination
                            pagination={registryPagination}
                            onPageChange={handleRegistryPageChange}
                            onPageSizeChange={handleRegistryPageSizeChange}
                            itemLabel="records"
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
        <div className="p-6 lg:p-8 space-y-4 bg-[#F7F9FB] min-h-screen">
            <PageHeader
                icon={HardHat}
                title="Contractors"
                subtitle="Browse and review permit-linked contractors"
            />
            <div className="bg-white border border-[#DFE6EE] rounded-xl overflow-hidden">
                <table className="w-full">
                    <tbody>
                        {Array.from({ length: 10 }).map((_, i) => (
                            <tr key={i} className="border-b border-[#DFE6EE]">
                                {Array.from({ length: 7 }).map((_, j) => (
                                    <td key={j} className="px-4 py-3">
                                        <div className="h-4 bg-[#DFE6EE] rounded animate-pulse" />
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
