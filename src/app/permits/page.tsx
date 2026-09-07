'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Search, Mail, Globe, MapPin, Building2, Calendar, DollarSign, ExternalLink, AlertCircle, RefreshCw } from 'lucide-react';

interface NormalizedPermit {
    permit_id: string;
    issued_date: string | null;
    permit_type: string | null;
    address: string | null;
    city: string;
    state: string;
    contractor_name: string | null;
    contractor_business: string | null;
    contractor_phone: string | null;
    contractor_email: string | null;
    contractor_address: string | null;
    contractor_url: string | null;
    description: string | null;
    zip_code: string | null;
    valuation: number | null;
    square_footage: number | null;
    raw_source: string;
}

interface PermitResponse {
    source: string;
    count: number;
    data: NormalizedPermit[];
}

const CITIES = [
    { value: 'nyc', label: 'New York City, NY (Live)' },
    { value: 'chicago', label: 'Chicago, IL (Live)' },
    { value: 'austin', label: 'Austin, TX' },
    { value: 'dallas', label: 'Dallas, TX' },
    { value: 'sf', label: 'San Francisco, CA' },
    { value: 'seattle', label: 'Seattle, WA' },
    { value: 'la', label: 'Los Angeles, CA' },
    { value: 'cincinnati', label: 'Cincinnati, OH' },
    { value: 'montgomery_md', label: 'Montgomery County, MD' },
];

