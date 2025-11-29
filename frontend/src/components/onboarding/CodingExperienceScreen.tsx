'use client';

import { Button } from '../ui/button';
import { Card } from '../ui/card';
import { ArrowRight, Code2, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect } from 'react';

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
  const [hoveredCard, setHoveredCard] = useState<string | null>(null);

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
      glowColor: 'shadow-pink-500/50',
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
      glowColor: 'shadow-purple-500/50',
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
      glowColor: 'shadow-blue-500/50',
    },
  ];

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.15,
        delayChildren: 0.2,
      },
    },
  };

  const cardVariants = {
    hidden: { x: -50, opacity: 0 },
    visible: {
      x: 0,
      opacity: 1,
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
                rotate: [0, 5, -5, 0],
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
                scale: [1, 1.2, 1],
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
            className="bg-white rounded-3xl p-6 shadow-xl border-4 border-indigo-200 relative"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.5, type: 'spring', stiffness: 200 }}
          >
            <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
              <div className="w-0 h-0 border-l-[20px] border-l-transparent border-r-[20px] border-r-transparent border-b-[20px] border-b-indigo-200"></div>
              <div className="w-0 h-0 border-l-[16px] border-l-transparent border-r-[16px] border-r-transparent border-b-[16px] border-b-white absolute top-1 left-1/2 transform -translate-x-1/2"></div>
            </div>
            <p className="text-lg text-gray-700 font-medium">
              Let's start with an easy one! Have you ever tried coding before? 🤔
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
                animate={{ width: '33%' }}
                transition={{ delay: 0.8, duration: 1, ease: 'easeOut' }}
              />
            </div>
            <p className="text-sm text-gray-600 font-medium text-center">Question 1 of 3</p>
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
                <div className="bg-indigo-50 rounded-2xl p-3 border-2 border-indigo-200">
                  <p className="text-sm text-gray-700 font-medium text-center">
                    Have you ever tried coding before? 🤔
                  </p>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <motion.div
                    className="bg-gradient-to-r from-indigo-500 to-purple-500 h-2 rounded-full"
                    initial={{ width: 0 }}
                    animate={{ width: '33%' }}
                    transition={{ duration: 1 }}
                  />
                </div>
                <p className="text-xs text-gray-600">Question 1 of 3</p>
              </div>

              {/* Question header */}
              <motion.div
                className="text-center lg:text-left shrink-0"
                initial={{ y: -20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.4 }}
              >
                <h2 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent flex items-center justify-center lg:justify-start gap-2 mb-1">
                  <Code2 className="w-6 h-6 text-indigo-600" />
                  Your Coding Journey
                </h2>
                <p className="text-base text-gray-600">Choose the option that fits you best!</p>
              </motion.div>

              {/* Options */}
              <motion.div
                className="space-y-3 flex-1 flex flex-col justify-center"
                variants={containerVariants}
                initial="hidden"
                animate="visible"
              >
                {options.map((option, index) => (
                  <motion.button
                    key={option.id}
                    onClick={() => onSelect(option.id)}
                    onHoverStart={() => setHoveredCard(option.id)}
                    onHoverEnd={() => setHoveredCard(null)}
                    variants={cardVariants}
                    whileHover={{ scale: 1.01, y: -2 }}
                    whileTap={{ scale: 0.98 }}
                    className={`w-full p-4 rounded-xl border-4 transition-all duration-300 ${selectedOption === option.id
                      ? `${option.bgColor} ${option.borderColor} shadow-xl ${option.glowColor}`
                      : `bg-white border-gray-200 ${option.hoverColor} hover:shadow-lg`
                      }`}
                  >
                    <div className="flex items-center gap-4">
                      {/* Emoji icon */}
                      <motion.div
                        className="flex-shrink-0"
                        animate={
                          hoveredCard === option.id || selectedOption === option.id
                            ? { rotate: [0, -10, 10, 0], scale: [1, 1.1, 1] }
                            : {}
                        }
                        transition={{ duration: 0.5 }}
                      >
                        <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${option.color} flex items-center justify-center shadow-md`}>
                          <span className="text-3xl">{option.emoji}</span>
                        </div>
                      </motion.div>

                      {/* Text content */}
                      <div className="flex-1 text-left">
                        <h3 className="text-lg font-bold text-gray-800 mb-0.5">
                          {option.title}
                        </h3>
                        <p className="text-xs text-gray-600">{option.description}</p>
                      </div>

                      {/* Selection indicator */}
                      <AnimatePresence>
                        {selectedOption === option.id && (
                          <motion.div
                            className="flex-shrink-0"
                            initial={{ scale: 0, rotate: -180 }}
                            animate={{ scale: 1, rotate: 0 }}
                            exit={{ scale: 0, rotate: 180 }}
                            transition={{ type: 'spring', stiffness: 200, damping: 15 }}
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

              {/* Navigation */}
              <motion.div
                className="flex justify-end pt-2 shrink-0"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.8 }}
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
