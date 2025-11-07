"use client";
import React, { createContext, useContext, useState, ReactNode } from 'react';
import type { Mission, UserData, ProfileData } from '../components/BlocklyWorkspace';
import type { AdaptiveInsights } from '../types/adaptivity';

interface WorkspaceContextType {
  mission: Mission | null;
  user: UserData | null;
  profile: ProfileData | null;
  insights: AdaptiveInsights | null;
  setWorkspace: (data: {
    mission: Mission;
    user: UserData;
    profile: ProfileData;
    insights?: AdaptiveInsights | null;
  }) => void;
}

const WorkspaceContext = createContext<WorkspaceContextType | undefined>(undefined);

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const [mission, setMission] = useState<Mission | null>(null);
  const [user, setUser] = useState<UserData | null>(null);
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [insights, setInsights] = useState<AdaptiveInsights | null>(null);

  const setWorkspace = (data: {
    mission: Mission;
    user: UserData;
    profile: ProfileData;
    insights?: AdaptiveInsights | null;
  }) => {
    setMission(data.mission);
    setUser(data.user);
    setProfile(data.profile);
    setInsights(data.insights ?? null);
  };

  return (
    <WorkspaceContext.Provider value={{ mission, user, profile, insights, setWorkspace }}>
      {children}
    </WorkspaceContext.Provider>
  );
}

export function useWorkspace() {
  const ctx = useContext(WorkspaceContext);
  if (!ctx) throw new Error('useWorkspace must be used within a WorkspaceProvider');
  return ctx;
}
