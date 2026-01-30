

import { ArrowLeft, MoreVertical, Check, Phone, Video, Smile, Paperclip, Mic, Camera } from 'lucide-react';
import { motion } from 'motion/react';

interface WhatsAppNotificationProps {
    onConfirm: () => void;
}

export function WhatsAppNotification({ onConfirm }: WhatsAppNotificationProps) {
    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col h-full bg-[#0b141a] text-[#E9EDEF] font-sans overflow-hidden"
        >
            {/* Header */}
            <div className="flex items-center justify-between px-2 py-2 bg-[#202c33] border-b border-[#202c33] shrink-0">
                <div className="flex items-center gap-2">
                    <ArrowLeft size={24} className="text-[#aebac1]" />
                    <div className="flex items-center gap-2">
                        <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-green-500 to-emerald-600 flex items-center justify-center">
                            <span className="text-white font-bold text-sm">MF</span>
                        </div>
                        <div className="flex flex-col">
                            <div className="flex items-center gap-1">
                                <span className="font-semibold text-base leading-tight">Mutual Fund Bot</span>
                                <div className="bg-[#25D366] rounded-full p-0.5" title="Verified">
                                    <Check size={8} strokeWidth={4} className="text-black" />
                                </div>
                            </div>
                            <span className="text-xs text-[#8696a0] text-left">Business Account</span>
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-4 text-[#aebac1] pr-1">
                    <Video size={22} />
                    <Phone size={20} />
                    <MoreVertical size={20} />
                </div>
            </div>

            {/* Chat Area */}
            <div
                className="flex-1 overflow-y-auto px-4 py-2 flex flex-col gap-3 relative"
                style={{
                    backgroundImage: 'url("https://user-images.githubusercontent.com/15075759/28719144-86dc0f70-73b1-11e7-911d-60d70fcded21.png")',
                    backgroundRepeat: 'repeat',
                    backgroundSize: '400px',
                    backgroundColor: '#0b141a'
                }}
            >
                {/* Overlay to darken background pattern */}
                <div className="absolute inset-0 bg-[#0b141a]/90 pointer-events-none" />

                {/* Date */}
                <div className="relative flex justify-center my-2 z-10">
                    <span className="bg-[#202c33] text-[#8696a0] text-xs px-3 py-1.5 rounded-lg shadow-sm font-medium">
                        Today
                    </span>
                </div>

                {/* Encryption Notice */}
                <div className="relative flex justify-center mb-2 z-10">
                    <div className="bg-[#202c33] text-[#FFD279] text-[10px] px-3 py-2 rounded-lg text-center max-w-[85%] leading-relaxed shadow-sm">
                        This business uses a secure service from Meta to manage this chat. Tap to learn more.
                    </div>
                </div>

                {/* Message Bubble */}
                <div className="relative self-start max-w-[85%] z-10">
                    <div className="bg-[#202c33] rounded-lg rounded-tl-none p-3 shadow-sm relative group">
                        {/* Triangle for bubble */}
                        <div className="absolute top-0 -left-[8px] width-0 height-0 border-t-[10px] border-t-[#202c33] border-l-[10px] border-l-transparent" />

                        <div className="text-[14.5px] leading-relaxed text-[#E9EDEF] whitespace-pre-wrap text-left">
                            <p className="font-bold text-[#E9EDEF] mb-2">Hello Chandrika,</p>
                            <p className="mb-3">Thank you for trusting Fund with your investments.</p>
                            <p className="mb-3">Please find your payment link below to initiate the SIP in and</p>
                            <p className="mb-3">Please complete your payment and do not forget to register your biller in netbanking</p>
                            <p>Best regards,</p>
                        </div>

                        <div className="flex justify-end items-center gap-1 mt-1">
                            <span className="text-[11px] text-[#8696a0]">10:41 AM</span>
                        </div>
                    </div>
                </div>

                {/* Action Button - Simulated Link Preview/Action */}
                <div className="relative w-full max-w-[85%] z-10 mt-2">
                    <button
                        onClick={onConfirm}
                        className="w-full bg-[#00a884] hover:bg-[#008f6f] active:bg-[#007f63] text-black font-semibold py-3 px-4 rounded-lg flex items-center justify-center gap-2 transition-colors shadow-sm text-sm"
                    >
                        <span className="text-white">↗</span>
                        <span className="text-white">Read and Confirm</span>
                    </button>
                </div>
            </div>

            {/* Input Area (Fake) */}
            <div className="bg-[#202c33] px-2 py-2 flex items-center gap-2 shrink-0 z-20">
                <Smile size={24} className="text-[#8696a0] ml-1" />
                <Paperclip size={22} className="text-[#8696a0]" />
                <div className="flex-1 bg-[#2a3942] rounded-lg h-9 flex items-center px-4">
                    <span className="text-[#8696a0] text-sm">Message</span>
                </div>
                <Camera size={22} className="text-[#8696a0]" />
                <div className="w-10 h-10 bg-[#00a884] rounded-full flex items-center justify-center ml-1">
                    <Mic size={20} className="text-white" />
                </div>
            </div>
        </motion.div>
    );
}
