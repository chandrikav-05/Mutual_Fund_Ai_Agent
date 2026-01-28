import { motion } from 'motion/react';
import { cn } from '@/lib/utils';

interface VoiceOrbProps {
    isActive: boolean;
    isSpeaking?: boolean;
    onClick: () => void;
}

export function VoiceOrb({
    isActive,
    isSpeaking = false,
    onClick
}: VoiceOrbProps) {
    return (
        <div className="flex items-center justify-center py-8">
            <div className="relative">
                {/* Pulsing Rings - Only animate when AI is speaking */}
                {isSpeaking && [1, 2, 3].map((i) => (
                    <motion.div
                        key={i}
                        className="absolute inset-0 -m-8 rounded-full border border-[#51A2FF]"
                        animate={{
                            scale: [1, 1.4, 1.8],
                            opacity: [0.3, 0.1, 0],
                        }}
                        transition={{
                            duration: 3,
                            repeat: Infinity,
                            delay: i * 0.8,
                            ease: 'easeOut',
                        }}
                    />
                ))}

                {/* Main Avatar/Orb */}
                <motion.div
                    className={cn(
                        "relative w-50 h-50 rounded-full flex items-center justify-center cursor-pointer",
                        "shadow-sm transition-all duration-300",
                        isActive
                            ? "bg-linear-to-br from-[#2B7FFF] to-[#155DFC]"
                            : "bg-linear-to-br from-gray-200 to-gray-300"
                    )}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={onClick}
                >
                    <span className={cn(
                        "text-4xl font-bold tracking-tighter",
                        isActive ? "text-white" : "text-gray-500"
                    )}>
                        AI
                    </span>
                </motion.div>
            </div>
        </div>
    );
}
