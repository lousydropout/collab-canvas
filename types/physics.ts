import Matter from 'matter-js';

/**
 * Extended CanvasObject interface with physics body reference
 * Extends the existing CanvasObject type to include physics properties
 */
export interface PhysicsCanvasObject {
  id: string;
  type: 'rectangle' | 'ellipse';
  x: number;
  y: number;
  width: number;
  height: number;
  color: string;
  rotation: number;
  owner: string | null;
  created_by: string;
  z_index: number;
  
  // Physics properties
  physicsBody?: Matter.Body;
  isPhysicsEnabled?: boolean;
  physicsType?: 'obstacle' | 'ball' | 'paddle';
}

/**
 * Physics body types for different game objects
 */
export type PhysicsBodyType = 'obstacle' | 'ball' | 'paddle';

/**
 * Physics configuration for different body types
 */
export interface PhysicsConfig {
  restitution: number;
  friction: number;
  frictionAir?: number;
  density: number;
  isStatic?: boolean;
  inertia?: number;
}

/**
 * Physics engine state
 */
export interface PhysicsEngineState {
  isInitialized: boolean;
  isRunning: boolean;
  viewportWidth: number;
  viewportHeight: number;
  bodyCount: number;
  fps: number;
  frameTime: number;
}

/**
 * Collision event data
 */
export interface CollisionEvent {
  bodyA: Matter.Body;
  bodyB: Matter.Body;
  collision: Matter.Collision;
  timestamp: number;
}

/**
 * Physics performance metrics
 */
export interface PhysicsMetrics {
  fps: number;
  frameTime: number;
  bodyCount: number;
  collisionCount: number;
  memoryUsage?: number;
}

/**
 * Physics engine configuration options
 */
export interface PhysicsEngineOptions {
  viewportWidth: number;
  viewportHeight: number;
  enableDebug?: boolean;
  enablePerformanceMonitoring?: boolean;
}

