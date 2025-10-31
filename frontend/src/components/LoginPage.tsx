'use client';

import { Mail, Lock, ArrowLeft, Code2, Sparkles } from 'lucide-react';
import Link from 'next/link';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { useState } from 'react';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    setSuccess(false);

    console.log('Logging in with:', { email, password });

    try {
      const response = await fetch('http://localhost:5000/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          password,
        }),
      });

      const data = await response.json();
      console.log('Login response:', data);

      if (!response.ok) {
        throw new Error(data.message || 'Login failed');
      }

      // Store JWT token
      if (data.access_token) {
        localStorage.setItem('token', data.access_token);
        localStorage.setItem('user', JSON.stringify(data.user));
      }

      setSuccess(true);
      console.log('Login successful!', data);

      // Check backend learning profile for onboarding status
      try {
        const profileRes = await fetch('http://localhost:5000/learning-profile', {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${data.access_token}`,
          },
        });
        const profile = await profileRes.json();
        // Onboarding is complete only if both fields are not null/undefined
        const onboardingCompleted = profile.codingExperience != "none" && profile.pythonFamiliarity != "none";
        setTimeout(() => {
          if (!onboardingCompleted) {
            window.location.href = '/onboarding';
          } else {
            window.location.href = '/dashboard';
          }
        }, 1000);
      } catch (err) {
        // Fallback: if error, go to onboarding
        window.location.href = '/onboarding';
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
          
          <Link href="/">
            <Button 
              variant="ghost" 
              className="flex items-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Home
            </Button>
          </Link>
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
              <div className="space-y-2">
                <Label htmlFor="email" className="text-base">Email or Nickname</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <Input
                    id="email"
                    type="text"
                    placeholder="Enter your email or nickname"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-11 h-12 text-base border-2 rounded-xl"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password" className="text-base">Password</Label>
                  <a href="#" className="text-sm text-indigo-600 hover:text-indigo-700 hover:underline">
                    Forgot password?
                  </a>
                </div>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <Input
                    id="password"
                    type="password"
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-11 h-12 text-base border-2 rounded-xl"
                    required
                  />
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

              <Button
                type="submit"
                disabled={isLoading}
                className="w-full h-13 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white text-lg rounded-xl shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? 'Signing In...' : 'Sign In'}
              </Button>

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
                <Link href="/register" className="block">
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full h-11 border-2 border-indigo-300 text-indigo-700 hover:bg-indigo-50 rounded-xl"
                  >
                    Create Free Account
                  </Button>
                </Link>
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
