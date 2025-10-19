/**
 * Physics Engine Configuration
 * 
 * This module provides Matter.js engine configuration and physics body factory functions.
 * Contains predefined configurations for different object types (ball, paddle, obstacle)
 * optimized for Pong-style gameplay with zero gravity and proper collision properties.
 * 
 * Features:
 * - Zero gravity engine configuration for Pong gameplay
 * - 60fps target timing (16.666ms delta)
 * - Physics body factory functions for different object types
 * - Optimized collision properties (restitution, friction, density)
 * - Static obstacle configuration for immovable objects
 * - Dynamic ball and paddle configurations
 */

import Matter from 'matter-js';

/**
 * Matter.js Engine Configuration for Pong Game
 * Based on PRD specifications: zero gravity, 60fps target (16.666ms delta)
 */
export const engineConfig = {
  gravity: { x: 0, y: 0 },           // No gravity for Pong-style gameplay
  timing: {
    timestamp: 0,
    timeScale: 1,
    delta: 16.666,                   // 60fps target
  },
  world: {
    bounds: {
      min: { x: 0, y: 0 },
      max: { x: 1920, y: 1080 }      // Default viewport bounds, will be updated dynamically
    }
  }
};

/**
 * Physics Body Configurations
 * Based on PRD specifications for different object types
 */
export const ballConfig = {
  restitution: 1.0,                  // Perfect bounce
  friction: 0,                       // No friction
  frictionAir: 0.01,                 // Minimal air resistance
  density: 0.001,                    // Light weight
  inertia: Infinity                   // Prevent rotation
};

export const paddleConfig = {
  restitution: 0.8,                  // Good bounce
  friction: 0.1,                     // Slight friction
  isStatic: false,                   // Can move
  density: 0.001
};

export const obstacleConfig = {
  restitution: 0.8,                  // Good bounce
  friction: 0.1,                     // Slight friction
  isStatic: true,                    // Immovable
  density: 0.001
};

/**
 * Physics Engine Factory
 * Creates a configured Matter.js engine instance
 */
export function createPhysicsEngine(viewportWidth: number = 1920, viewportHeight: number = 1080) {
  const engine = Matter.Engine.create();
  
  // Configure engine with zero gravity
  engine.world.gravity.x = engineConfig.gravity.x;
  engine.world.gravity.y = engineConfig.gravity.y;
  
  // Set timing for 60fps
  engine.timing.timeScale = engineConfig.timing.timeScale;
  
  // Note: World bounds will be handled by collision detection with viewport edges
  // Matter.js doesn't have a direct setBounds method, bounds are managed through walls
  
  return engine;
}

/**
 * Physics Body Factory Functions
 * Create physics bodies with predefined configurations
 */
export function createBallBody(x: number, y: number, radius: number) {
  const body = Matter.Bodies.circle(x, y, radius, ballConfig);
  return body;
}

export function createPaddleBody(x: number, y: number, width: number, height: number) {
  const body = Matter.Bodies.rectangle(x, y, width, height, paddleConfig);
  return body;
}

export function createObstacleBody(x: number, y: number, width: number, height: number) {
  const body = Matter.Bodies.rectangle(x, y, width, height, obstacleConfig);
  return body;
}

export function createObstacleCircleBody(x: number, y: number, radius: number) {
  const body = Matter.Bodies.circle(x, y, radius, obstacleConfig);
  return body;
}
