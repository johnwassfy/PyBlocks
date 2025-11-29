'use client';

import { Mail, Lock, ArrowLeft, Code2, Sparkles, Shield, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { useState, useEffect } from 'react';
import { authService } from '../services/authService';

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

import { useRouter } from 'next/navigation';

export default function RegisterPage() {
  const router = useRouter();
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
    }, 500);

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
    }, 500);

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
      const data = await authService.register({
        nickname,
        email,
        password,
        avatar: avatar || null,
        ageRange,
      });

      console.log('Registration response:', data);

      if (data.warning) {
        setWarning(data.warning);
      }

      if (data.access_token) {
        localStorage.setItem('token', data.access_token);
        localStorage.setItem('user', JSON.stringify(data.user));
      }

      setSuccess(true);
      console.log('Registration successful!', data);

      setTimeout(() => {
        router.push('/onboarding');
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

          <Button
            variant="ghost"
            className="flex items-center gap-2"
            onClick={() => router.push('/')}
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Home
          </Button>
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
              <div className="space-y-0">
                {/* Block header/label */}
                <div className="bg-cyan-600 text-white px-4 py-2 rounded-t-lg">
                  <span className="text-sm font-medium">Choose Your Avatar</span>
                  <p className="text-xs text-cyan-100">Pick a character that represents you!</p>
                </div>
                {/* Block body with avatars */}
                <div className="bg-white border-2 border-t-0 border-cyan-400 rounded-b-lg shadow-[0_4px_0_0_rgba(8,145,178,0.4)] p-4">
                  <div className="grid grid-cols-4 md:grid-cols-6 gap-3">
                    {avatars.map((avatar) => (
                      <button
                        key={avatar.id}
                        type="button"
                        onClick={() => setSelectedAvatar(avatar.id)}
                        className={`aspect-square rounded-xl flex flex-col items-center justify-center p-3 transition-all ${selectedAvatar === avatar.id
                          ? 'bg-gradient-to-br from-cyan-500 to-blue-600 text-white shadow-[0_4px_0_0_rgba(8,145,178,0.5)] scale-105'
                          : 'bg-gray-50 hover:bg-gray-100 border-2 border-gray-200 shadow-[0_2px_0_0_rgba(0,0,0,0.1)]'
                          }`}
                      >
                        <span className="text-3xl mb-1">{avatar.emoji}</span>
                        <span className={`text-xs text-center leading-tight ${selectedAvatar === avatar.id ? 'text-white' : 'text-gray-600'
                          }`}>
                          {avatar.name}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Nickname Input */}
              <div className="space-y-0">
                {/* Block header/label */}
                <div className="bg-emerald-600 text-white px-4 py-2 rounded-t-lg">
                  <span className="text-sm font-medium">Your Coder Nickname</span>
                  <p className="text-xs text-emerald-100">Choose something fun! (No real names)</p>
                </div>
                {/* Block body with input */}
                <div className="relative">
                  <div className="flex items-stretch rounded-b-lg shadow-[0_4px_0_0_rgba(16,185,129,0.4)] hover:shadow-[0_6px_0_0_rgba(16,185,129,0.4)] transition-all overflow-visible">
                    {/* Icon Block with puzzle notch */}
                    <div className="relative flex items-center justify-center w-16 bg-emerald-500 rounded-bl-lg overflow-visible">
                      <Sparkles className="w-6 h-6 text-white relative z-10" />
                      {/* Puzzle notch on right side */}
                      <div className="absolute -right-2 top-1/2 -translate-y-1/2 w-4 h-6 bg-emerald-500 rounded-r-md z-20"></div>
                    </div>
                    {/* Input area with inset */}
                    <div className="flex-1 bg-white rounded-br-lg flex items-center border-2 border-l-0 border-t-0 border-emerald-400 relative">
                      <Input
                        id="nickname"
                        type="text"
                        placeholder="e.g., CodeNinja123, StarCoder, LunaBlocks"
                        value={nickname}
                        onChange={(e) => setNickname(e.target.value)}
                        className="flex-1 h-12 text-base border-0 focus:ring-0 focus:outline-none bg-transparent pr-10"
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
                  </div>
                </div>
                {nickname.length >= 3 && usernameAvailable === false && (
                  <p className="text-sm text-red-600 mt-2 ml-1">
                    ❌ This username is already taken. Try another one!
                  </p>
                )}
                {nickname.length >= 3 && usernameAvailable === true && (
                  <p className="text-sm text-green-600 mt-2 ml-1">
                    ✅ Great! This username is available!
                  </p>
                )}
              </div>

              {/* Age Range Selection */}
              <div className="space-y-0">
                {/* Block header/label */}
                <div className="bg-orange-600 text-white px-4 py-2 rounded-t-lg">
                  <span className="text-sm font-medium">How Old Are You?</span>
                  <p className="text-xs text-orange-100">This helps us show you the right lessons!</p>
                </div>
                {/* Block body with age ranges */}
                <div className="bg-white border-2 border-t-0 border-orange-400 rounded-b-lg shadow-[0_4px_0_0_rgba(249,115,22,0.4)] p-4">
                  <div className="grid grid-cols-3 gap-3">
                    {ageRanges.map((range) => (
                      <button
                        key={range.id}
                        type="button"
                        onClick={() => setAgeRange(range.id)}
                        className={`p-4 rounded-lg cursor-pointer transition-all text-center ${ageRange === range.id
                          ? 'bg-gradient-to-br from-orange-500 to-amber-600 text-white shadow-[0_3px_0_0_rgba(249,115,22,0.5)]'
                          : 'bg-gray-50 border-2 border-gray-200 hover:border-gray-300 shadow-[0_2px_0_0_rgba(0,0,0,0.1)]'
                          }`}
                      >
                        <div className={`text-base ${ageRange === range.id ? 'text-white' : 'text-gray-700'}`}>
                          {range.label}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Parent's Email */}
              <div className="space-y-0">
                {/* Block header/label */}
                <div className="bg-blue-600 text-white px-4 py-2 rounded-t-lg">
                  <span className="text-sm font-medium">Parent's Email</span>
                  <p className="text-xs text-blue-100">We'll send progress updates here (optional)</p>
                </div>
                {/* Block body with input */}
                <div className="relative">
                  <div className="flex items-stretch rounded-b-lg shadow-[0_4px_0_0_rgba(37,99,235,0.4)] hover:shadow-[0_6px_0_0_rgba(37,99,235,0.4)] transition-all overflow-visible">
                    {/* Icon Block with puzzle notch */}
                    <div className="relative flex items-center justify-center w-16 bg-blue-500 rounded-bl-lg overflow-visible">
                      <Mail className="w-6 h-6 text-white relative z-10" />
                      {/* Puzzle notch on right side */}
                      <div className="absolute -right-2 top-1/2 -translate-y-1/2 w-4 h-6 bg-blue-500 rounded-r-md z-20"></div>
                    </div>
                    {/* Input area with inset */}
                    <div className="flex-1 bg-white rounded-br-lg flex items-center border-2 border-l-0 border-t-0 border-blue-400 relative">
                      <Input
                        id="email"
                        type="email"
                        placeholder="parent@email.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="flex-1 h-12 text-base border-0 focus:ring-0 focus:outline-none bg-transparent pr-10"
                      />
                      {email.includes('@') && (
                        <div className="absolute right-3 top-1/2 -translate-y-1/2">
                          {isCheckingEmail ? (
                            <Loader2 className="w-5 h-5 text-gray-400 animate-spin" />
                          ) : null}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                {emailWarning && (
                  <p className="text-sm text-yellow-700 mt-2 ml-1">
                    ⚠️ {emailWarning} You can still register.
                  </p>
                )}
              </div>

              {/* Password */}
              <div className="space-y-0">
                {/* Block header/label */}
                <div className="bg-purple-600 text-white px-4 py-2 rounded-t-lg">
                  <span className="text-sm font-medium">Create a Password</span>
                  <p className="text-xs text-purple-100">Make it strong and easy to remember!</p>
                </div>
                {/* Block body with input */}
                <div className="relative">
                  <div className="flex items-stretch rounded-b-lg shadow-[0_4px_0_0_rgba(147,51,234,0.4)] hover:shadow-[0_6px_0_0_rgba(147,51,234,0.4)] transition-all overflow-visible">
                    {/* Icon Block with puzzle notch */}
                    <div className="relative flex items-center justify-center w-16 bg-purple-500 rounded-bl-lg overflow-visible">
                      <Lock className="w-6 h-6 text-white relative z-10" />
                      {/* Puzzle notch on right side */}
                      <div className="absolute -right-2 top-1/2 -translate-y-1/2 w-4 h-6 bg-purple-500 rounded-r-md z-20"></div>
                    </div>
                    {/* Input area with inset */}
                    <div className="flex-1 bg-white rounded-br-lg flex items-center border-2 border-l-0 border-t-0 border-purple-400">
                      <Input
                        id="password"
                        type="password"
                        placeholder="At least 8 characters"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="flex-1 h-12 text-base border-0 focus:ring-0 focus:outline-none bg-transparent"
                        required
                      />
                    </div>
                  </div>
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
                    🎉 Account created successfully! Redirecting to onboarding...
                  </p>
                </div>
              )}

              <button
                type="submit"
                disabled={isLoading || usernameAvailable === false || isCheckingUsername}
                className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white text-lg rounded-lg shadow-[0_6px_0_0_rgba(79,70,229,0.5)] hover:shadow-[0_8px_0_0_rgba(79,70,229,0.5)] active:shadow-[0_2px_0_0_rgba(79,70,229,0.5)] active:translate-y-1 transition-all py-4 font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? 'Creating Account...' : 'Start My Coding Journey! 🚀'}
              </button>

              <div className="text-center pt-2">
                <span className="text-gray-600">Already have an account? </span>
                <Link
                  href="/login"
                  className="text-indigo-600 hover:text-indigo-700 hover:underline"
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
