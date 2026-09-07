'use client';

import { motion } from 'framer-motion';
import { HelpCircle, Book, MessageCircle, ExternalLink } from 'lucide-react';

export default function HelpPage() {
    return (
        <div className="p-6 lg:p-8">
            <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-8"
            >
                <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 rounded-xl bg-gradient-to-br from-blue-400/20 to-cyan-500/20">
                        <HelpCircle className="w-6 h-6 text-blue-400" />
                    </div>
                    <h1 className="text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white">Help & Support</h1>
                </div>
                <p className="text-gray-500 dark:text-gray-400">Get help with using EstiHub</p>
            </motion.div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                {[
                    { icon: Book, title: 'Documentation', desc: 'Read the full guide', color: 'cyan' },
                    { icon: MessageCircle, title: 'Ask AI Agent', desc: 'Get instant answers', color: 'purple' },
                    { icon: ExternalLink, title: 'Contact Support', desc: 'Reach our team', color: 'emerald' },
                ].map((item, i) => (
                    <motion.a
                        key={i}
                        href={item.title === 'Ask AI Agent' ? '/dashboard/chat' : '#'}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.1 }}
                        className="p-6 rounded-xl bg-black/4 dark:bg-white/5 border border-gray-200 dark:border-white/10 hover:bg-black/6 dark:hover:bg-white/8 transition-colors block"
                    >
                        <div className={`p-3 rounded-xl bg-${item.color}-500/20 w-fit mb-4`}>
                            <item.icon className={`w-6 h-6 text-${item.color}-400`} />
                        </div>
                        <h3 className="font-semibold text-gray-900 dark:text-white mb-1">{item.title}</h3>
                        <p className="text-sm text-gray-500">{item.desc}</p>
                    </motion.a>
                ))}
            </div>

            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="intelligence-panel"
            >
                <div className="intelligence-header">
                    <h3 className="font-semibold text-gray-900 dark:text-white">Frequently Asked Questions</h3>
                </div>
                <div className="intelligence-body space-y-4">
                    {[
                        { q: 'How do I upload permit data?', a: 'Navigate to the main page and use the file upload section to upload Excel files.' },
                        { q: 'What questions can I ask the AI?', a: 'You can ask about market trends, CBSA performance, trade opportunities, and outreach recommendations.' },
                        { q: 'How often is data updated?', a: 'Data is updated whenever you upload new Excel files. The AI analyzes the most recent data available.' },
                        { q: 'What does "Hot CBSA" mean?', a: 'Hot CBSAs are metropolitan areas showing strong month-over-month permit growth.' },
                    ].map((faq, i) => (
                        <div key={i} className="p-4 rounded-xl bg-black/4 dark:bg-white/5 border border-gray-200 dark:border-white/10">
                            <h4 className="font-medium text-gray-900 dark:text-white mb-2">{faq.q}</h4>
                            <p className="text-sm text-gray-500 dark:text-gray-400">{faq.a}</p>
                        </div>
                    ))}
                </div>
            </motion.div>
        </div>
    );
}
