'use client';

import React, { Suspense, useEffect, useCallback, useState } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { FileText, RefreshCw, AlertCircle, Trash2, X } from 'lucide-react';
import { useAppDispatch, useAppSelector } from '@/hooks/useAppDispatch';
import { hasRole } from '@/lib/roles';
import {
    fetchPermits,
    fetchPermitCities,
    fetchPermitCounties,
    bulkDeletePermits,
    setFilters,
    resetFilters,
    setPage,
    setPageSize,
    setSorting,
    hydrateFromUrl,
    selectPermits,
    selectPermitsStatus,
    selectPermitsError,
    selectPermitFilters,
    selectPermitPagination,
    selectPermitSorting,
    selectAvailableCities,
    selectAvailableCounties,
} from '@/store/slices/permitsSlice';
import {
    PermitTable,
    PermitSearch,
    PermitFiltersPanel,
    PermitPagination,
    PermitTableSkeleton,
} from '@/components/permits';
import { PermitFilters } from '@/types';

// Debounce helper
function useDebounce<T>(value: T, delay: number): T {
    const [debouncedValue, setDebouncedValue] = React.useState(value);

    useEffect(() => {
        const handler = setTimeout(() => setDebouncedValue(value), delay);
        return () => clearTimeout(handler);
    }, [value, delay]);

    return debouncedValue;
}

// Saved views control only the workflow filters (qualification, hasContractor) — every
// other active filter (state/city/county, project type, dates, value, work scope, etc.)
// is preserved when switching views. `isExcluded` is always cleared alongside — it's a
// legacy hidden field that predates `qualification` and must not silently conflict with it.
const SAVED_VIEWS: { key: string; label: string; qualification: string | null; hasContractor: boolean | null }[] = [
    { key: 'all', label: 'All Permits', qualification: null, hasContractor: null },
    { key: 'qualified', label: 'Qualified', qualification: 'qualified', hasContractor: null },
    { key: 'contractor_verification', label: 'Contractor Verification', qualification: 'qualified', hasContractor: false },
    { key: 'invalid', label: 'Invalid / Excluded', qualification: 'invalid', hasContractor: null },
];

