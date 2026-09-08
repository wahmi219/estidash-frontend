'use client';

import React from 'react';
import { motion } from 'framer-motion';

interface PageHeaderProps {
    icon: React.ComponentType<{ size?: number; className?: string }>;
    title: string;
    subtitle?: string;
    actions?: React.ReactNode;
    className?: string;
}

/**
 * Single source of truth for every primary page's header — icon container,
 * title, subtitle, and right-side actions all resolve to identical sizes
 * here so pages never drift into their own one-off 20/24/30px title or
 * differently-sized icon box again. See the frontend UI/UX standardization
 * pass this was introduced in.
 */
export default function PageHeader({ icon: Icon, title, subtitle, actions, className }: PageHeaderProps) {
    return (
        <motion.div
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            className={`flex items-center justify-between gap-4 flex-wrap mb-6 ${className ?? ''}`}
        >
            <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-[#F7F9FB] border border-[#DFE6EE] flex items-center justify-center flex-shrink-0">
                    <Icon size={20} className="text-[#00458B]" />
                </div>
                <div>
                    <h1 className="text-[28px] font-bold text-[#0E2B5C] leading-tight">{title}</h1>
                    {subtitle && <p className="text-[14px] text-[#5B6B7D] mt-0.5">{subtitle}</p>}
                </div>
            </div>
            {actions && <div className="flex items-center gap-2 flex-shrink-0">{actions}</div>}
        </motion.div>
    );
}
