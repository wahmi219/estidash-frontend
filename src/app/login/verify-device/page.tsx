import VerifyDeviceForm from '@/components/auth/VerifyDeviceForm';

export const metadata = { title: 'Verify Device — EstiHub' };

export default function VerifyDevicePage() {
    return (
        <main className="min-h-screen bg-gray-950 flex items-center justify-center px-4 relative overflow-hidden">
            {/* Background blobs */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute -top-40 -left-40 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl" />
                <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl" />
            </div>
            <div className="relative z-10 w-full flex justify-center">
                <VerifyDeviceForm />
            </div>
        </main>
    );
}
