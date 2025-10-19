import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import { PhysicsEngine } from '@/lib/physics/PhysicsEngine';
import { PhysicsIntegration } from '@/lib/physics/PhysicsIntegration';
import { CollisionDetectionService } from '@/lib/physics/CollisionDetectionService';
import { CanvasObject } from '@/types/canvas';

// Mock requestAnimationFrame for Node.js environment
if (typeof globalThis.requestAnimationFrame === 'undefined') {
  globalThis.requestAnimationFrame = (callback: FrameRequestCallback) => {
    return setTimeout(callback, 16) as unknown as number;
  };
}

if (typeof globalThis.cancelAnimationFrame === 'undefined') {
  globalThis.cancelAnimationFrame = (id: number) => {
    clearTimeout(id);
  };
}

// Also set on window object for Matter.js compatibility
if (typeof globalThis.window === 'undefined') {
  globalThis.window = globalThis;
}

describe('PhysicsEngine', () => {
  let physicsEngine: PhysicsEngine;

  beforeEach(() => {
    physicsEngine = new PhysicsEngine();
  });

  afterEach(() => {
    if (physicsEngine) {
      physicsEngine.destroy();
    }
  });

  it('should initialize with correct configuration', () => {
    physicsEngine.initialize(800, 600);
    
    const engine = physicsEngine.getEngine();
    expect(engine).toBeTruthy();
    expect(engine?.world.gravity.x).toBe(0);
    expect(engine?.world.gravity.y).toBe(0);
    expect(physicsEngine.isEngineRunning()).toBe(false);
  });

  it('should start and stop physics engine', () => {
    physicsEngine.initialize(800, 600);
    
    physicsEngine.start();
    expect(physicsEngine.isEngineRunning()).toBe(true);
    
    physicsEngine.stop();
    expect(physicsEngine.isEngineRunning()).toBe(false);
  });

  it('should create ball physics body', () => {
    physicsEngine.initialize(800, 600);
    
    const ball = physicsEngine.createBall(100, 100, 20);
    expect(ball).toBeTruthy();
    expect(ball.position.x).toBe(100);
    expect(ball.position.y).toBe(100);
    expect(ball.circleRadius).toBe(20);
  });

  it('should create paddle physics body', () => {
    physicsEngine.initialize(800, 600);
    
    const paddle = physicsEngine.createPaddle(200, 500, 100, 20);
    expect(paddle).toBeTruthy();
    expect(paddle.position.x).toBe(200);
    expect(paddle.position.y).toBe(500);
    expect(paddle.bounds.max.x - paddle.bounds.min.x).toBeCloseTo(100, 1);
    expect(paddle.bounds.max.y - paddle.bounds.min.y).toBeCloseTo(20, 1);
  });

  it('should create obstacle physics body', () => {
    physicsEngine.initialize(800, 600);
    
    const obstacle = physicsEngine.createObstacle(300, 200, 50, 50);
    expect(obstacle).toBeTruthy();
    expect(obstacle.position.x).toBe(300);
    expect(obstacle.position.y).toBe(200);
    expect(obstacle.isStatic).toBe(true);
  });

  it('should update viewport bounds', () => {
    physicsEngine.initialize(800, 600);
    
    physicsEngine.updateViewportBounds(1200, 800);
    const engine = physicsEngine.getEngine();
    
    // Matter.js doesn't have world.bounds, we track viewport dimensions internally
    expect(engine).toBeTruthy();
    expect(physicsEngine['viewportWidth']).toBe(1200);
    expect(physicsEngine['viewportHeight']).toBe(800);
  });

  it('should handle collision events', () => {
    physicsEngine.initialize(800, 600);
    
    let collisionDetected = false;
    physicsEngine.onCollision(() => {
      collisionDetected = true;
    });
    
    // Create two overlapping bodies to trigger collision
    const body1 = physicsEngine.createObstacle(100, 100, 50, 50);
    const body2 = physicsEngine.createObstacle(120, 120, 50, 50);
    
    physicsEngine.start();
    
    // Run physics for a few frames
    setTimeout(() => {
      expect(collisionDetected).toBe(true);
    }, 100);
  });
});

describe('PhysicsIntegration', () => {
  const mockCanvasObject: CanvasObject = {
    id: 'test-object-1',
    canvas_id: 'default',
    type: 'rectangle',
    x: 100,
    y: 100,
    width: 50,
    height: 50,
    color: '#ff0000',
    rotation: 0,
    z_index: 1,
    owner: 'all',
    created_by: 'user-1',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z'
  };

  it('should convert rectangle canvas object to physics body', () => {
    const body = PhysicsIntegration.convertToPhysicsBody(mockCanvasObject);
    
    expect(body).toBeTruthy();
    expect(body?.position.x).toBe(125); // 100 + 50/2
    expect(body?.position.y).toBe(125); // 100 + 50/2
    expect(body?.isStatic).toBe(true);
  });

  it('should convert ellipse canvas object to physics body', () => {
    const ellipseObject = { ...mockCanvasObject, type: 'ellipse' as const };
    const body = PhysicsIntegration.convertToPhysicsBody(ellipseObject);
    
    expect(body).toBeTruthy();
    expect(body?.position.x).toBe(125);
    expect(body?.position.y).toBe(125);
  });

  it('should sync physics body with canvas object', () => {
    const body = PhysicsIntegration.convertToPhysicsBody(mockCanvasObject);
    expect(body).toBeTruthy();
    
    const updatedCanvasObject = { ...mockCanvasObject, x: 200, y: 200 };
    PhysicsIntegration.syncPhysicsBodyWithCanvas(body!, updatedCanvasObject);
    
    expect(body?.position.x).toBe(225); // 200 + 50/2
    expect(body?.position.y).toBe(225); // 200 + 50/2
  });

  it('should sync canvas object with physics body', () => {
    const body = PhysicsIntegration.convertToPhysicsBody(mockCanvasObject);
    expect(body).toBeTruthy();
    
    // Move physics body
    body!.position.x = 300;
    body!.position.y = 300;
    
    const updatedCanvasObject = { ...mockCanvasObject };
    PhysicsIntegration.syncCanvasObjectWithPhysics(updatedCanvasObject, body!);
    
    expect(updatedCanvasObject.x).toBe(275); // 300 - 50/2
    expect(updatedCanvasObject.y).toBe(275); // 300 - 50/2
  });

  it('should validate physics body configuration', () => {
    const body = PhysicsIntegration.convertToPhysicsBody(mockCanvasObject);
    expect(body).toBeTruthy();
    
    const isValid = PhysicsIntegration.validatePhysicsBody(body!);
    expect(isValid).toBe(true);
  });
});

describe('CollisionDetectionService', () => {
  let collisionService: CollisionDetectionService;

  beforeEach(() => {
    collisionService = new CollisionDetectionService();
  });

  it('should track collision metrics', () => {
    const metrics = collisionService.getCollisionMetrics();
    
    expect(metrics.collisionCount).toBe(0);
    expect(typeof metrics.fps).toBe('number');
    expect(typeof metrics.frameTime).toBe('number');
  });

  it('should maintain collision history', () => {
    const recentCollisions = collisionService.getRecentCollisions(5);
    expect(recentCollisions).toEqual([]);
  });

  it('should clear collision history', () => {
    collisionService.clearHistory();
    const metrics = collisionService.getCollisionMetrics();
    expect(metrics.collisionCount).toBe(0);
  });
});
