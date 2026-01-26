from fastapi import FastAPI, Response, Query
from fastapi.responses import StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional
import os
import re
from dotenv import load_dotenv
from elevenlabs.client import ElevenLabs

load_dotenv()

ELEVENLABS_API_KEY = os.getenv("ELEVENLABS_API_KEY")
VOICE_ID = "zgqefOY5FPQ3bB7OZTVR"

client = ElevenLabs(api_key=ELEVENLABS_API_KEY)

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class UserQuery(BaseModel):
    question: str
    user_name: Optional[str] = None

SCRIPT = {
    # Phase 1: Identity & Greeting
    # Initial greeting is "Am I speaking with Mr. {name}?" but since we don't know the name yet,
    # we ask "May I know your good name please?" first in the frontend.

    "my name is": 
    "Hi {name}. Is this a good time to talk about your stopped SIP?",

    # Phase 2: SIP Details and Reactivation Offer
    "yes it is": 
    "Thank you. I see that your SIP of Rs. 5,000 in the Outstrive Large and Mid Cap Fund was stopped on 30th June 2025 because the SIP tenure was completed. Your investments have performed well, but since the SIP has stopped, you may be missing the opportunity to benefit from rupee-cost averaging and long-term compounding. Would you like to re-initiate your SIP for long-term wealth creation?",

    "yes": 
    "Thank you. I see that your SIP of Rs. 5,000 in the Outstrive Large and Mid Cap Fund was stopped on 30th June 2025 because the SIP tenure was completed. Your investments have performed well, but since the SIP has stopped, you may be missing the opportunity to benefit from rupee-cost averaging and long-term compounding. Would you like to re-initiate your SIP for long-term wealth creation?",

    # Phase 3: Fund Performance Query
    "i would like to but before that can you tell me the five year performance of this fund": 
    "Sure, {name}. The Outstrive Large and Mid Cap Fund has delivered an average return of about 25% over the last five years.",

    "five year performance": 
    "Sure, {name}. The Outstrive Large and Mid Cap Fund has delivered an average return of about 25% over the last five years.",

    "performance of this fund": 
    "Sure, {name}. The Outstrive Large and Mid Cap Fund has delivered an average return of about 25% over the last five years.",

    # Phase 4: Fund Comparison Query
    "which funds have given better returns than this over the last five years": 
    "Good question. Some Outstrive funds have performed even better. For example, the Outstrive Mid Cap Fund has given an average return of around 32% over the last five years, and the Outstrive Small Cap Fund has delivered about 35% during the same period.",

    "better returns": 
    "Good question. Some Outstrive funds have performed even better. For example, the Outstrive Mid Cap Fund has given an average return of around 32% over the last five years, and the Outstrive Small Cap Fund has delivered about 35% during the same period.",

    "which funds have given better returns": 
    "Good question. Some Outstrive funds have performed even better. For example, the Outstrive Mid Cap Fund has given an average return of around 32% over the last five years, and the Outstrive Small Cap Fund has delivered about 35% during the same period.",

    # Phase 5: Investment Reallocation Request
    "i have 5000 to invest i would like to split it": 
    "Yes, {name}. Just to confirm, you want to invest Rs. 2,500 in the Outstrive Small Cap Fund and Rs. 2,500 in the Outstrive Mid Cap Fund as a monthly SIP, correct?",

    "split it between": 
    "Yes, {name}. Just to confirm, you want to invest Rs. 2,500 in the Outstrive Small Cap Fund and Rs. 2,500 in the Outstrive Mid Cap Fund as a monthly SIP, correct?",

    "2500 in each": 
    "Yes, {name}. Just to confirm, you want to invest Rs. 2,500 in the Outstrive Small Cap Fund and Rs. 2,500 in the Outstrive Mid Cap Fund as a monthly SIP, correct?",

    "invest 2500": 
    "Yes, {name}. Just to confirm, you want to invest Rs. 2,500 in the Outstrive Small Cap Fund and Rs. 2,500 in the Outstrive Mid Cap Fund as a monthly SIP, correct?",

    # Phase 6: Confirmation and Investor Type
    "yes that's right": 
    "Great. Are you investing directly, or through a distributor or financial advisor?",

    "yes thats right": 
    "Great. Are you investing directly, or through a distributor or financial advisor?",

    "correct": 
    "Great. Are you investing directly, or through a distributor or financial advisor?",

    # Phase 7: Direct Investor Confirmation
    "i am a direct investor": 
    "Perfect. I will go ahead and start the process of re-initiating your SIP. I have placed the request to start a SIP of Rs. 2,500 in the Outstrive Small Cap Fund and Rs. 2,500 in the Outstrive Mid Cap Fund. I will also send these details clearly to your WhatsApp or email. Please check them and confirm once you receive them.",

    "direct investor": 
    "Perfect. I will go ahead and start the process of re-initiating your SIP. I have placed the request to start a SIP of Rs. 2,500 in the Outstrive Small Cap Fund and Rs. 2,500 in the Outstrive Mid Cap Fund. I will also send these details clearly to your WhatsApp or email. Please check them and confirm once you receive them.",

    # Phase 8: Closing
    "sure thank you": 
    "You're welcome, {name}. We look forward to supporting your investment journey. Have a great day!",

    "thank you": 
    "You're welcome, {name}. We look forward to supporting your investment journey. Have a great day!",
}

