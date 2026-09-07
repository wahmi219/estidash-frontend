'use client';

import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useSidebar } from './SidebarContext';
import ThemeToggle from './ThemeToggle';
import { motion, AnimatePresence } from 'framer-motion';
import {
    LayoutDashboard,
    MapPin,
    BarChart3,
    Target,
    Users,
    MessageSquare,
    ChevronLeft,
    ChevronRight,
    Sparkles,
    Settings,
    HelpCircle,
    TrendingUp,
    Upload,
    FileText,
    Bot,
    HardHat,
    ShieldCheck,
    Database,
    LandPlot,
    Monitor,
    LogOut,
    Wallet,
    Gauge,
    Inbox,
    Flame,
} from 'lucide-react';
import clsx from 'clsx';
import { useSelector, useDispatch } from 'react-redux';
import type { RootState, AppDispatch } from '@/store/store';
import { hasRole } from '@/lib/roles';
import type { Role } from '@/lib/roles';
import { logout } from '@/store/slices/authSlice';
import { authService } from '@/services/authService';

interface NavItem {
    id: string;
    label: string;
    icon: React.ReactNode;
    href: string;
    badge?: string | number;
    minRole?: Role;
    children?: NavItem[];
    // MVP: hidden from nav, route stays functional — see estidash CLAUDE.md nav simplification plan
    hidden?: boolean;
}

const mainNavItems: NavItem[] = [
    {
        id: 'dashboard',
        label: 'Dashboard',
        icon: <LayoutDashboard size={20} />,
        href: '/dashboard',
        minRole: 'viewer',
    },
    {
        id: 'permit-records',
        label: 'Permit Records',
        icon: <FileText size={20} />,
        href: '/dashboard/permits',
        minRole: 'viewer',
    },
    {
        id: 'inbox',
        label: 'Inbox',
        icon: <Inbox size={20} />,
        href: '/dashboard/inbox',
        minRole: 'outreach',
        hidden: true,
    },
    {
        id: 'outreach',
        label: 'Outreach Planning',
        icon: <Users size={20} />,
        href: '/dashboard/outreach',
        minRole: 'admin',
        hidden: true,
        children: [
            {
                id: 'warmup',
                label: 'Inbox Warmup',
                icon: <Flame size={16} />,
                href: '/dashboard/warmup',
                minRole: 'admin',
            },
        ],
    },
    {
        id: 'upload',
        label: 'Data Upload',
        icon: <Upload size={20} />,
        href: '/dashboard/upload',
        minRole: 'admin',
    },
    {
        id: 'cbsa-insights',
        label: 'CBSA Insights',
        icon: <MapPin size={20} />,
        href: '/dashboard/cbsa',
        minRole: 'admin',
        hidden: true,
    },
    {
        id: 'permit-analytics',
        label: 'Permit Analytics',
        icon: <BarChart3 size={20} />,
        href: '/dashboard/analytics',
        minRole: 'admin',
        hidden: true,
    },
    {
        id: 'trade-signals',
        label: 'Trade Signals',
        icon: <Target size={20} />,
        href: '/dashboard/trades',
        minRole: 'admin',
        hidden: true,
    },
    {
        id: 'data-sources',
        label: 'Data Sources',
        icon: <Database size={20} />,
        href: '/dashboard/datasources',
        minRole: 'admin',
    },
    {
        id: 'county-coverage',
        label: 'County Coverage',
        icon: <LandPlot size={20} />,
        href: '/dashboard/counties',
        minRole: 'admin',
    },
    {
        id: 'contractors',
        label: 'Contractors',
        icon: <HardHat size={20} />,
        href: '/dashboard/contractors',
        minRole: 'outreach',
        children: [
            {
                id: 'official-registry',
                label: 'Official Registry',
                icon: <ShieldCheck size={16} />,
                href: '/dashboard/contractors?view=registry',
                minRole: 'outreach',
            },
        ],
    },
    {
        id: 'economic-data',
        label: 'Economic Data',
        icon: <TrendingUp size={20} />,
        href: '/dashboard/economic',
        minRole: 'admin',
        hidden: true,
    },
];

const secondaryNavItems: NavItem[] = [
    {
        id: 'chat',
        label: 'AI Agent',
        icon: <MessageSquare size={20} />,
        href: '/dashboard/chat',
        minRole: 'admin',
        hidden: true,
    },
    {
        id: 'agent-settings',
        label: 'Agent Settings',
        icon: <Bot size={20} />,
        href: '/dashboard/settings/agents',
        minRole: 'super_admin',
        hidden: true,
    },
];

