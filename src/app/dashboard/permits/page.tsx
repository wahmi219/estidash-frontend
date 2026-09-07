'use client';

import React, { Suspense, useEffect, useCallback, useState } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { AnimatePresence } from 'framer-motion';
import { FileText, RefreshCw, AlertCircle, Trash2, X } from 'lucide-react';
import { useAppDispatch, useAppSelector } from '@/hooks/useAppDispatch';
import {
    fetchPermits,
    fetchPermitCities,
    fetchPermitCounties,
    bulkDeletePermits,
    bulkDeleteByFilter,
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
    ContactOutreachModal,
    MyLeadBankBanner,
} from '@/components/permits';
import { PermitFilters, PermitRecord } from '@/types';

// Debounce helper
function useDebounce<T>(value: T, delay: number): T {
    const [debouncedValue, setDebouncedValue] = React.useState(value);

    useEffect(() => {
        const handler = setTimeout(() => setDebouncedValue(value), delay);
        return () => clearTimeout(handler);
    }, [value, delay]);

    return debouncedValue;
}

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
        filters.minCost ||
        filters.maxCost
    );

    // Outreach modal state
    const [outreachPermit, setOutreachPermit] = useState<PermitRecord | null>(null);

    const handleSendMessage = useCallback((permit: PermitRecord) => {
        setOutreachPermit(permit);
    }, []);

    // Selection state for bulk delete
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [selectedAllPages, setSelectedAllPages] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);

    const allSelected = permits.length > 0 && permits.every((p) => selectedIds.has(p.id));
    const someSelected = selectedIds.size > 0 || selectedAllPages;
    // True when the user has opted in to select every record matching the current filters
    const totalMatchingRecords = pagination.totalRecords;
    // Unfiltered totals are a planner estimate — prefix with ~ so the number isn't read as exact.
    const totalMatchingLabel = `${pagination.totalIsEstimate ? '~' : ''}${totalMatchingRecords.toLocaleString()}`;
    const hasMoreThanOnePage = totalMatchingRecords > pagination.pageSize;

    // Clear selection when filters/page/sorting change
    useEffect(() => {
        setSelectedIds(new Set());
        setSelectedAllPages(false);
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
        if (!selectedAllPages && selectedIds.size === 0) return;
        setIsDeleting(true);
        try {
            if (selectedAllPages) {
                // Delete all records matching the current active filters
                const filterParams = {
                    city: filters.city || undefined,
                    state: filters.state || undefined,
                    opportunity_category: filters.opportunityCategory || undefined,
                    project_class: filters.projectClass || undefined,
                    work_scope: filters.workScope || undefined,
                    start_date: filters.startDate || undefined,
                    end_date: filters.endDate || undefined,
                    search: filters.search || undefined,
                    min_cost: filters.minCost ?? undefined,
                    max_cost: filters.maxCost ?? undefined,
                };
                await dispatch(bulkDeleteByFilter(filterParams)).unwrap();
                setSelectedAllPages(false);
            } else {
                await dispatch(bulkDeletePermits(Array.from(selectedIds))).unwrap();
                setSelectedIds(new Set());
            }
            setShowDeleteConfirm(false);
            dispatch(fetchPermits({ force: true }));
        } catch {
            // Error is set in Redux state
        } finally {
            setIsDeleting(false);
        }
    }, [dispatch, selectedIds, selectedAllPages, filters]);

    const isLoading = status === 'loading';

    return (
        <div className="p-6 space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center">
                            <FileText size={20} />
                        </div>
                        Permit Records
                    </h1>
                    <p className="text-gray-500 mt-1">
                        Browse and search building permits from multiple cities
                    </p>
                </div>
                <button
                    onClick={handleRefresh}
                    disabled={isLoading}
                    className="flex items-center gap-2 px-4 py-2 bg-black/4 dark:bg-white/5 hover:bg-black/5 dark:hover:bg-white/8 border border-gray-200 dark:border-white/10 rounded-lg text-gray-600 dark:text-gray-300 transition-colors disabled:opacity-50"
                >
                    <RefreshCw size={16} className={isLoading ? 'animate-spin' : ''} />
                    Refresh
                </button>
            </div>

            {/* Agent lead-bank quota (renders only for assigned outreach agents) */}
            <MyLeadBankBanner />

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

            {/* Bulk Action Bar */}
            {someSelected && (
                <div className="flex flex-col gap-2">
                    <div className="flex items-center gap-4 px-4 py-3 bg-cyan-500/10 border border-cyan-500/20 rounded-xl">
                        <span className="text-sm text-cyan-300 font-medium">
                            {selectedAllPages
                                ? `All ${totalMatchingLabel} matching records selected`
                                : `${selectedIds.size} permit${selectedIds.size !== 1 ? 's' : ''} selected`}
                        </span>
                        <button
                            onClick={() => setShowDeleteConfirm(true)}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-red-500/20 hover:bg-red-500/30 border border-red-500/30 rounded-lg text-red-400 text-sm font-medium transition-colors"
                        >
                            <Trash2 size={14} />
                            Delete Selected
                        </button>
                        <button
                            onClick={() => { setSelectedIds(new Set()); setSelectedAllPages(false); }}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-black/4 dark:bg-white/5 hover:bg-black/5 dark:hover:bg-white/8 border border-gray-200 dark:border-white/10 rounded-lg text-gray-500 dark:text-gray-400 text-sm transition-colors"
                        >
                            <X size={14} />
                            Clear Selection
                        </button>
                    </div>
                    {/* "Select all pages" banner — shown when the current page is fully selected but more records exist */}
                    {allSelected && hasMoreThanOnePage && !selectedAllPages && (
                        <div className="flex items-center gap-2 px-4 py-2 bg-amber-500/10 border border-amber-500/20 rounded-xl text-sm text-amber-300">
                            <span>
                                Only {permits.length} of {totalMatchingLabel} matching records are selected.
                            </span>
                            <button
                                onClick={() => setSelectedAllPages(true)}
                                className="underline hover:no-underline font-medium"
                            >
                                Select all {totalMatchingLabel} records
                            </button>
                        </div>
                    )}
                </div>
            )}

            {/* Table */}
            <div className="bg-black/2 dark:bg-white/2 border border-gray-200 dark:border-white/6 rounded-xl overflow-hidden">
                <PermitTable
                    permits={permits}
                    isLoading={isLoading}
                    sorting={sorting}
                    onSort={handleSort}
                    onViewDetails={handleViewDetails}
                    onSendMessage={handleSendMessage}
                    onResetFilters={handleResetFilters}
                    hasFilters={hasActiveFilters}
                    selectedIds={selectedIds}
                    onToggleSelect={handleToggleSelect}
                    onToggleSelectAll={handleToggleSelectAll}
                    allSelected={allSelected}
                    someSelected={someSelected}
                />

                {/* Pagination */}
                {permits.length > 0 && (
                    <div className="border-t border-gray-200 dark:border-white/6">
                        <PermitPagination
                            pagination={pagination}
                            onPageChange={handlePageChange}
                            onPageSizeChange={handlePageSizeChange}
                        />
                    </div>
                )}
            </div>

            {/* Contractor Outreach Modal */}
            <AnimatePresence>
                {outreachPermit && (
                    <ContactOutreachModal
                        permit={outreachPermit}
                        onClose={() => setOutreachPermit(null)}
                    />
                )}
            </AnimatePresence>

            {/* Delete Confirmation Dialog */}
            {showDeleteConfirm && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
                    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-white/10 rounded-2xl p-6 max-w-md w-full mx-4 shadow-2xl">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-10 h-10 rounded-full bg-red-500/20 flex items-center justify-center">
                                <Trash2 size={20} className="text-red-400" />
                            </div>
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Delete Permits</h3>
                        </div>
                        <p className="text-gray-500 dark:text-gray-400 mb-6">
                            {selectedAllPages ? (
                                <>
                                    Permanently delete all{' '}
                                    <span className="text-gray-900 dark:text-white font-medium">
                                        {totalMatchingLabel}
                                    </span>{' '}
                                    records matching the current filters? This action cannot be undone.
                                </>
                            ) : (
                                <>
                                    Permanently delete{' '}
                                    <span className="text-gray-900 dark:text-white font-medium">{selectedIds.size}</span>{' '}
                                    permit{selectedIds.size !== 1 ? 's' : ''}? This action cannot be undone.
                                </>
                            )}
                        </p>
                        <div className="flex items-center gap-3 justify-end">
                            <button
                                onClick={() => setShowDeleteConfirm(false)}
                                disabled={isDeleting}
                                className="px-4 py-2 bg-black/4 dark:bg-white/5 hover:bg-black/5 dark:hover:bg-white/8 border border-gray-200 dark:border-white/10 rounded-lg text-gray-600 dark:text-gray-300 text-sm transition-colors disabled:opacity-50"
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
        <div className="p-6 space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center">
                            <FileText size={20} />
                        </div>
                        Permit Records
                    </h1>
                    <p className="text-gray-500 mt-1">
                        Browse and search building permits from multiple cities
                    </p>
                </div>
            </div>
            <div className="bg-black/2 dark:bg-white/2 border border-gray-200 dark:border-white/6 rounded-xl overflow-hidden">
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
