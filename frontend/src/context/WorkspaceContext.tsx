"use client";
import React, { createContext, useContext, useState, ReactNode } from 'react';
import type { Mission, UserData, ProfileData, GamificationData } from '../components/BlocklyWorkspace.tsx';
import type { AdaptiveInsights } from '../types/adaptivity';

interface WorkspaceContextType {
  mission: Mission | null;
  user: UserData | null;
  profile: ProfileData | null;
  gamification: GamificationData | null;
  insights: AdaptiveInsights | null;
  setWorkspace: (data: {
    mission: Mission;
    user: UserData;
    profile: ProfileData;
    gamification?: GamificationData | null;
    insights?: AdaptiveInsights | null;
  }) => void;
  clearWorkspace: () => void;
}

const WorkspaceContext = createContext<WorkspaceContextType | undefined>(undefined);

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const [mission, setMission] = useState<Mission | null>(null);
  const [user, setUser] = useState<UserData | null>(null);
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [gamification, setGamification] = useState<GamificationData | null>(null);
  const [insights, setInsights] = useState<AdaptiveInsights | null>(null);

  const setWorkspace = (data: {
    mission: Mission;
    user: UserData;
    profile: ProfileData;
    gamification?: GamificationData | null;
    insights?: AdaptiveInsights | null;
  }) => {
    setMission(data.mission);
    setUser(data.user);
    setProfile(data.profile);
    setGamification(data.gamification ?? null);
    setInsights(data.insights ?? null);
  };

  const clearWorkspace = () => {
    setMission(null);
    setUser(null);
    setProfile(null);
    setGamification(null);
    setInsights(null);
  };

  return (
    <WorkspaceContext.Provider value={{ mission, user, profile, gamification, insights, setWorkspace, clearWorkspace }}>
      {children}
    </WorkspaceContext.Provider>
  );
}

export function useWorkspace() {
  const ctx = useContext(WorkspaceContext);
  if (!ctx) throw new Error('useWorkspace must be used within a WorkspaceProvider');
  return ctx;
}
