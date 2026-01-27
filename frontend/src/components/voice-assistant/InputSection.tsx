/**
 * Input Section Component - Modern SaaS-style input with mic and send buttons
 */

import { Mic, Send } from 'lucide-react';
import { motion } from 'motion/react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

interface InputSectionProps {
    isActive: boolean;
    isListening: boolean;
    value: string;
    onChange: (value: string) => void;
    onSend: () => void;
    onMicDown: () => void;
    onMicUp: () => void;
}

export function InputSection({
    isActive,
    isListening,
    value,
    onChange,
    onSend,
    onMicDown,
    onMicUp,
}: InputSectionProps) {
    if (!isActive) return null;

    const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter' && value.trim()) {
            e.preventDefault();
            onSend();
        }
    };

    return (
        <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="w-full"
        >
            <div className="flex gap-3 p-3 bg-white border-2 border-gray-200 rounded-2xl shadow-lg hover:border-blue-300 transition-colors">
                <Input
                    type="text"
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    onKeyUp={handleKeyPress}
                    placeholder="Type your message..."
                    className="flex-1 border-none bg-transparent text-base focus-visible:ring-0 focus-visible:ring-offset-0 placeholder:text-gray-400"
                    autoComplete="off"
                />

                {/* Mic Button */}
                <motion.button
                    className={cn(
                        "w-12 h-12 rounded-xl flex items-center justify-center transition-all duration-200",
                        isListening
                            ? "bg-green-500 text-white shadow-lg shadow-green-200"
                            : "bg-gray-100 text-gray-700 hover:bg-blue-50 hover:text-blue-600"
                    )}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onMouseDown={onMicDown}
                    onMouseUp={onMicUp}
                    onMouseLeave={onMicUp}
                    title="Hold to speak"
                >
                    <Mic className="w-5 h-5" />
                </motion.button>

                {/* Send Button */}
                <motion.button
                    className="w-12 h-12 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-lg shadow-blue-200 hover:bg-blue-700 transition-colors"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={onSend}
                    title="Send"
                >
                    <Send className="w-5 h-5" />
                </motion.button>
            </div>
        </motion.section>
    );
}
