"""
Test to verify all API routes are properly registered
Run this after starting the AI service
"""
import requests
import json

BASE_URL = "http://localhost:8000"

def test_route(method, path, data=None):
    """Test a route and print the result"""
    url = f"{BASE_URL}{path}"
    try:
        if method == "GET":
            response = requests.get(url, timeout=2)
        else:
            response = requests.post(url, json=data, timeout=2)
        
        status = "✅" if response.status_code != 404 else "❌"
        print(f"{status} {method:4} {path:30} → {response.status_code}")
        return response.status_code != 404
    except requests.exceptions.ConnectionError:
        print(f"⚠️  {method:4} {path:30} → Service not running")
        return False
    except Exception as e:
        print(f"❌ {method:4} {path:30} → Error: {str(e)}")
        return False

print("=" * 70)
print("🧪 Testing AI Service Routes")
print("=" * 70)
print()

# Test root endpoint
print("📍 Root Endpoints:")
test_route("GET", "/")
test_route("GET", "/docs")
print()

# Test health
print("📍 Health Endpoint:")
test_route("GET", "/api/v1/health")
print()

# Test execute endpoint (the one that was broken)
print("📍 Execute Endpoint:")
test_route("POST", "/api/v1/execute", {
    "code": "print('Hello')",
    "mission_id": "test",
    "user_id": "test"
})
print()

# Test observe endpoint (the one that was broken)
print("📍 Observe Endpoint:")
test_route("POST", "/api/v1/observe", {
    "userId": "test",
    "missionId": "test",
    "idleTime": 10,
    "editsPerMinute": 2,
    "consecutiveFailedRuns": 0,
    "totalAttempts": 1,
    "codeSimilarity": 0.8,
    "sameErrorCount": 0,
    "cursorMovements": 5,
    "hintDismissCount": 0,
    "timeOnCurrentStep": 30,
    "currentCode": "print('test')",
    "lastActivity": "2025-01-09T12:00:00Z"
})
print()

# Test other endpoints
print("📍 Other Endpoints:")
test_route("POST", "/api/v1/analyze", {
    "code": "print('test')",
    "missionId": "test",
    "userId": "test"
})
test_route("POST", "/api/v1/hint", {
    "userId": "test",
    "missionId": "test",
    "code": "print('test')"
})
test_route("POST", "/api/v1/recommend/missions", {
    "userId": "test"
})
test_route("POST", "/api/v1/chat", {
    "userId": "test",
    "message": "Hello"
})
print()

print("=" * 70)
print("✅ Route testing complete!")
print("=" * 70)