DEFAULT = (
    "Thanking for your time and consideration. Have a great day!"
)

import string

def normalize(text):
    # Convert to lowercase and remove punctuation and extra whitespace
    text = text.lower()
    text = text.translate(str.maketrans('', '', string.punctuation))
    return " ".join(text.split())

# Pre-normalize script keys for faster matching
NORMALIZED_SCRIPT = {normalize(k): v for k, v in SCRIPT.items()}
SORTED_KEYS = sorted(NORMALIZED_SCRIPT.keys(), key=len, reverse=True)

@app.post("/chat")
def chat(user: UserQuery):
    processed_input = normalize(user.question)
    current_name = user.user_name if user.user_name else "there"
    
    # 1. Expanded name extraction logic
    extracted_name = None
    if not user.user_name:
        patterns = [
            r"my name is (.*)",
            r"i am (.*)",
            r"this is (.*)",
            r"speaking is (.*)",
            r"(.*) speaking",
            r"it is (.*)"
        ]
        for pattern in patterns:
            match = re.search(pattern, processed_input, re.IGNORECASE)
            if match:
                extracted_name = match.group(1).replace("speaking", "").strip()
                break
        
        # 2. Logic for short non-keyword inputs as names
        if not extracted_name and len(processed_input.split()) <= 2:
            is_keyword = any(key in processed_input for key in SORTED_KEYS if key != "my name is")
            if not is_keyword:
                extracted_name = processed_input
                
    if extracted_name:
        current_name = extracted_name.capitalize()
    
    # 3. Handle clarifying responses (like "Yes this is [Name]")
    # If name was already set but user says "This is [Name]", just confirm and move on.
    if user.user_name and ("this is" in processed_input or "speaking" in processed_input):
         # If no other keyword matched, treat it as confirmation of the name
         ans = SCRIPT["my name is"].format(name=current_name)
         return {"answer": ans, "user_name": current_name}

    # 4. Priority Matching
    # Priority 1: Exact matches
    if processed_input in NORMALIZED_SCRIPT:
        ans = NORMALIZED_SCRIPT[processed_input].format(name=current_name)
        return {"answer": ans, "user_name": current_name}
            
    # Priority 2: Keyword presence
    for key in SORTED_KEYS:
        if key and key in processed_input:
            ans = NORMALIZED_SCRIPT[key].format(name=current_name)
            return {"answer": ans, "user_name": current_name}

    # Priority 3: Inverse Check
    for key in SORTED_KEYS:
        if processed_input and processed_input in key:
            if len(processed_input) > 3:
                ans = NORMALIZED_SCRIPT[key].format(name=current_name)
                return {"answer": ans, "user_name": current_name}
            
    # Final Fallback for name-only responses
    if extracted_name:
        ans = SCRIPT["my name is"].format(name=current_name)
        return {"answer": ans, "user_name": current_name}

    return {"answer": "I'm sorry, I didn't quite catch that. Could you please repeat?", "user_name": current_name}

class TTSRequest(BaseModel):
    text: str

@app.get("/tts")
async def text_to_speech(text: str = Query(...)):
    # If text is empty/undefined, return early to avoid errors
    if not text or text.lower() == "undefined":
        return Response(content="Empty text", status_code=400)

    try:
        def generate():
            try:
                # Use the raw response method to get a generator (response.data)
                with client.text_to_speech.with_raw_response.convert(
                    text=text,
                    voice_id=VOICE_ID,
                    model_id="eleven_multilingual_v2"
                ) as response:
                    for chunk in response.data:
                        if chunk:
                            yield chunk
            except Exception as e:
                # Handle error INSIDE generator
                error_msg = str(e).lower()
                print(f"Generator Error: {error_msg}")
                # We can't change the status code here as response already started
                # But we can log it

        return StreamingResponse(generate(), media_type="audio/mpeg")
    except Exception as e:
        # Check specifically for quota errors (before generator starts)
        error_msg = str(e).lower()
        if "quota_exceeded" in error_msg or "401" in error_msg or "402" in error_msg:
             print("CRITICAL: ElevenLabs Quota Exceeded. Falling back to local male voice.")
             return Response(content="QUOTA_EXCEEDED", status_code=402)
        
        print(f"TTS Outer Error: {e}")
        return Response(content="Error generating speech", status_code=500)


