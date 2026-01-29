import { motion, AnimatePresence } from 'motion/react';
import { Badge } from '../ui/badge';
import { useState, useEffect, useRef } from 'react';

interface Message {
    id: string;
    role: 'agent' | 'customer';
    text: string;
}

interface ResponseCardProps {
    text: string;
    userInput: string;
}

// Typewriter component that reveals text character by character to match speech pace
function TypewriterText({
    text,
    renderHighlighted,
    charDelay = 40 // ~40ms per character matches typical speech pace (~150 WPM)
}: {
    text: string;
    renderHighlighted: (content: string) => React.ReactNode;
    charDelay?: number;
}) {
    const [displayedLength, setDisplayedLength] = useState(0);

    // Animate character by character with setTimeout
    useEffect(() => {
        if (displayedLength < text.length) {
            const timer = setTimeout(() => {
                setDisplayedLength(prev => Math.min(prev + 1, text.length));
            }, charDelay);
            return () => clearTimeout(timer);
        }
    }, [displayedLength, text.length, charDelay]);

    // Handle streaming text - if text grows, keep animating from current position
    // If text completely changes (shrinks or different content), the key prop on the component should reset it
    const visibleText = text.slice(0, displayedLength);

    return <>{renderHighlighted(visibleText)}</>;
}

