"""
Simple test script to verify the AI service is working
"""
import requests
import json

BASE_URL = "http://localhost:8000/api/v1"

def test_health():
    """Test health endpoint"""
    print("Testing /health endpoint...")
    response = requests.get(f"{BASE_URL}/health")
    print(f"Status: {response.status_code}")
    print(f"Response: {json.dumps(response.json(), indent=2)}")
    print()

def test_analyze():
    """Test code analysis endpoint"""
    print("Testing /analyze endpoint...")
    payload = {
        "code": "def greet(name):\n    return f'Hello, {name}!'",
        "missionId": "test_mission",
        "userId": "test_user",
        "testCases": ["greet('Alice') == 'Hello, Alice!'", "greet('Bob') == 'Hello, Bob!'"],
        "concepts": ["function-definition", "string-formatting"],
        "difficulty": 3
    }
    
    response = requests.post(f"{BASE_URL}/analyze", json=payload)
    print(f"Status: {response.status_code}")
    print(f"Response: {json.dumps(response.json(), indent=2)}")
    print()

def test_hint():
    """Test hint endpoint"""
    print("Testing /hint endpoint...")
    payload = {
        "code": "def greet(name)\n    return f'Hello, {name}!'",
        "missionId": "test_mission",
        "errorMessage": "SyntaxError: invalid syntax",
        "attemptNumber": 2
    }
    
    response = requests.post(f"{BASE_URL}/hint", json=payload)
    print(f"Status: {response.status_code}")
    print(f"Response: {json.dumps(response.json(), indent=2)}")
    print()

if __name__ == "__main__":
    print("=" * 60)
    print("PyBlocks AI Service - Test Suite")
    print("=" * 60)
    print()
    
    try:
        test_health()
        test_analyze()
        test_hint()
        print("✅ All tests passed!")
    except Exception as e:
        print(f"❌ Test failed: {e}")
