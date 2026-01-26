import React, { useEffect, useState, useRef } from "react";
import "./App.css";

function App() {
  const [messages, setMessages] = useState([]);
  const [started, setStarted] = useState(false);
  const [isRinging, setIsRinging] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [ttsError, setTtsError] = useState(null);
  const [userName, setUserName] = useState(null);
  const userNameRef = useRef(null);
  const chatEndRef = useRef(null);
  const audioContextRef = useRef(null);

  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isListening]);

  useEffect(() => {
    // Pre-load voices to avoid female voice fallback on first message
    window.speechSynthesis.getVoices();
    const handleVoicesChanged = () => {
      window.speechSynthesis.getVoices();
    };
    window.speechSynthesis.addEventListener("voiceschanged", handleVoicesChanged);
    return () => window.speechSynthesis.removeEventListener("voiceschanged", handleVoicesChanged);
  }, []);

  // Function to generate a phone ring sound using Web Audio API
  const playRingTone = async (count = 3) => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
    }
    const ctx = audioContextRef.current;

    for (let i = 0; i < count; i++) {
      // US Ringtone frequencies: 440Hz and 480Hz
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gainNode = ctx.createGain();

      osc1.frequency.value = 440;
      osc2.frequency.value = 480;
      osc1.type = "sine";
      osc2.type = "sine";

      gainNode.gain.setValueAtTime(0, ctx.currentTime);
      gainNode.gain.linearRampToValueAtTime(0.1, ctx.currentTime + 0.1);
      gainNode.gain.setValueAtTime(0.1, ctx.currentTime + 1.2);
      gainNode.gain.linearRampToValueAtTime(0, ctx.currentTime + 1.3);

      osc1.connect(gainNode);
      osc2.connect(gainNode);
      gainNode.connect(ctx.destination);

      osc1.start();
      osc2.start();
      osc1.stop(ctx.currentTime + 1.3);
      osc2.stop(ctx.currentTime + 1.3);

      // Wait for the ring duration + pause
      await new Promise(resolve => setTimeout(resolve, 2500));
    }
  };

  const speak = async (text, callback) => {
    try {
      setIsSpeaking(true);
      setTtsError(null);
      const encodedText = encodeURIComponent(text);
      const url = `http://127.0.0.1:8000/tts?text=${encodedText}`;

      const response = await fetch(url);

      if (!response.ok) {
        if (response.status === 402 || response.status === 401) {
          setTtsError("ElevenLabs Quota Exceeded. Using local male voice.");
        } else {
          setTtsError(`TTS Error (${response.status})`);
        }
        throw new Error("TTS Failed");
      }

      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      const audio = new Audio(blobUrl);

      audio.onended = () => {
        setIsSpeaking(false);
        URL.revokeObjectURL(blobUrl);
        if (callback) callback();
      };
      await audio.play();
    } catch (error) {
      console.error("TTS Error:", error);
      setIsSpeaking(false);
      fallbackToBrowser(text, callback);
    }
  };

  const fallbackToBrowser = (text, callback) => {
    const u = new SpeechSynthesisUtterance(text);
    const voices = window.speechSynthesis.getVoices();

    // Comprehensive male voice selection
    const maleVoice = voices.find(v =>
      v.name === "Alex" ||
      v.name === "Daniel" ||
      v.name.includes("Male") ||
      v.name.includes("David") ||
      v.name.includes("Mark") ||
      (v.lang === "en-IN" && v.name.includes("Rishi")) ||
      v.name.includes("English (UK)+Male")
    );

    if (maleVoice) {
      u.voice = maleVoice;
      // console.log("Using browser male voice:", maleVoice.name);
    } else {
      // If still no male voice found, try any English voice that might be neutral/male
      const engVoice = voices.find(v => v.lang.startsWith("en"));
      if (engVoice) u.voice = engVoice;
    }

    u.rate = 1.0;
    u.pitch = 0.9; // Lower pitch slightly to sound more male if it's a neutral voice

    u.onend = () => {
      if (callback) callback();
    };
    window.speechSynthesis.speak(u);
  };

  const listen = () => {
    const recognition = new (window.webkitSpeechRecognition || window.SpeechRecognition)();
    recognition.lang = "en-IN";
    recognition.interimResults = false;
    recognition.continuous = false; // Stop automatically when user stops speaking

    recognition.onstart = () => {
      setIsListening(true);
    };

    recognition.onresult = async (e) => {
      const userText = e.results[0][0].transcript;
      setMessages((m) => [...m, { sender: "User", text: userText }]);
      setIsListening(false);

      try {
        const res = await fetch("http://127.0.0.1:8000/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ question: userText, user_name: userNameRef.current })
        });

        const data = await res.json();
        const aiAnswer = data.answer || "I'm sorry, I didn't catch that. Could you please repeat?";
        if (data.user_name) {
          setUserName(data.user_name);
          userNameRef.current = data.user_name;
        }

        setMessages((m) => [...m, { sender: "AI", text: aiAnswer }]);

        // Check if the AI is saying goodbye (look for definitive closing phrases)
        const lowerAnswer = aiAnswer.toLowerCase();
        const isGoodbye = (lowerAnswer.includes("have a great day") ||
          lowerAnswer.includes("have a good day") ||
          lowerAnswer.includes("thank you for your time")) &&
          !aiAnswer.includes("?");

        speak(aiAnswer, () => {
          if (isGoodbye) {
            setStarted(false);
            setMessages((m) => [...m, { sender: "System", text: "📞 Call Disconnected" }]);
          } else {
            listen();
          }
        });
      } catch (error) {
        console.error("Error fetching AI response:", error);
      }
    };

    recognition.onerror = (event) => {
      console.error("Speech recognition error:", event.error);
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognition.start();
  };

  const startCall = async () => {
    if (!started && !isRinging) {
      setMessages([]); // Clear previous chat
      setIsRinging(true);

      // Simulate phone ringing
      await playRingTone(2); // Ring twice

      setIsRinging(false);
      setStarted(true);
      setUserName(null);
      userNameRef.current = null;

      const greeting = "Good morning. I am Rudraksh calling from Outstrive Mutual Fund. May I know your good name please?";
      setMessages([{ sender: "AI", text: greeting }]);

      speak(greeting, () => {
        listen();
      });
    } else if (started && !isListening && !isSpeaking) {
      listen();
    }
  };

  return (
    <div className="app-wrapper">
      {/* Left Side: AI Visualizer */}
      <div className="ai-visualizer">
        <div className="orb-container">
          <div className="orb-inner"></div>
        </div>

        <div className="avatar-container">
          <div className={`avatar-glow ${isSpeaking || isListening || isRinging ? 'active' : ''}`}></div>
          <div className={`ring-animation ${isRinging ? 'active' : ''}`}></div>
          <img
            src={isListening || isRinging ? "/ai-orb.png" : "/ai-avatar-male.png"}
            alt="AI Assistant"
            className={`avatar-main ${isSpeaking ? 'speaking' : ''} ${isRinging ? 'ringing' : ''}`}
          />
        </div>

        <div className="status-label">
          <span className={`status-dot ${isListening || isSpeaking || isRinging ? 'active' : ''}`}></span>
          {isRinging ? "Calling..." : isSpeaking ? "AI Speaking" : isListening ? "Listening..." : "Ready"}
        </div>

        {ttsError && (
          <div className="error-badge" style={{ color: '#ff6b6b', fontSize: '12px', marginTop: '10px', background: 'rgba(255,107,107,0.1)', padding: '4px 8px', borderRadius: '4px' }}>
            {ttsError}
          </div>
        )}

        {(isSpeaking || isRinging) && (
          <div className="waveform">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="bar" style={{ animationDelay: `${i * 0.1}s`, height: isRinging ? '10px' : '' }}></div>
            ))}
          </div>
        )}
      </div>

      {/* Right Side: Chat Container */}
      <div className="container">
        <div className="header">
          <h2>
            <span role="img" aria-label="bot">🤖</span>
            Mutual Fund Executive
          </h2>
          {isRinging && <div className="calling-indicator">Establishing Secure Line...</div>}
        </div>

        <div className="chat-box">
          {!started && !isRinging && (
            <div className="welcome-placeholder">
              <div className="icon">📞</div>
              <h3>Ready to start the call?</h3>
              <p>Click the button below to connect with your AI executive.</p>
            </div>
          )}

          {messages.map((m, i) => (
            <div key={i} className={`msg-wrapper ${m.sender === "AI" ? "ai" : m.sender === "User" ? "user" : "system"}`}>
              {m.sender !== "System" && <span className="sender-name">{m.sender}</span>}
              <div className={`msg ${m.sender === "AI" ? "ai" : m.sender === "User" ? "user" : "system disconnected"}`}>
                {m.text}
              </div>
            </div>
          ))}
          {isListening && (
            <div className="msg system">
              <span className="status-dot active"></span>
              Executive is listening...
            </div>
          )}
          <div ref={chatEndRef} />
        </div>

        <div className="controls">
          <button
            className={`mic-btn ${isListening ? "listening-pulse" : ""} ${isRinging ? "ringing-btn" : ""}`}
            onClick={startCall}
            disabled={isListening || isSpeaking || isRinging}
          >
            {isRinging ? (
              <>
                <span className="loader-ring"></span>
                Calling...
              </>
            ) : started ? (
              <>
                <span role="img" aria-label="mic">{isListening ? "⏳" : "🎤"}</span>
                {isListening ? "Listening..." : "Tap to Speak"}
              </>
            ) : (
              <>
                <span role="img" aria-label="call">📞</span>
                Start Conversation
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

export default App;
