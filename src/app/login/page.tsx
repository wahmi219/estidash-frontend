import type { Metadata } from 'next';
import LoginForm from '@/components/auth/LoginForm';

export const metadata: Metadata = {
    title: 'Sign In | EstiHub',
    description: 'Sign in to EstiHub market intelligence platform',
};

export default function LoginPage() {
    return (
        <main className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
            {/* Background gradient blobs */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none">
                <div className="absolute -top-40 -left-40 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl" />
                <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-purple-600/10 rounded-full blur-3xl" />
            </div>

            <LoginForm />
        </main>
    );
}
