#!/usr/bin/env python3
"""
Pitch Platform Test Suite
Demonstrates system reliability and error handling
"""

import requests
import json
import time
import sys

BASE_URL = "http://localhost:9000"
FRONTEND_URL = "http://localhost:3000"

def test_health_check():
    """Test system health and basic connectivity"""
    print("🔍 Testing health check...")
    try:
        response = requests.get(f"{BASE_URL}/health", timeout=5)
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"
        print("✅ Health check passed")
        return True
    except Exception as e:
        print(f"❌ Health check failed: {e}")
        return False

def test_pitch_initialization():
    """Test pitch initialization with retry logic"""
    print("🔍 Testing pitch initialization...")
    
    test_data = {
        "conversation_id": f"test-{int(time.time())}",
        "company_info": {
            "name": "Test Company",
            "industry": "Technology",
            "size": "100-500",
            "pain_points": ["scaling", "efficiency"],
            "decision_makers": ["John Doe"],
            "budget_range": "$100K-$500K",
            "current_solutions": ["AWS", "Slack"]
        }
    }
    
    try:
        response = requests.post(
            f"{BASE_URL}/pitch/initialize",
            json=test_data,
            timeout=10
        )
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == True
        print("✅ Pitch initialization passed")
        return True
    except Exception as e:
        print(f"❌ Pitch initialization failed: {e}")
        return False

def test_pitch_evaluation():
    """Test pitch evaluation with sample message"""
    print("🔍 Testing pitch evaluation...")
    
    conversation_id = f"test-eval-{int(time.time())}"
    
    # Initialize first
    init_data = {
        "conversation_id": conversation_id,
        "company_info": {
            "name": "Test Company",
            "industry": "Technology",
            "size": "100-500",
            "pain_points": ["scaling"],
            "decision_makers": ["John Doe"],
            "budget_range": "$100K",
            "current_solutions": ["AWS"]
        }
    }
    
    try:
        # Initialize
        requests.post(f"{BASE_URL}/pitch/initialize", json=init_data, timeout=5)
        
        # Evaluate
        eval_data = {
            "conversation_id": conversation_id,
            "message": "Hi, I have a solution for your scaling challenges that can reduce costs by 40%."
        }
        
        response = requests.post(
            f"{BASE_URL}/pitch/evaluate",
            json=eval_data,
            timeout=10
        )
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == True
        assert "criteria_status" in data["status"]
        print("✅ Pitch evaluation passed")
        return True
    except Exception as e:
        print(f"❌ Pitch evaluation failed: {e}")
        return False

def test_metrics_endpoint():
    """Test metrics and observability"""
    print("🔍 Testing metrics endpoint...")
    try:
        response = requests.get(f"{BASE_URL}/metrics", timeout=5)
        assert response.status_code == 200
        data = response.json()
        assert "pitch_metrics" in data
        assert "email_metrics" in data
        assert "system" in data
        print("✅ Metrics endpoint passed")
        return True
    except Exception as e:
        print(f"❌ Metrics endpoint failed: {e}")
        return False

def test_error_handling():
    """Test error handling and recovery"""
    print("🔍 Testing error handling...")
    
    # Test invalid conversation ID
    try:
        response = requests.post(
            f"{BASE_URL}/pitch/evaluate",
            json={
                "conversation_id": "invalid-id",
                "message": "test"
            },
            timeout=5
        )
        # Should return error but not crash
        assert response.status_code in [400, 404, 500]
        print("✅ Error handling passed")
        return True
    except Exception as e:
        print(f"❌ Error handling failed: {e}")
        return False

def test_load_simulation():
    """Simulate load to test reliability"""
    print("🔍 Testing load simulation...")
    
    success_count = 0
    total_requests = 5
    
    for i in range(total_requests):
        try:
            conversation_id = f"load-test-{i}-{int(time.time())}"
            
            # Initialize
            init_data = {
                "conversation_id": conversation_id,
                "company_info": {
                    "name": f"Company {i}",
                    "industry": "Technology",
                    "size": "100-500",
                    "pain_points": ["scaling"],
                    "decision_makers": ["John Doe"],
                    "budget_range": "$100K",
                    "current_solutions": ["AWS"]
                }
            }
            
            response = requests.post(
                f"{BASE_URL}/pitch/initialize",
                json=init_data,
                timeout=5
            )
            
            if response.status_code == 200:
                success_count += 1
                
        except Exception as e:
            print(f"Request {i} failed: {e}")
    
    success_rate = (success_count / total_requests) * 100
    print(f"✅ Load test completed: {success_rate}% success rate")
    return success_rate >= 80

def main():
    """Run all tests"""
    print("🚀 Starting Pitch Platform Test Suite")
    print("=" * 50)
    
    tests = [
        test_health_check,
        test_pitch_initialization,
        test_pitch_evaluation,
        test_metrics_endpoint,
        test_error_handling,
        test_load_simulation
    ]
    
    passed = 0
    total = len(tests)
    
    for test in tests:
        if test():
            passed += 1
        print()
    
    print("=" * 50)
    print(f"📊 Test Results: {passed}/{total} tests passed")
    
    if passed == total:
        print("🎉 All tests passed! System is ready for demo.")
        sys.exit(0)
    else:
        print("⚠️  Some tests failed. Check system status.")
        sys.exit(1)

if __name__ == "__main__":
    main()
