'use client';

import { Mail, Lock, ArrowLeft, Code2, Sparkles } from 'lucide-react';
import Link from 'next/link';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const { login, isAuthenticated } = useAuth();

  // Note: Automatic redirect removed to prevent race condition with profile fetch
  // The redirect is now handled manually after checking the learning profile

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    setSuccess(false);

    try {
      const data = await login(email, password);
      console.log('Login successful!', data);

      // Check backend learning profile for onboarding status
      try {
        console.log('Login response data:', data);
        console.log('Access Token:', data.access_token);
        const profileRes = await fetch('http://localhost:5000/learning-profile', {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${data.access_token}`,
          },
        });
        console.log('Profile fetch status:', profileRes.status);
        if (profileRes.ok) {
          const profile = await profileRes.json();
          console.log('Profile data:', profile);
          // Onboarding is complete only if both fields are not "none"
          const onboardingCompleted = profile.codingExperience !== "none" && profile.pythonFamiliarity !== "none";

          // Show success message briefly before redirect
          setSuccess(true);
          setTimeout(() => {
            if (!onboardingCompleted) {
              window.location.href = '/onboarding';
            } else {
              window.location.href = '/dashboard';
            }
          }, 500); // Reduced to 500ms to minimize race condition
        } else {
          // If profile not found (404) or other error, redirect to onboarding to create one
          const errorText = await profileRes.text();
          console.warn('Profile fetch failed:', profileRes.status, errorText);
          setSuccess(true);
          setTimeout(() => {
            window.location.href = '/onboarding';
          }, 500);
        }
      } catch (err) {
        console.error('Error checking profile:', err);
        // Fallback: if error, go to onboarding
        setSuccess(true);
        setTimeout(() => {
          window.location.href = '/onboarding';
        }, 500);
      }

    } catch (err) {
      console.error('Login error:', err);
      setError(err instanceof Error ? err.message : 'Login failed. Please check your credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-indigo-50 via-purple-50 to-pink-50 flex flex-col">
      {/* Header */}
      <div className="bg-white border-b shadow-sm">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
            <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center shadow-md">
              <Code2 className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="text-xl text-gray-900">PyBlocks</div>
              <div className="text-xs text-gray-500">Learn Python, Have Fun!</div>
            </div>
          </Link>

          <Button
            variant="ghost"
            className="flex items-center gap-2"
            onClick={() => router.push('/')} // Use router.push
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Home
          </Button>
        </div>
      </div>

      {/* Login Form */}
      <div className="flex-1 flex items-center justify-center p-4 py-12">
        <Card className="w-full max-w-md shadow-xl border-2 border-white bg-white">
          <CardHeader className="space-y-1 text-center pb-6 border-b bg-gradient-to-r from-indigo-50 to-purple-50">
            <div className="flex items-center justify-center gap-2 mb-2">
              <Sparkles className="w-6 h-6 text-indigo-600" />
              <CardTitle className="text-3xl">Welcome Back, Coder!</CardTitle>
            </div>
            <CardDescription className="text-base">
              Sign in to continue your coding adventure 🚀
            </CardDescription>
          </CardHeader>

          <CardContent className="pt-6">
            <form onSubmit={handleLogin} className="space-y-5">
              <div className="space-y-0">
                {/* Block header/label */}
                <div className="bg-indigo-600 text-white px-4 py-2 rounded-t-lg text-sm font-medium">
                  Username
                </div>
                {/* Block body with input */}
                <div className="relative">
                  <div className="flex items-stretch rounded-b-lg shadow-[0_4px_0_0_rgba(79,70,229,0.4)] hover:shadow-[0_6px_0_0_rgba(79,70,229,0.4)] transition-all overflow-visible">
                    {/* Icon Block with puzzle notch */}
                    <div className="relative flex items-center justify-center w-16 bg-indigo-500 rounded-bl-lg overflow-visible">
                      <Mail className="w-6 h-6 text-white relative z-10" />
                      {/* Puzzle notch on right side */}
                      <div className="absolute -right-2 top-1/2 -translate-y-1/2 w-4 h-6 bg-indigo-500 rounded-r-md z-20"></div>
                    </div>
                    {/* Input area with inset */}
                    <div className="flex-1 bg-white rounded-br-lg flex items-center border-2 border-l-0 border-t-0 border-indigo-400 relative">
                      <Input
                        id="email"
                        type="text"
                        placeholder="Enter your Username"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="flex-1 h-12 text-base border-0 focus:ring-0 focus:outline-none bg-transparent"
                        required
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-0">
                {/* Block header/label with forgot password link */}
                <div className="bg-purple-600 text-white px-4 py-2 rounded-t-lg flex items-center justify-between">
                  <span className="text-sm font-medium">Password</span>
                  <a href="#" className="text-xs text-purple-100 hover:text-white hover:underline">
                    Forgot?
                  </a>
                </div>
                {/* Block body with input */}
                <div className="relative">
                  <div className="flex items-stretch rounded-b-lg shadow-[0_4px_0_0_rgba(147,51,234,0.4)] hover:shadow-[0_6px_0_0_rgba(147,51,234,0.4)] transition-all">
                    {/* Icon Block with puzzle notch */}
                    <div className="relative flex items-center justify-center w-16 bg-purple-500 rounded-bl-lg">
                      <Lock className="w-6 h-6 text-white relative z-10" />
                      {/* Puzzle notch on right side */}
                      <div className="absolute -right-2 top-1/2 -translate-y-1/2 w-4 h-6 bg-purple-500 rounded-r-md"></div>
                    </div>
                    {/* Input area with inset */}
                    <div className="flex-1 bg-white rounded-br-lg flex items-center border-2 border-l-0 border-t-0 border-purple-400">
                      <Input
                        id="password"
                        type="password"
                        placeholder="Enter your password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="flex-1 h-12 text-base border-0 focus:ring-0 focus:outline-none bg-transparent"
                        required
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Error Message */}
              {error && (
                <div className="bg-red-50 border-2 border-red-200 rounded-xl p-4">
                  <p className="text-sm text-red-800">{error}</p>
                </div>
              )}

              {/* Success Message */}
              {success && (
                <div className="bg-green-50 border-2 border-green-200 rounded-xl p-4">
                  <p className="text-sm text-green-800">
                    ✅ Login successful! Redirecting...
                  </p>
                </div>
              )}

              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white text-lg rounded-lg shadow-[0_6px_0_0_rgba(79,70,229,0.5)] hover:shadow-[0_8px_0_0_rgba(79,70,229,0.5)] active:shadow-[0_2px_0_0_rgba(79,70,229,0.5)] active:translate-y-1 transition-all py-4 font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? 'Signing In...' : '🚀 Sign In'}
              </button>

              <div className="relative my-6">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t-2 border-gray-200"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-3 bg-white text-gray-500">New to PyBlocks?</span>
                </div>
              </div>

              <div className="bg-gradient-to-r from-blue-50 to-purple-50 border-2 border-indigo-200 rounded-xl p-4 text-center">
                <p className="text-gray-700 mb-3">
                  Don't have an account yet?
                </p>
                <Button
                  type="button"
                  variant="outline"
                  className="w-full h-11 border-2 border-indigo-300 text-indigo-700 hover:bg-indigo-50 rounded-xl"
                  onClick={() => router.push('/register')}
                >
                  Create Free Account
                </Button>
              </div>
            </form>

            {/* Fun encouragement */}
            <div className="mt-6 text-center">
              <p className="text-sm text-gray-500">
                🎮 Over 10,000 kids are learning to code right now!
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
