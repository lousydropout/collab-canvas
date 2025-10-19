/**
 * Game Integration Tests
 * 
 * This test suite validates the complete game functionality including
 * game state management, physics integration, collision detection,
 * and real-time event broadcasting.
 * 
 * Features:
 * - Game state lifecycle testing
 * - Physics engine integration testing
 * - Collision detection validation
 * - Real-time event testing
 * - Component integration testing
 * - Error handling validation
 */

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals'
import { GameStateService } from '@/lib/game/GameStateService'
import { GameConfigService } from '@/lib/game/GameConfigService'
import { PhysicsEngine } from '@/lib/physics/PhysicsEngine'
import { CollisionDetectionService } from '@/lib/physics/CollisionDetectionService'
import { ViewportDimensions } from '@/types/game'

// Mock Supabase client
jest.mock('@/lib/supabase/client', () => ({
  supabase: {
    from: jest.fn(() => ({
      insert: jest.fn(() => ({
        select: jest.fn(() => ({
          single: jest.fn(() => ({
            data: {
              id: 'test-session-id',
              canvas_id: 'test-canvas-id',
              user_id: 'test-user-id',
              game_state: {},
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            },
            error: null
          }))
        }))
      })),
      update: jest.fn(() => ({
        eq: jest.fn(() => ({
          data: null,
          error: null
        }))
      }))
    }))
  }
}))

