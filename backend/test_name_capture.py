import requests

BASE_URL = "http://127.0.0.1:8000"

def test_chat(question, user_name=None):
    payload = {"question": question}
    if user_name:
        payload["user_name"] = user_name
    
    response = requests.post(f"{BASE_URL}/chat", json=payload)
    data = response.json()
    print(f"User: {question}")
    print(f"AI: {data['answer']}")
    print(f"Stored Name: {data.get('user_name')}")
    print("-" * 20)
    return data.get('user_name')

if __name__ == "__main__":
    print("Testing Name Capture Flow...")
    
    # Test 1: Explicit name extraction
    name = test_chat("My name is Chandrika")
    
    # Test 2: Use stored name in next question
    test_chat("Yes, you can go ahead.", name)
    
    # Test 3: FAQ question
    test_chat("What exactly does reactivation mean?", name)
    
    # Test 4: Closing
    test_chat("Alright, thank you.", name)
    
    # Test 5: Direct name response
    print("\nTesting Direct Name Response...")
    name2 = test_chat("Rahul")
    test_chat("Go ahead", name2)
