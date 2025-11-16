'use client';

import BlocklyWorkspace from '../../components/BlocklyWorkspace';
import KidSidebar from '../../components/KidSidebar';
import { useWorkspace } from '../../context/WorkspaceContext';
import { sendChatMessage, getPredefinedPrompts, checkAIServiceHealth } from '../../services/chatbotApi';

export default function WorkspacePage() {
  const { mission, user, profile, gamification } = useWorkspace();

  if (!mission || !user || !profile) {
    return <div className="p-8 text-center text-red-500">Missing mission, user, or profile info.</div>;
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
