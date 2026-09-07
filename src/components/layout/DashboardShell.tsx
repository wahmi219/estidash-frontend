'use client';

import { ReactNode, useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Sidebar from './Sidebar';
import { SidebarProvider, useSidebar } from './SidebarContext';
import { Bell, X, Mail, Zap } from 'lucide-react';
import { useEmailNotifications } from '@/hooks/useEmailNotifications';
import { useSelector } from 'react-redux';
import type { RootState } from '@/store/store';

// ── Notification Bell ────────────────────────────────────────────────────────

const INTENT_COLOR: Record<string, string> = {
    hot_lead: 'text-emerald-400',
    soft:     'text-cyan-400',
    not_now:  'text-amber-400',
    no:       'text-gray-500',
};

function NotificationBell() {
    const isLoggedIn  = useSelector((s: RootState) => !!s.auth.user);
    const { notifications, unreadCount, clearUnread, dismiss, dismissAll } = useEmailNotifications(isLoggedIn);
    const [open, setOpen] = useState(false);
    const panelRef = useRef<HTMLDivElement>(null);

    // Close on outside click
    useEffect(() => {
        if (!open) return;
        function handleClick(e: MouseEvent) {
            if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
                setOpen(false);
            }
        }
        document.addEventListener('mousedown', handleClick);
        return () => document.removeEventListener('mousedown', handleClick);
    }, [open]);

    function toggle() {
        setOpen(v => !v);
        if (!open && unreadCount > 0) clearUnread();
    }

    function fmt(iso: string) {
        if (!iso) return '';
        const d = new Date(iso);
        const now = new Date();
        const diffMs = now.getTime() - d.getTime();
        const diffMin = Math.floor(diffMs / 60000);
        if (diffMin < 1)  return 'just now';
        if (diffMin < 60) return `${diffMin}m ago`;
        const diffH = Math.floor(diffMin / 60);
        if (diffH < 24)   return `${diffH}h ago`;
        return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    }

    return (
        <div ref={panelRef} className="fixed top-4 right-4 z-[60]">
            {/* Bell button */}
            <button
                onClick={toggle}
                className="relative flex items-center justify-center w-9 h-9 rounded-xl bg-gray-900/80 backdrop-blur-sm border border-white/[0.08] text-gray-400 hover:text-white hover:border-white/[0.15] transition-all shadow-lg"
            >
                <Bell className={`w-4 h-4 ${unreadCount > 0 ? 'text-cyan-400' : ''}`} />
                {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-0.5 flex items-center justify-center rounded-full bg-cyan-500 text-[9px] font-bold text-white animate-pulse">
                        {unreadCount > 99 ? '99+' : unreadCount}
                    </span>
                )}
            </button>

            {/* Dropdown panel */}
            <AnimatePresence>
                {open && (
                    <motion.div
                        initial={{ opacity: 0, y: -8, scale: 0.97 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -8, scale: 0.97 }}
                        transition={{ duration: 0.15 }}
                        className="absolute top-11 right-0 w-80 bg-gray-950/95 backdrop-blur-xl border border-white/[0.09] rounded-2xl shadow-2xl overflow-hidden"
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.07]">
                            <div className="flex items-center gap-2">
                                <Mail className="w-3.5 h-3.5 text-cyan-400" />
                                <span className="text-xs font-semibold text-white">New Emails</span>
                                {notifications.length > 0 && (
                                    <span className="text-[9px] font-mono text-gray-500 bg-white/5 rounded px-1">{notifications.length}</span>
                                )}
                            </div>
                            {notifications.length > 0 && (
                                <button onClick={dismissAll} className="text-[10px] text-gray-600 hover:text-gray-300 transition-colors">
                                    Clear all
                                </button>
                            )}
                        </div>

                        {/* Notification list */}
                        <div className="max-h-96 overflow-y-auto">
                            {notifications.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-10 px-4 text-center">
                                    <Bell className="w-8 h-8 text-gray-700 mb-2" />
                                    <p className="text-gray-500 text-sm">No new emails</p>
                                    <p className="text-gray-700 text-xs mt-0.5">Checks every 20 seconds</p>
                                </div>
                            ) : (
                                notifications.map(n => (
                                    <div key={n.id} className="group relative flex gap-3 px-4 py-3 border-b border-white/[0.05] hover:bg-white/[0.03] transition-colors">
                                        <div className="mt-0.5 w-7 h-7 rounded-full bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center shrink-0">
                                            <Mail className="w-3.5 h-3.5 text-cyan-400" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center justify-between gap-1 mb-0.5">
                                                <p className="text-[11px] font-medium text-gray-200 truncate">{n.from_email}</p>
                                                <span className="text-[9px] font-mono text-gray-600 tabular-nums shrink-0">{fmt(n.received_at)}</span>
                                            </div>
                                            <p className="text-[11px] text-gray-400 truncate">{n.subject}</p>
                                            {n.preview && (
                                                <p className="text-[10px] text-gray-600 truncate mt-0.5">{n.preview}</p>
                                            )}
                                            {n.intent && (
                                                <span className={`text-[9px] font-medium mt-1 inline-block ${INTENT_COLOR[n.intent] ?? 'text-gray-500'}`}>
                                                    {n.intent === 'hot_lead' && '🔥 '}
                                                    {n.intent.replace('_', ' ')}
                                                </span>
                                            )}
                                        </div>
                                        <button
                                            onClick={() => dismiss(n.id)}
                                            className="absolute top-2 right-2 p-0.5 rounded text-gray-700 hover:text-gray-300 opacity-0 group-hover:opacity-100 transition-all"
                                        >
                                            <X className="w-3 h-3" />
                                        </button>
                                    </div>
                                ))
                            )}
                        </div>

                        {/* Footer */}
                        <div className="px-4 py-2 border-t border-white/[0.05] flex items-center gap-1.5">
                            <Zap className="w-3 h-3 text-gray-600" />
                            <p className="text-[10px] text-gray-600">Live · polls every 20s</p>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

// ── Shell ─────────────────────────────────────────────────────────────────────

function ShellInner({ children }: { children: ReactNode }) {
    const { isCollapsed } = useSidebar();

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950">
            {/* Animated Background */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none">
                <div className="absolute -top-40 -right-40 w-[600px] h-[600px] bg-cyan-500/3 dark:bg-cyan-500/5 rounded-full blur-[120px]" />
                <div className="absolute -bottom-40 -left-40 w-[600px] h-[600px] bg-purple-500/3 dark:bg-purple-500/5 rounded-full blur-[120px]" />
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-indigo-500/2 dark:bg-indigo-500/3 rounded-full blur-[150px]" />
            </div>

            {/* Sidebar */}
            <Sidebar />

            {/* Notification Bell — visible on all pages */}
            <NotificationBell />

            {/* Main Content — margin adjusts with sidebar */}
            <motion.main
                initial={false}
                animate={{ marginLeft: isCollapsed ? 72 : 280 }}
                transition={{ duration: 0.2, ease: 'easeInOut' }}
                className="min-h-screen relative z-10"
            >
                {children}
            </motion.main>
        </div>
    );
}

export default function DashboardShell({ children }: { children: ReactNode }) {
    return (
        <SidebarProvider>
            <ShellInner>{children}</ShellInner>
        </SidebarProvider>
    );
}
