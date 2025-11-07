/**
 * Submissions API Service
 * 
 * Handles communication with the backend submissions endpoints
 * Flow: Frontend (Run button) → Backend (submissions.service) → AI Service (analyze endpoint)
 */

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5000';

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
