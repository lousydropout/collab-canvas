/**
 * Ball Component
 * 
 * This component renders the game ball using react-konva with viewport-relative sizing.
 * Handles ball physics, collision detection, and real-time synchronization.
 * 
 * Features:
 * - Viewport-relative sizing (1% viewport radius)
 * - Realistic physics with Matter.js
 * - Collision detection with paddle, obstacles, and viewport edges
 * - Real-time position and velocity broadcasting
 * - Win/lose condition detection
 * - Responsive positioning and movement
 */

import React, { useEffect, useRef, useCallback } from 'react'
import { Circle } from 'react-konva'
import { BallConfig, GameElementPosition } from '@/types/game'
import { PhysicsEngine } from '@/lib/physics/PhysicsEngine'
import { CollisionDetectionService } from '@/lib/physics/CollisionDetectionService'

export interface BallProps {
  config: BallConfig
  physicsEngine: PhysicsEngine
  collisionService: CollisionDetectionService
  isGameActive: boolean
  onPositionChange?: (position: GameElementPosition, velocity: { x: number; y: number }) => void
  onCollision?: (collisionData: any) => void
  onOutOfBounds?: (position: GameElementPosition) => void
}

export const Ball: React.FC<BallProps> = ({
  config,
  physicsEngine,
  collisionService,
  isGameActive,
  onPositionChange,
  onCollision,
  onOutOfBounds
}) => {
  const ballRef = useRef<any>(null)
  const physicsBodyRef = useRef<any>(null)
  const positionRef = useRef<GameElementPosition>(config.position)
  const velocityRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 })
  const isInitialized = useRef(false)

  /**
   * Create physics body for ball
   */
  useEffect(() => {
    if (!physicsEngine || !isGameActive || isInitialized.current) return

    try {
      const body = physicsEngine.createBall(
        config.position.x,
        config.position.y,
        config.radius
      )

      physicsBodyRef.current = body
      isInitialized.current = true
      console.log('⚽ Ball physics body created')

      // Set initial velocity
      const initialVelocity = {
        x: (Math.random() - 0.5) * config.initialSpeed * 2, // Random horizontal direction
        y: -config.initialSpeed // Always upward initially
      }
      
      physicsEngine.setBodyVelocity(body, initialVelocity.x, initialVelocity.y)
      velocityRef.current = initialVelocity

      // Set up collision detection
      const handleCollision = (event: any) => {
        const { bodyA, bodyB } = event.pairs[0]
        const ballBody = bodyA.label === 'ball' ? bodyA : bodyB
        const otherBody = bodyA.label === 'ball' ? bodyB : bodyA

        if (ballBody === body) {
          onCollision?.({
            ballBody,
            otherBody,
            collisionType: otherBody.label === 'paddle' ? 'paddle' : 
                           otherBody.label === 'obstacle' ? 'obstacle' : 'viewport_edge',
            position: { x: ballBody.position.x, y: ballBody.position.y }
          })
        }
      }

      collisionService.on('collisionStart', handleCollision)

      return () => {
        collisionService.off('collisionStart', handleCollision)
        if (physicsBodyRef.current) {
          physicsEngine.removeBody(physicsBodyRef.current)
        }
        isInitialized.current = false
      }
    } catch (error) {
      console.error('Failed to create ball physics body:', error)
    }
  }, [physicsEngine, isGameActive, config, collisionService, onCollision])

  /**
   * Check for out of bounds (lose condition)
   */
  const checkOutOfBounds = useCallback(() => {
    if (!physicsBodyRef.current || !isGameActive) return

    const position = physicsBodyRef.current.position
    const viewportHeight = config.viewport?.height || 600

    // Check if ball fell below the viewport (lose condition)
    if (position.y > viewportHeight + config.radius) {
      onOutOfBounds?.(position)
    }
  }, [isGameActive, config, onOutOfBounds])

  /**
   * Sync physics body position with visual position
   */
  useEffect(() => {
    if (!physicsBodyRef.current || !ballRef.current || !isGameActive) return

    const syncPosition = () => {
      const bodyPosition = physicsBodyRef.current.position
      const bodyVelocity = physicsBodyRef.current.velocity
      
      // Update position references
      positionRef.current = { x: bodyPosition.x, y: bodyPosition.y }
      velocityRef.current = { x: bodyVelocity.x, y: bodyVelocity.y }
      
      // Update visual position
      if (ballRef.current) {
        ballRef.current.x(bodyPosition.x - config.radius)
        ballRef.current.y(bodyPosition.y - config.radius)
      }

      // Notify parent of position and velocity changes
      onPositionChange?.(positionRef.current, velocityRef.current)

      // Check for out of bounds
      checkOutOfBounds()
    }

    const intervalId = setInterval(syncPosition, 16) // ~60fps
    return () => clearInterval(intervalId)
  }, [isGameActive, config, onPositionChange, checkOutOfBounds])

  /**
   * Reset ball position and velocity
   */
  const resetBall = useCallback(() => {
    if (!physicsBodyRef.current || !physicsEngine) return

    // Reset position
    physicsEngine.setBodyPosition(physicsBodyRef.current, config.position.x, config.position.y)
    
    // Reset velocity
    const initialVelocity = {
      x: (Math.random() - 0.5) * config.initialSpeed * 2,
      y: -config.initialSpeed
    }
    physicsEngine.setBodyVelocity(physicsBodyRef.current, initialVelocity.x, initialVelocity.y)
    
    velocityRef.current = initialVelocity
    positionRef.current = config.position
  }, [physicsEngine, config])

  /**
   * Expose reset function for parent components
   */
  useEffect(() => {
    if (ballRef.current) {
      ballRef.current.resetBall = resetBall
    }
  }, [resetBall])

  return (
    <Circle
      ref={ballRef}
      x={config.position.x}
      y={config.position.y}
      radius={config.radius}
      fill="#EF4444" // Red color
      stroke="#DC2626" // Darker red for border
      strokeWidth={2}
      shadowColor="rgba(0, 0, 0, 0.3)"
      shadowBlur={6}
      shadowOffset={{ x: 2, y: 2 }}
      opacity={isGameActive ? 1 : 0.5}
    />
  )
}

export default Ball
