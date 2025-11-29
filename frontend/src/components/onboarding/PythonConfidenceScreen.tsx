'use client';

import { Button } from '../ui/button';
import { Card } from '../ui/card';
import { ArrowRight, Heart, Sparkles, Star } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useState } from 'react';

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
  const [hoveredCard, setHoveredCard] = useState<string | null>(null);

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
      glowColor: 'shadow-yellow-500/50',
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
      glowColor: 'shadow-green-500/50',
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
      glowColor: 'shadow-blue-500/50',
    },
  ];

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.2,
        delayChildren: 0.3,
      },
    },
  };

  const cardVariants = {
    hidden: { scale: 0.8, opacity: 0, y: 50 },
    visible: {
      scale: 1,
      opacity: 1,
      y: 0,
      transition: { type: 'spring' as const, stiffness: 100, damping: 15 },
    },
  };

  return (
    <motion.div
      className="h-screen w-full flex items-center justify-center p-4 bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 overflow-hidden"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <div className="w-full max-w-6xl flex gap-8 items-center h-full">
        {/* Character on the left */}
        <motion.div
          className="hidden lg:flex flex-col items-center space-y-6 w-80 shrink-0"
          initial={{ x: -100, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ delay: 0.2, type: 'spring', stiffness: 100 }}
        >
          <div className="relative">
            <motion.div
              className="text-8xl"
              animate={{
                y: [0, -15, 0],
                rotate: [0, -5, 5, 0],
              }}
              transition={{
                duration: 3,
                repeat: Infinity,
                ease: 'easeInOut',
              }}
            >
              🤖
            </motion.div>
            <motion.div
              className="absolute -top-2 -right-2"
              animate={{
                scale: [1, 1.3, 1],
                rotate: [0, 180, 360],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
              }}
            >
              <Sparkles className="w-8 h-8 text-yellow-400" />
            </motion.div>
          </div>

          {/* Speech bubble */}
          <motion.div
            className="bg-white rounded-3xl p-6 shadow-xl border-4 border-purple-200 relative"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.5, type: 'spring', stiffness: 200 }}
          >
            <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
              <div className="w-0 h-0 border-l-[20px] border-l-transparent border-r-[20px] border-r-transparent border-b-[20px] border-b-purple-200"></div>
              <div className="w-0 h-0 border-l-[16px] border-l-transparent border-r-[16px] border-r-transparent border-b-[16px] border-b-white absolute top-1 left-1/2 transform -translate-x-1/2"></div>
            </div>
            <p className="text-lg text-gray-700 font-medium">
              Now, how comfortable do you feel with Python? 🐍
            </p>
          </motion.div>

          {/* Progress indicator */}
          <motion.div
            className="w-full space-y-2"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.7 }}
          >
            <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
              <motion.div
                className="bg-gradient-to-r from-indigo-500 to-purple-500 h-3 rounded-full"
                initial={{ width: 0 }}
                animate={{ width: '66%' }}
                transition={{ delay: 0.8, duration: 1, ease: 'easeOut' }}
              />
            </div>
            <p className="text-sm text-gray-600 font-medium text-center">Question 2 of 3</p>
          </motion.div>
        </motion.div>

        {/* Main content on the right */}
        <motion.div
          className="flex-1 h-full flex flex-col justify-center max-h-[95vh]"
          initial={{ x: 100, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ delay: 0.3, type: 'spring', stiffness: 100 }}
        >
          <Card className="shadow-2xl border-4 border-white bg-white/95 backdrop-blur-sm flex flex-col overflow-hidden max-h-full">
            <div className="p-6 space-y-4 overflow-y-auto flex-1 flex flex-col justify-center">
              {/* Mobile character and speech bubble */}
              <div className="lg:hidden flex flex-col items-center space-y-4 mb-4 shrink-0">
                <motion.div
                  className="text-5xl"
                  animate={{ y: [0, -10, 0] }}
                  transition={{ duration: 2, repeat: Infinity }}
                >
                  🤖
                </motion.div>
                <div className="bg-purple-50 rounded-2xl p-3 border-2 border-purple-200">
                  <p className="text-sm text-gray-700 font-medium text-center">
                    How comfortable do you feel with Python? 🐍
                  </p>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <motion.div
                    className="bg-gradient-to-r from-indigo-500 to-purple-500 h-2 rounded-full"
                    initial={{ width: 0 }}
                    animate={{ width: '66%' }}
                    transition={{ duration: 1 }}
                  />
                </div>
                <p className="text-xs text-gray-600">Question 2 of 3</p>
              </div>

              {/* Question header */}
              <motion.div
                className="text-center lg:text-left shrink-0"
                initial={{ y: -20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.4 }}
              >
                <h2 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent flex items-center justify-center lg:justify-start gap-2 mb-1">
                  <Heart className="w-6 h-6 text-purple-600 fill-purple-600" />
                  Your Python Confidence
                </h2>
                <p className="text-base text-gray-600">Be honest! There's no wrong answer! 😊</p>
              </motion.div>

              {/* Options - Large emoji cards */}
              <motion.div
                className="grid grid-cols-1 md:grid-cols-3 gap-4 flex-1 items-center"
                variants={containerVariants}
                initial="hidden"
                animate="visible"
              >
                {options.map((option) => (
                  <motion.button
                    key={option.id}
                    onClick={() => onSelect(option.id)}
                    onHoverStart={() => setHoveredCard(option.id)}
                    onHoverEnd={() => setHoveredCard(null)}
                    variants={cardVariants}
                    whileHover={{ scale: 1.05, y: -5 }}
                    whileTap={{ scale: 0.95 }}
                    className={`p-4 rounded-2xl border-4 transition-all duration-300 h-full flex flex-col justify-center ${selectedOption === option.id
                      ? `${option.bgColor} ${option.borderColor} shadow-xl ${option.glowColor}`
                      : `bg-white border-gray-200 ${option.hoverColor} hover:shadow-lg`
                      }`}
                  >
                    <div className="flex flex-col items-center text-center space-y-2">
                      {/* Large emoji */}
                      <motion.div
                        className={`w-20 h-20 rounded-2xl bg-gradient-to-br ${option.color} flex items-center justify-center shadow-md`}
                        animate={
                          hoveredCard === option.id || selectedOption === option.id
                            ? {
                              rotate: [0, -10, 10, -10, 10, 0],
                              scale: [1, 1.1, 1.1, 1.1, 1.1, 1],
                            }
                            : {}
                        }
                        transition={{ duration: 0.6 }}
                      >
                        <span className="text-5xl">{option.emoji}</span>
                      </motion.div>

                      {/* Title */}
                      <h3 className="text-lg font-bold text-gray-800">
                        {option.title}
                      </h3>

                      {/* Subtitle */}
                      <p className="text-xs text-gray-600 font-medium">
                        {option.subtitle}
                      </p>

                      {/* Selection indicator */}
                      <AnimatePresence>
                        {selectedOption === option.id && (
                          <motion.div
                            initial={{ scale: 0, rotate: -180 }}
                            animate={{
                              scale: 1,
                              rotate: 0,
                              y: [0, -2, 0],
                            }}
                            exit={{ scale: 0, rotate: 180 }}
                            transition={{
                              scale: { type: 'spring', stiffness: 200, damping: 15 },
                              y: { duration: 1, repeat: Infinity },
                            }}
                          >
                            <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-full flex items-center justify-center shadow-lg">
                              <span className="text-white text-lg">✓</span>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </motion.button>
                ))}
              </motion.div>

              {/* Description for selected option */}
              <AnimatePresence mode="wait">
                {selectedOption && (
                  <motion.div
                    key={selectedOption}
                    initial={{ opacity: 0, y: 20, scale: 0.9 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -20, scale: 0.9 }}
                    transition={{ type: 'spring', stiffness: 200, damping: 20 }}
                    className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl p-4 border-2 border-indigo-200 shrink-0"
                  >
                    <p className="text-center text-base text-gray-700 flex items-center justify-center gap-2">
                      <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                      {options.find((opt) => opt.id === selectedOption)?.description}
                      <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Navigation */}
              <motion.div
                className="flex justify-end pt-2 shrink-0"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1 }}
              >
                <motion.div
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <Button
                    onClick={onNext}
                    disabled={!selectedOption}
                    className="h-12 px-8 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white text-lg rounded-xl shadow-lg disabled:opacity-50 disabled:cursor-not-allowed relative overflow-hidden group"
                  >
                    <motion.span
                      className="absolute inset-0 bg-white/20"
                      initial={{ x: '-100%' }}
                      whileHover={{ x: '100%' }}
                      transition={{ duration: 0.5 }}
                    />
                    <span className="relative flex items-center gap-2">
                      Next
                      <ArrowRight className="w-5 h-5" />
                    </span>
                  </Button>
                </motion.div>
              </motion.div>
            </div>
          </Card>
        </motion.div>
      </div>
    </motion.div>
  );
}
