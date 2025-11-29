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
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 100, damping: 15 }}
        className="w-full max-w-4xl relative z-10 max-h-[95vh] flex flex-col"
      >
        <Card className="shadow-2xl border-4 border-white bg-white/95 backdrop-blur-sm overflow-hidden flex flex-col h-full">
          {/* Celebration header */}
          <motion.div
            className="bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 p-4 text-center relative overflow-hidden shrink-0"
            animate={{
              backgroundPosition: ['0% 50%', '100% 50%', '0% 50%'],
            }}
            transition={{
              duration: 5,
              repeat: Infinity,
              ease: 'linear',
            }}
            style={{ backgroundSize: '200% 200%' }}
          >
            {/* Animated celebration emojis */}
            <motion.div className="absolute inset-0 opacity-30">
              {['🎉', '⭐', '🎊', '✨', '🏆', '🚀'].map((emoji, i) => (
                <motion.div
                  key={i}
                  className="absolute text-4xl"
                  style={{
                    top: `${20 + (i * 15)}%`,
                    left: `${10 + (i * 15)}%`,
                  }}
                  animate={{
                    y: [0, -20, 0],
                    rotate: [0, 360],
                    scale: [1, 1.2, 1],
                  }}
                  transition={{
                    duration: 3,
                    delay: i * 0.2,
                    repeat: Infinity,
                  }}
                >
                  {emoji}
                </motion.div>
              ))}
            </motion.div>

            <motion.div
              className="relative z-10"
              initial={{ y: -50, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.3, type: 'spring', stiffness: 100 }}
            >
              <motion.div
                animate={{
                  y: [0, -5, 0],
                  rotate: [0, 5, -5, 0],
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                }}
              >
                <Trophy className="w-12 h-12 text-yellow-300 mx-auto mb-2 drop-shadow-lg" />
              </motion.div>
              <h1 className="text-4xl font-bold text-white mb-1 drop-shadow-lg">You're All Set!</h1>
              <p className="text-lg text-white/95 font-medium">Let's start your coding adventure!</p>
            </motion.div>
          </motion.div>

          {/* Main content */}
          <motion.div
            className="p-6 space-y-4 flex-1 flex flex-col justify-center overflow-y-auto"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
          >
            {/* Character celebration */}

            <motion.div
              className="flex justify-center shrink-0"
              variants={itemVariants}
            >
              <div className="relative">
                <motion.div
                  className="text-7xl"
                  animate={{
                    rotate: [0, -10, 10, -10, 10, 0],
                    scale: [1, 1.1, 1],
                  }}
                  transition={{
                    duration: 2,
                    repeat: Infinity,
                  }}
                >
                  🤖
                </motion.div>
                <motion.div
                  className="absolute -top-4 -right-4"
                  animate={{
                    scale: [1, 1.5, 1],
                    rotate: [0, 180, 360],
                  }}
                  transition={{
                    duration: 2,
                    repeat: Infinity,
                  }}
                >
                  <Sparkles className="w-10 h-10 text-yellow-400" />
                </motion.div>
                <motion.div
                  className="absolute -bottom-2 -left-2"
                  animate={{
                    rotate: 360,
                    scale: [1, 1.2, 1],
                  }}
                  transition={{
                    duration: 3,
                    repeat: Infinity,
                  }}
                >
                  <Star className="w-8 h-8 text-purple-400 fill-purple-400" />
                </motion.div>
              </div>
            </motion.div>

            {/* Personalized message */}

            <motion.div
              className="bg-gradient-to-r from-indigo-50 via-purple-50 to-pink-50 rounded-2xl p-4 border-4 border-indigo-200 space-y-2 shrink-0"
              variants={itemVariants}
              whileHover={{ scale: 1.01 }}
            >
              <div className="text-center space-y-1">
                <h2 className="text-2xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                  Awesome! I know just how to help you! 🎯
                </h2>

                <div className="space-y-1 text-base text-gray-700">
                  <p>
                    I see you're {getExperienceText()}. That's perfect!
                  </p>
                  <p className="font-medium text-indigo-700 text-lg">
                    {getConfidenceText()}
                  </p>
                </div>
              </div>
            </motion.div>

            {/* What's next section */}

            <motion.div className="space-y-2 flex-1 flex flex-col justify-center" variants={itemVariants}>
              <h3 className="text-xl font-bold text-gray-800 text-center">
                Here's what you can do in PyBlocks:
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {[
                  { emoji: '🎮', title: 'Fun Missions', desc: 'Complete exciting coding challenges!', color: 'from-pink-100 to-rose-100', border: 'border-pink-300' },
                  { emoji: '🏆', title: 'Earn Badges', desc: 'Collect awesome badges as you learn!', color: 'from-purple-100 to-indigo-100', border: 'border-purple-300' },
                  { emoji: '🚀', title: 'Build Projects', desc: 'Create amazing projects to share!', color: 'from-blue-100 to-cyan-100', border: 'border-blue-300' },
                ].map((item, index) => (
                  <motion.div
                    key={index}
                    className={`bg-gradient-to-br ${item.color} rounded-xl p-3 border-2 ${item.border} text-center space-y-1`}
                    initial={{ opacity: 0, y: 50 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5 + index * 0.1, type: 'spring', stiffness: 100 }}
                    whileHover={{ scale: 1.02, y: -2 }}
                  >
                    <motion.div
                      className="text-3xl"
                      animate={{ rotate: [0, 10, -10, 0] }}
                      transition={{ duration: 2, delay: index * 0.2, repeat: Infinity }}
                    >
                      {item.emoji}
                    </motion.div>
                    <h4 className="text-sm font-bold text-gray-800">{item.title}</h4>
                    <p className="text-xs text-gray-600 leading-tight">{item.desc}</p>
                  </motion.div>
                ))}
              </div>
            </motion.div>

            {/* Encouragement message */}

            <motion.div
              className="bg-yellow-50 border-4 border-yellow-300 rounded-xl p-3 text-center shrink-0"
              variants={itemVariants}
              whileHover={{ scale: 1.01 }}
            >
              <p className="text-lg text-gray-700 font-medium">
                <span className="text-xl">💪</span> Remember: Every expert coder started exactly where you are!
                <span className="text-xl">⭐</span>
              </p>
            </motion.div>

            {/* Start button */}

            <motion.div
              className="text-center pt-2 shrink-0"
              variants={itemVariants}
            >
              <motion.div
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <Button
                  onClick={onComplete}
                  className="h-14 px-12 bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 hover:from-indigo-700 hover:via-purple-700 hover:to-pink-700 text-white text-xl font-bold rounded-xl shadow-xl relative overflow-hidden group"
                >
                  <motion.span
                    className="absolute inset-0 bg-white/20"
                    initial={{ x: '-100%' }}
                    whileHover={{ x: '100%' }}
                    transition={{ duration: 0.5 }}
                  />
                  <span className="relative flex items-center gap-2">
                    Start Coding Now!
                    <Rocket className="w-6 h-6" />
                  </span>
                </Button>
              </motion.div>
            </motion.div>

            {/* Progress indicator */}

            <motion.div
              className="flex justify-center items-center gap-3 pt-2 shrink-0"
              variants={itemVariants}
            >
              <div className="w-full max-w-xs bg-gray-200 rounded-full h-3 overflow-hidden">
                <motion.div
                  className="bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 h-3 rounded-full"
                  initial={{ width: 0 }}
                  animate={{ width: '100%' }}
                  transition={{ delay: 1, duration: 1.5, ease: 'easeOut' }}
                />
              </div>
              <p className="text-sm text-gray-600 font-bold whitespace-nowrap">Complete! 🎉</p>
            </motion.div>
          </motion.div>
        </Card>
      </motion.div>
    </motion.div>
  );
}
