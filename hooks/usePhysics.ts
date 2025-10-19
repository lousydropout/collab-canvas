import { useEffect, useRef, useState } from 'react';
import { PhysicsEngine } from '@/lib/physics/PhysicsEngine';
import { PhysicsEngineState, PhysicsMetrics } from '@/types/physics';

/**
 * Custom hook for managing physics engine in React components
 * Provides physics engine lifecycle management and state
 */
export function usePhysics(viewportWidth: number = 1920, viewportHeight: number = 1080) {
  const engineRef = useRef<PhysicsEngine | null>(null);
  const [state, setState] = useState<PhysicsEngineState>({
    isInitialized: false,
    isRunning: false,
    viewportWidth,
    viewportHeight,
    bodyCount: 0,
    fps: 0,
    frameTime: 0
  });

  // Initialize physics engine
  useEffect(() => {
    if (!engineRef.current) {
      engineRef.current = new PhysicsEngine();
      engineRef.current.initialize(viewportWidth, viewportHeight);
      
      setState(prev => ({
        ...prev,
        isInitialized: true,
        viewportWidth,
        viewportHeight
      }));
    }

    return () => {
      if (engineRef.current) {
        engineRef.current.destroy();
        engineRef.current = null;
        setState(prev => ({
          ...prev,
          isInitialized: false,
          isRunning: false
        }));
      }
    };
  }, [viewportWidth, viewportHeight]);

  // Update viewport bounds when dimensions change
  useEffect(() => {
    if (engineRef.current && state.isInitialized) {
      engineRef.current.updateViewportBounds(viewportWidth, viewportHeight);
      setState(prev => ({
        ...prev,
        viewportWidth,
        viewportHeight
      }));
    }
  }, [viewportWidth, viewportHeight, state.isInitialized]);

  // Performance monitoring
  useEffect(() => {
    if (!state.isRunning) return;

    const interval = setInterval(() => {
      if (engineRef.current) {
        const metrics = engineRef.current.getPerformanceMetrics();
        const bodies = engineRef.current.getAllBodies();
        
        setState(prev => ({
          ...prev,
          fps: metrics.fps,
          frameTime: metrics.frameTime,
          bodyCount: bodies.length
        }));
      }
    }, 1000); // Update every second

    return () => clearInterval(interval);
  }, [state.isRunning]);

  const start = () => {
    if (engineRef.current && !state.isRunning) {
      engineRef.current.start();
      setState(prev => ({ ...prev, isRunning: true }));
    }
  };

  const stop = () => {
    if (engineRef.current && state.isRunning) {
      engineRef.current.stop();
      setState(prev => ({ ...prev, isRunning: false }));
    }
  };

  const getEngine = () => {
    return engineRef.current?.getEngine() || null;
  };

  const getPhysicsEngine = () => {
    return engineRef.current;
  };

  const createBall = (x: number, y: number, radius: number) => {
    if (engineRef.current) {
      return engineRef.current.createBall(x, y, radius);
    }
    return null;
  };

  const createPaddle = (x: number, y: number, width: number, height: number) => {
    if (engineRef.current) {
      return engineRef.current.createPaddle(x, y, width, height);
    }
    return null;
  };

  const createObstacle = (x: number, y: number, width: number, height: number) => {
    if (engineRef.current) {
      return engineRef.current.createObstacle(x, y, width, height);
    }
    return null;
  };

  const createObstacleCircle = (x: number, y: number, radius: number) => {
    if (engineRef.current) {
      return engineRef.current.createObstacleCircle(x, y, radius);
    }
    return null;
  };

  const removeBody = (body: any) => {
    if (engineRef.current) {
      engineRef.current.removeBody(body);
    }
  };

  const onCollision = (callback: (pairs: any[]) => void) => {
    if (engineRef.current) {
      engineRef.current.onCollision(callback);
    }
  };

  const onCollisionEnd = (callback: (pairs: any[]) => void) => {
    if (engineRef.current) {
      engineRef.current.onCollisionEnd(callback);
    }
  };

  return {
    state,
    start,
    stop,
    getEngine,
    getPhysicsEngine,
    createBall,
    createPaddle,
    createObstacle,
    createObstacleCircle,
    removeBody,
    onCollision,
    onCollisionEnd
  };
}
