'use client';

import { useCallback, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, FileSpreadsheet, Loader2 } from 'lucide-react';
import { useAppDispatch, useAppSelector } from '@/hooks/useAppDispatch';
import { uploadExcelFile, resetUpload } from '@/store/slices/uploadSlice';
import { logger } from '@/utils/logger';

// Success/error/progress feedback lives in the "Upload Status" panel next to
// this component (see dashboard/upload/page.tsx) -- this component owns only
// the dropzone and the pre-upload file-selection step, so the two don't show
// the same result twice.
export default function FileUpload() {
    const dispatch = useAppDispatch();
    const { isUploading, lastUpload } = useAppSelector((state) => state.upload);
    const [dragActive, setDragActive] = useState(false);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [invalidFile, setInvalidFile] = useState<string | null>(null);

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
            setInvalidFile(file.name);
            return;
        }
        logger.info('File selected', { name: file.name, size: file.size }, 'FileUpload');
        setInvalidFile(null);
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
        setInvalidFile(null);
        dispatch(resetUpload());
    };

    return (
        <div className="space-y-4">
            <div
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
                className={`relative p-8 border-2 border-dashed rounded-lg transition-all ${dragActive ? 'border-[#00458B] bg-blue-50' : 'border-[#DFE6EE] hover:border-gray-300 bg-[#F7F9FB]'
                    }`}
            >
                <input type="file" accept=".xlsx,.xls" onChange={handleFileInput} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" disabled={isUploading} />
                <div className="flex flex-col items-center text-center">
                    <motion.div animate={dragActive ? { scale: 1.1 } : { scale: 1 }} className={`p-4 rounded-full mb-4 ${dragActive ? 'bg-blue-100' : 'bg-white border border-[#DFE6EE]'}`}>
                        <Upload className={`w-8 h-8 ${dragActive ? 'text-[#00458B]' : 'text-[#5B6B7D]'}`} />
                    </motion.div>
                    <h3 className="text-lg font-semibold text-[#0E2B5C] mb-2">{dragActive ? 'Drop your file here' : 'Upload Excel File'}</h3>
                    <p className="text-sm text-[#5B6B7D]">Drag and drop or click to browse</p>
                </div>
            </div>

            {invalidFile && !selectedFile && (
                <p className="text-sm text-red-700">
                    &ldquo;{invalidFile}&rdquo; isn&apos;t a supported file type — upload a .xlsx or .xls file.
                </p>
            )}

            <AnimatePresence mode="wait">
                {selectedFile && !lastUpload && (
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="flex flex-col gap-4 p-4 bg-[#F7F9FB] rounded-lg border border-[#DFE6EE]"
                    >
                        <div className="flex items-center gap-3">
                            <FileSpreadsheet className="w-10 h-10 text-emerald-600" />
                            <div>
                                <p className="font-medium text-[#0E2B5C]">{selectedFile.name}</p>
                                <p className="text-xs text-[#5B6B7D]">
                                    {(selectedFile.size / 1024).toFixed(1)} KB
                                </p>
                            </div>
                        </div>

                        <div className="flex gap-2 w-full">
                            <button
                                onClick={handleReset}
                                disabled={isUploading}
                                className="flex-1 px-4 py-2 bg-white hover:bg-gray-100 border border-[#DFE6EE] rounded-lg text-[#5B6B7D] text-sm transition-colors disabled:opacity-50"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleUpload}
                                disabled={isUploading}
                                className="flex-1 px-4 py-2 bg-[#00458B] hover:bg-[#045CB4] rounded-lg text-white text-sm font-medium transition-colors disabled:opacity-50"
                            >
                                {isUploading ? (
                                    <span className="flex items-center justify-center gap-2">
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                        Uploading...
                                    </span>
                                ) : (
                                    'Upload'
                                )}
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
