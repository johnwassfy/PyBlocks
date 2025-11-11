"""
AI Model Configuration for Thesis Research
Configure and switch between different AI models for comparison

MODELS TO TEST:
1. Z.AI: GLM 4.5 Air (free)
2. MiniMax: MiniMax M2 (free)
3. Polaris Alpha (free)
4. TNG: DeepSeek R1T2 Chimera (free)
5. Google: Gemini 2.0 Flash Experimental (free)
"""

# AI Model Configurations
AI_MODELS = {
    "glm-4.5-air": {
        "name": "glm-4.5-air",
        "full_name": "Z.AI GLM 4.5 Air",
        "provider": "z-ai",
        "model_id": "z-ai/glm-4.5-air",
        "api_base": "https://openrouter.ai/api/v1",
        "free": True,
        "description": "Fast and efficient AI model from Z.AI",
        "best_for": "Quick responses, general coding help",
        "cost_per_1m_tokens": 0.0,  # Free tier
    },
    "minimax-m2": {
        "name": "minimax-m2",
        "full_name": "MiniMax M2",
        "provider": "minimax",
        "model_id": "minimax/minimax-01",
        "api_base": "https://openrouter.ai/api/v1",
        "free": True,
        "description": "MiniMax's latest reasoning model",
        "best_for": "Complex problem solving, detailed explanations",
        "cost_per_1m_tokens": 0.0,  # Free tier
    },
    "polaris-alpha": {
        "name": "polaris-alpha",
        "full_name": "Polaris Alpha",
        "provider": "polaris",
        "model_id": "polaris/polaris-alpha",
        "api_base": "https://openrouter.ai/api/v1",
        "free": True,
        "description": "Polaris AI's educational model",
        "best_for": "Teaching, educational content",
        "cost_per_1m_tokens": 0.0,  # Free tier
    },
    "deepseek-r1-chimera": {
        "name": "deepseek-r1-chimera",
        "full_name": "TNG DeepSeek R1T2 Chimera",
        "provider": "tng",
        "model_id": "tng/deepseek-r1t2-chimera",
        "api_base": "https://openrouter.ai/api/v1",
        "free": True,
        "description": "DeepSeek's advanced reasoning model",
        "best_for": "Deep code analysis, debugging",
        "cost_per_1m_tokens": 0.0,  # Free tier
    },
    "gemini-2.0-flash": {
        "name": "gemini-2.0-flash",
        "full_name": "Google Gemini 2.0 Flash Experimental",
        "provider": "google",
        "model_id": "google/gemini-2.0-flash-exp:free",
        "api_base": "https://openrouter.ai/api/v1",
        "free": True,
        "description": "Google's latest fast experimental model",
        "best_for": "Fast responses, multimodal understanding",
        "cost_per_1m_tokens": 0.0,  # Free tier
    },
}

# Experiment groups for A/B testing
EXPERIMENT_GROUPS = {
    "control": {
        "model": "glm-4.5-air",
        "description": "Baseline model - GLM 4.5 Air",
    },
    "group_a": {
        "model": "minimax-m2",
        "description": "Test Group A - MiniMax M2",
    },
    "group_b": {
        "model": "polaris-alpha",
        "description": "Test Group B - Polaris Alpha",
    },
    "group_c": {
        "model": "deepseek-r1-chimera",
        "description": "Test Group C - DeepSeek Chimera",
    },
    "group_d": {
        "model": "gemini-2.0-flash",
        "description": "Test Group D - Gemini 2.0 Flash",
    },
}


def get_model_config(model_name: str) -> dict:
    """Get configuration for a specific model"""
    return AI_MODELS.get(model_name, AI_MODELS["glm-4.5-air"])


def get_all_models() -> list:
    """Get list of all available models"""
    return list(AI_MODELS.keys())


def get_model_for_experiment(group: str) -> str:
    """Get model assigned to an experiment group"""
    return EXPERIMENT_GROUPS.get(group, EXPERIMENT_GROUPS["control"])["model"]


def assign_student_to_group(student_id: str) -> str:
    """
    Assign a student to an experiment group based on their ID
    This ensures consistent assignment across sessions
    """
    # Simple hash-based assignment for consistent grouping
    groups = list(EXPERIMENT_GROUPS.keys())
    group_index = hash(student_id) % len(groups)
    return groups[group_index]


# Model comparison metrics to track
METRICS_TO_TRACK = [
    "success_rate",
    "average_score",
    "average_time_spent",
    "average_attempts",
    "hints_used",
    "proactive_help_count",
    "chatbot_interactions",
    "response_time_ms",
    "feedback_length",
    "student_satisfaction",
    "concept_mastery_improvement",
]
