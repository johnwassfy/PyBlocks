/**
 * Behavior Tracking Hook
 * Tracks user coding behavior for proactive AI hints
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { observeBehavior, recordInterventionResponse, type BehaviorMetrics, type ObservationResponse } from '../services/observerApi';

interface UseBehaviorTrackerProps {
  userId: string;
  missionId: string;
  weakConcepts?: string[];
  strongConcepts?: string[];
  masterySnapshot?: Record<string, number>;
  enabled?: boolean;
}

interface BehaviorState {
  editsCount: number;
  lastEditTime: number;
  lastRunTime: number;
  consecutiveFailedRuns: number;
  lastCode: string;
  lastErrorType?: string;
  lastErrorMessage?: string;
  sameErrorCount: number;
  cursorMovements: number;
  hintDismissCount: number;
  sessionStartTime: number;
  totalAttempts: number;
}

export function useBehaviorTracker({
  userId,
  missionId,
  weakConcepts = [],
  strongConcepts = [],
  masterySnapshot,
  enabled = true,
}: UseBehaviorTrackerProps) {
  // Only log once on mount
  useEffect(() => {
    console.log('[BehaviorTracker] ✅ Initialized with:', { userId, missionId, enabled });
  }, []); // Empty deps = runs once
  
  const [behaviorState, setBehaviorState] = useState<BehaviorState>({
    editsCount: 0,
    lastEditTime: Date.now(),
    lastRunTime: 0,
    consecutiveFailedRuns: 0,
    lastCode: '',
    sameErrorCount: 0,
    cursorMovements: 0,
    hintDismissCount: 0,
    sessionStartTime: Date.now(),
    totalAttempts: 0,
  });

  const [proactiveHint, setProactiveHint] = useState<ObservationResponse | null>(null);
  const [chatbotContext, setChatbotContext] = useState<any>(null); // Store full context for chatbot
  const [isObserving, setIsObserving] = useState(false);
  const observationTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastObservationRef = useRef<number>(0);
  const behaviorStateRef = useRef<BehaviorState>(behaviorState); // Use ref to access latest state
  
  // Keep ref in sync with state
  useEffect(() => {
    behaviorStateRef.current = behaviorState;
  }, [behaviorState]);

  // Calculate code similarity
  const calculateSimilarity = useCallback((code1: string, code2: string): number => {
    if (!code1 || !code2) return 0;
    
    const longer = code1.length > code2.length ? code1 : code2;
    const shorter = code1.length > code2.length ? code2 : code1;
    
    if (longer.length === 0) return 1.0;
    
    const editDistance = levenshteinDistance(longer, shorter);
    return (longer.length - editDistance) / longer.length;
  }, []);

  // Levenshtein distance for similarity calculation
  const levenshteinDistance = (str1: string, str2: string): number => {
    const matrix: number[][] = [];

    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i];
    }

    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j;
    }

    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }

    return matrix[str2.length][str1.length];
  };

  // Track code edit
  const trackEdit = useCallback((currentCode: string) => {
    if (!enabled) {
      console.log('[BehaviorTracker] ⚠️ trackEdit called but tracking is DISABLED');
      return;
    }

    console.log('[BehaviorTracker] 📝 Edit tracked, code length:', currentCode.length);
    const now = Date.now();
    setBehaviorState(prev => {
      const newState = {
        ...prev,
        editsCount: prev.editsCount + 1,
        lastEditTime: now,
        cursorMovements: prev.lastRunTime > 0 ? prev.cursorMovements + 1 : 0,
        lastCode: currentCode,
      };
      console.log('[BehaviorTracker] State after edit:', { editsCount: newState.editsCount, totalAttempts: newState.totalAttempts });
      return newState;
    });
  }, [enabled]);

  // Track code run
  const trackRun = useCallback((success: boolean, errorType?: string, errorMessage?: string) => {
    if (!enabled) {
      console.log('[BehaviorTracker] ⚠️ trackRun called but tracking is DISABLED');
      return;
    }

    console.log('[BehaviorTracker] ▶️ Run tracked - success:', success, 'errorType:', errorType);
    const now = Date.now();
    setBehaviorState(prev => {
      const isSameError = errorType === prev.lastErrorType && errorType !== undefined;
      
      const newState = {
        ...prev,
        lastRunTime: now,
        totalAttempts: prev.totalAttempts + 1,
        consecutiveFailedRuns: success ? 0 : prev.consecutiveFailedRuns + 1,
        lastErrorType: errorType,
        lastErrorMessage: errorMessage,
        sameErrorCount: isSameError ? prev.sameErrorCount + 1 : 1,
        cursorMovements: 0, // Reset after run
      };
      console.log('[BehaviorTracker] State after run:', { 
        totalAttempts: newState.totalAttempts, 
        consecutiveFailedRuns: newState.consecutiveFailedRuns,
        sameErrorCount: newState.sameErrorCount 
      });
      return newState;
    });
  }, [enabled]);

  // Track hint dismiss
  const trackHintDismiss = useCallback(() => {
    if (!enabled) return;

    setBehaviorState(prev => ({
      ...prev,
      hintDismissCount: prev.hintDismissCount + 1,
    }));
  }, [enabled]);

  // Perform observation
  const performObservation = useCallback(async (currentCode: string) => {
    if (!enabled || isObserving) return;

    const now = Date.now();
    
    // Don't observe too frequently (minimum 15 seconds between observations)
    if (now - lastObservationRef.current < 15000) return;

    setIsObserving(true);
    lastObservationRef.current = now;

    try {
      const state = behaviorStateRef.current; // Use ref to get latest state
      const idleTime = Math.floor((now - state.lastEditTime) / 1000);
      const timeOnCurrentStep = Math.floor((now - state.sessionStartTime) / 1000);
      const editsPerMinute = state.editsCount / (timeOnCurrentStep / 60 || 1);
      const codeSimilarity = calculateSimilarity(currentCode, state.lastCode);

      const metrics: BehaviorMetrics = {
        userId,
        missionId,
        idleTime,
        editsPerMinute,
        consecutiveFailedRuns: state.consecutiveFailedRuns,
        totalAttempts: state.totalAttempts,
        codeSimilarity,
        sameErrorCount: state.sameErrorCount,
        lastErrorType: state.lastErrorType,
        lastErrorMessage: state.lastErrorMessage,
        cursorMovements: state.cursorMovements,
        hintDismissCount: state.hintDismissCount,
        timeOnCurrentStep,
        currentCode,
        previousCode: state.lastCode,
        weakConcepts,
        strongConcepts,
        masterySnapshot,
        lastActivity: new Date(state.lastEditTime).toISOString(),
      };

      console.log('[BehaviorTracker] Performing observation...', metrics);
      const observation = await observeBehavior(metrics);
      console.log('[BehaviorTracker] Observation result:', observation);

      if (observation.intervention) {
        console.log('[BehaviorTracker] ✅ Intervention triggered!');
        setProactiveHint(observation);
        
        // Store full context for chatbot
        if (observation.contextForChatbot) {
          console.log('[BehaviorTracker] 💾 Storing chatbot context:', observation.contextForChatbot);
          setChatbotContext(observation.contextForChatbot);
        } else {
          console.warn('[BehaviorTracker] ⚠️ No contextForChatbot in observation response!', observation);
          // Fallback: create context from observation data
          const fallbackContext = {
            problemContext: {
              errorType: metrics.lastErrorType,
              errorMessage: metrics.lastErrorMessage,
              codeSnapshot: metrics.currentCode,
              weakConcepts: metrics.weakConcepts,
              strongConcepts: metrics.strongConcepts,
            },
            analysis: observation.detailedAnalysis || {},
            interventionType: observation.interventionType,
            severity: observation.severity,
            metrics: metrics,
          };
          console.log('[BehaviorTracker] 🔄 Using fallback context:', fallbackContext);
          setChatbotContext(fallbackContext);
        }
      } else {
        console.log('[BehaviorTracker] ℹ️ No intervention needed');
      }
    } catch (error) {
      console.error('[BehaviorTracker] Error during observation:', error);
    } finally {
      setIsObserving(false);
    }
  }, [
    enabled,
    isObserving,
    userId,
    missionId,
    weakConcepts,
    strongConcepts,
    masterySnapshot,
    calculateSimilarity,
  ]);

  // Accept proactive hint
  const acceptHint = useCallback(async () => {
    if (proactiveHint) {
      await recordInterventionResponse({
        userId,
        missionId,
        interventionType: proactiveHint.interventionType || 'hint',
        accepted: true,
        hintTrigger: proactiveHint.hintTrigger,
      });
    }
    setProactiveHint(null);
  }, [proactiveHint, userId, missionId]);

  // Dismiss proactive hint
  const dismissHint = useCallback(async () => {
    if (proactiveHint) {
      await recordInterventionResponse({
        userId,
        missionId,
        interventionType: proactiveHint.interventionType || 'hint',
        accepted: false,
        hintTrigger: proactiveHint.hintTrigger,
      });
      trackHintDismiss();
    }
    setProactiveHint(null);
    setChatbotContext(null); // Clear context
  }, [proactiveHint, userId, missionId, trackHintDismiss]);

  // Set up periodic observation (every 20 seconds)
  useEffect(() => {
    console.log('[BehaviorTracker] Setting up observation timer, enabled:', enabled);
    
    if (!enabled) {
      console.log('[BehaviorTracker] ⚠️ Tracking is DISABLED - check userId and missionId!');
      return;
    }

    const checkAndObserve = () => {
      const currentState = behaviorStateRef.current;
      const now = Date.now();
      const idleTime = Math.floor((now - currentState.lastEditTime) / 1000);
      
      console.log('[BehaviorTracker] Timer tick - edits:', currentState.editsCount, 'attempts:', currentState.totalAttempts, 'idleTime:', idleTime + 's');
      
      // Always observe if:
      // 1. There's been activity (edits or attempts), OR
      // 2. User has been idle for more than 60 seconds (to catch stuck/thinking users)
      if (currentState.editsCount > 0 || currentState.totalAttempts > 0) {
        console.log('[BehaviorTracker] ✅ Activity detected, calling performObservation');
        performObservation(currentState.lastCode);
      } else if (idleTime > 60) {
        console.log('[BehaviorTracker] ⏱️ Idle for', idleTime + 's, checking if user needs help');
        performObservation(currentState.lastCode);
      } else {
        console.log('[BehaviorTracker] ⏸️ No activity and not idle long enough yet, skipping observation');
      }
    };

    observationTimerRef.current = setInterval(checkAndObserve, 20000); // 20 seconds

    return () => {
      if (observationTimerRef.current) {
        clearInterval(observationTimerRef.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled]); // Only re-run when enabled changes, not on every behaviorState update!

  return {
    trackEdit,
    trackRun,
    trackHintDismiss,
    performObservation,
    proactiveHint,
    chatbotContext, // NEW: Expose full context
    acceptHint,
    dismissHint,
    behaviorState,
  };
}
