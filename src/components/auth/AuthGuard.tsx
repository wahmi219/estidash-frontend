'use client';

import { useEffect, useRef, useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useRouter, usePathname } from 'next/navigation';
import type { RootState, AppDispatch } from '@/store/store';
import { hasRole, resolveMinRole } from '@/lib/roles';
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

    // Route-level role guard. minRole resolves via the longest matching path
    // prefix (see resolveMinRole) so nested/dynamic routes such as
    // /dashboard/contractors/[id] inherit their parent's requirement
    // (/dashboard/contractors) without a separate PAGE_MIN_ROLES entry.
    // isAuthorized is computed synchronously from already-loaded redux state
    // (no async call), so the very first render for a new pathname already
    // reflects the correct access decision -- restricted content never paints
    // even for one frame before the redirect below fires.
    const minRole = resolveMinRole(pathname);
    const isAuthorized = !minRole || (isAuthenticated && !!user && hasRole(user.role, minRole));

    // Side-effect: perform the actual redirect once auth/role state is known.
    useEffect(() => {
        if (!ready || !isAuthenticated || !user) return;
        if (!isAuthorized) {
            router.replace('/dashboard');
        }
    }, [ready, isAuthenticated, user, isAuthorized, router]);

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

    // Withhold children until auth bootstrap AND the current route's role
    // check both resolve in the user's favor. An insufficient role shows this
    // same neutral placeholder instead of the restricted page while the
    // redirect above runs -- never the restricted content itself.
    if (!ready || !isAuthorized) {
        return (
            <div className="min-h-screen bg-[#F7F9FB] flex items-center justify-center">
                <div className="flex flex-col items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-white border border-[#DFE6EE] flex items-center justify-center animate-pulse">
                        <div className="w-3 h-3 rounded-full bg-[#00458B]" />
                    </div>
                    <p className="text-xs uppercase tracking-widest text-[#5B6B7D]">Loading…</p>
                </div>
            </div>
        );
    }

    return <>{children}</>;
}
