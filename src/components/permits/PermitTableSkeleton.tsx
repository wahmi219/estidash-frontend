'use client';

export default function PermitTableSkeleton({ rows = 10 }: { rows?: number }) {
    return (
        <div className="animate-pulse">
            <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                    <thead className="bg-white/[0.02] text-gray-500 border-b border-white/[0.06]">
                        <tr>
                            <th className="px-4 py-3 w-10">
                                <div className="h-4 w-4 bg-white/[0.06] rounded" />
                            </th>
                            <th className="px-4 py-3 font-medium">Date</th>
                            <th className="px-4 py-3 font-medium">Permit #</th>
                            <th className="px-4 py-3 font-medium">Type</th>
                            <th className="px-4 py-3 font-medium">City</th>
                            <th className="px-4 py-3 font-medium">Contractor</th>
                            <th className="px-4 py-3 font-medium">Status</th>
                            <th className="px-4 py-3 font-medium text-right">Est. Cost</th>
                            <th className="px-4 py-3 font-medium w-28">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/[0.04]">
                        {Array.from({ length: rows }).map((_, i) => (
                            <tr key={i}>
                                <td className="px-4 py-3 w-10">
                                    <div className="h-4 w-4 bg-white/[0.06] rounded" />
                                </td>
                                <td className="px-4 py-3">
                                    <div className="h-4 w-20 bg-white/[0.06] rounded" />
                                </td>
                                <td className="px-4 py-3">
                                    <div className="h-4 w-24 bg-white/[0.06] rounded" />
                                </td>
                                <td className="px-4 py-3">
                                    <div className="h-4 w-28 bg-white/[0.06] rounded" />
                                </td>
                                <td className="px-4 py-3">
                                    <div className="h-4 w-24 bg-white/[0.06] rounded" />
                                </td>
                                <td className="px-4 py-3">
                                    <div className="h-4 w-28 bg-white/[0.06] rounded" />
                                </td>
                                <td className="px-4 py-3">
                                    <div className="h-4 w-16 bg-white/[0.06] rounded" />
                                </td>
                                <td className="px-4 py-3 text-right">
                                    <div className="h-4 w-20 bg-white/[0.06] rounded ml-auto" />
                                </td>
                                <td className="px-4 py-3">
                                    <div className="h-4 w-20 bg-white/[0.06] rounded" />
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
