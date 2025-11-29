'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import BlocklyWorkspace from '../../components/BlocklyWorkspace';
import KidSidebar from '../../components/KidSidebar';
import { useWorkspace } from '../../context/WorkspaceContext';
import { sendChatMessage, getPredefinedPrompts, checkAIServiceHealth } from '../../services/chatbotApi';

export default function WorkspacePage() {
  const router = useRouter();
  const { mission, user, profile, gamification, setWorkspace, clearWorkspace } = useWorkspace();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check if context has data, if not try to restore from sessionStorage
    if (!mission || !user || !profile) {
      console.log('Context is empty, checking sessionStorage...');
      const storedData = sessionStorage.getItem('workspaceData');

      if (storedData) {
        try {
          const parsedData = JSON.parse(storedData);
          console.log('Restoring workspace data from sessionStorage:', parsedData);
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
      console.warn('Missing workspace data:', { mission, user, profile });
      console.warn('Redirecting to dashboard');
      setIsLoading(false);
      router.push('/dashboard');
    } else {
      console.log('Workspace data loaded successfully:', { mission: mission.title, user: user.username });
      setIsLoading(false);
    }

    // Cleanup function to clear workspace context when leaving the page
    return () => {
      clearWorkspace();
    };
  }, [mission, user, profile, router, clearWorkspace, setWorkspace]);

  if (isLoading || !mission || !user || !profile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-100 via-purple-50 to-pink-100">
        <div className="text-xl text-gray-500 animate-pulse">
          {isLoading ? 'Loading workspace...' : 'Redirecting to dashboard...'}
        </div>
      </div>
    );
  }

  const workspaceProps = {
    mission,
    user,
    profile,
    gamification,
    sendChatMessage,
    getPredefinedPrompts,
    checkAIServiceHealth,
  };

  return (
    <div className="h-screen w-screen flex overflow-hidden" style={{
      margin: 0,
      padding: 0,
      gap: 0,
      alignItems: 'stretch'
    }}>
      {/* Main Editor Area - 70% width */}
      <div className="flex-1 min-w-0 overflow-hidden" style={{
        margin: 0,
        padding: 0,
        height: '100vh',
        display: 'flex',
        flexDirection: 'column'
      }}>
        <BlocklyWorkspace {...workspaceProps} />
      </div>

      {/* Right Sidebar - 30% width */}
      <div className="w-[30%] min-w-[320px] max-w-[400px] overflow-hidden" style={{
        margin: 0,
        padding: 0,
        height: '100vh',
        display: 'flex',
        flexDirection: 'column'
      }}>
        <KidSidebar />
      </div>
    </div>
  );
}
