from fastapi import FastAPI, Response, Query
from fastapi.responses import StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional
import os
import re
import httpx
from dotenv import load_dotenv
import requests
import string

load_dotenv()

SARVAM_AI_API_KEY = os.getenv("SARVAM_AI_API_KEY")
VOICE_MALE = "shubh"
VOICE_FEMALE = "shubh" # Set to shubh as per user request

# Global state to track conversation phase
# Detailed Phases for sequential flow
CONVERSATION_STATE = "START"


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
    "is this a good time": {
        "text": "Hi Chandrika. Is this a good time to talk about your stopped SIP?",
        "voice": VOICE_MALE,
        "next_state": "GREETING"
    },
    
    # Phase 2: SIP Details
    "sip details": {
        "text": "Thank you. I see that your SIP of ₹5,000 in the ********* Large and Mid Cap Fund was stopped on 10th January 2026 because the SIP tenure was completed. Your investments have done well, but since the SIP has stopped, you may be missing the benefit of rupee-cost averaging and long-term compounding. Would you like to re-initiate your SIP for long-term wealth creation?",
        "voice": VOICE_MALE,
        "next_state": "SIP_DETAILS"
    },

    # Phase 3: Performance
    "fiveyear performance": {
        "text": "Sure, Chandrika. The ********* Large and Mid Cap Fund has delivered an average return of around 25% over the last five years.",
        "voice": VOICE_MALE,
        "next_state": "PERFORMANCE"
    },
    "performance of this fund": {
        "text": "Sure, Chandrika. The ********* Large and Mid Cap Fund has delivered an average return of around 25% over the last five years.",
        "voice": VOICE_MALE,
        "next_state": "PERFORMANCE"
    },

    # Phase 4: Better Returns
    "better returns": {
        "text": "Good question. Some ******** funds have performed even better. For example, the ******** Mid Cap Fund has delivered an average return of about 32% over five years, and the ******** Small Cap Fund has given approximately 35% during the same period. Would you like to split your investment between these two?",
        "voice": VOICE_MALE,
        "next_state": "BETTER_RETURNS"
    },

    # Phase 5: Split Investment
    "split it": {
        "text": "Yes, Chandrika. Just to confirm, you want to invest ₹2,500 in the ********* Small Cap Fund and ₹2,500 in the ********* Mid Cap Fund as a monthly SIP, correct?",
        "voice": VOICE_MALE,
        "next_state": "SPLIT_CONFIRMATION"
    },

    # Phase 6: Confirmation
    "investor type": {
        "text": "Great. Are you a direct investor, or do you invest through a distributor or financial advisor?",
        "voice": VOICE_MALE,
        "next_state": "INVESTOR_TYPE"
    },

    # Phase 7: Direct Investor
    "process initiation": {
        "text": "Perfect. I will go ahead and start the process of re-initiating your SIP. I have placed the request to start a SIP of ₹2,500 in the ******** Small Cap Fund and ₹2,500 in the ******** Mid Cap Fund. I will also send these details clearly to your WhatsApp. Please check them and confirm once you receive them.",
        "voice": VOICE_MALE,
        "show_notification": True,
        "next_state": "PROCESS_INITIATED",
        "notification_data": {
            "title": "SIP Reactivation Details",
            "items": [
                {"fund": "******** Small Cap Fund", "amount": "₹2,500", "type": "Monthly SIP"},
                {"fund": "******** Mid Cap Fund", "amount": "₹2,500", "type": "Monthly SIP"}
            ],
            "total": "₹5,000/month"
        }
    },

    # Phase 7A: WhatsApp Confirmation
    "whatsapp confirmation": {
        "text": "Thank you, Chandrika. Just a quick reminder — mutual fund investments are subject to market risks. Please read all scheme-related documents carefully. Will you do that?",
        "voice": VOICE_MALE,
        "next_state": "WHATSAPP_CONFIRMED"
    },

    # Phase 7B: Disclaimer Confirmation
    "disclaimer confirmation": {
        "text": "If you have any other questions regarding this SIP reactivation, please feel free to ask me.",
        "voice": VOICE_MALE,
        "next_state": "DISCLAIMER_CONFIRMED"
    },

    # Phase 8: Power of Compounding
    "power of compounding": {
        "text": "Sure. The power of compounding means your investment earns returns, and then those returns also start earning more returns. Over time, this creates exponential growth instead of linear growth. This is why staying invested for longer periods helps build significant wealth. Anything else you want to ask?",
        "voice": VOICE_MALE,
        "next_state": "COMPOUNDING"
    },

    # Phase 9: Handoff
    "handoff announcement": {
        "text": "Alright, Chandrika. I will now connect this call to one of our AI wealth advisors who will register your details and complete the SIP activation.",
        "voice": VOICE_MALE,
        "next_state": "HANDOFF"
    },

    # Phase 10: Transfer → Isha
    "transfer to isha": {
        "text": "Please stay on the line. Your call is being transferred to an AI agent who will confirm your registration details. ||| Hello {name}, this is Isha, a SEBI-certified wealth advisor from ********** Mutual Fund. How are you today?",
        "voice": VOICE_FEMALE,
        "next_state": "ISHA_GREETING"
    },

    # Phase 11: Isha Feedback
    "isha feedback": {
        "text": "I’m doing well, thank you. And congratulations on restarting your SIPs with ********** Mutual Fund. I will now register and update your details to activate your SIPs. Do you have any other questions for me?",
        "voice": VOICE_FEMALE,
        "next_state": "ISHA_FEEDBACK"
    },

    # Phase 12: Isha Closing
    "isha closing": {
        "text": "Perfect. Your SIP requests will be processed shortly. Thank you for choosing ********** Mutual Fund, and have a wonderful day.",
        "voice": VOICE_FEMALE,
        "next_state": "COMPLETED"
    }
}


