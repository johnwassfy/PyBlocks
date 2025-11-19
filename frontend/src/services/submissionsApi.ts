/**
 * Submissions API Service
 * 
 * Handles communication with the backend submissions endpoints
 * Flow: Frontend (Run button) → Backend (submissions.service) → AI Service (analyze endpoint)
 */

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5000';
const AI_SERVICE_URL = process.env.NEXT_PUBLIC_AI_SERVICE_URL || 'http://localhost:8000';

export interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  category: string;
  unlockedAt?: Date;
}

export interface CreateSubmissionRequest {
  missionId: string;
  code: string;
  output?: string;
  timeSpent?: number;
  attempts?: number;
}

export interface SubmissionResponse {
  submission: {
    _id: string;
    userId: string;
    missionId: string;
    code: string;
    isSuccessful: boolean;
    score: number;
    feedback: string;
    output?: string;
    attempts: number;
    timeSpent: number;
    detectedConcepts: string[];
    aiAnalysis?: {
      weaknesses: string[];
      strengths: string[];
      suggestions: string[];
    };
  };
  aiResult: {
    success: boolean;
    score: number;
    feedback: string;
    weak_concepts: string[];
    strong_concepts: string[];
    hints: string[];
    suggestions: string[];
    test_results: any[];
    detected_concepts: string[];
    error_type?: string;
    error_message?: string;
  };
  xpGained: number;
  newAchievements: Achievement[];
  leveledUp: boolean;
  nextMission?: any;
  learningInsights?: any;
}

/**
 * Submit code for analysis and execution
 * This is called when the user clicks the Run button
 */
