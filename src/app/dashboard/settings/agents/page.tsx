'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Bot,
    Save,
    CheckCircle2,
    AlertCircle,
    ChevronDown,
    Cpu,
    Thermometer,
    Zap,
    RefreshCw,
    Globe,
    KeyRound,
    Sparkles,
    Activity,
} from 'lucide-react';
import { apiService } from '@/services/api';
import PromptEditorModal from '@/components/settings/PromptEditorModal';
import ObservabilityModal, { relativeTime, formatTokens } from '@/components/settings/ObservabilityModal';

interface AgentStats {
    run_count: number;
    total_tokens: number;
    avg_latency_ms: number | null;
    success_rate: number | null;
    last_run: {
        created_at: string | null;
        success: boolean;
    } | null;
}

interface AgentConfig {
    id: string;
    agent_id: string;
    display_name: string;
    description: string | null;
    llm_model: string;
    temperature: number;
    max_tokens: number | null;
    has_api_key: boolean;
    api_key_validation_status: string | null;
    api_key_validated_at: string | null;
    api_key_validation_error_code: string | null;
    research_feeds_estimator: boolean;
    is_active: boolean;
    created_at: string | null;
    updated_at: string | null;
    // Client-only, write-only edit field -- never populated from the GET
    // response (the server never echoes a key back), only ever present in
    // editState while the user is actively typing a new key to save.
    api_key?: string;
}

interface AvailableModel {
    id: string;
    name: string;
    category: string;
}

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

const RESEARCH_AGENT_ID = 'project_research_agent';

// Presentational grouping only (no server-side concept of this) -- mirrors
// how the agents actually collaborate, e.g. every agent in the cold-email
// pipeline together, so changing one piece of that workflow doesn't mean
// hunting through an alphabetical list. Order within a group follows the
// pipeline's own data flow where one exists (estimator -> fallbacks ->
// research -> writer -> judge).
const AGENT_GROUPS: { label: string; description: string; agentIds: string[] }[] = [
    {
        label: 'Cold Email Generation',
        description: 'Turns a permit into a role-tailored outreach email -- powers both manual outreach and bulk campaigns',
        agentIds: [
            'email_permit_analysis_agent',
            'email_permit_analysis_fallback_agent',
            'email_permit_analysis_context_fallback_agent',
            RESEARCH_AGENT_ID,
            'email_generation_agent',
            'email_review_agent',
        ],
    },
    {
        label: 'Reply Handling',
        description: 'Classifies incoming replies to drive the do-not-contact gate',
        agentIds: ['reply_analysis_agent'],
    },
    {
        label: 'Permit Intelligence',
        description: 'Lead scoring and cost estimation from raw permit data',
        agentIds: ['permit_analysis_agent', 'cost_estimation_agent'],
    },
    {
        label: 'Platform & Insights',
        description: 'Chat, retainer pitches, and deliverability recommendations',
        agentIds: ['db_agent', 'retainer_card_agent', 'health_recommendations_agent'],
    },
];

