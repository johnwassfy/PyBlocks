'use client';

import { Button } from '../ui/button';
import { Card } from '../ui/card';
import { Sparkles, Rocket, Trophy, Star, Zap, Award, Target } from 'lucide-react';
import { OnboardingData } from './OnboardingFlow';
import { motion, AnimatePresence } from 'framer-motion';
import { useEffect, useState } from 'react';

interface CompletionScreenProps {
  onComplete: () => void;
  data: OnboardingData;
}

export default function CompletionScreen({ onComplete, data }: CompletionScreenProps) {
  const [showConfetti, setShowConfetti] = useState(false);

  useEffect(() => {
    setShowConfetti(true);
  }, []);

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

  // Confetti particles
  const confettiColors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E2'];
  const confettiParticles = Array.from({ length: 50 }, (_, i) => ({
    id: i,
    color: confettiColors[Math.floor(Math.random() * confettiColors.length)],
    delay: Math.random() * 2,
    duration: 3 + Math.random() * 2,
    x: Math.random() * 100, // Use percentage
  }));

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.3,
      },
    },
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: { type: 'spring' as const, stiffness: 100 },
    },
  };

  return (
    <motion.div
      className="h-screen w-full flex items-center justify-center p-4 bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 relative overflow-hidden"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      {/* Confetti animation */}
      <AnimatePresence>
        {showConfetti && confettiParticles.map((particle) => (
          <motion.div
            key={particle.id}
            className="absolute w-3 h-3 rounded-full"
            style={{ backgroundColor: particle.color, left: `${particle.x}%` }}
            initial={{ y: '-5vh', opacity: 1 }}
            animate={{
              y: '105vh',
              x: `${(Math.random() - 0.5) * 20}vw`,
              rotate: 360 * 3,
              opacity: [1, 1, 0],
            }}
            transition={{
              duration: particle.duration,
              delay: particle.delay,
              ease: 'easeIn',
            }}
          />
        ))}
      </AnimatePresence>

      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 100, damping: 20 }}
        className="w-full max-w-3xl relative z-10"
      >
        <Card className="shadow-2xl border-4 border-white bg-white/95 backdrop-blur-sm overflow-hidden flex flex-col max-h-[90vh]">
          {/* Slim Header */}
          <motion.div
            className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 p-3 text-center relative overflow-hidden shrink-0 flex items-center justify-center gap-3"
            animate={{
              backgroundPosition: ['0% 50%', '100% 50%', '0% 50%'],
            }}
            transition={{
              duration: 8,
              repeat: Infinity,
              ease: 'linear',
            }}
            style={{ backgroundSize: '200% 200%' }}
          >
            <motion.div
              animate={{ rotate: [0, 10, -10, 0] }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              <Trophy className="w-6 h-6 text-yellow-300 drop-shadow-md" />
            </motion.div>
            <h1 className="text-xl font-bold text-white tracking-wide drop-shadow-md">You're All Set!</h1>
            <span className="text-white/80 text-sm font-medium">|</span>
            <p className="text-sm text-white/90 font-medium">Ready for Adventure 🚀</p>
          </motion.div>

          {/* Main content - Compact Layout */}
          <div className="p-6 flex flex-col items-center text-center space-y-4 overflow-y-auto custom-scrollbar">

            {/* Hero Section */}
            <div className="space-y-2">
              <motion.div
                className="text-6xl mb-2 relative inline-block"
                animate={{ rotate: [0, -10, 10, -10, 10, 0] }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                🤖
                <motion.div
                  className="absolute -top-2 -right-2"
                  animate={{ scale: [1, 1.5, 1], rotate: 360 }}
                  transition={{ duration: 2, repeat: Infinity }}
                >
                  <Sparkles className="w-6 h-6 text-yellow-400" />
                </motion.div>
              </motion.div>

              <h2 className="text-2xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                Awesome! I know just how to help you! 🎯
              </h2>
            </div>

            {/* Personalized Message */}
            <motion.div
              className="bg-indigo-50 rounded-2xl p-4 border-2 border-indigo-100 max-w-lg w-full space-y-1"
              whileHover={{ scale: 1.01 }}
            >
              <p className="text-gray-700">
                I see you're {getExperienceText()}. That's perfect!
              </p>
              <p className="font-bold text-indigo-700 text-lg">
                {getConfidenceText()}
              </p>
            </motion.div>

            {/* Features Grid */}
            <div className="grid grid-cols-3 gap-3 w-full max-w-lg">
              {[
                { emoji: '🎮', title: 'Missions', color: 'bg-pink-50 border-pink-200' },
                { emoji: '🏆', title: 'Badges', color: 'bg-purple-50 border-purple-200' },
                { emoji: '🚀', title: 'Projects', color: 'bg-blue-50 border-blue-200' },
              ].map((item, index) => (
                <motion.div
                  key={index}
                  className={`${item.color} border-2 rounded-xl p-2 text-center`}
                  whileHover={{ y: -2 }}
                >
                  <div className="text-2xl mb-1">{item.emoji}</div>
                  <div className="text-xs font-bold text-gray-700">{item.title}</div>
                </motion.div>
              ))}
            </div>

            {/* Encouragement */}
            <div className="bg-yellow-50 border-2 border-yellow-200 rounded-xl p-2 w-full max-w-lg">
              <p className="text-sm text-gray-700 font-medium flex items-center justify-center gap-2">
                <span>💪</span> Every expert coder started exactly where you are! <span>⭐</span>
              </p>
            </div>

            {/* Action Button */}
            <div className="pt-2 w-full flex justify-center">
              <motion.div
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="w-full max-w-xs"
              >
                <Button
                  onClick={onComplete}
                  className="w-full h-12 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white text-lg font-bold rounded-xl shadow-lg group"
                >
                  <span className="flex items-center justify-center gap-2">
                    Start Coding Now!
                    <Rocket className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                  </span>
                </Button>
              </motion.div>
            </div>

            {/* Progress Bar */}
            <div className="w-full max-w-xs flex items-center gap-3 opacity-80">
              <div className="flex-1 bg-gray-200 rounded-full h-2 overflow-hidden">
                <motion.div
                  className="bg-gradient-to-r from-indigo-500 to-pink-500 h-full rounded-full"
                  initial={{ width: 0 }}
                  animate={{ width: '100%' }}
                  transition={{ delay: 0.5, duration: 1 }}
                />
              </div>
              <span className="text-xs font-bold text-gray-500">100%</span>
            </div>
          </div>
        </Card>
      </motion.div>
    </motion.div>
  );
}
