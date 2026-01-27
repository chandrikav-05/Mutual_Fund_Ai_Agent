/**
 * Header Component - Modern SaaS-style header with badge
 */

import { Sparkles } from 'lucide-react';

export function Header() {
    return (
        <header className="text-center mb-12">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 bg-blue-50 border border-blue-100 rounded-full px-4 py-2 mb-6">
                <Sparkles className="w-4 h-4 text-blue-600" />
                <span className="text-sm font-medium text-blue-700">AI Voice Assistant</span>
            </div>

            {/* Title */}
            <h1 className="text-5xl lg:text-6xl font-bold text-gray-900 mb-4">
                Welcome to
                <span className="text-blue-600"> Mutual Fund Services</span>
            </h1>

            {/* Subtitle */}
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
                Experience seamless investment assistance with our AI-powered voice agent, available 24/7 to help with SIPs, NAV, portfolio queries, and more.
            </p>
        </header>
    );
}
