'use client';

import { useState, useEffect, useCallback, FormEvent } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Users,
    Plus,
    Pencil,
    Trash2,
    X,
    CheckCircle2,
    AlertCircle,
    Eye,
    EyeOff,
    Shield,
    RefreshCw,
    Search,
    Monitor,
    MapPin,
    Wifi,
    Clock,
    Globe,
    Crown,
} from 'lucide-react';
import { useSelector } from 'react-redux';
import type { RootState } from '@/store/store';
import { hasRole } from '@/lib/roles';
import { apiService } from '@/services/api';
import type { UserRecord, SendingDomain } from '@/types';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const ROLES = ['viewer', 'outreach', 'admin', 'super_admin'] as const;

const ROLE_META: Record<string, { label: string; color: string; bg: string }> = {
    super_admin: { label: 'Super Admin', color: 'text-purple-400', bg: 'bg-purple-500/15 border-purple-500/20' },
    admin:       { label: 'Admin',       color: 'text-cyan-400',   bg: 'bg-cyan-500/15 border-cyan-500/20'   },
    outreach:    { label: 'Outreach',    color: 'text-amber-400',  bg: 'bg-amber-500/15 border-amber-500/20' },
    analyst:     { label: 'Analyst',     color: 'text-blue-400',   bg: 'bg-blue-500/15 border-blue-500/20'   },
    viewer:      { label: 'Viewer',      color: 'text-gray-400',   bg: 'bg-gray-500/15 border-gray-500/20'   },
};

const STATUS_META: Record<string, { label: string; color: string; dot: string }> = {
    active:   { label: 'Active',   color: 'text-emerald-400', dot: 'bg-emerald-400' },
    inactive: { label: 'Inactive', color: 'text-gray-500',    dot: 'bg-gray-500'    },
    pending:  { label: 'Pending',  color: 'text-amber-400',   dot: 'bg-amber-400'   },
};

function initials(name: string) {
    return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
}

