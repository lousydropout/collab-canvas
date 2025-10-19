/**
 * Game Configuration Service
 * 
 * This service provides game configuration management with viewport-relative sizing.
 * Calculates game element dimensions and positions based on viewport dimensions
 * for responsive gameplay across different screen sizes.
 * 
 * Features:
 * - Viewport-relative sizing calculations
 * - Game element configuration (paddle, ball, controls)
 * - Responsive positioning and movement speeds
 * - Physics property configuration
 * - Dynamic configuration updates based on viewport changes
 * - Type-safe configuration with validation
 */

import { GameConfig, ViewportDimensions, PaddleConfig, BallConfig, GameControls } from '@/types/game'

export class GameConfigService {
  private viewport: ViewportDimensions

  constructor(viewport: ViewportDimensions) {
    this.viewport = viewport
  }

  /**
   * Update viewport dimensions
   */
  updateViewport(viewport: ViewportDimensions): void {
    this.viewport = viewport
  }

  /**
   * Get current viewport dimensions
   */
  getViewport(): ViewportDimensions {
    return { ...this.viewport }
  }

  /**
   * Calculate paddle configuration based on viewport
   */
  getPaddleConfig(): PaddleConfig {
    const paddleWidth = this.viewport.width * 0.08 // 8% of viewport width
    const paddleHeight = this.viewport.height * 0.02 // 2% of viewport height
    const paddleY = this.viewport.height * 0.95 // 5% above bottom edge
    const movementSpeed = this.viewport.width * 0.005 // 0.5% viewport width per frame

    return {
      width: paddleWidth,
      height: paddleHeight,
      position: {
        x: this.viewport.width / 2 - paddleWidth / 2, // Center horizontally
        y: paddleY
      },
      movementSpeed,
      restitution: 0.8,
      friction: 0.1,
      density: 0.001
    }
  }

  /**
   * Calculate ball configuration based on viewport
   */
  getBallConfig(): BallConfig {
    const ballRadius = Math.min(this.viewport.width, this.viewport.height) * 0.01 // 1% of smaller dimension
    const paddleConfig = this.getPaddleConfig()
    const ballY = paddleConfig.position.y - (this.viewport.height * 0.03) // 3% viewport height above paddle
    const initialSpeed = this.viewport.width * 0.004 // 0.4% viewport width per frame

    return {
      radius: ballRadius,
      position: {
        x: this.viewport.width / 2, // Center horizontally
        y: ballY
      },
      initialSpeed,
      restitution: 1.0,
      friction: 0,
      frictionAir: 0.01,
      density: 0.001
    }
  }

  /**
   * Get game controls configuration
   */
  getControlsConfig(): GameControls {
    return {
      leftKey: 'ArrowLeft',
      rightKey: 'ArrowRight',
      pauseKey: ' ',
      restartKey: 'r'
    }
  }

  /**
   * Get complete game configuration
   */
  getGameConfig(): GameConfig {
    return {
      paddle: this.getPaddleConfig(),
      ball: this.getBallConfig(),
      controls: this.getControlsConfig(),
      viewport: this.getViewport()
    }
  }

  /**
   * Calculate viewport bounds for collision detection
   */
  getViewportBounds() {
    return {
      left: 0,
      right: this.viewport.width,
      top: 0,
      bottom: this.viewport.height
    }
  }

  /**
   * Check if a position is within viewport bounds
   */
  isWithinBounds(position: { x: number; y: number }, radius: number = 0): boolean {
    const bounds = this.getViewportBounds()
    return (
      position.x - radius >= bounds.left &&
      position.x + radius <= bounds.right &&
      position.y - radius >= bounds.top &&
      position.y + radius <= bounds.bottom
    )
  }

  /**
   * Clamp position to viewport bounds
   */
  clampToBounds(position: { x: number; y: number }, radius: number = 0): { x: number; y: number } {
    const bounds = this.getViewportBounds()
    return {
      x: Math.max(bounds.left + radius, Math.min(bounds.right - radius, position.x)),
      y: Math.max(bounds.top + radius, Math.min(bounds.bottom - radius, position.y))
    }
  }

  /**
   * Calculate percentage of viewport for a given value
   */
  getViewportPercentage(value: number, dimension: 'width' | 'height'): number {
    return (value / this.viewport[dimension]) * 100
  }

  /**
   * Calculate absolute value from viewport percentage
   */
  getAbsoluteFromPercentage(percentage: number, dimension: 'width' | 'height'): number {
    return (percentage / 100) * this.viewport[dimension]
  }

  /**
   * Validate game configuration
   */
  validateConfig(): { isValid: boolean; errors: string[] } {
    const errors: string[] = []
    
    if (this.viewport.width <= 0) {
      errors.push('Viewport width must be greater than 0')
    }
    
    if (this.viewport.height <= 0) {
      errors.push('Viewport height must be greater than 0')
    }

    const paddleConfig = this.getPaddleConfig()
    if (paddleConfig.width <= 0 || paddleConfig.height <= 0) {
      errors.push('Paddle dimensions must be greater than 0')
    }

    const ballConfig = this.getBallConfig()
    if (ballConfig.radius <= 0) {
      errors.push('Ball radius must be greater than 0')
    }

    return {
      isValid: errors.length === 0,
      errors
    }
  }
}
