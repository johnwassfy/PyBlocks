/**
 * Observer API Service
 * Tracks user behavior and triggers proactive AI hints
 */

const AI_SERVICE_URL = process.env.NEXT_PUBLIC_AI_SERVICE_URL || 'http://localhost:8000';
const API_KEY = process.env.NEXT_PUBLIC_AI_API_KEY || 'dev-key-12345';

export interface BehaviorMetrics {
  userId: string;
  missionId: string;
  sessionId?: string;
  
  // Activity metrics
  idleTime: number; // seconds since last edit
  editsPerMinute: number;
  consecutiveFailedRuns: number;
  totalAttempts: number;
  
  // Code quality signals
  codeSimilarity: number; // 0-1, similarity to previous attempt
  sameErrorCount: number; // how many times same error occurred
  lastErrorType?: string;
  lastErrorMessage?: string;
  
  // Behavioral signals
  cursorMovements: number; // edits without running
  hintDismissCount: number;
  timeOnCurrentStep: number; // total seconds on this mission
  
  // Context
  currentCode: string;
  previousCode?: string;
  weakConcepts?: string[];
  strongConcepts?: string[];
  masterySnapshot?: Record<string, number>;
  
  // State
  lastActivity: string; // ISO timestamp
}

export interface ObservationResponse {
  intervention: boolean;
  interventionType?: 'hint' | 'encouragement' | 'example' | 'question';
  message?: string;
  hintTrigger?: string;
  severity?: 'low' | 'medium' | 'high';
  suggestedAction?: string;
  detailedAnalysis?: {
    isStuck: boolean;
    isIdle: boolean;
    isRepeating: boolean;
    isFrustrated: boolean;
    confidenceLevel: number;
    strugglingConcepts: string[];
    recommendation: string;
  };
  contextForChatbot?: any; // NEW: Full context to pass to chatbot
}

/**
 * Send behavior metrics to AI for observation and analysis
 */
export async function observeBehavior(metrics: BehaviorMetrics): Promise<ObservationResponse> {
  try {
    console.log('[ObserverAPI] Sending behavior metrics:', metrics);
    
    const response = await fetch(`${AI_SERVICE_URL}/api/v1/observe`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': API_KEY,
      },
      body: JSON.stringify(metrics),
    });

    console.log('[ObserverAPI] Response status:', response.status);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('[ObserverAPI] Error response:', errorData);
      throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    console.log('[ObserverAPI] Observation result:', data);
    
    return {
      intervention: data.intervention || false,
      interventionType: data.intervention_type,
      message: data.message,
      hintTrigger: data.hint_trigger,
      severity: data.severity || 'low',
      suggestedAction: data.suggested_action,
      detailedAnalysis: data.detailed_analysis ? {
        isStuck: data.detailed_analysis.is_stuck,
        isIdle: data.detailed_analysis.is_idle,
        isRepeating: data.detailed_analysis.is_repeating,
        isFrustrated: data.detailed_analysis.is_frustrated,
        confidenceLevel: data.detailed_analysis.confidence_level,
        strugglingConcepts: data.detailed_analysis.struggling_concepts || [],
        recommendation: data.detailed_analysis.recommendation,
      } : undefined,
    };
  } catch (error) {
    console.error('[ObserverAPI] Error observing behavior:', error);
    // Return no intervention on error
    return {
      intervention: false,
    };
  }
}

/**
 * Record intervention response (accepted or dismissed)
 */
export async function recordInterventionResponse(data: {
  userId: string;
  missionId: string;
  interventionType: string;
  accepted: boolean;
  hintTrigger?: string;
}): Promise<void> {
  try {
    await fetch(`${AI_SERVICE_URL}/api/v1/intervention-feedback`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': API_KEY,
      },
      body: JSON.stringify({
        ...data,
        timestamp: new Date().toISOString(),
      }),
    });
  } catch (error) {
    console.error('[ObserverAPI] Error recording intervention response:', error);
  }
}