export async function submitCode(
  request: CreateSubmissionRequest
): Promise<SubmissionResponse> {
  const token = localStorage.getItem('token');
  
  if (!token) {
    throw new Error('Not authenticated. Please log in.');
  }

  try {
    const response = await fetch(`${BACKEND_URL}/submissions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        errorData.message || `Failed to submit code: ${response.statusText}`
      );
    }

    return await response.json();
  } catch (error) {
    console.error('Error submitting code:', error);
    throw error;
  }
}

/**
 * Get all submissions by the current user
 */
export async function getMySubmissions(): Promise<any[]> {
  const token = localStorage.getItem('token');
  
  if (!token) {
    throw new Error('Not authenticated. Please log in.');
  }

  try {
    const response = await fetch(`${BACKEND_URL}/submissions/my-submissions`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch submissions: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error fetching submissions:', error);
    throw error;
  }
}

/**
 * Get submission statistics for the current user
 */
export async function getMySubmissionStats(): Promise<{
  total: number;
  successful: number;
  successRate: number;
  totalScore: number;
  averageAttempts: number;
}> {
  const token = localStorage.getItem('token');
  
  if (!token) {
    throw new Error('Not authenticated. Please log in.');
  }

  try {
    const response = await fetch(`${BACKEND_URL}/submissions/my-stats`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch stats: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error fetching submission stats:', error);
    throw error;
  }
}

/**
 * Get submissions for a specific mission
 */
export async function getMissionSubmissions(missionId: string): Promise<any[]> {
  const token = localStorage.getItem('token');
  
  if (!token) {
    throw new Error('Not authenticated. Please log in.');
  }

  try {
    const response = await fetch(`${BACKEND_URL}/submissions/mission/${missionId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch mission submissions: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error fetching mission submissions:', error);
    throw error;
  }
}

/**
 * AI-Powered Code Validation Types
 */
export interface ValidationRequest {
  missionId: string;
  missionTitle: string;
  missionDescription: string;
  objectives: string[];
  requiredConcepts?: string[];
  studentCode: string;
  expectedOutput?: string;
  testCases?: string[];
  difficulty?: number;
  allowCreativity?: boolean;
  userId?: string;
  studentLevel?: number;
  checkExactOutput?: boolean;
  checkConcepts?: boolean;
  allowHardcoded?: boolean;
}

export interface ValidationResponse {
  requestId: string;
  missionId: string;
  passed: boolean;
  summary: string;
  detailedFeedback: string;
  shouldAdvance: boolean;
  suggestedReview?: string[];
  validationResult: {
    success: boolean;
    overallScore: number;
    confidence: number;
    objectivesValidated: Array<{
      objective: string;
      met: boolean;
      confidence: number;
      evidence: string;
      suggestions?: string[];
    }>;
    objectivesMet: number;
    objectivesTotal: number;
    conceptsDetected: Array<{
      concept: string;
      detected: boolean;
      lineNumbers?: number[];
      proficiency: number;
      explanation: string;
    }>;
    requiredConceptsMissing: string[];
    creativity: {
      level: 'not_creative' | 'slightly_creative' | 'moderately_creative' | 'highly_creative';
      score: number;
      features: string[];
      explanation: string;
      examples?: string[];
    };
    codeQualityScore: number;
    codeQualityFeedback: string;
    codeClarityIssues: string[];
    strengths: string[];
    areasForImprovement: string[];
    specificSuggestions: string[];
    learningPoints: string[];
    nextSteps?: string;
    executedSuccessfully: boolean;
    executionError?: string;
    testCasesPassed: number;
    testCasesTotal: number;
    analysisTimeMs: number;
    aiModelUsed: string;
    timestamp: string;
  };
}

/**
 * Standalone validation (for advanced use cases)
 * Use executeWithValidation() instead for normal submissions
 */
export async function validateCode(request: ValidationRequest): Promise<ValidationResponse> {
  try {
    const response = await fetch(`${AI_SERVICE_URL}/api/v1/validate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        missionId: request.missionId,
        missionTitle: request.missionTitle,
        missionDescription: request.missionDescription,
        objectives: request.objectives,
        requiredConcepts: request.requiredConcepts || [],
        studentCode: request.studentCode,
        expectedOutput: request.expectedOutput,
        testCases: request.testCases,
        difficulty: request.difficulty || 1,
        allowCreativity: request.allowCreativity !== false,
        userId: request.userId,
        studentLevel: request.studentLevel,
        checkExactOutput: request.checkExactOutput !== false,
        checkConcepts: request.checkConcepts !== false,
        allowHardcoded: request.allowHardcoded || false,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        errorData.detail || `Validation failed: ${response.statusText}`
      );
    }

    const data = await response.json();
    
    // Transform API response to match expected interface (camelCase)
    return {
      requestId: data.requestId || data.request_id,
      missionId: data.missionId || data.mission_id,
      passed: data.passed,
      summary: data.summary,
      detailedFeedback: data.detailedFeedback || data.detailed_feedback,
      shouldAdvance: data.shouldAdvance || data.should_advance,
      suggestedReview: data.suggestedReview || data.suggested_review,
      validationResult: {
        success: data.validationResult.success || data.validation_result.success,
        overallScore: data.validationResult.overallScore || data.validation_result.overall_score,
        confidence: data.validationResult.confidence,
        objectivesValidated: (data.validationResult.objectivesValidated || data.validation_result.objectives_validated || []).map((obj: any) => ({
          objective: obj.objective,
          met: obj.met,
          confidence: obj.confidence,
          evidence: obj.evidence,
          suggestions: obj.suggestions,
        })),
        objectivesMet: data.validationResult.objectivesMet || data.validation_result.objectives_met_count,
        objectivesTotal: data.validationResult.objectivesTotal || data.validation_result.objectives_total_count,
        conceptsDetected: (data.validationResult.conceptsDetected || data.validation_result.concepts_detected || []).map((concept: any) => ({
          concept: concept.concept,
          detected: concept.detected,
          lineNumbers: concept.lineNumbers || concept.line_numbers,
          proficiency: concept.proficiency,
          explanation: concept.explanation,
        })),
        requiredConceptsMissing: data.validationResult.requiredConceptsMissing || data.validation_result.required_concepts_missing,
        creativity: {
          level: data.validationResult.creativity.level,
          score: data.validationResult.creativity.score,
          features: data.validationResult.creativity.features,
          explanation: data.validationResult.creativity.explanation,
          examples: data.validationResult.creativity.examples,
        },
        codeQualityScore: data.validationResult.codeQualityScore || data.validation_result.code_quality_score,
        codeQualityFeedback: data.validationResult.codeQualityFeedback || data.validation_result.code_quality_feedback,
        codeClarityIssues: data.validationResult.codeClarityIssues || data.validation_result.code_clarity_issues,
        strengths: data.validationResult.strengths,
        areasForImprovement: data.validationResult.areasForImprovement || data.validation_result.areas_for_improvement,
        specificSuggestions: data.validationResult.specificSuggestions || data.validation_result.specific_suggestions,
        learningPoints: data.validationResult.learningPoints || data.validation_result.learning_points,
        nextSteps: data.validationResult.nextSteps || data.validation_result.next_steps,
        executedSuccessfully: data.validationResult.executedSuccessfully || data.validation_result.executed_successfully,
        executionError: data.validationResult.executionError || data.validation_result.execution_error,
        testCasesPassed: data.validationResult.testCasesPassed || data.validation_result.test_cases_passed,
        testCasesTotal: data.validationResult.testCasesTotal || data.validation_result.test_cases_total,
        analysisTimeMs: data.validationResult.analysisTimeMs || data.validation_result.analysis_time_ms,
        aiModelUsed: data.validationResult.aiModelUsed || data.validation_result.ai_model_used,
        timestamp: data.validationResult.timestamp,
      },
    };
  } catch (error) {
    console.error('Error validating code:', error);
    throw error;
  }
}