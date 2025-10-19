/**
 * Game Mode Component
 * 
 * This component manages the game mode UI and integrates all game elements.
 * Handles game state transitions, viewport locking, and real-time event broadcasting.
 * 
 * Features:
 * - Game mode toggle and state management
 * - Viewport locking during gameplay
 * - Integration of paddle and ball components
 * - Real-time event broadcasting
 * - Game state persistence
 * - Win/lose condition handling
 * - Responsive game layout
 */

import React, { useState, useEffect, useCallback, useRef } from 'react'
import { Stage, Layer } from 'react-konva'
import { GameStateService } from '@/lib/game/GameStateService'
import { GameConfigService } from '@/lib/game/GameConfigService'
import { PhysicsEngine } from '@/lib/physics/PhysicsEngine'
import { CollisionDetectionService } from '@/lib/physics/CollisionDetectionService'
import { Paddle } from './Paddle'
import { Ball } from './Ball'
import { GameMode, ViewportDimensions, GameElementPosition } from '@/types/game'
import { supabase } from '@/lib/supabase/client'

export interface GameModeProps {
  canvasId: string
  userId: string
  viewport: ViewportDimensions
  onGameModeChange?: (mode: GameMode) => void
  onGameEnd?: (winner: 'player' | 'obstacles', score: number) => void
}

