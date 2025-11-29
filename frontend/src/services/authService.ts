const API_BASE_URL = 'http://localhost:5000';

export interface LoginCredentials {
    email: string;
    password: string;
}

export interface RegisterData {
    nickname: string;
    email?: string;
    password: string;
    avatar: any;
    ageRange: string;
}

export interface AuthResponse {
    access_token: string;
    refresh_token?: string;
    user: {
        id: string;
        username: string;
        avatar: string;
        ageRange: string;
        xp: number;
        level: number;
    };
    warning?: string;
}

export interface VerifyTokenResponse {
    valid: boolean;
    user?: {
        id: string;
        username: string;
        avatar: string;
        ageRange: string;
    };
}

class AuthService {
    async login(credentials: LoginCredentials): Promise<AuthResponse> {
        const response = await fetch(`${API_BASE_URL}/auth/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(credentials),
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Login failed');
        }

        return await response.json();
    }

    async register(userData: RegisterData): Promise<AuthResponse> {
        const response = await fetch(`${API_BASE_URL}/auth/register`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(userData),
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Registration failed');
        }

        return await response.json();
    }

    async logout(token: string): Promise<{ message: string }> {
        const response = await fetch(`${API_BASE_URL}/auth/logout`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`,
            },
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Logout failed');
        }

        return await response.json();
    }

    async verifyToken(token: string): Promise<VerifyTokenResponse> {
        try {
            const response = await fetch(
                `${API_BASE_URL}/auth/verify?token=${encodeURIComponent(token)}`,
                {
                    method: 'GET',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                }
            );

            if (!response.ok) {
                return { valid: false };
            }

            return await response.json();
        } catch {
            return { valid: false };
        }
    }

    async refreshToken(refreshToken: string): Promise<AuthResponse> {
        const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ refreshToken }),
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Token refresh failed');
        }

        return await response.json();
    }

    // Token management helpers
    getToken(): string | null {
        return localStorage.getItem('token');
    }

    setToken(token: string): void {
        localStorage.setItem('token', token);
    }

    getRefreshToken(): string | null {
        return localStorage.getItem('refreshToken');
    }

    setRefreshToken(token: string): void {
        localStorage.setItem('refreshToken', token);
    }

    removeToken(): void {
        localStorage.removeItem('token');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('user');
    }

    getUser(): any | null {
        const userStr = localStorage.getItem('user');
        if (!userStr) return null;
        try {
            return JSON.parse(userStr);
        } catch {
            return null;
        }
    }

    setUser(user: any): void {
        localStorage.setItem('user', JSON.stringify(user));
    }
}

export const authService = new AuthService();
