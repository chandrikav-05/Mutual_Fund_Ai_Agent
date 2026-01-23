from elevenlabs.client import ElevenLabs
from dotenv import load_dotenv
import os

load_dotenv()

client = ElevenLabs(api_key=os.getenv("ELEVENLABS_API_KEY"))

# Get raw response with headers
with client.text_to_speech.with_raw_response.convert(
    text="hello this is chandrika speaking . how can i assist to day regarding to the ",
    voice_id="zgqefOY5FPQ3bB7OZTVR",
    model_id="eleven_multilingual_v2"
) as response:
    # Access character cost from headers
    char_cost = response.headers.get("x-character-count")
    request_id = response.headers.get("request-id")
    # Join the audio data if it's returned as a generator
    audio_data = b"".join(response.data)
    
    # Save the audio to a file so you can listen to it
    with open("test_output.mp3", "wb") as f:
        f.write(audio_data)
        
    print(f"Verified Success!")
    print(f"Request ID: {request_id}")
    print(f"Audio size: {len(audio_data)} bytes")
    print(f"Saved to: test_output.mp3")
