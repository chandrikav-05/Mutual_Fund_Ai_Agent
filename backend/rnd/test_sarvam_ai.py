import requests
import os
from dotenv import load_dotenv
import base64

load_dotenv()

SARVAM_AI_API_KEY = os.getenv("SARVAM_AI_API_KEY")

def test_tts(text, voice_id="shubh"):
    if not SARVAM_AI_API_KEY:
        print("Error: SARVAM_AI_API_KEY is not set in .env")
        return

    url = "https://api.sarvam.ai/text-to-speech"
    
    payload = {
        "inputs": [text],
        "target_language_code": "en-IN",
        "speaker": voice_id,
        "pace": 1.0,
        "speech_sample_rate": 22050,
        "enable_preprocessing": True,
        "model": "bulbul:v3"
    }
    
    headers = {
        "api-subscription-key": SARVAM_AI_API_KEY,
        "Content-Type": "application/json"
    }

    try:
        print(f"Testing TTS with voice: {voice_id}...")
        response = requests.post(url, json=payload, headers=headers)
        
        if response.status_code == 200:
            audio_content = response.json().get("audios", [])[0]
            if audio_content:
                audio_data = base64.b64decode(audio_content)
                filename = f"test_{voice_id}.wav"
                with open(filename, "wb") as f:
                    f.write(audio_data)
                print(f"Success! Audio saved to {filename}")
            else:
                print("Error: No audio data in response")
        else:
            print(f"Error: {response.status_code} - {response.text}")
            
    except Exception as e:
        print(f"Exception: {e}")

if __name__ == "__main__":
    test_tts("Hi Sai. This is a test of the Sarvam AI Ritu voice.", voice_id="ritu")
