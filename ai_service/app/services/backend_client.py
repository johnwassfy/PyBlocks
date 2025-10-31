"""
HTTP client for communicating with NestJS backend
Enables two-way communication between AI service and backend
"""
import httpx
from typing import Dict, Any, Optional, List
from app.core.config import settings
from app.core.logger import logger


class BackendClient:
    """
    Client for making HTTP requests to the NestJS backend
    Handles all backend communication including progress updates and data retrieval
    """
    
    def __init__(self):
        self.base_url = settings.BACKEND_URL.rstrip('/')
        self.api_key = settings.BACKEND_API_KEY
        self.timeout = 10.0
        
        # Headers for all requests
        self.headers = {
            "Content-Type": "application/json",
        }
        
        # Add API key if configured
        if self.api_key:
            self.headers["X-API-Key"] = self.api_key
        
        logger.info(f"[BACKEND] Client initialized for {self.base_url}")
    
    async def get_student_progress(self, user_id: str) -> Optional[Dict[str, Any]]:
        """
        Fetch student's learning progress from backend
        
        Args:
            user_id: Student's user ID
            
        Returns:
            Progress data or None if request fails
        """
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    f"{self.base_url}/api/progress/{user_id}",
                    headers=self.headers,
                    timeout=self.timeout
                )
                
                if response.status_code == 200:
                    logger.info(f"[BACKEND] Retrieved progress for user {user_id}")
                    return response.json()
                elif response.status_code == 404:
                    logger.info(f"[BACKEND] No progress found for user {user_id}")
                    return None
                else:
                    logger.warning(f"[BACKEND] Failed to get progress: {response.status_code}")
                    return None
                    
        except httpx.TimeoutException:
            logger.error(f"[BACKEND] Timeout fetching progress for user {user_id}")
            return None
        except Exception as e:
            logger.error(f"[BACKEND] Error fetching progress: {e}")
            return None
    
    async def get_student_submissions(
        self, 
        user_id: str, 
        limit: int = 10
    ) -> Optional[List[Dict[str, Any]]]:
        """
        Fetch student's recent submissions from backend
        
        Args:
            user_id: Student's user ID
            limit: Maximum number of submissions to retrieve
            
        Returns:
            List of submissions or None if request fails
        """
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    f"{self.base_url}/api/submissions",
                    headers=self.headers,
                    params={"userId": user_id, "limit": limit},
                    timeout=self.timeout
                )
                
                if response.status_code == 200:
                    submissions = response.json()
                    logger.info(f"[BACKEND] Retrieved {len(submissions)} submissions for user {user_id}")
                    return submissions
                else:
                    logger.warning(f"[BACKEND] Failed to get submissions: {response.status_code}")
                    return None
                    
        except Exception as e:
            logger.error(f"[BACKEND] Error fetching submissions: {e}")
            return None
    
    async def get_mission_details(self, mission_id: str) -> Optional[Dict[str, Any]]:
        """
        Fetch mission details from backend
        
        Args:
            mission_id: Mission's ID
            
        Returns:
            Mission data or None if request fails
        """
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    f"{self.base_url}/api/missions/{mission_id}",
                    headers=self.headers,
                    timeout=self.timeout
                )
                
                if response.status_code == 200:
                    logger.info(f"[BACKEND] Retrieved mission {mission_id}")
                    return response.json()
                elif response.status_code == 404:
                    logger.warning(f"[BACKEND] Mission not found: {mission_id}")
                    return None
                else:
                    logger.warning(f"[BACKEND] Failed to get mission: {response.status_code}")
                    return None
                    
        except Exception as e:
            logger.error(f"[BACKEND] Error fetching mission: {e}")
            return None
    
    async def get_all_missions(
        self, 
        difficulty: Optional[int] = None
    ) -> Optional[List[Dict[str, Any]]]:
        """
        Fetch all available missions from backend
        
        Args:
            difficulty: Optional difficulty filter (1-10)
            
        Returns:
            List of missions or None if request fails
        """
        try:
            params = {}
            if difficulty:
                params["difficulty"] = difficulty
            
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    f"{self.base_url}/api/missions",
                    headers=self.headers,
                    params=params,
                    timeout=self.timeout
                )
                
                if response.status_code == 200:
                    missions = response.json()
                    logger.info(f"[BACKEND] Retrieved {len(missions)} missions")
                    return missions
                else:
                    logger.warning(f"[BACKEND] Failed to get missions: {response.status_code}")
                    return None
                    
        except Exception as e:
            logger.error(f"[BACKEND] Error fetching missions: {e}")
            return None
    
    async def update_learning_state(
        self,
        user_id: str,
        submission_id: str,
        analysis: Dict[str, Any]
    ) -> bool:
        """
        Update student's learning state in backend database
        Called after each code analysis to track progress
        
        Args:
            user_id: Student's user ID
            submission_id: Submission's ID
            analysis: Analysis result containing:
                - detectedConcepts: List of concepts found in code
                - weaknesses: List of identified weaknesses
                - strengths: List of identified strengths
                - suggestions: List of improvement suggestions
                - conceptScores: Dict mapping concept names to scores (0-100)
                - isSuccessful: Whether code executed successfully
                - score: Overall score (0-100)
            
        Returns:
            True if update was successful
        """
        try:
            payload = {
                "userId": user_id,
                "submissionId": submission_id,
                "analysis": {
                    "detectedConcepts": analysis.get("detectedConcepts", []),
                    "weaknesses": analysis.get("weaknesses", []),
                    "strengths": analysis.get("strengths", []),
                    "suggestions": analysis.get("suggestions", []),
                    "conceptScores": analysis.get("conceptScores", {}),
                    "isSuccessful": analysis.get("isSuccessful", False),
                    "score": analysis.get("score", 0)
                }
            }
            
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    f"{self.base_url}/ai/update-learning-state",
                    headers=self.headers,
                    json=payload,
                    timeout=self.timeout
                )
                
                if response.status_code == 200:
                    result = response.json()
                    logger.info(
                        f"[BACKEND] Learning state updated for user {user_id}: "
                        f"{result.get('updates', {})}"
                    )
                    return True
                else:
                    logger.warning(
                        f"[BACKEND] Failed to update learning state: "
                        f"{response.status_code} - {response.text}"
                    )
                    return False
                    
        except Exception as e:
            logger.error(f"[BACKEND] Error updating learning state: {e}")
            return False

    async def notify_analysis_complete(
        self,
        submission_id: str,
        analysis_result: Dict[str, Any]
    ) -> bool:
        """
        Notify backend that AI analysis is complete
        Used for async processing workflows
        
        Args:
            submission_id: Submission's ID
            analysis_result: Complete analysis result
            
        Returns:
            True if notification sent successfully
        """
        try:
            async with httpx.AsyncClient() as client:
                response = await client.patch(
                    f"{self.base_url}/api/submissions/{submission_id}",
                    headers=self.headers,
                    json=analysis_result,
                    timeout=self.timeout
                )
                
                if response.status_code in [200, 204]:
                    logger.info(f"[BACKEND] Notified analysis complete for {submission_id}")
                    return True
                else:
                    logger.warning(f"[BACKEND] Failed to notify: {response.status_code}")
                    return False
                    
        except Exception as e:
            logger.error(f"[BACKEND] Error notifying backend: {e}")
            return False
    
    async def health_check(self) -> bool:
        """
        Check if backend is reachable
        
        Returns:
            True if backend is healthy
        """
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    f"{self.base_url}/api/health",
                    headers=self.headers,
                    timeout=5.0
                )
                
                if response.status_code == 200:
                    logger.info("[BACKEND] Health check passed")
                    return True
                else:
                    logger.warning(f"[BACKEND] Health check failed: {response.status_code}")
                    return False
                    
        except Exception as e:
            logger.error(f"[BACKEND] Health check error: {e}")
            return False


# Global instance
backend_client = BackendClient()
