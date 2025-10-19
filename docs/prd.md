# CollabCanvas Pong Game Pivot - Brownfield Enhancement PRD

## Intro Project Analysis and Context

### Existing Project Overview

**Analysis Source**: IDE-based fresh analysis

**Current Project State**: 
CollabCanvas is a real-time collaborative canvas application built with Next.js 15, react-konva, and Supabase. The system currently provides:
- Real-time collaborative canvas with rectangle/ellipse creation and manipulation
- Multi-user ownership system with claim/release functionality
- Live multiplayer cursors and presence awareness
- User authentication and session management
- Canvas operations service with optimistic UI updates
- Dual-channel real-time sync (broadcast + database subscriptions)

### Available Documentation Analysis

✅ **Tech Stack Documentation** - Available in memory-bank/techContext.md
✅ **Source Tree/Architecture** - Available in memory-bank/systemPatterns.md  
✅ **API Documentation** - Available in lib/canvas/CanvasOperations.ts
✅ **External API Documentation** - Supabase integration documented
✅ **Technical Debt Documentation** - Available in memory-bank/progress.md
✅ **UX/UI Guidelines** - Available in components/ structure
✅ **Other**: Pong pivot concept, technical architecture, and epic documentation

**Assessment**: Excellent documentation foundation exists for this brownfield enhancement.

### Enhancement Scope Definition

**Enhancement Type**: 
✅ **New Feature Addition** - Adding game mode functionality
✅ **Integration with New Systems** - Matter.js physics engine integration
✅ **Performance/Scalability Improvements** - Physics loop optimization

**Enhancement Description**: 
Transform the existing collaborative canvas into a Pong-style game where canvas objects become interactive obstacles. Users will create obstacles on the canvas, start a game mode, control a paddle with arrow keys, and win by converting all obstacles to green through ball collision.

**Impact Assessment**:
✅ **Moderate Impact** - Some existing code changes required
- Extends canvas_objects table with game_properties JSONB column
- Adds new real-time event types for game mechanics
- Creates game mode alongside existing canvas mode
- Integrates Matter.js physics engine with react-konva

### Goals and Background Context

**Goals**:
- Transform CollabCanvas from design tool to collaborative gaming platform
- Leverage existing real-time collaboration infrastructure for unique gaming experience
- Create single-player Pong game where canvas objects become interactive obstacles
- Maintain existing canvas functionality while adding game capabilities
- Establish foundation for future PvP multiplayer gaming features

**Background Context**:
This enhancement addresses the opportunity to pivot CollabCanvas into a unique gaming experience that combines design and gameplay. The existing architecture is perfectly positioned to support this evolution - the real-time collaboration system, canvas operations service, and database schema can be extended to support game mechanics without disrupting current functionality. The enhancement leverages the existing object manipulation system, ownership management, and real-time event system to create a seamless transition between canvas design mode and game mode.

### Change Log

| Change | Date | Version | Description | Author |
|--------|------|---------|-------------|---------|
| Initial PRD | Current | 1.0 | Created comprehensive PRD for Pong game pivot | Product Manager John |

## Requirements

### Functional Requirements

**FR1:** The existing CollabCanvas will integrate a new game mode alongside the current canvas mode without breaking existing functionality.

**FR2:** Users will be able to create obstacles on the canvas using existing rectangle and ellipse tools, with these objects automatically becoming game obstacles when game mode is activated.

**FR3:** The system will provide a "Start Game" button in the existing toolbar that switches from canvas mode to game mode, locking the viewport to prevent pan/zoom during gameplay.

**FR4:** Game mode will display a horizontal paddle (100px wide × 20px tall) positioned 5% above the bottom edge of the viewport that users can control with left/right arrow keys at 8 pixels per frame movement speed.

**FR5:** A ball (20px radius) will spawn 50px above the paddle and move with realistic physics at 6 pixels per frame initial speed, bouncing off obstacles, paddle, and viewport edges with perfect restitution.

**FR6:** When the ball collides with an obstacle, the obstacle will change color to green and apply a random effect (speed boost, speed reduction, or neutral bounce).

**FR7:** The game will end when either all visible obstacles are converted to green (win condition) or the ball falls through the bottom edge of the viewport (lose condition).

**FR8:** The system will maintain existing real-time collaboration features, allowing multiple users to see each other's cursors and presence during both canvas and game modes.

**FR9:** Users will be able to switch back to canvas mode after a game ends, with all obstacle color changes preserved.

**FR10:** The system will provide visual feedback for game events including collision effects, score updates, and win/lose notifications.

**FR11:** The system must support a minimum of 30+ obstacles for gameplay to begin, with no maximum limit for obstacle count.

### Non-Functional Requirements

**NFR1:** The physics engine must maintain smooth performance during gameplay without impacting existing canvas mode performance.

