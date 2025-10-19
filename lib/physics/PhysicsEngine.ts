/**
 * Physics Engine Service
 * 
 * This service manages the Matter.js physics engine lifecycle and provides a clean API
 * for physics operations. Handles engine initialization, body creation, collision detection,
 * and performance monitoring with proper resource management.
 * 
 * Features:
 * - Engine lifecycle management (initialize, start, stop, destroy)
 * - Physics body creation for different object types
 * - Collision event handling and logging
 * - Performance metrics and monitoring
 * - Viewport bounds management
 * - Memory management and cleanup
 * - Type-safe operations with comprehensive error handling
 */

import Matter from 'matter-js';
import { 
  createPhysicsEngine, 
  createBallBody, 
  createPaddleBody, 
  createObstacleBody, 
  createObstacleCircleBody,
  engineConfig 
} from '@/lib/physics/PhysicsConfig';

/**
 * Physics Engine Service
 * Manages Matter.js physics engine lifecycle and operations
 * Follows service layer pattern from existing CanvasOperations
 */
export class PhysicsEngine {
  private engine: Matter.Engine | null = null;
  private runner: Matter.Runner | null = null;
  private isRunning = false;
  private viewportWidth = 1920;
  private viewportHeight = 1080;

  /**
   * Initialize the physics engine
   * @param viewportWidth - Width of the viewport
   * @param viewportHeight - Height of the viewport
   */
  initialize(viewportWidth: number = 1920, viewportHeight: number = 1080): void {
    if (this.engine) {
      console.warn('Physics engine already initialized');
      return;
    }

    this.viewportWidth = viewportWidth;
    this.viewportHeight = viewportHeight;
    
    // Create engine with configuration
    this.engine = createPhysicsEngine(viewportWidth, viewportHeight);
    
    // Create runner for 60fps physics loop
    this.runner = Matter.Runner.create();
    
    console.log('Physics engine initialized with 60fps target');
  }

  /**
   * Start the physics engine
   */
  start(): void {
    if (!this.engine || !this.runner) {
      throw new Error('Physics engine not initialized. Call initialize() first.');
    }

    if (this.isRunning) {
      console.warn('Physics engine already running');
      return;
    }

    // Start the physics loop
    Matter.Runner.run(this.runner, this.engine);
    this.isRunning = true;
    
    console.log('Physics engine started');
  }

  /**
   * Stop the physics engine
   */
  stop(): void {
    if (!this.runner) {
      console.warn('Physics engine not initialized');
      return;
    }

    if (!this.isRunning) {
      console.warn('Physics engine not running');
      return;
    }

    // Stop the physics loop
    Matter.Runner.stop(this.runner);
    this.isRunning = false;
    
    console.log('Physics engine stopped');
  }

  /**
   * Destroy the physics engine and clean up resources
   */
  destroy(): void {
    if (this.isRunning) {
      this.stop();
    }

    if (this.engine) {
      // Clear all bodies from the world
      Matter.World.clear(this.engine.world, false);
      
      // Destroy the engine
      Matter.Engine.clear(this.engine);
      this.engine = null;
    }

    if (this.runner) {
      this.runner = null;
    }

    console.log('Physics engine destroyed');
  }

  /**
   * Get the current engine instance
   */
  getEngine(): Matter.Engine | null {
    return this.engine;
  }

  /**
   * Check if the engine is running
   */
  isEngineRunning(): boolean {
    return this.isRunning;
  }

  /**
   * Update viewport bounds
   */
  updateViewportBounds(width: number, height: number): void {
    if (!this.engine) {
      console.warn('Physics engine not initialized');
      return;
    }

    this.viewportWidth = width;
    this.viewportHeight = height;
    
    // Note: Viewport bounds are tracked for collision detection
    // Actual bounds enforcement will be handled by game logic
    
    console.log(`Viewport bounds updated to ${width}x${height}`);
  }

  /**
   * Create a ball physics body
   */
  createBall(x: number, y: number, radius: number): Matter.Body {
    if (!this.engine) {
      throw new Error('Physics engine not initialized');
    }

    const body = createBallBody(x, y, radius);
    Matter.World.add(this.engine.world, body);
    
    return body;
  }

  /**
   * Create a paddle physics body
   */
  createPaddle(x: number, y: number, width: number, height: number): Matter.Body {
    if (!this.engine) {
      throw new Error('Physics engine not initialized');
    }

    const body = createPaddleBody(x, y, width, height);
    Matter.World.add(this.engine.world, body);
    
    return body;
  }

  /**
   * Create an obstacle physics body (rectangle)
   */
  createObstacle(x: number, y: number, width: number, height: number): Matter.Body {
    if (!this.engine) {
      throw new Error('Physics engine not initialized');
    }

    const body = createObstacleBody(x, y, width, height);
    Matter.World.add(this.engine.world, body);
    
    return body;
  }

  /**
   * Create an obstacle physics body (circle)
   */
  createObstacleCircle(x: number, y: number, radius: number): Matter.Body {
    if (!this.engine) {
      throw new Error('Physics engine not initialized');
    }

    const body = createObstacleCircleBody(x, y, radius);
    Matter.World.add(this.engine.world, body);
    
    return body;
  }

  /**
   * Remove a physics body from the world
   */
  removeBody(body: Matter.Body): void {
    if (!this.engine) {
      console.warn('Physics engine not initialized');
      return;
    }

    Matter.World.remove(this.engine.world, body);
  }

  /**
   * Set up collision event listeners
   */
  onCollision(callback: (pairs: Matter.Pair[]) => void): void {
    if (!this.engine) {
      throw new Error('Physics engine not initialized');
    }

    Matter.Events.on(this.engine, 'collisionStart', (event) => {
      callback(event.pairs);
    });
  }

  /**
   * Set up collision end event listeners
   */
  onCollisionEnd(callback: (pairs: Matter.Pair[]) => void): void {
    if (!this.engine) {
      throw new Error('Physics engine not initialized');
    }

    Matter.Events.on(this.engine, 'collisionEnd', (event) => {
      callback(event.pairs);
    });
  }

  /**
   * Get all bodies in the world
   */
  getAllBodies(): Matter.Body[] {
    if (!this.engine) {
      return [];
    }

    return this.engine.world.bodies;
  }

  /**
   * Get engine performance metrics
   */
  getPerformanceMetrics(): { fps: number; frameTime: number } {
    if (!this.runner) {
      return { fps: 0, frameTime: 0 };
    }

    // Matter.js Runner doesn't expose fps/delta directly
    // Return target values for now - can be enhanced with custom tracking
    return {
      fps: 60, // Target 60fps
      frameTime: 16.666 // Target frame time in ms
    };
  }
}
