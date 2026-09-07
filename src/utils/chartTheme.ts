'use client';

import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';

export interface ChartThemeColors {
    grid: string;
    axis: string;
    tooltipBg: string;
    tooltipBorder: string;
    tooltipText: string;
    labelColor: string;
    cyan: string;
    purple: string;
    amber: string;
    emerald: string;
    rose: string;
    blue: string;
    pink: string;
    lime: string;
}

const darkColors: ChartThemeColors = {
    grid: '#374151',
    axis: '#9ca3af',
    tooltipBg: '#1f2937',
    tooltipBorder: '#374151',
    tooltipText: '#f9fafb',
    labelColor: '#9ca3af',
    cyan: '#06b6d4',
    purple: '#8b5cf6',
    amber: '#f59e0b',
    emerald: '#10b981',
    rose: '#f43f5e',
    blue: '#3b82f6',
    pink: '#ec4899',
    lime: '#84cc16',
};

const lightColors: ChartThemeColors = {
    grid: '#e5e7eb',
    axis: '#6b7280',
    tooltipBg: '#ffffff',
    tooltipBorder: '#e5e7eb',
    tooltipText: '#111827',
    labelColor: '#6b7280',
    cyan: '#0891b2',
    purple: '#7c3aed',
    amber: '#d97706',
    emerald: '#059669',
    rose: '#e11d48',
    blue: '#2563eb',
    pink: '#db2777',
    lime: '#65a30d',
};

export function useChartTheme(): ChartThemeColors {
    const { resolvedTheme } = useTheme();
    const [colors, setColors] = useState<ChartThemeColors>(darkColors);

    useEffect(() => {
        setColors(resolvedTheme === 'dark' ? darkColors : lightColors);
    }, [resolvedTheme]);

    return colors;
}
