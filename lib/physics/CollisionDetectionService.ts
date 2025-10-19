/**
 * Collision Detection Service
 * 
 * This service manages collision events from the Matter.js physics engine and provides
 * collision analysis capabilities. Tracks collision history, metrics, and provides
 * debugging information for game development.
 * 
 * Features:
 * - Collision event listeners and handlers
 * - Collision history tracking with configurable limits
 * - Collision metrics and statistics
 * - SAT collision detection utilities
 * - Collision normal and impulse calculations
 * - Debug logging and collision analysis
 * - Performance monitoring integration
 */

import Matter from 'matter-js';
import { CollisionEvent, PhysicsMetrics } from '@/types/physics';

/**
 * Collision Detection Service
 * Handles collision events and provides collision analysis
 */
export class CollisionDetectionService {
  private collisionCount = 0;
  private collisionHistory: CollisionEvent[] = [];
  private maxHistorySize = 100;

  /**
   * Set up collision event listeners on the physics engine
   * @param engine - Matter.js engine instance
   */
  setupCollisionListeners(engine: Matter.Engine): void {
    // Collision start events
    Matter.Events.on(engine, 'collisionStart', (event) => {
      this.handleCollisionStart(event);
    });

    // Collision end events
    Matter.Events.on(engine, 'collisionEnd', (event) => {
      this.handleCollisionEnd(event);
    });

    // Collision active events (ongoing collisions)
    Matter.Events.on(engine, 'collisionActive', (event) => {
      this.handleCollisionActive(event);
    });

    console.log('Collision event listeners set up');
  }

  /**
   * Handle collision start events
   * @param event - Matter.js collision event
   */
  private handleCollisionStart(event: Matter.IEventCollision<Matter.Engine>): void {
    const pairs = event.pairs;
    
    for (const pair of pairs) {
      const collisionEvent: CollisionEvent = {
        bodyA: pair.bodyA,
        bodyB: pair.bodyB,
        collision: pair.collision,
        timestamp: Date.now()
      };

      this.collisionCount++;
      this.addToHistory(collisionEvent);

      // Log collision details for debugging
      this.logCollisionDetails(collisionEvent, 'START');
    }
  }

  /**
   * Handle collision end events
   * @param event - Matter.js collision event
   */
  private handleCollisionEnd(event: Matter.IEventCollision<Matter.Engine>): void {
    const pairs = event.pairs;
    
    for (const pair of pairs) {
      const collisionEvent: CollisionEvent = {
        bodyA: pair.bodyA,
        bodyB: pair.bodyB,
        collision: pair.collision,
        timestamp: Date.now()
      };

      this.logCollisionDetails(collisionEvent, 'END');
    }
  }

  /**
   * Handle active collision events
   * @param event - Matter.js collision event
   */
  private handleCollisionActive(event: Matter.IEventCollision<Matter.Engine>): void {
    const pairs = event.pairs;
    
    for (const pair of pairs) {
      // Active collisions are logged less frequently to avoid spam
      if (Math.random() < 0.1) { // 10% chance to log
        const collisionEvent: CollisionEvent = {
          bodyA: pair.bodyA,
          bodyB: pair.bodyB,
          collision: pair.collision,
          timestamp: Date.now()
        };

        this.logCollisionDetails(collisionEvent, 'ACTIVE');
      }
    }
  }

  /**
   * Log collision details for debugging
   * @param collisionEvent - Collision event data
   * @param type - Type of collision event
   */
  private logCollisionDetails(collisionEvent: CollisionEvent, type: string): void {
    const { bodyA, bodyB, collision } = collisionEvent;
    
    console.log(`[COLLISION ${type}]`, {
      bodyA: {
        id: bodyA.id,
        position: bodyA.position,
        velocity: bodyA.velocity,
        canvasObjectId: (bodyA as any).canvasObjectId
      },
      bodyB: {
        id: bodyB.id,
        position: bodyB.position,
        velocity: bodyB.velocity,
        canvasObjectId: (bodyB as any).canvasObjectId
      },
      collision: {
        depth: collision.depth,
        normal: collision.normal,
        penetration: collision.penetration
      },
      timestamp: new Date(collisionEvent.timestamp).toISOString()
    });
  }

  /**
   * Add collision event to history
   * @param collisionEvent - Collision event to add
   */
  private addToHistory(collisionEvent: CollisionEvent): void {
    this.collisionHistory.push(collisionEvent);
    
    // Maintain history size limit
    if (this.collisionHistory.length > this.maxHistorySize) {
      this.collisionHistory.shift();
    }
  }

  /**
   * Get collision statistics
   * @returns Collision metrics
   */
  getCollisionMetrics(): PhysicsMetrics {
    return {
      fps: 0, // Will be updated by physics engine
      frameTime: 0, // Will be updated by physics engine
      bodyCount: 0, // Will be updated by physics engine
      collisionCount: this.collisionCount
    };
  }

  /**
   * Get recent collision history
   * @param limit - Maximum number of recent collisions to return
   * @returns Array of recent collision events
   */
  getRecentCollisions(limit: number = 10): CollisionEvent[] {
    return this.collisionHistory.slice(-limit);
  }

  /**
   * Clear collision history
   */
  clearHistory(): void {
    this.collisionHistory = [];
    this.collisionCount = 0;
  }

  /**
   * Check if two bodies are colliding
   * @param bodyA - First body
   * @param bodyB - Second body
   * @returns true if bodies are colliding
   */
  areBodiesColliding(bodyA: Matter.Body, bodyB: Matter.Body): boolean {
    return Matter.SAT.collides(bodyA, bodyB).collided;
  }

  /**
   * Get collision normal between two bodies
   * @param bodyA - First body
   * @param bodyB - Second body
   * @returns Collision normal vector or null if not colliding
   */
  getCollisionNormal(bodyA: Matter.Body, bodyB: Matter.Body): Matter.Vector | null {
    const collision = Matter.SAT.collides(bodyA, bodyB);
    return collision.collided ? collision.normal : null;
  }

  /**
   * Calculate collision impulse
   * @param bodyA - First body
   * @param bodyB - Second body
   * @returns Impulse magnitude or 0 if not colliding
   */
  calculateCollisionImpulse(bodyA: Matter.Body, bodyB: Matter.Body): number {
    const collision = Matter.SAT.collides(bodyA, bodyB);
    if (!collision.collided) return 0;
    
    // Simple impulse calculation based on relative velocity
    const relativeVelocity = Matter.Vector.sub(bodyA.velocity, bodyB.velocity);
    const impulse = Matter.Vector.magnitude(relativeVelocity);
    
    return impulse;
  }

  /**
   * Reset collision counter
   */
  resetCollisionCount(): void {
    this.collisionCount = 0;
  }
}
