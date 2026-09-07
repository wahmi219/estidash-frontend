'use client';

import { motion } from 'framer-motion';
import { CheckCircle2 } from 'lucide-react';

interface BulletListRendererProps {
    bullets: string[];
}

export default function BulletListRenderer({ bullets }: BulletListRendererProps) {
    return (
        <ul className="space-y-3">
            {bullets.map((bullet, index) => (
                <motion.li
                    key={index}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="flex items-start gap-3 group"
                >
                    <CheckCircle2 className="w-5 h-5 text-cyan-400 mt-0.5 flex-shrink-0 group-hover:text-cyan-300 transition-colors" />
                    <span className="text-gray-600 dark:text-gray-300 leading-relaxed">{bullet}</span>
                </motion.li>
            ))}
        </ul>
    );
}
