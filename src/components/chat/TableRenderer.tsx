'use client';

import { motion } from 'framer-motion';
import { TableData } from '@/types';

interface TableRendererProps {
    data: TableData;
}

export default function TableRenderer({ data }: TableRendererProps) {
    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="overflow-x-auto rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 backdrop-blur-sm"
        >
            <table className="w-full text-sm">
                <thead>
                    <tr className="border-b border-gray-200 dark:border-white/10 bg-gradient-to-r from-cyan-500/10 to-purple-500/10">
                        {data.headers.map((header, index) => (
                            <th
                                key={index}
                                className="px-4 py-3 text-left font-semibold text-cyan-300 whitespace-nowrap"
                            >
                                {header}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {data.rows.map((row, rowIndex) => (
                        <motion.tr
                            key={rowIndex}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: rowIndex * 0.05 }}
                            className="border-b border-gray-100 dark:border-white/5 hover:bg-gray-100 dark:hover:bg-white/5 transition-colors"
                        >
                            {row.map((cell, cellIndex) => (
                                <td
                                    key={cellIndex}
                                    className="px-4 py-3 text-gray-600 dark:text-gray-300 whitespace-nowrap"
                                >
                                    {cell}
                                </td>
                            ))}
                        </motion.tr>
                    ))}
                </tbody>
            </table>
        </motion.div>
    );
}
