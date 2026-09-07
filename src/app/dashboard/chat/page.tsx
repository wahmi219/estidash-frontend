'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    MessageSquare,
    Plus,
    Send,
    Sparkles,
    Clock,
    ChevronLeft,
    ChevronRight,
    MoreVertical,
    Trash2,
    Edit3,
    Search,
    Bot,
    User,
    ArrowDown,
    Loader2,
    AlertTriangle,
    Check,
    X,
    PanelLeftClose,
    PanelLeftOpen,
} from 'lucide-react';
import clsx from 'clsx';
import MarkdownRenderer from '@/components/chat/MarkdownRenderer';
import { useAppDispatch, useAppSelector } from '@/hooks/useAppDispatch';
import {
    sendQuery,
    addUserMessage,
    fetchSessions,
    loadSessionHistory,
    createSession,
    startNewConversation,
    clearError,
    deleteSession,
    editUserMessage,
} from '@/store/slices/chatSlice';

// ============================================================================
// Confirmation Modal
// ============================================================================
function ConfirmDeleteModal({
    sessionTitle,
    onConfirm,
    onCancel,
}: {
    sessionTitle: string;
    onConfirm: () => void;
    onCancel: () => void;
}) {
    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
            onClick={onCancel}
        >
            <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                onClick={(e) => e.stopPropagation()}
                className="bg-white dark:bg-[#1a1d2e] border border-gray-200 dark:border-white/10 rounded-2xl p-6 max-w-sm w-full mx-4 shadow-2xl"
            >
                <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 rounded-xl bg-rose-500/20">
                        <Trash2 size={20} className="text-rose-400" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Delete Conversation</h3>
                </div>
                <p className="text-gray-500 dark:text-gray-400 text-sm mb-1">
                    Are you sure you want to delete this conversation?
                </p>
                <p className="text-gray-900 dark:text-white text-sm font-medium mb-6 truncate">
                    &ldquo;{sessionTitle}&rdquo;
                </p>
                <p className="text-gray-500 text-xs mb-6">
                    This action cannot be undone. All messages will be permanently removed.
                </p>
                <div className="flex gap-3">
                    <button
                        onClick={onCancel}
                        className="flex-1 px-4 py-2.5 rounded-xl bg-black/4 dark:bg-white/5 border border-gray-200 dark:border-white/10 text-gray-600 dark:text-gray-300 hover:bg-black/6 dark:hover:bg-white/10 transition-colors text-sm font-medium"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={onConfirm}
                        className="flex-1 px-4 py-2.5 rounded-xl bg-rose-500/20 border border-rose-500/30 text-rose-400 hover:bg-rose-500/30 transition-colors text-sm font-medium"
                    >
                        Delete
                    </button>
                </div>
            </motion.div>
        </motion.div>
    );
}

