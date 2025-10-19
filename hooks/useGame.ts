/**
 * Game Integration Hook
 * 
 * This React hook provides game functionality integration for components.
 * Manages game state, physics engine lifecycle, and real-time event handling.
 * 
 * Features:
 * - Game state management and persistence
 * - Physics engine lifecycle management
 * - Real-time event subscription and broadcasting
 * - Game configuration management
 * - Viewport-responsive game elements
 * - Error handling and cleanup
 */

import { useState, useEffect, useCallback, useRef } from 'react'
import { GameStateService } from '@/lib/game/GameStateService'
import { GameConfigService } from '@/lib/game/GameConfigService'
import { PhysicsEngine } from '@/lib/physics/PhysicsEngine'
import { CollisionDetectionService } from '@/lib/physics/CollisionDetectionService'
import { GameMode, ViewportDimensions, GameState, GameSession } from '@/types/game'
import { supabase } from '@/lib/supabase/client'

export interface UseGameConfig {
  canvasId: string
  userId: string
  viewport: ViewportDimensions
}

export interface UseGameReturn {
  // Game state
  gameMode: GameMode
  gameState: GameState | null
  currentSession: GameSession | null
  isGameActive: boolean
  isGamePaused: boolean
  
  // Game actions
  startGame: () => Promise<void>
  endGame: (winner: 'player' | 'obstacles') => Promise<void>
  pauseGame: () => Promise<void>
  resumeGame: () => Promise<void>
  
  // Game services
  gameStateService: GameStateService | null
  gameConfigService: GameConfigService | null
  physicsEngine: PhysicsEngine | null
  collisionService: CollisionDetectionService | null
  
  // Game configuration
  gameConfig: any
  
  // Error handling
  error: string | null
  isLoading: boolean
}