export const GameModeComponent: React.FC<GameModeProps> = ({
  canvasId,
  userId,
  viewport,
  onGameModeChange,
  onGameEnd
}) => {
  const [gameMode, setGameMode] = useState<GameMode>('canvas')
  const [isGameActive, setIsGameActive] = useState(false)
  const [gameState, setGameState] = useState<any>(null)
  const [gameConfig, setGameConfig] = useState<any>(null)
  
  const gameStateServiceRef = useRef<GameStateService | null>(null)
  const gameConfigServiceRef = useRef<GameConfigService | null>(null)
  const physicsEngineRef = useRef<PhysicsEngine | null>(null)
  const collisionServiceRef = useRef<CollisionDetectionService | null>(null)

  /**
   * Initialize game services
   */
  useEffect(() => {
    try {
      // Initialize game config service
      gameConfigServiceRef.current = new GameConfigService(viewport)
      setGameConfig(gameConfigServiceRef.current.getGameConfig())

      // Initialize physics engine
      physicsEngineRef.current = new PhysicsEngine()
      physicsEngineRef.current.initialize()

      // Initialize collision detection service
      collisionServiceRef.current = new CollisionDetectionService()
      physicsEngineRef.current.setCollisionService(collisionServiceRef.current)

      // Initialize game state service
      gameStateServiceRef.current = new GameStateService({
        canvasId,
        userId,
        viewport
      })

      console.log('🎮 Game services initialized')

      return () => {
        // Cleanup
        if (physicsEngineRef.current) {
          physicsEngineRef.current.destroy()
        }
      }
    } catch (error) {
      console.error('Failed to initialize game services:', error)
    }
  }, [canvasId, userId, viewport])

  /**
   * Update viewport when it changes
   */
  useEffect(() => {
    if (gameConfigServiceRef.current) {
      gameConfigServiceRef.current.updateViewport(viewport)
      setGameConfig(gameConfigServiceRef.current.getGameConfig())
    }
  }, [viewport])

  /**
   * Start game
   */
  const startGame = useCallback(async () => {
    try {
      if (!gameStateServiceRef.current || !physicsEngineRef.current) {
        throw new Error('Game services not initialized')
      }

      // Start game session
      const session = await gameStateServiceRef.current.startGame()
      setGameState(gameStateServiceRef.current.getGameState())
      setIsGameActive(true)
      setGameMode('game')

      // Start physics engine
      physicsEngineRef.current.start()

      // Broadcast game started event
      await supabase
        .from('realtime_events')
        .insert({
          canvas_id: canvasId,
          user_id: userId,
          event_type: 'game_started',
          event_data: {
            sessionId: session.id,
            canvasId,
            userId,
            timestamp: Date.now()
          }
        })

      onGameModeChange?.('game')
      console.log('🎮 Game started successfully')

    } catch (error) {
      console.error('Failed to start game:', error)
    }
  }, [canvasId, userId, onGameModeChange])

  /**
   * End game
   */
  const endGame = useCallback(async (winner: 'player' | 'obstacles') => {
    try {
      if (!gameStateServiceRef.current || !physicsEngineRef.current) {
        return
      }

      // End game session
      await gameStateServiceRef.current.endGame(winner)
      setGameState(gameStateServiceRef.current.getGameState())
      setIsGameActive(false)
      setGameMode('canvas')

      // Stop physics engine
      physicsEngineRef.current.stop()

      // Broadcast game ended event
      const session = gameStateServiceRef.current.getCurrentSession()
      if (session) {
        await supabase
          .from('realtime_events')
          .insert({
            canvas_id: canvasId,
            user_id: userId,
            event_type: 'game_ended',
            event_data: {
              sessionId: session.id,
              canvasId,
              userId,
              winner,
              score: gameStateServiceRef.current.getGameState().score,
              duration: gameStateServiceRef.current.getGameDuration(),
              timestamp: Date.now()
            }
          })
      }

      onGameModeChange?.('canvas')
      onGameEnd?.(winner, gameStateServiceRef.current.getGameState().score)
      console.log(`🏁 Game ended - Winner: ${winner}`)

    } catch (error) {
      console.error('Failed to end game:', error)
    }
  }, [canvasId, userId, onGameModeChange, onGameEnd])

  /**
   * Handle paddle position changes
   */
  const handlePaddlePositionChange = useCallback(async (position: GameElementPosition) => {
    try {
      const session = gameStateServiceRef.current?.getCurrentSession()
      if (!session) return

      // Broadcast paddle moved event
      await supabase
        .from('realtime_events')
        .insert({
          canvas_id: canvasId,
          user_id: userId,
          event_type: 'paddle_moved',
          event_data: {
            sessionId: session.id,
            paddleId: 'paddle-1',
            position,
            timestamp: Date.now()
          }
        })
    } catch (error) {
      console.error('Failed to broadcast paddle position:', error)
    }
  }, [canvasId, userId])

  /**
   * Handle ball position changes
   */
  const handleBallPositionChange = useCallback(async (
    position: GameElementPosition, 
    velocity: { x: number; y: number }
  ) => {
    try {
      const session = gameStateServiceRef.current?.getCurrentSession()
      if (!session) return

      // Broadcast ball moved event
      await supabase
        .from('realtime_events')
        .insert({
          canvas_id: canvasId,
          user_id: userId,
          event_type: 'ball_moved',
          event_data: {
            sessionId: session.id,
            ballId: 'ball-1',
            position,
            velocity,
            timestamp: Date.now()
          }
        })
    } catch (error) {
      console.error('Failed to broadcast ball position:', error)
    }
  }, [canvasId, userId])

  /**
   * Handle ball out of bounds (lose condition)
   */
  const handleBallOutOfBounds = useCallback((position: GameElementPosition) => {
    console.log('💔 Ball out of bounds - Game Over')
    endGame('obstacles')
  }, [endGame])

  /**
   * Handle collisions
   */
  const handleCollision = useCallback(async (collisionData: any) => {
    try {
      const session = gameStateServiceRef.current?.getCurrentSession()
      if (!session) return

      // Broadcast collision event
      await supabase
        .from('realtime_events')
        .insert({
          canvas_id: canvasId,
          user_id: userId,
          event_type: 'collision_detected',
          event_data: {
            sessionId: session.id,
            ballId: 'ball-1',
            collidedWith: collisionData.otherBody.label,
            collisionType: collisionData.collisionType,
            position: collisionData.position,
            timestamp: Date.now()
          }
        })

      // Handle specific collision types
      if (collisionData.collisionType === 'paddle') {
        // Ball hit paddle - continue game
        console.log('🏓 Ball hit paddle')
      } else if (collisionData.collisionType === 'obstacle') {
        // Ball hit obstacle - check win condition
        console.log('🎯 Ball hit obstacle')
        // TODO: Implement obstacle color change and win condition check
      }
    } catch (error) {
      console.error('Failed to handle collision:', error)
    }
  }, [canvasId, userId])

  return (
    <div className="game-mode-container">
      {/* Game Controls */}
      <div className="game-controls mb-4">
        {gameMode === 'canvas' ? (
          <button
            onClick={startGame}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            🎮 Start Game
          </button>
        ) : (
          <div className="flex gap-2">
            <button
              onClick={() => endGame('obstacles')}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            >
              🛑 End Game
            </button>
            <div className="px-4 py-2 bg-gray-100 rounded-lg">
              Score: {gameState?.score || 0} | Lives: {gameState?.lives || 0}
            </div>
          </div>
        )}
      </div>

      {/* Game Canvas */}
      <div className="game-canvas">
        <Stage
          width={viewport.width}
          height={viewport.height}
          className="border border-gray-300 rounded-lg"
        >
          <Layer>
            {/* Render paddle and ball only in game mode */}
            {gameMode === 'game' && gameConfig && physicsEngineRef.current && collisionServiceRef.current && (
              <>
                <Paddle
                  config={{
                    ...gameConfig.paddle,
                    controls: gameConfig.controls,
                    viewport: gameConfig.viewport
                  }}
                  physicsEngine={physicsEngineRef.current}
                  collisionService={collisionServiceRef.current}
                  isGameActive={isGameActive}
                  onPositionChange={handlePaddlePositionChange}
                  onCollision={handleCollision}
                />
                <Ball
                  config={{
                    ...gameConfig.ball,
                    viewport: gameConfig.viewport
                  }}
                  physicsEngine={physicsEngineRef.current}
                  collisionService={collisionServiceRef.current}
                  isGameActive={isGameActive}
                  onPositionChange={handleBallPositionChange}
                  onCollision={handleCollision}
                  onOutOfBounds={handleBallOutOfBounds}
                />
              </>
            )}
          </Layer>
        </Stage>
      </div>

      {/* Game Instructions */}
      {gameMode === 'game' && (
        <div className="game-instructions mt-4 p-4 bg-gray-50 rounded-lg">
          <h3 className="font-semibold mb-2">Game Controls:</h3>
          <ul className="text-sm text-gray-600 space-y-1">
            <li>← → Arrow keys: Move paddle</li>
            <li>Space: Pause/Resume</li>
            <li>R: Restart game</li>
          </ul>
        </div>
      )}
    </div>
  )
}

export default GameModeComponent
