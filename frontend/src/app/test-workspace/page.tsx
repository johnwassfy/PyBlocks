'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import TestBlocklyWorkspace from '../../components/TestBlocklyWorkspace';
import { useWorkspace } from '../../context/WorkspaceContext';

export default function TestWorkspacePage() {
  const router = useRouter();
  const { mission, user, clearWorkspace, setWorkspace } = useWorkspace();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check if context has data, if not try to restore from sessionStorage
    if (!mission || !user) {
      console.log('🧪 Test context is empty, checking sessionStorage...');
      const storedData = sessionStorage.getItem('workspaceData');

      if (storedData) {
        try {
          const parsedData = JSON.parse(storedData);
          console.log('🧪 Restoring test workspace data from sessionStorage:', parsedData);
          setWorkspace(parsedData);
          setIsLoading(false);
          // Clear sessionStorage after restoring
          sessionStorage.removeItem('workspaceData');
          return;
        } catch (error) {
          console.error('Failed to parse workspace data from sessionStorage:', error);
        }
      }

      // If still no data after checking sessionStorage, redirect
      console.warn('🧪 Missing test workspace data:', { mission, user });
      console.warn('Redirecting to dashboard');
      setIsLoading(false);
      router.push('/dashboard');
    } else {
      // Verify this is actually a test mission
      const isTestMission = /^(Pre|Post)[123]$/i.test(mission.title);
      if (!isTestMission) {
        console.warn('🧪 Mission is not a test mission, redirecting to regular workspace');
        router.push('/blockly-workspace');
        return;
      }

      console.log('🧪 Test workspace data loaded successfully:', { mission: mission.title, user: user.username });
      setIsLoading(false);
    }

    // Cleanup function to clear workspace context when leaving the page
    return () => {
      clearWorkspace();
    };
  }, [mission, user, router, clearWorkspace, setWorkspace]);

  if (isLoading || !mission || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-yellow-100 via-orange-50 to-red-100">
        <div className="text-xl text-gray-500 animate-pulse">
          {isLoading ? 'Loading test workspace...' : 'Redirecting to dashboard...'}
        </div>
      </div>
    );
  }

  return (
    <TestBlocklyWorkspace
      mission={mission}
      user={user}
    />
  );
}