// ============================================================================
// Thread/Session Sidebar
// ============================================================================
function ThreadSidebar({
    sessions,
    currentSessionId,
    isLoading,
    onSelectSession,
    onNewConversation,
    onDeleteSession,
    collapsed,
    onToggleCollapse,
}: {
    sessions: Array<{ id: string; title: string; updatedAt: string }>;
    currentSessionId: string | null;
    isLoading: boolean;
    onSelectSession: (id: string) => void;
    onNewConversation: () => void;
    onDeleteSession: (id: string, title: string) => void;
    collapsed: boolean;
    onToggleCollapse: () => void;
}) {
    const [searchQuery, setSearchQuery] = useState('');
    const [openMenuId, setOpenMenuId] = useState<string | null>(null);

    const filteredSessions = sessions.filter(s =>
        s.title.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        const now = new Date();
        const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));

        if (diffDays === 0) return 'Today';
        if (diffDays === 1) return 'Yesterday';
        if (diffDays < 7) return `${diffDays} days ago`;
        return date.toLocaleDateString();
    };

    // Close menu on outside click
    useEffect(() => {
        const handleClick = () => setOpenMenuId(null);
        if (openMenuId) {
            document.addEventListener('click', handleClick);
            return () => document.removeEventListener('click', handleClick);
        }
    }, [openMenuId]);

    return (
        <div
            className={clsx(
                'h-full border-r border-gray-200 dark:border-white/6 flex flex-col bg-black/2 dark:bg-white/2 transition-all duration-300 relative',
                collapsed ? 'w-0 overflow-hidden border-r-0' : 'w-80'
            )}
        >
            {/* Toggle Button */}
            <button
                onClick={onToggleCollapse}
                className={clsx(
                    'absolute top-4 z-10 p-1.5 rounded-lg bg-black/4 dark:bg-white/5 border border-gray-200 dark:border-white/10 hover:bg-black/6 dark:hover:bg-white/10 transition-all',
                    collapsed ? '-right-10' : 'right-2'
                )}
                title={collapsed ? 'Show sidebar' : 'Hide sidebar'}
            >
                {collapsed ? (
                    <PanelLeftOpen size={16} className="text-gray-400" />
                ) : (
                    <PanelLeftClose size={16} className="text-gray-400" />
                )}
            </button>

            {!collapsed && (
                <>
                    {/* Header */}
                    <div className="p-4 border-b border-gray-200 dark:border-white/6">
                        <button
                            onClick={onNewConversation}
                            className="w-full btn-primary flex items-center justify-center gap-2"
                        >
                            <Plus size={18} />
                            New Conversation
                        </button>
                    </div>

                    {/* Search */}
                    <div className="p-3">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                            <input
                                type="text"
                                placeholder="Search conversations..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="input-field w-full pl-10 text-sm"
                            />
                        </div>
                    </div>

                    {/* Sessions List */}
                    <div className="flex-1 overflow-y-auto hide-scrollbar p-2 space-y-1">
                        {isLoading ? (
                            <div className="space-y-2 p-2">
                                {[...Array(5)].map((_, i) => (
                                    <div key={i} className="skeleton h-16 rounded-xl" />
                                ))}
                            </div>
                        ) : filteredSessions.length > 0 ? (
                            filteredSessions.map((session) => (
                                <div key={session.id} className="relative group">
                                    <button
                                        onClick={() => onSelectSession(session.id)}
                                        className={clsx(
                                            'thread-item w-full text-left',
                                            currentSessionId === session.id && 'active'
                                        )}
                                    >
                                        <div className="flex items-start gap-3">
                                            <div className="p-2 rounded-lg bg-black/4 dark:bg-white/5 mt-0.5">
                                                <MessageSquare size={14} className="text-gray-400" />
                                            </div>
                                            <div className="flex-1 min-w-0 pr-6">
                                                <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                                                    {session.title}
                                                </p>
                                                <p className="text-xs text-gray-500 flex items-center gap-1 mt-1">
                                                    <Clock size={10} />
                                                    {formatDate(session.updatedAt)}
                                                </p>
                                            </div>
                                        </div>
                                    </button>

                                    {/* Three-dot menu */}
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setOpenMenuId(openMenuId === session.id ? null : session.id);
                                        }}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-white/10 transition-all"
                                    >
                                        <MoreVertical size={14} className="text-gray-400" />
                                    </button>

                                    {/* Dropdown menu */}
                                    <AnimatePresence>
                                        {openMenuId === session.id && (
                                            <motion.div
                                                initial={{ opacity: 0, y: -5, scale: 0.95 }}
                                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                                exit={{ opacity: 0, y: -5, scale: 0.95 }}
                                                className="absolute right-2 top-full mt-1 z-20 bg-white dark:bg-[#1a1d2e] border border-gray-200 dark:border-white/10 rounded-xl shadow-xl overflow-hidden min-w-[140px]"
                                            >
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setOpenMenuId(null);
                                                        onDeleteSession(session.id, session.title);
                                                    }}
                                                    className="w-full flex items-center gap-2 px-3 py-2.5 text-sm text-rose-400 hover:bg-rose-500/10 transition-colors"
                                                >
                                                    <Trash2 size={14} />
                                                    Delete
                                                </button>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </div>
                            ))
                        ) : (
                            <div className="text-center py-8 text-gray-500">
                                <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-50" />
                                <p className="text-sm">No conversations yet</p>
                                <p className="text-xs mt-1">Start a new chat to begin</p>
                            </div>
                        )}
                    </div>
                </>
            )}
        </div>
    );
}