export const useGame = (config: UseGameConfig): UseGameReturn => {
  const [gameMode, setGameMode] = useState<GameMode>('canvas')
  const [gameState, setGameState] = useState<GameState | null>(null)
  const [currentSession, setCurrentSession] = useState<GameSession | null>(null)
  const [isGameActive, setIsGameActive] = useState(false)
  const [isGamePaused, setIsGamePaused] = useState(false)
  const [gameConfig, setGameConfig] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  // Service references
  const gameStateServiceRef = useRef<GameStateService | null>(null)
  const gameConfigServiceRef = useRef<GameConfigService | null>(null)
  const physicsEngineRef = useRef<PhysicsEngine | null>(null)
  const collisionServiceRef = useRef<CollisionDetectionService | null>(null)

  /**
   * Initialize game services
   */
  useEffect(() => {
    const initializeServices = async () => {
      try {
        setIsLoading(true)
        setError(null)

        // Initialize game config service
        gameConfigServiceRef.current = new GameConfigService(config.viewport)
        setGameConfig(gameConfigServiceRef.current.getGameConfig())

        // Initialize physics engine
        physicsEngineRef.current = new PhysicsEngine()
        await physicsEngineRef.current.initialize()

        // Initialize collision detection service
        collisionServiceRef.current = new CollisionDetectionService()
        physicsEngineRef.current.setCollisionService(collisionServiceRef.current)

        // Initialize game state service
        gameStateServiceRef.current = new GameStateService({
          canvasId: config.canvasId,
          userId: config.userId,
          viewport: config.viewport
        })

        console.log('🎮 Game services initialized successfully')

      } catch (err) {
        console.error('Failed to initialize game services:', err)
        setError(err instanceof Error ? err.message : 'Failed to initialize game services')
      } finally {
        setIsLoading(false)
      }
    }

    initializeServices()

    return () => {
      // Cleanup
      if (physicsEngineRef.current) {
        physicsEngineRef.current.destroy()
      }
    }
  }, [config.canvasId, config.userId, config.viewport])

  /**
   * Update viewport when it changes
   */
  useEffect(() => {
    if (gameConfigServiceRef.current) {
      gameConfigServiceRef.current.updateViewport(config.viewport)
      setGameConfig(gameConfigServiceRef.current.getGameConfig())
    }
  }, [config.viewport])

  /**
   * Start game
   */
  const startGame = useCallback(async () => {
    try {
      if (!gameStateServiceRef.current || !physicsEngineRef.current) {
        throw new Error('Game services not initialized')
      }

      setIsLoading(true)
      setError(null)

      // Start game session
      const session = await gameStateServiceRef.current.startGame()
      const newGameState = gameStateServiceRef.current.getGameState()
      
      setGameState(newGameState)
      setCurrentSession(session)
      setIsGameActive(true)
      setIsGamePaused(false)
      setGameMode('game')

      // Start physics engine
      physicsEngineRef.current.start()

      // Broadcast game started event
      await supabase
        .from('realtime_events')
        .insert({
          canvas_id: config.canvasId,
          user_id: config.userId,
          event_type: 'game_started',
          event_data: {
            sessionId: session.id,
            canvasId: config.canvasId,
            userId: config.userId,
            timestamp: Date.now()
          }
        })

      console.log('🎮 Game started successfully')

    } catch (err) {
      console.error('Failed to start game:', err)
      setError(err instanceof Error ? err.message : 'Failed to start game')
    } finally {
      setIsLoading(false)
    }
  }, [config.canvasId, config.userId])

  /**
   * End game
   */
  const endGame = useCallback(async (winner: 'player' | 'obstacles') => {
    try {
      if (!gameStateServiceRef.current || !physicsEngineRef.current) {
        return
      }

      setIsLoading(true)
      setError(null)

      // End game session
      await gameStateServiceRef.current.endGame(winner)
      const finalGameState = gameStateServiceRef.current.getGameState()
      
      setGameState(finalGameState)
      setIsGameActive(false)
      setIsGamePaused(false)
      setGameMode('canvas')

      // Stop physics engine
      physicsEngineRef.current.stop()

      // Broadcast game ended event
      const session = gameStateServiceRef.current.getCurrentSession()
      if (session) {
        await supabase
          .from('realtime_events')
          .insert({
            canvas_id: config.canvasId,
            user_id: config.userId,
            event_type: 'game_ended',
            event_data: {
              sessionId: session.id,
              canvasId: config.canvasId,
              userId: config.userId,
              winner,
              score: finalGameState.score,
              duration: gameStateServiceRef.current.getGameDuration(),
              timestamp: Date.now()
            }
          })
      }

      setCurrentSession(null)
      console.log(`🏁 Game ended - Winner: ${winner}`)

    } catch (err) {
      console.error('Failed to end game:', err)
      setError(err instanceof Error ? err.message : 'Failed to end game')
    } finally {
      setIsLoading(false)
    }
  }, [config.canvasId, config.userId])

  /**
   * Pause game
   */
  const pauseGame = useCallback(async () => {
    try {
      if (!gameStateServiceRef.current) {
        throw new Error('Game state service not initialized')
      }

      await gameStateServiceRef.current.pauseGame()
      setIsGamePaused(true)
      console.log('⏸️ Game paused')

    } catch (err) {
      console.error('Failed to pause game:', err)
      setError(err instanceof Error ? err.message : 'Failed to pause game')
    }
  }, [])

  /**
   * Resume game
   */
  const resumeGame = useCallback(async () => {
    try {
      if (!gameStateServiceRef.current) {
        throw new Error('Game state service not initialized')
      }

      await gameStateServiceRef.current.resumeGame()
      setIsGamePaused(false)
      console.log('▶️ Game resumed')

    } catch (err) {
      console.error('Failed to resume game:', err)
      setError(err instanceof Error ? err.message : 'Failed to resume game')
    }
  }, [])

  return {
    // Game state
    gameMode,
    gameState,
    currentSession,
    isGameActive,
    isGamePaused,
    
    // Game actions
    startGame,
    endGame,
    pauseGame,
    resumeGame,
    
    // Game services
    gameStateService: gameStateServiceRef.current,
    gameConfigService: gameConfigServiceRef.current,
    physicsEngine: physicsEngineRef.current,
    collisionService: collisionServiceRef.current,
    
    // Game configuration
    gameConfig,
    
    // Error handling
    error,
    isLoading
  }
}

export default useGame
