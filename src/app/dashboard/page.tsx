'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
    RefreshCw,
    Calendar,
    ChevronDown,
    Sparkles,
    TrendingUp,
    Clock,
} from 'lucide-react';
import {
    MarketPulseCard,
    CBSAListCard,
    HighValueCard,
    TradeOpportunityCard,
    VelocityAlertsCard,
    OutreachPriorityCard,
} from '@/components/dashboard';
import { apiService } from '@/services/api';
import { QueryResponse, CBSAItem, VelocityAlertItem, OutreachItem } from '@/types';

interface DashboardData {
    marketPulse: QueryResponse | null;
    hotCBSAs: QueryResponse | null;
    coolingCBSAs: QueryResponse | null;
    highValue: QueryResponse | null;
    tradeOpportunity: QueryResponse | null;
    velocityAlerts: QueryResponse | null;
    outreachPriority: QueryResponse | null;
}

interface LoadingState {
    marketPulse: boolean;
    hotCBSAs: boolean;
    coolingCBSAs: boolean;
    highValue: boolean;
    tradeOpportunity: boolean;
    velocityAlerts: boolean;
    outreachPriority: boolean;
    fullReport: boolean;
}

export default function DashboardPage() {
    const [data, setData] = useState<DashboardData>({
        marketPulse: null,
        hotCBSAs: null,
        coolingCBSAs: null,
        highValue: null,
        tradeOpportunity: null,
        velocityAlerts: null,
        outreachPriority: null,
    });

    const [loading, setLoading] = useState<LoadingState>({
        marketPulse: false,
        hotCBSAs: false,
        coolingCBSAs: false,
        highValue: false,
        tradeOpportunity: false,
        velocityAlerts: false,
        outreachPriority: false,
        fullReport: false,
    });

    const [lastUpdated, setLastUpdated] = useState<string | null>(null);

    // Fetch individual intelligence reports
    const fetchMarketPulse = useCallback(async () => {
        setLoading(prev => ({ ...prev, marketPulse: true }));
        try {
            const response = await apiService.getMarketPulse();
            setData(prev => ({ ...prev, marketPulse: response }));
            setLastUpdated(new Date().toISOString());
        } catch (error) {
            console.error('Failed to fetch market pulse:', error);
        } finally {
            setLoading(prev => ({ ...prev, marketPulse: false }));
        }
    }, []);

    const fetchHotCBSAs = useCallback(async () => {
        setLoading(prev => ({ ...prev, hotCBSAs: true }));
        try {
            const response = await apiService.getHotCBSAs();
            setData(prev => ({ ...prev, hotCBSAs: response }));
        } catch (error) {
            console.error('Failed to fetch hot CBSAs:', error);
        } finally {
            setLoading(prev => ({ ...prev, hotCBSAs: false }));
        }
    }, []);

    const fetchCoolingCBSAs = useCallback(async () => {
        setLoading(prev => ({ ...prev, coolingCBSAs: true }));
        try {
            const response = await apiService.getCoolingCBSAs();
            setData(prev => ({ ...prev, coolingCBSAs: response }));
        } catch (error) {
            console.error('Failed to fetch cooling CBSAs:', error);
        } finally {
            setLoading(prev => ({ ...prev, coolingCBSAs: false }));
        }
    }, []);

    const fetchHighValue = useCallback(async () => {
        setLoading(prev => ({ ...prev, highValue: true }));
        try {
            const response = await apiService.getHighValuePermits();
            setData(prev => ({ ...prev, highValue: response }));
        } catch (error) {
            console.error('Failed to fetch high value permits:', error);
        } finally {
            setLoading(prev => ({ ...prev, highValue: false }));
        }
    }, []);

    const fetchTradeOpportunity = useCallback(async () => {
        setLoading(prev => ({ ...prev, tradeOpportunity: true }));
        try {
            const response = await apiService.getTradeOpportunity();
            setData(prev => ({ ...prev, tradeOpportunity: response }));
        } catch (error) {
            console.error('Failed to fetch trade opportunity:', error);
        } finally {
            setLoading(prev => ({ ...prev, tradeOpportunity: false }));
        }
    }, []);

    const fetchVelocityAlerts = useCallback(async () => {
        setLoading(prev => ({ ...prev, velocityAlerts: true }));
        try {
            const response = await apiService.getVelocityAlerts();
            setData(prev => ({ ...prev, velocityAlerts: response }));
        } catch (error) {
            console.error('Failed to fetch velocity alerts:', error);
        } finally {
            setLoading(prev => ({ ...prev, velocityAlerts: false }));
        }
    }, []);

    const fetchOutreachPriority = useCallback(async () => {
        setLoading(prev => ({ ...prev, outreachPriority: true }));
        try {
            const response = await apiService.getOutreachPriority();
            setData(prev => ({ ...prev, outreachPriority: response }));
        } catch (error) {
            console.error('Failed to fetch outreach priority:', error);
        } finally {
            setLoading(prev => ({ ...prev, outreachPriority: false }));
        }
    }, []);

    const refreshAll = useCallback(async () => {
        setLoading({
            marketPulse: true,
            hotCBSAs: true,
            coolingCBSAs: true,
            highValue: true,
            tradeOpportunity: true,
            velocityAlerts: true,
            outreachPriority: true,
            fullReport: true,
        });

        try {
            // Fetch all endpoints in parallel
            const [
                marketPulse,
                hotCBSAs,
                coolingCBSAs,
                highValue,
                tradeOpportunity,
                velocityAlerts,
                outreachPriority,
            ] = await Promise.all([
                apiService.getMarketPulse(),
                apiService.getHotCBSAs(),
                apiService.getCoolingCBSAs(),
                apiService.getHighValuePermits(),
                apiService.getTradeOpportunity(),
                apiService.getVelocityAlerts(),
                apiService.getOutreachPriority(),
            ]);

            setData({
                marketPulse,
                hotCBSAs,
                coolingCBSAs,
                highValue,
                tradeOpportunity,
                velocityAlerts,
                outreachPriority,
            });
            setLastUpdated(new Date().toISOString());
        } catch (error) {
            console.error('Failed to fetch full report:', error);
        } finally {
            setLoading({
                marketPulse: false,
                hotCBSAs: false,
                coolingCBSAs: false,
                highValue: false,
                tradeOpportunity: false,
                velocityAlerts: false,
                outreachPriority: false,
                fullReport: false,
            });
        }
    }, []);

    const formatLastUpdated = (isoString: string | null) => {
        if (!isoString) return 'Never';
        const date = new Date(isoString);
        return date.toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: true
        });
    };

    const isAnyLoading = Object.values(loading).some(Boolean);

    // Helper to extract CBSA list from response
    const extractCBSAs = (response: QueryResponse | null): CBSAItem[] => {
        if (!response?.data) return [];
        return response.data.cbsas || [];
    };

    // Helper to extract velocity alerts from response
    const extractAlerts = (response: QueryResponse | null): VelocityAlertItem[] => {
        if (!response?.data) return [];
        return response.data.alerts || [];
    };

    // Helper to extract outreach lists from response
    const extractOutreach = (response: QueryResponse | null): { priority: OutreachItem[], avoid: OutreachItem[] } => {
        if (!response?.data) return { priority: [], avoid: [] };
        return {
            priority: response.data.priority_list || [],
            avoid: response.data.avoid_list || [],
        };
    };

    return (
        <div className="p-6 lg:p-8">
            {/* Header */}
            <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-8"
            >
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                    <div>
                        <div className="flex items-center gap-3 mb-2">
                            <h1 className="text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white">
                                Market Intelligence
                            </h1>
                            <div className="badge badge-purple">
                                <Sparkles size={12} className="mr-1" />
                                AI-Powered
                            </div>
                        </div>
                        <p className="text-gray-500 dark:text-gray-400">
                            Real-time insights from US housing permit data
                        </p>
                    </div>

                    <div className="flex items-center gap-3">
                        {/* Last Updated */}
                        <div className="flex items-center gap-2 text-sm text-gray-500">
                            <Clock size={14} />
                            <span>Updated: {formatLastUpdated(lastUpdated)}</span>
                        </div>

                        {/* Refresh Button */}
                        <button
                            onClick={refreshAll}
                            disabled={isAnyLoading}
                            className="btn-primary flex items-center gap-2"
                        >
                            <RefreshCw className={`w-4 h-4 ${isAnyLoading ? 'animate-spin' : ''}`} />
                            {isAnyLoading ? 'Loading...' : 'Refresh All'}
                        </button>
                    </div>
                </div>
            </motion.div>

            {/* Dashboard Grid */}
            <div className="space-y-6">
                {/* Top Row - Market Pulse (Full Width) */}
                <div className="grid grid-cols-1 gap-6">
                    <MarketPulseCard
                        isLoading={loading.marketPulse || loading.fullReport}
                        answer={data.marketPulse?.answer || undefined}
                        data={data.marketPulse?.data || undefined}
                        onRefresh={fetchMarketPulse}
                    />
                </div>

                {/* Second Row - Hot & Cooling CBSAs */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <CBSAListCard
                        title="Hot CBSAs"
                        subtitle="Top growth areas this month"
                        type="hot"
                        isLoading={loading.hotCBSAs}
                        answer={data.hotCBSAs?.answer || undefined}
                        onRefresh={fetchHotCBSAs}
                    />
                    <CBSAListCard
                        title="Cooling CBSAs"
                        subtitle="Areas showing decline"
                        type="cooling"
                        isLoading={loading.coolingCBSAs}
                        answer={data.coolingCBSAs?.answer || undefined}
                        onRefresh={fetchCoolingCBSAs}
                    />
                </div>

                {/* Third Row - High Value & Trade Opportunity */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <HighValueCard
                        isLoading={loading.highValue}
                        answer={data.highValue?.answer || undefined}
                        cbsas={extractCBSAs(data.highValue)}
                        onRefresh={fetchHighValue}
                    />
                    <TradeOpportunityCard
                        isLoading={loading.tradeOpportunity}
                        answer={data.tradeOpportunity?.answer || undefined}
                        data={data.tradeOpportunity?.data || undefined}
                        onRefresh={fetchTradeOpportunity}
                    />
                </div>

                {/* Fourth Row - Velocity Alerts */}
                <div className="grid grid-cols-1 gap-6">
                    <VelocityAlertsCard
                        isLoading={loading.velocityAlerts}
                        answer={data.velocityAlerts?.answer || undefined}
                        alerts={extractAlerts(data.velocityAlerts)}
                        onRefresh={fetchVelocityAlerts}
                    />
                </div>

                {/* Fifth Row - Outreach Priority */}
                <div className="grid grid-cols-1 gap-6">
                    <OutreachPriorityCard
                        isLoading={loading.outreachPriority}
                        answer={data.outreachPriority?.answer || undefined}
                        priorityList={extractOutreach(data.outreachPriority).priority}
                        avoidList={extractOutreach(data.outreachPriority).avoid}
                        onRefresh={fetchOutreachPriority}
                    />
                </div>
            </div>

            {/* Quick Actions Footer */}
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
                className="mt-8 p-4 rounded-xl bg-black/4 dark:bg-white/5 border border-gray-200 dark:border-white/10"
            >
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <TrendingUp className="w-5 h-5 text-cyan-400" />
                        <span className="text-gray-500 dark:text-gray-400 text-sm">
                            Tip: Click refresh on individual cards for targeted updates, or use &quot;Refresh All&quot; for a complete intelligence report.
                        </span>
                    </div>
                </div>
            </motion.div>
        </div>
    );
}