export default function PermitSearchPage() {
    // Default to NYC for live data example
    const [city, setCity] = useState('nyc');
    const [limit, setLimit] = useState(25);

    // Default to last 30 days to show "Up to Date" results
    const [startDate, setStartDate] = useState(() => {
        const d = new Date();
        d.setMonth(d.getMonth() - 1);
        return d.toISOString().split('T')[0];
    });
    const [endDate, setEndDate] = useState('');

    const [loading, setLoading] = useState(false);
    const [results, setResults] = useState<PermitResponse | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [hasSearched, setHasSearched] = useState(false);

    const fetchPermits = useCallback(async () => {
        setLoading(true);
        setError(null);
        setResults(null);
        setHasSearched(true);

        try {
            // Build query params
            const params = new URLSearchParams({
                city,
                limit: limit.toString(),
            });
            if (startDate) params.append('start_date', startDate);
            if (endDate) params.append('end_date', endDate);

            const response = await fetch(`http://127.0.0.1:8000/api/v1/permits/external?${params.toString()}`);

            if (!response.ok) {
                throw new Error(`Error: ${response.statusText}`);
            }

            const data: PermitResponse = await response.json();
            setResults(data);
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : 'Failed to fetch permits');
        } finally {
            setLoading(false);
        }
    }, [city, limit, startDate, endDate]);

    // Auto-search on initial load
    useEffect(() => {
        fetchPermits();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []); // Only run once on mount

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        fetchPermits();
    };

    return (
        <div className="min-h-screen bg-gray-50 p-8">
            <div className="max-w-7xl mx-auto space-y-8">

                {/* Header */}
                <div className="text-center space-y-2">
                    <h1 className="text-3xl font-bold text-gray-900">Permit Intelligence</h1>
                    <p className="text-gray-500">Query real-time building permits and automatically find contractor emails.</p>
                </div>

                {/* Search Form */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 max-w-4xl mx-auto">
                    <form onSubmit={handleSearch} className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
                        <div className="md:col-span-3 space-y-2">
                            <label htmlFor="city" className="block text-sm font-medium text-gray-700">City</label>
                            <select
                                id="city"
                                value={city}
                                onChange={(e) => setCity(e.target.value)}
                                className="select-light w-full h-10 px-3 rounded-md border border-gray-300 bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                                {CITIES.map((c) => (
                                    <option key={c.value} value={c.value}>{c.label}</option>
                                ))}
                            </select>
                        </div>

                        <div className="md:col-span-3 space-y-2">
                            <label htmlFor="start_date" className="block text-sm font-medium text-gray-700">Start Date</label>
                            <input
                                type="date"
                                id="start_date"
                                value={startDate}
                                onChange={(e) => setStartDate(e.target.value)}
                                className="w-full h-10 px-3 rounded-md border border-gray-300 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>

                        <div className="md:col-span-3 space-y-2">
                            <label htmlFor="end_date" className="block text-sm font-medium text-gray-700">End Date</label>
                            <input
                                type="date"
                                id="end_date"
                                value={endDate}
                                onChange={(e) => setEndDate(e.target.value)}
                                className="w-full h-10 px-3 rounded-md border border-gray-300 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>

                        <div className="md:col-span-1 space-y-2">
                            <label htmlFor="limit" className="block text-sm font-medium text-gray-700">Limit</label>
                            <input
                                type="number"
                                id="limit"
                                value={limit}
                                onChange={(e) => setLimit(Number(e.target.value))}
                                min={1}
                                max={100}
                                className="w-full h-10 px-3 rounded-md border border-gray-300 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>

                        <div className="md:col-span-2">
                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full h-10 px-4 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-md shadow-sm transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {loading ? (
                                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                                ) : (
                                    <Search size={18} />
                                )}
                                Search
                            </button>
                        </div>
                    </form>
                </div>

                {/* Error Message */}
                {error && (
                    <div className="max-w-4xl mx-auto p-4 bg-red-50 text-red-700 rounded-lg border border-red-200 flex items-center gap-2">
                        <AlertCircle size={20} />
                        {error}
                    </div>
                )}

                {/* Results */}
                {results && (
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                        <div className="p-4 border-b border-gray-200 bg-gray-50 flex justify-between items-center">
                            <h2 className="font-semibold text-gray-900 flex items-center gap-2">
                                Results <span className="text-gray-500 font-normal">({results.count})</span>
                            </h2>
                            <span className="text-xs font-mono text-gray-500 uppercase px-2 py-1 bg-gray-200 rounded">
                                Source: {results.source}
                            </span>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm">
                                <thead className="bg-gray-50 text-gray-600 border-b border-gray-200">
                                    <tr>
                                        <th className="px-4 py-3 font-medium">Date</th>
                                        <th className="px-4 py-3 font-medium">Type</th>
                                        <th className="px-4 py-3 font-medium">Address</th>
                                        <th className="px-4 py-3 font-medium">Contractor</th>
                                        <th className="px-4 py-3 font-medium">Enrichment</th>
                                        <th className="px-4 py-3 font-medium text-right">Valuation</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {results.data.map((permit) => (
                                        <tr key={permit.permit_id} className="hover:bg-gray-50 transition-colors">
                                            <td className="px-4 py-3 text-gray-600 whitespace-nowrap">
                                                <div className="flex items-center gap-2">
                                                    <Calendar size={14} className="text-gray-400" />
                                                    {permit.issued_date || '-'}
                                                </div>
                                            </td>
                                            <td className="px-4 py-3 font-medium text-gray-900 max-w-[200px] truncate" title={permit.permit_type || ''}>
                                                {permit.permit_type}
                                            </td>
                                            <td className="px-4 py-3 text-gray-600 max-w-[250px] truncate">
                                                <div className="flex items-center gap-2">
                                                    <MapPin size={14} className="text-gray-400 flex-shrink-0" />
                                                    {permit.address}, {permit.city}
                                                </div>
                                            </td>
                                            <td className="px-4 py-3 text-gray-900 max-w-[250px]">
                                                <div className="flex items-start gap-2">
                                                    <Building2 size={14} className="mt-1 text-gray-400 flex-shrink-0" />
                                                    <div>
                                                        <div className="font-medium truncate w-[200px]" title={permit.contractor_business || ''}>{permit.contractor_business || permit.contractor_name || '-'}</div>
                                                        {permit.contractor_phone && (
                                                            <div className="text-xs text-gray-500">{permit.contractor_phone}</div>
                                                        )}
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-4 py-3">
                                                <div className="space-y-1">
                                                    {permit.contractor_email ? (
                                                        <a href={`mailto:${permit.contractor_email}`} className="flex items-center gap-2 text-green-700 bg-green-50 px-2 py-1 rounded-md w-fit hover:bg-green-100 transition-colors">
                                                            <Mail size={14} />
                                                            <span className="font-medium">{permit.contractor_email}</span>
                                                        </a>
                                                    ) : (
                                                        <span className="flex items-center gap-2 text-gray-400 px-2 py-1">
                                                            <Mail size={14} />
                                                            <span className="italic text-xs">No email</span>
                                                        </span>
                                                    )}

                                                    {permit.contractor_url && (
                                                        <a
                                                            href={`https://${permit.contractor_url}`}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="flex items-center gap-2 text-blue-600 hover:text-blue-800 text-xs px-2"
                                                        >
                                                            <Globe size={12} />
                                                            {permit.contractor_url}
                                                            <ExternalLink size={10} />
                                                        </a>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-4 py-3 text-right font-mono text-gray-700">
                                                {permit.valuation ? (
                                                    <span className="flex items-center justify-end gap-1">
                                                        {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(permit.valuation)}
                                                    </span>
                                                ) : '-'}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {results.data.length === 0 && hasSearched && (
                            <div className="p-12 text-center text-gray-500">
                                <AlertCircle className="mx-auto h-10 w-10 text-gray-300 mb-3" />
                                <p className="font-medium">No permits found for this date range.</p>
                                <p className="text-sm mt-1">Try selecting an older date range or a different city if data is stale.</p>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
