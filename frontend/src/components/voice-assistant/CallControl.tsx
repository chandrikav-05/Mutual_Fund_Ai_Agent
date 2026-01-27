/**
 * Call Control Component - Modern SaaS-style Start/End call button
 */

import { Phone, PhoneOff } from 'lucide-react';
import { motion } from 'motion/react';
import { cn } from '@/lib/utils';

interface CallControlProps {
    isActive: boolean;
    onClick: () => void;
}

export function CallControl({ isActive, onClick }: CallControlProps) {
    return (
        <section className="flex justify-center pt-4">
            <motion.button
                onClick={onClick}
                className={cn(
                    "flex items-center justify-center gap-3 py-4 px-8 rounded-full text-base font-semibold transition-all duration-300",
                    isActive
                        ? "bg-red-500 text-white shadow-lg shadow-red-200 hover:bg-red-600"
                        : "bg-blue-600 text-white shadow-lg shadow-blue-200 hover:bg-blue-700"
                )}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
            >
                {isActive ? (
                    <>
                        <PhoneOff className="w-5 h-5" />
                        <span>End Call</span>
                    </>
                ) : (
                    <>
                        <Phone className="w-5 h-5" />
                        <span>Start Conversation</span>
                    </>
                )}
            </motion.button>
        </section>
    );
}
