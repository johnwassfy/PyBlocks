'use client';

import { Mail, Lock, ArrowLeft, Code2, Sparkles, Shield, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { useState, useEffect } from 'react';

const avatars = [
  { id: '1', emoji: '🐱', name: 'Cool Cat' },
  { id: '2', emoji: '🦊', name: 'Clever Fox' },
  { id: '3', emoji: '🐼', name: 'Panda Pro' },
  { id: '4', emoji: '🦁', name: 'Brave Lion' },
  { id: '5', emoji: '🐸', name: 'Happy Frog' },
  { id: '6', emoji: '🦉', name: 'Wise Owl' },
  { id: '7', emoji: '🦄', name: 'Magic Unicorn' },
  { id: '8', emoji: '🐲', name: 'Dragon Coder' },
  { id: '9', emoji: '🤖', name: 'Robo Coder' },
  { id: '10', emoji: '🚀', name: 'Space Explorer' },
  { id: '11', emoji: '⭐', name: 'Star Coder' },
  { id: '12', emoji: '🎮', name: 'Game Master' },
];

const ageRanges = [
  { id: '8-10', label: '8-10 years old' },
  { id: '11-13', label: '11-13 years old' },
  { id: '14+', label: '14+ years old' },
];

export default function RegisterPage() {
  const [nickname, setNickname] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [selectedAvatar, setSelectedAvatar] = useState('1');
  const [ageRange, setAgeRange] = useState('8-10');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [warning, setWarning] = useState('');
  const [success, setSuccess] = useState(false);

  // Real-time validation states
  const [isCheckingUsername, setIsCheckingUsername] = useState(false);
  const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(null);
  const [isCheckingEmail, setIsCheckingEmail] = useState(false);
  const [emailWarning, setEmailWarning] = useState('');

  // Debounced username check
  useEffect(() => {
    if (!nickname || nickname.length < 3) {
      setUsernameAvailable(null);
      return;
    }

    const timer = setTimeout(async () => {
      setIsCheckingUsername(true);
      try {
        const response = await fetch(`http://localhost:5000/auth/check-username?username=${encodeURIComponent(nickname)}`);
        const data = await response.json();
        setUsernameAvailable(data.available);
      } catch (err) {
        console.error('Error checking username:', err);
      } finally {
        setIsCheckingUsername(false);
      }
    }, 500); // Wait 500ms after user stops typing

    return () => clearTimeout(timer);
  }, [nickname]);

  // Debounced email check
  useEffect(() => {
    if (!email || !email.includes('@')) {
      setEmailWarning('');
      return;
    }

    const timer = setTimeout(async () => {
      setIsCheckingEmail(true);
      try {
        const response = await fetch(`http://localhost:5000/auth/check-email?email=${encodeURIComponent(email)}`);
        const data = await response.json();
        setEmailWarning(data.exists ? 'This email is already associated with another account.' : '');
      } catch (err) {
        console.error('Error checking email:', err);
      } finally {
        setIsCheckingEmail(false);
      }
    }, 500); // Wait 500ms after user stops typing

    return () => clearTimeout(timer);
  }, [email]);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    setWarning('');
    setSuccess(false);

    const avatar = avatars.find(a => a.id === selectedAvatar);
    
    console.log('Registering with:', { 
      nickname, 
      email, 
      password, 
      avatar, 
      ageRange 
    });

    try {
      const response = await fetch('http://localhost:5000/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          nickname,
          email,
          password,
          avatar,
          ageRange,
        }),
      });

      const data = await response.json();
      console.log('Registration response:', data);

      if (!response.ok) {
        throw new Error(data.message || 'Registration failed');
      }

      // Check for email warning (non-blocking)
      if (data.warning) {
        setWarning(data.warning);
      }

      // Store JWT token
      if (data.access_token) {
        localStorage.setItem('token', data.access_token);
        localStorage.setItem('user', JSON.stringify(data.user));
      }

      setSuccess(true);
      console.log('Registration successful!', data);

      // Redirect to login page after 2 seconds
      setTimeout(() => {
        window.location.href = '/login';
      }, 2000);

    } catch (err) {
      console.error('Registration error:', err);
      setError(err instanceof Error ? err.message : 'Registration failed. Please try again.');
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

      {/* Register Form */}
      <div className="flex-1 flex items-center justify-center p-4 py-12">
        <Card className="w-full max-w-2xl shadow-xl border-2 border-white bg-white">
          <CardHeader className="space-y-1 text-center pb-6 border-b bg-gradient-to-r from-indigo-50 to-purple-50">
            <div className="flex items-center justify-center gap-2 mb-2">
              <Sparkles className="w-6 h-6 text-indigo-600" />
              <CardTitle className="text-3xl">Create Your Coder Account!</CardTitle>
              <Sparkles className="w-6 h-6 text-purple-600" />
            </div>
            <CardDescription className="text-base">
              Pick your avatar, choose a cool nickname, and start your coding adventure! 🚀
            </CardDescription>
          </CardHeader>
          
          <CardContent className="pt-6">
            <form onSubmit={handleRegister} className="space-y-6">
              {/* Avatar Selection */}
              <div className="space-y-3">
                <Label className="text-lg">Choose Your Avatar</Label>
                <p className="text-sm text-gray-500">Pick a character that represents you!</p>
                <div className="grid grid-cols-4 md:grid-cols-6 gap-3">
                  {avatars.map((avatar) => (
                    <button
                      key={avatar.id}
                      type="button"
                      onClick={() => setSelectedAvatar(avatar.id)}
                      className={`aspect-square rounded-2xl flex flex-col items-center justify-center p-3 transition-all ${
                        selectedAvatar === avatar.id
                          ? 'bg-gradient-to-br from-indigo-500 to-purple-600 text-white shadow-lg scale-105 border-4 border-indigo-300'
                          : 'bg-gray-50 hover:bg-gray-100 border-2 border-gray-200'
                      }`}
                    >
                      <span className="text-3xl mb-1">{avatar.emoji}</span>
                      <span className={`text-xs text-center leading-tight ${
                        selectedAvatar === avatar.id ? 'text-white' : 'text-gray-600'
                      }`}>
                        {avatar.name}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Nickname Input */}
              <div className="space-y-2">
                <Label htmlFor="nickname" className="text-lg">Your Coder Nickname</Label>
                <p className="text-sm text-gray-500">Choose something fun! (No real names)</p>
                <div className="relative">
                  <Input
                    id="nickname"
                    type="text"
                    placeholder="e.g., CodeNinja123, StarCoder, LunaBlocks"
                    value={nickname}
                    onChange={(e) => setNickname(e.target.value)}
                    className={`h-12 text-base border-2 rounded-xl pr-10 ${
                      nickname.length >= 3 && usernameAvailable === false
                        ? 'border-red-400 focus:border-red-500'
                        : nickname.length >= 3 && usernameAvailable === true
                        ? 'border-green-400 focus:border-green-500'
                        : ''
                    }`}
                    required
                  />
                  {nickname.length >= 3 && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                      {isCheckingUsername ? (
                        <Loader2 className="w-5 h-5 text-gray-400 animate-spin" />
                      ) : usernameAvailable === true ? (
                        <CheckCircle className="w-5 h-5 text-green-500" />
                      ) : usernameAvailable === false ? (
                        <XCircle className="w-5 h-5 text-red-500" />
                      ) : null}
                    </div>
                  )}
                </div>
                {nickname.length >= 3 && usernameAvailable === false && (
                  <p className="text-sm text-red-600">
                    ❌ This username is already taken. Try another one!
                  </p>
                )}
                {nickname.length >= 3 && usernameAvailable === true && (
                  <p className="text-sm text-green-600">
                    ✅ Great! This username is available!
                  </p>
                )}
              </div>

              {/* Age Range Selection */}
              <div className="space-y-3">
                <Label className="text-lg">How Old Are You?</Label>
                <p className="text-sm text-gray-500">This helps us show you the right lessons!</p>
                <div className="grid grid-cols-3 gap-3">
                  {ageRanges.map((range) => (
                    <button
                      key={range.id}
                      type="button"
                      onClick={() => setAgeRange(range.id)}
                      className={`p-4 rounded-xl border-2 cursor-pointer transition-all text-center ${
                        ageRange === range.id 
                          ? 'bg-indigo-50 border-indigo-400 shadow-md' 
                          : 'bg-white border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="text-base">{range.label}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Parent's Email */}
              <div className="space-y-2">
                <Label htmlFor="email" className="text-lg">Parent's Email</Label>
                <p className="text-sm text-gray-500">We'll send progress updates here (optional)</p>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="parent@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className={`pl-11 pr-10 h-12 text-base border-2 rounded-xl ${
                      emailWarning ? 'border-yellow-400' : ''
                    }`}
                  />
                  {email.includes('@') && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                      {isCheckingEmail ? (
                        <Loader2 className="w-5 h-5 text-gray-400 animate-spin" />
                      ) : null}
                    </div>
                  )}
                </div>
                {emailWarning && (
                  <p className="text-sm text-yellow-700">
                    ⚠️ {emailWarning} You can still register.
                  </p>
                )}
              </div>

              {/* Password */}
              <div className="space-y-2">
                <Label htmlFor="password" className="text-lg">Create a Password</Label>
                <p className="text-sm text-gray-500">Make it strong and easy to remember!</p>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <Input
                    id="password"
                    type="password"
                    placeholder="At least 8 characters"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-11 h-12 text-base border-2 rounded-xl"
                    required
                  />
                </div>
              </div>

              {/* Safety Notice */}
              <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-4">
                <div className="flex items-start gap-3">
                  <Shield className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-sm mb-1 text-blue-900">Your Safety Matters!</h4>
                    <p className="text-sm text-blue-800">
                      We never share your info. You'll use your nickname in PyBlocks - no real names needed!
                    </p>
                  </div>
                </div>
              </div>

              {/* Error Message */}
              {error && (
                <div className="bg-red-50 border-2 border-red-200 rounded-xl p-4">
                  <p className="text-sm text-red-800">{error}</p>
                </div>
              )}

              {/* Warning Message */}
              {warning && (
                <div className="bg-yellow-50 border-2 border-yellow-200 rounded-xl p-4">
                  <p className="text-sm text-yellow-800">⚠️ {warning}</p>
                </div>
              )}

              {/* Success Message */}
              {success && (
                <div className="bg-green-50 border-2 border-green-200 rounded-xl p-4">
                  <p className="text-sm text-green-800">
                    🎉 Account created successfully! Redirecting to login...
                  </p>
                </div>
              )}

              <Button
                type="submit"
                disabled={isLoading || usernameAvailable === false || isCheckingUsername}
                className="w-full h-14 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white text-lg rounded-xl shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? 'Creating Account...' : 'Start My Coding Journey! 🚀'}
              </Button>

              <div className="text-center pt-2">
                <span className="text-gray-600">Already have an account? </span>
                <Link
                  href="/login"
                  className="text-indigo-600 hover:text-indigo-700"
                >
                  Sign in here
                </Link>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
