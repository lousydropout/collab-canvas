/**
 * Paddle Component
 * 
 * This component renders the game paddle using react-konva with viewport-relative sizing.
 * Handles paddle movement, physics integration, and real-time synchronization.
 * 
 * Features:
 * - Viewport-relative sizing (8% width × 2% height)
 * - Arrow key controls with smooth movement
 * - Physics body integration with Matter.js
 * - Real-time position broadcasting
 * - Collision detection with ball
 * - Responsive positioning and movement
 */

import React, { useEffect, useRef, useCallback } from 'react'
import { Rect } from 'react-konva'
import { PaddleConfig, GameElementPosition } from '@/types/game'
import { PhysicsEngine } from '@/lib/physics/PhysicsEngine'
import { CollisionDetectionService } from '@/lib/physics/CollisionDetectionService'

export interface PaddleProps {
  config: PaddleConfig
  physicsEngine: PhysicsEngine
  collisionService: CollisionDetectionService
  isGameActive: boolean
  onPositionChange?: (position: GameElementPosition) => void
  onCollision?: (collisionData: any) => void
}

export const Paddle: React.FC<PaddleProps> = ({
  config,
  physicsEngine,
  collisionService,
  isGameActive,
  onPositionChange,
  onCollision
}) => {
  const paddleRef = useRef<any>(null)
  const physicsBodyRef = useRef<any>(null)
  const positionRef = useRef<GameElementPosition>(config.position)
  const keysPressed = useRef<Set<string>>(new Set())

  /**
   * Create physics body for paddle
   */
  useEffect(() => {
    if (!physicsEngine || !isGameActive) return

    try {
      const body = physicsEngine.createPaddle(
        config.position.x,
        config.position.y,
        config.width,
        config.height
      )

      physicsBodyRef.current = body
      console.log('🏓 Paddle physics body created')

      // Set up collision detection
      const handleCollision = (event: any) => {
        const { bodyA, bodyB } = event.pairs[0]
        const paddleBody = bodyA.label === 'paddle' ? bodyA : bodyB
        const otherBody = bodyA.label === 'paddle' ? bodyB : bodyA

        if (paddleBody === body) {
          onCollision?.({
            paddleBody,
            otherBody,
            collisionType: otherBody.label === 'ball' ? 'ball' : 'obstacle',
            position: { x: paddleBody.position.x, y: paddleBody.position.y }
          })
        }
      }

      collisionService.on('collisionStart', handleCollision)

      return () => {
        collisionService.off('collisionStart', handleCollision)
        if (physicsBodyRef.current) {
          physicsEngine.removeBody(physicsBodyRef.current)
        }
      }
    } catch (error) {
      console.error('Failed to create paddle physics body:', error)
    }
  }, [physicsEngine, isGameActive, config, collisionService, onCollision])

  /**
   * Handle keyboard input
   */
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!isGameActive) return

      const key = event.key
      if (key === config.controls?.leftKey || key === config.controls?.rightKey) {
        event.preventDefault()
        keysPressed.current.add(key)
      }
    }

    const handleKeyUp = (event: KeyboardEvent) => {
      const key = event.key
      keysPressed.current.delete(key)
    }

    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keyup', handleKeyUp)
    }
  }, [isGameActive, config.controls])

  /**
   * Update paddle position based on input
   */
  const updatePosition = useCallback(() => {
    if (!isGameActive || !physicsBodyRef.current) return

    const currentPosition = positionRef.current
    let newX = currentPosition.x

    // Handle movement
    if (keysPressed.current.has(config.controls?.leftKey || 'ArrowLeft')) {
      newX = Math.max(0, currentPosition.x - config.movementSpeed)
    }
    if (keysPressed.current.has(config.controls?.rightKey || 'ArrowRight')) {
      newX = Math.min((config.viewport?.width || 800) - config.width, currentPosition.x + config.movementSpeed)
    }

    // Update physics body position
    if (physicsBodyRef.current && newX !== currentPosition.x) {
      physicsEngine.setBodyPosition(physicsBodyRef.current, newX, currentPosition.y)
      
      // Update local position
      positionRef.current = { x: newX, y: currentPosition.y }
      
      // Notify parent of position change
      onPositionChange?.(positionRef.current)
    }
  }, [isGameActive, config, physicsEngine, onPositionChange])

  /**
   * Animation loop for smooth movement
   */
  useEffect(() => {
    if (!isGameActive) return

    const animate = () => {
      updatePosition()
      requestAnimationFrame(animate)
    }

    const animationId = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(animationId)
  }, [isGameActive, updatePosition])

  /**
   * Sync physics body position with visual position
   */
  useEffect(() => {
    if (!physicsBodyRef.current || !paddleRef.current) return

    const syncPosition = () => {
      const bodyPosition = physicsBodyRef.current.position
      positionRef.current = { x: bodyPosition.x, y: bodyPosition.y }
      
      if (paddleRef.current) {
        paddleRef.current.x(bodyPosition.x)
        paddleRef.current.y(bodyPosition.y)
      }
    }

    const intervalId = setInterval(syncPosition, 16) // ~60fps
    return () => clearInterval(intervalId)
  }, [physicsBodyRef.current])

  return (
    <Rect
      ref={paddleRef}
      x={config.position.x}
      y={config.position.y}
      width={config.width}
      height={config.height}
      fill="#4F46E5" // Indigo color
      stroke="#312E81" // Darker indigo for border
      strokeWidth={2}
      cornerRadius={4}
      shadowColor="rgba(0, 0, 0, 0.3)"
      shadowBlur={4}
      shadowOffset={{ x: 2, y: 2 }}
      opacity={isGameActive ? 1 : 0.5}
    />
  )
}

export default Paddle