export default function AgentSettingsPage() {
    const [agents, setAgents] = useState<AgentConfig[]>([]);
    const [models, setModels] = useState<AvailableModel[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [saveStatus, setSaveStatus] = useState<Record<string, SaveStatus>>({});
    const [editState, setEditState] = useState<Record<string, Partial<AgentConfig>>>({});

    const loadData = useCallback(async () => {
        try {
            const [agentsData, modelsData] = await Promise.all([
                apiService.getAgents(),
                apiService.getAvailableModels(),
            ]);
            setAgents(agentsData);
            setModels(modelsData);
        } catch (err) {
            console.error('Failed to load agent data:', err);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        loadData();
    }, [loadData]);

    const handleFieldChange = (agentId: string, field: string, value: string | number | boolean | null) => {
        setEditState(prev => ({
            ...prev,
            [agentId]: {
                ...(prev[agentId] || {}),
                [field]: value,
            },
        }));
    };

    const hasChanges = (agentId: string) => {
        const edit = editState[agentId];
        if (!edit) return false;
        const agent = agents.find(a => a.agent_id === agentId);
        if (!agent) return false;
        return Object.entries(edit).some(([key, val]) => {
            const agentVal = agent[key as keyof AgentConfig];
            return val !== agentVal;
        });
    };

    const handleSave = async (agentId: string) => {
        const edit = editState[agentId];
        if (!edit) return;

        setSaveStatus(prev => ({ ...prev, [agentId]: 'saving' }));

        try {
            const updates: Record<string, unknown> = {};
            if (edit.llm_model !== undefined) updates.llm_model = edit.llm_model;
            if (edit.temperature !== undefined) updates.temperature = edit.temperature;
            if (edit.max_tokens !== undefined) updates.max_tokens = edit.max_tokens;
            if (edit.is_active !== undefined) updates.is_active = edit.is_active;
            if (edit.research_feeds_estimator !== undefined) updates.research_feeds_estimator = edit.research_feeds_estimator;
            // Only forward when the user actually typed something -- a
            // masked field can't distinguish "untouched" from "cleared,"
            // so there's no "clear key" affordance in this UI yet (the
            // backend supports an explicit empty-string clear directly via
            // the API if that's ever needed).
            if (edit.api_key) updates.api_key = edit.api_key;

            await apiService.updateAgentConfig(agentId, updates);
            setSaveStatus(prev => ({ ...prev, [agentId]: 'saved' }));
            setEditState(prev => {
                const next = { ...prev };
                delete next[agentId];
                return next;
            });
            await loadData();

            setTimeout(() => {
                setSaveStatus(prev => ({ ...prev, [agentId]: 'idle' }));
            }, 3000);
        } catch {
            setSaveStatus(prev => ({ ...prev, [agentId]: 'error' }));
        }
    };

    const getEffectiveValue = (agent: AgentConfig, field: keyof AgentConfig) => {
        const edit = editState[agent.agent_id];
        if (edit && field in edit) return edit[field as keyof typeof edit];
        return agent[field];
    };

    // Group models by category
    const modelsByCategory = models.reduce<Record<string, AvailableModel[]>>((acc, m) => {
        (acc[m.category] = acc[m.category] || []).push(m);
        return acc;
    }, {});

    if (isLoading) {
        return (
            <div className="p-6 lg:p-8">
                <div className="flex items-center justify-center min-h-[60vh]">
                    <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
                        className="w-10 h-10 border-2 border-cyan-500/20 border-t-cyan-500 rounded-full"
                    />
                </div>
            </div>
        );
    }

    const groupedSections = AGENT_GROUPS.map(group => ({
        ...group,
        agents: group.agentIds
            .map(id => agents.find(a => a.agent_id === id))
            .filter((a): a is AgentConfig => Boolean(a)),
    })).filter(section => section.agents.length > 0);

    const groupedIds = new Set(AGENT_GROUPS.flatMap(g => g.agentIds));
    const otherAgents = agents.filter(a => !groupedIds.has(a.agent_id));
    if (otherAgents.length > 0) {
        groupedSections.push({ label: 'Other', description: 'Not yet assigned to a workflow group', agentIds: [], agents: otherAgents });
    }

    let cardIndex = 0;

    return (
        <div className="p-6 lg:p-8">
            {/* Header */}
            <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-8"
            >
                <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 rounded-xl bg-gradient-to-br from-cyan-500/20 to-purple-500/20">
                        <Bot className="w-6 h-6 text-cyan-400" />
                    </div>
                    <div>
                        <h1 className="text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white">Agent Settings</h1>
                        <p className="text-gray-500 dark:text-gray-400">Configure LLM models and parameters for each AI agent</p>
                    </div>
                </div>
            </motion.div>

            {/* Grouped Agent Cards */}
            <div className="space-y-10">
                {groupedSections.map(section => (
                    <div key={section.label}>
                        <div className="mb-4">
                            <h2 className="text-xs font-semibold uppercase tracking-widest text-gray-500">{section.label}</h2>
                            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{section.description}</p>
                        </div>
                        <div className="space-y-6">
                            {section.agents.map(agent => {
                                const index = cardIndex++;
                                return (
                                    <AgentCard
                                        key={agent.agent_id}
                                        agent={agent}
                                        index={index}
                                        status={saveStatus[agent.agent_id] || 'idle'}
                                        changed={hasChanges(agent.agent_id)}
                                        editState={editState}
                                        modelsByCategory={modelsByCategory}
                                        getEffectiveValue={getEffectiveValue}
                                        handleFieldChange={handleFieldChange}
                                        handleSave={handleSave}
                                    />
                                );
                            })}
                        </div>
                    </div>
                ))}
            </div>

            {agents.length === 0 && (
                <div className="text-center py-20 text-gray-500">
                    <Bot size={48} className="mx-auto mb-4 opacity-30" />
                    <p>No agents configured yet.</p>
                </div>
            )}
        </div>
    );
}

function AgentCard({
    agent,
    index,
    status,
    changed,
    editState,
    modelsByCategory,
    getEffectiveValue,
    handleFieldChange,
    handleSave,
}: {
    agent: AgentConfig;
    index: number;
    status: SaveStatus;
    changed: boolean;
    editState: Record<string, Partial<AgentConfig>>;
    modelsByCategory: Record<string, AvailableModel[]>;
    getEffectiveValue: (agent: AgentConfig, field: keyof AgentConfig) => AgentConfig[keyof AgentConfig];
    handleFieldChange: (agentId: string, field: string, value: string | number | boolean | null) => void;
    handleSave: (agentId: string) => void;
}) {
    const currentModel = getEffectiveValue(agent, 'llm_model') as string;
    const currentTemp = getEffectiveValue(agent, 'temperature') as number;
    const currentMaxTokens = getEffectiveValue(agent, 'max_tokens') as number | null;
    const currentResearchCollection = getEffectiveValue(agent, 'is_active') as boolean;
    const currentFeedsEstimator = getEffectiveValue(agent, 'research_feeds_estimator') as boolean;
    const showResearchFields = agent.agent_id === RESEARCH_AGENT_ID;
    const [promptEditorOpen, setPromptEditorOpen] = useState(false);
    const [observabilityOpen, setObservabilityOpen] = useState(false);
    const [stats, setStats] = useState<AgentStats | null>(null);
    const [testStatus, setTestStatus] = useState<'idle' | 'testing' | 'valid' | 'invalid'>('idle');
    const [testError, setTestError] = useState<string | null>(null);

    const handleTestConnection = async () => {
        setTestStatus('testing');
        setTestError(null);
        try {
            const result = await apiService.testAgentConnection(agent.agent_id);
            setTestStatus(result.status === 'valid' ? 'valid' : 'invalid');
            setTestError(result.error_code);
        } catch {
            setTestStatus('invalid');
            setTestError('request_failed');
        }
    };

    useEffect(() => {
        let cancelled = false;
        apiService.getAgentStats(agent.agent_id)
            .then(data => { if (!cancelled) setStats(data); })
            .catch(() => { if (!cancelled) setStats(null); });
        return () => { cancelled = true; };
    }, [agent.agent_id]);

    return (
        <>
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: Math.min(index, 8) * 0.06 }}
            className="rounded-2xl border border-gray-200 dark:border-white/8 bg-black/2 dark:bg-white/2 overflow-hidden"
        >
            {/* Agent Header */}
            <div className="px-6 py-4 border-b border-gray-200 dark:border-white/6 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-purple-600 flex items-center justify-center">
                        <Cpu size={20} className="text-white" />
                    </div>
                    <div>
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{agent.display_name}</h3>
                        <p className="text-sm text-gray-500">{agent.description || agent.agent_id}</p>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    {/* Status */}
                    <AnimatePresence mode="wait">
                        {status === 'saved' && (
                            <motion.div
                                initial={{ opacity: 0, scale: 0.8 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0 }}
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 text-sm"
                            >
                                <CheckCircle2 size={14} />
                                Saved
                            </motion.div>
                        )}
                        {status === 'error' && (
                            <motion.div
                                initial={{ opacity: 0, scale: 0.8 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0 }}
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-500/10 text-red-400 text-sm"
                            >
                                <AlertCircle size={14} />
                                Error
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Prompt Editor */}
                    <button
                        onClick={() => setPromptEditorOpen(true)}
                        className="px-4 py-2 rounded-xl text-sm font-semibold flex items-center gap-2 transition-all bg-black/4 dark:bg-white/4 hover:bg-black/8 dark:hover:bg-white/8 border border-gray-200 dark:border-white/6 text-gray-600 dark:text-gray-300"
                    >
                        <Sparkles size={14} className="text-purple-400" />
                        Edit Prompt
                    </button>

                    {/* Save Button */}
                    <button
                        onClick={() => handleSave(agent.agent_id)}
                        disabled={!changed || status === 'saving'}
                        className={`px-4 py-2 rounded-xl text-sm font-semibold flex items-center gap-2 transition-all ${changed
                            ? 'bg-gradient-to-r from-cyan-500 to-purple-600 hover:from-cyan-400 hover:to-purple-500 text-white shadow-lg shadow-cyan-500/20'
                            : 'bg-black/4 dark:bg-white/4 text-gray-500 cursor-not-allowed border border-gray-200 dark:border-white/6'
                            }`}
                    >
                        {status === 'saving' ? (
                            <RefreshCw size={14} className="animate-spin" />
                        ) : (
                            <Save size={14} />
                        )}
                        {status === 'saving' ? 'Saving...' : 'Save'}
                    </button>
                </div>
            </div>

            {/* Observability strip -- run count / tokens / latency / last-run status at a glance, full detail behind "View Runs" */}
            <div className="px-6 py-2.5 border-b border-gray-200 dark:border-white/6 flex items-center justify-between">
                {stats && stats.run_count > 0 ? (
                    <div className="flex items-center gap-4 text-xs font-mono tabular-nums text-gray-500 dark:text-gray-400">
                        <span className="flex items-center gap-1.5"><Activity size={12} className="text-cyan-400" />{stats.run_count} runs</span>
                        <span className="flex items-center gap-1.5"><Zap size={12} className="text-yellow-400" />{formatTokens(stats.total_tokens)} tokens</span>
                        {stats.avg_latency_ms != null && (
                            <span className="flex items-center gap-1.5">{Math.round(stats.avg_latency_ms)}ms avg</span>
                        )}
                        {stats.last_run && (
                            <span className={`flex items-center gap-1.5 ${stats.last_run.success ? 'text-emerald-400' : 'text-red-400'}`}>
                                {stats.last_run.success ? <CheckCircle2 size={12} /> : <AlertCircle size={12} />}
                                last run {relativeTime(stats.last_run.created_at)}
                            </span>
                        )}
                    </div>
                ) : (
                    <span className="text-xs text-gray-500">No runs recorded yet</span>
                )}
                <button
                    onClick={() => setObservabilityOpen(true)}
                    className="text-xs font-medium text-cyan-500 dark:text-cyan-400 hover:text-cyan-400 dark:hover:text-cyan-300 transition-colors flex items-center gap-1"
                >
                    <Activity size={12} />
                    View Runs
                </button>
            </div>

            {/* Agent Config Fields */}
            <div className="px-6 py-5 grid grid-cols-1 md:grid-cols-4 gap-6">
                {/* Model Selector */}
                <div className="space-y-2">
                    <label className="flex items-center gap-2 text-sm font-medium text-gray-600 dark:text-gray-300">
                        <Cpu size={14} className="text-cyan-400" />
                        LLM Model
                    </label>
                    <div className="relative">
                        <select
                            value={currentModel}
                            onChange={(e) => handleFieldChange(agent.agent_id, 'llm_model', e.target.value)}
                            className="has-custom-chevron w-full pl-4 pr-10 py-2.5 rounded-xl bg-black/4 dark:bg-white/4 border border-gray-200 dark:border-white/8 text-gray-700 dark:text-gray-200 text-sm cursor-pointer hover:border-cyan-500/30 focus:border-cyan-500/50 focus:outline-none transition-colors"
                        >
                            {Object.entries(modelsByCategory).map(([category, categoryModels]) => (
                                <optgroup key={category} label={category}>
                                    {categoryModels.map(m => (
                                        <option key={m.id} value={m.id}>
                                            {m.name}
                                        </option>
                                    ))}
                                </optgroup>
                            ))}
                        </select>
                        <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
                    </div>
                    <p className="text-xs text-gray-600 font-mono truncate">{currentModel}</p>
                </div>

                {/* Temperature */}
                <div className="space-y-2">
                    <label className="flex items-center gap-2 text-sm font-medium text-gray-600 dark:text-gray-300">
                        <Thermometer size={14} className="text-orange-400" />
                        Temperature
                        <span className="ml-auto text-cyan-400 font-mono">{currentTemp.toFixed(1)}</span>
                    </label>
                    <input
                        type="range"
                        min="0"
                        max="2"
                        step="0.1"
                        value={currentTemp}
                        onChange={(e) => handleFieldChange(agent.agent_id, 'temperature', parseFloat(e.target.value))}
                        className="w-full h-2 rounded-lg appearance-none cursor-pointer bg-black/8 dark:bg-white/8 accent-cyan-500"
                    />
                    <div className="flex justify-between text-xs text-gray-600">
                        <span>Precise (0)</span>
                        <span>Creative (2)</span>
                    </div>
                </div>

                {/* Max Tokens */}
                <div className="space-y-2">
                    <label className="flex items-center gap-2 text-sm font-medium text-gray-600 dark:text-gray-300">
                        <Zap size={14} className="text-yellow-400" />
                        Max Tokens
                    </label>
                    <input
                        type="number"
                        placeholder="Unlimited"
                        value={currentMaxTokens ?? ''}
                        onChange={(e) => {
                            const val = e.target.value ? parseInt(e.target.value, 10) : null;
                            handleFieldChange(agent.agent_id, 'max_tokens', val);
                        }}
                        className="w-full px-4 py-2.5 rounded-xl bg-black/4 dark:bg-white/4 border border-gray-200 dark:border-white/8 text-gray-700 dark:text-gray-200 text-sm placeholder-gray-600 hover:border-cyan-500/30 focus:border-cyan-500/50 focus:outline-none transition-colors"
                    />
                    <p className="text-xs text-gray-600">Leave empty for model default</p>
                </div>

                {/* Research Collection — whether the Project Research Agent may
                    run Serper searches and cache facts at all. Renamed from a
                    generic "active" toggle since that's the honest name for
                    what is_active gates on this specific agent's row. */}
                {showResearchFields && (
                    <div className="space-y-2">
                        <label className="flex items-center gap-2 text-sm font-medium text-gray-600 dark:text-gray-300">
                            <Globe size={14} className="text-emerald-400" />
                            Research Collection
                        </label>
                        <div className="flex rounded-xl border border-gray-200 dark:border-white/8 overflow-hidden text-sm">
                            <button
                                type="button"
                                onClick={() => handleFieldChange(agent.agent_id, 'is_active', false)}
                                className={`flex-1 px-3 py-2 transition-colors ${!currentResearchCollection
                                    ? 'bg-gray-500/15 text-gray-300 font-medium'
                                    : 'bg-black/4 dark:bg-white/4 text-gray-500 hover:bg-black/8 dark:hover:bg-white/8'
                                    }`}
                            >
                                Off
                            </button>
                            <button
                                type="button"
                                onClick={() => handleFieldChange(agent.agent_id, 'is_active', true)}
                                className={`flex-1 px-3 py-2 transition-colors ${currentResearchCollection
                                    ? 'bg-emerald-500/10 text-emerald-400 font-medium'
                                    : 'bg-black/4 dark:bg-white/4 text-gray-500 hover:bg-black/8 dark:hover:bg-white/8'
                                    }`}
                            >
                                Serper
                            </button>
                        </div>
                        <p className="text-xs text-gray-600">Whether this agent may run Serper searches and cache facts at all</p>
                    </div>
                )}

                {/* Use Research in Email Generation — the consumption gate.
                    Whether resolved research facts may ever reach the
                    estimator for a generation request. The per-generation
                    checkbox in Generate Emails can only narrow this further,
                    never widen it. Writable now that the Evidence Resolver
                    (app/policies/research_evidence_resolver.py) exists to
                    enforce permit-vs-research conflicts deterministically. */}
                {showResearchFields && (
                    <div className="space-y-2">
                        <label className="flex items-center gap-2 text-sm font-medium text-gray-600 dark:text-gray-300">
                            <Zap size={14} className="text-gray-500" />
                            Use Research in Email Generation
                        </label>
                        <button
                            type="button"
                            role="switch"
                            aria-checked={currentFeedsEstimator}
                            onClick={() => handleFieldChange(agent.agent_id, 'research_feeds_estimator', !currentFeedsEstimator)}
                            className={`w-full flex items-center justify-between px-4 py-2.5 rounded-xl border text-sm transition-colors focus-visible:ring-2 focus-visible:ring-cyan-500 ${currentFeedsEstimator
                                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                                : 'bg-black/4 dark:bg-white/4 border-gray-200 dark:border-white/8 text-gray-500'
                                }`}
                        >
                            <span>{currentFeedsEstimator ? 'On' : 'Off'}</span>
                            <span
                                className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${currentFeedsEstimator ? 'bg-emerald-500' : 'bg-gray-400 dark:bg-white/15'
                                    }`}
                            >
                                <span
                                    className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${currentFeedsEstimator ? 'translate-x-4.5' : 'translate-x-1'
                                        }`}
                                />
                            </span>
                        </button>
                        <p className="text-xs text-gray-600">
                            Master switch for whether collected facts are ever used in a generated email — the per-generation checkbox in Generate Emails can only narrow this, never widen it
                        </p>
                    </div>
                )}

                {/* Serper API Key — only on the Project Research Agent */}
                {showResearchFields && (
                    <div className="space-y-2">
                        <label className="flex items-center gap-2 text-sm font-medium text-gray-600 dark:text-gray-300">
                            <KeyRound size={14} className="text-purple-400" />
                            Serper API Key
                        </label>
                        <input
                            type="password"
                            autoComplete="new-password"
                            name="serper-api-key"
                            placeholder={agent.has_api_key ? '•••••••• (configured — leave blank to keep)' : 'Not configured'}
                            value={editState[agent.agent_id]?.api_key ?? ''}
                            onChange={(e) => handleFieldChange(agent.agent_id, 'api_key', e.target.value)}
                            className="w-full px-4 py-2.5 rounded-xl bg-black/4 dark:bg-white/4 border border-gray-200 dark:border-white/8 text-gray-700 dark:text-gray-200 text-sm placeholder-gray-600 hover:border-cyan-500/30 focus:border-cyan-500/50 focus:outline-none transition-colors"
                        />
                        <div className="flex items-center gap-2">
                            <button
                                type="button"
                                onClick={handleTestConnection}
                                disabled={!agent.has_api_key || testStatus === 'testing'}
                                className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-black/4 dark:bg-white/4 hover:bg-black/8 dark:hover:bg-white/8 border border-gray-200 dark:border-white/6 text-gray-600 dark:text-gray-300 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                            >
                                {testStatus === 'testing' ? 'Testing…' : 'Test Connection'}
                            </button>
                            {testStatus === 'valid' && (
                                <span className="text-xs text-emerald-400 flex items-center gap-1"><CheckCircle2 size={12} /> Valid</span>
                            )}
                            {testStatus === 'invalid' && (
                                <span className="text-xs text-red-400 flex items-center gap-1"><AlertCircle size={12} /> {testError || 'Invalid'}</span>
                            )}
                        </div>
                        <p className="text-xs text-gray-600">
                            {agent.api_key_validation_status === 'valid'
                                ? `Verified working${agent.api_key_validated_at ? ` (${relativeTime(agent.api_key_validated_at)})` : ''}`
                                : agent.api_key_validation_status === 'invalid'
                                    ? `Last check failed: ${agent.api_key_validation_error_code || 'unknown error'}`
                                    : agent.has_api_key
                                        ? 'Configured — not yet tested'
                                        : 'Not set — research stays inert until a key is entered'}
                        </p>
                    </div>
                )}
            </div>
        </motion.div>

        <AnimatePresence>
            {promptEditorOpen && (
                <PromptEditorModal
                    agentId={agent.agent_id}
                    displayName={agent.display_name}
                    onClose={() => setPromptEditorOpen(false)}
                />
            )}
        </AnimatePresence>

        <AnimatePresence>
            {observabilityOpen && (
                <ObservabilityModal
                    agentId={agent.agent_id}
                    displayName={agent.display_name}
                    onClose={() => setObservabilityOpen(false)}
                />
            )}
        </AnimatePresence>
        </>
    );
}
