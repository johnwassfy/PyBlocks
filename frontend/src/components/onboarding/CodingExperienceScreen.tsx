'use client';

import { Button } from '../ui/button';
import { Card } from '../ui/card';
import { ArrowRight, Code2 } from 'lucide-react';

interface CodingExperienceScreenProps {
  selectedOption: 'none' | 'little' | 'some' | null;
  onSelect: (option: string) => void;
  onNext: () => void;
}

export default function CodingExperienceScreen({
  selectedOption,
  onSelect,
  onNext,
}: CodingExperienceScreenProps) {
  const options = [
    {
      id: 'none',
      title: 'Nope, this is my first time!',
      emoji: '🌟',
      description: 'Awesome! Everyone starts somewhere!',
      color: 'from-pink-400 to-rose-400',
      bgColor: 'bg-pink-50',
      borderColor: 'border-pink-300',
      hoverColor: 'hover:border-pink-500',
    },
    {
      id: 'little',
      title: "A little — I've played with code before!",
      emoji: '🎮',
      description: 'Cool! You have some experience!',
      color: 'from-purple-400 to-indigo-400',
      bgColor: 'bg-purple-50',
      borderColor: 'border-purple-300',
      hoverColor: 'hover:border-purple-500',
    },
    {
      id: 'some',
      title: 'Yes, I already know some Python!',
      emoji: '🚀',
      description: 'Amazing! You\'re ahead of the game!',
      color: 'from-blue-400 to-cyan-400',
      bgColor: 'bg-blue-50',
      borderColor: 'border-blue-300',
      hoverColor: 'hover:border-blue-500',
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
          <div className="bg-white rounded-3xl p-6 shadow-xl border-4 border-indigo-200 relative">
            <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
              <div className="w-0 h-0 border-l-[20px] border-l-transparent border-r-[20px] border-r-transparent border-b-[20px] border-b-indigo-200"></div>
              <div className="w-0 h-0 border-l-[16px] border-l-transparent border-r-[16px] border-r-transparent border-b-[16px] border-b-white absolute top-1 left-1/2 transform -translate-x-1/2"></div>
            </div>
            <p className="text-xl text-gray-700 font-medium">
              Let's start with an easy one! Have you ever tried coding before? 🤔
            </p>
          </div>

          {/* Progress indicator */}
          <div className="w-full bg-gray-200 rounded-full h-3">
            <div className="bg-gradient-to-r from-indigo-500 to-purple-500 h-3 rounded-full transition-all duration-500" style={{ width: '33%' }}></div>
          </div>
          <p className="text-sm text-gray-600 font-medium">Question 1 of 3</p>
        </div>

        {/* Main content on the right */}
        <Card className="flex-1 shadow-2xl border-4 border-white bg-white">
          <div className="p-8 space-y-8">
            {/* Mobile character and speech bubble */}
            <div className="lg:hidden flex flex-col items-center space-y-4 mb-8">
              <div className="text-6xl animate-bounce">🤖</div>
              <div className="bg-indigo-50 rounded-2xl p-4 border-2 border-indigo-200">
                <p className="text-lg text-gray-700 font-medium text-center">
                  Have you ever tried coding before? 🤔
                </p>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div className="bg-gradient-to-r from-indigo-500 to-purple-500 h-2 rounded-full" style={{ width: '33%' }}></div>
              </div>
              <p className="text-xs text-gray-600">Question 1 of 3</p>
            </div>

            {/* Question header */}
            <div className="text-center lg:text-left">
              <h2 className="text-3xl md:text-4xl font-bold text-gray-800 flex items-center justify-center lg:justify-start gap-3 mb-2">
                <Code2 className="w-8 h-8 text-indigo-600" />
                Your Coding Journey
              </h2>
              <p className="text-lg text-gray-600">Choose the option that fits you best!</p>
            </div>

            {/* Options */}
            <div className="space-y-4">
              {options.map((option) => (
                <button
                  key={option.id}
                  onClick={() => onSelect(option.id)}
                  className={`w-full p-6 rounded-2xl border-4 transition-all duration-200 transform hover:scale-102 hover:shadow-lg ${
                    selectedOption === option.id
                      ? `${option.bgColor} ${option.borderColor} shadow-lg scale-102`
                      : `bg-white border-gray-200 ${option.hoverColor}`
                  }`}
                >
                  <div className="flex items-center gap-6">
                    {/* Emoji icon */}
                    <div className="flex-shrink-0">
                      <div className={`w-20 h-20 rounded-2xl bg-gradient-to-br ${option.color} flex items-center justify-center shadow-md`}>
                        <span className="text-4xl">{option.emoji}</span>
                      </div>
                    </div>

                    {/* Text content */}
                    <div className="flex-1 text-left">
                      <h3 className="text-xl font-bold text-gray-800 mb-1">
                        {option.title}
                      </h3>
                      <p className="text-sm text-gray-600">{option.description}</p>
                    </div>

                    {/* Selection indicator */}
                    {selectedOption === option.id && (
                      <div className="flex-shrink-0">
                        <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-full flex items-center justify-center">
                          <span className="text-white text-lg">✓</span>
                        </div>
                      </div>
                    )}
                  </div>
                </button>
              ))}
            </div>

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
