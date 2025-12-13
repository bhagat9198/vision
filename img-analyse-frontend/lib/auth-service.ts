import Cookies from 'js-cookie';

const API_BASE_URL = process.env.NEXT_PUBLIC_IMG_ANALYSE_API_URL || 'http://localhost:4001';

export interface User {
    id: string;
    email: string;
    name?: string;
    role: string;
}

export interface AuthResponse {
    user: User;
    token: string;
}

export const AUTH_TOKEN_KEY = 'img-analyse-auth-token';
export const AUTH_USER_KEY = 'img-analyse-auth-user';

export const authService = {
    // Store authentication data
    setSession: (token: string, user: User) => {
        // Set cookie for middleware access (expires in 7 days)
        Cookies.set(AUTH_TOKEN_KEY, token, { expires: 7, sameSite: 'Strict' });
        // Store user info in localStorage for easy access
        if (typeof window !== 'undefined') {
            localStorage.setItem(AUTH_USER_KEY, JSON.stringify(user));
        }
    },

    // Clear authentication data
    clearSession: () => {
        Cookies.remove(AUTH_TOKEN_KEY);
        if (typeof window !== 'undefined') {
            localStorage.removeItem(AUTH_USER_KEY);
        }
    },

    // Get token from cookie
    getToken: () => {
        return Cookies.get(AUTH_TOKEN_KEY);
    },

    // Get user from localStorage
    getUser: (): User | null => {
        if (typeof window === 'undefined') return null;
        const userStr = localStorage.getItem(AUTH_USER_KEY);
        try {
            return userStr ? JSON.parse(userStr) : null;
        } catch {
            return null;
        }
    },

    // API Methods
    checkSetupStatus: async (): Promise<{ setupRequired: boolean }> => {
        const res = await fetch(`${API_BASE_URL}/auth/setup-status`);
        if (!res.ok) throw new Error('Failed to check setup status');
        return res.json();
    },

    register: async (data: any): Promise<AuthResponse> => {
        const res = await fetch(`${API_BASE_URL}/auth/setup`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
        });

        if (!res.ok) {
            const error = await res.json();
            throw new Error(error.error || 'Registration failed');
        }

        return res.json();
    },

    login: async (data: any): Promise<AuthResponse> => {
        const res = await fetch(`${API_BASE_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
        });

        if (!res.ok) {
            const error = await res.json();
            throw new Error(error.error || 'Login failed');
        }

        return res.json();
    },
};
