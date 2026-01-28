/**
 * Voice Engine Hook - React hook for speech recognition and synthesis
 */

import { useState, useCallback, useRef, useEffect } from "react";

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
  const synthesisRef = useRef<SpeechSynthesis | null>(null);
  const selectedVoiceRef = useRef<SpeechSynthesisVoice | null>(null);
  const maleVoiceRef = useRef<SpeechSynthesisVoice | null>(null);
  const silenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const finalTranscriptRef = useRef<string>("");
  const audioContextRef = useRef<AudioContext | null>(null);
  const callbacksRef = useRef(callbacks);

  // Keep callbacks ref updated
  useEffect(() => {
    callbacksRef.current = callbacks;
  }, [callbacks]);

  // Initialize voices
  const initVoices = useCallback(() => {
    const loadVoices = () => {
      if (!synthesisRef.current) return;

      const voices = synthesisRef.current.getVoices();

      // Find best quality voices
      const availableVoices = voices.filter((v: SpeechSynthesisVoice) =>
        v.lang.startsWith("en"),
      );

      // Female voice for agent
      selectedVoiceRef.current =
        voices.find(
          (v: SpeechSynthesisVoice) =>
            v.name.includes("Google") && v.lang.includes("en"),
        ) ||
        voices.find((v: SpeechSynthesisVoice) => v.name.includes("Samantha")) ||
        voices.find(
          (v: SpeechSynthesisVoice) =>
            v.name.includes("Microsoft") && v.name.includes("Zira"),
        ) ||
        voices.find((v: SpeechSynthesisVoice) => v.lang === "en-IN") ||
        voices.find((v: SpeechSynthesisVoice) => v.lang.startsWith("en")) ||
        voices[0];

      // Male voice for user
      const maleVoiceCandidates = [
        "Google US English Male",
        "Google UK English Male",
        "Microsoft David",
        "Daniel",
        "Alex",
        "Fred",
        "Evan",
        "Nathan",
        "Rishi"
      ];

      maleVoiceRef.current =
        voices.find(v => maleVoiceCandidates.includes(v.name)) ||
        voices.find(v => v.name.includes("Male")) ||
        // Fallback to any voice that is NOT the selected female agent voice
        voices.find(v => v.name !== selectedVoiceRef.current?.name && v.lang.startsWith("en")) ||
        voices[0];

      console.log("Agent Voice:", selectedVoiceRef.current?.name);
      console.log("User Voice:", maleVoiceRef.current?.name);
    };

    if (synthesisRef.current?.getVoices().length) {
      loadVoices();
    } else if (synthesisRef.current) {
      synthesisRef.current.onvoiceschanged = loadVoices;
      setTimeout(loadVoices, 500);
    }
  }, []);

  // Initialize recognition and synthesis
  useEffect(() => {
    if (typeof window === "undefined") return;

    synthesisRef.current = window.speechSynthesis;

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
        }, 1000);
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

    // Initialize voices
    initVoices();

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
  }, [initVoices]);

  const startListening = useCallback(() => {
    if (recognitionRef.current) {
      try {
        // We try to start; if it's already started, it will throw an error we can ignore
        recognitionRef.current.start();
        console.log("Speech recognition started");
        return true;
      } catch {
        // recognition already started or other error
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
      gender: "female" | "male" = "female",
    ): Promise<void> => {
      if (!synthesisRef.current) return;

      synthesisRef.current.cancel();
      setState((prev) => ({ ...prev, isSpeaking: true }));

      return new Promise((resolve) => {
        const utterance = new SpeechSynthesisUtterance(text);

        if (gender === "male" && maleVoiceRef.current) {
          utterance.voice = maleVoiceRef.current;
          if (
            maleVoiceRef.current.name === "Rishi" ||
            maleVoiceRef.current.name.includes("Google")
          ) {
            utterance.pitch = 1.0;
            utterance.rate = 1.0;
          } else {
            utterance.pitch = 0.95;
            utterance.rate = 1.05;
          }
        } else if (selectedVoiceRef.current) {
          utterance.voice = selectedVoiceRef.current;
          utterance.pitch = 1.0;
        }

        utterance.rate = utterance.rate || 1.0;
        utterance.volume = 1.0;

        utterance.onend = () => {
          setState((prev) => ({ ...prev, isSpeaking: false }));
          resolve();
        };

        utterance.onerror = () => {
          setState((prev) => ({ ...prev, isSpeaking: false }));
          resolve();
        };

        synthesisRef.current!.speak(utterance);
      });
    },
    [],
  );

  const stopSpeaking = useCallback(() => {
    if (synthesisRef.current) {
      synthesisRef.current.cancel();
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
