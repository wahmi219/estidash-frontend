'use client';

import { useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { MapPin, RefreshCw, Search, Filter, TrendingUp, TrendingDown } from 'lucide-react';
import MarkdownRenderer from '@/components/common/MarkdownRenderer';
import { apiService } from '@/services/api';

export default function CBSAInsightsPage() {
    const [hotCBSAs, setHotCBSAs] = useState<string | null>(null);
    const [coolingCBSAs, setCoolingCBSAs] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    const fetchData = useCallback(async () => {
        setIsLoading(true);
        try {
            const [hot, cooling] = await Promise.all([
                apiService.getHotCBSAs(),
                apiService.getCoolingCBSAs(),
            ]);
            setHotCBSAs(hot.answer);
            setCoolingCBSAs(cooling.answer);
        } catch (error) {
            console.error('Failed to fetch CBSA data:', error);
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
                            <div className="p-2 rounded-xl bg-gradient-to-br from-blue-500/20 to-cyan-500/20">
                                <MapPin className="w-6 h-6 text-blue-400" />
                            </div>
                            <h1 className="text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white">
                                CBSA Insights
                            </h1>
                        </div>
                        <p className="text-gray-500 dark:text-gray-400">
                            Metropolitan area performance and trends
                        </p>
                    </div>

                    <div className="flex items-center gap-3">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                            <input
                                type="text"
                                placeholder="Search CBSAs..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="input-field pl-10 w-64"
                            />
                        </div>
                        <button
                            onClick={fetchData}
                            disabled={isLoading}
                            className="btn-primary flex items-center gap-2"
                        >
                            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                            Refresh
                        </button>
                    </div>
                </div>
            </motion.div>

            {/* Content */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Hot CBSAs */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="intelligence-panel"
                >
                    <div className="intelligence-header">
                        <div className="flex items-center gap-3">
                            <TrendingUp className="w-5 h-5 text-emerald-400" />
                            <h3 className="font-semibold text-gray-900 dark:text-white">Hot CBSAs</h3>
                        </div>
                        <span className="badge badge-success">Growing</span>
                    </div>
                    <div className="intelligence-body">
                        {isLoading ? (
                            <div className="space-y-3">
                                {[...Array(6)].map((_, i) => (
                                    <div key={i} className="skeleton h-6 w-full" />
                                ))}
                            </div>
                        ) : hotCBSAs ? (
                            <div className="prose prose-invert prose-sm max-w-none">
                                <MarkdownRenderer content={hotCBSAs} />
                            </div>
                        ) : (
                            <p className="text-gray-500 text-center py-8">
                                Click Refresh to load hot CBSA data
                            </p>
                        )}
                    </div>
                </motion.div>

                {/* Cooling CBSAs */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="intelligence-panel"
                >
                    <div className="intelligence-header">
                        <div className="flex items-center gap-3">
                            <TrendingDown className="w-5 h-5 text-blue-400" />
                            <h3 className="font-semibold text-gray-900 dark:text-white">Cooling CBSAs</h3>
                        </div>
                        <span className="badge badge-info">Declining</span>
                    </div>
                    <div className="intelligence-body">
                        {isLoading ? (
                            <div className="space-y-3">
                                {[...Array(6)].map((_, i) => (
                                    <div key={i} className="skeleton h-6 w-full" />
                                ))}
                            </div>
                        ) : coolingCBSAs ? (
                            <div className="prose prose-invert prose-sm max-w-none">
                                <MarkdownRenderer content={coolingCBSAs} />
                            </div>
                        ) : (
                            <p className="text-gray-500 text-center py-8">
                                Click Refresh to load cooling CBSA data
                            </p>
                        )}
                    </div>
                </motion.div>
            </div>
        </div>
    );
}
