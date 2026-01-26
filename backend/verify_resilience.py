import requests
import time

def verify():
    print("Verifying Backend Fixes...")
    for i in range(10):
        try:
            # Test 1: Identify with Null Name (Fix for 422 error)
            print("Test 1: Identify with Null Name...")
            r1 = requests.post("http://127.0.0.1:8000/chat", json={"question": "I am Chandrika", "user_name": None})
            print(f"Result: {r1.status_code}, {r1.json()}")
            
            # Test 2: Identify with variations (Fix for catch-all failing)
            print("\nTest 2: Identify with 'this is ... speaking'...")
            r2 = requests.post("http://127.0.0.1:8000/chat", json={"question": "this is Chandrika speaking", "user_name": "Chandrika"})
            print(f"Result: {r2.status_code}, {r2.json()}")
            
            print("\nVerification Complete!")
            return
        except Exception as e:
            print(f"Attempt {i+1} failed: {e}")
            time.sleep(2)

if __name__ == "__main__":
    verify()
