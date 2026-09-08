'use client';

import { motion } from 'framer-motion';
import { Upload, FileSpreadsheet, CheckCircle, AlertCircle } from 'lucide-react';
import FileUpload from '@/components/FileUpload';
import { useAppSelector } from '@/hooks/useAppDispatch';

function Panel({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
    return (
        <div className="bg-white border border-[#DFE6EE] rounded-lg overflow-hidden">
            <div className="px-5 py-4 border-b border-[#DFE6EE] flex items-center gap-3">
                {icon}
                <h3 className="font-semibold text-[#0E2B5C]">{title}</h3>
            </div>
            <div className="p-5">{children}</div>
        </div>
    );
}

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
                    <div className="p-2 rounded-lg bg-[#F7F9FB] border border-[#DFE6EE]">
                        <Upload className="w-6 h-6 text-[#00458B]" />
                    </div>
                    <h1 className="text-2xl lg:text-3xl font-bold text-[#0E2B5C]">
                        Data Upload
                    </h1>
                </div>
                <p className="text-[#5B6B7D]">
                    Upload Excel files to populate the housing permit database
                </p>
            </motion.div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Upload Section */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                >
                    <Panel title="Upload Excel File" icon={<FileSpreadsheet className="w-5 h-5 text-[#00458B]" />}>
                        <FileUpload />
                    </Panel>
                </motion.div>

                {/* Status Section */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                >
                    <Panel
                        title="Upload Status"
                        icon={lastUpload
                            ? <CheckCircle className="w-5 h-5 text-emerald-600" />
                            : <AlertCircle className="w-5 h-5 text-[#5B6B7D]" />}
                    >
                        {isUploading ? (
                            <div className="text-center py-8">
                                <div className="animate-spin w-8 h-8 border-2 border-[#DFE6EE] border-t-[#00458B] rounded-full mx-auto mb-4" />
                                <p className="text-[#5B6B7D]">Uploading and processing...</p>
                            </div>
                        ) : lastUpload ? (
                            <div className="p-4 rounded-lg bg-emerald-50 border border-emerald-200">
                                <p className="text-emerald-800 font-medium mb-2">Upload Successful</p>
                                <div className="space-y-1.5 text-sm text-[#5B6B7D]">
                                    <p>File Type: <span className="text-[#0E2B5C] font-medium">{lastUpload.file_type}</span></p>
                                    <p>Rows Processed: <span className="text-[#0E2B5C] font-medium">{lastUpload.rows_processed}</span></p>
                                    <p>Stats Inserted: <span className="text-[#0E2B5C] font-medium">{lastUpload.stats_inserted}</span></p>
                                    <p>Period: <span className="text-[#0E2B5C] font-medium">{lastUpload.month}/{lastUpload.year}</span></p>
                                </div>
                            </div>
                        ) : error ? (
                            <div className="p-4 rounded-lg bg-red-50 border border-red-200">
                                <p className="text-red-700 font-medium mb-2">Upload Failed</p>
                                <p className="text-sm text-[#5B6B7D]">{error}</p>
                            </div>
                        ) : (
                            <div className="text-center py-8 text-[#5B6B7D]">
                                <FileSpreadsheet className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                                <p className="font-medium text-[#0E2B5C]">No files uploaded yet</p>
                                <p className="text-sm mt-1">Upload an Excel file to get started</p>
                            </div>
                        )}
                    </Panel>
                </motion.div>
            </div>

            {/* Supported Formats */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="mt-6"
            >
                <Panel title="Supported File Formats" icon={<FileSpreadsheet className="w-5 h-5 text-[#00458B]" />}>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                        {[
                            { name: 'CBSA Monthly', desc: 'MSA-level permit data', sheets: 'MSA Units, MSA Value' },
                            { name: 'State Monthly', desc: 'State-level permit data', sheets: 'State Units, State Value' },
                            { name: 'CBSA Units', desc: 'Permit counts by CBSA', sheets: 'Single sheet' },
                            { name: 'State Units', desc: 'Permit counts by state', sheets: 'Single sheet' },
                        ].map((format, i) => (
                            <div key={i} className="p-4 rounded-lg bg-[#F7F9FB] border border-[#DFE6EE]">
                                <p className="font-medium text-[#0E2B5C] mb-1">{format.name}</p>
                                <p className="text-sm text-[#5B6B7D] mb-2">{format.desc}</p>
                                <p className="text-xs text-[#5B6B7D]">Sheets: {format.sheets}</p>
                            </div>
                        ))}
                    </div>
                </Panel>
            </motion.div>
        </div>
    );
}
