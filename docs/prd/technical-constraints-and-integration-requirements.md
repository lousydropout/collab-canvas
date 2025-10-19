# Technical Constraints and Integration Requirements

## Existing Technology Stack

**Languages**: TypeScript, JavaScript
**Frameworks**: Next.js 15 with App Router, React 18
**Database**: Supabase PostgreSQL with Row Level Security
**Infrastructure**: Vercel deployment, Supabase hosting
**External Dependencies**: react-konva, Konva.js, Supabase client, TailwindCSS, shadcn/ui components

## Integration Approach

**Database Integration Strategy**: Extend existing canvas_objects table with game_properties JSONB column, create new game_sessions table for game state management, maintain existing RLS policies while adding game-specific access controls.

**API Integration Strategy**: Extend existing CanvasOperations service with game-specific methods, maintain existing real-time event system while adding new game event types, preserve existing authentication and authorization patterns.

**Frontend Integration Strategy**: Add game mode components alongside existing canvas components, extend existing hooks (useCanvas, useRealtime) with game functionality, maintain existing UI patterns and component structure.

**Testing Integration Strategy**: Extend existing test patterns for canvas operations to include game functionality, maintain existing integration tests while adding game-specific test scenarios, preserve existing performance testing approaches.

## Detailed Technical Implementation

### Matter.js Configuration

```typescript
// Matter.js Engine Configuration
const engineConfig = {
  gravity: { x: 0, y: 0 },           // No gravity for Pong-style gameplay
  timing: {
    timestamp: 0,
    timeScale: 1,
    delta: 16.666,                   // 60fps target
  },
  world: {
    bounds: {
      min: { x: 0, y: 0 },
      max: { x: viewportWidth, y: viewportHeight }
    }
  }
}

// Physics Body Configurations
const ballConfig = {
  restitution: 1.0,                  // Perfect bounce
  friction: 0,                       // No friction
  frictionAir: 0.01,                 // Minimal air resistance
  density: 0.001,                    // Light weight
  inertia: Infinity                   // Prevent rotation
}

const paddleConfig = {
  restitution: 0.8,                  // Good bounce
  friction: 0.1,                     // Slight friction
  isStatic: false,                   // Can move
  density: 0.001
}

const obstacleConfig = {
  restitution: 0.8,                  // Good bounce
  friction: 0.1,                      // Slight friction
  isStatic: true,                    // Immovable
  density: 0.001
}
```

### Database Schema Extensions

```sql
-- Extend existing canvas_objects table
ALTER TABLE canvas_objects 
ADD COLUMN game_properties JSONB DEFAULT '{}';

-- Create game_sessions table
CREATE TABLE game_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  canvas_id TEXT NOT NULL DEFAULT 'default',
  mode TEXT NOT NULL CHECK (mode IN ('single', 'pvp')),
  status TEXT NOT NULL DEFAULT 'waiting' CHECK (status IN ('waiting', 'active', 'paused', 'ended')),
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  ended_at TIMESTAMPTZ,
  game_config JSONB DEFAULT '{}',
  final_score JSONB DEFAULT '{}'
);

-- Create game_scores table
CREATE TABLE game_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_session_id UUID REFERENCES game_sessions(id) ON DELETE CASCADE,
  player_id UUID REFERENCES auth.users(id),
  score INTEGER DEFAULT 0,
  objects_converted INTEGER DEFAULT 0,
  game_duration INTEGER DEFAULT 0, -- in seconds
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add RLS policies for game tables
ALTER TABLE game_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_scores ENABLE ROW LEVEL SECURITY;

-- Game sessions: Users can read all, create/update their own
CREATE POLICY "Users can view all game sessions" ON game_sessions
  FOR SELECT USING (true);

CREATE POLICY "Users can create game sessions" ON game_sessions
  FOR INSERT WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can update their own game sessions" ON game_sessions
  FOR UPDATE USING (auth.uid() = created_by);

-- Game scores: Users can read all, create/update their own
CREATE POLICY "Users can view all game scores" ON game_scores
  FOR SELECT USING (true);

CREATE POLICY "Users can create game scores" ON game_scores
  FOR INSERT WITH CHECK (auth.uid() = player_id);

CREATE POLICY "Users can update their own game scores" ON game_scores
  FOR UPDATE USING (auth.uid() = player_id);
```

### Real-time Event Structures

```typescript
// Extended Realtime Events Interface
interface GameRealtimeEvents {
  // Game Management Events
  game_started: {
    gameId: string;
    mode: 'single' | 'pvp';
    playerId: string;
    timestamp: string;
    gameConfig: {
      paddleSpeed: number;
      ballSpeed: number;
      obstacleCount: number;
    };
  };
  
  game_ended: {
    gameId: string;
    reason: 'win' | 'lose' | 'timeout' | 'disconnect';
    winner?: string;
    finalScore: {
      objectsConverted: number;
      gameDuration: number;
    };
    timestamp: string;
  };
  
  // Physics Update Events
  ball_moved: {
    gameId: string;
    position: { x: number; y: number };
    velocity: { x: number; y: number };
    timestamp: string;
  };
  
  paddle_moved: {
    gameId: string;
    playerId: string;
    position: { x: number; y: number };
    timestamp: string;
  };
  
  // Collision Events
  object_hit: {
    gameId: string;
    objectId: string;
    ballPosition: { x: number; y: number };
    ballVelocity: { x: number; y: number };
    effectApplied: 'speed_boost' | 'speed_reduce' | 'neutral';
    newColor: string;
    timestamp: string;
  };
  
  wall_hit: {
    gameId: string;
    wall: 'top' | 'bottom' | 'left' | 'right';
    ballPosition: { x: number; y: number };
    ballVelocity: { x: number; y: number };
    timestamp: string;
  };
  
  // Game State Events
  score_updated: {
    gameId: string;
    playerId: string;
    newScore: number;
    objectsConverted: number;
    timestamp: string;
  };
  
  obstacle_converted: {
    gameId: string;
    objectId: string;
    newColor: string;
    effectApplied: string;
    timestamp: string;
  };
  
  // Game Control Events
  game_paused: {
    gameId: string;
    playerId: string;
    timestamp: string;
  };
  
  game_resumed: {
    gameId: string;
    playerId: string;
    timestamp: string;
  };
}
```