function formatDate(iso: string | null) {
    if (!iso) return '—';
    return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatRelative(iso: string | null) {
    if (!iso) return null;
    const diff = Date.now() - new Date(iso).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    if (days < 7) return `${days}d ago`;
    return formatDate(iso);
}

// ---------------------------------------------------------------------------
// Device Info Chip
// ---------------------------------------------------------------------------

function DeviceChip({ device }: { device: UserRecord['current_device'] }) {
    if (!device) {
        return (
            <span className="inline-flex items-center gap-1 text-[10px] text-gray-600 px-2 py-0.5 rounded-md bg-gray-800/60 border border-white/[0.04]">
                <Monitor size={9} />
                No active device
            </span>
        );
    }

    const locationParts = [device.city, device.country].filter(Boolean);
    const location = locationParts.join(', ');
    const relTime = formatRelative(device.last_seen_at);

    return (
        <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
            {/* Platform */}
            <span className="inline-flex items-center gap-1 text-[10px] text-cyan-400 px-2 py-0.5 rounded-md bg-cyan-500/10 border border-cyan-500/20">
                <Monitor size={9} />
                {device.platform ?? 'Unknown'}{device.device_name ? ` · ${device.device_name}` : ''}
            </span>

            {/* Location */}
            {location && (
                <span className="inline-flex items-center gap-1 text-[10px] text-gray-400 px-2 py-0.5 rounded-md bg-white/[0.04] border border-white/[0.06]">
                    <MapPin size={9} />
                    {location}
                </span>
            )}

            {/* ISP */}
            {device.isp && (
                <span className="hidden lg:inline-flex items-center gap-1 text-[10px] text-gray-500 px-2 py-0.5 rounded-md bg-white/[0.03] border border-white/[0.04]">
                    <Wifi size={9} />
                    {device.isp.length > 22 ? device.isp.slice(0, 22) + '…' : device.isp}
                </span>
            )}

            {/* Last seen */}
            {relTime && (
                <span className="inline-flex items-center gap-1 text-[10px] text-gray-600 px-2 py-0.5 rounded-md">
                    <Clock size={9} />
                    {relTime}
                </span>
            )}
        </div>
    );
}

// ---------------------------------------------------------------------------
// Create / Edit Modal
// ---------------------------------------------------------------------------

interface UserModalProps {
    mode: 'create' | 'edit';
    user?: UserRecord;
    isSuperAdmin: boolean;
    onClose: () => void;
    onSuccess: (u: UserRecord) => void;
}

function UserModal({ mode, user, isSuperAdmin, onClose, onSuccess }: UserModalProps) {
    const [fullName, setFullName]   = useState(user?.full_name ?? '');
    const [email, setEmail]         = useState(user?.email ?? '');
    const [password, setPassword]       = useState('');
    const [showPass, setShowPass]       = useState(false);
    const [newPassword, setNewPassword] = useState('');
    const [showNewPass, setShowNewPass] = useState(false);
    const [role, setRole]           = useState<string>(user?.role ?? 'viewer');
    const [userStatus, setUserStatus] = useState(user?.status ?? 'active');
    const [saving, setSaving]       = useState(false);
    const [error, setError]         = useState<string | null>(null);

    const availableRoles = isSuperAdmin ? ROLES : ROLES.filter(r => r !== 'super_admin' && r !== 'admin');

    async function handleSubmit(e: FormEvent) {
        e.preventDefault();
        setError(null);
        setSaving(true);
        try {
            let result: UserRecord;
            if (mode === 'create') {
                result = await apiService.createUser({ email, password, full_name: fullName, role });
            } else {
                result = await apiService.updateUser(user!.id, {
                    full_name: fullName,
                    role,
                    status: userStatus,
                    ...(newPassword.trim() ? { new_password: newPassword.trim() } : {}),
                });
            }
            onSuccess(result);
        } catch (err: unknown) {
            const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail
                ?? 'Something went wrong';
            setError(msg);
        } finally {
            setSaving(false);
        }
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                onClick={onClose}
            />
            <motion.div
                initial={{ opacity: 0, scale: 0.96, y: 12 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.96, y: 12 }}
                transition={{ duration: 0.2 }}
                className="relative w-full max-w-md bg-gray-950 border border-white/8 rounded-2xl shadow-2xl"
                onClick={e => e.stopPropagation()}
            >
                <div className="flex items-center justify-between px-6 py-5 border-b border-white/8">
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-xl bg-cyan-500/15">
                            {mode === 'create' ? <Plus size={16} className="text-cyan-400" /> : <Pencil size={16} className="text-cyan-400" />}
                        </div>
                        <h2 className="text-lg font-semibold text-white">
                            {mode === 'create' ? 'Create User' : 'Edit User'}
                        </h2>
                    </div>
                    <button onClick={onClose} className="text-gray-500 hover:text-gray-300 transition-colors focus-visible:ring-2 focus-visible:ring-cyan-500 rounded">
                        <X size={20} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-5">
                    <div>
                        <label className="block text-[11px] uppercase tracking-widest text-gray-500 mb-2">Full Name</label>
                        <input
                            type="text"
                            value={fullName}
                            onChange={e => setFullName(e.target.value)}
                            required
                            placeholder="Jane Smith"
                            className="w-full px-4 py-3 rounded-xl bg-gray-900 border border-white/8 text-white placeholder-gray-600 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/50 transition-all"
                        />
                    </div>

                    {mode === 'create' && (
                        <div>
                            <label className="block text-[11px] uppercase tracking-widest text-gray-500 mb-2">Email</label>
                            <input
                                type="email"
                                value={email}
                                onChange={e => setEmail(e.target.value)}
                                required
                                placeholder="jane@company.com"
                                className="w-full px-4 py-3 rounded-xl bg-gray-900 border border-white/8 text-white placeholder-gray-600 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/50 transition-all"
                            />
                        </div>
                    )}

                    {mode === 'create' && (
                        <div>
                            <label className="block text-[11px] uppercase tracking-widest text-gray-500 mb-2">Password</label>
                            <div className="relative">
                                <input
                                    type={showPass ? 'text' : 'password'}
                                    value={password}
                                    onChange={e => setPassword(e.target.value)}
                                    required
                                    minLength={8}
                                    placeholder="Min. 8 characters"
                                    className="w-full px-4 py-3 pr-12 rounded-xl bg-gray-900 border border-white/8 text-white placeholder-gray-600 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/50 transition-all"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPass(v => !v)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors"
                                    aria-label={showPass ? 'Hide' : 'Show'}
                                >
                                    {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                                </button>
                            </div>
                        </div>
                    )}

                    <div>
                        <label className="block text-[11px] uppercase tracking-widest text-gray-500 mb-2">Role</label>
                        <div className="grid grid-cols-2 gap-2">
                            {availableRoles.map(r => (
                                <button
                                    key={r}
                                    type="button"
                                    onClick={() => setRole(r)}
                                    className={`px-3 py-2.5 rounded-xl border text-sm font-medium transition-all ${
                                        role === r
                                            ? `${ROLE_META[r].bg} ${ROLE_META[r].color} border-current`
                                            : 'border-white/8 text-gray-400 hover:border-white/20'
                                    }`}
                                >
                                    {ROLE_META[r].label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {mode === 'edit' && (
                        <div>
                            <label className="block text-[11px] uppercase tracking-widest text-gray-500 mb-2">Status</label>
                            <div className="flex gap-2">
                                {(['active', 'inactive', 'pending'] as const).map(s => (
                                    <button
                                        key={s}
                                        type="button"
                                        onClick={() => setUserStatus(s)}
                                        className={`flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl border text-sm font-medium transition-all ${
                                            userStatus === s
                                                ? s === 'active'
                                                    ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                                                    : s === 'inactive'
                                                        ? 'bg-gray-500/15 text-gray-400 border-gray-500/30'
                                                        : 'bg-amber-500/15 text-amber-400 border-amber-500/30'
                                                : 'border-white/8 text-gray-500 hover:border-white/20'
                                        }`}
                                    >
                                        <span className={`w-2 h-2 rounded-full ${userStatus === s ? STATUS_META[s].dot : 'bg-gray-600'}`} />
                                        {STATUS_META[s].label}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {mode === 'edit' && (
                        <div>
                            <label className="block text-[11px] uppercase tracking-widest text-gray-500 mb-2">
                                Set New Password <span className="text-gray-600 normal-case tracking-normal">(leave blank to keep current)</span>
                            </label>
                            <div className="relative">
                                <input
                                    type={showNewPass ? 'text' : 'password'}
                                    value={newPassword}
                                    onChange={e => setNewPassword(e.target.value)}
                                    minLength={8}
                                    placeholder="Min. 8 characters"
                                    autoComplete="new-password"
                                    className="w-full px-4 py-3 pr-12 rounded-xl bg-gray-900 border border-white/8 text-white placeholder-gray-600 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/50 transition-all"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowNewPass(v => !v)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors"
                                    aria-label={showNewPass ? 'Hide' : 'Show'}
                                >
                                    {showNewPass ? <EyeOff size={16} /> : <Eye size={16} />}
                                </button>
                            </div>
                        </div>
                    )}

                    {error && (
                        <motion.div
                            initial={{ opacity: 0, y: -4 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="flex items-center gap-2 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm"
                        >
                            <AlertCircle size={14} />
                            {error}
                        </motion.div>
                    )}

                    <div className="flex gap-3 pt-1">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 px-4 py-3 rounded-xl border border-white/8 text-gray-400 text-sm font-medium hover:border-white/20 transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={saving}
                            className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-linear-to-r from-cyan-500 to-purple-600 text-white text-sm font-semibold hover:opacity-90 disabled:opacity-50 transition-all"
                        >
                            {saving && <RefreshCw size={14} className="animate-spin" />}
                            {saving ? 'Saving…' : mode === 'create' ? 'Create User' : 'Save Changes'}
                        </button>
                    </div>
                </form>
            </motion.div>
        </div>
    );
}

// ---------------------------------------------------------------------------
// Domain Assignment Modal (outreach users only)
// ---------------------------------------------------------------------------

function DomainAssignModal({
    user,
    allUsers,
    onClose,
}: {
    user: UserRecord;
    allUsers: UserRecord[];
    onClose: () => void;
}) {
    const [domains, setDomains]   = useState<SendingDomain[]>([]);
    const [loading, setLoading]   = useState(true);
    const [saving, setSaving]     = useState<string | null>(null); // domain id being toggled
    const [error, setError]       = useState<string | null>(null);

    useEffect(() => {
        apiService.listDomains()
            .then(setDomains)
            .catch(() => setError('Failed to load domains'))
            .finally(() => setLoading(false));
    }, []);

    function getUserName(userId: number | null) {
        if (!userId) return null;
        const u = allUsers.find(u => u.id === userId);
        return u ? u.full_name : `User #${userId}`;
    }

    async function toggleDomain(domain: SendingDomain) {
        const isAssignedToMe = domain.assigned_user_id === user.id;
        setSaving(domain.id);
        setError(null);
        try {
            await apiService.assignDomain(domain.id, isAssignedToMe ? null : user.id);
            setDomains(prev => prev.map(d =>
                d.id === domain.id
                    ? { ...d, assigned_user_id: isAssignedToMe ? null : user.id }
                    : d
            ));
        } catch {
            setError('Failed to update assignment');
        } finally {
            setSaving(null);
        }
    }

    const myDomains   = domains.filter(d => d.assigned_user_id === user.id);
    const otherDomains = domains.filter(d => d.assigned_user_id !== user.id && !d.is_primary);
    const primaryDomain = domains.find(d => d.is_primary);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                onClick={onClose}
            />
            <motion.div
                initial={{ opacity: 0, scale: 0.96, y: 12 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.96, y: 12 }}
                transition={{ duration: 0.2 }}
                className="relative w-full max-w-lg bg-gray-950 border border-white/8 rounded-2xl shadow-2xl flex flex-col max-h-[80vh]"
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-5 border-b border-white/8 shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-xl bg-amber-500/15">
                            <Globe size={16} className="text-amber-400" />
                        </div>
                        <div>
                            <h2 className="text-base font-semibold text-white">Assign Domains</h2>
                            <p className="text-[11px] text-gray-500">{user.full_name} · Outreach</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="text-gray-500 hover:text-gray-300 transition-colors">
                        <X size={20} />
                    </button>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto px-6 py-4 space-y-5">
                    {loading ? (
                        <div className="flex items-center justify-center py-12">
                            <div className="w-8 h-8 border-2 border-amber-500/20 border-t-amber-500 rounded-full animate-spin" />
                        </div>
                    ) : (
                        <>
                            {error && (
                                <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                                    <AlertCircle size={14} />
                                    {error}
                                </div>
                            )}

                            {/* Assigned to this user */}
                            {myDomains.length > 0 && (
                                <div>
                                    <p className="text-[10px] uppercase tracking-widest text-amber-400 mb-2 font-medium">Assigned to {user.full_name.split(' ')[0]}</p>
                                    <div className="space-y-2">
                                        {myDomains.map(d => (
                                            <DomainRow
                                                key={d.id} domain={d}
                                                checked={true}
                                                assignedTo={null}
                                                saving={saving === d.id}
                                                onToggle={() => toggleDomain(d)}
                                            />
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Primary domain (read-only) */}
                            {primaryDomain && (
                                <div>
                                    <p className="text-[10px] uppercase tracking-widest text-gray-600 mb-2 font-medium">Primary Domain (not assignable)</p>
                                    <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-white/[0.02] border border-white/[0.06] opacity-50">
                                        <Crown size={14} className="text-amber-400 shrink-0" />
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-mono text-white truncate">{primaryDomain.domain}</p>
                                            <p className="text-[10px] text-gray-500">Reserved for replies — never used for outreach</p>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Available / assigned to others */}
                            {otherDomains.length > 0 && (
                                <div>
                                    <p className="text-[10px] uppercase tracking-widest text-gray-500 mb-2 font-medium">
                                        {myDomains.length > 0 ? 'Other Domains' : 'Available Domains'}
                                    </p>
                                    <div className="space-y-2">
                                        {otherDomains.map(d => (
                                            <DomainRow
                                                key={d.id} domain={d}
                                                checked={false}
                                                assignedTo={getUserName(d.assigned_user_id)}
                                                saving={saving === d.id}
                                                onToggle={() => toggleDomain(d)}
                                            />
                                        ))}
                                    </div>
                                </div>
                            )}

                            {domains.length === 0 && (
                                <div className="text-center py-10">
                                    <Globe size={36} className="mx-auto mb-3 text-gray-700" />
                                    <p className="text-gray-500 text-sm">No sending domains registered yet</p>
                                    <p className="text-gray-600 text-xs mt-1">Go to Outreach → Domains to add domains first</p>
                                </div>
                            )}
                        </>
                    )}
                </div>

                {/* Footer */}
                <div className="px-6 py-4 border-t border-white/8 shrink-0">
                    <p className="text-[11px] text-gray-600">
                        Assigned domains appear exclusively in this user's Threads tab. Changes take effect immediately.
                    </p>
                </div>
            </motion.div>
        </div>
    );
}

function DomainRow({
    domain, checked, assignedTo, saving, onToggle,
}: {
    domain: SendingDomain;
    checked: boolean;
    assignedTo: string | null;
    saving: boolean;
    onToggle: () => void;
}) {
    const statusColor =
        domain.warmup_status === 'ready'    ? 'bg-emerald-400' :
        domain.warmup_status === 'warming'  ? 'bg-blue-400' :
        domain.warmup_status === 'degraded' ? 'bg-amber-400' :
                                              'bg-gray-600';

    return (
        <div className={`flex items-center gap-3 px-4 py-3 rounded-xl border transition-colors ${
            checked ? 'bg-amber-500/8 border-amber-500/20' : 'bg-white/[0.02] border-white/[0.06] hover:border-white/[0.12]'
        }`}>
            <Globe size={14} className={checked ? 'text-amber-400' : 'text-gray-500'} />
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                    <p className="text-sm font-mono text-white truncate">{domain.domain}</p>
                    <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${statusColor}`} title={domain.warmup_status} />
                    <span className="text-[10px] text-gray-600 capitalize hidden sm:block">{domain.warmup_status}</span>
                </div>
                {assignedTo && (
                    <p className="text-[11px] text-gray-500 mt-0.5">Assigned to {assignedTo}</p>
                )}
            </div>
            <button
                onClick={onToggle}
                disabled={saving}
                className={`relative w-9 h-5 rounded-full transition-colors shrink-0 focus-visible:ring-2 focus-visible:ring-amber-400 ${
                    checked ? 'bg-amber-500' : 'bg-gray-700 hover:bg-gray-600'
                } disabled:opacity-50`}
            >
                <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${
                    checked ? 'translate-x-4' : 'translate-x-0.5'
                } ${saving ? 'opacity-60' : ''}`} />
                {saving && (
                    <span className="absolute inset-0 flex items-center justify-center">
                        <RefreshCw size={10} className="text-white animate-spin" />
                    </span>
                )}
            </button>
        </div>
    );
}

// ---------------------------------------------------------------------------
// Delete Confirmation Dialog
// ---------------------------------------------------------------------------

function DeleteDialog({ user, onClose, onConfirm }: { user: UserRecord; onClose: () => void; onConfirm: () => void }) {
    const [deleting, setDeleting] = useState(false);

    async function handleDelete() {
        setDeleting(true);
        await onConfirm();
        setDeleting(false);
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                onClick={onClose}
            />
            <motion.div
                initial={{ opacity: 0, scale: 0.96, y: 12 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.96 }}
                className="relative w-full max-w-sm bg-gray-950 border border-white/8 rounded-2xl shadow-2xl p-6"
                onClick={e => e.stopPropagation()}
            >
                <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 rounded-xl bg-red-500/15">
                        <Trash2 size={16} className="text-red-400" />
                    </div>
                    <h2 className="text-lg font-semibold text-white">Delete User</h2>
                </div>
                <p className="text-sm text-gray-400 mb-6">
                    Permanently delete <span className="text-white font-medium">{user.full_name}</span>? This cannot be undone.
                </p>
                <div className="flex gap-3">
                    <button onClick={onClose} className="flex-1 px-4 py-2.5 rounded-xl border border-white/8 text-gray-400 text-sm hover:border-white/20 transition-colors">
                        Cancel
                    </button>
                    <button
                        onClick={handleDelete}
                        disabled={deleting}
                        className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-red-500/80 hover:bg-red-500 text-white text-sm font-semibold disabled:opacity-50 transition-colors"
                    >
                        {deleting ? <RefreshCw size={14} className="animate-spin" /> : <Trash2 size={14} />}
                        Delete
                    </button>
                </div>
            </motion.div>
        </div>
    );
}

// ---------------------------------------------------------------------------
// Main Page
// ---------------------------------------------------------------------------

export default function UsersPage() {
    const { user: me } = useSelector((s: RootState) => s.auth);
    const isSuperAdmin = hasRole(me?.role ?? 'viewer', 'super_admin');

    const [users, setUsers]                     = useState<UserRecord[]>([]);
    const [loading, setLoading]                 = useState(true);
    const [search, setSearch]                   = useState('');
    const [modal, setModal]                     = useState<'create' | 'edit' | null>(null);
    const [editingUser, setEditingUser]         = useState<UserRecord | null>(null);
    const [deletingUser, setDeletingUser]       = useState<UserRecord | null>(null);
    const [domainAssignUser, setDomainAssignUser] = useState<UserRecord | null>(null);
    const [toast, setToast]                     = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

    const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
        setToast({ msg, type });
        setTimeout(() => setToast(null), 3500);
    };

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const data = await apiService.listUsers();
            setUsers(data);
        } catch {
            showToast('Failed to load users', 'error');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { load(); }, [load]);

    const filtered = users.filter(u =>
        u.full_name.toLowerCase().includes(search.toLowerCase()) ||
        u.email.toLowerCase().includes(search.toLowerCase()) ||
        u.role.includes(search.toLowerCase())
    );

    const stats = {
        total:  users.length,
        active: users.filter(u => u.status === 'active').length,
        byRole: ROLES.reduce<Record<string, number>>((acc, r) => {
            acc[r] = users.filter(u => u.role === r).length;
            return acc;
        }, {}),
    };

    function openCreate() { setModal('create'); setEditingUser(null); }
    function openEdit(u: UserRecord) { setEditingUser(u); setModal('edit'); }
    function closeModal() { setModal(null); setEditingUser(null); }

    function handleSuccess(u: UserRecord) {
        closeModal();
        if (modal === 'create') {
            setUsers(prev => [u, ...prev]);
            showToast(`${u.full_name} created successfully`);
        } else {
            setUsers(prev => prev.map(x => x.id === u.id ? u : x));
            showToast(`${u.full_name} updated`);
        }
    }

    async function handleDelete() {
        if (!deletingUser) return;
        const { id, full_name } = deletingUser;
        try {
            await apiService.deleteUser(id);
            setUsers(prev => prev.filter(u => u.id !== id));
            showToast(`${full_name} deleted`);
        } catch (err) {
            const statusCode = (err as { response?: { status?: number } })?.response?.status;
            if (statusCode === 404) {
                // Already gone on the server — drop the stale row instead of leaving it.
                setUsers(prev => prev.filter(u => u.id !== id));
                showToast(`${full_name} was already removed`);
            } else {
                showToast('Failed to delete user', 'error');
                load();  // resync the list with the server
            }
        } finally {
            setDeletingUser(null);
        }
    }

    return (
        <div className="p-6 lg:p-8">
            {/* Header */}
            <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
                <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-xl bg-purple-500/20">
                            <Users className="w-6 h-6 text-purple-400" />
                        </div>
                        <div>
                            <h1 className="text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white">User Management</h1>
                            <p className="text-gray-500 dark:text-gray-400">Create accounts, assign roles, and monitor active sessions</p>
                        </div>
                    </div>
                    {isSuperAdmin && (
                        <button
                            onClick={openCreate}
                            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-linear-to-r from-cyan-500 to-purple-600 text-white text-sm font-semibold hover:opacity-90 active:scale-[0.98] transition-all shadow-lg shadow-cyan-500/20 shrink-0"
                        >
                            <Plus size={16} />
                            New User
                        </button>
                    )}
                </div>
            </motion.div>

            {/* Stats Row */}
            <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.05 }}
                className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8"
            >
                <div className="col-span-2 md:col-span-1 bg-gray-950/80 backdrop-blur-sm border border-white/8 rounded-2xl p-4">
                    <p className="text-[10px] uppercase tracking-widest text-gray-500 mb-1">Total Users</p>
                    <p className="text-3xl font-mono font-bold text-white">{stats.total}</p>
                    <p className="text-xs text-emerald-400 mt-1">{stats.active} active</p>
                </div>
                {ROLES.map(r => (
                    <div key={r} className="bg-gray-950/80 backdrop-blur-sm border border-white/8 rounded-2xl p-4">
                        <p className="text-[10px] uppercase tracking-widest text-gray-500 mb-1">{ROLE_META[r].label}</p>
                        <p className={`text-2xl font-mono font-bold ${ROLE_META[r].color}`}>{stats.byRole[r] ?? 0}</p>
                    </div>
                ))}
            </motion.div>

            {/* Search + Refresh */}
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.1 }}
                className="flex items-center gap-3 mb-6"
            >
                <div className="relative flex-1">
                    <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" />
                    <input
                        type="text"
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        placeholder="Search by name, email, or role…"
                        className="w-full pl-10 pr-4 py-3 rounded-xl bg-gray-950/80 border border-white/8 text-white placeholder-gray-600 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/50 transition-all"
                    />
                </div>
                <button
                    onClick={load}
                    disabled={loading}
                    className="p-3 rounded-xl bg-white/5 border border-white/8 text-gray-400 hover:text-white hover:bg-white/8 transition-all disabled:opacity-50"
                    title="Refresh"
                >
                    <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
                </button>
            </motion.div>

            {/* User List */}
            {loading ? (
                <div className="flex items-center justify-center py-24">
                    <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
                        className="w-10 h-10 border-2 border-cyan-500/20 border-t-cyan-500 rounded-full"
                    />
                </div>
            ) : filtered.length === 0 ? (
                <div className="text-center py-24">
                    <Users size={48} className="mx-auto mb-4 text-gray-700" />
                    <p className="text-gray-500">No users found</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {filtered.map((u, i) => {
                        const roleMeta   = ROLE_META[u.role]    ?? ROLE_META.viewer;
                        const statusMeta = STATUS_META[u.status] ?? STATUS_META.pending;
                        const isMe = me?.id === u.id;

                        return (
                            <motion.div
                                key={u.id}
                                initial={{ opacity: 0, y: 12 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: i * 0.04 }}
                                className="px-5 py-4 bg-gray-950/80 backdrop-blur-sm border border-white/8 rounded-2xl hover:border-white/[0.12] transition-colors"
                            >
                                <div className="flex items-start gap-4">
                                    {/* Avatar */}
                                    <div className="w-10 h-10 rounded-full bg-linear-to-br from-cyan-500/30 to-purple-600/30 border border-white/8 flex items-center justify-center shrink-0 mt-0.5">
                                        <span className="text-sm font-bold text-white">{initials(u.full_name)}</span>
                                    </div>

                                    {/* Name / email / device */}
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <p className="text-sm font-medium text-white truncate">{u.full_name}</p>
                                            {isMe && (
                                                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-cyan-500/15 text-cyan-400 font-mono shrink-0">you</span>
                                            )}
                                        </div>
                                        <p className="text-xs text-gray-500 truncate">{u.email}</p>
                                        <DeviceChip device={u.current_device} />
                                    </div>

                                    {/* Right side: badges + last login + actions */}
                                    <div className="flex items-center gap-3 shrink-0 ml-auto">
                                        {/* Role badge */}
                                        <span className={`hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-medium ${roleMeta.bg} ${roleMeta.color}`}>
                                            <Shield size={11} />
                                            {roleMeta.label}
                                        </span>

                                        {/* Status badge */}
                                        <span className={`hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-gray-900 text-xs ${statusMeta.color}`}>
                                            <span className={`w-1.5 h-1.5 rounded-full ${statusMeta.dot}`} />
                                            {statusMeta.label}
                                        </span>

                                        {/* Last login */}
                                        <div className="hidden lg:block text-right shrink-0">
                                            <p className="text-[10px] uppercase tracking-widest text-gray-600">Last login</p>
                                            <p className="text-xs font-mono text-gray-400">{formatDate(u.last_login)}</p>
                                        </div>

                                        {/* Actions */}
                                        <div className="flex items-center gap-2 shrink-0">
                                            {/* Domain assignment — outreach users only, admin+ can manage */}
                                            {u.role === 'outreach' && isSuperAdmin && (
                                                <button
                                                    onClick={() => setDomainAssignUser(u)}
                                                    className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-amber-400 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/20 transition-colors"
                                                    title="Manage domain assignments"
                                                >
                                                    <Globe size={13} />
                                                    Domains
                                                </button>
                                            )}
                                            <button
                                                onClick={() => openEdit(u)}
                                                className="p-2 rounded-lg text-gray-500 hover:text-cyan-400 hover:bg-cyan-500/10 transition-colors"
                                                title="Edit user"
                                            >
                                                <Pencil size={15} />
                                            </button>
                                            {isSuperAdmin && !isMe && (
                                                <button
                                                    onClick={() => setDeletingUser(u)}
                                                    className="p-2 rounded-lg text-gray-500 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                                                    title="Delete user"
                                                >
                                                    <Trash2 size={15} />
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        );
                    })}
                </div>
            )}

            {/* Modals */}
            <AnimatePresence>
                {(modal === 'create' || modal === 'edit') && (
                    <UserModal
                        key={modal}
                        mode={modal}
                        user={editingUser ?? undefined}
                        isSuperAdmin={isSuperAdmin}
                        onClose={closeModal}
                        onSuccess={handleSuccess}
                    />
                )}
            </AnimatePresence>

            <AnimatePresence>
                {deletingUser && (
                    <DeleteDialog
                        key="delete"
                        user={deletingUser}
                        onClose={() => setDeletingUser(null)}
                        onConfirm={handleDelete}
                    />
                )}
            </AnimatePresence>

            <AnimatePresence>
                {domainAssignUser && (
                    <DomainAssignModal
                        key="domain-assign"
                        user={domainAssignUser}
                        allUsers={users}
                        onClose={() => setDomainAssignUser(null)}
                    />
                )}
            </AnimatePresence>

            {/* Toast */}
            <AnimatePresence>
                {toast && (
                    <motion.div
                        key="toast"
                        initial={{ opacity: 0, y: 24, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 24, scale: 0.95 }}
                        className={`fixed bottom-6 right-6 z-50 flex items-center gap-2.5 px-4 py-3 rounded-xl shadow-lg text-sm font-medium ${
                            toast.type === 'success'
                                ? 'bg-emerald-500/15 border border-emerald-500/20 text-emerald-400'
                                : 'bg-red-500/15 border border-red-500/20 text-red-400'
                        }`}
                    >
                        {toast.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
                        {toast.msg}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
