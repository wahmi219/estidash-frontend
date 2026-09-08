'use client';

import React from 'react';
import { ShieldCheck, Link2, Clock } from 'lucide-react';
import { RegistrySourceRead } from '@/types';

function relativeTime(iso: string | null): string {
    if (!iso) return 'never';
    const diffMs = Date.now() - new Date(iso).getTime();
    const mins = Math.round(diffMs / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.round(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    return `${Math.round(hours / 24)}d ago`;
}

function absoluteTime(iso: string | null): string | undefined {
    if (!iso) return undefined;
    return new Date(iso).toLocaleString('en-US', {
        month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit',
    });
}

interface RegistryStatsCardProps {
    source: RegistrySourceRead | null;
    loading: boolean;
}

function Stat({ label, value }: { label: string; value: React.ReactNode }) {
    return (
        <div className="flex flex-col">
            <span className="text-2xl font-mono font-bold tabular-nums text-[#0E2B5C]">{value}</span>
            <span className="text-[11px] uppercase tracking-widest text-[#5B6B7D] mt-0.5">{label}</span>
        </div>
    );
}

export default function RegistryStatsCard({ source, loading }: RegistryStatsCardProps) {
    if (loading || !source) {
        return (
            <div className="bg-white border border-[#DFE6EE] rounded-lg p-5 animate-pulse">
                <div className="h-4 w-48 bg-[#F7F9FB] rounded mb-4" />
                <div className="flex gap-8">
                    {Array.from({ length: 3 }).map((_, i) => (
                        <div key={i} className="h-10 w-20 bg-[#F7F9FB] rounded" />
                    ))}
                </div>
            </div>
        );
    }

    const historicCount = source.disappeared_count;

    return (
        <div className="bg-white border border-[#DFE6EE] rounded-lg p-5">
            <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
                <div className="flex items-center gap-2">
                    <ShieldCheck size={16} className="text-[#00458B] shrink-0" />
                    <h2 className="font-semibold text-[#0E2B5C]">
                        Official Registry — {source.display_name}
                    </h2>
                </div>
                <div
                    className="flex items-center gap-1.5 text-xs text-[#5B6B7D]"
                    title={absoluteTime(source.last_synced_at)}
                >
                    <Clock size={12} />
                    Last synced {relativeTime(source.last_synced_at)}
                </div>
            </div>

            <div className="flex flex-wrap gap-8">
                <Stat label="Total Records" value={source.current_count.toLocaleString()} />
                <Stat label="Active" value={(source.current_count - historicCount).toLocaleString()} />
                <Stat label="Historic" value={historicCount.toLocaleString()} />
                <Stat
                    label="Matched to Permit Intelligence"
                    value={
                        <span className="flex items-center gap-1.5">
                            <Link2 size={16} className="text-[#5B6B7D]" />
                            {source.matched_count.toLocaleString()}
                            <span className="text-sm font-normal text-[#5B6B7D]">({source.coverage_pct.toFixed(1)}%)</span>
                        </span>
                    }
                />
            </div>
        </div>
    );
}
