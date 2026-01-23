from fastapi import FastAPI, Response
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import os
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

SCRIPT = {
    # Phase 1: Identity & Greeting
    "good morning":
    "Good morning. I'm Rudraksh calling from Outstrive Mutual Fund regarding your investment. Am I speaking with Chandrika?",

    "yes this is chandrika": 
    "Thank you, Chandrika. I'm calling because your SIP has stopped after completing its investment period. Is this a good time to talk about reactivating it?",

    "is it a good time": 
    "Since your SIP has stopped, your money is no longer being invested regularly. Reactivating it allows your investment to continue growing instead of remaining idle.",

    "is this a good time": 
    "Since your SIP has stopped, your money is no longer being invested regularly. Reactivating it allows your investment to continue growing instead of remaining idle.",

    "speaking": 
    "Thank you, Chandrika. I'm calling because your SIP has stopped after completing its investment period. Is this a good time to talk about reactivating it?",

    "thank you chandrika":
    "Thank you, Chandrika. I'm calling because your SIP has stopped after completing its investment period. Is this a good time to talk about reactivating it?",

    # Phase 2: Permission / Go Ahead
    "go ahead": 
    "Since your SIP has stopped, your money is no longer being invested regularly. Reactivating it allows your investment to continue growing instead of remaining idle.",

    "continue": 
    "Since your SIP has stopped, your money is no longer being invested regularly. Reactivating it allows your investment to continue growing instead of remaining idle.",
    # Additional resposes added

    "i want to reactivate my account":
    "I’m glad to hear that. I will connect this call to our reactivation team so they can help you complete the remaining formalities.",

    "i want to reactivate":
    "I’m glad to hear that. I will connect this call to our reactivation team so they can help you complete the remaining formalities.",

    "ready to reactivate": 
    "I’m glad to hear that. I will connect this call to our reactivation team so they can help you complete the remaining formalities.",

"yes i want to reactivate": 
"I’m glad to hear that. I will connect this call to our reactivation team so they can help you complete the remaining formalities.",

    "please proceed": 
    "I will now connect you to our reactivation team who will guide you through the final steps.",

"go ahead with reactivation": 
"I will connect this call to our reactivation team so they can take this forward for you.",
# Additional resposes added
"best returns": 
"Yes, I can explain that. In ABC Mutual Fund, our Small Cap Fund has given around 35 percent returns, Mid Cap Fund around 32 percent, and ABC Growth Fund around 25 percent over the last five years.",

"better funds": 
"Our ABC Small Cap Fund has delivered about 35 percent, ABC Mid Cap Fund about 32 percent, and ABC Growth Fund about 25 percent returns in the last five years.",

"high returns": 
"If you are looking for higher growth, ABC Small Cap Fund and ABC Mid Cap Fund have performed better than average with strong long-term returns.",

"best fund": 
"ABC Small Cap Fund and ABC Mid Cap Fund have shown strong performance with higher returns compared to regular growth funds.",


    # Phase 3: Core Questions
    "reactivation mean": 
    "Reactivation simply means restarting your existing mutual fund so your investment continues earning returns. You don't need to open a new fund.",

    "what is reactivation": 
    "Reactivation simply means restarting your existing mutual fund so your investment continues earning returns. You don't need to open a new fund.",
    
    "why should i reactivate": 
    "When your fund is inactive, it stops benefiting from market growth. By reactivating, your money continues to work for you and can grow over time through compounding.",

    "is my money safe": 
    "Yes, your money remains invested in your name and is managed by regulated mutual fund companies. Market returns may change, but your investment stays secure.",

    "guarantee": 
    "Mutual funds do not guarantee returns because they depend on market performance, but they are designed to provide good long-term growth.",

    "how do i reactivate": 
    "It's very simple. You just need to confirm a few details and submit a reactivation request, which can be done online or through your distributor.",

    "how long will it take": 
    "Once confirmed, reactivation is usually completed within one or two working days.",

    "charges": 
    "In most cases, there are no major charges. If any fees apply, they will be clearly informed before proceeding.",

    "minimum amount": 
    "You can start or continue a SIP with as little as Rs. 500 per month.",

    "change my sip amount": 
    "Yes, you can increase or decrease your SIP amount anytime based on your financial comfort.",

    "stop the sip": 
    "Yes, you can pause or stop your SIP whenever you want.",

    "withdraw": 
    "Yes, you can redeem or withdraw your investment anytime as per the fund’s rules.",

    "investment details": 
    "You can track your investment through the mutual fund’s website or mobile app, and you will also receive regular statements.",

    "taxable": 
    "Tax depends on how long you stay invested and the type of fund. Long-term investments usually have tax benefits.",

    # Phase 4: Closing
    "time to think": 
    "That's perfectly fine. You can take your time, and we can follow up whenever you’re ready.",

    "think about it": 
    "That's perfectly fine. You can take your time, and we can follow up whenever you’re ready.",

    "alright thank you": 
    "Alright, thank you. Have a great day.",

    "thank you": 
    "Thank you for your time. Have a great day.",
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
    
    # Priority 1: Exact matches (O(1) lookup)
    if processed_input in NORMALIZED_SCRIPT:
        return {"answer": NORMALIZED_SCRIPT[processed_input]}
            
    # Priority 2: Keyword presence (Key is in Input)
    for key in SORTED_KEYS:
        if key and key in processed_input:
            return {"answer": NORMALIZED_SCRIPT[key]}

    # Priority 3: Inverse Check (Input is in Key) - Handle short questions
    for key in SORTED_KEYS:
        if processed_input and processed_input in key:
            # Only match if input is meaningful (more than 3 chars)
            if len(processed_input) > 3:
                return {"answer": NORMALIZED_SCRIPT[key]}
            
    return {"answer": "Could you please repeat that?"}

class TTSRequest(BaseModel):
    text: str

@app.post("/tts")
async def text_to_speech(req: TTSRequest):
    try:
        # Using the raw response method with a 'with' statement as required by the context manager
        with client.text_to_speech.with_raw_response.convert(
            text=req.text,
            voice_id=VOICE_ID,
            model_id="eleven_multilingual_v2"
        ) as response:
            # Access audio data from response.data (which is a generator)
            audio_data = b"".join(response.data)
            return Response(content=audio_data, media_type="audio/mpeg")
    except Exception as e:
        print(f"TTS Error: {e}")
        return Response(content="Error generating speech", status_code=500)


