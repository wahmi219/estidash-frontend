'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useSidebar } from './SidebarContext';
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
    LogOut,
    Wallet,
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

// CORE — Phase 9 target IA (docs/phase9_chunk1_report.md, "Lock navigation").
// Contact Info Needed / Ready for Lead Bank / Lead Bank are real Phase 6/7
// backend workflows with no frontend page yet — added here, hidden, so the
// intended structure is locked in code now rather than bolted on ad hoc
// when each page ships in a later Phase 9 chunk. Flip hidden:false the
// same commit each page goes live.
const coreNavItems: NavItem[] = [
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
        id: 'contact-info-needed',
        label: 'Contact Info Needed',
        icon: <Inbox size={20} />,
        href: '/dashboard/contact-info-needed',
        minRole: 'outreach',
        hidden: true, // Phase 9 Chunk 2+ — backend: app/routers/contractor_workflow.py
    },
    {
        id: 'ready-for-lead-bank',
        label: 'Ready for Lead Bank',
        icon: <Target size={20} />,
        href: '/dashboard/ready-for-lead-bank',
        minRole: 'outreach',
        hidden: true, // Phase 9 Chunk 2+ — backend: list_ready_for_lead_bank()
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
        id: 'lead-bank',
        label: 'Lead Bank',
        icon: <Wallet size={20} />,
        href: '/dashboard/lead-bank',
        minRole: 'outreach',
        hidden: true, // Phase 9 Chunk 2+ — backend: /api/v1/lead-bank-v2 + /api/v1/manual-outreach
    },
];

// DATA — Data Sources, County Coverage, Import Data kept adjacent (Phase 2C)
// — "Import Data" is the same Excel-upload page previously labeled "Data
// Upload", renamed/relocated here rather than duplicated.
const dataNavItems: NavItem[] = [
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
        id: 'upload',
        label: 'Import Data',
        icon: <Upload size={20} />,
        href: '/dashboard/upload',
        minRole: 'admin',
    },
];

// Legacy/exploratory pages predating the Phase 9 target IA — already hidden
// from nav (routes stay functional for anyone with a direct link). Kept
// separate from coreNavItems/dataNavItems so the target structure above
// reads cleanly; see docs/phase9_chunk1_report.md's frontend audit for the
// KEEP/ADAPT/REBUILD/HIDE/REMOVE LATER classification of each.
const legacyNavItems: NavItem[] = [
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
        id: 'user-management',
        label: 'User Management',
        icon: <Users size={20} />,
        href: '/dashboard/settings/users',
        minRole: 'super_admin',
    },
    {
        // MVP: Settings has exactly one real configuration area (Permit
        // Qualification), so this links straight there rather than to a
        // multi-card hub. /dashboard/settings itself still exists as a
        // redirect for anyone with that URL saved/linked.
        id: 'settings',
        label: 'Settings',
        icon: <Settings size={20} />,
        href: '/dashboard/settings/permit-scoring',
        minRole: 'super_admin',
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

    const visibleSecondaryNavItems = secondaryNavItems.filter(canSee);
    const visibleBottomNavItems = bottomNavItems.filter(canSee);

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
            animate={{ width: isCollapsed ? 64 : 256 }}
            transition={{ duration: 0.2, ease: 'easeInOut' }}
            className="fixed left-0 top-0 h-screen bg-white border-r border-gray-200 z-50 flex flex-col"
        >
            {/* Logo */}
            <div className="pt-4 pr-4 pb-4 pl-2 border-b border-[#DFE6EE]">
                <Link href="/dashboard" className="flex flex-col items-start">
                    {isCollapsed ? (
                        // Collapsed: a cropped window into the same wordmark asset,
                        // scaled uniformly (never stretched) so only the hexagon
                        // mark shows — no separate icon-only asset exists in this
                        // project, so this reuses the one already available here.
                        <div className="w-6 h-7 relative overflow-hidden shrink-0">
                            <Image
                                src="/brand/estimation-hub-logo-transparent.png"
                                alt="Estimation Hub"
                                width={182}
                                height={47}
                                className="absolute max-w-none"
                                style={{ top: '-9px', left: '-13px' }}
                            />
                        </div>
                    ) : (
                        <Image
                            src="/brand/estimation-hub-logo-transparent.png"
                            alt="Estimation Hub"
                            width={566}
                            height={146}
                            priority
                            className="w-[220px] h-auto object-contain"
                        />
                    )}
                </Link>
            </div>

            {/* Main Navigation */}
            <nav className="flex-1 p-3 space-y-1 overflow-y-auto hide-scrollbar">
                {/* Core */}
                <div className="space-y-1">
                    {!isCollapsed && (
                        <p className="px-3 py-2 text-xs font-medium text-[#5B6B7D] uppercase tracking-wider">
                            Core
                        </p>
                    )}
                    {[...coreNavItems, ...legacyNavItems].filter(canSee).map((item) => {
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

                {/* Data */}
                {dataNavItems.filter(canSee).length > 0 && (
                    <div className="my-4 border-t border-[#DFE6EE]" />
                )}
                <div className="space-y-1">
                    {!isCollapsed && dataNavItems.filter(canSee).length > 0 && (
                        <p className="px-3 py-2 text-xs font-medium text-[#5B6B7D] uppercase tracking-wider">
                            Data
                        </p>
                    )}
                    {dataNavItems.filter(canSee).map((item) => (
                        <Link
                            key={item.id}
                            href={item.href}
                            className={clsx('nav-item', isActive(item.href) && 'active')}
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
                </div>

                {/* Divider — only when the AI Assistant section below actually
                    has a visible item for this role, otherwise it's an orphan
                    rule with nothing under it. */}
                {visibleSecondaryNavItems.length > 0 && (
                    <div className="my-4 border-t border-[#DFE6EE]" />
                )}

                {/* AI Assistant — only shown to admin+ */}
                {visibleSecondaryNavItems.length > 0 && (
                    <div className="space-y-1">
                        {!isCollapsed && (
                            <p className="px-3 py-2 text-xs font-medium text-[#5B6B7D] uppercase tracking-wider">
                                AI Assistant
                            </p>
                        )}
                        {visibleSecondaryNavItems.map((item) => (
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
                                        className="absolute -top-1 -right-1 text-[#00458B] opacity-0 group-hover:opacity-100 transition-opacity"
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
            <div className="p-3 border-t border-[#DFE6EE] space-y-1">
                {visibleBottomNavItems.length > 0 && !isCollapsed && (
                    <p className="px-3 py-2 text-xs font-medium text-[#5B6B7D] uppercase tracking-wider">
                        Admin
                    </p>
                )}
                {visibleBottomNavItems.map((item) => (
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
                        <div className="w-7 h-7 rounded-full bg-[#00458B] flex items-center justify-center shrink-0 text-white text-xs font-bold">
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
                                    <p className="text-xs font-medium text-[#0E2B5C] truncate">{user.full_name}</p>
                                    <p className="text-[11px] uppercase tracking-widest text-[#5B6B7D]">{user.role.replace('_', ' ')}</p>
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
                                    className="text-[#5B6B7D] hover:text-red-600 transition-colors focus-visible:ring-2 focus-visible:ring-red-400 rounded"
                                >
                                    <LogOut size={15} />
                                </motion.button>
                            )}
                        </AnimatePresence>
                    </div>
                )}

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
