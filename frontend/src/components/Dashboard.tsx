"use client";
import { useState, useEffect } from 'react';
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
import BlocklyWorkspace from './BlocklyWorkspace';
import { sendChatMessage, getPredefinedPrompts, checkAIServiceHealth } from '../services/chatbotApi';
import { useRouter } from 'next/navigation';
import { useWorkspace } from '../context/WorkspaceContext';

// User data type
type UserData = {
  username: string;
  avatar: string;
  ageRange: string;
  role: string;
  guardianEmail?: string;
};

type ProfileData = {
  codingExperience: string;
  pythonFamiliarity: string;
  knownConcepts: string[];
  weakSkills: string[];
  strongSkills: string[];
  completedMissions: string[];
  totalSubmissions: number;
  successfulSubmissions: number;
  avgAccuracy: number;
  xp: number;
  level: number;
  badges: string[];
  skillScores: Record<string, number>;
  lastActive?: string;
};

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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedMission, setSelectedMission] = useState<Mission | null>(null);

  // XP percentage (safe fallback)
  const xpPercentage = profile ? (profile.xp / (profile.level * 100 || 1)) * 100 : 0;

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
        // Fetch missions
        const missionsRes = await fetch('http://localhost:5000/missions', {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!missionsRes.ok) throw new Error('Failed to fetch missions');
        const missionsData = await missionsRes.json();
        setMissions(missionsData);
      } catch (err: any) {
        setError(err.message || 'Error loading user');
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
    setWorkspace({ mission, user, profile });
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
            sendChatMessage={sendChatMessage}
            getPredefinedPrompts={getPredefinedPrompts}
            checkAIServiceHealth={checkAIServiceHealth}
          />
        </div>
      </div>
    );
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
                    Level {profile.level}
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
                      <span>{profile.xp} XP</span>
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
                    <span className="hidden sm:inline">View Badges</span>
                    <span className="sm:hidden">Badges</span>
                  </Button>
                </SheetTrigger>
              <SheetContent className="w-full sm:max-w-md">
                <SheetHeader>
                  <SheetTitle className="text-2xl">Your Achievements 🏆</SheetTitle>
                  <SheetDescription>
                    Keep coding to unlock more badges!
                  </SheetDescription>
                </SheetHeader>
                
                <div className="mt-6 grid grid-cols-2 gap-4">
                  {(profile.badges && profile.badges.length > 0) ? (
                    profile.badges.map((badge, i) => (
                      <motion.div
                        key={i}
                        whileHover={{ scale: 1.05 }}
                        className={`p-4 rounded-2xl border-2 text-center bg-gradient-to-br from-yellow-50 to-orange-50 border-yellow-300`}
                      >
                        <div className="text-4xl mb-2">🏅</div>
                        <p className="text-sm text-gray-700">{badge}</p>
                        <Badge className="mt-2 bg-green-500 text-white border-0 text-xs">
                          Earned!
                        </Badge>
                      </motion.div>
                    ))
                  ) : (
                    <div className="text-center text-gray-400 py-8">No badges earned yet.</div>
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
                {profile.xp} / {profile.level * 100} XP
              </span>
            </div>
            <Progress value={xpPercentage} className={`bg-gray-200 transition-all duration-300 ${
              isScrolled ? 'h-2' : 'h-4'
            }`} />
          </div>
        </div>
      </div>

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
                      className={`w-36 h-36 rounded-full border-4 shadow-2xl transition-all border-indigo-300 shadow-indigo-200`}
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
                      <p className="text-sm text-gray-800 mb-1">
                        {mission.title}
                      </p>
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
