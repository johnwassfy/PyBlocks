"use client";
import React, { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy } from 'lucide-react';
import { Badge } from './ui/badge';
import { Progress } from './ui/progress';
import type { GamificationData, Achievement as UserAchievement } from './BlocklyWorkspace';

type CanonicalAchievement = {
  _id: string | { toString?: () => string };
  name: string;
  description: string;
  icon: string;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  category: string;
  target?: number; // Numeric target for progress-based achievements (e.g., 100 for XP, 5 for missions)
};

type Props = {
  gamification?: GamificationData | null;
};

export default function AchievementsSidebar({ gamification }: Props) {
  const [achievements, setAchievements] = useState<CanonicalAchievement[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [rarityFilter, setRarityFilter] = useState<'all' | CanonicalAchievement['rarity']>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'achieved' | 'locked' | 'inprogress'>('all');

  useEffect(() => {
    // Fetch canonical achievements from backend; fallback gracefully
    const fetchList = async () => {
      try {
        setIsLoading(true);
        const token = localStorage.getItem('token');
        const res = await fetch('http://localhost:5000/achievements', {
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        });
        if (!res.ok) throw new Error('Failed to fetch');
        const data = await res.json();
        // canonical list may include Mongo-generated _id; keep it
        setAchievements(data || []);
        setIsLoading(false);
      } catch (err) {
        // fallback: small local set so UI still works
        setAchievements([]);
        setIsLoading(false);
      }
    };
    fetchList();
  }, []);

  // Map canonical achievements to the user's unlocked achievement references.
  // User's gamification.achievements contains objects with: { achievementId: ObjectId, unlockedAt: Date }
  const merged = useMemo(() => {
    const userAchievements = (gamification?.achievements ?? []) as any[];

    return achievements.map((a) => {
      // Get the canonical MongoDB ObjectId
      const canonicalMongoId = String(a._id);

      // Find if this achievement is unlocked by matching achievementId reference
      const found = userAchievements.find((ua) => {
        if (!ua.achievementId) return false;
        return String(ua.achievementId) === canonicalMongoId;
      });

      return {
        ...a,
        unlocked: Boolean(found),
        unlockedAt: found?.unlockedAt,
        _canonicalId: canonicalMongoId,
      } as any;
    });
  }, [achievements, gamification]);

  // Determine whether an achievement should show a progress bar and compute progress data
  const computeProgress = (ach: CanonicalAchievement) => {
    const category = ach.category;
    const target = ach.target;
    const result: { hasProgress: boolean; current?: number; target?: number; label?: string } = { hasProgress: false };

    // Only show progress if the achievement has an explicit numeric target
    if (typeof target !== 'number') {
      return result;
    }

    if (category === 'mission') {
        const rawCurrent = gamification?.totalMissionsCompleted ?? (gamification?.completedMissions?.length ?? 0);
        const current = Math.min(rawCurrent, target);
        result.hasProgress = true;
        result.current = current;
        result.target = target;
        result.label = `${current}/${target} missions`;
    } else if (category === 'xp') {
        const rawCurrent = gamification?.xp ?? 0;
        const current = Math.min(rawCurrent, target);
        result.hasProgress = true;
        result.current = current;
        result.target = target;
        result.label = `${current}/${target} XP`;
    } else if (category === 'streak') {
        const rawCurrent = gamification?.streak ?? 0;
        const current = Math.min(rawCurrent, target);
        result.hasProgress = true;
        result.current = current;
        result.target = target;
        result.label = `${current}/${target} days`;
    }

    return result;
  };

  const filtered = merged.filter((a) => {
    if (rarityFilter !== 'all' && a.rarity !== rarityFilter) return false;
    // compute progress to allow `inprogress` filtering
    const prog = computeProgress(a as CanonicalAchievement);
    if (statusFilter === 'achieved' && !a.unlocked) return false;
    if (statusFilter === 'locked' && a.unlocked) return false;
    if (statusFilter === 'inprogress') {
      // in progress means: has measurable progress, not unlocked, and some progress made but not completed
      if (!prog.hasProgress) return false;
      if (a.unlocked) return false;
      const current = prog.current ?? 0;
      const target = prog.target ?? 0;
      if (target > 0) {
        if (current <= 0) return false;
        if (current >= target) return false;
      } else {
        if (current <= 0) return false;
      }
    }
    return true;
  });

  // Motion variants for staggered entry animation
  const listVariants = {
    hidden: {},
    visible: {
      transition: {
        staggerChildren: 0.1,
      },
    },
  } as const;

  const itemVariants = {
    hidden: { opacity: 0, y: -18 },
    visible: { opacity: 1, y: -4, transition: { duration: 0.36, ease: 'easeOut' } },
    exit: { opacity: 0, y: -8, transition: { duration: 0.22, ease: 'easeIn' } },
  } as const;

  const rarityOptions: Array<{ key: typeof rarityFilter; label: string }> = [
    { key: 'all', label: 'All' },
    { key: 'common', label: 'Common' },
    { key: 'rare', label: 'Rare' },
    { key: 'epic', label: 'Epic' },
    { key: 'legendary', label: 'Legendary' },
  ];

  return (
    <div className="w-full h-full flex flex-col bg-gradient-to-b from-white to-gray-50 rounded-none sm:rounded-xl shadow-2xl border border-gray-200 overflow-hidden">
      <div className="flex items-center gap-3 px-4 py-3 bg-gradient-to-r from-purple-50 to-indigo-50 border-b border-purple-100">
        <div className="p-1.5 bg-white rounded-md shadow-sm flex items-center justify-center">
          <Trophy className="w-4 h-4 text-purple-600" />
        </div>
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-gray-900 tracking-tight">Achievements</h3>
          <p className="text-[11px] text-gray-600 mt-0.5">Unlock badges as you learn!</p>
        </div>
      </div>

      <div className="px-4 py-3 bg-white border-b border-gray-100">
        <div className="flex items-center gap-1 flex-nowrap overflow-x-auto mb-2.5">
          {rarityOptions.map((r) => (
            <button
              key={r.key}
              onClick={() => setRarityFilter(r.key as any)}
              className={`flex-shrink-0 px-2 py-1 rounded-full text-[11px] font-medium transition-all duration-200 ${
                rarityFilter === r.key 
                  ? 'bg-indigo-600 text-white shadow-md scale-105' 
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200 hover:scale-105'
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-1 flex-nowrap overflow-x-auto">
          <button
            onClick={() => setStatusFilter('all')}
            className={`flex-shrink-0 px-2 py-1 rounded-lg text-xs font-medium transition-all duration-200 ${
              statusFilter === 'all' 
                ? 'bg-indigo-600 text-white shadow-md' 
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >All</button>
          <button
            onClick={() => setStatusFilter('achieved')}
            className={`flex-shrink-0 px-2 py-1 rounded-lg text-xs font-medium transition-all duration-200 ${
              statusFilter === 'achieved' 
                ? 'bg-emerald-600 text-white shadow-md' 
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >Achieved</button>
          <button
            onClick={() => setStatusFilter('locked')}
            className={`flex-shrink-0 px-2 py-1 rounded-lg text-xs font-medium transition-all duration-200 ${
              statusFilter === 'locked' 
                ? 'bg-gray-700 text-white shadow-md' 
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >Locked</button>
          <button
            onClick={() => setStatusFilter('inprogress')}
            className={`flex-shrink-0 px-2 py-1 rounded-lg text-xs font-medium transition-all duration-200 ${
              statusFilter === 'inprogress' 
                ? 'bg-amber-500 text-white shadow-md' 
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >In Progress</button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 pt-3 pb-0">
        {isLoading ? (
          <div className="space-y-3 pb-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <motion.div
                key={`skeleton-${i}`}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25, delay: i * 0.05 }}
                className="p-3 rounded-xl border-2 bg-white border-gray-100 shadow-sm"
              >
                <div className="flex items-start gap-3">
                  <div className="w-12 h-12 rounded-xl bg-gray-100 animate-pulse" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-gray-100 rounded w-1/3 animate-pulse" />
                    <div className="h-3 bg-gray-100 rounded w-1/2 animate-pulse" />
                    <div className="h-3 bg-gray-100 rounded w-full animate-pulse mt-2" />
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center text-center py-12">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-3">
              <Trophy className="w-8 h-8 text-gray-400" />
            </div>
            <p className="text-sm text-gray-500 font-medium">No achievements match your filters</p>
            <p className="text-xs text-gray-400 mt-1">Try adjusting your filters</p>
          </div>
        ) : (
          <motion.div
            variants={listVariants}
            initial="hidden"
            animate="visible"
            className="space-y-2 pb-4"
          >
            <AnimatePresence initial={false}>
            {filtered.map((a) => {
              const prog = computeProgress(a as CanonicalAchievement);
              const percent = prog.hasProgress && prog.target && prog.target > 0 && typeof prog.current === 'number'
                ? Math.min(100, Math.round((prog.current / prog.target) * 100))
                : 0;

              return (
                <motion.div
                  key={a._canonicalId}
                  variants={itemVariants}
                  exit="exit"
                  layout
                  whileHover={{ scale: 1.02, transition: { duration: 0.15 } }}
                  className={`p-3 rounded-xl border-2 flex items-start gap-3 cursor-pointer transition-all duration-200 ${
                    a.unlocked 
                      ? 'bg-gradient-to-br from-white to-emerald-50/50 border-emerald-300 shadow-md hover:shadow-lg' 
                      : 'bg-white border-gray-200 hover:border-gray-300 shadow-sm hover:shadow-md'
                  }`}
                >
                  <div className={`flex-shrink-0 w-12 h-12 rounded-xl flex items-center justify-center text-2xl shadow-sm ${
                    a.unlocked ? 'bg-gradient-to-br from-emerald-100 to-emerald-50' : 'bg-gray-100'
                  }`}>
                    {a.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <h4 className={`font-bold text-sm leading-tight ${a.unlocked ? 'text-gray-900' : 'text-gray-600'}`}>
                        {a.name}
                      </h4>
                      <Badge className={`flex-shrink-0 font-semibold uppercase tracking-wider ${
                        a.rarity === 'legendary' 
                          ? 'bg-gradient-to-r from-amber-400 to-yellow-500 text-white shadow-md' 
                          : a.rarity === 'epic' 
                          ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-md' 
                          : a.rarity === 'rare' 
                          ? 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white shadow-md' 
                          : 'bg-gray-500 text-white shadow-sm'
                      } text-[10px] px-2 py-0.5`}>
                        {a.rarity}
                      </Badge>
                    </div>
                    <p className="text-xs text-gray-600 mb-2.5 leading-relaxed">{a.description}</p>

                    {prog.hasProgress && (
                      <div className="mb-2.5 space-y-1">
                        <div className="relative w-full rounded-full border border-gray-200 bg-white p-0.5">
                          <Progress value={percent} className="h-2 rounded-full" />
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-medium text-gray-700">{prog.label}</span>
                          <span className="text-xs font-bold text-indigo-600">{percent}%</span>
                        </div>
                      </div>
                    )}

                    <div className="flex items-center gap-2">
                      <span className={`text-[10px] font-bold px-2 py-1 rounded-md uppercase tracking-wide ${
                        a.unlocked 
                          ? 'bg-emerald-600 text-white shadow-sm' 
                          : 'bg-gray-400 text-white'
                      }`}>
                        {a.unlocked ? '✓ Unlocked' : '🔒 Locked'}
                      </span>
                      {a.unlocked && a.unlockedAt && (
                        <span className="text-[10px] text-gray-500 font-medium">
                          {new Date(a.unlockedAt).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  </div>
                </motion.div>
              );
            })}
            </AnimatePresence>
          </motion.div>
        )}
      </div>
    </div>
  );
}
