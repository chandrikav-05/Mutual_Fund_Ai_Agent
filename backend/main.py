from fastapi import FastAPI, Response, Query
from fastapi.responses import StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional
import os
import re
from dotenv import load_dotenv
from elevenlabs.client import ElevenLabs
import string

load_dotenv()

ELEVENLABS_API_KEY = os.getenv("ELEVENLABS_API_KEY")
VOICE_MALE = "zgqefOY5FPQ3bB7OZTVR" # Tested Male Voice
VOICE_FEMALE = "21m00Tcm4TlvDq8ikWAM" # Rachel

# Global state to track conversation phase
# Phases: "rudraksh" -> "transition" -> "isha"
CONVERSATION_STATE = "rudraksh"

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

# Script dictionary now stores objects with text and optional voice
# If voice is None, it defaults to Male (Rudraksh)
SCRIPT = {

    # Phase 1: Identity & Greeting
    "Yeah": {
        "text": "Hi Chandrika. Is this a good time to talk about your stopped SIP?",
        "voice": VOICE_MALE
    },
    "Yeah You are speaking with Chandrika": {
        "text": "Hi Chandrika. Is this a good time to talk about your stopped SIP?",
        "voice": VOICE_MALE
    },
    "Yeah this is Chandrika ": {
        "text": "Hi Chandrika. Is this a good time to talk about your stopped SIP?",
        "voice": VOICE_MALE
    },

    # Phase 2: SIP Details
    "yes it is": {
        "text": "Thank you. I see that your SIP of ₹5,000 in the Outstrive Large and Mid Cap Fund was stopped on 10th January 2026 because the SIP tenure was completed. Your investments have done well, but since the SIP has stopped, you may be missing the benefit of rupee-cost averaging and long-term compounding. Would you like to re-initiate your SIP for long-term wealth creation?",
        "voice": VOICE_MALE
    },
    "yes , you can go ahead": {
        "text": "Thank you. I see that your SIP of ₹5,000 in the Outstrive Large and Mid Cap Fund was stopped on 10th January 2026 because the SIP tenure was completed. Your investments have done well, but since the SIP has stopped, you may be missing the benefit of rupee-cost averaging and long-term compounding. Would you like to re-initiate your SIP for long-term wealth creation?",
        "voice": VOICE_MALE
    },
    "yes": {
        "text": "Thank you. I see that your SIP of ₹5,000 in the Outstrive Large and Mid Cap Fund was stopped on 10th January 2026 because the SIP tenure was completed. Your investments have done well, but since the SIP has stopped, you may be missing the benefit of rupee-cost averaging and long-term compounding. Would you like to re-initiate your SIP for long-term wealth creation?",
        "voice": VOICE_MALE
    },

    # Phase 3: Performance
    "fiveyear performance": {
        "text": "Sure, Chandrika. The Outstrive Large and Mid Cap Fund has delivered an average return of around 25% over the last five years.",
        "voice": VOICE_MALE
    },
    "performance of this fund": {
        "text": "Sure, Chandrika. The Outstrive Large and Mid Cap Fund has delivered an average return of around 25% over the last five years.",
        "voice": VOICE_MALE
    },

    # Phase 4: Better Returns
    "better returns": {
        "text": "Good question. Some Outstrive funds have performed even better. For example, the Outstrive Mid Cap Fund has delivered an average return of about 32% over five years, and the Outstrive Small Cap Fund has given approximately 35% during the same period.",
        "voice": VOICE_MALE
    },
    "funds have given better returns": {
        "text": "Good question. Some Outstrive funds have performed even better. For example, the Outstrive Mid Cap Fund has delivered an average return of about 32% over five years, and the Outstrive Small Cap Fund has given approximately 35% during the same period.",
        "voice": VOICE_MALE
    },

    # Phase 5: Split Investment
    "split it": {
        "text": "Yes, Chandrika. Just to confirm, you want to invest ₹2,500 in the Outstrive Small Cap Fund and ₹2,500 in the Outstrive Mid Cap Fund as a monthly SIP, correct?",
        "voice": VOICE_MALE
    },
    "2500 in each": {
        "text": "Yes, Chandrika. Just to confirm, you want to invest ₹2,500 in the Outstrive Small Cap Fund and ₹2,500 in the Outstrive Mid Cap Fund as a monthly SIP, correct?",
        "voice": VOICE_MALE
    },

    # Phase 6: Confirmation
    "yes thats right": {
        "text": "Great. Are you a direct investor, or do you invest through a distributor or financial advisor?",
        "voice": VOICE_MALE
    },
    "correct": {
        "text": "Great. Are you a direct investor, or do you invest through a distributor or financial advisor?",
        "voice": VOICE_MALE
    },

    # Phase 7: Direct Investor
    "direct investor": {
        "text": "Perfect. I will go ahead and start the process of re-initiating your SIP. I have placed the request to start a SIP of ₹2,500 in the Outstrive Small Cap Fund and ₹2,500 in the Outstrive Mid Cap Fund. I will also send these details clearly to your WhatsApp or email. Please check them and confirm once you receive them.",
        "voice": VOICE_MALE
    },

    # NEW Phase 7A: WhatsApp Confirmation
    "i have received": {
        "text": "Thank you, Chandrika. Just a quick reminder — mutual fund investments are subject to market risks. Please read all scheme-related documents carefully.",
        "voice": VOICE_MALE
    },
    "received the details": {
        "text": "Thank you, Chandrika. Just a quick reminder — mutual fund investments are subject to market risks. Please read all scheme-related documents carefully.",
        "voice": VOICE_MALE
    },

    # NEW Phase 7B: User confirms disclaimer
    "i will go through them and confirm": {
        "text": "If you have any other questions regarding this SIP reactivation, please feel free to ask me.",
        "voice": VOICE_MALE
    },
    "i will confirm": {
        "text": "If you have any other questions regarding this SIP reactivation, please feel free to ask me.",
        "voice": VOICE_MALE
    },

    # Phase 8: Power of Compounding
    "power of compounding": {
        "text": "Sure. The power of compounding means your investment earns returns, and then those returns also start earning more returns. Over time, this creates exponential growth instead of linear growth. This is why staying invested for longer periods helps build significant wealth. Anything else you want to ask?",
        "voice": VOICE_MALE
    },

    # Phase 9: Handoff
    "nothing else": {
        "text": "Alright, Chandrika. I will now connect this call to one of our AI wealth advisors who will register your details and complete the SIP activation.",
        "voice": VOICE_MALE
    },
    "no nothing else": {
        "text": "Alright, Chandrika. I will now connect this call to one of our AI wealth advisors who will register your details and complete the SIP activation.",
        "voice": VOICE_MALE
    },

    # Phase 10: Transfer → Isha
    "okay": {
        "text": "Please stay on the line. Your call is being transferred to an AI agent who will confirm your registration details. ||| Hello {name}, this is Isha, a SEBI-certified wealth advisor from Outstrive Mutual Fund. How are you today?",
        "voice": VOICE_FEMALE
    },
    "ok": {
        "text": "Please stay on the line. Your call is being transferred to an AI agent who will confirm your registration details. ||| Hello {name}, this is Isha, a SEBI-certified wealth advisor from Outstrive Mutual Fund. How are you today?",
        "voice": VOICE_FEMALE
    },
    "sure": {
        "text": "Please stay on the line. Your call is being transferred to an AI agent who will confirm your registration details. ||| Hello {name}, this is Isha, a SEBI-certified wealth advisor from Outstrive Mutual Fund. How are you today?",
        "voice": VOICE_FEMALE
    },

    # Phase 11: Isha Conversation
    "i am good": {
        "text": "I’m doing well, thank you. And congratulations on restarting your SIPs with Outstrive Mutual Fund.",
        "voice": VOICE_FEMALE
    },
    "im good": {
        "text": "I’m doing well, thank you. And congratulations on restarting your SIPs with Outstrive Mutual Fund.",
        "voice": VOICE_FEMALE
    },

    "thank you isha": {
        "text": "I will now register and update your details to activate your SIPs. Do you have any other questions for me?",
        "voice": VOICE_FEMALE
    },

    "no": {
        "text": "Perfect. Your SIP requests will be processed shortly. Thank you for choosing Outstrive Mutual Fund, and have a wonderful day.",
        "voice": VOICE_FEMALE
    },
    "no thank you": {
        "text": "Perfect. Your SIP requests will be processed shortly. Thank you for choosing Outstrive Mutual Fund, and have a wonderful day.",
        "voice": VOICE_FEMALE
    }
}


