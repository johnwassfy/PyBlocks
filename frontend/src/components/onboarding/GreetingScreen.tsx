'use client';

import { Button } from '../ui/button';
import { Card } from '../ui/card';
import { Sparkles, Code2, Star } from 'lucide-react';

interface GreetingScreenProps {
  onNext: () => void;
}

export default function GreetingScreen({ onNext }: GreetingScreenProps) {
  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="w-full max-w-3xl shadow-2xl border-4 border-white bg-white overflow-hidden">
        {/* Decorative header */}
        <div className="bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 p-8 text-center relative overflow-hidden">
          <div className="absolute inset-0 opacity-20">
            <div className="absolute top-4 left-10 animate-bounce">⭐</div>
            <div className="absolute top-10 right-16 animate-pulse">🚀</div>
            <div className="absolute bottom-8 left-20 animate-bounce delay-100">✨</div>
            <div className="absolute bottom-6 right-24 animate-pulse delay-200">🎮</div>
          </div>
          
          <div className="relative z-10">
            <div className="flex items-center justify-center gap-2 mb-4">
              <Code2 className="w-12 h-12 text-white" />
              <h1 className="text-5xl font-bold text-white">PyBlocks</h1>
            </div>
            <p className="text-xl text-white/90">Learn Python, Have Fun!</p>
          </div>
        </div>

        {/* Main content */}
        <div className="p-12 text-center space-y-8">
          {/* Friendly AI Character */}
          <div className="flex justify-center">
            <div className="relative">
              <div className="text-9xl animate-bounce">🤖</div>
              <div className="absolute -top-2 -right-2">
                <Sparkles className="w-8 h-8 text-yellow-400 animate-pulse" />
              </div>
            </div>
          </div>

          {/* Welcome message */}
          <div className="space-y-4">
            <h2 className="text-4xl font-bold text-gray-800 flex items-center justify-center gap-3">
              <Star className="w-8 h-8 text-yellow-400 fill-yellow-400" />
              Welcome, Future Coder!
              <Star className="w-8 h-8 text-yellow-400 fill-yellow-400" />
            </h2>
            
            <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-3xl p-8 border-4 border-indigo-200 relative">
              {/* Speech bubble tail */}
              <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                <div className="w-0 h-0 border-l-[20px] border-l-transparent border-r-[20px] border-r-transparent border-b-[20px] border-b-indigo-200"></div>
                <div className="w-0 h-0 border-l-[16px] border-l-transparent border-r-[16px] border-r-transparent border-b-[16px] border-b-indigo-50 absolute top-1 left-1/2 transform -translate-x-1/2"></div>
              </div>
              
              <p className="text-2xl text-gray-700 leading-relaxed">
                Hi there! I'm <span className="font-bold text-indigo-600">CodeBot</span>, your friendly coding companion! 
                🎉
              </p>
              <p className="text-xl text-gray-600 mt-4">
                I'm here to help you learn Python through fun challenges and awesome projects!
              </p>
            </div>

            <p className="text-lg text-gray-600">
              Let's get to know each other! I'll ask you a few quick questions so I can make your learning adventure perfect for you! 🚀
            </p>
          </div>

          {/* Fun decorative elements */}
          <div className="flex justify-center gap-6 text-5xl">
            <span className="animate-bounce delay-100">🎨</span>
            <span className="animate-bounce delay-200">🎮</span>
            <span className="animate-bounce delay-300">🏆</span>
            <span className="animate-bounce delay-400">⚡</span>
          </div>

          {/* Start button */}
          <div className="pt-8">
            <Button
              onClick={onNext}
              className="h-16 px-12 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white text-2xl rounded-2xl shadow-xl transform hover:scale-105 transition-all duration-200"
            >
              Let's Get Started! 🚀
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
