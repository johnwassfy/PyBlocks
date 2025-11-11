"""
🔍 SERVICE DIAGNOSTIC TOOL
Tests individual services with minimal payloads to identify schema issues
"""

import asyncio
import httpx
import json


async def test_analyze_service():
    """Test /analyze endpoint with minimal valid payload"""
    print("\n" + "="*80)
    print("🧪 TESTING ANALYZE SERVICE")
    print("="*80)
    
    # Minimal test payload matching Pydantic model requirements (using camelCase for API)
    payload = {
        "missionId": "test_mission",
        "aiModel": "z-ai/glm-4.5-air",
        "missionContext": {
            "title": "Test Mission",
            "description": "Test",
            "validationMode": "strict"
        },
        "studentContext": {
            "userId": "test_user"
        },
        "submissionContext": {
            "code": "print('Hello, World!')"
        }
    }
    
    print(f"\n📤 Sending payload:")
    print(json.dumps(payload, indent=2))
    
    try:
        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.post(
                "http://localhost:8000/api/v1/analyze",
                json=payload
            )
            
            print(f"\n📥 Response Status: {response.status_code}")
            
            if response.status_code == 200:
                print("✅ SUCCESS!")
                result = response.json()
                print(f"Is Correct: {result.get('is_correct', 'N/A')}")
                print(f"Feedback: {result.get('feedback', 'N/A')[:200]}...")
            else:
                print(f"❌ FAILED!")
                print(f"Response: {response.text}")
                
    except httpx.ReadTimeout as e:
        print(f"❌ TIMEOUT: {e}")
    except Exception as e:
        print(f"❌ ERROR: {type(e).__name__}: {e}")


async def test_chat_service():
    """Test /chat endpoint with minimal valid payload"""
    print("\n" + "="*80)
    print("💬 TESTING CHAT SERVICE")
    print("="*80)
    
    # Minimal test payload matching ChatbotRequest model
    payload = {
        "userId": "test_user",
        "missionId": "test_mission",
        "question": "How do I print something in Python?",
        "conversationHistory": []
    }
    
    print(f"\n📤 Sending payload:")
    print(json.dumps(payload, indent=2))
    
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                "http://localhost:8000/api/v1/chat",
                json=payload
            )
            
            print(f"\n📥 Response Status: {response.status_code}")
            
            if response.status_code == 200:
                print("✅ SUCCESS!")
                result = response.json()
                print(f"Message: {result.get('message', 'N/A')[:200]}...")
            else:
                print(f"❌ FAILED!")
                print(f"Response: {response.text}")
                
    except Exception as e:
        print(f"❌ ERROR: {e}")


async def test_hint_service():
    """Test /hint endpoint with minimal valid payload"""
    print("\n" + "="*80)
    print("💡 TESTING HINT SERVICE")
    print("="*80)
    
    # Minimal test payload
    payload = {
        "userId": "test_user",
        "code": "print('Hello'",
        "missionId": "test_mission",
        "errorMessage": "SyntaxError: invalid syntax",
        "attemptNumber": 2
    }
    
    print(f"\n📤 Sending payload:")
    print(json.dumps(payload, indent=2))
    
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                "http://localhost:8000/api/v1/hint",
                json=payload
            )
            
            print(f"\n📥 Response Status: {response.status_code}")
            
            if response.status_code == 200:
                print("✅ SUCCESS!")
                print(json.dumps(response.json(), indent=2))
            else:
                print(f"❌ FAILED!")
                print(f"Response: {response.text}")
                
    except Exception as e:
        print(f"❌ ERROR: {e}")


async def test_recommend_service():
    """Test /recommend endpoint with minimal valid payload"""
    print("\n" + "="*80)
    print("🎯 TESTING RECOMMEND SERVICE")
    print("="*80)
    
    # Minimal test payload
    payload = {
        "userId": "test_user",
        "weakConcepts": ["print"],
        "strongConcepts": [],
        "completedMissions": [],
        "averageScore": 50,
        "learningVelocity": "medium"
    }
    
    print(f"\n📤 Sending payload:")
    print(json.dumps(payload, indent=2))
    
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                "http://localhost:8000/api/v1/recommend",
                json=payload
            )
            
            print(f"\n📥 Response Status: {response.status_code}")
            
            if response.status_code == 200:
                print("✅ SUCCESS!")
                print(json.dumps(response.json(), indent=2))
            else:
                print(f"❌ FAILED!")
                print(f"Response: {response.text}")
                
    except Exception as e:
        print(f"❌ ERROR: {e}")


async def main():
    """Run all service tests"""
    print("\n🚀 STARTING SERVICE DIAGNOSTICS")
    print("="*80)
    
    # Check if AI service is running
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get("http://localhost:8000/api/v1/health", timeout=5.0)
            if response.status_code == 200:
                print("✅ AI Service is running")
            else:
                print("❌ AI Service returned unexpected status")
                return
    except Exception as e:
        print(f"❌ Cannot connect to AI service: {e}")
        print("Start it with: python -m uvicorn app.main:app --reload --port 8000")
        return
    
    # Test each service
    await test_analyze_service()
    await test_chat_service()
    await test_hint_service()
    await test_recommend_service()
    
    print("\n" + "="*80)
    print("✨ DIAGNOSTICS COMPLETE")
    print("="*80 + "\n")


if __name__ == "__main__":
    asyncio.run(main())
