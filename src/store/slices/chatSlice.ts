import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { apiService } from '@/services/api';
import { logger } from '@/utils/logger';
import {
    ChatMessage,
    ChatState,
    QueryResponse,
    ApiError,
    ConversationSession,
    ConversationHistoryMessage,
} from '@/types';

const initialState: ChatState = {
    messages: [],
    isLoading: false,
    error: null,
    currentSessionId: null,
    sessions: [],
    sessionsLoading: false,
};

// Generate unique ID
const generateId = () => {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
};

// ============================================================================
// Async Thunks
// ============================================================================

// Send query with session support
export const sendQuery = createAsyncThunk<
    QueryResponse,
    { question: string; sessionId?: string },
    { rejectValue: ApiError }
>('chat/sendQuery', async ({ question, sessionId }, { rejectWithValue }) => {
    try {
        logger.info('User submitted query', { question, sessionId }, 'Chat');
        const response = await apiService.sendQuery(question, sessionId);
        return response;
    } catch (error) {
        logger.error('Query failed', error, 'Chat');
        return rejectWithValue(error as ApiError);
    }
});

// Create new session
export const createSession = createAsyncThunk<
    ConversationSession,
    string | undefined,
    { rejectValue: ApiError }
>('chat/createSession', async (userId, { rejectWithValue }) => {
    try {
        logger.info('Creating new session', { userId }, 'Chat');
        const session = await apiService.createSession(userId);
        return session;
    } catch (error) {
        logger.error('Failed to create session', error, 'Chat');
        return rejectWithValue(error as ApiError);
    }
});

// Fetch sessions
export const fetchSessions = createAsyncThunk<
    ConversationSession[],
    { userId?: string; limit?: number } | undefined,
    { rejectValue: ApiError }
>('chat/fetchSessions', async (params, { rejectWithValue }) => {
    try {
        logger.debug('Fetching sessions', params, 'Chat');
        const sessions = await apiService.listSessions(params?.userId, params?.limit);
        return sessions;
    } catch (error) {
        logger.error('Failed to fetch sessions', error, 'Chat');
        return rejectWithValue(error as ApiError);
    }
});

// Load session history
export const loadSessionHistory = createAsyncThunk<
    { sessionId: string; messages: ConversationHistoryMessage[] },
    string,
    { rejectValue: ApiError }
>('chat/loadSessionHistory', async (sessionId, { rejectWithValue }) => {
    try {
        logger.info('Loading session history', { sessionId }, 'Chat');
        const messages = await apiService.getSessionHistory(sessionId);
        return { sessionId, messages };
    } catch (error) {
        logger.error('Failed to load session history', error, 'Chat');
        return rejectWithValue(error as ApiError);
    }
});

// Delete a session
export const deleteSession = createAsyncThunk<
    string,
    string,
    { rejectValue: ApiError }
>('chat/deleteSession', async (sessionId, { rejectWithValue }) => {
    try {
        logger.info('Deleting session', { sessionId }, 'Chat');
        await apiService.deleteSession(sessionId);
        return sessionId;
    } catch (error) {
        logger.error('Failed to delete session', error, 'Chat');
        return rejectWithValue(error as ApiError);
    }
});

// ============================================================================
// Slice
// ============================================================================

