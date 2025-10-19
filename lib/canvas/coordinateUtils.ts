/**
 * Coordinate and Value Parsing Utilities
 * 
 * This module provides comprehensive parsing utilities for coordinates, positions,
 * sizes, colors, and directions. Supports natural language, percentages, and
 * absolute values for flexible user input.
 * 
 * Features:
 * - Coordinate parsing (absolute, percentage, natural language)
 * - Position parsing with complex positioning (top-left, center, etc.)
 * - Size parsing with natural language sizes (small, medium, large)
 * - Color parsing (hex, named colors, RGB)
 * - Direction parsing for movement operations
 * - Bounds validation and constraint handling
 * - Helper functions for available options
 */

export interface CanvasSize {
  width: number
  height: number
}

export interface Position {
  x: number
  y: number
}

/**
 * Parse a coordinate value that can be:
 * - Absolute number: "100" -> 100
 * - Percentage: "50%" -> 50% of viewport size
 * - Natural language: "center" -> 50% of viewport size
 */
export function parseCoordinate(value: string | number, viewportSize: number): number {
  // If it's already a number, return it
  if (typeof value === 'number') {
    return value
  }

  const str = value.toString().toLowerCase().trim()

  // Handle percentages
  if (str.endsWith('%')) {
    const percentage = parseFloat(str.slice(0, -1))
    if (isNaN(percentage)) {
      throw new Error(`Invalid percentage: ${value}`)
    }
    return (percentage / 100) * viewportSize
  }

  // Handle natural language keywords
  const naturalLanguageMap: Record<string, number> = {
    'left': 0,
    'right': viewportSize,
    'center': viewportSize / 2,
    'middle': viewportSize / 2,
    'top': 0,
    'bottom': viewportSize,
  }

  if (naturalLanguageMap[str] !== undefined) {
    return naturalLanguageMap[str]
  }

  // Handle absolute numbers
  const num = parseFloat(str)
  if (isNaN(num)) {
    throw new Error(`Invalid coordinate: ${value}`)
  }

  return num
}

/**
 * Parse a position string that can contain:
 * - Absolute coordinates: "100, 200"
 * - Percentages: "50%, 25%"
 * - Natural language: "center, top"
 * - Mixed: "center, 100"
 */
export function parsePosition(x: string | number, y: string | number, canvasSize: CanvasSize): Position {
  return {
    x: parseCoordinate(x, canvasSize.width),
    y: parseCoordinate(y, canvasSize.height)
  }
}

/**
 * Parse complex position strings like "top-left", "bottom-right", "center"
 * Returns the center point of the specified region
 */
export function parseComplexPosition(position: string, canvasSize: CanvasSize): Position {
  const str = position.toLowerCase().trim()
  
  const complexPositions: Record<string, Position> = {
    'center': { x: canvasSize.width / 2, y: canvasSize.height / 2 },
    'top-left': { x: canvasSize.width * 0.25, y: canvasSize.height * 0.25 },
    'top-right': { x: canvasSize.width * 0.75, y: canvasSize.height * 0.25 },
    'bottom-left': { x: canvasSize.width * 0.25, y: canvasSize.height * 0.75 },
    'bottom-right': { x: canvasSize.width * 0.75, y: canvasSize.height * 0.75 },
    'top-center': { x: canvasSize.width / 2, y: canvasSize.height * 0.25 },
    'bottom-center': { x: canvasSize.width / 2, y: canvasSize.height * 0.75 },
    'left-center': { x: canvasSize.width * 0.25, y: canvasSize.height / 2 },
    'right-center': { x: canvasSize.width * 0.75, y: canvasSize.height / 2 },
  }

  if (complexPositions[str]) {
    return complexPositions[str]
  }

  throw new Error(`Unknown position: ${position}. Valid positions: ${Object.keys(complexPositions).join(', ')}`)
}

/**
 * Parse size values that can be:
 * - Absolute numbers: "200" -> 200
 * - Percentages: "50%" -> 50% of canvas dimension
 * - Natural language: "small", "medium", "large"
 */
export function parseSize(value: string | number, canvasDimension: number): number {
  if (typeof value === 'number') {
    return value
  }

  const str = value.toString().toLowerCase().trim()

  // Handle percentages
  if (str.endsWith('%')) {
    const percentage = parseFloat(str.slice(0, -1))
    if (isNaN(percentage)) {
      throw new Error(`Invalid percentage: ${value}`)
    }
    return (percentage / 100) * canvasDimension
  }

  // Handle natural language sizes
  const sizeMap: Record<string, number> = {
    'tiny': canvasDimension * 0.05,
    'small': canvasDimension * 0.1,
    'medium': canvasDimension * 0.2,
    'large': canvasDimension * 0.3,
    'huge': canvasDimension * 0.5,
  }

  if (sizeMap[str] !== undefined) {
    return sizeMap[str]
  }

  // Handle absolute numbers
  const num = parseFloat(str)
  if (isNaN(num)) {
    throw new Error(`Invalid size: ${value}`)
  }

  return num
}

