'use client';

import { useCallback, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, FileSpreadsheet, CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import { useAppDispatch, useAppSelector } from '@/hooks/useAppDispatch';
import { uploadExcelFile, resetUpload } from '@/store/slices/uploadSlice';
import { logger } from '@/utils/logger';

export default function FileUpload() {
    const dispatch = useAppDispatch();
    const { isUploading, error, lastUpload } = useAppSelector((state) => state.upload);
    const [dragActive, setDragActive] = useState(false);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);

    const handleDrag = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === 'dragenter' || e.type === 'dragover') {
            setDragActive(true);
        } else if (e.type === 'dragleave') {
            setDragActive(false);
        }
    }, []);

    const handleFile = (file: File) => {
        if (!file.name.match(/\.(xlsx|xls)$/i)) {
            logger.warn('Invalid file type', { type: file.type, name: file.name }, 'FileUpload');
            return;
        }
        logger.info('File selected', { name: file.name, size: file.size }, 'FileUpload');
        setSelectedFile(file);
    };

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);
        const files = e.dataTransfer.files;
        if (files && files[0]) handleFile(files[0]);
    }, []);

    const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (files && files[0]) handleFile(files[0]);
    };

    const handleUpload = () => {
        if (!selectedFile) return;
        logger.info('Upload initiated', { fileName: selectedFile.name }, 'FileUpload');
        dispatch(uploadExcelFile(selectedFile));
    };

    const handleReset = () => {
        setSelectedFile(null);
        dispatch(resetUpload());
    };

    return (
        <div className="space-y-4">
            <div
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
                className={`relative p-8 border-2 border-dashed rounded-2xl transition-all ${dragActive ? 'border-cyan-400 bg-cyan-500/10' : 'border-gray-300 dark:border-white/20 hover:border-gray-400 dark:hover:border-white/40 bg-gray-50 dark:bg-white/5'
                    }`}
            >
                <input type="file" accept=".xlsx,.xls" onChange={handleFileInput} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" disabled={isUploading} />
                <div className="flex flex-col items-center text-center">
                    <motion.div animate={dragActive ? { scale: 1.1 } : { scale: 1 }} className={`p-4 rounded-full mb-4 ${dragActive ? 'bg-cyan-500/20' : 'bg-white/10'}`}>
                        <Upload className={`w-8 h-8 ${dragActive ? 'text-cyan-400' : 'text-gray-400'}`} />
                    </motion.div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">{dragActive ? 'Drop your file here' : 'Upload Excel File'}</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Drag and drop or click to browse</p>
                </div>
            </div>

            <AnimatePresence mode="wait">
                {selectedFile && !lastUpload && (
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="flex flex-col gap-4 p-4 bg-gray-50 dark:bg-white/5 rounded-xl border border-gray-200 dark:border-white/10"
                    >
                        <div className="flex items-center gap-3">
                            <FileSpreadsheet className="w-10 h-10 text-green-400" />
                            <div>
                                <p className="font-medium text-gray-900 dark:text-white">{selectedFile.name}</p>
                                <p className="text-xs text-gray-500 dark:text-gray-400">
                                    {(selectedFile.size / 1024).toFixed(1)} KB
                                </p>
                            </div>
                        </div>

                        <div className="flex gap-2 w-full">
                            <motion.button
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                                onClick={handleReset}
                                disabled={isUploading}
                                className="flex-1 px-4 py-2 bg-gray-200 dark:bg-white/10 hover:bg-gray-300 dark:hover:bg-white/20 rounded-lg text-gray-600 dark:text-gray-300 text-sm transition-colors disabled:opacity-50"
                            >
                                Cancel
                            </motion.button>
                            <motion.button
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                                onClick={handleUpload}
                                disabled={isUploading}
                                className="flex-1 px-4 py-2 bg-gradient-to-r from-cyan-500 to-purple-600 rounded-lg text-white text-sm font-medium transition-all hover:shadow-lg hover:shadow-cyan-500/25 disabled:opacity-50"
                            >
                                {isUploading ? (
                                    <span className="flex items-center justify-center gap-2">
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                        Uploading...
                                    </span>
                                ) : (
                                    'Upload'
                                )}
                            </motion.button>
                        </div>
                    </motion.div>
                )}

                {lastUpload && (
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="flex items-center justify-between p-4 bg-green-500/10 rounded-xl border border-green-500/30"
                    >
                        <div className="flex items-center gap-3">
                            <CheckCircle2 className="w-6 h-6 text-green-400" />
                            <div>
                                <p className="font-medium text-green-300">
                                    Upload Successful ({lastUpload.month}/{lastUpload.year})
                                </p>
                                <p className="text-sm text-green-400/70">
                                    {lastUpload.rows_processed} rows processed, {lastUpload.stats_inserted} stats inserted
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={handleReset}
                            className="text-sm text-green-400 hover:text-green-300 transition-colors"
                        >
                            Upload another
                        </button>
                    </motion.div>
                )}

                {error && (
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-3 p-4 bg-red-500/10 rounded-xl border border-red-500/30">
                        <XCircle className="w-6 h-6 text-red-400" />
                        <p className="flex-1 text-red-300">{error}</p>
                        <button onClick={handleReset} className="text-sm text-red-400">Try again</button>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
