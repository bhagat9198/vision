"use client";

import React, { createContext, useContext, useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { authService, User } from './auth-service';
import { api } from './api';
import { toast } from 'sonner';

interface AuthContextType {
    user: User | null;
    loading: boolean;
    login: (data: any) => Promise<void>;
    register: (data: any) => Promise<void>;
    logout: () => void;
    isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const router = useRouter();
    const pathname = usePathname();

    useEffect(() => {
        // Initialize auth state
        const storedUser = authService.getUser();
        if (storedUser) {
            setUser(storedUser);
            // We need to retrieve token from cookie or auth service to set it in api client
            const token = authService.getToken();
            if (token) api.setAuthToken(token);
        }
        setLoading(false);
    }, []);

    const login = async (data: any) => {
        try {
            const response = await authService.login(data);
            authService.setSession(response.token, response.user);
            api.setAuthToken(response.token);
            setUser(response.user);
            toast.success('Login successful');
            router.push('/');
        } catch (error: any) {
            toast.error(error.message);
            throw error;
        }
    };

    const register = async (data: any) => {
        try {
            const response = await authService.register(data);
            authService.setSession(response.token, response.user);
            api.setAuthToken(response.token);
            setUser(response.user);
            toast.success('Setup completed successfully');
            router.push('/');
        } catch (error: any) {
            toast.error(error.message);
            throw error;
        }
    };

    const logout = () => {
        authService.clearSession();
        setUser(null);
        router.push('/auth/login');
        toast.info('Logged out');
    };

    return (
        <AuthContext.Provider
            value={{
                user,
                loading,
                login,
                register,
                logout,
                isAuthenticated: !!user
            }}
        >
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}
