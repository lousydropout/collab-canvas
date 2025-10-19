# Epic and Story Structure

## Epic Approach

**Epic Structure Decision**: Single comprehensive epic with three sequential stories that build upon each other, ensuring existing system integrity while delivering the complete Pong game experience.

Based on analysis of the existing CollabCanvas project, this enhancement should be structured as a single comprehensive epic because:
- The enhancement is a cohesive feature addition that transforms the canvas into a game
- All stories are interdependent and must work together to deliver the complete game experience
- The stories share common integration points (physics engine, game state, real-time events)
- Breaking this into multiple epics would create artificial boundaries that don't align with the natural flow of the enhancement

## Epic 1: Pong Game Pivot - Brownfield Enhancement

**Epic Goal**: Transform CollabCanvas into a collaborative Pong-style game where existing canvas objects become interactive obstacles, leveraging the current real-time collaboration infrastructure to create a unique gaming experience that combines design and gameplay.

**Integration Requirements**: Extend existing canvas_objects table with game_properties JSONB column, add new real-time event types for game mechanics, create game mode alongside canvas mode, integrate Matter.js physics engine with react-konva system.

### Story 1.1: Physics Engine Integration

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

### Story 1.2: Game Mode Implementation

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

### Story 1.3: Obstacle Effects System

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
