'use client';

import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';

interface ProtectedRouteProps {
    children: React.ReactNode;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
    const { isAuthenticated, isLoading, checkAuth } = useAuth();
    const [isChecking, setIsChecking] = useState(true);

    useEffect(() => {
        const verifyAuth = async () => {
            setIsChecking(true);
            const authenticated = await checkAuth();

            if (!authenticated) {
                // Redirect to login
                window.location.href = '/login';
            }
            setIsChecking(false);
        };

        verifyAuth();
    }, []);

    // Show loading state while checking authentication
    if (isLoading || isChecking) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-100 via-purple-50 to-pink-100">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-indigo-600 mx-auto mb-4"></div>
                    <p className="text-lg text-gray-600">Verifying your session...</p>
                </div>
            </div>
        );
    }

    // If not authenticated, don't render children (will redirect)
    if (!isAuthenticated) {
        return null;
    }

    // Render protected content
    return <>{children}</>;
};

export default ProtectedRoute;
