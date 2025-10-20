export interface CanvasSize {
	width: number;
	height: number;
}

export interface Position {
	x: number;
	y: number;
}

/**
 * Parse a coordinate value that can be:
 * - Absolute number: "100" -> 100
 * - Percentage: "50%" -> 50% of viewport size
 * - Natural language: "center" -> 50% of viewport size
 */
export function parseCoordinate(
	value: string | number,
	viewportSize: number,
): number {
	// If it's already a number, return it
	if (typeof value === "number") {
		return value;
	}

	const str = value.toString().toLowerCase().trim();

	// Handle percentages
	if (str.endsWith("%")) {
		const percentage = parseFloat(str.slice(0, -1));
		if (isNaN(percentage)) {
			throw new Error(`Invalid percentage: ${value}`);
		}
		return (percentage / 100) * viewportSize;
	}

	// Handle natural language keywords
	const naturalLanguageMap: Record<string, number> = {
		left: 0,
		right: viewportSize,
		center: viewportSize / 2,
		middle: viewportSize / 2,
		top: 0,
		bottom: viewportSize,
	};

	if (naturalLanguageMap[str] !== undefined) {
		return naturalLanguageMap[str];
	}

	// Handle absolute numbers
	const num = parseFloat(str);
	if (isNaN(num)) {
		throw new Error(`Invalid coordinate: ${value}`);
	}

	return num;
}

/**
 * Validate that coordinates are within canvas bounds
 */
export function validateBounds(
	position: Position,
	canvasSize: CanvasSize,
): Position {
	return {
		x: Math.max(0, Math.min(position.x, canvasSize.width)),
		y: Math.max(0, Math.min(position.y, canvasSize.height)),
	};
}
