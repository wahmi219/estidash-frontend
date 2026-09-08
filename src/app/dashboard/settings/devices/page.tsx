'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function DevicesPage() {
    const router = useRouter();
    useEffect(() => {
        router.replace('/dashboard/settings/users?tab=devices');
    }, [router]);
    return (
        <div className="min-h-[60vh] flex items-center justify-center">
            <div className="w-8 h-8 border-2 border-[#DFE6EE] border-t-[#00458B] rounded-full animate-spin" />
        </div>
    );
}