def normalize(text):
    text = text.lower()
    text = text.translate(str.maketrans('', '', string.punctuation))
    return " ".join(text.split())

NORMALIZED_SCRIPT = {normalize(k): v for k, v in SCRIPT.items()}
SORTED_KEYS = sorted(NORMALIZED_SCRIPT.keys(), key=len, reverse=True)

@app.post("/reset")
def reset_state():
    global CONVERSATION_STATE
    CONVERSATION_STATE = "START"
    return {"message": "State reset successfully"}

@app.post("/chat")
def chat(user: UserQuery):
    global CONVERSATION_STATE

    processed_input = normalize(user.question)
    
    # Logic to extract name from input
    extracted_name = None
    
    # Regex patterns for name extraction
    # Capture up to 3 words for the name
    name_patterns = [
        r"my name is\s+([a-z]+(?:\s+[a-z]+){0,2})",
        r"i am\s+([a-z]+(?:\s+[a-z]+){0,2})",
        r"im\s+([a-z]+(?:\s+[a-z]+){0,2})",
        r"this is\s+([a-z]+(?:\s+[a-z]+){0,2})",
        r"speaking with\s+([a-z]+(?:\s+[a-z]+){0,2})"
    ]
    
    for pattern in name_patterns:
        match = re.search(pattern, processed_input)
        if match:
            candidate = match.group(1).strip()
            # Filter out common non-name words that might match "this is..."
            if candidate not in ["correct", "right", "wrong", "true", "false", "ok", "okay", "ready", "fine", "good"]:
                extracted_name = candidate.title()
                break
                
    # If no pattern matched, but we don't have a user name yet, check for short input (1-3 words)
    # (assuming the user is responding to "May I know your good name")
    if not extracted_name and not user.user_name:
        words = processed_input.split()
        if 1 <= len(words) <= 3:
            candidate = processed_input
            # Basic filter to avoid sentences or common commands
            common_words = ["yes", "no", "ok", "okay", "sure", "hi", "hello", "hey", "what", "how", "why", "where", "when", "who"]
            if not any(w in common_words for w in words):
                extracted_name = candidate.title()

    # Determine current_name: Extracted > Existing > Default
    current_name = extracted_name if extracted_name else (user.user_name if user.user_name else "Chandrika")
    
    # Map generic inputs to contextual keys based on state
    lookup_key = processed_input
    
    # State-based intent mapping
    if CONVERSATION_STATE == "START":
        if any(w in processed_input for w in ["yes", "speaking", "this is", "i am", "im"]):
            lookup_key = "is this a good time"
    
    elif CONVERSATION_STATE == "GREETING":
        if any(w in processed_input for w in ["yes", "good time", "go ahead", "sure", "ok", "okay"]):
            lookup_key = "sip details"
    
    elif CONVERSATION_STATE == "SIP_DETAILS":
        if any(w in processed_input for w in ["yes", "reinitiate", "wealth creation", "start", "restart"]):
            lookup_key = "investor type"
        elif "performance" in processed_input:
            lookup_key = "fiveyear performance"
        elif "better" in processed_input:
            lookup_key = "better returns"
            
    elif CONVERSATION_STATE == "PERFORMANCE":
        if any(w in processed_input for w in ["better", "more", "other"]):
            lookup_key = "better returns"
        elif any(w in processed_input for w in ["yes", "ok", "split"]):
            lookup_key = "split it"
            
    elif CONVERSATION_STATE == "BETTER_RETURNS":
        if any(w in processed_input for w in ["yes", "split", "ok", "sure"]):
            lookup_key = "split it"
            
    elif CONVERSATION_STATE == "SPLIT_CONFIRMATION":
        if any(w in processed_input for w in ["yes", "correct", "right", "true", "ok"]):
            lookup_key = "investor type"
            
    elif CONVERSATION_STATE == "INVESTOR_TYPE":
        if "direct" in processed_input:
            lookup_key = "process initiation"
        elif any(w in processed_input for w in ["distributor", "advisor", "agent"]):
            lookup_key = "process initiation" # Handle both for now
            
    elif CONVERSATION_STATE == "PROCESS_INITIATED":
        if any(w in processed_input for w in ["received", "got it", "i have", "yes", "ok"]):
            lookup_key = "whatsapp confirmation"
            
    elif CONVERSATION_STATE == "WHATSAPP_CONFIRMED":
        if any(w in processed_input for w in ["yes", "will do", "sure", "ok", "i will"]):
            lookup_key = "disclaimer confirmation"
            
    elif CONVERSATION_STATE == "DISCLAIMER_CONFIRMED" or CONVERSATION_STATE == "COMPOUNDING":
        if "compounding" in processed_input:
            lookup_key = "power of compounding"
        elif any(w in processed_input for w in ["no", "nothing", "all good", "no thanks", "stop"]):
            lookup_key = "handoff announcement"
            
    elif CONVERSATION_STATE == "HANDOFF":
        if any(w in processed_input for w in ["ok", "okay", "sure", "yes", "connect"]):
            lookup_key = "transfer to isha"
            
    elif CONVERSATION_STATE == "ISHA_GREETING":
        if any(w in processed_input for w in ["good", "fine", "well", "great", "thank you"]):
            lookup_key = "isha feedback"
            
    elif CONVERSATION_STATE == "ISHA_FEEDBACK":
        if any(w in processed_input for w in ["no", "thanks", "that is it", "nothing"]):
            lookup_key = "isha closing"

    response_obj = None

    # Priority 1: State-mapped Exact Match
    if lookup_key in NORMALIZED_SCRIPT:
        response_obj = NORMALIZED_SCRIPT[lookup_key]

    # Priority 2: Keyword fallback if state didn't find a mapping but input is strong
    if not response_obj:
        for key in SORTED_KEYS:
            if key in processed_input:
                response_obj = NORMALIZED_SCRIPT[key]
                break
    
    # Fallback
    if not response_obj:
        response_obj = {
            "text": "I'm sorry, I didn't quite catch that. Could you please repeat? {name}",
            "voice": VOICE_MALE if CONVERSATION_STATE != "ISHA_GREETING" and CONVERSATION_STATE != "ISHA_FEEDBACK" else VOICE_FEMALE
        }

    # Format text
    raw_text = response_obj["text"].format(name=current_name)
    voice_id = response_obj.get("voice", VOICE_MALE)
    
    # Check for transfer message with announcement separator |||
    announcement = None
    main_message = raw_text
    
    if "|||" in raw_text:
        parts = raw_text.split("|||")
        announcement = parts[0].strip()
        main_message = parts[1].strip() if len(parts) > 1 else ""
    
    # Update State Logic
    if "next_state" in response_obj:
        CONVERSATION_STATE = response_obj["next_state"]

    response_data = {
        "answer": main_message,
        "user_name": current_name,
        "voice_id": voice_id
    }
    
    # Add announcement if present (for transfer scenarios)
    if announcement:
        response_data["announcement"] = announcement
        response_data["announcement_voice_id"] = VOICE_MALE  # Rudraksh announces the transfer
    
    # Add notification data if present (for SIP reactivation popup)
    if response_obj.get("show_notification"):
        response_data["show_notification"] = True
        response_data["notification_data"] = response_obj.get("notification_data", {})
    
    return response_data


