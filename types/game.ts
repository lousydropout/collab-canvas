/**
 * Game Types and Interfaces
 * 
 * This module defines all TypeScript interfaces and types for the Pong game implementation.
 * Includes game state management, real-time events, and component-specific types.
 * 
 * Features:
 * - Game state management interfaces
 * - Real-time event type definitions
 * - Component-specific type definitions
 * - Game session and persistence types
 * - Viewport-relative sizing utilities
 */

export interface GameState {
  isActive: boolean
  isPaused: boolean
  score: number
  lives: number
  level: number
  startTime: number | null
  endTime: number | null
  winner: 'player' | 'obstacles' | null
}

export interface GameSession {
  id: string
  canvasId: string
  userId: string
  gameState: GameState
  createdAt: string
  updatedAt: string
  completedAt: string | null
}

export interface GameRealtimeEvents {
  game_started: {
    sessionId: string
    canvasId: string
    userId: string
    timestamp: number
  }
  game_ended: {
    sessionId: string
    canvasId: string
    userId: string
    winner: 'player' | 'obstacles'
    score: number
    duration: number
    timestamp: number
  }
  ball_moved: {
    sessionId: string
    ballId: string
    position: { x: number; y: number }
    velocity: { x: number; y: number }
    timestamp: number
  }
  paddle_moved: {
    sessionId: string
    paddleId: string
    position: { x: number; y: number }
    timestamp: number
  }
  collision_detected: {
    sessionId: string
    ballId: string
    collidedWith: string
    collisionType: 'paddle' | 'obstacle' | 'viewport_edge'
    position: { x: number; y: number }
    timestamp: number
  }
}

export interface ViewportDimensions {
  width: number
  height: number
}

export interface GameElementPosition {
  x: number
  y: number
}

export interface GameElementSize {
  width: number
  height: number
}

export interface PaddleConfig {
  width: number // 8% of viewport width
  height: number // 2% of viewport height
  position: GameElementPosition // 5% above bottom edge
  movementSpeed: number // 0.5% viewport width per frame
  restitution: number // 0.8
  friction: number // 0.1
  density: number // 0.001
  viewport?: ViewportDimensions // Optional viewport for bounds checking
  controls?: GameControls // Optional controls configuration
}

export interface BallConfig {
  radius: number // 1% of viewport radius
  position: GameElementPosition // 3% viewport height above paddle
  initialSpeed: number // 0.4% viewport width per frame
  restitution: number // 1.0
  friction: number // 0
  frictionAir: number // 0.01
  density: number // 0.001
  viewport?: ViewportDimensions // Optional viewport for bounds checking
}

export interface GameControls {
  leftKey: string
  rightKey: string
  pauseKey: string
  restartKey: string
}

export interface GameConfig {
  paddle: PaddleConfig
  ball: BallConfig
  controls: GameControls
  viewport: ViewportDimensions
}

export type GameMode = 'canvas' | 'game'

export type GameEventType = keyof GameRealtimeEvents

export interface GameEvent<T extends GameEventType = GameEventType> {
  type: T
  data: GameRealtimeEvents[T]
  timestamp: number
}