/**
 * Parse color values that can be:
 * - Hex colors: "#ff0000", "ff0000"
 * - Named colors: "red", "blue", "green"
 * - RGB: "rgb(255, 0, 0)"
 */
export function parseColor(value: string): string {
  const str = value.toLowerCase().trim()

  // Handle hex colors
  if (str.startsWith('#') || /^[0-9a-f]{6}$/i.test(str)) {
    const hex = str.startsWith('#') ? str : `#${str}`
    if (/^#[0-9a-f]{6}$/i.test(hex)) {
      return hex
    }
  }

  // Handle named colors
  const namedColors: Record<string, string> = {
    'red': '#ff0000',
    'green': '#00ff00',
    'blue': '#0000ff',
    'yellow': '#ffff00',
    'orange': '#ffa500',
    'purple': '#800080',
    'pink': '#ffc0cb',
    'cyan': '#00ffff',
    'magenta': '#ff00ff',
    'lime': '#00ff00',
    'navy': '#000080',
    'teal': '#008080',
    'olive': '#808000',
    'maroon': '#800000',
    'gray': '#808080',
    'grey': '#808080',
    'black': '#000000',
    'white': '#ffffff',
    'brown': '#a52a2a',
    'tan': '#d2b48c',
    'beige': '#f5f5dc',
    'silver': '#c0c0c0',
    'gold': '#ffd700',
  }

  if (namedColors[str]) {
    return namedColors[str]
  }

  // Handle RGB format
  const rgbMatch = str.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/)
  if (rgbMatch) {
    const r = parseInt(rgbMatch[1])
    const g = parseInt(rgbMatch[2])
    const b = parseInt(rgbMatch[3])
    
    if (r >= 0 && r <= 255 && g >= 0 && g <= 255 && b >= 0 && b <= 255) {
      return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`
    }
  }

  throw new Error(`Invalid color: ${value}. Use hex (#ff0000), named colors (red), or RGB (rgb(255,0,0))`)
}

/**
 * Parse direction strings for movement operations
 * Returns delta x and y values
 */
export function parseDirection(direction: string, distance: number = 50): Position {
  const dir = direction.toLowerCase().trim()
  
  const directions: Record<string, Position> = {
    'up': { x: 0, y: -distance },
    'down': { x: 0, y: distance },
    'left': { x: -distance, y: 0 },
    'right': { x: distance, y: 0 },
    'up-left': { x: -distance, y: -distance },
    'up-right': { x: distance, y: -distance },
    'down-left': { x: -distance, y: distance },
    'down-right': { x: distance, y: distance },
    'north': { x: 0, y: -distance },
    'south': { x: 0, y: distance },
    'east': { x: distance, y: 0 },
    'west': { x: -distance, y: 0 },
    'northeast': { x: distance, y: -distance },
    'northwest': { x: -distance, y: -distance },
    'southeast': { x: distance, y: distance },
    'southwest': { x: -distance, y: distance },
  }

  if (directions[dir]) {
    return directions[dir]
  }

  throw new Error(`Unknown direction: ${direction}. Valid directions: ${Object.keys(directions).join(', ')}`)
}

/**
 * Validate that coordinates are within canvas bounds
 */
export function validateBounds(position: Position, canvasSize: CanvasSize): Position {
  return {
    x: Math.max(0, Math.min(position.x, canvasSize.width)),
    y: Math.max(0, Math.min(position.y, canvasSize.height))
  }
}

/**
 * Get all available position keywords for help/validation
 */
export function getAvailablePositions(): string[] {
  return [
    'center', 'top-left', 'top-right', 'bottom-left', 'bottom-right',
    'top-center', 'bottom-center', 'left-center', 'right-center'
  ]
}

/**
 * Get all available size keywords for help/validation
 */
export function getAvailableSizes(): string[] {
  return ['tiny', 'small', 'medium', 'large', 'huge']
}

/**
 * Get all available color keywords for help/validation
 */
export function getAvailableColors(): string[] {
  return [
    'red', 'green', 'blue', 'yellow', 'orange', 'purple', 'pink',
    'cyan', 'magenta', 'lime', 'navy', 'teal', 'olive', 'maroon',
    'gray', 'grey', 'black', 'white', 'brown', 'tan', 'beige',
    'silver', 'gold'
  ]
}

/**
 * Get all available direction keywords for help/validation
 */
export function getAvailableDirections(): string[] {
  return [
    'up', 'down', 'left', 'right', 'up-left', 'up-right',
    'down-left', 'down-right', 'north', 'south', 'east', 'west',
    'northeast', 'northwest', 'southeast', 'southwest'
  ]
}
