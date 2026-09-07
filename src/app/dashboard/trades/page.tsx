'use client';

import { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Target, RefreshCw, TrendingUp, Shield, Zap } from 'lucide-react';
import MarkdownRenderer from '@/components/common/MarkdownRenderer';
import { apiService } from '@/services/api';

export default function TradeSignalsPage() {
    const [tradeData, setTradeData] = useState<string | null>(null);
    const [velocityData, setVelocityData] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    const fetchData = useCallback(async () => {
        setIsLoading(true);
        try {
            const [trade, velocity] = await Promise.all([
                apiService.getTradeOpportunity(),
                apiService.getVelocityAlerts(),
            ]);
            setTradeData(trade.answer);
            setVelocityData(velocity.answer);
        } catch (error) {
            console.error('Failed to fetch trade data:', error);
        } finally {
            setIsLoading(false);
        }
    }, []);

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
                            <div className="p-2 rounded-xl bg-gradient-to-br from-emerald-500/20 to-teal-500/20">
                                <Target className="w-6 h-6 text-emerald-400" />
                            </div>
                            <h1 className="text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white">
                                Trade Signals
                            </h1>
                        </div>
                        <p className="text-gray-500 dark:text-gray-400">
                            Actionable trade opportunities and market velocity
                        </p>
                    </div>

                    <button
                        onClick={fetchData}
                        disabled={isLoading}
                        className="btn-primary flex items-center gap-2"
                    >
                        <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                        Analyze Trades
                    </button>
                </div>
            </motion.div>

            {/* Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Trade Opportunity */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="intelligence-panel"
                >
                    <div className="intelligence-header">
                        <div className="flex items-center gap-3">
                            <Target className="w-5 h-5 text-emerald-400" />
                            <h3 className="font-semibold text-gray-900 dark:text-white">Trade Opportunities</h3>
                        </div>
                        <span className="badge badge-success">Active</span>
                    </div>
                    <div className="intelligence-body">
                        {isLoading ? (
                            <div className="space-y-3">
                                {[...Array(5)].map((_, i) => (
                                    <div key={i} className="skeleton h-6 w-full" />
                                ))}
                            </div>
                        ) : tradeData ? (
                            <div className="prose prose-invert prose-sm max-w-none">
                                <MarkdownRenderer content={tradeData} />
                            </div>
                        ) : (
                            <p className="text-gray-500 text-center py-8">
                                Click &quot;Analyze Trades&quot; to load opportunities
                            </p>
                        )}
                    </div>
                </motion.div>

                {/* Velocity Alerts */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="intelligence-panel"
                >
                    <div className="intelligence-header">
                        <div className="flex items-center gap-3">
                            <Zap className="w-5 h-5 text-amber-400" />
                            <h3 className="font-semibold text-gray-900 dark:text-white">Velocity Alerts</h3>
                        </div>
                        <span className="badge badge-warning">Monitor</span>
                    </div>
                    <div className="intelligence-body">
                        {isLoading ? (
                            <div className="space-y-3">
                                {[...Array(5)].map((_, i) => (
                                    <div key={i} className="skeleton h-6 w-full" />
                                ))}
                            </div>
                        ) : velocityData ? (
                            <div className="prose prose-invert prose-sm max-w-none">
                                <MarkdownRenderer content={velocityData} />
                            </div>
                        ) : (
                            <p className="text-gray-500 text-center py-8">
                                Click &quot;Analyze Trades&quot; to load velocity alerts
                            </p>
                        )}
                    </div>
                </motion.div>
            </div>
        </div>
    );
}
