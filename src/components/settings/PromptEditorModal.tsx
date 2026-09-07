'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    X,
    Save,
    RotateCcw,
    Clock,
    CheckCircle2,
    AlertCircle,
    ChevronDown,
    ChevronUp,
    FileText,
    Sparkles,
    Copy,
    Check,
} from 'lucide-react';
import { apiService } from '@/services/api';

interface PromptVersion {
    id: string;
    name: string;
    version: number;
    content: string;
    is_active: boolean;
    created_by: string | null;
    created_at: string;
}

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

interface PromptEditorModalProps {
    agentId: string;
    displayName: string;
    onClose: () => void;
}

// Same {agent_id}_system convention already used by the backend
// (AgentPromptService) and by the removed standalone /dashboard/prompt page.
const getPromptName = (agentId: string) => (agentId.endsWith('_system') ? agentId : `${agentId}_system`);

export default function PromptEditorModal({ agentId, displayName, onClose }: PromptEditorModalProps) {
    const promptName = getPromptName(agentId);

    const [promptContent, setPromptContent] = useState('');
    const [originalContent, setOriginalContent] = useState('');
    const [currentVersion, setCurrentVersion] = useState<PromptVersion | null>(null);
    const [history, setHistory] = useState<PromptVersion[]>([]);
    const [showHistory, setShowHistory] = useState(false);
    const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');
    const [statusMessage, setStatusMessage] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [copied, setCopied] = useState(false);

    const hasChanges = promptContent !== originalContent;

    const loadHistory = useCallback(async () => {
        try {
            const result = await apiService.getPromptHistory(promptName);
            setHistory(result.prompts);
        } catch {
            setHistory([]);
        }
    }, [promptName]);

    useEffect(() => {
        let cancelled = false;
        async function load() {
            setIsLoading(true);
            try {
                const prompt = await apiService.getActivePrompt(promptName);
                if (cancelled) return;
                setPromptContent(prompt.content);
                setOriginalContent(prompt.content);
                setCurrentVersion(prompt);
            } catch {
                if (cancelled) return;
                setPromptContent('');
                setOriginalContent('');
                setCurrentVersion(null);
            } finally {
                if (!cancelled) setIsLoading(false);
            }
        }
        load();
        loadHistory();
        return () => {
            cancelled = true;
        };
    }, [promptName, loadHistory]);

    const requestClose = () => {
        if (hasChanges && !window.confirm('You have unsaved changes. Close without saving?')) return;
        onClose();
    };

    useEffect(() => {
        const onKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') requestClose();
        };
        window.addEventListener('keydown', onKeyDown);
        return () => window.removeEventListener('keydown', onKeyDown);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [hasChanges]);

    const handleSave = async () => {
        if (!promptContent.trim() || promptContent.length < 50) {
            setSaveStatus('error');
            setStatusMessage('Prompt must be at least 50 characters.');
            return;
        }

        setSaveStatus('saving');
        setStatusMessage('Saving...');

        try {
            const result = await apiService.createPrompt(promptContent, 'dashboard-user', promptName);
            setCurrentVersion(result);
            setOriginalContent(promptContent);
            setSaveStatus('saved');
            setStatusMessage(`Saved as v${result.version}`);
            await loadHistory();

            setTimeout(() => {
                setSaveStatus('idle');
                setStatusMessage('');
            }, 3000);
        } catch {
            setSaveStatus('error');
            setStatusMessage('Failed to save prompt');
        }
    };

    const handleRevert = async (version: PromptVersion) => {
        try {
            await apiService.activatePrompt(version.id);
            setPromptContent(version.content);
            setOriginalContent(version.content);
            setCurrentVersion({ ...version, is_active: true });
            setSaveStatus('saved');
            setStatusMessage(`Reverted to v${version.version}`);
            await loadHistory();

            setTimeout(() => {
                setSaveStatus('idle');
                setStatusMessage('');
            }, 3000);
        } catch {
            setSaveStatus('error');
            setStatusMessage('Failed to revert');
        }
    };

    const handleDiscard = () => setPromptContent(originalContent);

    const handleCopy = async () => {
        await navigator.clipboard.writeText(promptContent);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const formatDate = (dateStr: string) => {
        const d = new Date(dateStr);
        return d.toLocaleDateString('en-US', {
            month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit',
        });
    };

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
            onClick={requestClose}
        >
            <motion.div
                initial={{ opacity: 0, scale: 0.97, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.97, y: 10 }}
                transition={{ type: 'spring', stiffness: 400, damping: 35 }}
                onClick={(e) => e.stopPropagation()}
                className="w-full max-w-5xl h-[88vh] rounded-2xl border border-gray-200 dark:border-white/8 bg-[var(--bg-primary)] shadow-2xl flex flex-col overflow-hidden"
            >
                {/* Header */}
                <div className="shrink-0 border-b border-gray-200 dark:border-white/6 px-6 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-cyan-500 flex items-center justify-center">
                            <Sparkles size={20} className="text-white" />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-gray-900 dark:text-white">System Prompt</h2>
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                                <span className="text-cyan-400">{displayName}</span>
                                {currentVersion && <span className="ml-2 text-gray-500">· v{currentVersion.version}</span>}
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        <AnimatePresence mode="wait">
                            {statusMessage && (
                                <motion.div
                                    initial={{ opacity: 0, x: 10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: 10 }}
                                    className={`flex items-center gap-2 text-sm px-3 py-1.5 rounded-lg ${saveStatus === 'saved'
                                        ? 'bg-emerald-500/10 text-emerald-400'
                                        : saveStatus === 'error'
                                            ? 'bg-red-500/10 text-red-400'
                                            : 'bg-cyan-500/10 text-cyan-400'
                                        }`}
                                >
                                    {saveStatus === 'saved' && <CheckCircle2 size={14} />}
                                    {saveStatus === 'error' && <AlertCircle size={14} />}
                                    {statusMessage}
                                </motion.div>
                            )}
                        </AnimatePresence>

                        <button
                            onClick={handleCopy}
                            className="p-2.5 rounded-xl bg-gray-100 dark:bg-white/4 hover:bg-gray-200 dark:hover:bg-white/8 border border-gray-200 dark:border-white/6 transition-all"
                            title="Copy prompt"
                        >
                            {copied ? <Check size={16} className="text-emerald-400" /> : <Copy size={16} />}
                        </button>

                        {hasChanges && (
                            <motion.button
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                onClick={handleDiscard}
                                className="px-4 py-2.5 rounded-xl bg-gray-100 dark:bg-white/4 hover:bg-gray-200 dark:hover:bg-white/8 border border-gray-200 dark:border-white/6 text-gray-600 dark:text-gray-300 text-sm font-medium transition-all flex items-center gap-2"
                            >
                                <RotateCcw size={14} />
                                Discard
                            </motion.button>
                        )}

                        <button
                            onClick={handleSave}
                            disabled={!hasChanges || saveStatus === 'saving'}
                            className={`px-5 py-2.5 rounded-xl text-sm font-semibold flex items-center gap-2 transition-all ${hasChanges
                                ? 'bg-gradient-to-r from-cyan-500 to-purple-600 hover:from-cyan-400 hover:to-purple-500 text-white shadow-lg shadow-cyan-500/20'
                                : 'bg-gray-100 dark:bg-white/4 text-gray-500 cursor-not-allowed border border-gray-200 dark:border-white/6'
                                }`}
                        >
                            <Save size={14} />
                            {saveStatus === 'saving' ? 'Saving...' : 'Save & Activate'}
                        </button>

                        <button
                            onClick={requestClose}
                            className="p-2.5 rounded-xl bg-gray-100 dark:bg-white/4 hover:bg-gray-200 dark:hover:bg-white/8 border border-gray-200 dark:border-white/6 transition-all"
                            title="Close"
                            aria-label="Close prompt editor"
                        >
                            <X size={16} />
                        </button>
                    </div>
                </div>

                {/* Body */}
                <div className="flex-1 min-h-0 px-6 py-5 grid grid-cols-1 lg:grid-cols-[1fr,320px] gap-6 overflow-hidden">
                    {/* Editor */}
                    <div className="flex flex-col min-h-0 space-y-3">
                        <div className="shrink-0 flex items-center justify-between text-sm text-gray-500 dark:text-gray-400">
                            <span className="flex items-center gap-2">
                                <FileText size={14} />
                                System Prompt
                                {hasChanges && <span className="inline-block w-2 h-2 rounded-full bg-amber-400 animate-pulse" />}
                            </span>
                            <span>{promptContent.length.toLocaleString()} characters</span>
                        </div>

                        {isLoading ? (
                            <div className="relative rounded-2xl overflow-hidden border border-gray-200 dark:border-white/6 bg-black/2 dark:bg-white/2 flex-1 flex items-center justify-center">
                                <motion.div
                                    animate={{ rotate: 360 }}
                                    transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
                                    className="w-8 h-8 border-2 border-cyan-500/20 border-t-cyan-500 rounded-full"
                                />
                            </div>
                        ) : (
                            <div className="relative rounded-2xl overflow-hidden border border-gray-200 dark:border-white/6 bg-black/2 dark:bg-white/2 focus-within:border-cyan-500/30 transition-colors flex-1">
                                <textarea
                                    value={promptContent}
                                    onChange={(e) => setPromptContent(e.target.value)}
                                    className="w-full h-full p-6 bg-transparent text-gray-700 dark:text-gray-200 font-mono text-sm leading-relaxed resize-none focus:outline-none placeholder-gray-400 dark:placeholder-gray-600"
                                    placeholder={`Enter the system prompt for ${displayName}...\n\nMinimum 50 characters required.`}
                                    spellCheck={false}
                                    autoFocus
                                />
                            </div>
                        )}
                    </div>

                    {/* History sidebar */}
                    <div className="flex flex-col min-h-0 space-y-3 overflow-hidden">
                        <button
                            onClick={() => setShowHistory(!showHistory)}
                            className="shrink-0 w-full flex items-center justify-between text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors px-1"
                        >
                            <span className="flex items-center gap-2">
                                <Clock size={14} />
                                Version History ({history.length})
                            </span>
                            {showHistory ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                        </button>

                        <AnimatePresence>
                            {showHistory && (
                                <motion.div
                                    initial={{ height: 0, opacity: 0 }}
                                    animate={{ height: 'auto', opacity: 1 }}
                                    exit={{ height: 0, opacity: 0 }}
                                    transition={{ duration: 0.2 }}
                                    className="overflow-hidden min-h-0"
                                >
                                    <div className="space-y-2 max-h-[40vh] overflow-y-auto hide-scrollbar">
                                        {history.length === 0 ? (
                                            <div className="rounded-xl border border-gray-200 dark:border-white/6 bg-black/2 dark:bg-white/2 p-4 text-center text-gray-500 text-sm">
                                                No versions yet. Save your first prompt to start tracking history.
                                            </div>
                                        ) : (
                                            history.map((version) => (
                                                <motion.div
                                                    key={version.id}
                                                    initial={{ opacity: 0, y: 5 }}
                                                    animate={{ opacity: 1, y: 0 }}
                                                    className={`rounded-xl border p-4 transition-all cursor-pointer group ${version.is_active
                                                        ? 'border-cyan-500/30 bg-cyan-500/[0.04]'
                                                        : 'border-gray-200 dark:border-white/6 bg-black/2 dark:bg-white/2 hover:border-gray-300 dark:hover:border-white/12 hover:bg-black/4 dark:hover:bg-white/4'
                                                        }`}
                                                >
                                                    <div className="flex items-center justify-between mb-2">
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-sm font-semibold text-gray-900 dark:text-white">
                                                                v{version.version}
                                                            </span>
                                                            {version.is_active && (
                                                                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-cyan-500/20 text-cyan-400 uppercase tracking-wider">
                                                                    Active
                                                                </span>
                                                            )}
                                                        </div>
                                                        {!version.is_active && (
                                                            <button
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    handleRevert(version);
                                                                }}
                                                                className="text-xs px-2.5 py-1 rounded-lg bg-gray-100 dark:bg-white/6 hover:bg-purple-500/20 hover:text-purple-300 text-gray-500 dark:text-gray-400 opacity-0 group-hover:opacity-100 transition-all font-medium"
                                                            >
                                                                Activate
                                                            </button>
                                                        )}
                                                    </div>
                                                    <div className="text-xs text-gray-500 mb-2">
                                                        {formatDate(version.created_at)}
                                                        {version.created_by && ` · ${version.created_by}`}
                                                    </div>
                                                    <div
                                                        className="text-xs text-gray-500 dark:text-gray-400 line-clamp-3 font-mono leading-relaxed"
                                                        onClick={() => setPromptContent(version.content)}
                                                    >
                                                        {version.content.substring(0, 200)}...
                                                    </div>
                                                </motion.div>
                                            ))
                                        )}
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        <div className="rounded-xl border border-gray-200 dark:border-white/6 bg-black/2 dark:bg-white/2 p-4 space-y-3 overflow-y-auto">
                            <h3 className="text-sm font-semibold text-gray-600 dark:text-gray-300 flex items-center gap-2">
                                <Sparkles size={14} className="text-purple-400" />
                                Tips
                            </h3>
                            <ul className="text-xs text-gray-500 space-y-2">
                                <li className="flex gap-2"><span className="text-cyan-400">•</span>Changes take effect immediately after saving</li>
                                <li className="flex gap-2"><span className="text-cyan-400">•</span>Click any version&apos;s text to load it into the editor</li>
                                <li className="flex gap-2"><span className="text-cyan-400">•</span>Use &quot;Activate&quot; to roll back to a previous version</li>
                            </ul>
                        </div>
                    </div>
                </div>
            </motion.div>
        </motion.div>
    );
}
