'use client';

import { useState, KeyboardEvent } from 'react';
import { motion } from 'framer-motion';
import { Send, Sparkles } from 'lucide-react';
import { useAppDispatch, useAppSelector } from '@/hooks/useAppDispatch';
import { addUserMessage, sendQuery } from '@/store/slices/chatSlice';
import { logger } from '@/utils/logger';

export default function ChatInput() {
    const [input, setInput] = useState('');
    const dispatch = useAppDispatch();
    const { isLoading } = useAppSelector((state) => state.chat);

    const handleSubmit = async () => {
        const question = input.trim();
        if (!question || isLoading) return;

        logger.info('Chat submit', { questionLength: question.length }, 'ChatInput');

        dispatch(addUserMessage(question));
        setInput('');
        dispatch(sendQuery({ question }));
    };

    const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSubmit();
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="relative"
        >
            <div className="relative flex items-end gap-3 p-2 bg-gradient-to-r from-gray-100 to-white dark:from-gray-800/80 dark:to-gray-900/80 rounded-2xl border border-gray-200 dark:border-white/10 backdrop-blur-xl shadow-2xl shadow-cyan-500/5">
                <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/5 to-purple-500/5 rounded-2xl" />

                <div className="relative flex-1">
                    <textarea
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="Ask anything about your housing data..."
                        rows={1}
                        disabled={isLoading}
                        className="w-full px-4 py-3 bg-transparent text-gray-900 dark:text-white placeholder-gray-500 resize-none focus:outline-none disabled:opacity-50"
                        style={{ minHeight: '48px', maxHeight: '120px' }}
                    />
                </div>

                <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={handleSubmit}
                    disabled={!input.trim() || isLoading}
                    className="relative p-3 bg-gradient-to-r from-cyan-500 to-purple-600 rounded-xl text-white font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 hover:shadow-lg hover:shadow-cyan-500/25"
                >
                    {isLoading ? (
                        <motion.div
                            animate={{ rotate: 360 }}
                            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                        >
                            <Sparkles className="w-5 h-5" />
                        </motion.div>
                    ) : (
                        <Send className="w-5 h-5" />
                    )}
                </motion.button>
            </div>

            <p className="mt-2 text-xs text-gray-500 text-center">
                Press Enter to send, Shift+Enter for new line
            </p>
        </motion.div>
    );
}
