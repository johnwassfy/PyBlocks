import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';

/**
 * 🏆 Achievement Definition
 * Represents a single achievement/badge that can be unlocked
 */
@Schema({ _id: false })
export class Achievement {
  @Prop({ required: true })
  id: string; // e.g., "first_mission", "week_streak"

  @Prop({ required: true })
  name: string; // e.g., "First Steps 🐣"

  @Prop({ required: true })
  description: string; // e.g., "Complete your very first mission!"

  @Prop({ required: true })
  icon: string; // emoji or icon identifier

  @Prop({ required: true, enum: ['common', 'rare', 'epic', 'legendary'] })
  rarity: string;

  @Prop({ required: true })
  category: string; // 'xp', 'streak', 'mission', 'speed', 'mastery', 'special'

  @Prop()
  unlockedAt?: Date;
}

export const AchievementSchema = SchemaFactory.createForClass(Achievement);

/**
 * 🎯 Achievement Definitions - Fun & Kid-Friendly
 */
export const ACHIEVEMENT_DEFINITIONS = [
  // 🎯 Mission-Based Achievements
  {
    id: 'first_mission',
    name: 'First Steps 🐣',
    description: 'Complete your very first mission!',
    icon: '🐣',
    rarity: 'common',
    category: 'mission',
  },
  {
    id: 'five_missions',
    name: 'Getting Started 🌱',
    description: 'Complete 5 missions!',
    icon: '🌱',
    rarity: 'common',
    category: 'mission',
  },
  {
    id: 'ten_missions',
    name: 'Problem Solver 🧩',
    description: 'Complete 10 missions!',
    icon: '🧩',
    rarity: 'rare',
    category: 'mission',
  },
  {
    id: 'twenty_missions',
    name: 'Code Explorer 🗺️',
    description: 'Complete 20 missions!',
    icon: '🗺️',
    rarity: 'rare',
    category: 'mission',
  },
  {
    id: 'fifty_missions',
    name: 'Master Coder 🎓',
    description: 'Complete 50 missions!',
    icon: '🎓',
    rarity: 'epic',
    category: 'mission',
  },
  {
    id: 'hundred_missions',
    name: 'Coding Legend 👑',
    description: 'Complete 100 missions! You are amazing!',
    icon: '👑',
    rarity: 'legendary',
    category: 'mission',
  },

  // ⚡ XP-Based Achievements
  {
    id: 'xp_100',
    name: 'Rookie Coder 🌟',
    description: 'Earn 100 XP!',
    icon: '🌟',
    rarity: 'common',
    category: 'xp',
  },
  {
    id: 'xp_500',
    name: 'Rising Star ⭐',
    description: 'Earn 500 XP!',
    icon: '⭐',
    rarity: 'common',
    category: 'xp',
  },
  {
    id: 'xp_1000',
    name: 'Code Warrior ⚔️',
    description: 'Earn 1,000 XP!',
    icon: '⚔️',
    rarity: 'rare',
    category: 'xp',
  },
  {
    id: 'xp_2500',
    name: 'Python Wizard 🧙',
    description: 'Earn 2,500 XP!',
    icon: '🧙',
    rarity: 'epic',
    category: 'xp',
  },
  {
    id: 'xp_5000',
    name: 'Coding Champion 🏆',
    description: 'Earn 5,000 XP!',
    icon: '🏆',
    rarity: 'legendary',
    category: 'xp',
  },

  // 🔥 Streak-Based Achievements
  {
    id: 'streak_3',
    name: 'On Fire 🔥',
    description: 'Learn for 3 days in a row!',
    icon: '🔥',
    rarity: 'common',
    category: 'streak',
  },
  {
    id: 'streak_7',
    name: 'Week Warrior 📅',
    description: 'Learn for 7 days in a row!',
    icon: '📅',
    rarity: 'rare',
    category: 'streak',
  },
  {
    id: 'streak_14',
    name: 'Dedicated Learner 💪',
    description: 'Learn for 14 days in a row!',
    icon: '💪',
    rarity: 'rare',
    category: 'streak',
  },
  {
    id: 'streak_30',
    name: 'Monthly Master 🌙',
    description: 'Learn for 30 days in a row!',
    icon: '🌙',
    rarity: 'epic',
    category: 'streak',
  },
  {
    id: 'streak_100',
    name: 'Unstoppable 🚀',
    description: 'Learn for 100 days in a row! Incredible!',
    icon: '🚀',
    rarity: 'legendary',
    category: 'streak',
  },

  // ⚡ Speed Achievements
  {
    id: 'speed_demon',
    name: 'Speed Demon ⚡',
    description: 'Complete a mission in under 2 minutes!',
    icon: '⚡',
    rarity: 'rare',
    category: 'speed',
  },
  {
    id: 'lightning_fast',
    name: 'Lightning Fast 🌩️',
    description: 'Complete a hard mission in under 5 minutes!',
    icon: '🌩️',
    rarity: 'epic',
    category: 'speed',
  },

  // 🎯 Mastery Achievements
  {
    id: 'perfect_ten',
    name: 'Perfect Ten 💯',
    description: 'Get a perfect score on 10 missions!',
    icon: '💯',
    rarity: 'epic',
    category: 'mastery',
  },
  {
    id: 'no_hints',
    name: 'Brain Power 🧠',
    description: 'Complete a hard mission without using hints!',
    icon: '🧠',
    rarity: 'rare',
    category: 'mastery',
  },
  {
    id: 'first_try',
    name: 'One Shot Wonder 🎯',
    description: 'Complete a mission on your first try!',
    icon: '🎯',
    rarity: 'rare',
    category: 'mastery',
  },

  // 🌈 Special Achievements
  {
    id: 'night_owl',
    name: 'Night Owl 🦉',
    description: 'Complete a mission after 9 PM!',
    icon: '🦉',
    rarity: 'common',
    category: 'special',
  },
  {
    id: 'early_bird',
    name: 'Early Bird 🐦',
    description: 'Complete a mission before 7 AM!',
    icon: '🐦',
    rarity: 'common',
    category: 'special',
  },
  {
    id: 'weekend_warrior',
    name: 'Weekend Warrior 🎮',
    description: 'Complete 5 missions on a weekend!',
    icon: '🎮',
    rarity: 'rare',
    category: 'special',
  },
  {
    id: 'bug_hunter',
    name: 'Bug Hunter 🐛',
    description: 'Fix 10 syntax errors!',
    icon: '🐛',
    rarity: 'common',
    category: 'special',
  },
  {
    id: 'creative_genius',
    name: 'Creative Genius 🎨',
    description: 'Complete a creative mission with unique code!',
    icon: '🎨',
    rarity: 'epic',
    category: 'special',
  },
] as const;
