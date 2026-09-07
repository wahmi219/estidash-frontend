import axios from 'axios';
import type { UserProfile } from '@/store/slices/authSlice';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';

export interface LoginSuccess {
    status: 'ok';
    access_token: string;
    token_type: string;
    user: UserProfile;
}

export interface LoginNewDevice {
    status: 'new_device';
    user_id: number;
}

export type LoginResult = LoginSuccess | LoginNewDevice;

export interface DeviceInfo {
    id: number;
    device_name: string | null;
    platform: string;
    status: 'pending' | 'trusted' | 'revoked';
    last_seen_at: string | null;
    registered_at: string;
    registration_ip: string | null;
}

export interface AdminDeviceInfo extends DeviceInfo {
    user_id: number;
    user_email: string;
    user_full_name: string;
    revoked_at: string | null;
}

const authClient = axios.create({
    baseURL: API_BASE,
    withCredentials: true,
    headers: { 'Content-Type': 'application/json' },
});

export const authService = {
    async login(email: string, password: string): Promise<LoginResult> {
        const response = await authClient.post('/auth/login', { email, password });
        if (response.status === 202) {
            return { status: 'new_device', user_id: response.data.user_id };
        }
        return { status: 'ok', ...response.data };
    },

    async logout(accessToken: string): Promise<void> {
        await authClient.post('/auth/logout', {}, {
            headers: { Authorization: `Bearer ${accessToken}` },
        });
    },

    async refreshToken(): Promise<{ access_token: string; user: UserProfile }> {
        const response = await authClient.post<{ access_token: string; token_type: string; user: UserProfile }>('/auth/refresh');
        return response.data;
    },

    async getMe(accessToken: string): Promise<UserProfile> {
        const response = await authClient.get<UserProfile>('/auth/me', {
            headers: { Authorization: `Bearer ${accessToken}` },
        });
        return response.data;
    },

    async sendDeviceOtp(userId: number): Promise<void> {
        await authClient.post('/auth/send-device-otp', { user_id: userId });
    },

    async verifyDevice(data: { user_id: number; otp: string; device_name?: string }): Promise<LoginSuccess> {
        const response = await authClient.post('/auth/verify-device', data);
        return { status: 'ok', ...response.data };
    },

    async listMyDevices(accessToken: string): Promise<DeviceInfo[]> {
        const response = await authClient.get<DeviceInfo[]>('/auth/my-devices', {
            headers: { Authorization: `Bearer ${accessToken}` },
        });
        return response.data;
    },

    async listAllDevices(accessToken: string): Promise<AdminDeviceInfo[]> {
        const response = await authClient.get<AdminDeviceInfo[]>('/auth/devices', {
            headers: { Authorization: `Bearer ${accessToken}` },
        });
        return response.data;
    },

    async updateDeviceStatus(
        deviceId: number,
        status: 'trusted' | 'revoked',
        accessToken: string,
    ): Promise<AdminDeviceInfo> {
        const response = await authClient.patch<AdminDeviceInfo>(
            `/auth/devices/${deviceId}`,
            { status },
            { headers: { Authorization: `Bearer ${accessToken}` } },
        );
        return response.data;
    },
};
