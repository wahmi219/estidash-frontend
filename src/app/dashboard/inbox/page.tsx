'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import {
    Inbox, Mail, Send, RefreshCw, Loader2, ChevronLeft, AlertCircle, CheckCircle2, AtSign,
} from 'lucide-react';
import { apiService } from '@/services/api';
import type { ContractorThreadOut } from '@/types';

interface InboxItem {
    id: string; email: string; display_name: string; domain: string;
    provider: string; status: string; message_count: number; last_message_at: string | null;
}
interface Conversation {
    contact_email: string; contact_name: string | null; contractor_id: string | null;
    sent_count: number; received_count: number;
    last_direction: 'sent' | 'received' | null;
    last_subject: string | null; last_preview: string | null;
    last_message_at: string | null; latest_reply_intent: string | null; has_unread: boolean;
}

const INTENT_STYLE: Record<string, string> = {
    hot_lead: 'bg-emerald-500/15 text-emerald-400',
    soft: 'bg-cyan-500/15 text-cyan-400',
    not_now: 'bg-amber-500/15 text-amber-400',
    no: 'bg-rose-500/15 text-rose-400',
};

function fmt(ts: string | null): string {
    if (!ts) return '';
    try { return new Date(ts).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }); }
    catch { return ts; }
}

export default function InboxPage() {
    const [inboxes, setInboxes] = useState<InboxItem[]>([]);
    const [selectedInbox, setSelectedInbox] = useState<string | null>(null);
    const [conversations, setConversations] = useState<Conversation[]>([]);
    const [selectedContact, setSelectedContact] = useState<string | null>(null);
    const [thread, setThread] = useState<ContractorThreadOut | null>(null);

    const [loadingInboxes, setLoadingInboxes] = useState(true);
    const [loadingConvos, setLoadingConvos] = useState(false);
    const [loadingThread, setLoadingThread] = useState(false);

    const [replyText, setReplyText] = useState('');
    const [sending, setSending] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [sent, setSent] = useState(false);

    const threadEndRef = useRef<HTMLDivElement>(null);

    const loadInboxes = useCallback(async () => {
        setLoadingInboxes(true);
        try {
            const data = await apiService.listSendingInboxes();
            setInboxes(data);
            setSelectedInbox((cur) => cur ?? data[0]?.email ?? null);
        } catch {
            setError('Failed to load inboxes');
        } finally {
            setLoadingInboxes(false);
        }
    }, []);

    const loadConversations = useCallback(async (inboxEmail: string) => {
        setLoadingConvos(true);
        try {
            setConversations(await apiService.getInboxConversations(inboxEmail));
        } catch {
            setConversations([]);
        } finally {
            setLoadingConvos(false);
        }
    }, []);

    const loadThread = useCallback(async (contactEmail: string) => {
        setLoadingThread(true);
        try {
            setThread(await apiService.getEmailThread(contactEmail));
        } catch {
            setThread(null);
        } finally {
            setLoadingThread(false);
        }
    }, []);

    useEffect(() => { loadInboxes(); }, [loadInboxes]);
    useEffect(() => {
        if (selectedInbox) { setSelectedContact(null); setThread(null); loadConversations(selectedInbox); }
    }, [selectedInbox, loadConversations]);
    useEffect(() => {
        if (selectedContact) loadThread(selectedContact);
    }, [selectedContact, loadThread]);
    useEffect(() => {
        threadEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [thread]);

    const handleReply = async () => {
        if (!selectedContact || !replyText.trim()) return;
        setSending(true); setError(null); setSent(false);
        try {
            await apiService.replyToThread({ contact_email: selectedContact, body: replyText.trim() });
            setReplyText('');
            setSent(true);
            await loadThread(selectedContact);
            if (selectedInbox) loadConversations(selectedInbox);
            setTimeout(() => setSent(false), 2500);
        } catch (e: unknown) {
            const detail = (e as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
            setError(detail || 'Failed to send reply');
        } finally {
            setSending(false);
        }
    };

    const selectedConvo = conversations.find((c) => c.contact_email === selectedContact);

    return (
        <div className="p-4 lg:p-6 h-[calc(100vh-1rem)]">
            <div className="flex items-center gap-2 mb-4">
                <Inbox size={20} className="text-cyan-400" />
                <h1 className="text-xl font-semibold text-white">Inbox</h1>
                <span className="text-xs text-gray-500">Your assigned inboxes · incoming &amp; outgoing</span>
                <button onClick={loadInboxes} className="ml-auto inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-gray-300 border border-white/10 text-xs">
                    <RefreshCw size={13} className={loadingInboxes ? 'animate-spin' : ''} /> Refresh
                </button>
            </div>

            <div className="grid grid-cols-12 gap-3 h-[calc(100%-3rem)]">
                {/* Left: inboxes */}
                <div className="col-span-3 rounded-2xl border border-white/[0.08] bg-gray-950/60 overflow-y-auto">
                    <div className="px-3 py-2 text-[10px] uppercase tracking-widest text-gray-500 sticky top-0 bg-gray-950/90 backdrop-blur">Inboxes</div>
                    {loadingInboxes ? (
                        <div className="flex justify-center py-8"><Loader2 size={18} className="animate-spin text-cyan-400" /></div>
                    ) : inboxes.length === 0 ? (
                        <div className="px-3 py-6 text-xs text-gray-500">No inboxes assigned to you yet.</div>
                    ) : inboxes.map((ib) => (
                        <button key={ib.id} onClick={() => setSelectedInbox(ib.email)}
                            className={`w-full text-left px-3 py-2.5 border-l-2 transition-colors ${selectedInbox === ib.email ? 'border-cyan-400 bg-cyan-500/5' : 'border-transparent hover:bg-white/[0.03]'}`}>
                            <div className="flex items-center gap-1.5 text-sm text-gray-200 truncate"><AtSign size={12} className="text-gray-500 shrink-0" />{ib.email}</div>
                            <div className="flex items-center gap-2 mt-0.5 text-[11px] text-gray-500">
                                <span>{ib.domain}</span>
                                {ib.message_count > 0 && <span className="font-mono text-cyan-400">{ib.message_count} in</span>}
                            </div>
                        </button>
                    ))}
                </div>

                {/* Middle: conversations */}
                <div className="col-span-4 rounded-2xl border border-white/[0.08] bg-gray-950/60 overflow-y-auto">
                    <div className="px-3 py-2 text-[10px] uppercase tracking-widest text-gray-500 sticky top-0 bg-gray-950/90 backdrop-blur truncate">
                        {selectedInbox ? `Conversations · ${selectedInbox}` : 'Conversations'}
                    </div>
                    {loadingConvos ? (
                        <div className="flex justify-center py-8"><Loader2 size={18} className="animate-spin text-cyan-400" /></div>
                    ) : conversations.length === 0 ? (
                        <div className="px-3 py-6 text-xs text-gray-500">No conversations on this inbox yet.</div>
                    ) : conversations.map((c) => (
                        <button key={c.contact_email} onClick={() => setSelectedContact(c.contact_email)}
                            className={`w-full text-left px-3 py-2.5 border-b border-white/[0.04] transition-colors ${selectedContact === c.contact_email ? 'bg-cyan-500/5' : 'hover:bg-white/[0.03]'}`}>
                            <div className="flex items-center justify-between gap-2">
                                <span className="text-sm text-gray-200 truncate">{c.contact_name || c.contact_email}</span>
                                <span className="text-[10px] text-gray-600 shrink-0">{fmt(c.last_message_at)}</span>
                            </div>
                            <div className="flex items-center gap-1.5 mt-0.5">
                                {c.last_direction === 'received' && <span className="text-[10px] text-emerald-400">●</span>}
                                <span className="text-xs text-gray-500 truncate">{c.last_subject || '(no subject)'}</span>
                            </div>
                            {c.latest_reply_intent && (
                                <span className={`inline-block mt-1 px-1.5 py-0.5 rounded text-[10px] ${INTENT_STYLE[c.latest_reply_intent] || 'bg-gray-500/15 text-gray-400'}`}>
                                    {c.latest_reply_intent.replace('_', ' ')}
                                </span>
                            )}
                        </button>
                    ))}
                </div>

                {/* Right: thread + reply */}
                <div className="col-span-5 rounded-2xl border border-white/[0.08] bg-gray-950/60 flex flex-col">
                    {!selectedContact ? (
                        <div className="flex-1 flex flex-col items-center justify-center text-gray-600 gap-2">
                            <Mail size={28} className="opacity-40" />
                            <p className="text-sm">Select a conversation</p>
                        </div>
                    ) : (
                        <>
                            <div className="px-4 py-3 border-b border-white/[0.06] flex items-center gap-2">
                                <button onClick={() => setSelectedContact(null)} className="lg:hidden text-gray-400"><ChevronLeft size={16} /></button>
                                <div className="min-w-0">
                                    <div className="text-sm font-medium text-white truncate">{selectedConvo?.contact_name || selectedContact}</div>
                                    <div className="text-[11px] text-gray-500 truncate">{selectedContact}</div>
                                </div>
                            </div>

                            <div className="flex-1 overflow-y-auto p-4 space-y-3">
                                {loadingThread ? (
                                    <div className="flex justify-center py-8"><Loader2 size={18} className="animate-spin text-cyan-400" /></div>
                                ) : (thread?.items || []).map((m) => (
                                    <div key={m.id} className={`flex ${m.direction === 'sent' ? 'justify-end' : 'justify-start'}`}>
                                        <div className={`max-w-[80%] rounded-2xl px-3.5 py-2.5 ${m.direction === 'sent' ? 'bg-cyan-500/15 border border-cyan-500/20' : 'bg-white/[0.04] border border-white/[0.08]'}`}>
                                            <div className="flex items-center gap-2 text-[10px] text-gray-500 mb-1">
                                                <span>{m.direction === 'sent' ? '↑ ' + m.from_email : '↓ ' + m.from_email}</span>
                                                <span>·</span>
                                                <span>{fmt(m.timestamp)}</span>
                                                {m.is_auto_reply && <span className="text-amber-400">auto</span>}
                                            </div>
                                            {m.subject && <div className="text-xs font-medium text-gray-300 mb-1">{m.subject}</div>}
                                            <div className="text-sm text-gray-200 whitespace-pre-wrap break-words">{m.body_text}</div>
                                        </div>
                                    </div>
                                ))}
                                <div ref={threadEndRef} />
                            </div>

                            {/* Reply composer — sends from the inbox that owns this thread (read-only) */}
                            <div className="border-t border-white/[0.06] p-3 space-y-2">
                                <div className="flex items-center gap-2 text-[11px] text-gray-500">
                                    <Send size={12} /> Replying from <span className="font-mono text-gray-400">{selectedInbox}</span>
                                </div>
                                {error && (
                                    <div className="flex items-center gap-1.5 text-xs text-rose-400"><AlertCircle size={13} /> {error}</div>
                                )}
                                {sent && (
                                    <div className="flex items-center gap-1.5 text-xs text-emerald-400"><CheckCircle2 size={13} /> Reply sent</div>
                                )}
                                <textarea
                                    value={replyText}
                                    onChange={(e) => setReplyText(e.target.value)}
                                    placeholder="Write your reply…"
                                    rows={3}
                                    className="w-full px-3 py-2 bg-white/[0.04] border border-white/10 rounded-xl text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-cyan-500/50 resize-none"
                                />
                                <div className="flex justify-end">
                                    <button onClick={handleReply} disabled={sending || !replyText.trim()}
                                        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-300 border border-cyan-500/30 text-sm font-medium disabled:opacity-50">
                                        {sending ? <><Loader2 size={14} className="animate-spin" /> Sending…</> : <><Send size={14} /> Send reply</>}
                                    </button>
                                </div>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
