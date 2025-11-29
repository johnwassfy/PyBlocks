'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { authService, AuthResponse } from '../services/authService';

interface User {
    id: string;
    username: string;
    avatar: string;
    ageRange: string;
    xp?: number;
    level?: number;
}

interface AuthContextType {
    user: User | null;
    token: string | null;
    isAuthenticated: boolean;
    isLoading: boolean;
    login: (email: string, password: string) => Promise<AuthResponse>;
    logout: () => Promise<void>;
    checkAuth: () => Promise<boolean>;
    updateUser: (user: User) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};

interface AuthProviderProps {
    children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [token, setToken] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    // Check authentication status on mount
    useEffect(() => {
        checkAuth();
    }, []);

    // Automatic token refresh - check every minute
    useEffect(() => {
        const refreshInterval = setInterval(async () => {
            const storedToken = authService.getToken();
            const refreshToken = authService.getRefreshToken();

            if (!storedToken || !refreshToken) return;

            try {
                // Decode token to check expiry (simple check without verification)
                const payload = JSON.parse(atob(storedToken.split('.')[1]));
                const expiryTime = payload.exp * 1000; // Convert to milliseconds
                const now = Date.now();
                const timeUntilExpiry = expiryTime - now;

                // Refresh if token expires in less than 5 minutes (300000 ms)
                if (timeUntilExpiry < 300000 && timeUntilExpiry > 0) {
                    console.log('Auto-refreshing token...');
                    const response = await authService.refreshToken(refreshToken);

                    // Store new tokens
                    authService.setToken(response.access_token);
                    if (response.refresh_token) {
                        authService.setRefreshToken(response.refresh_token);
                    }
                    authService.setUser(response.user);

                    setToken(response.access_token);
                    setUser(response.user);
                }
            } catch (error) {
                console.error('Auto-refresh failed:', error);
                // If refresh fails, logout user
                await logout();
            }
        }, 60000); // Check every minute

        return () => clearInterval(refreshInterval);
    }, [token]);

    const checkAuth = async (): Promise<boolean> => {
        setIsLoading(true);
        try {
            const storedToken = authService.getToken();
            const storedUser = authService.getUser();

            if (!storedToken) {
                setUser(null);
                setToken(null);
                setIsLoading(false);
                return false;
            }

            // Verify token with backend
            const verification = await authService.verifyToken(storedToken);

            if (verification.valid) {
                setToken(storedToken);
                setUser(storedUser || verification.user || null);
                setIsLoading(false);
                return true;
            } else {
                // Token is invalid, clear everything
                authService.removeToken();
                setUser(null);
                setToken(null);
                setIsLoading(false);
                return false;
            }
        } catch (error) {
            console.error('Auth check failed:', error);
            authService.removeToken();
            setUser(null);
            setToken(null);
            setIsLoading(false);
            return false;
        }
    };

    const login = async (email: string, password: string): Promise<AuthResponse> => {
        try {
            const response = await authService.login({ email, password });

            // Store tokens and user
            authService.setToken(response.access_token);
            if (response.refresh_token) {
                authService.setRefreshToken(response.refresh_token);
            }
            authService.setUser(response.user);

            setToken(response.access_token);
            setUser(response.user);

            return response;
        } catch (error) {
            throw error;
        }
    };

    const logout = async (): Promise<void> => {
        try {
            if (token) {
                // Call backend logout endpoint
                await authService.logout(token);
            }
        } catch (error) {
            console.error('Logout error:', error);
            // Continue with local logout even if backend call fails
        } finally {
            // Clear local storage and state
            authService.removeToken();
            setUser(null);
            setToken(null);
        }
    };

    const updateUser = (updatedUser: User) => {
        setUser(updatedUser);
        authService.setUser(updatedUser);
    };

    const value: AuthContextType = {
        user,
        token,
        isAuthenticated: !!token && !!user,
        isLoading,
        login,
        logout,
        checkAuth,
        updateUser,
    };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
