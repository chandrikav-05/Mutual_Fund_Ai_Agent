import { useState, useCallback, useRef, useEffect } from 'react';
import { VoiceOrb, ResponseCard, WhatsAppNotification } from '@/components/voice-assistant';
import { useVoiceEngine } from '@/hooks/useVoiceEngine';
import { sendChatMessage } from '@/services/api';
import { Card } from '@/components/ui/card';
import { Iphone17Pro } from '@/components/ui/iphone-17-pro';
import { Wifi, Signal, Mic, Phone, Volume2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '@/lib/utils';

type AppState = 'idle' | 'active' | 'listening' | 'speaking' | 'processing';
type VoiceEngineReturn = ReturnType<typeof useVoiceEngine>;

export function VoiceAssistantPage() {
    const [appState, setAppState] = useState<AppState>('idle');
    const [responseText, setResponseText] = useState('Click the button below to start a conversation');
    const [orbStatus, setOrbStatus] = useState('Tap to start');
    const [inputValue, setInputValue] = useState('');
    const [isMuted, setIsMuted] = useState(false);
    const [isSpeakerOn, setIsSpeakerOn] = useState(true);
    const [showWhatsApp, setShowWhatsApp] = useState(false);

    const isCallActiveRef = useRef(false);
    const isProcessingRef = useRef(false);
    const typewriterRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const processMessageRef = useRef<((text: string) => Promise<void>) | null>(null);
    const voiceEngineRef = useRef<VoiceEngineReturn | null>(null);

    const onVoiceResult = useCallback((text: string, isFinal: boolean) => {
        if (isMuted) {
            console.log("Speech ignored - muted");
            return;
        }

        if (text.trim()) {
            setInputValue(text);
        }

        if (isFinal && text.trim() && isCallActiveRef.current) {
            processMessageRef.current?.(text.trim());
        } else if (!isFinal) {
            setOrbStatus('Listening...');
        }
    }, [isMuted]);

    const onVoiceStart = useCallback(() => {
        setAppState('listening');
        setOrbStatus('Listening...');
    }, []);

    const onVoiceEnd = useCallback(() => {
        setAppState(prev => prev === 'listening' ? 'active' : prev);
        if (isCallActiveRef.current && !isProcessingRef.current && !voiceEngineRef.current?.isSpeaking) {
            setTimeout(() => {
                if (isCallActiveRef.current && !isProcessingRef.current) {
                    voiceEngineRef.current?.startListening();
                }
            }, 300);
        }
    }, []);

    const onVoiceError = useCallback((error: string) => {
        if (error === 'no-speech' && isCallActiveRef.current && !isProcessingRef.current) {
            voiceEngineRef.current?.startListening();
        }
    }, []);

    const voiceEngine = useVoiceEngine({
        onResult: onVoiceResult,
        onStart: onVoiceStart,
        onEnd: onVoiceEnd,
        onError: onVoiceError,
    });

    useEffect(() => {
        voiceEngineRef.current = voiceEngine;
    }, [voiceEngine]);

    useEffect(() => {
        return () => {
            if (typewriterRef.current) clearInterval(typewriterRef.current);
        };
    }, []);


    const typeWriter = (text: string, callback?: () => void) => {
        if (typewriterRef.current) clearInterval(typewriterRef.current);
        const cleanText = text.trim();
        setResponseText('');
        let i = 0;

        typewriterRef.current = setInterval(() => {
            if (i < cleanText.length) {
                const char = cleanText.charAt(i);
                setResponseText(prev => prev + char);
                i++;
            } else {
                if (typewriterRef.current) clearInterval(typewriterRef.current);
                callback?.();
            }
        }, 50);
    };

    const endCall = useCallback((statusMsg?: string) => {
        isCallActiveRef.current = false;
        isProcessingRef.current = false;

        // Stop typewriter immediately
        if (typewriterRef.current) {
            clearInterval(typewriterRef.current);
            typewriterRef.current = null;
        }

        voiceEngineRef.current?.stopListening();
        voiceEngineRef.current?.stopSpeaking();

        setAppState('idle');
        const finalMsg = statusMsg || 'Call ended';
        setOrbStatus(finalMsg);
        setResponseText(finalMsg);
        setInputValue(''); // Also clear input value

        setTimeout(() => {
            if (!isCallActiveRef.current) {
                setOrbStatus('Tap to start');
                setResponseText('Click the button below to start a conversation');
            }
        }, 2000);
    }, []);

    const processMessage = useCallback(async (text: string) => {
        if (isProcessingRef.current || !text || !isCallActiveRef.current) return;
        isProcessingRef.current = true;
        voiceEngineRef.current?.stopListening();
        setAppState('processing');
        setOrbStatus('Processing...');
        try {
            const data = await sendChatMessage(text);

            if (!isCallActiveRef.current) return;

            // Handle announcement (transfer scenario)
            if (data.announcement) {
                // Step 1: Show and speak the announcement
                setResponseText(data.announcement);
                setInputValue('');
                setOrbStatus('Transferring...');
                setAppState('speaking');

                // Speak the announcement with male voice (Rudraksh)
                await voiceEngineRef.current?.speak(data.announcement, 'male');

                if (!isCallActiveRef.current) return;

                // Step 2: Brief pause and clear for transition effect
                setResponseText('');
                setOrbStatus('Connecting to advisor...');
                setAppState('processing');

                // Wait 1.5 seconds for visual transition
                await new Promise(resolve => setTimeout(resolve, 1500));

                if (!isCallActiveRef.current) return;
            }

            // Step 3: Show and speak the main message (Isha's greeting after announcement, or regular response)
            if (data.answer && isCallActiveRef.current) {
                typeWriter(data.answer);
                setInputValue('');
                setOrbStatus('Speaking...');
                setAppState('speaking');

                const gender = data.voice_id === "zgqefOY5FPQ3bB7OZTVR" ? 'male' : 'female';
                await voiceEngineRef.current?.speak(data.answer, gender);

                // If call was ended while speaking, don't continue
                if (!isCallActiveRef.current) return;

                if (data.answer.toLowerCase().includes('whatsapp')) {
                    setShowWhatsApp(true);
                }

                setAppState('active');
                isProcessingRef.current = false;
                if (isCallActiveRef.current) {
                    setOrbStatus('Listening...');
                    voiceEngineRef.current?.startListening();
                }
            }
        } catch (error) {
            console.error('Chat error:', error);
            setResponseText("I'm sorry, I'm having trouble. Please try again.");
            isProcessingRef.current = false;
            if (isCallActiveRef.current) {
                setOrbStatus('Listening...');
                voiceEngineRef.current?.startListening();
            }
        }
    }, []);

    useEffect(() => {
        processMessageRef.current = processMessage;
    }, [processMessage]);

    const startCall = useCallback(async () => {
        isCallActiveRef.current = true;
        isProcessingRef.current = true;
        setAppState('active');
        setOrbStatus('Connecting...');
        setInputValue('');
        try {
            // Play ringback tone while preparing
            await voiceEngineRef.current?.playRingbackTone();

            // Initial greeting message
            const greeting = "Good morning. I'm Rudraksh calling from ********** Mutual Fund regarding your investment. Am i Speaking with Chandrika?";
            typeWriter(greeting);
            setOrbStatus('Speaking...');
            setAppState('speaking');
            await voiceEngineRef.current?.speak(greeting, 'male');

            // If call was ended while speaking, don't continue
            if (!isCallActiveRef.current) return;

            setAppState('active');
            isProcessingRef.current = false;
            if (isCallActiveRef.current) {
                setOrbStatus('Listening...');
                voiceEngineRef.current?.startListening();
            }
        } catch (error) {
            console.error('Start error:', error);
            const fallback = "Hello, welcome to Mutual Fund Services. How may I help you today?";

            // Re-check call status before fallback
            if (!isCallActiveRef.current) return;

            typeWriter(fallback);
            await voiceEngineRef.current?.speak(fallback, 'female');

            if (!isCallActiveRef.current) return;

            isProcessingRef.current = false;
            if (isCallActiveRef.current) {
                setOrbStatus('Listening...');
                voiceEngineRef.current?.startListening();
            }
        }
    }, []);

    const toggleCall = useCallback(() => {
        if (isCallActiveRef.current) endCall();
        else startCall();
    }, [endCall, startCall]);

    const toggleMute = useCallback(() => {
        setIsMuted(prev => !prev);
    }, []);

    const isActive = appState !== 'idle';
    const isListening = appState === 'listening' || voiceEngine.isListening;
    const isSpeaking = appState === 'speaking' || voiceEngine.isSpeaking;

    return (
        <div className="min-h-screen flex justify-center items-center bg-gray-50/50 p-4">
            <Card className="flex max-w-[1024px] flex-row justify-between items-center p-12 bg-white/80 backdrop-blur-sm border-gray-200/50 shadow-2xl rounded-[40px]">
                {/* Left: Response Card */}
                <div className="flex flex-col gap-6 max-w-[60%] w-full">
                    <ResponseCard
                        text={responseText}
                        userInput={inputValue}
                    />
                </div>

                {/* Right: iPhone UI */}
                <div className="flex justify-center items-center max-w-[40%] w-full">
                    <Iphone17Pro width={380} height={550}>
                        <div className={cn("relative flex flex-col h-full font-sans overflow-hidden transition-colors duration-300",
                            showWhatsApp ? "bg-[#0b141a] text-white" : "bg-white text-gray-900"
                        )}>
                            {/* StatusBar */}
                            <div className="flex justify-between items-center px-8 pt-6 pb-2 shrink-0 z-10">
                                <span className="text-sm font-semibold">9:41</span>
                                <div className="flex gap-1.5 items-center">
                                    <Signal size={14} strokeWidth={2.5} />
                                    <Wifi size={14} strokeWidth={2.5} />
                                    <div className={cn("w-5 h-2.5 border rounded-sm relative ml-0.5", showWhatsApp ? "border-gray-500" : "border-gray-400")}>
                                        <div className={cn("absolute inset-px rounded-[1px]", showWhatsApp ? "bg-white" : "bg-gray-900")} style={{ width: '60%' }} />
                                    </div>
                                </div>
                            </div>

                            <AnimatePresence mode="wait">
                                {showWhatsApp ? (
                                    <motion.div
                                        key="whatsapp"
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: 20 }}
                                        transition={{ duration: 0.3 }}
                                        className="flex-1 flex flex-col relative overflow-hidden"
                                    >
                                        <WhatsAppNotification onConfirm={() => setShowWhatsApp(false)} />
                                    </motion.div>
                                ) : (
                                    <motion.div
                                        key="call-ui"
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        exit={{ opacity: 0 }}
                                        transition={{ duration: 0.3 }}
                                        className="flex-1 flex flex-col"
                                    >
                                        {/* Contact Header */}
                                        <div className="flex flex-col items-center mt-20 mb-0">
                                            <span className="text-[12px] font-bold text-gray-400 tracking-widest uppercase mb-1">AT&T</span>
                                            <span className="text-lg font-medium tracking-tight text-gray-800">+91 1800 **** ****</span>
                                        </div>

                                        {/* Main Content Area */}
                                        <div className="flex-1 flex flex-col items-center justify-center">
                                            <VoiceOrb
                                                isActive={isActive}
                                                isSpeaking={isSpeaking}
                                                onClick={() => !isActive && toggleCall()}
                                            />

                                            <div className="mt-12 flex flex-col items-center gap-1">
                                                <h3 className="text-3xl font-bold tracking-tight text-[#111827]">
                                                    Mutual Fund
                                                </h3>
                                                <p className="text-lg font-medium text-gray-400">
                                                    AI Voice Agent
                                                </p>

                                                <AnimatePresence>
                                                    {isActive && (
                                                        <motion.div
                                                            initial={{ opacity: 0, scale: 0.9 }}
                                                            animate={{ opacity: 1, scale: 1 }}
                                                            exit={{ opacity: 0, scale: 0.9 }}
                                                            className="flex items-center gap-2 mt-2 text-[#22C55E] font-medium text-lg"
                                                        >
                                                            <div className="w-2 h-2 rounded-full bg-[#22C55E] animate-pulse" />
                                                            {isSpeaking ? 'Speaking...' : isListening ? 'Listening...' : orbStatus}
                                                        </motion.div>
                                                    )}
                                                </AnimatePresence>
                                            </div>
                                        </div>

                                        {/* Bottom Controls */}
                                        <div className="pb-12 px-10 flex items-center justify-between">
                                            <button
                                                onClick={() => setIsSpeakerOn(!isSpeakerOn)}
                                                className={cn(
                                                    "w-14 h-14 rounded-full flex items-center justify-center transition-all duration-300",
                                                    isSpeakerOn ? "bg-gray-100 text-gray-900" : "bg-gray-50 text-gray-400"
                                                )}
                                            >
                                                <Volume2 size={22} />
                                            </button>

                                            <button
                                                onClick={toggleCall}
                                                className={cn(
                                                    "w-20 h-20 rounded-full flex items-center justify-center shadow-2xl transition-all duration-500 transform hover:scale-105 active:scale-95",
                                                    isActive ? "bg-[#FF3B30] rotate-135" : "bg-[#34C759]"
                                                )}
                                            >
                                                <Phone size={32} fill="white" className="text-white" />
                                            </button>

                                            <button
                                                onClick={toggleMute}
                                                className={cn(
                                                    "w-14 h-14 rounded-full flex items-center justify-center transition-all duration-300",
                                                    isMuted ? "bg-red-50 text-red-500" : "bg-gray-100 text-gray-900"
                                                )}
                                            >
                                                <Mic size={22} fill={isMuted ? "currentColor" : "none"} />
                                            </button>
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>

                            {/* Home Indicator */}
                            <div className="flex justify-center pb-2 shrink-0 z-10">
                                <div className={cn("w-32 h-1 rounded-full", showWhatsApp ? "bg-gray-600" : "bg-gray-200")} />
                            </div>
                        </div>
                    </Iphone17Pro>
                </div>
            </Card>
        </div>
    );
}
