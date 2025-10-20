/**
 * AI Toggle Button Component
 *
 * Floating button to open/close the AI chat interface.
 * Positioned in bottom-right corner with AI icon and notification badge.
 *
 * Features:
 * - Fixed positioning (bottom-right)
 * - Robot/AI icon with hover effects
 * - Badge showing unread AI messages (future enhancement)
 * - Smooth animations and transitions
 * - Accessibility support
 */

"use client";

import { Bot, MessageCircle } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";

interface AIToggleButtonProps {
	/** Whether AI chat is currently visible */
	isVisible: boolean;
	/** Callback when AI chat visibility should change */
	onToggle: () => void;
	/** Number of unread messages (future enhancement) */
	unreadCount?: number;
	/** Whether AI is ready/connected */
	isReady?: boolean;
}

export default function AIToggleButton({
	isVisible,
	onToggle,
	unreadCount = 0,
	isReady = true,
}: AIToggleButtonProps) {
	const [isHovered, setIsHovered] = useState(false);

	return (
		<div className="fixed bottom-4 right-4 z-40">
			<Button
				onClick={onToggle}
				onMouseEnter={() => setIsHovered(true)}
				onMouseLeave={() => setIsHovered(false)}
				className={`
          h-14 w-14 rounded-full shadow-lg transition-all duration-200
          ${
						isVisible
							? "bg-blue-600 hover:bg-blue-700 text-white"
							: "bg-white hover:bg-gray-50 text-gray-700 border border-gray-200"
					}
          ${!isReady ? "opacity-50 cursor-not-allowed" : "hover:scale-105"}
        `}
				disabled={!isReady}
				title={isVisible ? "Close AI Assistant" : "Open AI Assistant"}
			>
				<div className="relative">
					{isVisible ? (
						<MessageCircle className="h-6 w-6" />
					) : (
						<Bot
							className={`h-6 w-6 transition-transform duration-200 ${isHovered ? "scale-110" : ""}`}
						/>
					)}

					{/* Unread message badge */}
					{unreadCount > 0 && !isVisible && (
						<div className="absolute -top-1 -right-1 h-5 w-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-semibold">
							{unreadCount > 9 ? "9+" : unreadCount}
						</div>
					)}

					{/* Ready indicator */}
					{isReady && (
						<div className="absolute -bottom-1 -right-1 h-3 w-3 bg-green-500 rounded-full border-2 border-white" />
					)}
				</div>
			</Button>

			{/* Tooltip */}
			<div
				className={`
        absolute bottom-16 right-0 bg-gray-900 text-white text-sm px-3 py-2 rounded-lg
        transition-opacity duration-200 pointer-events-none
        ${isHovered ? "opacity-100" : "opacity-0"}
      `}
			>
				{isVisible ? "Close AI Assistant" : "Open AI Assistant"}
				<div className="absolute top-full right-4 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900" />
			</div>
		</div>
	);
}

/**
 * Usage Example:
 *
 * ```tsx
 * <AIToggleButton
 *   isVisible={showAIChat}
 *   onToggle={() => setShowAIChat(!showAIChat)}
 *   unreadCount={unreadMessages}
 *   isReady={aiReady}
 * />
 * ```
 */