**NFR2:** Game mode must be completely optional and can be disabled via feature flag without affecting existing canvas functionality.

**NFR3:** Real-time synchronization for game events must maintain sub-100ms latency for smooth multiplayer experience.

**NFR4:** The system must gracefully handle network disconnections during gameplay with automatic reconnection and state recovery.

**NFR5:** Game state must be persisted to the database for session recovery and future PvP implementation.

**NFR6:** The physics engine must be deterministic to ensure consistent gameplay across different clients.

### Compatibility Requirements

**CR1:** Existing canvas operations API must remain functional - all current create, update, delete, and manipulation functions must continue working, but data structure changes are acceptable to support game functionality.

**CR2:** Database schema changes must be backward compatible - adding game_properties JSONB column to existing canvas_objects table without affecting existing queries or functionality.

**CR3:** UI changes must follow existing patterns - game mode integration must use existing toolbar, layout, and component structure without breaking current design system.

**CR4:** Integration compatibility must be maintained - existing real-time event system, ownership management, and authentication must continue working without modification.

## Technical Constraints and Integration Requirements

### Existing Technology Stack

**Languages**: TypeScript, JavaScript
**Frameworks**: Next.js 15 with App Router, React 18
**Database**: Supabase PostgreSQL with Row Level Security
**Infrastructure**: Vercel deployment, Supabase hosting
**External Dependencies**: react-konva, Konva.js, Supabase client, TailwindCSS, shadcn/ui components

### Integration Approach

**Database Integration Strategy**: Extend existing canvas_objects table with game_properties JSONB column, create new game_sessions table for game state management, maintain existing RLS policies while adding game-specific access controls.

**API Integration Strategy**: Extend existing CanvasOperations service with game-specific methods, maintain existing real-time event system while adding new game event types, preserve existing authentication and authorization patterns.

**Frontend Integration Strategy**: Add game mode components alongside existing canvas components, extend existing hooks (useCanvas, useRealtime) with game functionality, maintain existing UI patterns and component structure.

**Testing Integration Strategy**: Extend existing test patterns for canvas operations to include game functionality, maintain existing integration tests while adding game-specific test scenarios, preserve existing performance testing approaches.

### Detailed Technical Implementation

#### Matter.js Configuration

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

#### Database Schema Extensions

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

#### Real-time Event Structures

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

#### Game State Management Interfaces

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

#### Performance Monitoring Configuration

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

### Code Organization and Standards

**File Structure Approach**: Follow existing component organization in components/canvas/, extend lib/canvas/ with game-specific services, maintain existing hooks/ structure with game extensions, preserve existing types/ organization.

**Naming Conventions**: Follow existing camelCase for functions and variables, maintain existing PascalCase for components, preserve existing kebab-case for file names, extend existing naming patterns for game-specific entities.

**Coding Standards**: Maintain existing TypeScript strict mode compliance, preserve existing error handling patterns, continue existing logging and debugging approaches, extend existing code documentation standards.

**Documentation Standards**: Follow existing JSDoc patterns for new functions, maintain existing README structure, preserve existing code comments style, extend existing API documentation patterns.

### Deployment and Operations

**Build Process Integration**: Maintain existing Bun build process, preserve existing Next.js build configuration, continue existing TypeScript compilation, extend existing build scripts for game assets.

**Deployment Strategy**: Continue existing Vercel deployment pipeline, maintain existing environment variable management, preserve existing CI/CD processes, extend existing deployment scripts for game features.

**Monitoring and Logging**: Maintain existing console logging patterns, preserve existing error tracking approaches, continue existing performance monitoring, extend existing analytics for game metrics.

**Configuration Management**: Follow existing environment variable patterns, maintain existing Supabase configuration, preserve existing feature flag approaches, extend existing configuration for game settings.

### Risk Assessment and Mitigation

**Technical Risks**: Physics engine integration complexity mitigated by using proven Matter.js library, potential performance impact addressed through optional game mode and feature flags, network latency issues handled by existing robust real-time infrastructure.

**Integration Risks**: Breaking existing canvas functionality prevented by additive-only changes and comprehensive testing, database schema conflicts avoided through backward-compatible extensions, UI/UX inconsistencies prevented by following existing design patterns.

**Deployment Risks**: Build failures prevented by maintaining existing build process, deployment issues mitigated by preserving existing deployment pipeline, configuration errors avoided by following existing configuration patterns.

**Mitigation Strategies**: Comprehensive testing of existing functionality before and after changes, feature flags for easy rollback, incremental deployment approach, extensive documentation of integration points, regular validation of existing system integrity.

## Epic and Story Structure

### Epic Approach

**Epic Structure Decision**: Single comprehensive epic with three sequential stories that build upon each other, ensuring existing system integrity while delivering the complete Pong game experience.

