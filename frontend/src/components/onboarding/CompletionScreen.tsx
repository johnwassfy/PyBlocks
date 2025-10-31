'use client';

import { Button } from '../ui/button';
import { Card } from '../ui/card';
import { Sparkles, Rocket, Trophy, Star } from 'lucide-react';
import { OnboardingData } from './OnboardingFlow';

interface CompletionScreenProps {
  onComplete: () => void;
  data: OnboardingData;
}

export default function CompletionScreen({ onComplete, data }: CompletionScreenProps) {
  const getExperienceText = () => {
    switch (data.codingExperience) {
      case 'none':
        return "starting fresh";
      case 'little':
        return "with some experience";
      case 'some':
        return "with Python knowledge";
      default:
        return "";
    }
  };

  const getConfidenceText = () => {
    switch (data.pythonConfidence) {
      case 'new':
        return "We'll start with the basics and build up from there!";
      case 'bit':
        return "We'll help you strengthen your foundation and grow!";
      case 'good':
        return "We'll challenge you with exciting projects!";
      default:
        return "";
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="w-full max-w-4xl shadow-2xl border-4 border-white bg-white overflow-hidden">
        {/* Celebration header */}
        <div className="bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 p-8 text-center relative overflow-hidden">
          <div className="absolute inset-0 opacity-20">
            <div className="absolute top-4 left-10 animate-bounce text-4xl">🎉</div>
            <div className="absolute top-10 right-16 animate-pulse text-4xl">⭐</div>
            <div className="absolute bottom-8 left-20 animate-bounce delay-100 text-4xl">🎊</div>
            <div className="absolute bottom-6 right-24 animate-pulse delay-200 text-4xl">✨</div>
            <div className="absolute top-1/2 left-1/4 animate-bounce delay-300 text-4xl">🏆</div>
            <div className="absolute top-1/3 right-1/3 animate-pulse delay-400 text-4xl">🚀</div>
          </div>
          
          <div className="relative z-10">
            <Trophy className="w-16 h-16 text-yellow-300 mx-auto mb-4 animate-bounce" />
            <h1 className="text-5xl font-bold text-white mb-2">You're All Set!</h1>
            <p className="text-xl text-white/90">Let's start your coding adventure!</p>
          </div>
        </div>

        {/* Main content */}
        <div className="p-12 space-y-8">
          {/* Character celebration */}
          <div className="flex justify-center">
            <div className="relative">
              <div className="text-9xl animate-bounce">🤖</div>
              <div className="absolute -top-4 -right-4">
                <Sparkles className="w-12 h-12 text-yellow-400 animate-pulse" />
              </div>
              <div className="absolute -bottom-2 -left-2">
                <Star className="w-10 h-10 text-purple-400 fill-purple-400 animate-spin-slow" />
              </div>
            </div>
          </div>

          {/* Personalized message */}
          <div className="bg-gradient-to-r from-indigo-50 via-purple-50 to-pink-50 rounded-3xl p-8 border-4 border-indigo-200 space-y-4">
            <div className="text-center space-y-3">
              <h2 className="text-3xl font-bold text-gray-800">
                Awesome! I know just how to help you! 🎯
              </h2>
              
              <div className="space-y-2 text-lg text-gray-700">
                <p>
                  I see you're {getExperienceText()}. That's perfect!
                </p>
                <p className="font-medium text-indigo-700">
                  {getConfidenceText()}
                </p>
              </div>
            </div>
          </div>

          {/* What's next section */}
          <div className="space-y-6">
            <h3 className="text-2xl font-bold text-gray-800 text-center">
              Here's what you can do in PyBlocks:
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-gradient-to-br from-pink-100 to-rose-100 rounded-2xl p-6 border-2 border-pink-300 text-center space-y-3">
                <div className="text-5xl">🎮</div>
                <h4 className="text-lg font-bold text-gray-800">Fun Missions</h4>
                <p className="text-sm text-gray-600">
                  Complete exciting coding challenges and earn rewards!
                </p>
              </div>

              <div className="bg-gradient-to-br from-purple-100 to-indigo-100 rounded-2xl p-6 border-2 border-purple-300 text-center space-y-3">
                <div className="text-5xl">🏆</div>
                <h4 className="text-lg font-bold text-gray-800">Earn Badges</h4>
                <p className="text-sm text-gray-600">
                  Collect awesome badges as you master new skills!
                </p>
              </div>

              <div className="bg-gradient-to-br from-blue-100 to-cyan-100 rounded-2xl p-6 border-2 border-blue-300 text-center space-y-3">
                <div className="text-5xl">🚀</div>
                <h4 className="text-lg font-bold text-gray-800">Build Projects</h4>
                <p className="text-sm text-gray-600">
                  Create amazing projects and share them with friends!
                </p>
              </div>
            </div>
          </div>

          {/* Encouragement message */}
          <div className="bg-yellow-50 border-4 border-yellow-300 rounded-2xl p-6 text-center">
            <p className="text-xl text-gray-700">
              <span className="text-2xl">💪</span> Remember: Every expert coder started exactly where you are! 
              <span className="text-2xl">⭐</span>
            </p>
          </div>

          {/* Start button */}
          <div className="text-center pt-4">
            <Button
              onClick={onComplete}
              className="h-16 px-16 bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 hover:from-indigo-700 hover:via-purple-700 hover:to-pink-700 text-white text-2xl rounded-2xl shadow-xl transform hover:scale-105 transition-all duration-200"
            >
              Start Coding Now! 
              <Rocket className="w-6 h-6 ml-3" />
            </Button>
          </div>

          {/* Progress indicator */}
          <div className="flex justify-center items-center gap-4 pt-6">
            <div className="w-full max-w-md bg-gray-200 rounded-full h-3">
              <div className="bg-gradient-to-r from-indigo-500 to-purple-500 h-3 rounded-full transition-all duration-500" style={{ width: '100%' }}></div>
            </div>
            <p className="text-sm text-gray-600 font-medium whitespace-nowrap">Complete! 🎉</p>
          </div>
        </div>
      </Card>
    </div>
  );
}
