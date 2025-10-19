/**
 * Game State Management Service
 * 
 * This service manages the game state lifecycle and provides a clean API
 * for game operations. Handles game session creation, state transitions,
 * and persistence with proper error handling and type safety.
 * 
 * Features:
 * - Game state lifecycle management (start, pause, resume, end)
 * - Game session creation and persistence
 * - State transition validation and error handling
 * - Score and lives tracking
 * - Game timing and duration management
 * - Integration with Supabase for persistence
 * - Type-safe operations with comprehensive error handling
 */

import { supabase } from '@/lib/supabase/client'
import { GameState, GameSession, GameMode, ViewportDimensions } from '@/types/game'

export interface GameStateServiceConfig {
  canvasId: string
  userId: string
  viewport: ViewportDimensions
}

export class GameStateService {
  private canvasId: string
  private userId: string
  private viewport: ViewportDimensions
  private currentSession: GameSession | null = null
  private gameState: GameState

  constructor(config: GameStateServiceConfig) {
    this.canvasId = config.canvasId
    this.userId = config.userId
    this.viewport = config.viewport
    this.gameState = this.createInitialGameState()
  }

  /**
   * Create initial game state
   */
  private createInitialGameState(): GameState {
    return {
      isActive: false,
      isPaused: false,
      score: 0,
      lives: 3,
      level: 1,
      startTime: null,
      endTime: null,
      winner: null
    }
  }

  /**
   * Start a new game session
   */
  async startGame(): Promise<GameSession> {
    try {
      // Validate prerequisites
      if (this.gameState.isActive) {
        throw new Error('Game is already active')
      }

      // Create new game state
      const newGameState: GameState = {
        ...this.createInitialGameState(),
        isActive: true,
        startTime: Date.now()
      }

      // Create game session in database
      const { data: sessionData, error } = await supabase
        .from('game_sessions')
        .insert({
          canvas_id: this.canvasId,
          user_id: this.userId,
          game_state: newGameState,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single()

      if (error) {
        throw new Error(`Failed to create game session: ${error.message}`)
      }

      // Update local state
      this.gameState = newGameState
      this.currentSession = sessionData as GameSession

      console.log('🎮 Game started:', this.currentSession.id)
      return this.currentSession

    } catch (error) {
      console.error('Failed to start game:', error)
      throw error
    }
  }

  /**
   * Pause the current game
   */
  async pauseGame(): Promise<void> {
    try {
      if (!this.gameState.isActive || this.gameState.isPaused) {
        throw new Error('Game is not active or already paused')
      }

      const updatedState: GameState = {
        ...this.gameState,
        isPaused: true
      }

      await this.updateGameState(updatedState)
      console.log('⏸️ Game paused')

    } catch (error) {
      console.error('Failed to pause game:', error)
      throw error
    }
  }

  /**
   * Resume the paused game
   */
  async resumeGame(): Promise<void> {
    try {
      if (!this.gameState.isActive || !this.gameState.isPaused) {
        throw new Error('Game is not active or not paused')
      }

      const updatedState: GameState = {
        ...this.gameState,
        isPaused: false
      }

      await this.updateGameState(updatedState)
      console.log('▶️ Game resumed')

    } catch (error) {
      console.error('Failed to resume game:', error)
      throw error
    }
  }

  /**
   * End the current game
   */
  async endGame(winner: 'player' | 'obstacles'): Promise<void> {
    try {
      if (!this.gameState.isActive) {
        throw new Error('No active game to end')
      }

      const endTime = Date.now()
      const duration = this.gameState.startTime ? endTime - this.gameState.startTime : 0

      const updatedState: GameState = {
        ...this.gameState,
        isActive: false,
        isPaused: false,
        endTime,
        winner
      }

      await this.updateGameState(updatedState)
      
      // Mark session as completed
      if (this.currentSession) {
        await supabase
          .from('game_sessions')
          .update({
            game_state: updatedState,
            completed_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq('id', this.currentSession.id)
      }

      console.log(`🏁 Game ended - Winner: ${winner}, Duration: ${duration}ms`)
      
      // Reset for next game
      this.currentSession = null

    } catch (error) {
      console.error('Failed to end game:', error)
      throw error
    }
  }

  /**
   * Update game state in database
   */
  private async updateGameState(newState: GameState): Promise<void> {
    if (!this.currentSession) {
      throw new Error('No active game session')
    }

    const { error } = await supabase
      .from('game_sessions')
      .update({
        game_state: newState,
        updated_at: new Date().toISOString()
      })
      .eq('id', this.currentSession.id)

    if (error) {
      throw new Error(`Failed to update game state: ${error.message}`)
    }

    this.gameState = newState
  }

  /**
   * Update score
   */
  async updateScore(points: number): Promise<void> {
    try {
      const updatedState: GameState = {
        ...this.gameState,
        score: this.gameState.score + points
      }

      await this.updateGameState(updatedState)
      console.log(`📊 Score updated: ${updatedState.score}`)

    } catch (error) {
      console.error('Failed to update score:', error)
      throw error
    }
  }

  /**
   * Lose a life
   */
  async loseLife(): Promise<void> {
    try {
      const updatedState: GameState = {
        ...this.gameState,
        lives: Math.max(0, this.gameState.lives - 1)
      }

      await this.updateGameState(updatedState)
      console.log(`💔 Life lost. Lives remaining: ${updatedState.lives}`)

      // End game if no lives left
      if (updatedState.lives === 0) {
        await this.endGame('obstacles')
      }

    } catch (error) {
      console.error('Failed to lose life:', error)
      throw error
    }
  }

  /**
   * Get current game state
   */
  getGameState(): GameState {
    return { ...this.gameState }
  }

  /**
   * Get current session
   */
  getCurrentSession(): GameSession | null {
    return this.currentSession
  }

  /**
   * Check if game is active
   */
  isGameActive(): boolean {
    return this.gameState.isActive && !this.gameState.isPaused
  }

  /**
   * Check if game is paused
   */
  isGamePaused(): boolean {
    return this.gameState.isPaused
  }

  /**
   * Get game duration
   */
  getGameDuration(): number {
    if (!this.gameState.startTime) return 0
    const endTime = this.gameState.endTime || Date.now()
    return endTime - this.gameState.startTime
  }
}