Based on analysis of the existing CollabCanvas project, this enhancement should be structured as a single comprehensive epic because:
- The enhancement is a cohesive feature addition that transforms the canvas into a game
- All stories are interdependent and must work together to deliver the complete game experience
- The stories share common integration points (physics engine, game state, real-time events)
- Breaking this into multiple epics would create artificial boundaries that don't align with the natural flow of the enhancement

### Epic 1: Pong Game Pivot - Brownfield Enhancement

**Epic Goal**: Transform CollabCanvas into a collaborative Pong-style game where existing canvas objects become interactive obstacles, leveraging the current real-time collaboration infrastructure to create a unique gaming experience that combines design and gameplay.

**Integration Requirements**: Extend existing canvas_objects table with game_properties JSONB column, add new real-time event types for game mechanics, create game mode alongside canvas mode, integrate Matter.js physics engine with react-konva system.

#### Story 1.1: Physics Engine Integration

As a **developer**,
I want **to integrate Matter.js physics engine with the existing react-konva canvas system**,
so that **canvas objects can have realistic physics properties and collision detection**.

**Acceptance Criteria**:
1. Matter.js is installed and configured with react-konva using the specified engine configuration
2. Existing canvas objects can be converted to physics bodies using the defined obstacle configuration
3. Physics engine runs independently from canvas mode with 60fps target (16.666ms delta)
4. Basic collision detection is working between objects with proper restitution and friction settings
5. Physics calculations don't interfere with existing canvas operations
6. Physics engine can be initialized and destroyed without affecting canvas state
7. Collision events are properly detected and logged for debugging

**Integration Verification**:
- **IV1**: Existing canvas create/update/delete operations continue working normally
- **IV2**: Canvas mode performance remains unchanged when physics engine is loaded
- **IV3**: Physics engine can be disabled without affecting canvas functionality

#### Story 1.2: Game Mode Implementation

As a **user**,
I want **to start a game mode with ball, paddle, and basic collision detection**,
so that **I can play a Pong-style game using my canvas objects as obstacles**.

**Acceptance Criteria**:
1. "Start Game" button in toolbar switches from canvas mode to game mode
2. Horizontal paddle (100px × 20px) appears 5% above bottom edge, controllable with arrow keys at 8px/frame
3. Ball (20px radius) spawns 50px above paddle and moves with realistic physics at 6px/frame initial speed
4. Ball bounces off paddle, obstacles, and viewport edges with proper physics (restitution: 1.0 for ball, 0.8 for obstacles)
5. Game ends when ball falls through bottom (lose) or all obstacles turn green (win)
6. Viewport is locked during gameplay (no pan/zoom)
7. Game state is properly managed with start/end transitions
8. Real-time events are broadcast for ball movement and paddle position

**Integration Verification**:
- **IV1**: Existing canvas objects remain visible and functional after game ends
- **IV2**: Real-time collaboration features (cursors, presence) work in game mode
- **IV3**: Game mode can be exited and returned to canvas mode seamlessly

#### Story 1.3: Obstacle Effects System

As a **user**,
I want **obstacles to have different effects when hit by the ball**,
so that **the game has variety and strategic depth**.

**Acceptance Criteria**:
1. Obstacles change color to green when hit by ball
2. Random effects are applied: speed boost (1.2x), speed reduction (0.8x), or neutral bounce (1.0x)
3. Visual feedback shows collision effects and color changes with proper animation
4. Game tracks which obstacles have been converted using the game_properties JSONB field
5. Win condition is met when all 30+ obstacles are converted to green
6. Obstacle effects are preserved when returning to canvas mode
7. Effect distribution is configurable (default: 30% speed boost, 30% speed reduce, 40% neutral)
8. Collision events are properly broadcast to other users via real-time system
9. Game session and score data are persisted to database

**Integration Verification**:
- **IV1**: Existing canvas object manipulation (move, resize, delete) works on converted obstacles
- **IV2**: Obstacle color changes are persisted in database and visible to other users
- **IV3**: Game state is properly cleaned up when switching back to canvas mode

---

## Summary

This PRD defines a comprehensive brownfield enhancement that transforms CollabCanvas into a collaborative Pong-style game. The enhancement leverages existing architecture while adding game mechanics through three sequential stories that minimize risk to the current system.

**Key Success Factors**:
- Maintains existing canvas functionality throughout the enhancement
- Uses proven Matter.js physics engine for reliable game mechanics
- Follows existing patterns for seamless integration
- Provides clear rollback strategy through feature flags
- Establishes foundation for future PvP multiplayer features

**Next Steps**:
1. Review and approve this PRD
2. Begin implementation with Story 1.1 (Physics Engine Integration)
3. Validate each story's integration verification criteria
4. Prepare for future PvP enhancement based on this foundation

---

**Created By**: Product Manager John  
**Date**: Current session  
**Project**: CollabCanvas Pong Game Pivot  
**Type**: Brownfield Enhancement PRD
