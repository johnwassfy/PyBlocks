"""
Test the behavior analysis endpoint
"""
import requests
import json

# Test behavior summary
behavior_summary = {
    "userId": "test_user",
    "missionId": "test_mission",
    "step": 0,
    "activity": {
        "blocksCreated": 5,
        "blocksDeleted": 2,
        "blocksModified": 8,
        "idleTime": 25,
        "totalEdits": 15,
        "errorCount": 1,
        "lastError": "SyntaxError: invalid syntax",
        "codeSnapshot": "print('Hello World')\nif x > 10:\n    print('Big number')",
        "concepts": ["print", "conditionals"],
        "difficulty": "easy"
    }
}

# Test idle pattern
print("Testing idle pattern (25s idle)...")
response = requests.post(
    "http://localhost:8001/api/behavior/analyze",
    json=behavior_summary,
    headers={"X-API-Key": "dev-key-12345"}
)
print(f"Status: {response.status_code}")
print(f"Response: {json.dumps(response.json(), indent=2)}")
print()

# Test frustrated pattern
print("Testing frustrated pattern (3+ errors)...")
behavior_summary["activity"]["errorCount"] = 4
behavior_summary["activity"]["idleTime"] = 10
response = requests.post(
    "http://localhost:8001/api/behavior/analyze",
    json=behavior_summary,
    headers={"X-API-Key": "dev-key-12345"}
)
print(f"Status: {response.status_code}")
print(f"Response: {json.dumps(response.json(), indent=2)}")
print()

# Test confused pattern
print("Testing confused pattern (many deletions)...")
behavior_summary["activity"]["errorCount"] = 0
behavior_summary["activity"]["blocksDeleted"] = 8
behavior_summary["activity"]["blocksCreated"] = 3
response = requests.post(
    "http://localhost:8001/api/behavior/analyze",
    json=behavior_summary,
    headers={"X-API-Key": "dev-key-12345"}
)
print(f"Status: {response.status_code}")
print(f"Response: {json.dumps(response.json(), indent=2)}")
print()

# Test normal pattern
print("Testing normal pattern...")
behavior_summary["activity"]["errorCount"] = 0
behavior_summary["activity"]["blocksDeleted"] = 1
behavior_summary["activity"]["blocksCreated"] = 4
behavior_summary["activity"]["idleTime"] = 5
behavior_summary["activity"]["totalEdits"] = 5
response = requests.post(
    "http://localhost:8001/api/behavior/analyze",
    json=behavior_summary,
    headers={"X-API-Key": "dev-key-12345"}
)
print(f"Status: {response.status_code}")
print(f"Response: {json.dumps(response.json(), indent=2)}")