// ============================================================================
// Message Bubble Component
// ============================================================================
function MessageBubble({
    id,
    role,
    content,
    timestamp,
    isError,
    isEdited,
    editedAt,
    onEdit,
    isLoading,
}: {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    timestamp: string;
    isError?: boolean;
    isEdited?: boolean;
    editedAt?: string;
    onEdit?: (id: string, content: string) => void;
    isLoading?: boolean;
}) {
    const isUser = role === 'user';
    const [editing, setEditing] = useState(false);
    const [editText, setEditText] = useState(content);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    useEffect(() => {
        if (editing && textareaRef.current) {
            textareaRef.current.focus();
            textareaRef.current.setSelectionRange(editText.length, editText.length);
        }
    }, [editing]);

    const handleSaveEdit = () => {
        const trimmed = editText.trim();
        if (!trimmed || trimmed === content) {
            setEditing(false);
            setEditText(content);
            return;
        }
        onEdit?.(id, trimmed);
        setEditing(false);
    };

    const handleCancelEdit = () => {
        setEditing(false);
        setEditText(content);
    };

    const handleEditKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSaveEdit();
        }
        if (e.key === 'Escape') {
            handleCancelEdit();
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={clsx(
                'chat-message flex gap-3 group',
                isUser ? 'ml-auto flex-row-reverse' : 'mr-auto'
            )}
        >
            {/* Avatar */}
            <div className={clsx(
                'w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0',
                isUser
                    ? 'bg-gradient-to-br from-cyan-500 to-purple-600'
                    : 'bg-white/10'
            )}>
                {isUser ? (
                    <User size={16} className="text-white" />
                ) : (
                    <Bot size={16} className="text-cyan-400" />
                )}
            </div>

            {/* Message */}
            <div className={clsx(
                'rounded-2xl px-4 py-3 max-w-[80%] relative',
                isUser
                    ? 'chat-bubble-user text-white'
                    : 'chat-bubble-assistant text-gray-200',
                isError && 'border border-rose-500/30 bg-rose-500/5'
            )}>
                {isError && !isUser && (
                    <div className="flex items-center gap-2 mb-2 text-rose-400 text-xs font-medium">
                        <AlertTriangle size={14} />
                        <span>Error processing query</span>
                    </div>
                )}

                {editing ? (
                    <div className="space-y-2">
                        <textarea
                            ref={textareaRef}
                            value={editText}
                            onChange={(e) => setEditText(e.target.value)}
                            onKeyDown={handleEditKeyDown}
                            className="w-full bg-white/10 border border-white/20 rounded-xl px-3 py-2 text-sm text-white resize-none focus:outline-none focus:border-cyan-500/50 min-h-[60px]"
                            rows={2}
                        />
                        <div className="flex items-center gap-2 justify-end">
                            <button
                                onClick={handleCancelEdit}
                                className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs text-gray-400 hover:bg-white/10 transition-colors"
                            >
                                <X size={12} />
                                Cancel
                            </button>
                            <button
                                onClick={handleSaveEdit}
                                disabled={!editText.trim() || editText.trim() === content}
                                className={clsx(
                                    'flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors',
                                    editText.trim() && editText.trim() !== content
                                        ? 'bg-cyan-500/20 text-cyan-400 hover:bg-cyan-500/30 border border-cyan-500/30'
                                        : 'bg-white/5 text-gray-500 cursor-not-allowed'
                                )}
                            >
                                <Send size={12} />
                                Save & Resubmit
                            </button>
                        </div>
                    </div>
                ) : (
                    <>
                        {isUser ? (
                            <div className="text-sm leading-relaxed">{content}</div>
                        ) : (
                            <MarkdownRenderer content={content} />
                        )}
                    </>
                )}

                {/* Timestamp & Edit badge */}
                {!editing && (
                    <div className={clsx(
                        'flex items-center gap-2 mt-2',
                        isUser ? 'justify-end' : 'justify-start'
                    )}>
                        <p className={clsx(
                            'text-xs',
                            isUser ? 'text-white/60' : 'text-gray-500'
                        )}>
                            {new Date(timestamp).toLocaleTimeString([], {
                                hour: '2-digit',
                                minute: '2-digit'
                            })}
                        </p>
                        {isEdited && (
                            <span className="text-xs text-amber-400/80 italic">
                                (edited)
                            </span>
                        )}
                    </div>
                )}

                {/* Edit button for user messages */}
                {isUser && !editing && !isLoading && (
                    <button
                        onClick={() => setEditing(true)}
                        className="absolute -left-8 top-1/2 -translate-y-1/2 p-1.5 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-white/10 transition-all"
                        title="Edit message"
                    >
                        <Edit3 size={14} className="text-gray-400" />
                    </button>
                )}
            </div>
        </motion.div>
    );
}

