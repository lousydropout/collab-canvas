"use client";

import { Line } from "react-konva";

interface GridProps {
	width: number;
	height: number;
	gridSize?: number;
	stroke?: string;
	strokeWidth?: number;
	stageX?: number;
	stageY?: number;
	stageScale?: number;
}

export default function Grid({
	width,
	height,
	gridSize = 20,
	stroke = "#e5e7eb",
	strokeWidth = 0.5,
	stageX = 0,
	stageY = 0,
	stageScale = 1,
}: GridProps) {
	const lines = [];

	// Calculate the visible canvas area in world coordinates
	const visibleLeft = -stageX / stageScale;
	const visibleTop = -stageY / stageScale;
	const visibleRight = visibleLeft + width / stageScale;
	const visibleBottom = visibleTop + height / stageScale;

	// Add some margin to ensure grid extends beyond visible area
	const margin = Math.max(width, height) / stageScale;
	const startX = Math.floor((visibleLeft - margin) / gridSize) * gridSize;
	const endX = Math.ceil((visibleRight + margin) / gridSize) * gridSize;
	const startY = Math.floor((visibleTop - margin) / gridSize) * gridSize;
	const endY = Math.ceil((visibleBottom + margin) / gridSize) * gridSize;

	// Vertical lines
	for (let x = startX; x <= endX; x += gridSize) {
		lines.push(
			<Line
				key={`v-${x}`}
				points={[x, startY, x, endY]}
				stroke={stroke}
				strokeWidth={strokeWidth}
				listening={false}
			/>,
		);
	}

	// Horizontal lines
	for (let y = startY; y <= endY; y += gridSize) {
		lines.push(
			<Line
				key={`h-${y}`}
				points={[startX, y, endX, y]}
				stroke={stroke}
				strokeWidth={strokeWidth}
				listening={false}
			/>,
		);
	}

	return <>{lines}</>;
}