### Game State Management Interfaces

```typescript
// Game State Interface
interface GameState {
  mode: 'canvas' | 'single-player' | 'pvp';
  status: 'waiting' | 'active' | 'paused' | 'ended';
  gameId?: string;
  gameObjects: {
    paddle?: CanvasObject;
    ball?: CanvasObject;
    obstacles: CanvasObject[];
  };
  physics: {
    ballVelocity: { x: number; y: number };
    paddlePosition: { x: number; y: number };
    lastUpdate: string;
  };
  gameRules: {
    paddleSpeed: number;
    ballSpeed: number;
    winCondition: 'all-green' | 'score-based';
    timeLimit?: number;
    minObstacles: number;
  };
  score: {
    objectsConverted: number;
    gameDuration: number;
    startTime?: string;
  };
}

// Obstacle Effect Interface
interface ObstacleEffect {
  type: 'neutral' | 'speed_boost' | 'speed_reduce' | 'angle_reflect' | 'angle_transmit';
  value: number;
  angleModifier?: number;
  passThroughChance?: number;
  description: string;
}

// Game Configuration Interface
interface GameConfig {
  paddleSpeed: number;           // pixels per frame
  ballSpeed: number;             // pixels per frame
  paddleHeight: number;          // pixels
  paddleWidth: number;           // pixels
  ballRadius: number;            // pixels
  minObstacles: number;          // minimum obstacles required
  maxObstacles?: number;         // maximum obstacles allowed
  gameTimeLimit?: number;        // seconds
  effectDistribution: {
    speedBoost: number;          // percentage
    speedReduce: number;         // percentage
    neutral: number;             // percentage
  };
}
```

### Performance Monitoring Configuration

```typescript
// Performance Monitoring Interface
interface GamePerformanceMetrics {
  physics: {
    fps: number;                 // Physics loop FPS
    frameTime: number;           // Average frame time in ms
    collisionChecks: number;     // Collision checks per frame
  };
  network: {
    eventLatency: number;        // Average event latency in ms
    eventsPerSecond: number;     // Network events per second
    droppedEvents: number;       // Dropped events count
  };
  rendering: {
    renderFps: number;           // Rendering FPS
    drawCalls: number;           // Draw calls per frame
    memoryUsage: number;         // Memory usage in MB
  };
  game: {
    activeObjects: number;       // Active physics objects
    totalObstacles: number;      // Total obstacles in game
    convertedObstacles: number;   // Converted obstacles count
  };
}
```

## Code Organization and Standards

**File Structure Approach**: Follow existing component organization in components/canvas/, extend lib/canvas/ with game-specific services, maintain existing hooks/ structure with game extensions, preserve existing types/ organization.

**Naming Conventions**: Follow existing camelCase for functions and variables, maintain existing PascalCase for components, preserve existing kebab-case for file names, extend existing naming patterns for game-specific entities.

**Coding Standards**: Maintain existing TypeScript strict mode compliance, preserve existing error handling patterns, continue existing logging and debugging approaches, extend existing code documentation standards.

**Documentation Standards**: Follow existing JSDoc patterns for new functions, maintain existing README structure, preserve existing code comments style, extend existing API documentation patterns.

## Deployment and Operations

**Build Process Integration**: Maintain existing Bun build process, preserve existing Next.js build configuration, continue existing TypeScript compilation, extend existing build scripts for game assets.

**Deployment Strategy**: Continue existing Vercel deployment pipeline, maintain existing environment variable management, preserve existing CI/CD processes, extend existing deployment scripts for game features.

**Monitoring and Logging**: Maintain existing console logging patterns, preserve existing error tracking approaches, continue existing performance monitoring, extend existing analytics for game metrics.

**Configuration Management**: Follow existing environment variable patterns, maintain existing Supabase configuration, preserve existing feature flag approaches, extend existing configuration for game settings.

## Risk Assessment and Mitigation

**Technical Risks**: Physics engine integration complexity mitigated by using proven Matter.js library, potential performance impact addressed through optional game mode and feature flags, network latency issues handled by existing robust real-time infrastructure.

**Integration Risks**: Breaking existing canvas functionality prevented by additive-only changes and comprehensive testing, database schema conflicts avoided through backward-compatible extensions, UI/UX inconsistencies prevented by following existing design patterns.

**Deployment Risks**: Build failures prevented by maintaining existing build process, deployment issues mitigated by preserving existing deployment pipeline, configuration errors avoided by following existing configuration patterns.

**Mitigation Strategies**: Comprehensive testing of existing functionality before and after changes, feature flags for easy rollback, incremental deployment approach, extensive documentation of integration points, regular validation of existing system integrity.
