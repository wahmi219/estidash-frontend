'use client';

import { useState, useEffect, useRef, FormEvent } from 'react';
import { useDispatch } from 'react-redux';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { ShieldCheck, RefreshCw, Laptop } from 'lucide-react';
import { authService } from '@/services/authService';
import { setCredentials } from '@/store/slices/authSlice';
import type { AppDispatch } from '@/store/store';

export default function VerifyDeviceForm() {
    const dispatch = useDispatch<AppDispatch>();
    const router = useRouter();

    const [userId, setUserId] = useState<number | null>(null);
    const [otp, setOtp] = useState('');
    const [deviceName, setDeviceName] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isResending, setIsResending] = useState(false);
    const [resendCooldown, setResendCooldown] = useState(0);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const [successMsg, setSuccessMsg] = useState<string | null>(null);
    const otpRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        const stored = sessionStorage.getItem('pendingDeviceUserId');
        if (!stored) {
            router.replace('/login');
            return;
        }
        setUserId(Number(stored));
        otpRef.current?.focus();
    }, [router]);

    useEffect(() => {
        if (resendCooldown <= 0) return;
        const t = setTimeout(() => setResendCooldown(c => c - 1), 1000);
        return () => clearTimeout(t);
    }, [resendCooldown]);

    async function handleSubmit(e: FormEvent) {
        e.preventDefault();
        if (!userId) return;
        setErrorMsg(null);
        setIsLoading(true);
        try {
            const result = await authService.verifyDevice({
                user_id: userId,
                otp: otp.trim(),
                device_name: deviceName.trim() || undefined,
            });
            sessionStorage.removeItem('pendingDeviceUserId');
            dispatch(setCredentials({ user: result.user, accessToken: result.access_token }));
            router.replace('/dashboard');
        } catch (err: unknown) {
            const msg =
                (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ||
                'Invalid or expired code. Please try again.';
            setErrorMsg(msg);
        } finally {
            setIsLoading(false);
        }
    }

    async function handleResend() {
        if (!userId || resendCooldown > 0) return;
        setIsResending(true);
        setErrorMsg(null);
        try {
            await authService.sendDeviceOtp(userId);
            setSuccessMsg('A new code has been sent to the admin.');
            setResendCooldown(60);
        } catch {
            setErrorMsg('Failed to resend code. Please try again.');
        } finally {
            setIsResending(false);
        }
    }

    return (
        <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, ease: 'easeOut' }}
            className="w-full max-w-md"
        >
            {/* Icon */}
            <div className="flex flex-col items-center mb-8">
                <div className="w-14 h-14 rounded-2xl bg-linear-to-br from-cyan-500 to-purple-600 flex items-center justify-center mb-4 shadow-lg shadow-cyan-500/20">
                    <ShieldCheck size={26} className="text-white" />
                </div>
                <h1 className="text-2xl font-bold text-white">Device Verification</h1>
                <p className="text-sm text-gray-400 mt-1 text-center max-w-xs">
                    This device isn&apos;t recognised. Your admin has been sent a one-time code — ask them for it.
                </p>
            </div>

            <div className="bg-gray-950/80 backdrop-blur-sm border border-white/8 rounded-2xl p-8 shadow-xl">
                <form onSubmit={handleSubmit} className="space-y-5">
                    {/* OTP */}
                    <div>
                        <label className="block text-[11px] uppercase tracking-widest text-gray-500 mb-2">
                            6-Digit Code
                        </label>
                        <input
                            ref={otpRef}
                            type="text"
                            inputMode="numeric"
                            pattern="[0-9]{6}"
                            maxLength={6}
                            value={otp}
                            onChange={e => setOtp(e.target.value.replace(/\D/g, ''))}
                            required
                            placeholder="000000"
                            className="w-full px-4 py-3 rounded-xl bg-gray-900 border border-white/8 text-white placeholder-gray-600 text-center text-2xl font-mono tracking-[0.5em] focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50 transition-all"
                        />
                    </div>

                    {/* Device name (optional) */}
                    <div>
                        <label className="block text-[11px] uppercase tracking-widest text-gray-500 mb-2">
                            Device Name <span className="normal-case tracking-normal text-gray-600">(optional)</span>
                        </label>
                        <div className="relative">
                            <Laptop size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-600" />
                            <input
                                type="text"
                                value={deviceName}
                                onChange={e => setDeviceName(e.target.value)}
                                placeholder="My Work Laptop"
                                maxLength={100}
                                className="w-full pl-9 pr-4 py-3 rounded-xl bg-gray-900 border border-white/8 text-white placeholder-gray-600 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50 transition-all"
                            />
                        </div>
                    </div>

                    {/* Error / Success */}
                    {errorMsg && (
                        <motion.p
                            initial={{ opacity: 0, y: -4 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-3"
                        >
                            {errorMsg}
                        </motion.p>
                    )}
                    {successMsg && !errorMsg && (
                        <motion.p
                            initial={{ opacity: 0, y: -4 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="text-sm text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-lg px-4 py-3"
                        >
                            {successMsg}
                        </motion.p>
                    )}

                    {/* Submit */}
                    <button
                        type="submit"
                        disabled={isLoading || otp.length !== 6}
                        className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-linear-to-r from-cyan-500 to-purple-600 text-white font-semibold text-sm hover:opacity-90 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed focus-visible:ring-2 focus-visible:ring-cyan-500 shadow-lg shadow-cyan-500/20"
                    >
                        {isLoading ? (
                            <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                            </svg>
                        ) : (
                            <ShieldCheck size={16} />
                        )}
                        {isLoading ? 'Verifying…' : 'Verify & Register Device'}
                    </button>
                </form>

                {/* Resend */}
                <div className="mt-5 text-center">
                    <button
                        type="button"
                        onClick={handleResend}
                        disabled={isResending || resendCooldown > 0}
                        className="inline-flex items-center gap-1.5 text-xs text-gray-500 hover:text-cyan-400 disabled:opacity-40 disabled:cursor-not-allowed transition-colors focus-visible:ring-2 focus-visible:ring-cyan-500 rounded"
                    >
                        <RefreshCw size={11} className={isResending ? 'animate-spin' : ''} />
                        {resendCooldown > 0
                            ? `Resend in ${resendCooldown}s`
                            : isResending
                                ? 'Resending…'
                                : 'Resend code to admin'}
                    </button>
                </div>

                {/* Back to login */}
                <div className="mt-3 text-center">
                    <button
                        type="button"
                        onClick={() => { sessionStorage.removeItem('pendingDeviceUserId'); router.replace('/login'); }}
                        className="text-xs text-gray-600 hover:text-gray-400 transition-colors"
                    >
                        Back to sign in
                    </button>
                </div>
            </div>
        </motion.div>
    );
}
