'use client';

export default function RegistryTableSkeleton({ rows = 10 }: { rows?: number }) {
    return (
        <div className="animate-pulse">
            <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                    <thead className="bg-[#F7F9FB] text-[#5B6B7D] border-b border-[#DFE6EE]">
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
                    <tbody className="divide-y divide-[#DFE6EE]">
                        {Array.from({ length: rows }).map((_, i) => (
                            <tr key={i}>
                                {Array.from({ length: 8 }).map((_, j) => (
                                    <td key={j} className="px-4 py-3">
                                        <div className="h-4 w-20 bg-[#F7F9FB] rounded" />
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