const chatSlice = createSlice({
    name: 'chat',
    initialState,
    reducers: {
        addUserMessage: (state, action: PayloadAction<string>) => {
            const message: ChatMessage = {
                id: generateId(),
                role: 'user',
                content: action.payload,
                timestamp: new Date().toISOString(),
            };
            state.messages.push(message);
            logger.debug('User message added', { messageId: message.id }, 'Chat');
        },

        clearChat: (state) => {
            state.messages = [];
            state.error = null;
            state.currentSessionId = null;
            logger.info('Chat cleared', undefined, 'Chat');
        },

        clearError: (state) => {
            state.error = null;
        },

        setCurrentSession: (state, action: PayloadAction<string | null>) => {
            state.currentSessionId = action.payload;
            state.messages = []; // Clear messages when switching sessions
            logger.info('Session switched', { sessionId: action.payload }, 'Chat');
        },

        startNewConversation: (state) => {
            state.currentSessionId = null;
            state.messages = [];
            state.error = null;
            logger.info('Started new conversation', undefined, 'Chat');
        },

        // Edit a user message: update content, mark as edited, truncate all subsequent messages
        editUserMessage: (state, action: PayloadAction<{ messageId: string; newContent: string }>) => {
            const { messageId, newContent } = action.payload;
            const index = state.messages.findIndex(m => m.id === messageId);
            if (index === -1) return;

            // Update the message
            state.messages[index].content = newContent;
            state.messages[index].isEdited = true;
            state.messages[index].editedAt = new Date().toISOString();

            // Truncate all messages after this one
            state.messages = state.messages.slice(0, index + 1);

            logger.info('User message edited', { messageId }, 'Chat');
        },
    },
    extraReducers: (builder) => {
        builder
            // Send Query
            .addCase(sendQuery.pending, (state) => {
                state.isLoading = true;
                state.error = null;
            })
            .addCase(sendQuery.fulfilled, (state, action) => {
                state.isLoading = false;
                const response = action.payload;

                // Update session ID from response
                if (response.session_id) {
                    state.currentSessionId = response.session_id;
                }

                // Check if the backend returned an error
                if (!response.success || response.error) {
                    // Show error as an inline assistant message
                    const errorMessage: ChatMessage = {
                        id: generateId(),
                        role: 'assistant',
                        content: response.error || 'I encountered an issue analyzing the data. Please try rephrasing your question.',
                        timestamp: new Date().toISOString(),
                        responseType: 'text',
                        isError: true,
                    };
                    state.messages.push(errorMessage);
                    logger.error('Query returned error from backend', { error: response.error }, 'Chat');
                    return;
                }

                const assistantMessage: ChatMessage = {
                    id: generateId(),
                    role: 'assistant',
                    content: response.answer || 'No response received',
                    timestamp: new Date().toISOString(),
                    responseType: 'text',
                };

                state.messages.push(assistantMessage);
                logger.info('Assistant response added', {
                    messageId: assistantMessage.id,
                    success: response.success,
                    hasContext: response.has_context,
                }, 'Chat');
            })
            .addCase(sendQuery.rejected, (state, action) => {
                state.isLoading = false;
                const errorText = action.payload?.message || 'Failed to get response. Please try again.';
                // Show as inline message instead of error banner
                const errorMessage: ChatMessage = {
                    id: generateId(),
                    role: 'assistant',
                    content: errorText,
                    timestamp: new Date().toISOString(),
                    responseType: 'text',
                    isError: true,
                };
                state.messages.push(errorMessage);
                logger.error('Query rejected', action.payload, 'Chat');
            })

            // Create Session
            .addCase(createSession.pending, (state) => {
                state.sessionsLoading = true;
            })
            .addCase(createSession.fulfilled, (state, action) => {
                state.sessionsLoading = false;
                state.currentSessionId = action.payload.id;
                state.sessions.unshift(action.payload);
                state.messages = [];
                logger.info('Session created', { sessionId: action.payload.id }, 'Chat');
            })
            .addCase(createSession.rejected, (state, action) => {
                state.sessionsLoading = false;
                state.error = action.payload?.message || 'Failed to create session';
            })

            // Fetch Sessions
            .addCase(fetchSessions.pending, (state) => {
                state.sessionsLoading = true;
            })
            .addCase(fetchSessions.fulfilled, (state, action) => {
                state.sessionsLoading = false;
                state.sessions = action.payload;
                logger.debug('Sessions loaded', { count: action.payload.length }, 'Chat');
            })
            .addCase(fetchSessions.rejected, (state, action) => {
                state.sessionsLoading = false;
                // Don't show error for session fetch failures - just log it
                logger.error('Failed to fetch sessions', action.payload, 'Chat');
            })

            // Load Session History
            .addCase(loadSessionHistory.pending, (state) => {
                state.isLoading = true;
            })
            .addCase(loadSessionHistory.fulfilled, (state, action) => {
                state.isLoading = false;
                state.currentSessionId = action.payload.sessionId;

                // Convert history messages to ChatMessage format
                state.messages = action.payload.messages.map(msg => ({
                    id: msg.id,
                    role: msg.role as 'user' | 'assistant',
                    content: msg.content,
                    timestamp: msg.createdAt,
                    sqlQuery: msg.sqlQuery,
                    isError: msg.isError,
                }));

                logger.info('Session history loaded', {
                    sessionId: action.payload.sessionId,
                    messageCount: action.payload.messages.length
                }, 'Chat');
            })
            .addCase(loadSessionHistory.rejected, (state, action) => {
                state.isLoading = false;
                state.error = action.payload?.message || 'Failed to load history';
            })

            // Delete Session
            .addCase(deleteSession.pending, (state) => {
                // Optimistic: nothing changes visually during pending
            })
            .addCase(deleteSession.fulfilled, (state, action) => {
                const deletedId = action.payload;
                state.sessions = state.sessions.filter(s => s.id !== deletedId);

                // If active session was deleted, reset to new conversation
                if (state.currentSessionId === deletedId) {
                    state.currentSessionId = null;
                    state.messages = [];
                    state.error = null;
                }

                logger.info('Session deleted', { sessionId: deletedId }, 'Chat');
            })
            .addCase(deleteSession.rejected, (state, action) => {
                state.error = action.payload?.message || 'Failed to delete session';
                logger.error('Delete session failed', action.payload, 'Chat');
            });
    },
});

export const {
    addUserMessage,
    clearChat,
    clearError,
    setCurrentSession,
    startNewConversation,
    editUserMessage,
} = chatSlice.actions;

export default chatSlice.reducer;
