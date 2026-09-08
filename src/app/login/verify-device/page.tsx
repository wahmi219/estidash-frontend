import VerifyDeviceForm from '@/components/auth/VerifyDeviceForm';

export const metadata = { title: 'Verify Device — EstiHub' };

export default function VerifyDevicePage() {
    return (
        <main className="min-h-screen bg-white flex items-center justify-center px-4">
            <VerifyDeviceForm />
        </main>
    );
}
