"use client";
import React, { createContext, useContext, useState, ReactNode } from 'react';
import type { Mission, UserData, ProfileData } from '../components/BlocklyWorkspace';

interface WorkspaceContextType {
  mission: Mission | null;
  user: UserData | null;
  profile: ProfileData | null;
  setWorkspace: (data: { mission: Mission; user: UserData; profile: ProfileData }) => void;
}

const WorkspaceContext = createContext<WorkspaceContextType | undefined>(undefined);

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const [mission, setMission] = useState<Mission | null>(null);
  const [user, setUser] = useState<UserData | null>(null);
  const [profile, setProfile] = useState<ProfileData | null>(null);

  const setWorkspace = (data: { mission: Mission; user: UserData; profile: ProfileData }) => {
    setMission(data.mission);
    setUser(data.user);
    setProfile(data.profile);
  };

  return (
    <WorkspaceContext.Provider value={{ mission, user, profile, setWorkspace }}>
      {children}
    </WorkspaceContext.Provider>
  );
}

export function useWorkspace() {
  const ctx = useContext(WorkspaceContext);
  if (!ctx) throw new Error('useWorkspace must be used within a WorkspaceProvider');
  return ctx;
}
