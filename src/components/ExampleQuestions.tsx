'use client';

import React, { useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Lightbulb, TrendingUp, Home, DollarSign, BarChart3 } from 'lucide-react';
import { useAppDispatch, useAppSelector } from '@/hooks/useAppDispatch';
import { fetchExamples, setSelectedCategory } from '@/store/slices/examplesSlice';
import { addUserMessage, sendQuery } from '@/store/slices/chatSlice';
import { logger } from '@/utils/logger';
import LoadingIndicator from './ui/LoadingIndicator';

const categoryIcons: Record<string, React.ComponentType<{ className?: string }>> = {
    'Trends': TrendingUp,
    'Pricing': DollarSign,
    'Properties': Home,
    'Statistics': BarChart3,
};

export default function ExampleQuestions() {
    const dispatch = useAppDispatch();
    const { examples, isLoading, error, selectedCategory } = useAppSelector((state) => state.examples);

    useEffect(() => {
        dispatch(fetchExamples());
        logger.info('Example questions component mounted', undefined, 'Examples');
    }, [dispatch]);

    const categories = useMemo(() => {
        const cats = [...new Set(examples.map((e) => e.category))];
        return cats;
    }, [examples]);

    const filteredExamples = useMemo(() => {
        if (!selectedCategory) return examples.slice(0, 6);
        return examples.filter((e) => e.category === selectedCategory);
    }, [examples, selectedCategory]);

    const handleQuestionClick = (question: string) => {
        logger.info('Example question selected', { question }, 'Examples');
        dispatch(addUserMessage(question));
        dispatch(sendQuery({ question }));
    };

    if (isLoading) {
        return (
            <div className="flex justify-center py-8">
                <LoadingIndicator text="Loading examples..." />
            </div>
        );
    }

    if (error) {
        return (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                <p>Failed to load examples</p>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <div className="flex items-center gap-2 mb-4">
                <Lightbulb className="w-5 h-5 text-amber-400" />
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Try asking</h3>
            </div>

            {/* Category Filters */}
            <div className="flex flex-wrap gap-2 mb-4">
                <button
                    onClick={() => dispatch(setSelectedCategory(null))}
                    className={`px-3 py-1.5 rounded-lg text-sm transition-all ${!selectedCategory ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40' : 'bg-gray-100 dark:bg-white/5 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-white/10'
                        }`}
                >
                    All
                </button>
                {categories.map((cat) => {
                    const Icon = categoryIcons[cat] || Lightbulb;
                    return (
                        <button
                            key={cat}
                            onClick={() => {
                                dispatch(setSelectedCategory(cat));
                                logger.debug('Category filter selected', { category: cat }, 'Examples');
                            }}
                            className={`px-3 py-1.5 rounded-lg text-sm flex items-center gap-1.5 transition-all ${selectedCategory === cat ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40' : 'bg-gray-100 dark:bg-white/5 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-white/10'
                                }`}
                        >
                            <Icon className="w-3.5 h-3.5" />
                            {cat}
                        </button>
                    );
                })}
            </div>

            {/* Example Questions */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {filteredExamples.map((example, index) => (
                    <motion.button
                        key={example.id || `example-${index}`}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.05 }}
                        onClick={() => handleQuestionClick(example.question)}
                        className="p-4 text-left bg-gray-50 dark:bg-white/5 hover:bg-gray-100 dark:hover:bg-white/10 rounded-xl border border-gray-200 dark:border-white/10 hover:border-cyan-500/30 transition-all group"
                    >
                        <p className="text-gray-300 group-hover:text-white transition-colors">{example.question}</p>
                        <span className="text-xs text-gray-500 mt-1 inline-block">{example.category}</span>
                    </motion.button>
                ))}
            </div>
        </div>
    );
}
