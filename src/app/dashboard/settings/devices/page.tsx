'use client';

import { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Monitor, ShieldCheck, ShieldX, Clock, Search, RefreshCw, AlertCircle } from 'lucide-react';
import { useSelector } from 'react-redux';
import type { RootState } from '@/store/store';
import { authService, type AdminDeviceInfo } from '@/services/authService';

const STATUS_STYLES: Record<string, string> = {
    trusted: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    pending: 'bg-amber-50 text-amber-700 border-amber-200',
    revoked: 'bg-red-50 text-red-700 border-red-200',
};

function formatDate(iso: string | null) {
    if (!iso) return '—';
    return new Date(iso).toLocaleDateString('en-US', {
        month: 'short', day: 'numeric', year: 'numeric',
    });
}

function formatDateTime(iso: string | null) {
    if (!iso) return '—';
    return new Date(iso).toLocaleString('en-US', {
        month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
    });
}

type FilterStatus = 'all' | 'pending' | 'trusted' | 'revoked';

export default function DevicesPage() {
    const { accessToken } = useSelector((s: RootState) => s.auth);
    const [devices, setDevices] = useState<AdminDeviceInfo[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [search, setSearch] = useState('');
    const [filterStatus, setFilterStatus] = useState<FilterStatus>('all');
    const [actionLoading, setActionLoading] = useState<number | null>(null);

    const fetchDevices = useCallback(async () => {
        if (!accessToken) return;
        setIsLoading(true);
        setError(null);
        try {
            const data = await authService.listAllDevices(accessToken);
            setDevices(data);
        } catch (err: unknown) {
            const detail = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
            setError(detail ? `Failed to load devices: ${detail}` : 'Failed to load devices — check backend logs.');
        } finally {
            setIsLoading(false);
        }
    }, [accessToken]);

    useEffect(() => { fetchDevices(); }, [fetchDevices]);

    async function handleStatusChange(device: AdminDeviceInfo, newStatus: 'trusted' | 'revoked') {
        if (!accessToken) return;
        setActionLoading(device.id);
        try {
            const updated = await authService.updateDeviceStatus(device.id, newStatus, accessToken);
            setDevices(prev => prev.map(d => d.id === updated.id ? updated : d));
        } catch {
            setError('Failed to update device status.');
        } finally {
            setActionLoading(null);
        }
    }

    const filtered = devices.filter(d => {
        const matchStatus = filterStatus === 'all' || d.status === filterStatus;
        const q = search.toLowerCase();
        const matchSearch = !q ||
            (d.device_name ?? '').toLowerCase().includes(q) ||
            d.user_full_name.toLowerCase().includes(q) ||
            d.user_email.toLowerCase().includes(q) ||
            d.platform.toLowerCase().includes(q);
        return matchStatus && matchSearch;
    });

    const counts = {
        all: devices.length,
        pending: devices.filter(d => d.status === 'pending').length,
        trusted: devices.filter(d => d.status === 'trusted').length,
        revoked: devices.filter(d => d.status === 'revoked').length,
    };

    return (
        <div className="p-6 lg:p-8">
            {/* Header */}
            <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-8"
            >
                <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 rounded-xl bg-linear-to-br from-cyan-500/20 to-purple-500/20">
                        <Monitor className="w-6 h-6 text-cyan-400" />
                    </div>
                    <h1 className="text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white">Trusted Devices</h1>
                </div>
                <p className="text-gray-500 dark:text-gray-400">
                    Approve or revoke device registrations for all users
                </p>
            </motion.div>

            {/* Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
                {(['all', 'pending', 'trusted', 'revoked'] as FilterStatus[]).map(s => (
                    <button
                        key={s}
                        onClick={() => setFilterStatus(s)}
                        className={`p-4 rounded-xl border transition-all text-left ${filterStatus === s
                            ? 'border-cyan-500/40 bg-cyan-500/10'
                            : 'border-white/8 bg-white/5 hover:bg-white/8'
                            }`}
                    >
                        <p className="text-[10px] uppercase tracking-widest text-gray-500 mb-1 capitalize">{s}</p>
                        <p className="text-2xl font-mono font-bold text-white">{counts[s]}</p>
                    </button>
                ))}
            </div>

            {/* Toolbar */}
            <div className="flex items-center gap-3 mb-5">
                <div className="relative flex-1">
                    <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                    <input
                        type="text"
                        placeholder="Search by device name, user, or platform…"
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-white/5 border border-white/8 text-sm text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
                    />
                </div>
                <button
                    onClick={fetchDevices}
                    disabled={isLoading}
                    className="p-2.5 rounded-xl bg-white/5 border border-white/8 text-gray-400 hover:text-white hover:bg-white/8 transition-all disabled:opacity-50"
                    title="Refresh"
                >
                    <RefreshCw size={15} className={isLoading ? 'animate-spin' : ''} />
                </button>
            </div>

            {/* Error */}
            {error && (
                <div className="mb-4 flex items-center gap-2 text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">
                    <AlertCircle size={15} />
                    {error}
                </div>
            )}

            {/* Table */}
            <div className="bg-white border border-[#DFE6EE] rounded-lg overflow-hidden">
                {isLoading ? (
                    <div className="py-16 text-center text-[#5B6B7D] text-sm">Loading devices…</div>
                ) : filtered.length === 0 ? (
                    <div className="py-16 text-center text-[#5B6B7D] text-sm">
                        {devices.length === 0 ? 'No devices registered yet.' : 'No devices match your filter.'}
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="bg-[#F7F9FB] border-b border-[#DFE6EE]">
                                    {['Device', 'User', 'Platform', 'Status', 'Last Seen', 'Registered', 'Actions'].map(h => (
                                        <th key={h} className="px-4 py-3 text-left text-[10px] uppercase tracking-widest text-[#5B6B7D] font-medium whitespace-nowrap">
                                            {h}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                <AnimatePresence initial={false}>
                                    {filtered.map((device, i) => (
                                        <motion.tr
                                            key={device.id}
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: 1 }}
                                            exit={{ opacity: 0 }}
                                            transition={{ delay: i * 0.03 }}
                                            className="border-b border-[#DFE6EE] hover:bg-[#F7F9FB] transition-colors"
                                        >
                                            {/* Device */}
                                            <td className="px-4 py-3">
                                                <div className="flex items-center gap-2">
                                                    <Monitor size={14} className="text-[#5B6B7D] shrink-0" />
                                                    <span className="text-[#0E2B5C] font-medium truncate max-w-[140px]">
                                                        {device.device_name || 'Unnamed Device'}
                                                    </span>
                                                </div>
                                            </td>
                                            {/* User */}
                                            <td className="px-4 py-3">
                                                <p className="text-[#0E2B5C] truncate max-w-[140px]">{device.user_full_name}</p>
                                                <p className="text-[11px] text-[#5B6B7D] truncate max-w-[140px]">{device.user_email}</p>
                                            </td>
                                            {/* Platform */}
                                            <td className="px-4 py-3 text-[#5B6B7D] whitespace-nowrap">{device.platform}</td>
                                            {/* Status */}
                                            <td className="px-4 py-3">
                                                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium border capitalize ${STATUS_STYLES[device.status]}`}>
                                                    {device.status === 'trusted' && <ShieldCheck size={10} />}
                                                    {device.status === 'revoked' && <ShieldX size={10} />}
                                                    {device.status === 'pending' && <Clock size={10} />}
                                                    {device.status}
                                                </span>
                                            </td>
                                            {/* Last seen */}
                                            <td className="px-4 py-3 text-[#5B6B7D] font-mono text-xs whitespace-nowrap">
                                                {formatDateTime(device.last_seen_at)}
                                            </td>
                                            {/* Registered */}
                                            <td className="px-4 py-3 text-[#5B6B7D] font-mono text-xs whitespace-nowrap">
                                                {formatDate(device.registered_at)}
                                            </td>
                                            {/* Actions */}
                                            <td className="px-4 py-3">
                                                <div className="flex items-center gap-2">
                                                    {device.status !== 'trusted' && (
                                                        <button
                                                            onClick={() => handleStatusChange(device, 'trusted')}
                                                            disabled={actionLoading === device.id}
                                                            className="px-2.5 py-1 text-xs rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 transition-all disabled:opacity-50 focus-visible:ring-2 focus-visible:ring-emerald-400"
                                                        >
                                                            Approve
                                                        </button>
                                                    )}
                                                    {device.status !== 'revoked' && (
                                                        <button
                                                            onClick={() => handleStatusChange(device, 'revoked')}
                                                            disabled={actionLoading === device.id}
                                                            className="px-2.5 py-1 text-xs rounded-lg bg-red-50 text-red-700 hover:bg-red-100 border border-red-200 transition-all disabled:opacity-50 focus-visible:ring-2 focus-visible:ring-red-400"
                                                        >
                                                            Revoke
                                                        </button>
                                                    )}
                                                    {actionLoading === device.id && (
                                                        <svg className="animate-spin h-3.5 w-3.5 text-[#5B6B7D]" viewBox="0 0 24 24" fill="none">
                                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                                                        </svg>
                                                    )}
                                                </div>
                                            </td>
                                        </motion.tr>
                                    ))}
                                </AnimatePresence>
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}