// ============================================================================
// Typing Indicator
// ============================================================================
function TypingIndicator() {
    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex gap-3 mr-auto chat-message"
        >
            <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center">
                <Bot size={16} className="text-cyan-400" />
            </div>
            <div className="chat-bubble-assistant px-4 py-3 flex items-center gap-2">
                <div className="flex gap-1">
                    <div className="w-2 h-2 rounded-full bg-gray-400 animate-pulse-dot" style={{ animationDelay: '0ms' }} />
                    <div className="w-2 h-2 rounded-full bg-gray-400 animate-pulse-dot" style={{ animationDelay: '150ms' }} />
                    <div className="w-2 h-2 rounded-full bg-gray-400 animate-pulse-dot" style={{ animationDelay: '300ms' }} />
                </div>
                <span className="text-sm text-gray-400 ml-2">Thinking...</span>
            </div>
        </motion.div>
    );
}

// ============================================================================
// Welcome Message
// ============================================================================
function WelcomeMessage({ onExampleClick }: { onExampleClick: (q: string) => void }) {
    const examples = [
        "What is the market pulse for this month?",
        "Show me hot CBSAs with the highest growth",
        "Which areas should I avoid for outreach?",
        "What trade opportunities are available?",
    ];

    return (
        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
            <div className="p-4 rounded-2xl bg-gradient-to-br from-cyan-500/20 to-purple-500/20 mb-6">
                <Sparkles className="w-10 h-10 text-cyan-400" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">EstiHub Intelligence</h2>
            <p className="text-gray-400 max-w-md mb-8">
                Ask me anything about housing permits, market trends, CBSAs, or trade opportunities.
                I have access to your database and can provide real-time insights.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-2xl w-full">
                {examples.map((example, i) => (
                    <button
                        key={i}
                        onClick={() => onExampleClick(example)}
                        className="p-4 text-left rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20 transition-all group"
                    >
                        <p className="text-sm text-gray-300 group-hover:text-white">
                            {example}
                        </p>
                    </button>
                ))}
            </div>
        </div>
    );
}

