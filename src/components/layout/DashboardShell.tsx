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
                className="relative flex items-center justify-center w-9 h-9 rounded-xl bg-white border border-gray-200 text-gray-500 hover:text-gray-900 hover:border-gray-300 transition-all shadow-sm"
            >
                <Bell className={`w-4 h-4 ${unreadCount > 0 ? 'text-indigo-600' : ''}`} />
                {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-0.5 flex items-center justify-center rounded-full bg-indigo-600 text-[9px] font-bold text-white">
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
                        className="absolute top-11 right-0 w-80 bg-white border border-gray-200 rounded-2xl shadow-lg overflow-hidden"
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
                            <div className="flex items-center gap-2">
                                <Mail className="w-3.5 h-3.5 text-indigo-600" />
                                <span className="text-xs font-semibold text-gray-900">New Emails</span>
                                {notifications.length > 0 && (
                                    <span className="text-[9px] font-mono text-gray-500 bg-gray-100 rounded px-1">{notifications.length}</span>
                                )}
                            </div>
                            {notifications.length > 0 && (
                                <button onClick={dismissAll} className="text-[10px] text-gray-500 hover:text-gray-900 transition-colors">
                                    Clear all
                                </button>
                            )}
                        </div>

                        {/* Notification list */}
                        <div className="max-h-96 overflow-y-auto">
                            {notifications.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-10 px-4 text-center">
                                    <Bell className="w-8 h-8 text-gray-300 mb-2" />
                                    <p className="text-gray-500 text-sm">No new emails</p>
                                    <p className="text-gray-400 text-xs mt-0.5">Checks every 20 seconds</p>
                                </div>
                            ) : (
                                notifications.map(n => (
                                    <div key={n.id} className="group relative flex gap-3 px-4 py-3 border-b border-gray-100 hover:bg-gray-50 transition-colors">
                                        <div className="mt-0.5 w-7 h-7 rounded-full bg-indigo-50 border border-indigo-100 flex items-center justify-center shrink-0">
                                            <Mail className="w-3.5 h-3.5 text-indigo-600" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center justify-between gap-1 mb-0.5">
                                                <p className="text-[11px] font-medium text-gray-700 truncate">{n.from_email}</p>
                                                <span className="text-[9px] font-mono text-gray-400 tabular-nums shrink-0">{fmt(n.received_at)}</span>
                                            </div>
                                            <p className="text-[11px] text-gray-500 truncate">{n.subject}</p>
                                            {n.preview && (
                                                <p className="text-[10px] text-gray-400 truncate mt-0.5">{n.preview}</p>
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
                                            className="absolute top-2 right-2 p-0.5 rounded text-gray-400 hover:text-gray-700 opacity-0 group-hover:opacity-100 transition-all"
                                        >
                                            <X className="w-3 h-3" />
                                        </button>
                                    </div>
                                ))
                            )}
                        </div>

                        {/* Footer */}
                        <div className="px-4 py-2 border-t border-gray-100 flex items-center gap-1.5">
                            <Zap className="w-3 h-3 text-gray-400" />
                            <p className="text-[10px] text-gray-400">Live · polls every 20s</p>
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
        <div className="min-h-screen bg-gray-50">
            {/* Sidebar */}
            <Sidebar />

            {/* Notification Bell — visible on all pages */}
            <NotificationBell />

            {/* Main Content — margin adjusts with sidebar */}
            <motion.main
                initial={false}
                animate={{ marginLeft: isCollapsed ? 64 : 256 }}
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