import httpx
import base64

# Memory cache for TTS to reduce lag
TTS_CACHE = {}

async def get_sarvam_tts(text: str, voice_id: str):
    cache_key = (text, voice_id)
    if cache_key in TTS_CACHE:
        return TTS_CACHE[cache_key]
    
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
    
    async with httpx.AsyncClient() as client:
        try:
            print(f"[TTS] Requesting speech for: {text[:50]}...")
            response = await client.post(url, json=payload, headers=headers, timeout=30.0)
            if response.status_code == 200:
                audio_content = response.json().get("audios", [])[0]
                if audio_content:
                    audio_data = base64.b64decode(audio_content)
                    TTS_CACHE[cache_key] = audio_data
                    return audio_data
            else:
                print(f"[TTS] Error: {response.status_code} - {response.text}")
        except Exception as e:
            print(f"[TTS] Exception: {e}")
    return None

@app.get("/tts")
async def text_to_speech(text: str = Query(...), voice_id: str = Query(VOICE_MALE)):
    if not text or text.lower() == "undefined":
        return Response(content="Empty text", status_code=400)

    if not SARVAM_AI_API_KEY:
        return Response(content="API_KEY_MISSING", status_code=500)

    try:
        # Using a cached version of the TTS generation
        audio_data = await get_sarvam_tts(text, voice_id)
        
        if audio_data:
            return Response(content=audio_data, media_type="audio/wav")
        else:
            return Response(content="Error generating speech", status_code=500)
            
    except Exception as e:
        print(f"TTS Error: {e}")
        return Response(content="Error generating speech", status_code=500)

