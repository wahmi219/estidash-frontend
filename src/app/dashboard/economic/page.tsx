'use client';

import { useEffect, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { motion } from 'framer-motion';
import { RefreshCw, AlertCircle, BarChart3 } from 'lucide-react';
import clsx from 'clsx';

import { RootState, AppDispatch } from '@/store/store';
import {
    fetchEconomicSummary,
    syncFredData,
    syncBlsData,
    fetchGeoStates,
    fetchGeoMetros,
    fetchGeoEmployment,
    fetchGeoJolts,
    syncStateEmployment,
    setSelectedState,
    setSelectedMetro,
} from '@/store/slices/economicSlice';
import {
    EconomicHealthCard,
    GeoFilterBar,
    EarningsChart,
    WageComparisonChart,
    WorkforceChart,
    JoltsRadarChart,
    InterestRatesTrendChart,
} from '@/components/dashboard/economic';

export default function EconomicDashboardPage() {
    const dispatch = useDispatch<AppDispatch>();
    const {
        data,
        isLoading,
        isSyncing,
        error,
        lastUpdated,
        states,
        metros,
        selectedState,
        selectedMetro,
        nationalEmployment,
        stateEmployment,
        metroEmployment,
        nationalJolts,
        stateJolts,
        isGeoLoading,
        isGeoSyncing,
    } = useSelector((state: RootState) => state.economic);

    // Load initial data
    useEffect(() => {
        dispatch(fetchEconomicSummary());
        dispatch(fetchGeoStates());
        // Try loading national geo data (may 404 if not synced)
        dispatch(fetchGeoEmployment({ geoType: 'national', geoCode: 'US' }));
        dispatch(fetchGeoJolts({ geoType: 'national', geoCode: 'US' }));
    }, [dispatch]);

    // When state changes, load state data + metros
    useEffect(() => {
        if (selectedState) {
            dispatch(fetchGeoMetros(selectedState));
            dispatch(fetchGeoEmployment({ geoType: 'state', geoCode: selectedState }));
            dispatch(fetchGeoJolts({ geoType: 'state', geoCode: selectedState }));
        }
    }, [dispatch, selectedState]);

    // When metro changes, load metro employment
    useEffect(() => {
        if (selectedMetro) {
            dispatch(fetchGeoEmployment({ geoType: 'metro', geoCode: selectedMetro }));
        }
    }, [dispatch, selectedMetro]);

    // Fallback: build national employment from existing summary if geo endpoint returned nothing
    const effectiveNationalEmployment = nationalEmployment || (data?.employment ? {
        observation_date: data.employment.as_of_date || '',
        geo_type: 'national',
        geo_code: 'US',
        geo_name: 'National',
        employment_thousands: data.employment.total_construction != null ? Number(data.employment.total_construction) : null,
        avg_weekly_hours: data.employment.avg_weekly_hours != null ? Number(data.employment.avg_weekly_hours) : null,
        avg_hourly_earnings: data.employment.avg_hourly_earnings != null ? Number(data.employment.avg_hourly_earnings) : null,
    } : null);

    // Fallback: build national JOLTS from existing summary if geo endpoint returned nothing
    const effectiveNationalJolts = nationalJolts || (data?.labor_turnover ? {
        observation_date: data.labor_turnover.as_of_date || '',
        geo_type: 'national',
        geo_code: 'US',
        geo_name: 'National',
        job_openings: data.labor_turnover.job_openings,
        hires: data.labor_turnover.hires,
        separations: data.labor_turnover.separations,
        quits: data.labor_turnover.quits,
        layoffs: data.labor_turnover.layoffs,
        tightness_ratio: data.labor_turnover.tightness_ratio,
    } : null);

    const handleStateChange = useCallback((stateCode: string | null) => {
        dispatch(setSelectedState(stateCode));
    }, [dispatch]);

    const handleMetroChange = useCallback((metroCode: string | null) => {
        dispatch(setSelectedMetro(metroCode));
    }, [dispatch]);

    const handleSyncState = useCallback(async () => {
        if (!selectedState) return;
        await dispatch(syncStateEmployment(selectedState));
        dispatch(fetchGeoEmployment({ geoType: 'state', geoCode: selectedState }));
    }, [dispatch, selectedState]);

    const handleSyncAll = async () => {
        await Promise.all([
            dispatch(syncFredData()),
            dispatch(syncBlsData()),
        ]);
        dispatch(fetchEconomicSummary());
    };

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-950 p-6">
            {/* Header */}
            <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-6"
            >
                <div className="flex items-center justify-between flex-wrap gap-4">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-gradient-to-br from-blue-500 to-purple-500 rounded-2xl shadow-lg shadow-blue-500/20">
                            <BarChart3 className="w-8 h-8 text-white" />
                        </div>
                        <div>
                            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Economic Dashboard</h1>
                            <p className="text-gray-500 dark:text-gray-400">
                                Construction market indicators by geography
                            </p>
                        </div>
                    </div>

                    {/* Sync Buttons */}
                    <div className="flex items-center gap-3">
                        <button
                            onClick={handleSyncAll}
                            disabled={isSyncing}
                            className={clsx(
                                'px-5 py-2.5 rounded-xl text-sm font-medium transition-all flex items-center gap-2',
                                'bg-gradient-to-r from-blue-500/20 to-purple-500/20 text-blue-400 hover:from-blue-500/30 hover:to-purple-500/30',
                                'border border-blue-500/30',
                                'disabled:opacity-50 disabled:cursor-not-allowed'
                            )}
                        >
                            <RefreshCw className={clsx('w-4 h-4', isSyncing && 'animate-spin')} />
                            {isSyncing ? 'Syncing...' : 'Sync National Data'}
                        </button>
                    </div>
                </div>

                {lastUpdated && (
                    <p className="text-xs text-gray-500 mt-2">
                        Last updated: {new Date(lastUpdated).toLocaleString()}
                    </p>
                )}

                {error && (
                    <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="mt-4 p-4 bg-rose-500/10 border border-rose-500/20 rounded-xl flex items-center gap-3"
                    >
                        <AlertCircle className="w-5 h-5 text-rose-400 flex-shrink-0" />
                        <span className="text-sm text-rose-300">{error}</span>
                    </motion.div>
                )}
            </motion.div>

            {/* Geographic Filter Bar */}
            <div className="mb-6">
                <GeoFilterBar
                    states={states}
                    metros={metros}
                    selectedState={selectedState}
                    selectedMetro={selectedMetro}
                    isGeoSyncing={isGeoSyncing}
                    onStateChange={handleStateChange}
                    onMetroChange={handleMetroChange}
                    onSyncState={handleSyncState}
                />
            </div>

            {/* Dashboard Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Market Health - Full Width */}
                <div className="lg:col-span-2">
                    <EconomicHealthCard data={data} isLoading={isLoading} />
                </div>

                {/* Interest Rates Chart */}
                <InterestRatesTrendChart
                    data={data?.interest_rates ?? null}
                    isLoading={isLoading}
                />

                {/* Earnings Overview (national metrics or comparison) */}
                <EarningsChart
                    nationalData={effectiveNationalEmployment}
                    stateData={stateEmployment}
                    metroData={metroEmployment}
                    isLoading={isGeoLoading}
                />

                {/* Workforce Size - Full Width */}
                <div className="lg:col-span-2">
                    <WorkforceChart
                        nationalData={effectiveNationalEmployment}
                        stateData={stateEmployment}
                        isLoading={isGeoLoading}
                    />
                </div>

                {/* Wage Comparison - Full Width */}
                <div className="lg:col-span-2">
                    <WageComparisonChart
                        nationalData={effectiveNationalEmployment}
                        stateData={stateEmployment}
                        metroData={metroEmployment}
                        isLoading={isGeoLoading}
                    />
                </div>

                {/* JOLTS Radar - Full Width */}
                <div className="lg:col-span-2">
                    <JoltsRadarChart
                        nationalData={effectiveNationalJolts}
                        stateData={stateJolts}
                        isLoading={isGeoLoading}
                    />
                </div>
            </div>

            {/* Educational Footer */}
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
                className="mt-8 p-6 bg-white dark:bg-gray-900/50 rounded-2xl border border-gray-200 dark:border-gray-800"
            >
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Understanding This Data</h3>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6 text-sm text-gray-500 dark:text-gray-400">
                    <div>
                        <h4 className="font-medium text-gray-600 dark:text-gray-300 mb-2">Interest Rates (FRED)</h4>
                        <p>
                            Federal Reserve data. Higher rates slow construction and increase project financing costs.
                        </p>
                    </div>
                    <div>
                        <h4 className="font-medium text-gray-600 dark:text-gray-300 mb-2">Employment (BLS CES)</h4>
                        <p>
                            Workforce size and hours. Low hours can signal an industry slowdown.
                        </p>
                    </div>
                    <div>
                        <h4 className="font-medium text-gray-600 dark:text-gray-300 mb-2">Labor Turnover (JOLTS)</h4>
                        <p>
                            Hiring activity. High tightness ratio means expect higher labor costs.
                        </p>
                    </div>
                    <div>
                        <h4 className="font-medium text-gray-600 dark:text-gray-300 mb-2">Geographic Data</h4>
                        <p>
                            Filter by state and metro area to compare regional construction markets.
                        </p>
                    </div>
                </div>
            </motion.div>
        </div>
    );
}
