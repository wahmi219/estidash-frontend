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
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
            className="w-full max-w-[440px]"
        >
            {/* Compact brand identifier — mobile only; the brand panel in
                login/page.tsx is hidden below md, so this stands in for it. */}
            <div className="flex lg:hidden items-center gap-2 mb-8">
                <div className="w-8 h-8 rounded-lg bg-[#00458B] flex items-center justify-center shrink-0">
                    <TrendingUp size={16} className="text-white" aria-hidden="true" />
                </div>
                <span className="text-sm font-semibold text-[#0E2B5C]">Estimation Hub</span>
            </div>

            <h2 className="text-[31px] font-bold text-[#0E2B5C]">Welcome back</h2>
            <p className="text-base text-[#5B6B7D] mt-1 mb-8">Sign in to continue</p>

            <form onSubmit={handleSubmit} className="space-y-5">
                {/* Email */}
                <div>
                    <label className="block text-[13px] font-medium uppercase tracking-widest text-[#495664] mb-2">
                        Email
                    </label>
                    <input
                        type="email"
                        value={email}
                        onChange={e => setEmail(e.target.value)}
                        required
                        autoComplete="email"
                        placeholder="you@company.com"
                        className="w-full h-[50px] px-4 rounded-lg bg-white border border-[#DFE6EE] text-[#1E2A3A] placeholder-gray-400 text-base focus:outline-none focus:ring-2 focus:ring-[#00458B]/20 focus:border-[#00458B] transition-all"
                    />
                </div>

                {/* Password */}
                <div>
                    <label className="block text-[13px] font-medium uppercase tracking-widest text-[#495664] mb-2">
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
                            className="w-full h-[50px] px-4 pr-12 rounded-lg bg-white border border-[#DFE6EE] text-[#1E2A3A] placeholder-gray-400 text-base focus:outline-none focus:ring-2 focus:ring-[#00458B]/20 focus:border-[#00458B] transition-all"
                        />
                        <button
                            type="button"
                            onClick={() => setShowPassword(v => !v)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors focus-visible:ring-2 focus-visible:ring-[#00458B] rounded"
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
                        className="text-sm text-[#B3261E] bg-[#B3261E]/5 border border-[#B3261E]/20 rounded-lg px-4 py-3"
                    >
                        {errorMsg}
                    </motion.p>
                )}

                {/* Submit */}
                <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full h-12 flex items-center justify-center gap-2 px-4 rounded-lg bg-[#00458B] text-white font-semibold text-base hover:bg-[#045CB4] active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed focus-visible:ring-2 focus-visible:ring-[#00458B]"
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
            <p className="mt-6 text-center text-xs text-[#5B6B7D] flex items-center justify-center gap-1.5">
                <Smartphone size={11} />
                Signing in from a new device will require admin approval
            </p>
        </motion.div>
    );
}
