"""
Adaptive Mission Recommendation Engine
Suggests next missions based on student performance and learning patterns

🔥 AI MODEL INTEGRATION POINT for personalized learning paths
"""
from typing import List, Dict, Any
from app.core.logger import logger
from app.models.responses import RecommendationResponse, MissionRecommendation


class RecommendationEngine:
    """
    Generates personalized mission recommendations
    
    🔥 TO INTEGRATE AI FOR RECOMMENDATIONS:
    - Use ML model to predict optimal next mission
    - Analyze learning patterns with neural networks
    - Generate personalized learning paths
    """
    
    def __init__(self):
        # Mission database (in production, fetch from backend API)
        self.missions_db = self._load_mission_database()
        logger.info("[RECOMMENDER] RecommendationEngine initialized")
    
    def recommend_missions(
        self,
        weak_concepts: List[str],
        strong_concepts: List[str],
        completed_missions: List[str],
        average_score: float,
        learning_velocity: str = "medium"
    ) -> RecommendationResponse:
        """
        Generate personalized mission recommendations
        
        🔥 AI MODEL CALL: Use ML to predict best learning path
        
        Args:
            weak_concepts: Concepts student struggles with
            strong_concepts: Concepts student excels at
            completed_missions: Already completed missions
            average_score: Student's average score
            learning_velocity: Learning speed (slow/medium/fast)
            
        Returns:
            RecommendationResponse with suggested missions
        """
        # 🔥 REPLACE WITH AI MODEL CALL
        # Example: Use collaborative filtering or learning path prediction model
        
        recommendations = []
        focus_areas = weak_concepts[:3] if weak_concepts else ["fundamentals"]
        
        # Find missions that address weak concepts
        for concept in weak_concepts[:2]:  # Focus on top 2 weak areas
            suitable_missions = self._find_missions_for_concept(
                concept,
                completed_missions,
                learning_velocity
            )
            recommendations.extend(suitable_missions[:2])
        
        # If student is doing well, suggest challenge missions
        if average_score > 85 and len(recommendations) < 3:
            challenge_missions = self._find_challenge_missions(
                strong_concepts,
                completed_missions
            )
            recommendations.extend(challenge_missions[:1])
        
        # Fill with progressive missions if needed
        if len(recommendations) < 3:
            progressive = self._find_progressive_missions(completed_missions)
            recommendations.extend(progressive[:3 - len(recommendations)])
        
        # Remove duplicates and limit
        seen = set()
        unique_recommendations = []
        for rec in recommendations:
            if rec.mission_id not in seen:
                seen.add(rec.mission_id)
                unique_recommendations.append(rec)
        
        recommendations = unique_recommendations[:3]
        
        # Generate learning path
        learning_path = self._generate_learning_path(
            weak_concepts,
            strong_concepts,
            learning_velocity
        )
        
        # Generate encouragement
        encouragement = self._generate_encouragement(
            average_score,
            len(completed_missions),
            learning_velocity
        )
        
        # Next milestone
        next_milestone = self._get_next_milestone(len(completed_missions))
        
        return RecommendationResponse(
            recommended_missions=recommendations,
            focus_areas=focus_areas,
            learning_path=learning_path,
            encouragement=encouragement,
            next_milestone=next_milestone
        )
    
    def _find_missions_for_concept(
        self,
        concept: str,
        completed: List[str],
        velocity: str
    ) -> List[MissionRecommendation]:
        """Find missions that teach a specific concept"""
        suitable = []
        
        for mission in self.missions_db:
            if (concept in mission['concepts'] and 
                mission['id'] not in completed):
                
                # Adjust difficulty based on learning velocity
                difficulty = mission['difficulty']
                if velocity == "fast":
                    difficulty = min(difficulty + 1, 10)
                elif velocity == "slow":
                    difficulty = max(difficulty - 1, 1)
                
                suitable.append(MissionRecommendation(
                    mission_id=mission['id'],
                    title=mission['title'],
                    difficulty=difficulty,
                    reason=f"Practice {concept} to improve mastery",
                    concepts=mission['concepts'],
                    estimated_time=mission.get('estimated_time', 15),
                    priority=1  # High priority for weak concepts
                ))
        
        # Sort by difficulty (easier first for weak concepts)
        suitable.sort(key=lambda x: x.difficulty)
        return suitable
    
    def _find_challenge_missions(
        self,
        strong_concepts: List[str],
        completed: List[str]
    ) -> List[MissionRecommendation]:
        """Find challenging missions for advanced students"""
        challenges = []
        
        for mission in self.missions_db:
            if (mission['difficulty'] >= 7 and 
                mission['id'] not in completed and
                any(c in mission['concepts'] for c in strong_concepts)):
                
                challenges.append(MissionRecommendation(
                    mission_id=mission['id'],
                    title=mission['title'],
                    difficulty=mission['difficulty'],
                    reason="Challenge yourself with advanced concepts",
                    concepts=mission['concepts'],
                    estimated_time=mission.get('estimated_time', 25),
                    priority=2  # Medium priority
                ))
        
        return sorted(challenges, key=lambda x: -x.difficulty)[:2]
    
    def _find_progressive_missions(
        self,
        completed: List[str]
    ) -> List[MissionRecommendation]:
        """Find next missions in logical progression"""
        progressive = []
        
        for mission in self.missions_db:
            if mission['id'] not in completed:
                progressive.append(MissionRecommendation(
                    mission_id=mission['id'],
                    title=mission['title'],
                    difficulty=mission['difficulty'],
                    reason="Continue your learning journey",
                    concepts=mission['concepts'],
                    estimated_time=mission.get('estimated_time', 15),
                    priority=3  # Low priority
                ))
        
        # Sort by difficulty for natural progression
        return sorted(progressive, key=lambda x: x.difficulty)
    
    def _generate_learning_path(
        self,
        weak: List[str],
        strong: List[str],
        velocity: str
    ) -> str:
        """Generate learning path recommendation"""
        if weak:
            primary_focus = weak[0]
            return f"Focus on mastering {primary_focus}, then build upon your {strong[0] if strong else 'foundation'}"
        elif strong:
            return f"Excellent progress with {strong[0]}! Now explore more advanced topics"
        else:
            return "Continue with fundamental concepts to build a strong foundation"
    
    def _generate_encouragement(
        self,
        avg_score: float,
        missions_completed: int,
        velocity: str
    ) -> str:
        """Generate motivational message"""
        if avg_score >= 90:
            return "🌟 Outstanding work! You're excelling in your learning journey!"
        elif avg_score >= 80:
            return "💪 Great job! You're making excellent progress!"
        elif avg_score >= 70:
            return "👍 Good progress! Keep practicing and you'll master these concepts!"
        elif avg_score >= 60:
            return "🎯 You're learning! Remember, every mistake is a step toward mastery!"
        else:
            return "🚀 Keep going! Programming takes practice, and you're building your skills!"
    
    def _get_next_milestone(self, completed_count: int) -> str:
        """Get next achievement milestone"""
        milestones = {
            5: "Complete 5 missions to unlock the 'Getting Started' badge",
            10: "Complete 10 missions to unlock the 'Dedicated Learner' badge",
            25: "Complete 25 missions to unlock the 'Python Explorer' badge",
            50: "Complete 50 missions to unlock the 'Code Master' badge",
            100: "Complete 100 missions to unlock the 'Python Legend' badge",
        }
        
        for count, milestone in sorted(milestones.items()):
            if completed_count < count:
                return milestone
        
        return "You've unlocked all milestones! Keep learning!"
    
    def _load_mission_database(self) -> List[Dict[str, Any]]:
        """
        Load mission database
        
        In production, this should fetch from backend API
        🔥 REPLACE WITH API CALL TO BACKEND
        """
        return [
            {
                'id': 'mission_loops_basic',
                'title': 'Loop Mastery',
                'difficulty': 3,
                'concepts': ['for-loop', 'range', 'print'],
                'estimated_time': 15
            },
            {
                'id': 'mission_loops_advanced',
                'title': 'Advanced Loops',
                'difficulty': 5,
                'concepts': ['for-loop', 'while-loop', 'conditional'],
                'estimated_time': 20
            },
            {
                'id': 'mission_functions_intro',
                'title': 'Function Fundamentals',
                'difficulty': 4,
                'concepts': ['function-definition', 'return-statement'],
                'estimated_time': 18
            },
            {
                'id': 'mission_functions_advanced',
                'title': 'Advanced Functions',
                'difficulty': 6,
                'concepts': ['function-definition', 'return-statement', 'parameters'],
                'estimated_time': 25
            },
            {
                'id': 'mission_lists_intro',
                'title': 'List Basics',
                'difficulty': 3,
                'concepts': ['list', 'indexing', 'len'],
                'estimated_time': 15
            },
            {
                'id': 'mission_lists_advanced',
                'title': 'List Operations',
                'difficulty': 5,
                'concepts': ['list', 'list-methods', 'sorting'],
                'estimated_time': 20
            },
            {
                'id': 'mission_strings',
                'title': 'String Manipulation',
                'difficulty': 4,
                'concepts': ['string-methods', 'string-formatting'],
                'estimated_time': 18
            },
            {
                'id': 'mission_conditionals',
                'title': 'Decision Making',
                'difficulty': 3,
                'concepts': ['conditional', 'else-statement', 'elif-statement'],
                'estimated_time': 15
            },
            {
                'id': 'mission_nested_loops',
                'title': 'Nested Loops Challenge',
                'difficulty': 7,
                'concepts': ['for-loop', 'nested-structures'],
                'estimated_time': 30
            },
            {
                'id': 'mission_error_handling',
                'title': 'Error Handling',
                'difficulty': 6,
                'concepts': ['exception-handling', 'exception-catching'],
                'estimated_time': 25
            },
        ]


# Global recommender instance
recommender = RecommendationEngine()
