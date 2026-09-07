'use client';

import { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { User, Bot, MessageSquare } from 'lucide-react';
import { useAppSelector } from '@/hooks/useAppDispatch';
import { ChatMessage } from '@/types';
import BulletListRenderer from './BulletListRenderer';
import TableRenderer from './TableRenderer';
import ChartRenderer from './ChartRenderer';
import MarkdownRenderer from './MarkdownRenderer';
import LoadingIndicator from '../ui/LoadingIndicator';

function MessageContent({ message }: { message: ChatMessage }) {
    if (message.role === 'user') {
        return <p className="text-gray-900 dark:text-white">{message.content}</p>;
    }

    // Assistant message - render based on response type
    switch (message.responseType) {
        case 'bullets':
            return message.bullets ? (
                <BulletListRenderer bullets={message.bullets} />
            ) : (
                <MarkdownRenderer content={message.content} />
            );

        case 'table':
            return message.tableData ? (
                <div className="space-y-3">
                    <MarkdownRenderer content={message.content} />
                    <TableRenderer data={message.tableData} />
                </div>
            ) : (
                <MarkdownRenderer content={message.content} />
            );

        case 'chart':
            return message.chartData ? (
                <div className="space-y-3">
                    <MarkdownRenderer content={message.content} />
                    <ChartRenderer data={message.chartData} />
                </div>
            ) : (
                <MarkdownRenderer content={message.content} />
            );

        default:
            return <MarkdownRenderer content={message.content} />;
    }
}

export default function ChatHistory() {
    const { messages, isLoading, error } = useAppSelector((state) => state.chat);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, isLoading]);

    if (messages.length === 0 && !isLoading) {
        return (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
                <motion.div
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.5 }}
                    className="p-6 bg-gradient-to-br from-cyan-500/10 to-purple-500/10 rounded-full mb-6"
                >
                    <MessageSquare className="w-12 h-12 text-cyan-400" />
                </motion.div>
                <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Start a Conversation</h3>
                <p className="text-gray-500 dark:text-gray-400 max-w-md">
                    Ask questions about your housing data. Upload an Excel file first, then explore
                    trends, statistics, and insights.
                </p>
            </div>
        );
    }

    return (
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
            <AnimatePresence mode="popLayout">
                {messages.map((message) => (
                    <motion.div
                        key={message.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        transition={{ duration: 0.3 }}
                        className={`flex gap-4 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                        {message.role === 'assistant' && (
                            <div className="flex-shrink-0 w-10 h-10 bg-gradient-to-br from-cyan-500 to-purple-600 rounded-xl flex items-center justify-center">
                                <Bot className="w-5 h-5 text-white" />
                            </div>
                        )}

                        <div
                            className={`max-w-[75%] p-4 rounded-2xl ${message.role === 'user'
                                ? 'bg-gradient-to-r from-cyan-500/20 to-purple-500/20 border border-cyan-500/30'
                                : 'bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/10'
                                }`}
                        >
                            <MessageContent message={message} />
                            <p className="mt-2 text-xs text-gray-500">
                                {new Date(message.timestamp).toLocaleTimeString()}
                            </p>
                        </div>

                        {message.role === 'user' && (
                            <div className="flex-shrink-0 w-10 h-10 bg-gradient-to-br from-gray-600 to-gray-700 rounded-xl flex items-center justify-center">
                                <User className="w-5 h-5 text-white" />
                            </div>
                        )}
                    </motion.div>
                ))}
            </AnimatePresence>

            {isLoading && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex gap-4"
                >
                    <div className="flex-shrink-0 w-10 h-10 bg-gradient-to-br from-cyan-500 to-purple-600 rounded-xl flex items-center justify-center">
                        <Bot className="w-5 h-5 text-white" />
                    </div>
                    <div className="p-4 bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-2xl">
                        <LoadingIndicator size="sm" text="Analyzing your data..." />
                    </div>
                </motion.div>
            )}

            <div ref={messagesEndRef} />
        </div>
    );
}
