'use client';

import { motion } from 'framer-motion';
import { Upload, FileSpreadsheet, CheckCircle, AlertCircle } from 'lucide-react';
import FileUpload from '@/components/FileUpload';
import { useAppSelector } from '@/hooks/useAppDispatch';

export default function DataUploadPage() {
    const { lastUpload, isUploading, error } = useAppSelector((state) => state.upload);

    return (
        <div className="p-6 lg:p-8">
            {/* Header */}
            <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-8"
            >
                <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 rounded-xl bg-gradient-to-br from-purple-500/20 to-pink-500/20">
                        <Upload className="w-6 h-6 text-purple-400" />
                    </div>
                    <h1 className="text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white">
                        Data Upload
                    </h1>
                </div>
                <p className="text-gray-500 dark:text-gray-400">
                    Upload Excel files to populate the housing permit database
                </p>
            </motion.div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Upload Section */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="intelligence-panel"
                >
                    <div className="intelligence-header">
                        <div className="flex items-center gap-3">
                            <FileSpreadsheet className="w-5 h-5 text-purple-400" />
                            <h3 className="font-semibold text-gray-900 dark:text-white">Upload Excel File</h3>
                        </div>
                    </div>
                    <div className="intelligence-body">
                        <FileUpload />
                    </div>
                </motion.div>

                {/* Status Section */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="intelligence-panel"
                >
                    <div className="intelligence-header">
                        <div className="flex items-center gap-3">
                            {lastUpload ? (
                                <CheckCircle className="w-5 h-5 text-emerald-400" />
                            ) : (
                                <AlertCircle className="w-5 h-5 text-gray-400" />
                            )}
                            <h3 className="font-semibold text-gray-900 dark:text-white">Upload Status</h3>
                        </div>
                    </div>
                    <div className="intelligence-body">
                        {isUploading ? (
                            <div className="text-center py-8">
                                <div className="animate-spin w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full mx-auto mb-4" />
                                <p className="text-gray-500 dark:text-gray-400">Uploading and processing...</p>
                            </div>
                        ) : lastUpload ? (
                            <div className="space-y-4">
                                <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                                    <p className="text-emerald-400 font-medium mb-2">Upload Successful!</p>
                                    <div className="space-y-2 text-sm text-gray-600 dark:text-gray-300">
                                        <p>File Type: <span className="text-gray-900 dark:text-white">{lastUpload.file_type}</span></p>
                                        <p>Rows Processed: <span className="text-gray-900 dark:text-white">{lastUpload.rows_processed}</span></p>
                                        <p>Stats Inserted: <span className="text-gray-900 dark:text-white">{lastUpload.stats_inserted}</span></p>
                                        <p>Period: <span className="text-gray-900 dark:text-white">{lastUpload.month}/{lastUpload.year}</span></p>
                                    </div>
                                </div>
                            </div>
                        ) : error ? (
                            <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20">
                                <p className="text-rose-400 font-medium mb-2">Upload Failed</p>
                                <p className="text-sm text-gray-500 dark:text-gray-400">{error}</p>
                            </div>
                        ) : (
                            <div className="text-center py-8 text-gray-500">
                                <FileSpreadsheet className="w-12 h-12 mx-auto mb-4 opacity-50" />
                                <p>No files uploaded yet</p>
                                <p className="text-sm mt-2">Upload an Excel file to get started</p>
                            </div>
                        )}
                    </div>
                </motion.div>
            </div>

            {/* Supported Formats */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="mt-6 intelligence-panel"
            >
                <div className="intelligence-header">
                    <h3 className="font-semibold text-gray-900 dark:text-white">Supported File Formats</h3>
                </div>
                <div className="intelligence-body">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        {[
                            { name: 'CBSA Monthly', desc: 'MSA-level permit data', sheets: 'MSA Units, MSA Value' },
                            { name: 'State Monthly', desc: 'State-level permit data', sheets: 'State Units, State Value' },
                            { name: 'CBSA Units', desc: 'Permit counts by CBSA', sheets: 'Single sheet' },
                            { name: 'State Units', desc: 'Permit counts by state', sheets: 'Single sheet' },
                        ].map((format, i) => (
                            <div key={i} className="p-4 rounded-xl bg-black/4 dark:bg-white/5 border border-gray-200 dark:border-white/10">
                                <p className="font-medium text-gray-900 dark:text-white mb-1">{format.name}</p>
                                <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">{format.desc}</p>
                                <p className="text-xs text-gray-500">Sheets: {format.sheets}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </motion.div>
        </div>
    );
}
