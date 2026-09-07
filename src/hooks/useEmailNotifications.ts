'use client';

import { useEffect, useRef, useCallback, useState } from 'react';
import { apiService } from '@/services/api';

export type EmailNotification = {
    id: string;
    from_email: string;
    subject: string;
    preview: string;
    received_at: string;
    to_email: string;
    intent: 'hot_lead' | 'soft' | 'not_now' | 'no' | null;
};

/** Two-tone chime via Web Audio API — no file dependency. */
function playChime() {
    try {
        const Ctx = (window as any).AudioContext ?? (window as any).webkitAudioContext;
        if (!Ctx) return;
        const ctx: AudioContext = new Ctx();
        const t = ctx.currentTime;
        const notes = [
            { freq: 1046, start: 0,    dur: 0.18 },  // C6
            { freq:  784, start: 0.15, dur: 0.22 },  // G5
        ];
        notes.forEach(({ freq, start, dur }) => {
            const osc  = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.type = 'sine';
            osc.frequency.value = freq;
            gain.gain.setValueAtTime(0, t + start);
            gain.gain.linearRampToValueAtTime(0.22, t + start + 0.01);
            gain.gain.exponentialRampToValueAtTime(0.001, t + start + dur);
            osc.start(t + start);
            osc.stop(t + start + dur + 0.01);
        });
    } catch {
        // AudioContext not available (SSR or restricted)
    }
}

const POLL_INTERVAL = 20_000; // 20 seconds
const CURSOR_KEY    = 'notif_since';
// How far back to look on a fresh session (localStorage miss or value too old).
// 5 min: catch emails that arrived while the page was closed briefly.
const FRESH_LOOKBACK_MS = 5 * 60 * 1000;
// Hard cap: never replay more than 2 hours of history to avoid notification flood.
const MAX_LOOKBACK_MS = 2 * 60 * 60 * 1000;

function readCursor(): string {
    try {
        const stored = typeof window !== 'undefined' ? localStorage.getItem(CURSOR_KEY) : null;
        if (!stored) return new Date(Date.now() - FRESH_LOOKBACK_MS).toISOString();
        const age = Date.now() - new Date(stored).getTime();
        // If cursor is older than 2 h, clamp to avoid replaying huge history
        if (age > MAX_LOOKBACK_MS) return new Date(Date.now() - MAX_LOOKBACK_MS).toISOString();
        return stored;
    } catch {
        return new Date(Date.now() - FRESH_LOOKBACK_MS).toISOString();
    }
}

function saveCursor(iso: string) {
    try { typeof window !== 'undefined' && localStorage.setItem(CURSOR_KEY, iso); } catch { /* quota full */ }
}

export function useEmailNotifications(enabled = true) {
    const [notifications, setNotifications] = useState<EmailNotification[]>([]);
    const [unreadCount, setUnreadCount]     = useState(0);
    // Cursor persisted across page refreshes via localStorage.
    // Initialised once from storage so emails that arrived before this mount
    // are still surfaced (up to 2 h back, 5 min on first ever visit).
    const sinceRef   = useRef<string>(readCursor());
    const timerRef   = useRef<ReturnType<typeof setInterval> | null>(null);
    const mountedRef = useRef(true);

    const check = useCallback(async () => {
        if (!mountedRef.current) return;
        try {
            const items: EmailNotification[] = await apiService.pollNotifications(sinceRef.current);
            if (!items.length || !mountedRef.current) return;

            // Advance cursor past the newest item and persist it
            sinceRef.current = items[items.length - 1].received_at;
            saveCursor(sinceRef.current);

            // Sound
            playChime();

            // Browser / OS notification (only if permission granted — never request here)
            if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
                items.forEach(item => {
                    try {
                        new Notification(`New email from ${item.from_email}`, {
                            body: item.subject,
                            icon: '/favicon.ico',
                            tag:  item.id,  // deduplicate OS-level
                            silent: true,   // we handle sound ourselves
                        });
                    } catch { /* ignored */ }
                });
            }

            // Prepend to in-app list, keep at most 50
            setNotifications(prev => [...items].reverse().concat(prev).slice(0, 50));
            setUnreadCount(n => n + items.length);
        } catch {
            // Network errors, auth expiry — silently skip
        }
    }, []);

    useEffect(() => {
        if (!enabled) return;
        mountedRef.current = true;

        // Request browser notification permission once (non-blocking)
        if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'default') {
            Notification.requestPermission().catch(() => {});
        }

        // Fire immediately so notifications appear without waiting 20 s after
        // a page refresh. Subsequent checks run on the interval.
        check();
        timerRef.current = setInterval(check, POLL_INTERVAL);
        return () => {
            mountedRef.current = false;
            if (timerRef.current) clearInterval(timerRef.current);
        };
    }, [enabled, check]);

    const clearUnread = useCallback(() => setUnreadCount(0), []);
    const dismiss     = useCallback((id: string) => setNotifications(p => p.filter(n => n.id !== id)), []);
    const dismissAll  = useCallback(() => { setNotifications([]); setUnreadCount(0); }, []);

    return { notifications, unreadCount, clearUnread, dismiss, dismissAll };
}