const bottomNavItems: NavItem[] = [
    {
        id: 'lead-banks',
        label: 'Lead Banks',
        icon: <Wallet size={20} />,
        href: '/dashboard/settings/lead-banks',
        minRole: 'super_admin',
        hidden: true,
    },
    {
        id: 'permit-scoring',
        label: 'Permit Scoring',
        icon: <Gauge size={20} />,
        href: '/dashboard/settings/permit-scoring',
        minRole: 'super_admin',
        hidden: true,
    },
    {
        id: 'user-management',
        label: 'User Management',
        icon: <Users size={20} />,
        href: '/dashboard/settings/users',
        minRole: 'super_admin',
    },
    {
        id: 'trusted-devices',
        label: 'Trusted Devices',
        icon: <Monitor size={20} />,
        href: '/dashboard/settings/devices',
        minRole: 'super_admin',
    },
    {
        id: 'settings',
        label: 'Settings',
        icon: <Settings size={20} />,
        href: '/dashboard/settings',
        minRole: 'admin',
    },
    {
        id: 'help',
        label: 'Help',
        icon: <HelpCircle size={20} />,
        href: '/dashboard/help',
        minRole: 'viewer',
        hidden: true,
    },
];

export default function Sidebar() {
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const router = useRouter();
    const dispatch = useDispatch<AppDispatch>();
    const { isCollapsed, toggle } = useSidebar();
    const { user, accessToken } = useSelector((s: RootState) => s.auth);
    const userRole = (user?.role ?? 'viewer') as Role;

    const isActive = (href: string) => {
        const [hrefPath, hrefQuery] = href.split('?');
        if (hrefPath === '/dashboard') {
            return pathname === '/dashboard';
        }
        if (!pathname.startsWith(hrefPath)) return false;
        // Items with a query string (e.g. the Official Registry child under
        // Contractors, which shares its parent's path) only count as active
        // when that specific param actually matches the current URL —
        // otherwise every /dashboard/contractors?... variant would light up.
        if (hrefQuery) {
            const hrefParams = new URLSearchParams(hrefQuery);
            for (const [key, value] of hrefParams) {
                if (searchParams.get(key) !== value) return false;
            }
        }
        return true;
    };

    const canSee = (item: NavItem) =>
        !item.hidden && (!item.minRole || hasRole(userRole, item.minRole));

    async function handleLogout() {
        try {
            if (accessToken) await authService.logout(accessToken);
        } catch {
            // ignore — clear state regardless
        }
        dispatch(logout());
        router.replace('/login');
    }

    return (
        <motion.aside
            initial={false}
            animate={{ width: isCollapsed ? 72 : 280 }}
            transition={{ duration: 0.2, ease: 'easeInOut' }}
            className="fixed left-0 top-0 h-screen bg-white/90 dark:bg-gray-950/90 border-r border-gray-200 dark:border-white/8 backdrop-blur-xl z-50 flex flex-col"
        >
            {/* Logo */}
            <div className="p-4 border-b border-gray-200 dark:border-white/8">
                <Link href="/dashboard" className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-linear-to-br from-cyan-500 to-purple-600 flex items-center justify-center shrink-0">
                        <TrendingUp size={20} className="text-white" />
                    </div>
                    <AnimatePresence>
                        {!isCollapsed && (
                            <motion.div
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -10 }}
                                transition={{ duration: 0.15 }}
                            >
                                <h1 className="text-lg font-bold gradient-text">EstiHub</h1>
                                <p className="text-xs text-gray-500 dark:text-gray-400">Market Intelligence</p>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </Link>
            </div>

            {/* Main Navigation */}
            <nav className="flex-1 p-3 space-y-1 overflow-y-auto hide-scrollbar">
                {/* Primary Nav */}
                <div className="space-y-1">
                    {!isCollapsed && (
                        <p className="px-3 py-2 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                            Analytics
                        </p>
                    )}
                    {mainNavItems.filter(canSee).map((item) => {
                        const visibleChildren = item.children?.filter(canSee) ?? [];
                        const childActive = visibleChildren.some(c => isActive(c.href));
                        const parentActive = isActive(item.href) && !childActive;
                        const expanded = !isCollapsed && (isActive(item.href) || childActive);
                        return (
                            <div key={item.id}>
                                <Link
                                    href={item.href}
                                    className={clsx('nav-item', parentActive && 'active')}
                                    title={isCollapsed ? item.label : undefined}
                                >
                                    <span className="shrink-0">{item.icon}</span>
                                    <AnimatePresence>
                                        {!isCollapsed && (
                                            <motion.span
                                                initial={{ opacity: 0 }}
                                                animate={{ opacity: 1 }}
                                                exit={{ opacity: 0 }}
                                                className="truncate"
                                            >
                                                {item.label}
                                            </motion.span>
                                        )}
                                    </AnimatePresence>
                                    {item.badge && !isCollapsed && (
                                        <span className="ml-auto badge badge-info text-xs">
                                            {item.badge}
                                        </span>
                                    )}
                                </Link>
                                <AnimatePresence>
                                    {expanded && visibleChildren.length > 0 && (
                                        <motion.div
                                            initial={{ opacity: 0, height: 0 }}
                                            animate={{ opacity: 1, height: 'auto' }}
                                            exit={{ opacity: 0, height: 0 }}
                                            transition={{ duration: 0.15 }}
                                            className="overflow-hidden pl-8 space-y-0.5 mt-0.5"
                                        >
                                            {visibleChildren.map(child => (
                                                <Link
                                                    key={child.id}
                                                    href={child.href}
                                                    className={clsx(
                                                        'nav-item text-sm py-1.5',
                                                        isActive(child.href) && 'active'
                                                    )}
                                                >
                                                    <span className="shrink-0">{child.icon}</span>
                                                    <motion.span
                                                        initial={{ opacity: 0 }}
                                                        animate={{ opacity: 1 }}
                                                        exit={{ opacity: 0 }}
                                                        className="truncate"
                                                    >
                                                        {child.label}
                                                    </motion.span>
                                                </Link>
                                            ))}
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>
                        );
                    })}
                </div>

                {/* Divider */}
                <div className="my-4 border-t border-gray-200 dark:border-white/8" />

                {/* AI Assistant — only shown to admin+ */}
                {secondaryNavItems.filter(canSee).length > 0 && (
                    <div className="space-y-1">
                        {!isCollapsed && (
                            <p className="px-3 py-2 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                AI Assistant
                            </p>
                        )}
                        {secondaryNavItems.filter(canSee).map((item) => (
                            <Link
                                key={item.id}
                                href={item.href}
                                className={clsx(
                                    'nav-item group',
                                    isActive(item.href) && 'active'
                                )}
                                title={isCollapsed ? item.label : undefined}
                            >
                                <span className="shrink-0 relative">
                                    {item.icon}
                                    <Sparkles
                                        size={10}
                                        className="absolute -top-1 -right-1 text-purple-400 opacity-0 group-hover:opacity-100 transition-opacity"
                                    />
                                </span>
                                <AnimatePresence>
                                    {!isCollapsed && (
                                        <motion.span
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: 1 }}
                                            exit={{ opacity: 0 }}
                                            className="truncate"
                                        >
                                            {item.label}
                                        </motion.span>
                                    )}
                                </AnimatePresence>
                            </Link>
                        ))}
                    </div>
                )}
            </nav>

            {/* Bottom Navigation */}
            <div className="p-3 border-t border-gray-200 dark:border-white/8 space-y-1">
                {bottomNavItems.filter(canSee).map((item) => (
                    <Link
                        key={item.id}
                        href={item.href}
                        className={clsx(
                            'nav-item',
                            isActive(item.href) && 'active'
                        )}
                        title={isCollapsed ? item.label : undefined}
                    >
                        <span className="shrink-0">{item.icon}</span>
                        <AnimatePresence>
                            {!isCollapsed && (
                                <motion.span
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                    className="truncate"
                                >
                                    {item.label}
                                </motion.span>
                            )}
                        </AnimatePresence>
                    </Link>
                ))}

                {/* User info + Logout */}
                {user && (
                    <div className={clsx(
                        'flex items-center gap-3 px-3 py-2 mt-1',
                        isCollapsed && 'justify-center'
                    )}>
                        <div className="w-7 h-7 rounded-full bg-linear-to-br from-cyan-500 to-purple-600 flex items-center justify-center shrink-0 text-white text-xs font-bold">
                            {user.full_name.charAt(0).toUpperCase()}
                        </div>
                        <AnimatePresence>
                            {!isCollapsed && (
                                <motion.div
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                    className="flex-1 min-w-0"
                                >
                                    <p className="text-xs font-medium text-gray-700 dark:text-gray-200 truncate">{user.full_name}</p>
                                    <p className="text-[10px] uppercase tracking-widest text-gray-500">{user.role.replace('_', ' ')}</p>
                                </motion.div>
                            )}
                        </AnimatePresence>
                        <AnimatePresence>
                            {!isCollapsed && (
                                <motion.button
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                    onClick={handleLogout}
                                    title="Sign out"
                                    className="text-gray-500 hover:text-red-400 transition-colors focus-visible:ring-2 focus-visible:ring-red-400 rounded"
                                >
                                    <LogOut size={15} />
                                </motion.button>
                            )}
                        </AnimatePresence>
                    </div>
                )}

                {/* Theme Toggle */}
                <ThemeToggle />

                {/* Collapse Toggle */}
                <button
                    onClick={toggle}
                    className="nav-item w-full justify-center lg:justify-start"
                    title={isCollapsed ? 'Expand' : 'Collapse'}
                >
                    {isCollapsed ? (
                        <ChevronRight size={20} />
                    ) : (
                        <>
                            <ChevronLeft size={20} />
                            <span>Collapse</span>
                        </>
                    )}
                </button>
            </div>
        </motion.aside>
    );
}