// ============================================================================
// Main Chat Page
// ============================================================================
export default function ChatPage() {
    const dispatch = useAppDispatch();
    const { messages, isLoading, error, currentSessionId, sessions, sessionsLoading } = useAppSelector(
        (state) => state.chat
    );

    const [input, setInput] = useState('');
    const [showScrollButton, setShowScrollButton] = useState(false);
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
    const [deleteTarget, setDeleteTarget] = useState<{ id: string; title: string } | null>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const messagesContainerRef = useRef<HTMLDivElement>(null);

    // Fetch sessions on mount
    useEffect(() => {
        dispatch(fetchSessions({}));
    }, [dispatch]);

    // Refresh session list when a new session is created from a query
    useEffect(() => {
        if (currentSessionId) {
            dispatch(fetchSessions({}));
        }
    }, [currentSessionId, dispatch]);

    // Scroll to bottom when messages change
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    // Handle scroll to show/hide scroll button
    const handleScroll = useCallback(() => {
        const container = messagesContainerRef.current;
        if (container) {
            const { scrollTop, scrollHeight, clientHeight } = container;
            const isNearBottom = scrollHeight - scrollTop - clientHeight < 100;
            setShowScrollButton(!isNearBottom);
        }
    }, []);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    const handleSubmit = async (e?: React.FormEvent) => {
        e?.preventDefault();
        if (!input.trim() || isLoading) return;

        const question = input.trim();
        setInput('');

        // Add user message to UI
        dispatch(addUserMessage(question));

        // Send query to API
        dispatch(sendQuery({ question, sessionId: currentSessionId || undefined }));
    };

    const handleExampleClick = (question: string) => {
        setInput(question);
        // Auto-submit
        dispatch(addUserMessage(question));
        dispatch(sendQuery({ question, sessionId: currentSessionId || undefined }));
    };

    const handleNewConversation = () => {
        dispatch(startNewConversation());
    };

    const handleSelectSession = (sessionId: string) => {
        dispatch(loadSessionHistory(sessionId));
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSubmit();
        }
    };

    // Delete handlers
    const handleRequestDelete = (id: string, title: string) => {
        setDeleteTarget({ id, title });
    };

    const handleConfirmDelete = () => {
        if (deleteTarget) {
            dispatch(deleteSession(deleteTarget.id));
            setDeleteTarget(null);
        }
    };

    const handleCancelDelete = () => {
        setDeleteTarget(null);
    };

    // Edit handler
    const handleEditMessage = (messageId: string, newContent: string) => {
        // Update the message and truncate subsequent messages
        dispatch(editUserMessage({ messageId, newContent }));

        // Re-submit the edited query
        dispatch(sendQuery({ question: newContent, sessionId: currentSessionId || undefined }));
    };

    return (
        <div className="p-6 lg:p-8">
            <div className="h-[calc(100vh-6rem)] flex rounded-2xl overflow-hidden border border-white/[0.06] bg-white/[0.02]">
                {/* Thread Sidebar */}
                <ThreadSidebar
                    sessions={sessions}
                    currentSessionId={currentSessionId}
                    isLoading={sessionsLoading}
                    onSelectSession={handleSelectSession}
                    onNewConversation={handleNewConversation}
                    onDeleteSession={handleRequestDelete}
                    collapsed={sidebarCollapsed}
                    onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
                />

                {/* Chat Area */}
                <div className="flex-1 flex flex-col min-w-0">
                    {/* Chat Header */}
                    <div className="p-4 border-b border-white/[0.06] flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            {sidebarCollapsed && (
                                <button
                                    onClick={() => setSidebarCollapsed(false)}
                                    className="p-2 rounded-lg hover:bg-white/5 transition-colors mr-1"
                                    title="Show sidebar"
                                >
                                    <PanelLeftOpen size={18} className="text-gray-400" />
                                </button>
                            )}
                            <div className="p-2 rounded-xl bg-gradient-to-br from-cyan-500/20 to-purple-500/20">
                                <Bot size={20} className="text-cyan-400" />
                            </div>
                            <div>
                                <h2 className="font-semibold text-white">EstiHub Intelligence</h2>
                                <p className="text-xs text-gray-500">
                                    {currentSessionId ? 'Conversation active' : 'New conversation'}
                                </p>
                            </div>
                        </div>
                        {currentSessionId && (
                            <div className="flex items-center gap-2">
                                <span className="badge badge-info text-xs">
                                    Context Active
                                </span>
                            </div>
                        )}
                    </div>

                    {/* Messages Area */}
                    <div
                        ref={messagesContainerRef}
                        onScroll={handleScroll}
                        className="flex-1 overflow-y-auto p-6 space-y-4 relative"
                    >
                        {messages.length === 0 ? (
                            <WelcomeMessage onExampleClick={handleExampleClick} />
                        ) : (
                            <>
                                <AnimatePresence>
                                    {messages.map((message) => (
                                        <MessageBubble
                                            key={message.id}
                                            id={message.id}
                                            role={message.role}
                                            content={message.content}
                                            timestamp={message.timestamp}
                                            isError={message.isError}
                                            isEdited={message.isEdited}
                                            editedAt={message.editedAt}
                                            onEdit={handleEditMessage}
                                            isLoading={isLoading}
                                        />
                                    ))}
                                </AnimatePresence>

                                {isLoading && <TypingIndicator />}

                                <div ref={messagesEndRef} />
                            </>
                        )}

                        {/* Scroll to bottom button */}
                        <AnimatePresence>
                            {showScrollButton && (
                                <motion.button
                                    initial={{ opacity: 0, scale: 0.8 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0, scale: 0.8 }}
                                    onClick={scrollToBottom}
                                    className="fixed bottom-32 right-12 p-3 rounded-full bg-white/10 border border-white/20 hover:bg-white/20 transition-all shadow-lg"
                                >
                                    <ArrowDown size={20} className="text-white" />
                                </motion.button>
                            )}
                        </AnimatePresence>
                    </div>

                    {/* Error Banner */}
                    <AnimatePresence>
                        {error && (
                            <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                exit={{ opacity: 0, height: 0 }}
                                className="px-6 py-3 bg-rose-500/10 border-t border-rose-500/20"
                            >
                                <div className="flex items-center justify-between">
                                    <p className="text-sm text-rose-400">{error}</p>
                                    <button
                                        onClick={() => dispatch(clearError())}
                                        className="text-rose-400 hover:text-rose-300 text-sm"
                                    >
                                        Dismiss
                                    </button>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Input Area */}
                    <div className="p-4 border-t border-white/[0.06]">
                        <form onSubmit={handleSubmit} className="flex gap-3">
                            <div className="flex-1 relative">
                                <textarea
                                    value={input}
                                    onChange={(e) => setInput(e.target.value)}
                                    onKeyDown={handleKeyDown}
                                    placeholder="Ask about permits, market trends, CBSAs..."
                                    rows={1}
                                    className="input-field w-full resize-none pr-12"
                                    disabled={isLoading}
                                />
                            </div>
                            <button
                                type="submit"
                                disabled={!input.trim() || isLoading}
                                className={clsx(
                                    'p-3 rounded-xl transition-all',
                                    input.trim() && !isLoading
                                        ? 'bg-gradient-to-br from-cyan-500 to-purple-600 hover:shadow-lg hover:shadow-cyan-500/25'
                                        : 'bg-white/10 opacity-50 cursor-not-allowed'
                                )}
                            >
                                {isLoading ? (
                                    <Loader2 size={20} className="text-white animate-spin" />
                                ) : (
                                    <Send size={20} className="text-white" />
                                )}
                            </button>
                        </form>
                        <p className="text-xs text-gray-500 mt-2 text-center">
                            Press Enter to send, Shift+Enter for new line
                        </p>
                    </div>
                </div>
            </div>

            {/* Delete Confirmation Modal */}
            <AnimatePresence>
                {deleteTarget && (
                    <ConfirmDeleteModal
                        sessionTitle={deleteTarget.title}
                        onConfirm={handleConfirmDelete}
                        onCancel={handleCancelDelete}
                    />
                )}
            </AnimatePresence>
        </div>
    );
}
