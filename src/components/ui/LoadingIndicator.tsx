'use client';

import { motion } from 'framer-motion';

interface LoadingIndicatorProps {
    size?: 'sm' | 'md' | 'lg';
    text?: string;
}

export default function LoadingIndicator({ size = 'md', text }: LoadingIndicatorProps) {
    const sizeClasses = {
        sm: 'w-4 h-4',
        md: 'w-8 h-8',
        lg: 'w-12 h-12',
    };

    return (
        <div className="flex flex-col items-center justify-center gap-3">
            <div className="relative">
                <motion.div
                    className={`${sizeClasses[size]} rounded-full border-2 border-cyan-500/30 border-t-cyan-500`}
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                />
                <motion.div
                    className={`absolute inset-0 ${sizeClasses[size]} rounded-full border-2 border-purple-500/20 border-b-purple-500`}
                    animate={{ rotate: -360 }}
                    transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
                />
            </div>
            {text && (
                <motion.p
                    className="text-sm text-gray-500 dark:text-gray-400"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.2 }}
                >
                    {text}
                </motion.p>
            )}
        </div>
    );
}