export function ResponseCard({ text, userInput }: ResponseCardProps) {
    const [turnId, setTurnId] = useState(0);
    const [lastMessages, setLastMessages] = useState<Message[]>([]);
    const prevTextRef = useRef(text);
    const isIdle = text === "Click the button below to start a conversation";

    useEffect(() => {
        // Detect turn change
        const turnChanged = prevTextRef.current !== '' && text === '' && !isIdle;

        // Defer the state updates to avoid "cascading renders" lint error
        const timeout = setTimeout(() => {
            if (turnChanged) {
                setTurnId(prev => prev + 1);
            }

            if (!isIdle && (text || userInput)) {
                const currentTurnId = turnChanged ? turnId + 1 : turnId;
                const currentMessages: Message[] = [];
                if (text) {
                    currentMessages.push({ id: `agent-${currentTurnId}`, role: 'agent', text: text });
                }
                if (userInput) {
                    currentMessages.push({ id: `user-${currentTurnId}`, role: 'customer', text: userInput });
                }
                setLastMessages(currentMessages);
            } else if (isIdle) {
                setLastMessages([]);
            }
        }, 0);

        prevTextRef.current = text;
        return () => clearTimeout(timeout);
    }, [text, userInput, isIdle, turnId]);

    // Helper to highlight specific mutual fund-related keywords in blue
    const renderHighlightedText = (content: string) => {
        if (!content) return null;

        const keywords = [
            "SIP",
            "NAV",
            "mutual fund",
            "portfolio",
            "investment",
            "returns",
            "redemption",
            "units",
            "Mutual Fund Services"
        ];

        let processedText = content;
        keywords.forEach(keyword => {
            const regex = new RegExp(`(${keyword})`, 'gi');
            processedText = processedText.replace(regex, `<span class="text-[#0066FF] font-semibold">$1</span>`);
        });

        return <div dangerouslySetInnerHTML={{ __html: processedText }} />;
    };

    // Use preserved messages for the scrolling effect
    const visibleMessages = lastMessages.slice(-2);

    return (
        <div className="w-full flex flex-col h-full overflow-hidden">
            {/* Header with Icon and Title */}
            <div className="flex items-start gap-4 mb-2 shrink-0">
                <div className="w-12 h-12 bg-linear-to-br from-[#1068EB] to-[#0A54D1] rounded-lg flex items-center justify-center shadow-lg shadow-blue-100 shrink-0">
                    <svg width="24" height="24" viewBox="0 0 17 17" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M8.42811 5.61781V2.80884H5.61914" stroke="white" stroke-width="1.40448" stroke-linecap="round" stroke-linejoin="round" />
                        <path d="M12.6419 5.61792H4.21503C3.43936 5.61792 2.81055 6.24673 2.81055 7.0224V12.6403C2.81055 13.416 3.43936 14.0448 4.21503 14.0448H12.6419C13.4176 14.0448 14.0464 13.416 14.0464 12.6403V7.0224C14.0464 6.24673 13.4176 5.61792 12.6419 5.61792Z" stroke="white" stroke-width="1.40448" stroke-linecap="round" stroke-linejoin="round" />
                        <path d="M1.40527 9.83154H2.80976" stroke="white" stroke-width="1.40448" stroke-linecap="round" stroke-linejoin="round" />
                        <path d="M14.0459 9.83154H15.4504" stroke="white" stroke-width="1.40448" stroke-linecap="round" stroke-linejoin="round" />
                        <path d="M10.5342 9.12891V10.5334" stroke="white" stroke-width="1.40448" stroke-linecap="round" stroke-linejoin="round" />
                        <path d="M6.32031 9.12891V10.5334" stroke="white" stroke-width="1.40448" stroke-linecap="round" stroke-linejoin="round" />
                    </svg>
                </div>
                <div className="flex flex-col py-1 gap-0.5 text-left">
                    <h2 className="text-[16px] font-bold text-[#101828] tracking-tight">Mutual Fund AI Agent</h2>
                    <p className="text-[12px] font-medium text-[#6A7282]">********* Voice AI</p>
                </div>
            </div>

            {/* Live Status Badge */}
            <div className="mb-8 shrink-0">
                <Badge
                    variant="outline"
                    className="bg-[#F0FDF4] border-[#BBF7D0] text-[#166534] text-[12px]! px-4 py-1.5 rounded-full flex items-center gap-2 font-medium"
                >
                    <div className="w-2 h-2 rounded-full bg-[#22C55E]" />
                    Live Call in Progress
                </Badge>
            </div>

            {/* Main Dialogue Area */}
            <div className="relative flex-1 bg-[#F8FAFC] border-none rounded-lg p-6 shadow-none overflow-hidden min-w-[550px] text-left max-w-[550px] flex flex-col min-h-[400px]">
                {/* Visual Grid Background */}
                <div
                    className="absolute inset-0 pointer-events-none opacity-[0.05]"
                    style={{
                        backgroundImage: `linear-gradient(#64748b 1px, transparent 1px), linear-gradient(90deg, #64748b 1px, transparent 1px)`,
                        backgroundSize: '30px 30px'
                    }}
                />

                <div className="relative flex-1 z-10 w-full overflow-hidden">
                    <div className="flex flex-col gap-10 h-full">
                        <AnimatePresence initial={false} mode="wait">
                            {visibleMessages.length > 0 ? (
                                visibleMessages.map((msg, index) => (
                                    <motion.div
                                        key={msg.id}
                                        layout
                                        initial={{ opacity: 0, y: 40 }}
                                        animate={{
                                            opacity: 1,
                                            y: 0,
                                            transition: {
                                                type: "spring",
                                                stiffness: 150,
                                                damping: 20,
                                                delay: index * 0.15, // Staggered enter: messages appear one after another
                                                opacity: { duration: 0.4, delay: index * 0.15 }
                                            }
                                        }}
                                        exit={{
                                            opacity: 0,
                                            y: -60,
                                            transition: {
                                                duration: 0.4,
                                                delay: index * 0.15, // Staggered exit: first message goes first
                                                ease: "easeOut"
                                            }
                                        }}
                                        className="space-y-3 shrink-0"
                                    >
                                        <span className={cn(
                                            "text-[14px] font-bold tracking-widest uppercase",
                                            msg.role === 'agent' ? "text-[#0066FF]" : "text-gray-400"
                                        )}>
                                            {msg.role === 'agent' ? 'AI AGENT:' : 'CUSTOMER:'}
                                        </span>
                                        <div className="text-[14px] text-[#0F172A] leading-relaxed font-medium wrap-break-word min-h-[1.5em]">
                                            {msg.role === 'agent' ? (
                                                <TypewriterText
                                                    key={msg.id}
                                                    text={msg.text}
                                                    renderHighlighted={renderHighlightedText}
                                                    charDelay={35}
                                                />
                                            ) : msg.text}
                                        </div>
                                    </motion.div>
                                ))
                            ) : (
                                // Idle/Intro Message
                                <motion.div
                                    key="intro"
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                    className="space-y-3"
                                >
                                    <span className="text-[14px] font-bold text-[#0066FF] tracking-widest uppercase">AI AGENT:</span>
                                    <div className="text-[14px] text-[#0F172A] leading-relaxed font-medium">
                                        {text || "Click the button below to start a conversation"}
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </div>

                {/* Footer Section */}
                <div className="relative z-10 mt-auto pt-8 flex items-center justify-end shrink-0">
                    <div className="bg-[#1C64F2] text-white px-5 py-2.5 rounded-2xl text-sm font-normal shadow-lg shadow-blue-100/50">
                        Real-time AI Conversation
                    </div>
                </div>
            </div>
        </div>
    );
}

import { cn } from '@/lib/utils';
