'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { AlertCircle, X } from 'lucide-react';

interface ErrorBannerProps {
    message: string;
    onDismiss?: () => void;
}

export default function ErrorBanner({ message, onDismiss }: ErrorBannerProps) {
    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="flex items-center gap-3 p-4 bg-red-500/10 border border-red-500/30 rounded-xl backdrop-blur-sm"
            >
                <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
                <p className="flex-1 text-sm text-red-300">{message}</p>
                {onDismiss && (
                    <button
                        onClick={onDismiss}
                        className="p-1 hover:bg-red-500/20 rounded-lg transition-colors"
                    >
                        <X className="w-4 h-4 text-red-400" />
                    </button>
                )}
            </motion.div>
        </AnimatePresence>
    );
}
