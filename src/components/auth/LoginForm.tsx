'use client';

import { useState, FormEvent } from 'react';
import { useDispatch } from 'react-redux';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { TrendingUp, Eye, EyeOff, LogIn, Smartphone } from 'lucide-react';
import { authService } from '@/services/authService';
import { setCredentials, setError } from '@/store/slices/authSlice';
import type { AppDispatch } from '@/store/store';

export default function LoginForm() {
    const dispatch = useDispatch<AppDispatch>();
    const router = useRouter();

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);

    async function handleSubmit(e: FormEvent) {
        e.preventDefault();
        setErrorMsg(null);
        setIsLoading(true);

        try {
            const result = await authService.login(email, password);

            if (result.status === 'new_device') {
                // Unrecognised device — save user_id and go to OTP page
                sessionStorage.setItem('pendingDeviceUserId', String(result.user_id));
                router.replace('/login/verify-device');
                return;
            }

            dispatch(setCredentials({ user: result.user, accessToken: result.access_token }));
            router.replace('/dashboard');
        } catch (err: unknown) {
            const msg =
                (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ||
                'Invalid email or password';
            setErrorMsg(msg);
            dispatch(setError(msg));
        } finally {
            setIsLoading(false);
        }
    }

    return (
        <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, ease: 'easeOut' }}
            className="w-full max-w-md"
        >
            {/* Logo */}
            <div className="flex flex-col items-center mb-8">
                <div className="w-14 h-14 rounded-2xl bg-linear-to-br from-cyan-500 to-purple-600 flex items-center justify-center mb-4 shadow-lg shadow-cyan-500/20">
                    <TrendingUp size={26} className="text-white" />
                </div>
                <h1 className="text-2xl font-bold text-white">EstiHub</h1>
                <p className="text-sm text-gray-400 mt-1">Market Intelligence Platform</p>
            </div>

            {/* Card */}
            <div className="bg-gray-950/80 backdrop-blur-sm border border-white/8 rounded-2xl p-8 shadow-xl">
                <h2 className="text-lg font-semibold text-white mb-6">Sign in to your account</h2>

                <form onSubmit={handleSubmit} className="space-y-5">
                    {/* Email */}
                    <div>
                        <label className="block text-[11px] uppercase tracking-widest text-gray-500 mb-2">
                            Email
                        </label>
                        <input
                            type="email"
                            value={email}
                            onChange={e => setEmail(e.target.value)}
                            required
                            autoComplete="email"
                            placeholder="you@company.com"
                            className="w-full px-4 py-3 rounded-xl bg-gray-900 border border-white/8 text-white placeholder-gray-600 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50 transition-all"
                        />
                    </div>

                    {/* Password */}
                    <div>
                        <label className="block text-[11px] uppercase tracking-widest text-gray-500 mb-2">
                            Password
                        </label>
                        <div className="relative">
                            <input
                                type={showPassword ? 'text' : 'password'}
                                value={password}
                                onChange={e => setPassword(e.target.value)}
                                required
                                autoComplete="current-password"
                                placeholder="••••••••"
                                className="w-full px-4 py-3 pr-12 rounded-xl bg-gray-900 border border-white/8 text-white placeholder-gray-600 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50 transition-all"
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(v => !v)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors focus-visible:ring-2 focus-visible:ring-cyan-500 rounded"
                                aria-label={showPassword ? 'Hide password' : 'Show password'}
                            >
                                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                            </button>
                        </div>
                    </div>

                    {/* Error */}
                    {errorMsg && (
                        <motion.p
                            initial={{ opacity: 0, y: -4 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-3"
                        >
                            {errorMsg}
                        </motion.p>
                    )}

                    {/* Submit */}
                    <button
                        type="submit"
                        disabled={isLoading}
                        className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-linear-to-r from-cyan-500 to-purple-600 text-white font-semibold text-sm hover:opacity-90 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed focus-visible:ring-2 focus-visible:ring-cyan-500 shadow-lg shadow-cyan-500/20"
                    >
                        {isLoading ? (
                            <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                            </svg>
                        ) : (
                            <LogIn size={16} />
                        )}
                        {isLoading ? 'Signing in…' : 'Sign in'}
                    </button>
                </form>

                {/* Device notice — only visible when device check could be relevant */}
                <p className="mt-5 text-center text-[11px] text-gray-600 flex items-center justify-center gap-1.5">
                    <Smartphone size={11} />
                    Signing in from a new device will require admin approval
                </p>
            </div>
        </motion.div>
    );
}
