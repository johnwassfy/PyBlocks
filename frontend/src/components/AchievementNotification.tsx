/**
 * Achievement Notification Component
 * Displays beautiful toast notifications when achievements are unlocked
 */
import React from 'react';
import { motion } from 'framer-motion';
import { Trophy, Sparkles, Star, Award } from 'lucide-react';
import { toast } from 'sonner';

export interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  category: string;
  unlockedAt?: Date;
}

const rarityColors = {
  common: {
    bg: 'from-gray-100 to-gray-200',
    border: 'border-gray-400',
    text: 'text-gray-700',
    badge: 'bg-gray-500',
  },
  rare: {
    bg: 'from-blue-100 to-blue-200',
    border: 'border-blue-500',
    text: 'text-blue-700',
    badge: 'bg-blue-500',
  },
  epic: {
    bg: 'from-purple-100 to-purple-200',
    border: 'border-purple-500',
    text: 'text-purple-700',
    badge: 'bg-purple-500',
  },
  legendary: {
    bg: 'from-yellow-100 to-amber-200',
    border: 'border-amber-500',
    text: 'text-amber-700',
    badge: 'bg-gradient-to-r from-yellow-500 to-amber-500',
  },
};

/**
 * Show achievement unlock notification
 */
export function showAchievementNotification(achievement: Achievement) {
  const colors = rarityColors[achievement.rarity] || rarityColors.common;
  
  toast.custom(
    (t) => (
      <motion.div
        initial={{ opacity: 0, y: -50, scale: 0.3 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, scale: 0.5, transition: { duration: 0.2 } }}
        className={`relative bg-gradient-to-br ${colors.bg} border-2 ${colors.border} rounded-2xl shadow-2xl p-4 max-w-md`}
      >
        {/* Sparkle effect */}
        <div className="absolute -top-2 -right-2">
          <Sparkles className="w-6 h-6 text-yellow-500 animate-pulse" />
        </div>
        
        <div className="flex items-center gap-4">
          {/* Icon */}
          <div className="flex-shrink-0">
            <div className="text-6xl animate-bounce">{achievement.icon}</div>
          </div>
          
          {/* Content */}
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <Trophy className="w-5 h-5 text-amber-500" />
              <h3 className="font-bold text-lg text-gray-800">Achievement Unlocked!</h3>
            </div>
            <h4 className={`font-bold text-lg ${colors.text} mb-1`}>
              {achievement.name}
            </h4>
            <p className="text-sm text-gray-600 mb-2">{achievement.description}</p>
            <div className="flex items-center gap-2">
              <span className={`${colors.badge} text-white text-xs font-bold px-2 py-1 rounded-full uppercase`}>
                {achievement.rarity}
              </span>
              <span className="bg-gray-100 text-gray-600 text-xs px-2 py-1 rounded-full capitalize">
                {achievement.category}
              </span>
            </div>
          </div>
        </div>
        
        {/* Confetti elements */}
        <div className="absolute top-0 left-0 w-full h-full pointer-events-none overflow-hidden rounded-2xl">
          {[...Array(8)].map((_, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 1, y: 0, x: Math.random() * 100 - 50 }}
              animate={{ 
                opacity: 0, 
                y: Math.random() * 100 + 50,
                x: Math.random() * 200 - 100,
                rotate: Math.random() * 360
              }}
              transition={{ 
                duration: 1.5, 
                delay: i * 0.1,
                ease: 'easeOut'
              }}
              className="absolute top-4 left-1/2"
            >
              <Star 
                className={`w-3 h-3 ${i % 2 === 0 ? 'text-yellow-400' : 'text-amber-400'}`}
                fill="currentColor"
              />
            </motion.div>
          ))}
        </div>
      </motion.div>
    ),
    {
      duration: 5000,
      position: 'top-center',
    }
  );
}

/**
 * Show multiple achievement notifications (with delay between them)
 */
export function showMultipleAchievements(achievements: Achievement[]) {
  achievements.forEach((achievement, index) => {
    setTimeout(() => {
      showAchievementNotification(achievement);
    }, index * 1000); // 1 second delay between each notification
  });
}

/**
 * React component for achievement notification (if you want to use it directly)
 */
export default function AchievementNotification({ achievement }: { achievement: Achievement }) {
  const colors = rarityColors[achievement.rarity] || rarityColors.common;
  
  return (
    <motion.div
      initial={{ opacity: 0, y: -50, scale: 0.3 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.5 }}
      className={`relative bg-gradient-to-br ${colors.bg} border-2 ${colors.border} rounded-2xl shadow-2xl p-4 max-w-md`}
    >
      <div className="absolute -top-2 -right-2">
        <Sparkles className="w-6 h-6 text-yellow-500 animate-pulse" />
      </div>
      
      <div className="flex items-center gap-4">
        <div className="flex-shrink-0">
          <div className="text-6xl animate-bounce">{achievement.icon}</div>
        </div>
        
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <Trophy className="w-5 h-5 text-amber-500" />
            <h3 className="font-bold text-lg text-gray-800">Achievement Unlocked!</h3>
          </div>
          <h4 className={`font-bold text-lg ${colors.text} mb-1`}>
            {achievement.name}
          </h4>
          <p className="text-sm text-gray-600 mb-2">{achievement.description}</p>
          <div className="flex items-center gap-2">
            <span className={`${colors.badge} text-white text-xs font-bold px-2 py-1 rounded-full uppercase`}>
              {achievement.rarity}
            </span>
            <span className="bg-gray-100 text-gray-600 text-xs px-2 py-1 rounded-full capitalize">
              {achievement.category}
            </span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
