'use client';

import { Button } from '../ui/button';
import { Card } from '../ui/card';
import { Sparkles, Code2, Star, Rocket, Trophy, Zap } from 'lucide-react';
import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';

interface GreetingScreenProps {
  onNext: () => void;
}

export default function GreetingScreen({ onNext }: GreetingScreenProps) {
  const [showConfetti, setShowConfetti] = useState(false);

  useEffect(() => {
    setShowConfetti(true);
  }, []);

  // Floating particles animation
  const floatingParticles = [
    { icon: '⭐', delay: 0, duration: 3 },
    { icon: '🚀', delay: 0.5, duration: 4 },
    { icon: '✨', delay: 1, duration: 3.5 },
    { icon: '🎮', delay: 1.5, duration: 4.5 },
    { icon: '💎', delay: 2, duration: 3 },
    { icon: '🎨', delay: 2.5, duration: 4 },
  ];

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.2,
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
    <div className="h-screen w-full flex items-center justify-center p-4 bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 relative overflow-hidden">
      {/* Animated background gradient orbs */}
      <motion.div
        className="absolute top-20 left-20 w-96 h-96 bg-gradient-to-br from-indigo-400/30 to-purple-400/30 rounded-full blur-3xl"
        animate={{
          scale: [1, 1.2, 1],
          rotate: [0, 90, 0],
        }}
        transition={{
          duration: 20,
          repeat: Infinity,
          ease: 'linear',
        }}
      />
      <motion.div
        className="absolute bottom-20 right-20 w-96 h-96 bg-gradient-to-br from-pink-400/30 to-orange-400/30 rounded-full blur-3xl"
        animate={{
          scale: [1.2, 1, 1.2],
          rotate: [90, 0, 90],
        }}
        transition={{
          duration: 15,
          repeat: Infinity,
          ease: 'linear',
        }}
      />

      {/* Floating particles */}
      {floatingParticles.map((particle, index) => (
        <motion.div
          key={index}
          className="absolute text-4xl"
          initial={{ y: '100vh', x: `${(index * 15) + 10}%` }}
          animate={{
            y: '-100vh',
            x: `${(index * 15) + 20}%`,
            rotate: 360,
          }}
          transition={{
            duration: particle.duration,
            delay: particle.delay,
            repeat: Infinity,
            ease: 'linear',
          }}
        >
          {particle.icon}
        </motion.div>
      ))}

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
              <Code2 className="w-6 h-6 text-white drop-shadow-md" />
            </motion.div>
            <h1 className="text-xl font-bold text-white tracking-wide drop-shadow-md">PyBlocks</h1>
            <span className="text-white/80 text-sm font-medium">|</span>
            <p className="text-sm text-white/90 font-medium">Learn Python, Have Fun! 🎉</p>
          </motion.div>

          {/* Main content - Compact Layout */}
          <div className="p-6 flex flex-col items-center text-center space-y-4 overflow-y-auto custom-scrollbar">

            {/* Hero Section */}
            <div className="space-y-2">
              <motion.div
                className="text-6xl mb-2"
                animate={{ y: [0, -10, 0] }}
                transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
              >
                🤖
              </motion.div>

              <h2 className="text-2xl font-bold text-gray-800 flex items-center justify-center gap-2">
                <Star className="w-6 h-6 text-yellow-400 fill-yellow-400" />
                Welcome, Future Coder!
                <Star className="w-6 h-6 text-yellow-400 fill-yellow-400" />
              </h2>
            </div>

            {/* Message Bubble */}
            <motion.div
              className="bg-indigo-50 rounded-2xl p-4 border-2 border-indigo-100 max-w-lg w-full relative"
              whileHover={{ scale: 1.01 }}
            >
              <p className="text-lg text-gray-700 font-medium leading-relaxed">
                Hi! I'm <span className="font-bold text-indigo-600">CodeBot</span>. I'm here to help you learn Python through fun challenges! 🚀
              </p>
            </motion.div>

            <p className="text-gray-600 text-sm max-w-md">
              Let's customize your adventure with a few quick questions.
            </p>

            {/* Fun Icons Row */}
            <div className="flex gap-6 text-3xl py-2 opacity-80">
              {['🎨', '🎮', '🏆', '⚡'].map((emoji, index) => (
                <motion.span
                  key={index}
                  whileHover={{ scale: 1.2, rotate: 10 }}
                  className="cursor-default"
                >
                  {emoji}
                </motion.span>
              ))}
            </div>

            {/* Action Button */}
            <div className="pt-2 w-full flex justify-center">
              <motion.div
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="w-full max-w-xs"
              >
                <Button
                  onClick={onNext}
                  className="w-full h-12 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white text-lg font-bold rounded-xl shadow-lg group"
                >
                  <span className="flex items-center justify-center gap-2">
                    Let's Get Started!
                    <Rocket className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                  </span>
                </Button>
              </motion.div>
            </div>
          </div>
        </Card>
      </motion.div>
    </div>
  );
}
