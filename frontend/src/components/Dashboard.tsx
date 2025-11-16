"use client";
import { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { 
  Star, 
  Lock, 
  Trophy, 
  Zap, 
  Award, 
  ChevronRight,
  Sparkles,
  Target,
  Flame,
  Crown,
  Settings,
  LogOut,
  Menu
} from 'lucide-react';
import { Button } from './ui/button';
import { Progress } from './ui/progress';
import { Badge } from './ui/badge';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from './ui/sheet';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';
import BlocklyWorkspace, { type UserData, type ProfileData, type GamificationData, type Achievement } from './BlocklyWorkspace';
import { sendChatMessage, getPredefinedPrompts, checkAIServiceHealth } from '../services/chatbotApi';
import { useRouter } from 'next/navigation';
import { useWorkspace } from '../context/WorkspaceContext';
import type { AdaptiveInsights } from '../types/adaptivity';

// Mission data
type Mission = {
  _id: string;
  title: string;
  description: string;
  order: number;
  xpReward: number;
  difficulty: string;
  tags: string[];
  objectives: string[];
  hints: string[];
  starterCode?: string;
  expectedOutput?: string;
  estimatedTime?: number;
  testCases?: { input: string; expectedOutput: string }[];
  config?: any;
  concepts: string[];
  analytics?: any;
};

const missionColors = [
  'from-purple-400 to-purple-600',
  'from-blue-400 to-blue-600',
  'from-green-400 to-green-600',
  'from-yellow-400 to-yellow-600',
  'from-pink-400 to-pink-600',
  'from-indigo-400 to-indigo-600',
  'from-red-400 to-red-600',
  'from-teal-400 to-teal-600',
  'from-orange-400 to-orange-600',
  'from-cyan-400 to-cyan-600',
  'from-violet-400 to-violet-600',
  'from-emerald-400 to-emerald-600',
];



export default function Dashboard() {
  const router = useRouter();
  const { setWorkspace } = useWorkspace();
  const [missions, setMissions] = useState<Mission[]>([]);
  const [isScrolled, setIsScrolled] = useState(false);
  const [user, setUser] = useState<UserData | null>(null);
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [gamification, setGamification] = useState<GamificationData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedMission, setSelectedMission] = useState<Mission | null>(null);
  const [insights, setInsights] = useState<AdaptiveInsights | null>(null);

  // XP percentage (safe fallback)
  const xpPercentage = gamification ? (gamification.xp / (gamification.level * 100 || 1)) * 100 : 0;

  const recommendedMissionIds = useMemo(
    () => new Set(insights?.recommendations.map((mission) => mission.id) ?? []),
    [insights],
  );

  const topMastery = useMemo(() => {
    if (!insights) return [] as Array<[string, number]>;
    return Object.entries(insights.mastery)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);
  }, [insights]);

  const focusConcepts = useMemo(
    () => insights?.weakConcepts.slice(0, 5) ?? [],
    [insights],
  );

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        const token = localStorage.getItem('token');
        if (!token) throw new Error('Not authenticated');
        // Fetch user info
        const userRes = await fetch('http://localhost:5000/users/profile', {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!userRes.ok) throw new Error('Failed to fetch user data');
        const userData = await userRes.json();
        setUser(userData);
        // Fetch learning profile
        const profileRes = await fetch('http://localhost:5000/learning-profile', {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!profileRes.ok) throw new Error('Failed to fetch learning profile');
        const profileData = await profileRes.json();
        setProfile(profileData);
        // Fetch gamification data
        const gamificationRes = await fetch('http://localhost:5000/gamification/my-profile', {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!gamificationRes.ok) throw new Error('Failed to fetch gamification data');
        const gamificationData = await gamificationRes.json();
        setGamification(gamificationData);
        // Fetch missions
        const missionsRes = await fetch('http://localhost:5000/missions', {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!missionsRes.ok) throw new Error('Failed to fetch missions');
        const missionsData = await missionsRes.json();
        setMissions(missionsData);

        const insightsRes = await fetch('http://localhost:5000/adaptivity/insights', {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!insightsRes.ok) throw new Error('Failed to fetch adaptive insights');
        const insightsData: AdaptiveInsights = await insightsRes.json();
        setInsights(insightsData);
      } catch (err: any) {
        setError(err.message || 'Error loading user');
        setInsights(null);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const navigate = (path: string) => {
    window.history.pushState({}, '', path);
    window.dispatchEvent(new PopStateEvent('popstate'));
  };

  // Clicking a mission sets workspace data and navigates
  const handleMissionClick = (mission: Mission) => {
    if (!user || !profile) return;
    setWorkspace({ mission, user, profile, insights, gamification });
    router.push('/blockly-workspace');
  };


  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-100 via-purple-50 to-pink-100">
        <div className="text-xl text-gray-500 animate-pulse">Loading your dashboard...</div>
      </div>
    );
  }

  if (error || !user || !profile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-100 via-purple-50 to-pink-100">
        <div className="text-xl text-red-500">{error || 'User/profile not found.'}</div>
      </div>
    );
  }

  // Show BlocklyWorkspace when a mission is selected
  if (selectedMission) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-100 via-purple-50 to-pink-100">
        <div className="container mx-auto py-8">
          <button
            className="mb-4 px-4 py-2 bg-purple-500 text-white rounded shadow"
            onClick={() => setSelectedMission(null)}
          >
            ← Back to Mission Map
          </button>
          <h2 className="text-2xl font-bold mb-2">{selectedMission.title}</h2>
          <p className="mb-4 text-gray-700">{selectedMission.description}</p>
          <BlocklyWorkspace
            mission={selectedMission}
            user={user}
            profile={profile}
            gamification={gamification}
            sendChatMessage={sendChatMessage}
            getPredefinedPrompts={getPredefinedPrompts}
            checkAIServiceHealth={checkAIServiceHealth}
          />
        </div>
      </div>
    );
  }

  // Debug: Log completed missions and all mission IDs before rendering
  if (gamification && missions && gamification.completedMissions) {
    // eslint-disable-next-line no-console
    console.log('Completed missions:', gamification.completedMissions);
    // eslint-disable-next-line no-console
    console.log('All missions:', missions.map(m => m._id));
    // eslint-disable-next-line no-console
    console.log('Mission titles:', missions.map(m => ({ id: m._id, title: m.title })));
    // Check for any matches
    const matches = gamification.completedMissions.filter(id => missions.some(m => m._id === id));
    // eslint-disable-next-line no-console
    console.log('Matching missions found:', matches.length);
    if (matches.length === 0) {
      // eslint-disable-next-line no-console
      console.warn('⚠️ ID MISMATCH: The completed mission IDs do not match any current mission IDs. This likely means missions were recreated in the database.');
    }
  }
  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-100 via-purple-50 to-pink-100">
      {/* Header with Profile */}
      <div className={`sticky top-0 z-50 transition-all duration-300 ${
        isScrolled 
          ? 'bg-white/95 backdrop-blur-md border-b-2 border-indigo-200 shadow-xl' 
          : 'bg-white border-b-4 border-indigo-200 shadow-lg'
      }`}>
        <div className={`container mx-auto px-4 transition-all duration-300 ${
          isScrolled ? 'py-2' : 'py-4'
        }`}>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            {/* Profile Section */}
            <div className="flex items-center gap-4">
              <motion.div
                whileHover={{ scale: 1.05, rotate: 5 }}
                className={`bg-gradient-to-br from-yellow-400 to-orange-500 rounded-3xl flex items-center justify-center shadow-lg border-4 border-white cursor-pointer transition-all duration-300 ${
                  isScrolled 
                    ? 'w-12 h-12 sm:w-14 sm:h-14' 
                    : 'w-16 h-16 sm:w-20 sm:h-20'
                }`}
              >
                <span className={`transition-all duration-300 ${
                  isScrolled ? 'text-2xl sm:text-3xl' : 'text-3xl sm:text-4xl'
                }`}>{user.avatar}</span>
              </motion.div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h2 className={`text-gray-900 transition-all duration-300 ${
                    isScrolled ? 'text-lg sm:text-xl' : 'text-xl sm:text-2xl'
                  }`}>{user.username}</h2>
                  <Badge className={`bg-gradient-to-r from-purple-500 to-pink-500 text-white border-0 transition-all duration-300 ${
                    isScrolled ? 'text-xs' : ''
                  }`}>
                    <Crown className={`mr-1 transition-all duration-300 ${
                      isScrolled ? 'w-2.5 h-2.5' : 'w-3 h-3'
                    }`} />
                    Level {gamification?.level || 1}
                  </Badge>
                </div>
                  <div className="flex items-center gap-3 text-sm">
                    {/* Streak is not in profile schema; remove or add if implemented */}
                    <div className="flex items-center gap-1 text-orange-600">
                      <Flame className="w-4 h-4" />
                      <span>Keep coding every day!</span>
                    </div>
                    <div className="hidden sm:flex items-center gap-1 text-yellow-600">
                      <Zap className="w-4 h-4" />
                      <span>{gamification?.xp || 0} XP</span>
                    </div>
                  </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-3">
              <Sheet>
                <SheetTrigger asChild>
                  <Button 
                    className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white shadow-lg rounded-2xl px-4 py-2"
                  >
                    <Trophy className="w-5 h-5 mr-2" />
                    <span className="hidden sm:inline">View Achievements</span>
                    <span className="sm:hidden">Achievements</span>
                  </Button>
                </SheetTrigger>
                <SheetContent className="w-full sm:max-w-md overflow-y-auto">
                <SheetHeader>
                  <SheetTitle className="text-2xl">Your Achievements 🏆</SheetTitle>
                  <SheetDescription>
                    Keep coding to unlock more achievements!
                    {insights?.gamification?.achievements && 
                      ` ${insights.gamification.achievements.length} unlocked so far!`}
                  </SheetDescription>
                </SheetHeader>
                
                <div className="mt-6 space-y-4">
                  {insights?.gamification?.achievements ? (() => {
                    // Define all possible achievements
                    const allAchievements = [
                      { id: 'first_mission', name: 'First Steps 🐣', description: 'Complete your very first mission!', icon: '🐣', rarity: 'common', category: 'mission' },
                      { id: 'five_missions', name: 'Getting Started 🌱', description: 'Complete 5 missions!', icon: '🌱', rarity: 'common', category: 'mission' },
                      { id: 'ten_missions', name: 'Problem Solver 🧩', description: 'Complete 10 missions!', icon: '🧩', rarity: 'rare', category: 'mission' },
                      { id: 'twenty_missions', name: 'Code Explorer 🗺️', description: 'Complete 20 missions!', icon: '🗺️', rarity: 'rare', category: 'mission' },
                      { id: 'fifty_missions', name: 'Master Coder 🎓', description: 'Complete 50 missions!', icon: '🎓', rarity: 'epic', category: 'mission' },
                      { id: 'hundred_missions', name: 'Coding Legend 👑', description: 'Complete 100 missions! You are amazing!', icon: '👑', rarity: 'legendary', category: 'mission' },
                      { id: 'xp_100', name: 'Rookie Coder 🌟', description: 'Earn 100 XP!', icon: '🌟', rarity: 'common', category: 'xp' },
                      { id: 'xp_500', name: 'Rising Star ⭐', description: 'Earn 500 XP!', icon: '⭐', rarity: 'common', category: 'xp' },
                      { id: 'xp_1000', name: 'Code Warrior ⚔️', description: 'Earn 1,000 XP!', icon: '⚔️', rarity: 'rare', category: 'xp' },
                      { id: 'xp_2500', name: 'Python Wizard 🧙', description: 'Earn 2,500 XP!', icon: '🧙', rarity: 'epic', category: 'xp' },
                      { id: 'xp_5000', name: 'Coding Champion 🏆', description: 'Earn 5,000 XP!', icon: '🏆', rarity: 'legendary', category: 'xp' },
                      { id: 'streak_3', name: 'On Fire 🔥', description: 'Learn for 3 days in a row!', icon: '🔥', rarity: 'common', category: 'streak' },
                      { id: 'streak_7', name: 'Week Warrior 📅', description: 'Learn for 7 days in a row!', icon: '📅', rarity: 'rare', category: 'streak' },
                      { id: 'streak_14', name: 'Dedicated Learner 💪', description: 'Learn for 14 days in a row!', icon: '💪', rarity: 'rare', category: 'streak' },
                      { id: 'streak_30', name: 'Monthly Master 🌙', description: 'Learn for 30 days in a row!', icon: '🌙', rarity: 'epic', category: 'streak' },
                      { id: 'streak_100', name: 'Unstoppable 🚀', description: 'Learn for 100 days in a row! Incredible!', icon: '🚀', rarity: 'legendary', category: 'streak' },
                      { id: 'speed_demon', name: 'Speed Demon ⚡', description: 'Complete a mission in under 2 minutes!', icon: '⚡', rarity: 'rare', category: 'speed' },
                      { id: 'lightning_fast', name: 'Lightning Fast 🌩️', description: 'Complete a hard mission in under 5 minutes!', icon: '🌩️', rarity: 'epic', category: 'speed' },
                      { id: 'perfect_ten', name: 'Perfect Ten 💯', description: 'Get a perfect score on 10 missions!', icon: '💯', rarity: 'epic', category: 'mastery' },
                      { id: 'no_hints', name: 'Brain Power 🧠', description: 'Complete a hard mission without using hints!', icon: '🧠', rarity: 'rare', category: 'mastery' },
                      { id: 'first_try', name: 'One Shot Wonder 🎯', description: 'Complete a mission on your first try!', icon: '🎯', rarity: 'rare', category: 'mastery' },
                      { id: 'night_owl', name: 'Night Owl 🦉', description: 'Complete a mission after 9 PM!', icon: '🦉', rarity: 'common', category: 'special' },
                      { id: 'early_bird', name: 'Early Bird 🐦', description: 'Complete a mission before 7 AM!', icon: '🐦', rarity: 'common', category: 'special' },
                      { id: 'weekend_warrior', name: 'Weekend Warrior 🎮', description: 'Complete 5 missions on a weekend!', icon: '🎮', rarity: 'rare', category: 'special' },
                      { id: 'bug_hunter', name: 'Bug Hunter 🐛', description: 'Fix 10 syntax errors!', icon: '🐛', rarity: 'common', category: 'special' },
                      { id: 'creative_genius', name: 'Creative Genius 🎨', description: 'Be creative with code!', icon: '🎨', rarity: 'rare', category: 'special' },
                    ];
                    
                    const unlockedIds = new Set(insights.gamification.achievements.map((a: any) => a.id));
                    
                    const rarityStyles = {
                      common: 'from-gray-50 to-gray-100 border-gray-300',
                      rare: 'from-blue-50 to-blue-100 border-blue-400',
                      epic: 'from-purple-50 to-purple-100 border-purple-400',
                      legendary: 'from-yellow-50 to-amber-100 border-amber-400'
                    };
                    
                    const rarityBadges = {
                      common: 'bg-gray-500',
                      rare: 'bg-blue-500',
                      epic: 'bg-purple-500',
                      legendary: 'bg-gradient-to-r from-yellow-500 to-amber-500'
                    };
                    
                    return allAchievements.map((achievement, i) => {
                      const isUnlocked = unlockedIds.has(achievement.id);
                      const unlockedAchievement = insights.gamification.achievements.find((a: any) => a.id === achievement.id);
                      
                      return (
                        <motion.div
                          key={achievement.id}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: i * 0.05 }}
                          whileHover={isUnlocked ? { scale: 1.02 } : {}}
                          className={`p-4 rounded-2xl border-2 bg-gradient-to-br transition-all ${
                            isUnlocked
                              ? `${rarityStyles[achievement.rarity as 'common' | 'rare' | 'epic' | 'legendary'] || rarityStyles.common} shadow-md opacity-100`
                              : 'from-gray-100 to-gray-150 border-gray-200 shadow-sm opacity-60 grayscale'
                          }`}
                        >
                          <div className="flex items-start gap-3">
                            <div className={`text-5xl transition-all ${!isUnlocked ? 'opacity-50 grayscale' : ''}`}>
                              {achievement.icon}
                            </div>
                            <div className="flex-1">
                              <h4 className={`font-bold mb-1 ${isUnlocked ? 'text-gray-800' : 'text-gray-500'}`}>
                                {achievement.name}
                              </h4>
                              <p className={`text-xs mb-2 ${isUnlocked ? 'text-gray-600' : 'text-gray-400'}`}>
                                {achievement.description}
                              </p>
                              <div className="flex items-center gap-2 flex-wrap">
                                <Badge className={`${
                                  isUnlocked
                                    ? `${rarityBadges[achievement.rarity as 'common' | 'rare' | 'epic' | 'legendary'] || rarityBadges.common} text-white border-0`
                                    : 'bg-gray-300 text-gray-600 border-0'
                                } text-xs capitalize`}>
                                  {achievement.rarity}
                                </Badge>
                                <Badge className={`text-xs capitalize ${
                                  isUnlocked
                                    ? 'bg-indigo-100 text-indigo-700 border-indigo-200'
                                    : 'bg-gray-200 text-gray-500 border-gray-300'
                                }`}>
                                  {achievement.category}
                                </Badge>
                                {isUnlocked && unlockedAchievement?.unlockedAt && (
                                  <span className="text-xs text-gray-500">
                                    {new Date(unlockedAchievement.unlockedAt).toLocaleDateString()}
                                  </span>
                                )}
                                {!isUnlocked && (
                                  <span className="text-xs text-gray-400 font-medium">🔒 Locked</span>
                                )}
                              </div>
                            </div>
                          </div>
                        </motion.div>
                      );
                    });
                  })() : (
                    <div className="text-center text-gray-400 py-8">
                      <Trophy className="w-16 h-16 mx-auto mb-4 opacity-30" />
                      <p>No achievements data available.</p>
                      <p className="text-sm mt-2">Complete missions to earn your first achievement!</p>
                    </div>
                  )}
                </div>
              </SheetContent>
              </Sheet>

              {/* Settings Menu */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button 
                    className="rounded-2xl border-2 p-2"
                  >
                    <Menu className="w-5 h-5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuItem>
                    <Settings className="w-4 h-4 mr-2" />
                    Settings
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate('/')}> 
                    <LogOut className="w-4 h-4 mr-2" />
                    Sign Out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          {/* XP Progress Bar */}
          <div className={`bg-gray-100 rounded-2xl border-2 border-indigo-100 transition-all duration-300 overflow-hidden ${
            isScrolled ? 'mt-2 p-2 max-h-16 opacity-90' : 'mt-4 p-4 max-h-32'
          }`}>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Target className={`text-indigo-600 transition-all duration-300 ${
                  isScrolled ? 'w-4 h-4' : 'w-5 h-5'
                }`} />
                <span className={`text-gray-700 transition-all duration-300 ${
                  isScrolled ? 'text-xs' : 'text-sm'
                }`}>Progress to Level {1}</span>
              </div>
              <span className={`text-gray-600 transition-all duration-300 ${
                isScrolled ? 'text-xs' : 'text-sm'
              }`}>
                {gamification?.xp || 0} / {(gamification?.level || 1) * 100} XP
              </span>
            </div>
            <Progress value={xpPercentage} className={`bg-gray-200 transition-all duration-300 ${
              isScrolled ? 'h-2' : 'h-4'
            }`} />
          </div>
        </div>
      </div>

    {insights && (
      <div className="container mx-auto px-4 py-6">
        <div className="grid gap-6 lg:grid-cols-3">
          <motion.div
            whileHover={{ y: -4 }}
            className="rounded-3xl border-2 border-indigo-100 bg-white/90 p-6 shadow-xl"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-indigo-700">Today's Focus</h3>
              <Sparkles className="w-5 h-5 text-indigo-500" />
            </div>
            <p className="text-sm text-gray-600">Give extra love to these concepts:</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {focusConcepts.length > 0 ? (
                focusConcepts.map((concept) => (
                  <span
                    key={concept}
                    className="px-3 py-1 rounded-full bg-amber-100 text-amber-700 text-xs font-medium"
                  >
                    {concept}
                  </span>
                ))
              ) : (
                <span className="text-xs text-gray-500">No focus areas right now — keep exploring! 🚀</span>
              )}
            </div>
            {insights.strongConcepts.length > 0 && (
              <div className="mt-6">
                <p className="text-sm text-gray-600 mb-2">Super strengths:</p>
                <div className="flex flex-wrap gap-2">
                  {insights.strongConcepts.slice(0, 4).map((concept) => (
                    <span
                      key={concept}
                      className="px-3 py-1 rounded-full bg-emerald-100 text-emerald-700 text-xs font-medium"
                    >
                      {concept}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </motion.div>

          <motion.div
            whileHover={{ y: -4 }}
            className="rounded-3xl border-2 border-purple-100 bg-white/90 p-6 shadow-xl"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-purple-700">Recommended Missions</h3>
              <Trophy className="w-5 h-5 text-purple-500" />
            </div>
            {insights.recommendations.length > 0 ? (
              <ul className="space-y-3">
                {insights.recommendations.map((mission) => (
                  <li
                    key={mission.id}
                    className="rounded-2xl border border-purple-100 bg-purple-50/50 p-3"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-semibold text-purple-700">{mission.title}</p>
                        <p className="text-xs text-gray-500">
                          {mission.difficulty ? mission.difficulty.toUpperCase() : 'Mission'}
                        </p>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-xs"
                        onClick={() => {
                          const nextMission = missions.find((m) => m._id === mission.id);
                          if (nextMission) {
                            handleMissionClick(nextMission);
                          }
                        }}
                      >
                        Start
                      </Button>
                    </div>
                    {mission.tags && mission.tags.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {mission.tags.slice(0, 3).map((tag) => (
                          <span
                            key={tag}
                            className="px-2 py-0.5 rounded-full bg-white text-[10px] text-purple-500 border border-purple-100"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            ) : (
              <div className="rounded-2xl border border-dashed border-purple-200 bg-purple-50/40 p-4 text-sm text-purple-700">
                We’re preparing new adventures for you. Keep coding to unlock more quests!
              </div>
            )}
            {insights.fallbackMission && (
              <div className="mt-4 rounded-2xl bg-indigo-50 border border-indigo-100 p-3 text-xs text-indigo-600">
                Next in path: {insights.fallbackMission.title}
              </div>
            )}
          </motion.div>

          <motion.div
            whileHover={{ y: -4 }}
            className="rounded-3xl border-2 border-pink-100 bg-white/90 p-6 shadow-xl"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-pink-700">Progress Pulse</h3>
              <Target className="w-5 h-5 text-pink-500" />
            </div>
            <div className="space-y-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Improvement boost</span>
                <span className="font-semibold text-pink-600">
                  {Math.round((insights.improvementFactor || 0) * 100)}%
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Missions completed</span>
                <span className="font-semibold text-gray-700">
                  {insights.totals.missionsCompleted}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Average score</span>
                <span className="font-semibold text-gray-700">
                  {Math.round(insights.totals.averageScore)}%
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Daily streak</span>
                <span className="font-semibold text-orange-500">
                  {insights.gamification.streak}🔥
                </span>
              </div>
            </div>
            {topMastery.length > 0 && (
              <div className="mt-4">
                <p className="text-xs uppercase tracking-wide text-gray-500">Mastery Snapshot</p>
                <ul className="mt-2 space-y-1 text-xs text-gray-600">
                  {topMastery.map(([concept, score]) => (
                    <li key={concept} className="flex items-center justify-between">
                      <span>{concept}</span>
                      <span className="font-semibold text-gray-700">{score}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </motion.div>
        </div>
      </div>
    )}

      {/* Main Content - Mission Map */}
      <div className="px-4 py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8 text-center container mx-auto"
        >
          <h1 className="text-3xl sm:text-4xl text-gray-900 mb-2 flex items-center justify-center gap-3">
            <Sparkles className="w-8 h-8 text-purple-600" />
            Your Mission Map
          </h1>
          <p className="text-lg text-gray-600">
            Scroll right to explore missions and level up! 🚀
          </p>
        </motion.div>

        {/* Horizontal Mission Map - Scrollable */}
        <div className="overflow-x-auto overflow-y-hidden pb-8 scrollbar-hide">
          <div className="relative mx-auto" style={{ width: `${missions.length * 220}px`, height: '450px' }}>
            {/* Winding Path Background */}
            <svg 
              className="absolute inset-0 w-full h-full pointer-events-none"
              preserveAspectRatio="none"
            >
              <defs>
                <linearGradient id="pathGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#a78bfa" stopOpacity="0.4" />
                  <stop offset="50%" stopColor="#ec4899" stopOpacity="0.4" />
                  <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0.4" />
                </linearGradient>
              </defs>
              {missions.slice(0, -1).map((_, index) => {
                const getXPosition = (idx: number) => {
                  const xOffsets = [20, 60, 35, 80, 45, 25, 70, 40, 55, 30, 65, 50];
                  return idx * 220 + xOffsets[idx % xOffsets.length];
                };
                const getYPosition = (idx: number) => {
                  const patterns = [20, 55, 28, 60, 35, 48, 25, 58, 32, 52, 38, 56, 30, 50, 36, 45];
                  return patterns[idx % patterns.length];
                };
                const x1 = getXPosition(index);
                const x2 = getXPosition(index + 1);
                const startY = getYPosition(index);
                const endY = getYPosition(index + 1);
                const midX = (x1 + x2) / 2;
                return (
                  <motion.path
                    key={index}
                    d={`M ${x1} ${startY}% Q ${midX} ${(startY + endY) / 2}%, ${x2} ${endY}%`}
                    stroke="url(#pathGradient)"
                    strokeWidth="4"
                    strokeDasharray="10,10"
                    fill="none"
                    initial={{ pathLength: 0, opacity: 0 }}
                    animate={{ pathLength: 1, opacity: 1 }}
                    transition={{ duration: 0.5, delay: index * 0.1 }}
                  />
                );
              })}
            </svg>

            {/* Mission Circles */}
            {missions.map((mission, index) => {
              const colorClass = missionColors[index % missionColors.length];
              const leftPosition = index * 220 + [20, 60, 35, 80, 45, 25, 70, 40, 55, 30, 65, 50][index % 12];
              const topPosition = `${[20, 55, 28, 60, 35, 48, 25, 58, 32, 52, 38, 56, 30, 50, 36, 45][index % 16]}%`;
              const isRecommended = recommendedMissionIds.has(mission._id);
              const isSolved = gamification?.completedMissions ? gamification.completedMissions.includes(mission._id) : false;
              const ringClasses = isSolved
                ? 'border-emerald-400 shadow-emerald-200'
                : isRecommended
                  ? 'border-amber-300 shadow-amber-200 animate-pulse'
                  : 'border-indigo-300 shadow-indigo-200';
              return (
                <motion.div
                  key={mission._id}
                  initial={{ opacity: 0, scale: 0.5 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: index * 0.1 }}
                  whileHover={{ scale: 1.15, y: -10 }}
                  className="absolute cursor-pointer"
                  style={{
                    left: `${leftPosition}px`,
                    top: topPosition,
                    transform: 'translateY(-50%)',
                  }}
                  onClick={() => handleMissionClick(mission)}
                >
                  {/* Circular Mission Block */}
                  <div className="relative">
                    {/* Main Circle */}
                    <div 
                      className={`w-36 h-36 rounded-full border-4 shadow-2xl transition-all ${ringClasses} ${isSolved ? 'opacity-80' : ''}`}
                    >
                      {/* Gradient Background */}
                      <div className={`w-full h-full rounded-full bg-gradient-to-br ${colorClass} flex flex-col items-center justify-center p-4 relative overflow-hidden`}>
                        {/* Decorative circles */}
                        <div className="absolute inset-0 opacity-20">
                          <div className="absolute top-0 right-0 w-20 h-20 bg-white rounded-full -translate-y-1/2 translate-x-1/2" />
                          <div className="absolute bottom-0 left-0 w-16 h-16 bg-white rounded-full translate-y-1/2 -translate-x-1/2" />
                        </div>
                        {/* Content */}
                        <div className="relative z-10 text-center">
                          <motion.div
                            whileHover={{ rotate: 360 }}
                            transition={{ duration: 0.5 }}
                            className="text-4xl text-white mb-1"
                          >
                            {mission.order ?? index + 1}
                          </motion.div>
                        </div>
                      </div>
                    </div>
                    {/* Mission Title Below Circle */}
                    <div className="absolute top-full mt-4 left-1/2 transform -translate-x-1/2 w-36 text-center">
                      <p className={`text-sm mb-1 ${isSolved ? 'text-emerald-700 font-bold' : 'text-gray-800'}`}> 
                        {mission.title}
                      </p>
                      {isSolved && (
                        <span className="inline-block text-[10px] px-2 py-1 rounded-full bg-emerald-100 text-emerald-700 font-semibold mr-1">
                          Solved ✓
                        </span>
                      )}
                      {isRecommended && (
                        <span className="inline-block text-[10px] px-2 py-1 rounded-full bg-amber-100 text-amber-700 font-semibold">
                          Recommended ⭐
                        </span>
                      )}
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>


      </div>
    </div>
  );
}
