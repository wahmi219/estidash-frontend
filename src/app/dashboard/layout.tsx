import type { Metadata } from "next";
import DashboardShell from "@/components/layout/DashboardShell";
import AuthGuard from "@/components/auth/AuthGuard";

export const metadata: Metadata = {
    title: "Dashboard | EstiHub",
    description: "AI-powered market intelligence dashboard for US housing construction permits",
};

export default function DashboardRootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <AuthGuard>
            <DashboardShell>{children}</DashboardShell>
        </AuthGuard>
    );
}
