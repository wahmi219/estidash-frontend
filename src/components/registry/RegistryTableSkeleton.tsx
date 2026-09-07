'use client';

export default function RegistryTableSkeleton({ rows = 10 }: { rows?: number }) {
    return (
        <div className="animate-pulse">
            <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                    <thead className="bg-gray-50 dark:bg-white/2 text-gray-500 border-b border-gray-200 dark:border-white/6">
                        <tr>
                            <th className="px-4 py-3 font-medium">Business Name</th>
                            <th className="px-4 py-3 font-medium">License #</th>
                            <th className="px-4 py-3 font-medium">Status</th>
                            <th className="px-4 py-3 font-medium">Type</th>
                            <th className="px-4 py-3 font-medium">Phone</th>
                            <th className="px-4 py-3 font-medium">Location</th>
                            <th className="px-4 py-3 font-medium">Expires</th>
                            <th className="px-4 py-3 font-medium text-center">Status</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-white/4">
                        {Array.from({ length: rows }).map((_, i) => (
                            <tr key={i}>
                                {Array.from({ length: 8 }).map((_, j) => (
                                    <td key={j} className="px-4 py-3">
                                        <div className="h-4 w-20 bg-gray-200 dark:bg-white/6 rounded" />
                                    </td>
                                ))}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
