/**
 * Simplified AI Chat Component
 *
 * Simple input field with status display for AI-powered object creation.
 * Shows detected object type and creation status.
 *
 * Features:
 * - Simple input field
 * - Status message display
 * - Error handling
 * - Responsive design with TailwindCSS
 */

"use client";

import { Bot, Loader2, Send, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
	type AIResponse,
	CanvasAI,
	type CanvasStateUpdater,
} from "@/lib/ai/CanvasAI";
import type { CanvasOperations } from "@/lib/canvas/CanvasOperations";
import type { CanvasSize } from "@/lib/canvas/coordinateUtils";

interface AIChatProps {
	/** Canvas operations service instance */
	operations: CanvasOperations;
	/** Current canvas dimensions */
	canvasSize: CanvasSize;
	/** Whether chat is visible */
	isVisible: boolean;
	/** Callback when chat visibility changes */
	onVisibilityChange: (visible: boolean) => void;
	/** Optional state updater for local state management */
	stateUpdater?: CanvasStateUpdater;
	/** Current color for object creation */
	currentColor?: string;
	/** Viewport information for positioning */
	viewportInfo?: { scale: number; position: { x: number; y: number } };
	/** Currently selected objects */
	selectedObjects?: string[];
}

export default function AIChat({
	operations,
	canvasSize,
	isVisible,
	onVisibilityChange,
	stateUpdater,
	currentColor,
	viewportInfo,
	selectedObjects = [],
}: AIChatProps) {
	const inputRef = useRef<HTMLInputElement>(null);
	const [inputValue, setInputValue] = useState("");
	const [isLoading, setIsLoading] = useState(false);
	const [statusMessage, setStatusMessage] = useState("");
	const [statusType, setStatusType] = useState<"success" | "error" | "info">(
		"info",
	);

	// Initialize AI service
	const [ai] = useState(
		() =>
			new CanvasAI(
				operations,
				canvasSize,
				stateUpdater,
				currentColor,
				viewportInfo,
			),
	);

	// Focus input when chat becomes visible
	useEffect(() => {
		if (isVisible) {
			inputRef.current?.focus();
		}
	}, [isVisible]);

	// Update AI service when canvas size changes
	useEffect(() => {
		ai.updateCanvasSize(canvasSize);
	}, [ai, canvasSize]);

	// Update AI service when current color changes
	useEffect(() => {
		if (currentColor) {
			ai.updateCurrentColor(currentColor);
		}
	}, [ai, currentColor]);

	// Update AI service when viewport info changes
	useEffect(() => {
		if (viewportInfo) {
			ai.updateViewportInfo(viewportInfo);
		}
	}, [ai, viewportInfo]);

	/**
	 * Handle sending a message to the AI
	 */
	const handleSendMessage = async () => {
		if (!inputValue.trim() || isLoading) return;

		setIsLoading(true);
		setStatusMessage("");
		setStatusType("info");

		try {
			const response: AIResponse = await ai.processMessage(
				inputValue.trim(),
				selectedObjects,
			);

			if (response.success) {
				setStatusMessage(response.message);
				setStatusType(
					response.commandData?.command === "create" ? "success" : "info",
				);
			} else {
				setStatusMessage(response.error || "An error occurred");
				setStatusType("error");
			}
		} catch (err) {
			console.error("❌ AI chat error:", err);
			setStatusMessage(
				err instanceof Error ? err.message : "An error occurred",
			);
			setStatusType("error");
		} finally {
			setIsLoading(false);
			setInputValue("");
		}
	};

	/**
	 * Handle Enter key press in input
	 */
	const handleKeyPress = (e: React.KeyboardEvent) => {
		if (e.key === "Enter" && !e.shiftKey) {
			e.preventDefault();
			handleSendMessage();
		}
	};

	/**
	 * Close the chat
	 */
	const handleClose = () => {
		onVisibilityChange(false);
	};

	if (!isVisible) return null;

	return (
		<div className="fixed bottom-4 right-4 z-50 w-80 max-w-[calc(100vw-2rem)]">
			<div className="bg-white shadow-lg border border-gray-200 overflow-hidden">
				{/* Header */}
				<div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gray-50">
					<div className="flex items-center space-x-2">
						<Bot className="h-5 w-5 text-blue-600" />
						<h3 className="font-semibold text-gray-900">AI Assistant</h3>
						{!ai.isReady() && (
							<div
								className="h-2 w-2 bg-red-500 rounded-full"
								title="AI not ready"
							/>
						)}
					</div>
					<Button
						variant="ghost"
						size="sm"
						onClick={handleClose}
						className="h-8 w-8 p-0"
					>
						<X className="h-4 w-4" />
					</Button>
				</div>

				{/* Status Message */}
				{statusMessage && (
					<div
						className={`px-4 py-3 border-b border-gray-200 ${
							statusType === "success"
								? "bg-green-50 text-green-800"
								: statusType === "error"
									? "bg-red-50 text-red-800"
									: "bg-blue-50 text-blue-800"
						}`}
					>
						<div className="flex items-center space-x-2">
							{isLoading ? (
								<Loader2 className="h-4 w-4 animate-spin" />
							) : (
								<Bot className="h-4 w-4" />
							)}
							<p className="text-sm">{statusMessage}</p>
						</div>
					</div>
				)}

				{/* Input */}
				<div className="p-4 bg-gray-50">
					<div className="flex space-x-2">
						<Input
							ref={inputRef}
							value={inputValue}
							onChange={(e) => setInputValue(e.target.value)}
							onKeyPress={handleKeyPress}
							placeholder="Try: 'create a rectangle' or 'add an ellipse'"
							disabled={isLoading || !ai.isReady()}
							className="flex-1"
						/>
						<Button
							onClick={handleSendMessage}
							disabled={!inputValue.trim() || isLoading || !ai.isReady()}
							size="sm"
							className="px-3"
						>
							{isLoading ? (
								<Loader2 className="h-4 w-4 animate-spin" />
							) : (
								<Send className="h-4 w-4" />
							)}
						</Button>
					</div>

					{/* Quick examples */}
					<div className="flex space-x-2 mt-2">
						<Button
							variant="ghost"
							size="sm"
							onClick={() => setInputValue("create a rectangle")}
							className="h-6 px-2 text-xs"
						>
							Rectangle
						</Button>
						<Button
							variant="ghost"
							size="sm"
							onClick={() => setInputValue("add an ellipse")}
							className="h-6 px-2 text-xs"
						>
							Ellipse
						</Button>
					</div>
				</div>
			</div>
		</div>
	);
}

/**
 * Usage Example:
 *
 * ```tsx
 * <AIChat
 *   operations={canvasOperations}
 *   canvasSize={{ width: 800, height: 600 }}
 *   isVisible={showAIChat}
 *   onVisibilityChange={setShowAIChat}
 * />
 * ```
 */
