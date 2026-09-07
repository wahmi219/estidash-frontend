'use client';

import React, { Component, ReactNode } from 'react';
import { logger } from '@/utils/logger';

interface Props {
    children: ReactNode;
    fallback?: ReactNode;
}

interface State {
    hasError: boolean;
    error: Error | null;
}

class ErrorBoundary extends Component<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
        logger.error('UI Error Caught by Error Boundary', {
            error: error.message,
            stack: error.stack,
            componentStack: errorInfo.componentStack,
        }, 'ErrorBoundary');
    }

    handleRetry = () => {
        this.setState({ hasError: false, error: null });
        logger.info('User clicked retry after error', undefined, 'ErrorBoundary');
    };

    render() {
        if (this.state.hasError) {
            if (this.props.fallback) {
                return this.props.fallback;
            }

            return (
                <div className="min-h-[400px] flex flex-col items-center justify-center p-8 bg-gradient-to-br from-red-900/20 to-red-950/30 rounded-2xl border border-red-500/20">
                    <div className="text-6xl mb-4">⚠️</div>
                    <h2 className="text-2xl font-bold text-red-400 mb-2">Something went wrong</h2>
                    <p className="text-gray-400 text-center max-w-md mb-6">
                        An unexpected error occurred. Our team has been notified.
                    </p>
                    <button
                        onClick={this.handleRetry}
                        className="px-6 py-3 bg-red-500/20 hover:bg-red-500/30 border border-red-500/40 rounded-xl text-red-300 font-medium transition-all duration-300 hover:scale-105"
                    >
                        Try Again
                    </button>
                    {process.env.NODE_ENV === 'development' && this.state.error && (
                        <pre className="mt-6 p-4 bg-black/40 rounded-lg text-xs text-red-300 overflow-auto max-w-full max-h-48">
                            {this.state.error.message}
                            {'\n'}
                            {this.state.error.stack}
                        </pre>
                    )}
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;
