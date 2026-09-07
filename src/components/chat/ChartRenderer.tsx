'use client';

import { motion } from 'framer-motion';
import {
    BarChart,
    Bar,
    LineChart,
    Line,
    PieChart,
    Pie,
    Cell,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Legend,
} from 'recharts';
import { ChartData } from '@/types';
import { useChartTheme } from '@/utils/chartTheme';

interface ChartRendererProps {
    data: ChartData;
}

const COLORS = [
    '#06b6d4', // cyan-500
    '#8b5cf6', // violet-500
    '#f59e0b', // amber-500
    '#10b981', // emerald-500
    '#f43f5e', // rose-500
    '#3b82f6', // blue-500
    '#ec4899', // pink-500
    '#84cc16', // lime-500
];

export default function ChartRenderer({ data }: ChartRendererProps) {
    const chartColors = useChartTheme();

    // Transform data for recharts
    const chartData = data.labels.map((label, index) => {
        const point: any = { name: label };
        data.datasets.forEach((dataset) => {
            point[dataset.label] = dataset.data[index];
        });
        return point;
    });

    const renderChart = () => {
        switch (data.type) {
            case 'bar':
                return (
                    <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={chartData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                            <XAxis dataKey="name" stroke="#9ca3af" fontSize={12} />
                            <YAxis stroke="#9ca3af" fontSize={12} />
                            <Tooltip
                                contentStyle={{
                                    backgroundColor: '#1f2937',
                                    border: '1px solid #374151',
                                    borderRadius: '8px',
                                }}
                                labelStyle={{ color: '#e5e7eb' }}
                            />
                            <Legend />
                            {data.datasets.map((dataset, index) => (
                                <Bar
                                    key={dataset.label}
                                    dataKey={dataset.label}
                                    fill={COLORS[index % COLORS.length]}
                                    radius={[4, 4, 0, 0]}
                                />
                            ))}
                        </BarChart>
                    </ResponsiveContainer>
                );

            case 'line':
                return (
                    <ResponsiveContainer width="100%" height={300}>
                        <LineChart data={chartData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                            <XAxis dataKey="name" stroke="#9ca3af" fontSize={12} />
                            <YAxis stroke="#9ca3af" fontSize={12} />
                            <Tooltip
                                contentStyle={{
                                    backgroundColor: '#1f2937',
                                    border: '1px solid #374151',
                                    borderRadius: '8px',
                                }}
                                labelStyle={{ color: '#e5e7eb' }}
                            />
                            <Legend />
                            {data.datasets.map((dataset, index) => (
                                <Line
                                    key={dataset.label}
                                    type="monotone"
                                    dataKey={dataset.label}
                                    stroke={COLORS[index % COLORS.length]}
                                    strokeWidth={2}
                                    dot={{ fill: COLORS[index % COLORS.length], strokeWidth: 2 }}
                                />
                            ))}
                        </LineChart>
                    </ResponsiveContainer>
                );

            case 'pie':
                const pieData = data.labels.map((label, index) => ({
                    name: label,
                    value: data.datasets[0]?.data[index] || 0,
                }));

                return (
                    <ResponsiveContainer width="100%" height={300}>
                        <PieChart>
                            <Pie
                                data={pieData}
                                cx="50%"
                                cy="50%"
                                outerRadius={100}
                                dataKey="value"
                                label={({ name, percent }) =>
                                    `${name}: ${((percent ?? 0) * 100).toFixed(0)}%`
                                }
                                labelLine={{ stroke: '#9ca3af' }}
                            >
                                {pieData.map((entry, index) => (
                                    <Cell
                                        key={`cell-${index}`}
                                        fill={COLORS[index % COLORS.length]}
                                    />
                                ))}
                            </Pie>
                            <Tooltip
                                contentStyle={{
                                    backgroundColor: '#1f2937',
                                    border: '1px solid #374151',
                                    borderRadius: '8px',
                                }}
                                labelStyle={{ color: '#e5e7eb' }}
                            />
                            <Legend />
                        </PieChart>
                    </ResponsiveContainer>
                );

            default:
                return <p className="text-gray-400">Unsupported chart type</p>;
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="p-4 bg-white/5 rounded-xl border border-white/10 backdrop-blur-sm"
        >
            {renderChart()}
        </motion.div>
    );
}
