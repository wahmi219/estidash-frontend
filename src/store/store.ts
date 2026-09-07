import { configureStore } from '@reduxjs/toolkit';
import { logger } from '@/utils/logger';
import { loggerMiddleware } from './middleware/loggerMiddleware';
import chatReducer from './slices/chatSlice';
import uploadReducer from './slices/uploadSlice';
import examplesReducer from './slices/examplesSlice';
import dashboardReducer from './slices/dashboardSlice';
import permitsReducer from './slices/permitsSlice';
import economicReducer from './slices/economicSlice';
import contractorsReducer from './slices/contractorsSlice';
import registryReducer from './slices/registrySlice';
import authReducer, { setAccessToken, logout } from './slices/authSlice';
import outreachReducer from './slices/outreachSlice';
import { injectStoreAuth } from '@/services/api';

export const store = configureStore({
    reducer: {
        auth: authReducer,
        chat: chatReducer,
        upload: uploadReducer,
        examples: examplesReducer,
        dashboard: dashboardReducer,
        permits: permitsReducer,
        economic: economicReducer,
        contractors: contractorsReducer,
        registry: registryReducer,
        outreach: outreachReducer,
    },
    middleware: (getDefaultMiddleware) =>
        getDefaultMiddleware({
            serializableCheck: {
                // Ignore these action types for serialization check
                ignoredActions: ['upload/uploadExcelFile/pending'],
                // Ignore these paths in the state
                ignoredPaths: ['upload.file'],
            },
        }).concat(loggerMiddleware),
    devTools: process.env.NODE_ENV !== 'production',
});

logger.info('Redux store initialized', undefined, 'Store');

// Wire auth token accessors into the API client
// This is done here (not in api.ts) to avoid the circular dep: store → slices → api → store
injectStoreAuth({
    getToken: () => store.getState().auth.accessToken,
    dispatch: store.dispatch,
    setAccessToken,
    logout,
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
