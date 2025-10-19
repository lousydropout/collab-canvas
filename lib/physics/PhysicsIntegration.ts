/**
 * Physics Integration Utilities
 * 
 * This module provides utilities for converting between Konva.js canvas objects and
 * Matter.js physics bodies. Handles the bridge between the rendering layer and
 * physics simulation with proper synchronization and validation.
 * 
 * Features:
 * - Canvas object to physics body conversion
 * - Bidirectional synchronization between Konva and Matter.js
 * - Physics body validation and configuration
 * - Batch conversion operations
 * - Physics enable/disable functionality
 * - Type-safe operations with proper error handling
 */

import Matter from 'matter-js';
import { CanvasObject } from '@/types/canvas';
import { 
  createObstacleBody, 
  createObstacleCircleBody,
  obstacleConfig 
} from '@/lib/physics/PhysicsConfig';

/**
 * Physics Integration Utilities
 * Handles conversion between Konva shapes and Matter.js physics bodies
 */
export class PhysicsIntegration {
  /**
   * Convert a CanvasObject to a Matter.js physics body
   * @param canvasObject - The canvas object to convert
   * @returns Matter.js Body or null if conversion fails
   */
  static convertToPhysicsBody(canvasObject: CanvasObject): Matter.Body | null {
    try {
      const { x, y, width, height, type } = canvasObject;
      
      // Calculate center position for Matter.js (Matter.js uses center coordinates)
      const centerX = x + width / 2;
      const centerY = y + height / 2;
      
      let body: Matter.Body;
      
      if (type === 'rectangle') {
        body = createObstacleBody(centerX, centerY, width, height);
      } else if (type === 'ellipse') {
        // For ellipses, use the average of width and height as radius
        const radius = Math.min(width, height) / 2;
        body = createObstacleCircleBody(centerX, centerY, radius);
      } else {
        console.warn(`Unknown canvas object type: ${type}`);
        return null;
      }
      
      // Store reference to original canvas object
      (body as any).canvasObjectId = canvasObject.id;
      (body as any).physicsType = 'obstacle';
      
      return body;
    } catch (error) {
      console.error('Error converting canvas object to physics body:', error);
      return null;
    }
  }

  /**
   * Convert multiple CanvasObjects to physics bodies
   * @param canvasObjects - Array of canvas objects to convert
   * @returns Array of Matter.js Bodies
   */
  static convertMultipleToPhysicsBodies(canvasObjects: CanvasObject[]): Matter.Body[] {
    const bodies: Matter.Body[] = [];
    
    for (const canvasObject of canvasObjects) {
      const body = this.convertToPhysicsBody(canvasObject);
      if (body) {
        bodies.push(body);
      }
    }
    
    return bodies;
  }

  /**
   * Synchronize physics body position with canvas object
   * @param body - Matter.js physics body
   * @param canvasObject - Canvas object to sync with
   */
  static syncPhysicsBodyWithCanvas(body: Matter.Body, canvasObject: CanvasObject): void {
    if (!body || !canvasObject) return;
    
    // Update physics body position to match canvas object
    const centerX = canvasObject.x + canvasObject.width / 2;
    const centerY = canvasObject.y + canvasObject.height / 2;
    
    Matter.Body.setPosition(body, { x: centerX, y: centerY });
    
    // Update rotation if needed
    if (canvasObject.rotation !== 0) {
      Matter.Body.setAngle(body, (canvasObject.rotation * Math.PI) / 180);
    }
  }

  /**
   * Synchronize canvas object position with physics body
   * @param canvasObject - Canvas object to update
   * @param body - Matter.js physics body
   */
  static syncCanvasObjectWithPhysics(canvasObject: CanvasObject, body: Matter.Body): void {
    if (!canvasObject || !body) return;
    
    // Update canvas object position to match physics body center
    const centerX = body.position.x;
    const centerY = body.position.y;
    
    canvasObject.x = centerX - canvasObject.width / 2;
    canvasObject.y = centerY - canvasObject.height / 2;
    
    // Update rotation if needed
    if (body.angle !== 0) {
      canvasObject.rotation = (body.angle * 180) / Math.PI;
    }
  }

  /**
   * Check if a canvas object should have physics enabled
   * @param canvasObject - Canvas object to check
   * @returns true if physics should be enabled
   */
  static shouldEnablePhysics(canvasObject: CanvasObject): boolean {
    // Enable physics for all canvas objects by default
    // This can be extended with more complex logic later
    return true;
  }

  /**
   * Get physics configuration for a canvas object
   * @param canvasObject - Canvas object to get config for
   * @returns Physics configuration object
   */
  static getPhysicsConfig(canvasObject: CanvasObject): typeof obstacleConfig {
    // All canvas objects use obstacle configuration for now
    // This can be extended to support different physics types
    return obstacleConfig;
  }

  /**
   * Create a physics body from canvas object data
   * @param canvasObject - Canvas object data
   * @returns Matter.js Body
   */
  static createPhysicsBodyFromCanvasObject(canvasObject: CanvasObject): Matter.Body | null {
    const body = this.convertToPhysicsBody(canvasObject);
    
    if (body) {
      // Mark the canvas object as having physics enabled
      canvasObject.isPhysicsEnabled = true;
      canvasObject.physicsType = 'obstacle';
      canvasObject.physicsBody = body;
    }
    
    return body;
  }

  /**
   * Remove physics from a canvas object
   * @param canvasObject - Canvas object to remove physics from
   */
  static removePhysicsFromCanvasObject(canvasObject: CanvasObject): void {
    canvasObject.isPhysicsEnabled = false;
    canvasObject.physicsType = undefined;
    canvasObject.physicsBody = undefined;
  }

  /**
   * Validate physics body configuration
   * @param body - Matter.js body to validate
   * @returns true if configuration is valid
   */
  static validatePhysicsBody(body: Matter.Body): boolean {
    if (!body) return false;
    
    // Check required properties
    if (typeof body.position.x !== 'number' || typeof body.position.y !== 'number') {
      return false;
    }
    
    if (typeof body.restitution !== 'number' || typeof body.friction !== 'number') {
      return false;
    }
    
    return true;
  }
}
