import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { Role } from '@/lib/roles';

export interface UserProfile {
    id: number;
    email: string;
    full_name: string;
    role: Role;
    status: string;
    last_login: string | null;
    created_at: string;
}

interface AuthState {
    user: UserProfile | null;
    accessToken: string | null;
    isAuthenticated: boolean;
    isLoading: boolean;
    error: string | null;
}

const initialState: AuthState = {
    user: null,
    accessToken: null,
    isAuthenticated: false,
    isLoading: false,
    error: null,
};

const authSlice = createSlice({
    name: 'auth',
    initialState,
    reducers: {
        setCredentials(state, action: PayloadAction<{ user: UserProfile; accessToken: string }>) {
            state.user = action.payload.user;
            state.accessToken = action.payload.accessToken;
            state.isAuthenticated = true;
            state.error = null;
        },
        setAccessToken(state, action: PayloadAction<string>) {
            state.accessToken = action.payload;
        },
        setUser(state, action: PayloadAction<UserProfile>) {
            state.user = action.payload;
        },
        setLoading(state, action: PayloadAction<boolean>) {
            state.isLoading = action.payload;
        },
        setError(state, action: PayloadAction<string | null>) {
            state.error = action.payload;
        },
        logout(state) {
            state.user = null;
            state.accessToken = null;
            state.isAuthenticated = false;
            state.error = null;
        },
    },
});

export const { setCredentials, setAccessToken, setUser, setLoading, setError, logout } = authSlice.actions;
export default authSlice.reducer;
