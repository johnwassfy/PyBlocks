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
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 100, damping: 15 }}
        className="w-full max-w-4xl relative z-10 max-h-[95vh] flex flex-col"
      >
        <Card className="shadow-2xl border-4 border-white bg-white/95 backdrop-blur-sm overflow-hidden flex flex-col h-full">
          {/* Decorative header with animated gradient */}
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
            {/* Animated sparkles */}
            <motion.div
              className="absolute inset-0 opacity-30"
              initial="hidden"
              animate="visible"
              variants={containerVariants}
            >
              {[...Array(8)].map((_, i) => (
                <motion.div
                  key={i}
                  className="absolute"
                  style={{
                    top: `${Math.random() * 100}%`,
                    left: `${Math.random() * 100}%`,
                  }}
                  animate={{
                    scale: [1, 1.5, 1],
                    opacity: [0.5, 1, 0.5],
                  }}
                  transition={{
                    duration: 2,
                    delay: i * 0.2,
                    repeat: Infinity,
                  }}
                >
                  ✨
                </motion.div>
              ))}
            </motion.div>

            <motion.div
              className="relative z-10"
              initial={{ y: -50, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.3, type: 'spring', stiffness: 100 }}
            >
              <div className="flex items-center justify-center gap-3 mb-2">
                <motion.div
                  animate={{ rotate: [0, 10, -10, 0] }}
                  transition={{ duration: 2, repeat: Infinity }}
                >
                  <Code2 className="w-10 h-10 text-white drop-shadow-lg" />
                </motion.div>
                <h1 className="text-4xl font-bold text-white drop-shadow-lg">PyBlocks</h1>
              </div>
              <motion.p
                className="text-xl text-white/95 font-medium"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
              >
                Learn Python, Have Fun! 🎉
              </motion.p>
            </motion.div>
          </motion.div>

          {/* Main content */}
          <motion.div
            className="p-6 text-center space-y-4 flex-1 flex flex-col justify-center overflow-y-auto"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
          >
            {/* Animated AI Character */}

            <motion.div
              className="flex justify-center shrink-0"
              variants={itemVariants}
            >
              <div className="relative">
                <motion.div
                  className="text-7xl"
                  animate={{
                    y: [0, -15, 0],
                  }}
                  transition={{
                    duration: 2,
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
                    duration: 3,
                    repeat: Infinity,
                  }}
                >
                  <Sparkles className="w-8 h-8 text-yellow-400" />
                </motion.div>
              </div>
            </motion.div>

            {/* Welcome message */}

            <motion.div className="space-y-4 shrink-0" variants={itemVariants}>
              <motion.h2
                className="text-3xl font-bold bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 bg-clip-text text-transparent flex items-center justify-center gap-2"
                animate={{
                  backgroundPosition: ['0% 50%', '100% 50%', '0% 50%'],
                }}
                transition={{
                  duration: 3,
                  repeat: Infinity,
                  ease: 'linear',
                }}
                style={{ backgroundSize: '200% 200%' }}
              >
                <Star className="w-8 h-8 text-yellow-400 fill-yellow-400" />
                Welcome, Future Coder!
                <Star className="w-8 h-8 text-yellow-400 fill-yellow-400" />
              </motion.h2>

              <motion.div
                className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-2xl p-6 border-4 border-indigo-200 relative"
                whileHover={{ scale: 1.01 }}
                transition={{ type: 'spring', stiffness: 300 }}
              >
                {/* Speech bubble tail */}
                <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                  <div className="w-0 h-0 border-l-[20px] border-l-transparent border-r-[20px] border-r-transparent border-b-[20px] border-b-indigo-200"></div>
                  <div className="w-0 h-0 border-l-[16px] border-l-transparent border-r-[16px] border-r-transparent border-b-[16px] border-b-indigo-50 absolute top-1 left-1/2 transform -translate-x-1/2"></div>
                </div>

                <p className="text-xl text-gray-700 leading-relaxed font-medium">
                  Hi there! I'm <span className="font-bold text-indigo-600">CodeBot</span>, your friendly coding companion! 🎉
                </p>
                <p className="text-lg text-gray-600 mt-2">
                  I'm here to help you learn Python through fun challenges and awesome projects!
                </p>
              </motion.div>

              <motion.p
                className="text-base text-gray-600"
                variants={itemVariants}
              >
                Let's get to know each other! I'll ask you a few quick questions so I can make your learning adventure perfect for you! 🚀
              </motion.p>
            </motion.div>

            {/* Fun decorative elements with stagger */}

            <motion.div
              className="flex justify-center gap-6 text-4xl shrink-0"
              variants={containerVariants}
            >
              {['🎨', '🎮', '🏆', '⚡'].map((emoji, index) => (
                <motion.span
                  key={index}
                  variants={itemVariants}
                  whileHover={{ scale: 1.3, rotate: 15 }}
                  animate={{
                    y: [0, -10, 0],
                  }}
                  transition={{
                    y: {
                      duration: 2,
                      delay: index * 0.2,
                      repeat: Infinity,
                      ease: 'easeInOut',
                    },
                  }}
                >
                  {emoji}
                </motion.span>
              ))}
            </motion.div>

            {/* Start button with enhanced effects */}

            <motion.div className="pt-4 shrink-0" variants={itemVariants}>
              <motion.div
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <Button
                  onClick={onNext}
                  className="h-16 px-12 bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 hover:from-indigo-700 hover:via-purple-700 hover:to-pink-700 text-white text-xl font-bold rounded-2xl shadow-xl relative overflow-hidden group"
                >
                  <motion.span
                    className="absolute inset-0 bg-white/20"
                    initial={{ x: '-100%' }}
                    whileHover={{ x: '100%' }}
                    transition={{ duration: 0.5 }}
                  />
                  <span className="relative flex items-center gap-3">
                    Let's Get Started!
                    <Rocket className="w-6 h-6" />
                  </span>
                </Button>
              </motion.div>
            </motion.div>
          </motion.div>
        </Card>
      </motion.div>
    </div>
  );
}
