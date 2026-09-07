'use client';

import { useEffect, useState } from 'react';
import { Wallet } from 'lucide-react';
import { apiService } from '@/services/api';
import type { LeadBank } from '@/types';

/**
 * Compact quota banner for the logged-in outreach agent. Renders nothing for
 * users without a lead bank (admins, super-admins, or unassigned agents) so it
 * is safe to mount unconditionally.
 */
export default function MyLeadBankBanner() {
    const [bank, setBank] = useState<LeadBank | null>(null);

    useEffect(() => {
        let active = true;
        apiService.getMyLeadBank()
            .then((b) => { if (active) setBank(b); })
            .catch(() => { /* not an outreach agent / no bank — stay hidden */ });
        return () => { active = false; };
    }, []);

    if (!bank) return null;

    const cap = bank.monthly_quota ?? bank.total_leads;
    const pct = Math.min(100, bank.quota_consumed_pct);

    return (
        <div className="rounded-xl border border-white/[0.08] bg-gray-950/60 backdrop-blur-sm p-4">
            <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2">
                    <Wallet size={16} className="text-cyan-400" />
                    <span className="text-sm text-white font-medium">{bank.name}</span>
                    <div className="flex flex-wrap gap-1">
                        {bank.states.map((s) => (
                            <span key={s.state_code} className="text-[11px] font-mono px-1.5 py-0.5 rounded bg-white/[0.04] border border-white/10 text-gray-300">
                                {s.state_code}
                            </span>
                        ))}
                    </div>
                </div>
                <span className="text-xs font-mono tabular-nums text-gray-400">
                    {bank.leads_contacted.toLocaleString()} / {cap.toLocaleString()} leads · {bank.quota_consumed_pct}%
                </span>
            </div>
            <div className="mt-2 h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
                <div className={`h-full ${pct >= 90 ? 'bg-rose-500' : 'bg-cyan-500'}`} style={{ width: `${pct}%` }} />
            </div>
        </div>
    );
}
