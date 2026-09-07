'use client';

export default function PermitTableSkeleton({ rows = 10 }: { rows?: number }) {
    return (
        <div className="animate-pulse">
            <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                    <thead className="bg-[#F7F9FB] text-[#5B6B7D] border-b border-[#DFE6EE]">
                        <tr>
                            <th className="px-4 py-3 w-10">
                                <div className="h-4 w-4 bg-[#DFE6EE] rounded" />
                            </th>
                            <th className="px-4 py-3 font-medium">Added</th>
                            <th className="px-4 py-3 font-medium">Permit / Project Scope</th>
                            <th className="px-4 py-3 font-medium">Location</th>
                            <th className="px-4 py-3 font-medium">Contractor</th>
                            <th className="px-4 py-3 font-medium text-right">Value</th>
                            <th className="px-4 py-3 font-medium">Qualification</th>
                            <th className="px-4 py-3 font-medium w-28">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-[#DFE6EE]">
                        {Array.from({ length: rows }).map((_, i) => (
                            <tr key={i}>
                                <td className="px-4 py-3 w-10">
                                    <div className="h-4 w-4 bg-[#DFE6EE] rounded" />
                                </td>
                                <td className="px-4 py-3">
                                    <div className="h-4 w-20 bg-[#DFE6EE] rounded" />
                                </td>
                                <td className="px-4 py-3">
                                    <div className="h-4 w-32 bg-[#DFE6EE] rounded" />
                                </td>
                                <td className="px-4 py-3">
                                    <div className="h-4 w-24 bg-[#DFE6EE] rounded" />
                                </td>
                                <td className="px-4 py-3">
                                    <div className="h-4 w-28 bg-[#DFE6EE] rounded" />
                                </td>
                                <td className="px-4 py-3 text-right">
                                    <div className="h-4 w-20 bg-[#DFE6EE] rounded ml-auto" />
                                </td>
                                <td className="px-4 py-3">
                                    <div className="h-4 w-20 bg-[#DFE6EE] rounded" />
                                </td>
                                <td className="px-4 py-3">
                                    <div className="h-4 w-20 bg-[#DFE6EE] rounded" />
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
