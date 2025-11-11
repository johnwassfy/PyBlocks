/**
 * EduBlocks Integration Component
 * Provides a bridge between React frontend and EduBlocks UI
 * Handles mission-based starter code conversion
 */

import React, { useEffect, useRef, useState } from 'react';

interface Mission {
  _id: string;
  title: string;
  description: string;
  starterCode?: string;
  steps?: {
    title: string;
    instructions: string;
    starterCode?: string;
    expectedOutput?: string;
  }[];
}

interface EduBlocksIntegrationProps {
  mission?: Mission;
  currentStep?: number;
  onCodeChange?: (code: string) => void;
}

export const EduBlocksIntegration: React.FC<EduBlocksIntegrationProps> = ({
  mission,
  currentStep,
  onCodeChange,
}) => {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [starterCode, setStarterCode] = useState<string>('');

  // Update starter code when mission or step changes
  useEffect(() => {
    if (!mission) {
      setStarterCode('');
      return;
    }

    // If we're in a step-based mission, use step's starter code
    if (mission.steps && currentStep !== undefined && mission.steps[currentStep]) {
      const step = mission.steps[currentStep];
      setStarterCode(step.starterCode || '');
    } else {
      // Otherwise use mission's starter code
      setStarterCode(mission.starterCode || '');
    }
  }, [mission, currentStep]);

  // Send starter code to EduBlocks iframe when it changes
  useEffect(() => {
    if (iframeRef.current && starterCode) {
      // Post message to EduBlocks iframe
      iframeRef.current.contentWindow?.postMessage(
        {
          type: 'SET_STARTER_CODE',
          starterCode: starterCode,
        },
        '*'
      );
    }
  }, [starterCode]);

  // Listen for code changes from EduBlocks
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data.type === 'CODE_CHANGED') {
        onCodeChange?.(event.data.code);
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [onCodeChange]);

  return (
    <div style={{ width: '100%', height: '100%' }}>
      <iframe
        ref={iframeRef}
        src="http://localhost:8081"
        style={{
          width: '100%',
          height: '100%',
          border: 'none',
        }}
        title="EduBlocks Editor"
      />
    </div>
  );
};

export default EduBlocksIntegration;
