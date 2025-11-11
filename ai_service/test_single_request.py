"""
Quick test script to verify the API schema is working correctly
Tests just ONE request to ensure payload structure is valid
"""

import requests
import json

# API endpoint
url = "http://localhost:8000/api/v1/analyze"

# Test payload matching the schema
payload = {
    "missionId": "test_hello_world",  # REQUIRED field
    "mission_context": {
        "title": "Hello World",
        "description": "Print a greeting message",
        "objectives": ["Print a greeting message"],
        "concepts": ["print", "strings"],
        "difficulty": 1,  # INTEGER not string
        "validation_mode": "strict",
        "expected_line_count": 1
    },
    "submission_context": {
        "code": 'print("Hello, World!")',
        "expected_output": "Hello, World!",
        "line_count": 1
    },
    "student_context": {
        "user_id": "test_user",
        "level": 1,
        "xp": 0,
        "weak_skills": [],
        "strong_skills": [],
        "attempt_number": 1
    },
    "validation_context": {
        "check_exact_output": True,
        "allow_creativity": False
    }
}

print("🧪 Testing single API request...\n")
print(f"URL: {url}")
print(f"Payload: {json.dumps(payload, indent=2)}\n")

try:
    response = requests.post(url, json=payload, timeout=30)
    
    print(f"Status Code: {response.status_code}")
    
    if response.status_code == 200:
        print("✅ SUCCESS! API request worked!\n")
        result = response.json()
        print(f"Response: {json.dumps(result, indent=2)}")
    else:
        print(f"❌ FAILED with status {response.status_code}\n")
        print(f"Error: {response.text}")
        
except Exception as e:
    print(f"❌ Exception occurred: {e}")
