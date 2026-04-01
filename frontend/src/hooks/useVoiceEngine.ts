/**
 * Voice Engine Hook - React hook for speech recognition and synthesis
 */

import { useState, useCallback, useRef, useEffect } from "react";
import { getTTSAudioURL } from "@/services/api";

interface VoiceEngineState {
  isListening: boolean;
  isSpeaking: boolean;
  isSupported: boolean;
  interimTranscript: string;
}

interface VoiceEngineCallbacks {
  onResult?: (text: string, isFinal: boolean) => void;
  onStart?: () => void;
  onEnd?: () => void;
  onError?: (error: string) => void;
}

// Web Speech API types
interface SpeechRecognitionResultItem {
  transcript: string;
  confidence: number;
}

interface SpeechRecognitionResult {
  isFinal: boolean;
  length: number;
  [index: number]: SpeechRecognitionResultItem;
}

interface SpeechRecognitionResultList {
  length: number;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionEventCustom {
  resultIndex: number;
  results: SpeechRecognitionResultList;
}

interface SpeechRecognitionErrorEvent {
  error: string;
}

interface SpeechRecognitionInstance {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  maxAlternatives: number;
  onresult: ((event: SpeechRecognitionEventCustom) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
  onstart: (() => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
}

interface SpeechRecognitionConstructor {
  new(): SpeechRecognitionInstance;
}

// Clean transcript helper - defined outside hook for hoisting
const cleanTranscript = (text: string): string => {
  let cleaned = text;

  // Mutual fund related patterns - common misrecognitions
  cleaned = cleaned.replace(/m\s*f\s*1\s*2\s*3/gi, "MF123");
  cleaned = cleaned.replace(/mf\s*123/gi, "MF123");
  cleaned = cleaned.replace(/s\s*i\s*p/gi, "SIP");
  cleaned = cleaned.replace(/n\s*a\s*v/gi, "NAV");

  // Clean up extra spaces
  cleaned = cleaned.replace(/\s+/g, " ").trim();

  return cleaned;
};

// Extend Window interface
declare global {
  interface Window {
    SpeechRecognition?: SpeechRecognitionConstructor;
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
    webkitAudioContext?: typeof AudioContext;
  }
}

export function useVoiceEngine(callbacks: VoiceEngineCallbacks = {}) {
  const [state, setState] = useState<VoiceEngineState>({
    isListening: false,
    isSpeaking: false,
    isSupported:
      typeof window !== "undefined" &&
      !!(window.SpeechRecognition || window.webkitSpeechRecognition),
    interimTranscript: "",
  });

  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const silenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const finalTranscriptRef = useRef<string>("");
  const audioContextRef = useRef<AudioContext | null>(null);
  const audioPlayerRef = useRef<HTMLAudioElement | null>(null);
  const callbacksRef = useRef(callbacks);

  // Keep callbacks ref updated
  useEffect(() => {
    callbacksRef.current = callbacks;
  }, [callbacks]);

  // Initialize recognition
  useEffect(() => {
    if (typeof window === "undefined") return;

    const SpeechRecognitionClass =
      window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognitionClass) {
      console.warn("Speech recognition not supported");
      return;
    }

    const recognition = new SpeechRecognitionClass();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-IN";
    recognition.maxAlternatives = 1;

    recognition.onresult = (event: SpeechRecognitionEventCustom) => {
      let interim = "";

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          finalTranscriptRef.current += result[0].transcript + " ";
        } else {
          interim += result[0].transcript;
        }
      }

      // Show interim results
      if (interim) {
        setState((prev) => ({ ...prev, interimTranscript: interim }));
        callbacksRef.current.onResult?.(interim, false);
      }

      // On final result, wait for pause then send
      if (finalTranscriptRef.current) {
        if (silenceTimerRef.current) {
          clearTimeout(silenceTimerRef.current);
        }
        silenceTimerRef.current = setTimeout(() => {
          if (finalTranscriptRef.current.trim()) {
            const cleaned = cleanTranscript(finalTranscriptRef.current.trim());
            callbacksRef.current.onResult?.(cleaned, true);
            finalTranscriptRef.current = "";
          }
        }, 400); // Reduced from 500ms to 400ms for faster response
      }
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      if (event.error !== "aborted" && event.error !== "no-speech") {
        console.error("Speech error:", event.error);
      }
      callbacksRef.current.onError?.(event.error);
    };

    recognition.onstart = () => {
      setState((prev) => ({ ...prev, isListening: true }));
      callbacksRef.current.onStart?.();
    };

    recognition.onend = () => {
      setState((prev) => ({ ...prev, isListening: false }));
      callbacksRef.current.onEnd?.();
    };

    recognitionRef.current = recognition;

    return () => {
      if (silenceTimerRef.current) {
        clearTimeout(silenceTimerRef.current);
      }
      try {
        recognition.stop();
      } catch {
        // Ignore stop errors
      }
    };
  }, []);

