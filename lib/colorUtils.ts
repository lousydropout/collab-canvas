/**
 * Utility functions for color management
 */

const COLOR_STORAGE_KEY = 'collab-canvas-color'

/**
 * Generate a random vibrant color using HSL
 * Uses random hue with 70% saturation and 50% lightness for vibrant colors
 */
export function generateRandomColor(): string {
  const hue = Math.floor(Math.random() * 360)
  const saturation = 70
  const lightness = 50
  
  // Convert HSL to hex
  return hslToHex(hue, saturation, lightness)
}

/**
 * Convert HSL to hex color
 */
function hslToHex(h: number, s: number, l: number): string {
  const sNorm = s / 100
  const lNorm = l / 100
  
  const c = (1 - Math.abs(2 * lNorm - 1)) * sNorm
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1))
  const m = lNorm - c / 2
  
  let r = 0, g = 0, b = 0
  
  if (0 <= h && h < 60) {
    r = c; g = x; b = 0
  } else if (60 <= h && h < 120) {
    r = x; g = c; b = 0
  } else if (120 <= h && h < 180) {
    r = 0; g = c; b = x
  } else if (180 <= h && h < 240) {
    r = 0; g = x; b = c
  } else if (240 <= h && h < 300) {
    r = x; g = 0; b = c
  } else if (300 <= h && h < 360) {
    r = c; g = 0; b = x
  }
  
  const rHex = Math.round((r + m) * 255).toString(16).padStart(2, '0')
  const gHex = Math.round((g + m) * 255).toString(16).padStart(2, '0')
  const bHex = Math.round((b + m) * 255).toString(16).padStart(2, '0')
  
  return `#${rHex}${gHex}${bHex}`
}

/**
 * Save color to localStorage
 */
export function saveColorToLocalStorage(color: string): void {
  try {
    if (typeof window !== 'undefined') {
      localStorage.setItem(COLOR_STORAGE_KEY, color)
    }
  } catch (error) {
    console.error('Failed to save color to localStorage:', error)
  }
}

/**
 * Load color from localStorage or generate a random one if not found
 */
export function loadColorFromLocalStorage(): string {
  try {
    if (typeof window !== 'undefined') {
      const savedColor = localStorage.getItem(COLOR_STORAGE_KEY)
      if (savedColor) {
        return savedColor
      }
    }
  } catch (error) {
    console.error('Failed to load color from localStorage:', error)
  }
  
  // Generate and save a random color if none exists
  const randomColor = generateRandomColor()
  saveColorToLocalStorage(randomColor)
  return randomColor
}

