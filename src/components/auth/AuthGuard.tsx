'use client';

import { useEffect, useRef, useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useRouter, usePathname } from 'next/navigation';
import type { RootState, AppDispatch } from '@/store/store';
import { hasRole, PAGE_MIN_ROLES } from '@/lib/roles';
import { authService } from '@/services/authService';
import { setCredentials, logout } from '@/store/slices/authSlice';

export default function AuthGuard({ children }: { children: React.ReactNode }) {
    const { user, isAuthenticated, accessToken } = useSelector((s: RootState) => s.auth);
    const router = useRouter();
    const pathname = usePathname();
    const dispatch = useDispatch<AppDispatch>();
    const bootstrapped = useRef(false);
    const [ready, setReady] = useState(isAuthenticated);

    // On first mount, try a silent token refresh to restore session across page reloads.
    useEffect(() => {
        if (bootstrapped.current) return;
        bootstrapped.current = true;

        if (isAuthenticated) {
            setReady(true);
            return;
        }

        authService.refreshToken()
            .then(data => {
                dispatch(setCredentials({ user: data.user, accessToken: data.access_token }));
                setReady(true);
            })
            .catch(() => {
                dispatch(logout());
                router.replace('/login');
            });
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Route-level role guard — runs whenever path or auth state changes.
    useEffect(() => {
        if (!isAuthenticated || !user) return;

        const minRole = PAGE_MIN_ROLES[pathname];
        if (minRole && !hasRole(user.role, minRole)) {
            router.replace('/dashboard');
        }
    }, [isAuthenticated, pathname, user, router]);

    // Refresh access token in background before it expires (JWT_ACCESS_TOKEN_EXPIRE_MINUTES=30).
    useEffect(() => {
        if (!isAuthenticated || !accessToken) return;

        const REFRESH_INTERVAL = 29 * 60 * 1000; // 29 minutes
        const id = setInterval(() => {
            authService.refreshToken()
                .then(data => {
                    dispatch(setCredentials({ user: data.user, accessToken: data.access_token }));
                })
                .catch(() => {
                    dispatch(logout());
                    router.replace('/login');
                });
        }, REFRESH_INTERVAL);

        return () => clearInterval(id);
    }, [isAuthenticated, accessToken, dispatch, router]);

    if (!ready) {
        return (
            <div className="min-h-screen bg-gray-950 flex items-center justify-center">
                <div className="flex flex-col items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-linear-to-br from-cyan-500 to-purple-600 flex items-center justify-center animate-pulse" />
                    <p className="text-xs uppercase tracking-widest text-gray-500">Loading…</p>
                </div>
            </div>
        );
    }

    return <>{children}</>;
}