  const startListening = useCallback(() => {
    if (recognitionRef.current) {
      try {
        // Stop any existing recognition first to clean state
        try { recognitionRef.current.stop(); } catch (e) {}
        
        recognitionRef.current.start();
        console.log("Speech recognition started");
        return true;
      } catch (err) {
        console.error("Speech recognition start failed:", err);
        return false;
      }
    }
    return false;
  }, []);

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {
        // Ignore stop errors
      }
    }
    setState((prev) => ({ ...prev, isListening: false }));
  }, []);

  const speak = useCallback(
    async (
      text: string,
      voiceId: string = "shubh",
    ): Promise<void> => {
      // Cancel previous speech if any
      if (audioPlayerRef.current) {
        audioPlayerRef.current.pause();
        audioPlayerRef.current = null;
      }

      setState((prev) => ({ ...prev, isSpeaking: true }));

      try {
        const audioUrl = getTTSAudioURL(text, voiceId);
        const audio = new Audio(audioUrl);
        audioPlayerRef.current = audio;

        return new Promise((resolve) => {
          audio.onended = () => {
            setState((prev) => ({ ...prev, isSpeaking: false }));
            audioPlayerRef.current = null;
            resolve();
          };

          audio.onerror = (e) => {
            console.error("Audio playback error:", e);
            setState((prev) => ({ ...prev, isSpeaking: false }));
            audioPlayerRef.current = null;
            resolve();
          };

          audio.play().catch(err => {
            console.error("Audio play error:", err);
            setState((prev) => ({ ...prev, isSpeaking: false }));
            resolve();
          });
        });
      } catch (error) {
        console.error("TTS fetch error:", error);
        setState((prev) => ({ ...prev, isSpeaking: false }));
      }
    },
    [],
  );

  const stopSpeaking = useCallback(() => {
    if (audioPlayerRef.current) {
      audioPlayerRef.current.pause();
      audioPlayerRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close().catch(() => { });
      audioContextRef.current = null;
    }
    setState((prev) => ({ ...prev, isSpeaking: false }));
  }, []);

  const playRingbackTone = useCallback(async (): Promise<void> => {
    return new Promise((resolve) => {
      try {
        const AudioContextClass =
          window.AudioContext || window.webkitAudioContext;
        if (!AudioContextClass) {
          resolve();
          return;
        }

        const ctx = new AudioContextClass();
        audioContextRef.current = ctx;

        const oscillator1 = ctx.createOscillator();
        const oscillator2 = ctx.createOscillator();
        const gainNode = ctx.createGain();

        // Standard US Ringback tone frequencies (440Hz + 480Hz)
        oscillator1.type = "sine";
        oscillator1.frequency.setValueAtTime(440, ctx.currentTime);

        oscillator2.type = "sine";
        oscillator2.frequency.setValueAtTime(480, ctx.currentTime);

        // Connect oscillators to gain node
        oscillator1.connect(gainNode);
        oscillator2.connect(gainNode);

        // Connect gain to output
        gainNode.connect(ctx.destination);

        // Volume envelope for a single ring (2 seconds)
        gainNode.gain.setValueAtTime(0, ctx.currentTime);
        gainNode.gain.linearRampToValueAtTime(0.1, ctx.currentTime + 0.1);
        gainNode.gain.setValueAtTime(0.1, ctx.currentTime + 1.8);
        gainNode.gain.linearRampToValueAtTime(0, ctx.currentTime + 2.0);

        // Start oscillators
        oscillator1.start();
        oscillator2.start();

        // Stop after 2 seconds
        setTimeout(() => {
          if (audioContextRef.current === ctx) {
            oscillator1.stop();
            oscillator2.stop();
            ctx.close().catch(() => { });
            audioContextRef.current = null;
          }
          resolve();
        }, 2000);
      } catch (error) {
        console.error("Error playing ringback:", error);
        resolve();
      }
    });
  }, []);

  return {
    ...state,
    startListening,
    stopListening,
    speak,
    stopSpeaking,
    playRingbackTone,
  };
}
