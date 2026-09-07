'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import { Settings, Database, Bell, Shield, Key, Bot, Users, Monitor, ArrowRight, Gauge } from 'lucide-react';
import { useSelector } from 'react-redux';
import type { RootState } from '@/store/store';
import { hasRole } from '@/lib/roles';

const settingsItems = [
    {
        icon: Users,
        title: 'User Management',
        desc: 'Create accounts, assign roles, and manage team access',
        href: '/dashboard/settings/users',
        gradient: 'from-purple-500/20 to-pink-500/20',
        iconColor: 'text-purple-400',
        minRole: 'super_admin' as const,
    },
    {
        icon: Bot,
        title: 'Agent Settings',
        desc: 'Configure AI models and parameters for each agent',
        href: '/dashboard/settings/agents',
        gradient: 'from-cyan-500/20 to-purple-500/20',
        iconColor: 'text-cyan-400',
        minRole: 'super_admin' as const,
        // MVP: hidden from settings grid, route stays functional
        hidden: true,
    },
    {
        icon: Monitor,
        title: 'Trusted Devices',
        desc: 'Approve, revoke, and monitor registered device access',
        href: '/dashboard/settings/devices',
        gradient: 'from-teal-500/20 to-cyan-500/20',
        iconColor: 'text-teal-400',
        minRole: 'super_admin' as const,
    },
    {
        icon: Gauge,
        title: 'Permit Scoring',
        desc: 'Tune the lead-scoring rubric and run scoring across all permits',
        href: '/dashboard/settings/permit-scoring',
        gradient: 'from-orange-500/20 to-red-500/20',
        iconColor: 'text-orange-400',
        minRole: 'super_admin' as const,
        // MVP: hidden from settings grid, route stays functional
        hidden: true,
    },
    {
        icon: Database,
        title: 'Data Sources',
        desc: 'Manage connected databases and file uploads',
        href: null,
        gradient: 'from-blue-500/20 to-indigo-500/20',
        iconColor: 'text-blue-400',
        minRole: 'admin' as const,
    },
    {
        icon: Bell,
        title: 'Notifications',
        desc: 'Configure alerts and email preferences',
        href: null,
        gradient: 'from-amber-500/20 to-orange-500/20',
        iconColor: 'text-amber-400',
        minRole: 'admin' as const,
    },
    {
        icon: Key,
        title: 'API Keys',
        desc: 'Manage LLM and integration API keys',
        href: null,
        gradient: 'from-emerald-500/20 to-teal-500/20',
        iconColor: 'text-emerald-400',
        minRole: 'super_admin' as const,
    },
    {
        icon: Shield,
        title: 'Security',
        desc: 'Password and authentication settings',
        href: null,
        gradient: 'from-red-500/20 to-pink-500/20',
        iconColor: 'text-red-400',
        minRole: 'admin' as const,
    },
];

export default function SettingsPage() {
    const { user } = useSelector((s: RootState) => s.auth);
    const userRole = user?.role ?? 'viewer';
    const visibleItems = settingsItems.filter(item => !item.hidden && hasRole(userRole, item.minRole));

    return (
        <div className="p-6 lg:p-8">
            <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-8"
            >
                <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 rounded-xl bg-gradient-to-br from-gray-400/20 to-gray-500/20">
                        <Settings className="w-6 h-6 text-gray-400" />
                    </div>
                    <h1 className="text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white">Settings</h1>
                </div>
                <p className="text-gray-500 dark:text-gray-400">Configure your dashboard preferences</p>
            </motion.div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {visibleItems.map((item, i) => {
                    const content = (
                        <motion.div
                            key={i}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.1 }}
                            className={`p-6 rounded-xl bg-black/4 dark:bg-white/5 border ${item.href
                                    ? 'border-gray-200 dark:border-white/10 hover:bg-black/6 dark:hover:bg-white/8 hover:border-cyan-500/20 cursor-pointer'
                                    : 'border-gray-200 dark:border-white/10 opacity-60 cursor-not-allowed'
                                } transition-all group`}
                        >
                            <div className="flex items-center gap-4">
                                <div className={`p-3 rounded-xl bg-gradient-to-br ${item.gradient}`}>
                                    <item.icon className={`w-6 h-6 ${item.iconColor}`} />
                                </div>
                                <div className="flex-1">
                                    <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                                        {item.title}
                                        {!item.href && (
                                            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-black/5 dark:bg-white/10 text-gray-500 uppercase tracking-wider font-bold">
                                                Soon
                                            </span>
                                        )}
                                    </h3>
                                    <p className="text-sm text-gray-500">{item.desc}</p>
                                </div>
                                {item.href && (
                                    <ArrowRight size={18} className="text-gray-600 group-hover:text-cyan-400 transition-colors" />
                                )}
                            </div>
                        </motion.div>
                    );

                    if (item.href) {
                        return (
                            <Link key={i} href={item.href} className="block">
                                {content}
                            </Link>
                        );
                    }
                    return content;
                })}
            </div>
        </div>
    );
}
