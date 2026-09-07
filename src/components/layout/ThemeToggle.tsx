'use client';

import { useTheme } from 'next-themes';
import { Sun, Moon, Monitor } from 'lucide-react';
import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSidebar } from './SidebarContext';

export default function ThemeToggle() {
    const { theme, setTheme } = useTheme();
    const { isCollapsed } = useSidebar();
    const [mounted, setMounted] = useState(false);

    useEffect(() => setMounted(true), []);

    if (!mounted) return null;

    const cycle = () => {
        if (theme === 'dark') setTheme('light');
        else if (theme === 'light') setTheme('system');
        else setTheme('dark');
    };

    const icon =
        theme === 'dark' ? <Moon size={20} /> :
        theme === 'light' ? <Sun size={20} /> :
        <Monitor size={20} />;

    const label =
        theme === 'dark' ? 'Dark' :
        theme === 'light' ? 'Light' :
        'System';

    return (
        <button
            onClick={cycle}
            className="nav-item w-full justify-center lg:justify-start"
            title={`Theme: ${label}`}
        >
            <span className="flex-shrink-0">{icon}</span>
            <AnimatePresence>
                {!isCollapsed && (
                    <motion.span
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="truncate"
                    >
                        {label}
                    </motion.span>
                )}
            </AnimatePresence>
        </button>
    );
}