def normalize(text):
    text = text.lower()
    text = text.translate(str.maketrans('', '', string.punctuation))
    return " ".join(text.split())

NORMALIZED_SCRIPT = {normalize(k): v for k, v in SCRIPT.items()}
SORTED_KEYS = sorted(NORMALIZED_SCRIPT.keys(), key=len, reverse=True)

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
    
    # Reset state if starting conversation or direct override
    if "my name is" in processed_input or "yes this is" in processed_input or "start" in processed_input:
        CONVERSATION_STATE = "rudraksh"

    # Handle ambiguous inputs based on state
    lookup_key = processed_input
    if "no thank you" in processed_input or processed_input == "no":
        if CONVERSATION_STATE == "rudraksh":
            lookup_key = "nothing else"
        else:
            lookup_key = "no queries"

    response_obj = None

    # Priority 1: Exact Match (using lookup_key)
    if lookup_key in NORMALIZED_SCRIPT:
        response_obj = NORMALIZED_SCRIPT[lookup_key]

    # Priority 2: Keyword Match
    if not response_obj:
        for key in SORTED_KEYS:
            if key in processed_input: # Use original input for partial match
                response_obj = NORMALIZED_SCRIPT[key]
                break
    
    # Priority 3: Contextual Action (If name was extracted, treat as identity confirmation)
    if not response_obj and extracted_name:
         # Map to the identity confirmation response
         # We can use "my name is" key which we know exists and maps to the right text
         response_obj = NORMALIZED_SCRIPT.get("my name is") or list(NORMALIZED_SCRIPT.values())[0] # Fallback safe

    # Fallback
    if not response_obj:
         # If the user is just confirming (e.g. "Okay"), but we missed it in exact match?
         # Check for very short inputs that might be confirmations
         if len(processed_input.split()) <= 2 and ("ok" in processed_input or "yes" in processed_input):
             # Default behavior for 'ok' missed cases
             pass
         
         response_obj = {
             "text": "I'm sorry, I didn't quite catch that. Could you please repeat?",
             "voice": VOICE_MALE if CONVERSATION_STATE == "rudraksh" else VOICE_FEMALE
         }

    # Format text
    final_text = response_obj["text"].format(name=current_name)
    voice_id = response_obj.get("voice", VOICE_MALE)
    
    # Update State Logic
    # Transition to 'transition' phase if Rudraksh handoff line is triggered
    if lookup_key in ["nothing else", "no questions"] and CONVERSATION_STATE == "rudraksh":
        CONVERSATION_STATE = "transition"
    
    # Transition to 'isha' phase if Transfer line is triggered
    # Triggers for transfer: "okay", "ok", "sure", "go ahead", "connect me"
    elif lookup_key in ["okay", "ok", "sure", "go ahead", "connect me"] and CONVERSATION_STATE == "transition":
        CONVERSATION_STATE = "isha"

    return {
        "answer": final_text,
        "user_name": current_name,
        "voice_id": voice_id
    }

@app.get("/tts")
async def text_to_speech(text: str = Query(...), voice_id: str = Query(VOICE_MALE)):
    if not text or text.lower() == "undefined":
        return Response(content="Empty text", status_code=400)

    try:
        def generate():
            try:
                with client.text_to_speech.with_raw_response.convert(
                    text=text,
                    voice_id=voice_id,
                    model_id="eleven_multilingual_v2"
                ) as response:
                    for chunk in response.data:
                        if chunk:
                            yield chunk
            except Exception as e:
                # Catch specific 401/402 inside if helpful, but usually thrown at start
                print(f"Generator Error: {e}")

        return StreamingResponse(generate(), media_type="audio/mpeg")
    except Exception as e:
        error_msg = str(e).lower()
        if "quota_exceeded" in error_msg or "401" in error_msg or "402" in error_msg:
             print("ElevenLabs Quota/Auth Error")
             return Response(content="QUOTA_EXCEEDED", status_code=402)
        print(f"TTS Error: {e}")
        return Response(content="Error generating speech", status_code=500)
