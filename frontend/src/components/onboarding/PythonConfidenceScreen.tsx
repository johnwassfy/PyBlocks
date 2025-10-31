'use client';

import { Button } from '../ui/button';
import { Card } from '../ui/card';
import { ArrowRight, Heart } from 'lucide-react';

interface PythonConfidenceScreenProps {
  selectedOption: 'new' | 'bit' | 'good' | null;
  onSelect: (option: string) => void;
  onNext: () => void;
}

export default function PythonConfidenceScreen({
  selectedOption,
  onSelect,
  onNext,
}: PythonConfidenceScreenProps) {
  const options = [
    {
      id: 'new',
      emoji: '😅',
      title: "I'm new to it",
      subtitle: "No worries! We'll start from the basics!",
      color: 'from-yellow-400 to-orange-400',
      bgColor: 'bg-yellow-50',
      borderColor: 'border-yellow-300',
      hoverColor: 'hover:border-yellow-500',
      description: 'Perfect for beginners! We\'ll take it step by step.',
    },
    {
      id: 'bit',
      emoji: '🙂',
      title: 'I know a bit',
      subtitle: "Great! You have a foundation to build on!",
      color: 'from-green-400 to-emerald-400',
      bgColor: 'bg-green-50',
      borderColor: 'border-green-300',
      hoverColor: 'hover:border-green-500',
      description: 'Awesome! We\'ll help you level up your skills.',
    },
    {
      id: 'good',
      emoji: '😎',
      title: "I'm pretty good",
      subtitle: "Excellent! Ready for some challenges!",
      color: 'from-blue-400 to-indigo-400',
      bgColor: 'bg-blue-50',
      borderColor: 'border-blue-300',
      hoverColor: 'hover:border-blue-500',
      description: 'Amazing! Let\'s push your skills even further.',
    },
  ];

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-6xl flex gap-8 items-start">
        {/* Character on the left */}
        <div className="hidden lg:flex flex-col items-center space-y-6 w-80 sticky top-8">
          <div className="relative">
            <div className="text-9xl animate-bounce">🤖</div>
            <div className="absolute -top-2 -right-2 animate-pulse">✨</div>
          </div>
          
          {/* Speech bubble */}
          <div className="bg-white rounded-3xl p-6 shadow-xl border-4 border-purple-200 relative">
            <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
              <div className="w-0 h-0 border-l-[20px] border-l-transparent border-r-[20px] border-r-transparent border-b-[20px] border-b-purple-200"></div>
              <div className="w-0 h-0 border-l-[16px] border-l-transparent border-r-[16px] border-r-transparent border-b-[16px] border-b-white absolute top-1 left-1/2 transform -translate-x-1/2"></div>
            </div>
            <p className="text-xl text-gray-700 font-medium">
              Now, how comfortable do you feel with Python? 🐍
            </p>
          </div>

          {/* Progress indicator */}
          <div className="w-full bg-gray-200 rounded-full h-3">
            <div className="bg-gradient-to-r from-indigo-500 to-purple-500 h-3 rounded-full transition-all duration-500" style={{ width: '66%' }}></div>
          </div>
          <p className="text-sm text-gray-600 font-medium">Question 2 of 3</p>
        </div>

        {/* Main content on the right */}
        <Card className="flex-1 shadow-2xl border-4 border-white bg-white">
          <div className="p-8 space-y-8">
            {/* Mobile character and speech bubble */}
            <div className="lg:hidden flex flex-col items-center space-y-4 mb-8">
              <div className="text-6xl animate-bounce">🤖</div>
              <div className="bg-purple-50 rounded-2xl p-4 border-2 border-purple-200">
                <p className="text-lg text-gray-700 font-medium text-center">
                  How comfortable do you feel with Python? 🐍
                </p>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div className="bg-gradient-to-r from-indigo-500 to-purple-500 h-2 rounded-full" style={{ width: '66%' }}></div>
              </div>
              <p className="text-xs text-gray-600">Question 2 of 3</p>
            </div>

            {/* Question header */}
            <div className="text-center lg:text-left">
              <h2 className="text-3xl md:text-4xl font-bold text-gray-800 flex items-center justify-center lg:justify-start gap-3 mb-2">
                <Heart className="w-8 h-8 text-purple-600 fill-purple-600" />
                Your Python Confidence
              </h2>
              <p className="text-lg text-gray-600">Be honest! There's no wrong answer! 😊</p>
            </div>

            {/* Options - Large emoji cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {options.map((option) => (
                <button
                  key={option.id}
                  onClick={() => onSelect(option.id)}
                  className={`p-8 rounded-3xl border-4 transition-all duration-200 transform hover:scale-105 hover:shadow-xl ${
                    selectedOption === option.id
                      ? `${option.bgColor} ${option.borderColor} shadow-xl scale-105`
                      : `bg-white border-gray-200 ${option.hoverColor}`
                  }`}
                >
                  <div className="flex flex-col items-center text-center space-y-4">
                    {/* Large emoji */}
                    <div className={`w-32 h-32 rounded-3xl bg-gradient-to-br ${option.color} flex items-center justify-center shadow-lg`}>
                      <span className="text-7xl">{option.emoji}</span>
                    </div>

                    {/* Title */}
                    <h3 className="text-2xl font-bold text-gray-800">
                      {option.title}
                    </h3>

                    {/* Subtitle */}
                    <p className="text-sm text-gray-600 font-medium">
                      {option.subtitle}
                    </p>

                    {/* Selection indicator */}
                    {selectedOption === option.id && (
                      <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-full flex items-center justify-center animate-bounce">
                        <span className="text-white text-xl">✓</span>
                      </div>
                    )}
                  </div>
                </button>
              ))}
            </div>

            {/* Description for selected option */}
            {selectedOption && (
              <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-2xl p-6 border-2 border-indigo-200 animate-fade-in">
                <p className="text-center text-lg text-gray-700">
                  {options.find((opt) => opt.id === selectedOption)?.description}
                </p>
              </div>
            )}

            {/* Navigation */}
            <div className="flex justify-end pt-4">
              <Button
                onClick={onNext}
                disabled={!selectedOption}
                className="h-14 px-10 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white text-lg rounded-xl shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-105 transition-all duration-200"
              >
                Next
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
