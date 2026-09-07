'use client';

import { motion } from 'framer-motion';
import { BarChart3, Filter, Download, Calendar } from 'lucide-react';

export default function PermitAnalyticsPage() {
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
                            <div className="p-2 rounded-xl bg-gradient-to-br from-violet-500/20 to-purple-500/20">
                                <BarChart3 className="w-6 h-6 text-violet-400" />
                            </div>
                            <h1 className="text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white">
                                Permit Analytics
                            </h1>
                        </div>
                        <p className="text-gray-500 dark:text-gray-400">
                            Deep dive into permit trends and patterns
                        </p>
                    </div>

                    <div className="flex items-center gap-3">
                        <button className="btn-secondary flex items-center gap-2">
                            <Filter size={18} />
                            Filters
                        </button>
                        <button className="btn-secondary flex items-center gap-2">
                            <Calendar size={18} />
                            Date Range
                        </button>
                        <button className="btn-primary flex items-center gap-2">
                            <Download size={18} />
                            Export
                        </button>
                    </div>
                </div>
            </motion.div>

            {/* Coming Soon Placeholder */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="intelligence-panel"
            >
                <div className="intelligence-body text-center py-16">
                    <div className="p-4 rounded-2xl bg-gradient-to-br from-violet-500/20 to-purple-500/20 w-fit mx-auto mb-6">
                        <BarChart3 className="w-12 h-12 text-violet-400" />
                    </div>
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                        Advanced Analytics Coming Soon
                    </h2>
                    <p className="text-gray-500 dark:text-gray-400 max-w-md mx-auto mb-6">
                        This section will include interactive charts, trend analysis,
                        comparison tools, and exportable reports.
                    </p>
                    <a href="/dashboard/chat" className="btn-primary inline-flex items-center gap-2">
                        Ask AI Agent for Analytics
                    </a>
                </div>
            </motion.div>
        </div>
    );
}