import threading

import asyncio

async def pre_populate_cache_async():
    try:
        print("Pre-populating TTS cache...")
        # A simple set to track what we've already cached to avoid duplicates
        seen = set()
        for text_obj in SCRIPT.values():
            text = text_obj["text"]
            voice = text_obj.get("voice", VOICE_MALE)
            
            # Split by ||| to catch both announcement and main message
            parts = [p.strip() for p in text.replace("{name}", "Chandrika").split("|||") if p.strip()]
            
            for i, part in enumerate(parts):
                # Announcement uses VOICE_MALE if it's the first part of a split
                current_voice = VOICE_MALE if len(parts) > 1 and i == 0 else voice
                cache_key = (part, current_voice)
                if part and cache_key not in seen:
                    await get_sarvam_tts(part, current_voice)
                    seen.add(cache_key)
        
        # Also pre-populate one-off responses or common fallbacks
        await get_sarvam_tts("Hi Chandrika. Is this a good time to talk about your stopped SIP?", VOICE_MALE)
        
        print("TTS cache pre-population complete.")
    except Exception as e:
        print(f"Cache pre-population error: {e}")

def run_cache_pre_population():
    # Use a fresh event loop for the pre-population thread
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
    loop.run_until_complete(pre_populate_cache_async())
    loop.close()

# Run in a separate thread to avoid delaying server startup
threading.Thread(target=run_cache_pre_population, daemon=True).start()