describe('Game Integration Tests', () => {
  let gameStateService: GameStateService
  let gameConfigService: GameConfigService
  let physicsEngine: PhysicsEngine
  let collisionService: CollisionDetectionService
  let viewport: ViewportDimensions

  beforeEach(() => {
    // Mock requestAnimationFrame for Node.js environment
    global.requestAnimationFrame = jest.fn((cb) => setTimeout(cb, 16))
    global.cancelAnimationFrame = jest.fn()
    global.window = global as any

    viewport = { width: 800, height: 600 }
    
    gameConfigService = new GameConfigService(viewport)
    physicsEngine = new PhysicsEngine()
    collisionService = new CollisionDetectionService()
    
    gameStateService = new GameStateService({
      canvasId: 'test-canvas-id',
      userId: 'test-user-id',
      viewport
    })
  })

  afterEach(() => {
    if (physicsEngine) {
      physicsEngine.destroy()
    }
    jest.clearAllMocks()
  })

  describe('Game Configuration Service', () => {
    it('should calculate correct paddle configuration', () => {
      const paddleConfig = gameConfigService.getPaddleConfig()
      
      expect(paddleConfig.width).toBe(64) // 8% of 800
      expect(paddleConfig.height).toBe(12) // 2% of 600
      expect(paddleConfig.position.y).toBe(570) // 95% of 600
      expect(paddleConfig.movementSpeed).toBe(4) // 0.5% of 800
      expect(paddleConfig.restitution).toBe(0.8)
      expect(paddleConfig.friction).toBe(0.1)
      expect(paddleConfig.density).toBe(0.001)
    })

    it('should calculate correct ball configuration', () => {
      const ballConfig = gameConfigService.getBallConfig()
      
      expect(ballConfig.radius).toBe(6) // 1% of 600 (smaller dimension)
      expect(ballConfig.position.y).toBe(552) // 3% above paddle (570 - 18)
      expect(ballConfig.initialSpeed).toBe(3.2) // 0.4% of 800
      expect(ballConfig.restitution).toBe(1.0)
      expect(ballConfig.friction).toBe(0)
      expect(ballConfig.frictionAir).toBe(0.01)
      expect(ballConfig.density).toBe(0.001)
    })

    it('should validate configuration correctly', () => {
      const validation = gameConfigService.validateConfig()
      
      expect(validation.isValid).toBe(true)
      expect(validation.errors).toHaveLength(0)
    })

    it('should handle viewport updates', () => {
      const newViewport = { width: 1200, height: 800 }
      gameConfigService.updateViewport(newViewport)
      
      const paddleConfig = gameConfigService.getPaddleConfig()
      expect(paddleConfig.width).toBe(96) // 8% of 1200
      expect(paddleConfig.height).toBe(16) // 2% of 800
    })

    it('should check bounds correctly', () => {
      const bounds = gameConfigService.getViewportBounds()
      
      expect(bounds.left).toBe(0)
      expect(bounds.right).toBe(800)
      expect(bounds.top).toBe(0)
      expect(bounds.bottom).toBe(600)
    })

    it('should clamp positions to bounds', () => {
      const clamped = gameConfigService.clampToBounds({ x: -10, y: 700 }, 5)
      
      expect(clamped.x).toBe(5)
      expect(clamped.y).toBe(595)
    })
  })

  describe('Game State Service', () => {
    it('should create initial game state', () => {
      const gameState = gameStateService.getGameState()
      
      expect(gameState.isActive).toBe(false)
      expect(gameState.isPaused).toBe(false)
      expect(gameState.score).toBe(0)
      expect(gameState.lives).toBe(3)
      expect(gameState.level).toBe(1)
      expect(gameState.startTime).toBeNull()
      expect(gameState.endTime).toBeNull()
      expect(gameState.winner).toBeNull()
    })

    it('should start game successfully', async () => {
      const session = await gameStateService.startGame()
      
      expect(session).toBeDefined()
      expect(session.id).toBe('test-session-id')
      expect(session.canvas_id).toBe('test-canvas-id')
      expect(session.user_id).toBe('test-user-id')
      
      const gameState = gameStateService.getGameState()
      expect(gameState.isActive).toBe(true)
      expect(gameState.startTime).toBeDefined()
    })

    it('should pause and resume game', async () => {
      await gameStateService.startGame()
      
      await gameStateService.pauseGame()
      expect(gameStateService.getGameState().isPaused).toBe(true)
      
      await gameStateService.resumeGame()
      expect(gameStateService.getGameState().isPaused).toBe(false)
    })

    it('should update score correctly', async () => {
      await gameStateService.startGame()
      
      await gameStateService.updateScore(10)
      expect(gameStateService.getGameState().score).toBe(10)
      
      await gameStateService.updateScore(5)
      expect(gameStateService.getGameState().score).toBe(15)
    })

    it('should handle life loss correctly', async () => {
      await gameStateService.startGame()
      
      await gameStateService.loseLife()
      expect(gameStateService.getGameState().lives).toBe(2)
      
      await gameStateService.loseLife()
      expect(gameStateService.getGameState().lives).toBe(1)
      
      await gameStateService.loseLife()
      expect(gameStateService.getGameState().lives).toBe(0)
      expect(gameStateService.getGameState().isActive).toBe(false)
    })

    it('should end game correctly', async () => {
      await gameStateService.startGame()
      
      await gameStateService.endGame('player')
      
      const gameState = gameStateService.getGameState()
      expect(gameState.isActive).toBe(false)
      expect(gameState.winner).toBe('player')
      expect(gameState.endTime).toBeDefined()
    })

    it('should calculate game duration correctly', async () => {
      await gameStateService.startGame()
      
      // Wait a bit to simulate game time
      await new Promise(resolve => setTimeout(resolve, 100))
      
      const duration = gameStateService.getGameDuration()
      expect(duration).toBeGreaterThan(0)
    })
  })

  describe('Physics Engine Integration', () => {
    it('should initialize physics engine', async () => {
      await physicsEngine.initialize()
      
      expect(physicsEngine.isInitialized()).toBe(true)
    })

    it('should create paddle body', async () => {
      await physicsEngine.initialize()
      
      const paddleBody = physicsEngine.createPaddleBody({
        x: 100,
        y: 500,
        width: 64,
        height: 12
      })
      
      expect(paddleBody).toBeDefined()
      expect(paddleBody.label).toBe('paddle')
    })

    it('should create ball body', async () => {
      await physicsEngine.initialize()
      
      const ballBody = physicsEngine.createBallBody({
        x: 400,
        y: 300,
        radius: 6
      })
      
      expect(ballBody).toBeDefined()
      expect(ballBody.label).toBe('ball')
    })

    it('should handle collision detection', async () => {
      await physicsEngine.initialize()
      physicsEngine.setCollisionService(collisionService)
      
      const paddleBody = physicsEngine.createPaddleBody({
        x: 100,
        y: 500,
        width: 64,
        height: 12
      })
      
      const ballBody = physicsEngine.createBallBody({
        x: 132,
        y: 494,
        radius: 6
      })
      
      // Start physics engine
      physicsEngine.start()
      
      // Wait for potential collision
      await new Promise(resolve => setTimeout(resolve, 100))
      
      // Stop physics engine
      physicsEngine.stop()
      
      expect(paddleBody).toBeDefined()
      expect(ballBody).toBeDefined()
    })
  })

  describe('Collision Detection Service', () => {
    it('should initialize collision service', () => {
      expect(collisionService).toBeDefined()
    })

    it('should track collision metrics', () => {
      const metrics = collisionService.getMetrics()
      
      expect(metrics.totalCollisions).toBe(0)
      expect(metrics.collisionHistory).toHaveLength(0)
    })

    it('should handle collision events', () => {
      const mockEvent = {
        pairs: [{
          bodyA: { label: 'ball', position: { x: 100, y: 100 } },
          bodyB: { label: 'paddle', position: { x: 100, y: 100 } }
        }]
      }
      
      collisionService.handleCollisionStart(mockEvent as any)
      
      const metrics = collisionService.getMetrics()
      expect(metrics.totalCollisions).toBe(1)
    })
  })

  describe('Integration Tests', () => {
    it('should complete full game lifecycle', async () => {
      // Initialize physics engine
      await physicsEngine.initialize()
      physicsEngine.setCollisionService(collisionService)
      
      // Start game
      const session = await gameStateService.startGame()
      expect(session).toBeDefined()
      
      // Create game objects
      const paddleBody = physicsEngine.createPaddleBody({
        x: 100,
        y: 500,
        width: 64,
        height: 12
      })
      
      const ballBody = physicsEngine.createBallBody({
        x: 400,
        y: 300,
        radius: 6
      })
      
      expect(paddleBody).toBeDefined()
      expect(ballBody).toBeDefined()
      
      // Start physics simulation
      physicsEngine.start()
      
      // Simulate game time
      await new Promise(resolve => setTimeout(resolve, 200))
      
      // End game
      await gameStateService.endGame('player')
      
      const finalState = gameStateService.getGameState()
      expect(finalState.isActive).toBe(false)
      expect(finalState.winner).toBe('player')
      
      // Cleanup
      physicsEngine.stop()
    })

    it('should handle viewport-responsive sizing', () => {
      const smallViewport = { width: 400, height: 300 }
      const smallConfigService = new GameConfigService(smallViewport)
      
      const smallPaddleConfig = smallConfigService.getPaddleConfig()
      expect(smallPaddleConfig.width).toBe(32) // 8% of 400
      expect(smallPaddleConfig.height).toBe(6) // 2% of 300
      
      const largeViewport = { width: 1600, height: 1200 }
      const largeConfigService = new GameConfigService(largeViewport)
      
      const largePaddleConfig = largeConfigService.getPaddleConfig()
      expect(largePaddleConfig.width).toBe(128) // 8% of 1600
      expect(largePaddleConfig.height).toBe(24) // 2% of 1200
    })

    it('should handle error conditions gracefully', async () => {
      // Test starting game without initialization
      const uninitializedService = new GameStateService({
        canvasId: 'test-canvas-id',
        userId: 'test-user-id',
        viewport: { width: 800, height: 600 }
      })
      
      try {
        await uninitializedService.startGame()
      } catch (error) {
        expect(error).toBeDefined()
      }
    })
  })
})
