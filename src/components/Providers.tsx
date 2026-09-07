'use client';

import { Provider } from 'react-redux';
import { ThemeProvider } from 'next-themes';
import { store } from '@/store/store';
import { logger } from '@/utils/logger';
import { useEffect } from 'react';

function AppInitializer({ children }: { children: React.ReactNode }) {
    useEffect(() => {
        logger.info('Application initialized', { timestamp: new Date().toISOString() }, 'App');
    }, []);
    return <>{children}</>;
}

export default function Providers({ children }: { children: React.ReactNode }) {
    return (
        <ThemeProvider attribute="class" forcedTheme="light">
            <Provider store={store}>
                <AppInitializer>{children}</AppInitializer>
            </Provider>
        </ThemeProvider>
    );
}
