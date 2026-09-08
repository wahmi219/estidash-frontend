'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

// FINAL product decision: Settings has exactly one real MVP configuration
// area (Permit Qualification / permit-scoring). This route no longer hosts a
// multi-card hub -- it exists only so a saved/typed /dashboard/settings link
// keeps working, by forwarding straight to that page. The sidebar's
// "Settings" item links directly to /dashboard/settings/permit-scoring and
// never actually renders this redirect hop.
export default function SettingsPage() {
    const router = useRouter();

    useEffect(() => {
        router.replace('/dashboard/settings/permit-scoring');
    }, [router]);

    return (
        <div className="min-h-[60vh] flex items-center justify-center">
            <div className="w-8 h-8 border-2 border-[#DFE6EE] border-t-[#00458B] rounded-full animate-spin" />
        </div>
    );
}