// Inner component that uses useSearchParams
function PermitsPageContent() {
    const dispatch = useAppDispatch();
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();

    // Redux selectors
    const permits = useAppSelector(selectPermits);
    const status = useAppSelector(selectPermitsStatus);
    const error = useAppSelector(selectPermitsError);
    const filters = useAppSelector(selectPermitFilters);
    const pagination = useAppSelector(selectPermitPagination);
    const sorting = useAppSelector(selectPermitSorting);
    const availableCities = useAppSelector(selectAvailableCities);
    const availableCounties = useAppSelector(selectAvailableCounties);

    // Delete is admin/super_admin only (backend already enforces this — see
    // require_role("admin") on /permits/bulk in app/routers/permits.py). This gate
    // hides the selection checkboxes and delete UI client-side for everyone else.
    const userRole = useAppSelector((s) => s.auth.user?.role) ?? 'viewer';
    const canDelete = hasRole(userRole, 'admin');

    // Debounce the entire filter object so any rapid filter change (city, county,
    // score bucket, etc.) waits 300 ms before triggering a network request.
    const debouncedFilters = useDebounce(filters, 300);

    // Hydrate from URL on mount
    useEffect(() => {
        const urlFilters: Partial<PermitFilters> = {};
        const city = searchParams.get('city');
        const stateParam = searchParams.get('state');
        const metro = searchParams.get('metro');
        const county = searchParams.get('county');
        const opportunityCategory = searchParams.get('opportunity');
        const issuedAgeBucket = searchParams.get('age_bucket');
        const projectClass = searchParams.get('project_class');
        const workScope = searchParams.get('work_scope');
        const search = searchParams.get('search');
        const startDate = searchParams.get('start_date');
        const endDate = searchParams.get('end_date');
        const qualification = searchParams.get('qualification');
        const hasContractorParam = searchParams.get('has_contractor');
        const addedStartDate = searchParams.get('added_start_date');
        const addedEndDate = searchParams.get('added_end_date');

        if (city) urlFilters.city = city;
        if (stateParam) urlFilters.state = stateParam;
        if (metro) urlFilters.metro = metro;
        if (county) urlFilters.county = county;
        if (opportunityCategory) urlFilters.opportunityCategory = opportunityCategory;
        if (issuedAgeBucket) urlFilters.issuedAgeBucket = issuedAgeBucket;
        if (projectClass) urlFilters.projectClass = projectClass;
        if (workScope) urlFilters.workScope = workScope;
        if (search) urlFilters.search = search;
        if (startDate) urlFilters.startDate = startDate;
        if (endDate) urlFilters.endDate = endDate;
        if (qualification) urlFilters.qualification = qualification;
        if (hasContractorParam !== null) urlFilters.hasContractor = hasContractorParam === 'true';
        if (addedStartDate) urlFilters.addedStartDate = addedStartDate;
        if (addedEndDate) urlFilters.addedEndDate = addedEndDate;

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

        // Fetch cities/counties only if not already loaded — these are static
        // reference data that don't need to be re-fetched on every page visit.
        if (!availableCities.length) dispatch(fetchPermitCities());
        if (!availableCounties.length) dispatch(fetchPermitCounties());
    }, []); // Only on mount

    // Sync state to URL
    useEffect(() => {
        const params = new URLSearchParams();

        if (filters.city) params.set('city', filters.city);
        if (filters.state) params.set('state', filters.state);
        if (filters.metro) params.set('metro', filters.metro);
        if (filters.county) params.set('county', filters.county);
        if (filters.opportunityCategory) params.set('opportunity', filters.opportunityCategory);
        if (filters.issuedAgeBucket) params.set('age_bucket', filters.issuedAgeBucket);
        if (filters.projectClass) params.set('project_class', filters.projectClass);
        if (filters.workScope) params.set('work_scope', filters.workScope);
        if (filters.search) params.set('search', filters.search);
        if (filters.startDate) params.set('start_date', filters.startDate);
        if (filters.endDate) params.set('end_date', filters.endDate);
        if (filters.qualification) params.set('qualification', filters.qualification);
        if (filters.hasContractor !== null) params.set('has_contractor', String(filters.hasContractor));
        if (filters.addedStartDate) params.set('added_start_date', filters.addedStartDate);
        if (filters.addedEndDate) params.set('added_end_date', filters.addedEndDate);
        if (pagination.page > 1) params.set('page', pagination.page.toString());
        if (pagination.pageSize !== 25) params.set('pageSize', pagination.pageSize.toString());
        if (sorting.field !== 'issue_date') params.set('sort', sorting.field);
        if (sorting.direction !== 'desc') params.set('dir', sorting.direction);

        const newUrl = params.toString() ? `${pathname}?${params}` : pathname;
        router.replace(newUrl, { scroll: false });
    }, [filters, pagination.page, pagination.pageSize, sorting, pathname, router]);

    // Fetch permits when filters/pagination/sorting change.
    // debouncedFilters absorbs rapid consecutive filter changes (city, county,
    // score bucket, etc.) and only fires the network request once they settle.
    // Page, pageSize, and sorting are intentionally left outside the debounce
    // so explicit user navigation clicks remain instant.
    useEffect(() => {
        dispatch(fetchPermits());
    }, [
        dispatch,
        debouncedFilters,
        pagination.page,
        pagination.pageSize,
        sorting.field,
        sorting.direction,
    ]);

    // Handlers
    const handleFilterChange = useCallback((newFilters: Partial<PermitFilters>) => {
        dispatch(setFilters(newFilters));
    }, [dispatch]);

    const handleResetFilters = useCallback(() => {
        dispatch(resetFilters());
    }, [dispatch]);

    const handleSearchChange = useCallback((search: string) => {
        dispatch(setFilters({ search }));
    }, [dispatch]);

    const handleSearchClear = useCallback(() => {
        dispatch(setFilters({ search: '' }));
    }, [dispatch]);

    const handlePageChange = useCallback((page: number) => {
        dispatch(setPage(page));
    }, [dispatch]);

    const handlePageSizeChange = useCallback((size: number) => {
        dispatch(setPageSize(size));
    }, [dispatch]);

    const handleSort = useCallback((field: string) => {
        const newDirection: 'asc' | 'desc' =
            sorting.field === field && sorting.direction === 'desc' ? 'asc' : 'desc';
        dispatch(setSorting({ field, direction: newDirection }));
    }, [dispatch, sorting]);

    const handleRefresh = useCallback(() => {
        dispatch(fetchPermits({ force: true }));
    }, [dispatch]);

    const handleViewDetails = useCallback((permit: { id: string }) => {
        router.push(`/dashboard/permits/${permit.id}`);
    }, [router]);

    // Saved views — set only the workflow filters, preserving everything else.
    const handleSelectView = useCallback((view: typeof SAVED_VIEWS[number]) => {
        dispatch(setFilters({
            qualification: view.qualification,
            hasContractor: view.hasContractor,
            isExcluded: null,
        }));
    }, [dispatch]);

    const activeViewKey = SAVED_VIEWS.find(
        (v) => v.qualification === filters.qualification && v.hasContractor === filters.hasContractor
    )?.key ?? null;

    // Check if any filters are active (for empty state messaging)
    const hasActiveFilters = Boolean(
        filters.city ||
        filters.county ||
        filters.metro ||
        filters.opportunityCategory ||
        filters.projectClass ||
        filters.workScope ||
        filters.search ||
        filters.startDate ||
        filters.endDate ||
        filters.addedStartDate ||
        filters.addedEndDate ||
        filters.minCost ||
        filters.maxCost ||
        filters.qualification ||
        filters.hasContractor != null
    );

    // Selection state for admin/super_admin explicit-ID delete. No filter-scoped
    // "select all N across pages" escalation — deletion is limited to explicitly
    // selected rows on the current page (see DELETE SAFETY note below).
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);

    const allSelected = permits.length > 0 && permits.every((p) => selectedIds.has(p.id));
    const someSelected = selectedIds.size > 0;

    // Clear selection when filters/page/sorting change
    useEffect(() => {
        setSelectedIds(new Set());
    }, [filters, pagination.page, pagination.pageSize, sorting]);

    const handleToggleSelect = useCallback((id: string) => {
        setSelectedIds((prev) => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    }, []);

    const handleToggleSelectAll = useCallback(() => {
        if (allSelected) {
            setSelectedIds(new Set());
        } else {
            setSelectedIds(new Set(permits.map((p) => p.id)));
        }
    }, [allSelected, permits]);

    const handleBulkDelete = useCallback(async () => {
        if (selectedIds.size === 0) return;
        setIsDeleting(true);
        try {
            await dispatch(bulkDeletePermits(Array.from(selectedIds))).unwrap();
            setSelectedIds(new Set());
            setShowDeleteConfirm(false);
            dispatch(fetchPermits({ force: true }));
        } catch {
            // Error is set in Redux state
        } finally {
            setIsDeleting(false);
        }
    }, [dispatch, selectedIds]);

    const isLoading = status === 'loading';

    return (
        <div className="p-6 space-y-6 bg-[#F7F9FB] min-h-screen">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-[#0E2B5C] flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-[#00458B] flex items-center justify-center text-white">
                            <FileText size={20} />
                        </div>
                        Permit Records
                    </h1>
                    <p className="text-[#5B6B7D] mt-1">
                        Browse and search building permits from multiple cities
                    </p>
                </div>
                <button
                    onClick={handleRefresh}
                    disabled={isLoading}
                    className="flex items-center gap-2 px-4 py-2 bg-white hover:bg-[#F7F9FB] border border-[#DFE6EE] rounded-lg text-[#0E2B5C] transition-colors disabled:opacity-50"
                >
                    <RefreshCw size={16} className={isLoading ? 'animate-spin' : ''} />
                    Refresh
                </button>
            </div>

            {/* Saved Views */}
            <div className="flex items-center gap-2 flex-wrap">
                {SAVED_VIEWS.map((view) => {
                    const isActive = activeViewKey === view.key;
                    return (
                        <button
                            key={view.key}
                            onClick={() => handleSelectView(view)}
                            className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
                                isActive
                                    ? 'bg-[#00458B] text-white border-[#00458B]'
                                    : 'bg-white text-[#0E2B5C] border-[#DFE6EE] hover:bg-[#F7F9FB]'
                            }`}
                        >
                            {view.label}
                        </button>
                    );
                })}
            </div>

            {/* Search Bar */}
            <div className="max-w-md">
                <PermitSearch
                    value={filters.search}
                    onChange={handleSearchChange}
                    onClear={handleSearchClear}
                    placeholder="Search by address, permit #, description..."
                />
            </div>

            {/* Filters */}
            <PermitFiltersPanel
                filters={filters}
                availableCities={availableCities}
                availableCounties={availableCounties}
                onFilterChange={handleFilterChange}
                onReset={handleResetFilters}
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

            {/* Bulk Action Bar — admin/super_admin only, explicit selected-ID delete */}
            {canDelete && someSelected && (
                <div className="flex items-center gap-4 px-4 py-3 bg-[#00458B]/5 border border-[#00458B]/20 rounded-xl">
                    <span className="text-sm text-[#00458B] font-medium">
                        {selectedIds.size} permit{selectedIds.size !== 1 ? 's' : ''} selected
                    </span>
                    <button
                        onClick={() => setShowDeleteConfirm(true)}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-red-50 hover:bg-red-100 border border-red-200 rounded-lg text-red-700 text-sm font-medium transition-colors"
                    >
                        <Trash2 size={14} />
                        Delete Selected
                    </button>
                    <button
                        onClick={() => setSelectedIds(new Set())}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-[#F7F9FB] border border-[#DFE6EE] rounded-lg text-[#5B6B7D] text-sm transition-colors"
                    >
                        <X size={14} />
                        Clear Selection
                    </button>
                </div>
            )}

            {/* Table */}
            <div className="bg-white border border-[#DFE6EE] rounded-xl overflow-hidden">
                <PermitTable
                    permits={permits}
                    isLoading={isLoading}
                    sorting={sorting}
                    onSort={handleSort}
                    onViewDetails={handleViewDetails}
                    onResetFilters={handleResetFilters}
                    hasFilters={hasActiveFilters}
                    selectedIds={canDelete ? selectedIds : undefined}
                    onToggleSelect={canDelete ? handleToggleSelect : undefined}
                    onToggleSelectAll={canDelete ? handleToggleSelectAll : undefined}
                    allSelected={canDelete && allSelected}
                    someSelected={canDelete && someSelected}
                />

                {/* Pagination */}
                {permits.length > 0 && (
                    <div className="border-t border-[#DFE6EE]">
                        <PermitPagination
                            pagination={pagination}
                            onPageChange={handlePageChange}
                            onPageSizeChange={handlePageSizeChange}
                        />
                    </div>
                )}
            </div>

            {/* Delete Confirmation Dialog — admin/super_admin only */}
            {canDelete && showDeleteConfirm && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
                    <div className="bg-white border border-[#DFE6EE] rounded-2xl p-6 max-w-md w-full mx-4 shadow-xl">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center">
                                <Trash2 size={20} className="text-red-600" />
                            </div>
                            <h3 className="text-lg font-semibold text-[#0E2B5C]">Delete Permits</h3>
                        </div>
                        <p className="text-[#5B6B7D] mb-6">
                            Permanently delete{' '}
                            <span className="text-[#0E2B5C] font-medium">{selectedIds.size}</span>{' '}
                            permit{selectedIds.size !== 1 ? 's' : ''}? This action cannot be undone.
                        </p>
                        <div className="flex items-center gap-3 justify-end">
                            <button
                                onClick={() => setShowDeleteConfirm(false)}
                                disabled={isDeleting}
                                className="px-4 py-2 bg-white hover:bg-[#F7F9FB] border border-[#DFE6EE] rounded-lg text-[#0E2B5C] text-sm transition-colors disabled:opacity-50"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleBulkDelete}
                                disabled={isDeleting}
                                className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg text-white text-sm font-medium transition-colors disabled:opacity-50"
                            >
                                {isDeleting ? (
                                    <>
                                        <RefreshCw size={14} className="animate-spin" />
                                        Deleting...
                                    </>
                                ) : (
                                    <>
                                        <Trash2 size={14} />
                                        Delete
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

// Loading fallback for Suspense
function PermitsPageLoading() {
    return (
        <div className="p-6 space-y-6 bg-[#F7F9FB] min-h-screen">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-[#0E2B5C] flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-[#00458B] flex items-center justify-center text-white">
                            <FileText size={20} />
                        </div>
                        Permit Records
                    </h1>
                    <p className="text-[#5B6B7D] mt-1">
                        Browse and search building permits from multiple cities
                    </p>
                </div>
            </div>
            <div className="bg-white border border-[#DFE6EE] rounded-xl overflow-hidden">
                <PermitTableSkeleton rows={10} />
            </div>
        </div>
    );
}

// Default export with Suspense boundary
export default function PermitsPage() {
    return (
        <Suspense fallback={<PermitsPageLoading />}>
            <PermitsPageContent />
        </Suspense>
    );
}
