# Pong Pivot Technical Architecture

## 🏗️ Technical Decisions

### Physics Engine Selection
**Chosen**: Matter.js
**Reasoning**:
- Excellent react-konva integration
- Lightweight (~200KB)
- Great documentation and community support
- Built-in collision detection
- Perfect for 2D games like Pong

**Alternatives Considered**:
- Planck.js: More precise but steeper learning curve
- Cannon.js: 3D-focused, overkill for 2D
- Custom physics: Too complex for MVP

### Data Persistence Strategy
**Hybrid Approach**:
- **Database**: Game scores, obstacle states, game sessions
- **Real-time**: Ball position, paddle movement, collision events
- **Local State**: Physics calculations, temporary game state

### Performance Architecture
- **Physics Loop**: 60fps local, 30fps network sync
- **Collision Detection**: Matter.js built-in spatial partitioning
- **Network Optimization**: Delta compression for frequent updates
- **Memory Management**: Cleanup unused game sessions

## 🎮 Game State Management

### Core Interfaces
```typescript
interface GameState {
  mode: 'canvas' | 'single-player' | 'pvp'
  status: 'waiting' | 'active' | 'paused' | 'ended'
  gameObjects: {
    paddle: CanvasObject
    ball: CanvasObject
    obstacles: CanvasObject[]
  }
  physics: {
    ballVelocity: { x: number, y: number }
    paddlePosition: { x: number, y: number }
    lastUpdate: string
  }
  gameRules: {
    paddleSpeed: number
    ballSpeed: number
    winCondition: 'all-green' | 'score-based'
    timeLimit?: number
  }
}

interface ObstacleEffect {
  type: 'neutral' | 'speed_boost' | 'speed_reduce' | 'angle_reflect' | 'angle_transmit'
  value: number
  angleModifier?: number
  passThroughChance?: number
}
```

### Database Schema Extensions
```sql
-- Game sessions table
CREATE TABLE game_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  canvas_id TEXT NOT NULL DEFAULT 'default',
  mode TEXT NOT NULL CHECK (mode IN ('single', 'pvp')),
  status TEXT NOT NULL DEFAULT 'waiting',
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  ended_at TIMESTAMPTZ
);

-- Game scores table
CREATE TABLE game_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_session_id UUID REFERENCES game_sessions(id),
  player_id UUID REFERENCES auth.users(id),
  score INTEGER DEFAULT 0,
  objects_converted INTEGER DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Extend canvas_objects for game properties
ALTER TABLE canvas_objects ADD COLUMN game_properties JSONB DEFAULT '{}';
```

## 🔄 Real-time Event System

### Extended Event Types
```typescript
interface GameEvents {
  // Game management
  game_started: { gameId: string, mode: 'single' | 'pvp' }
  game_ended: { gameId: string, winner?: string, reason: 'win' | 'lose' | 'timeout' }
  
  // Physics updates
  ball_moved: { position: {x: number, y: number}, velocity: {x: number, y: number} }
  paddle_moved: { playerId: string, position: {x: number, y: number} }
  
  // Collision events
  object_hit: { objectId: string, newColor: string, effectApplied: string }
  wall_hit: { wall: 'top' | 'bottom' | 'left' | 'right' }
  
  // Game state changes
  score_updated: { playerId: string, newScore: number }
  obstacle_converted: { objectId: string, newColor: string }
}
```

### Broadcast vs Persistence
```typescript
// Broadcast only (high frequency)
const broadcastOnly = [
  'ball_moved',      // 60fps
  'paddle_moved',    // 30fps
  'wall_hit',        // Occasional
  'game_phase'       // State changes
]

// Persist + Broadcast (medium frequency)
const persistAndBroadcast = [
  'object_hit',      // Color changes
  'score_updated',   // Score changes
  'obstacle_converted', // Object state
  'game_started',    // Game management
  'game_ended'       // Game results
]

// Persist only (low frequency)
const persistOnly = [
  'game_session_created', // Session metadata
  'final_scores',         // Game history
  'player_achievements'   // Statistics
]
```

## 🎯 Physics Integration

### Matter.js Integration Pattern
```typescript
class GamePhysics {
  private engine: Matter.Engine
  private world: Matter.World
  private bodies: Map<string, Matter.Body> = new Map()
  
  constructor() {
    this.engine = Matter.Engine.create()
    this.world = this.engine.world
    
    // Configure for Pong-style gameplay
    this.engine.world.gravity.x = 0
    this.engine.world.gravity.y = 0
  }
  
  // Create physics body for Konva shape
  createBody(id: string, shape: Konva.Shape, type: 'ball' | 'paddle' | 'obstacle') {
    const bounds = shape.getClientRect()
    
    let body: Matter.Body
    
    if (type === 'ball') {
      body = Matter.Bodies.circle(
        bounds.x + bounds.width / 2,
        bounds.y + bounds.height / 2,
        bounds.width / 2,
        { 
          restitution: 1.0, // Perfect bounce
          friction: 0,
          frictionAir: 0.01
        }
      )
    } else {
      body = Matter.Bodies.rectangle(
        bounds.x + bounds.width / 2,
        bounds.y + bounds.height / 2,
        bounds.width,
        bounds.height,
        { 
          isStatic: type === 'obstacle',
          restitution: 0.8
        }
      )
    }
    
    Matter.World.add(this.world, body)
    this.bodies.set(id, body)
    
    return body
  }
  
  // Update Konva shapes based on physics
  updateKonvaShapes(konvaShapes: Map<string, Konva.Shape>) {
    this.bodies.forEach((body, id) => {
      const konvaShape = konvaShapes.get(id)
      if (konvaShape) {
        konvaShape.position({
          x: body.position.x - konvaShape.width() / 2,
          y: body.position.y - konvaShape.height() / 2
        })
        konvaShape.rotation(body.angle)
      }
    })
  }
}
```

### Collision Detection Strategy
```typescript
class CollisionHandler {
  private obstacleEffects: Map<string, ObstacleEffect> = new Map()
  
  handleCollision(ball: Matter.Body, obstacle: Matter.Body) {
    const obstacleId = this.getObstacleId(obstacle)
    const effect = this.obstacleEffects.get(obstacleId)
    
    if (!effect) return
    
    switch (effect.type) {
      case 'speed_boost':
        this.applySpeedChange(ball, effect.value)
        break
      case 'speed_reduce':
        this.applySpeedChange(ball, effect.value)
        break
      case 'angle_reflect':
        this.applyAngleChange(ball, effect.angleModifier)
        break
      case 'angle_transmit':
        this.applyPassThrough(ball, effect.passThroughChance)
        break
    }
    
    // Convert obstacle to green
    this.convertObstacleToGreen(obstacleId)
  }
  
  private applySpeedChange(ball: Matter.Body, multiplier: number) {
    const velocity = ball.velocity
    Matter.Body.setVelocity(ball, {
      x: velocity.x * multiplier,
      y: velocity.y * multiplier
    })
  }
  
  private applyAngleChange(ball: Matter.Body, angleModifier: number) {
    const angle = Math.atan2(ball.velocity.y, ball.velocity.x)
    const newAngle = angle + (angleModifier * Math.PI / 180)
    const speed = Math.sqrt(ball.velocity.x ** 2 + ball.velocity.y ** 2)
    
    Matter.Body.setVelocity(ball, {
      x: Math.cos(newAngle) * speed,
      y: Math.sin(newAngle) * speed
    })
  }
}
```

## 🎮 Game Flow Architecture

### Single Player Flow
```typescript
class SinglePlayerGame {
  private physics: GamePhysics
  private collisionHandler: CollisionHandler
  private gameState: GameState
  
  async startGame() {
    // 1. Convert canvas objects to obstacles
    const obstacles = await this.convertCanvasObjectsToObstacles()
    
    // 2. Assign random effects
    obstacles.forEach(obstacle => {
      obstacle.effectType = this.getRandomEffect()
      obstacle.originalColor = obstacle.color
      obstacle.color = this.getRandomColor()
    })
    
    // 3. Create paddle and ball
    const paddle = await this.createPaddle()
    const ball = await this.createBall()
    
    // 4. Start physics loop
    this.startPhysicsLoop()
    
    // 5. Start game timer
    this.startGameTimer()
  }
  
  private async convertCanvasObjectsToObstacles() {
    // Get existing canvas objects
    const objects = await this.getCanvasObjects()
    
    // Filter to top half of viewport
    const viewportHeight = this.getViewportHeight()
    const obstacles = objects.filter(obj => 
      obj.y < viewportHeight / 2
    )
    
    // Ensure minimum obstacle count
    if (obstacles.length < 5) {
      throw new Error('Not enough obstacles. Create at least 5 objects in the top half.')
    }
    
    return obstacles
  }
  
  private checkWinCondition(): boolean {
    // Check if all obstacles are green
    const obstacles = this.gameState.gameObjects.obstacles
    return obstacles.every(obstacle => obstacle.color === '#00FF00')
  }
  
  private checkLoseCondition(): boolean {
    // Check if ball fell through bottom
    const ball = this.gameState.gameObjects.ball
    const viewportHeight = this.getViewportHeight()
    return ball.y > viewportHeight
  }
}
```

### PvP Flow (Future)
```typescript
class PvPGame {
  private players: Map<string, Player> = new Map()
  private gameSession: GameSession
  
  async startPvPGame(player1Id: string, player2Id: string) {
    // 1. Create game session
    this.gameSession = await this.createGameSession('pvp')
    
    // 2. Add players
    await this.addPlayer(player1Id, 'left')
    await this.addPlayer(player2Id, 'right')
    
    // 3. Create game objects
    await this.createGameObjects()
    
    // 4. Start real-time sync
    await this.startRealtimeSync()
    
    // 5. Start physics loop
    this.startPhysicsLoop()
  }
  
  private async startRealtimeSync() {
    // Subscribe to game events
    this.subscribeToGameEvents()
    
    // Broadcast game state changes
    this.broadcastGameState()
  }
}
```

## 🚀 Implementation Priorities

### Phase 1: Core Physics (Week 1)
1. **Matter.js Integration**
   - Install and configure Matter.js
   - Create basic physics world
   - Implement ball and paddle physics

2. **Collision Detection**
   - Basic ball-obstacle collisions
   - Ball-paddle collisions
   - Wall collisions

3. **Game State Management**
   - Game mode switching
   - Basic game flow
   - Win/lose conditions

### Phase 2: Obstacle Effects (Week 2)
1. **Basic Effects**
   - Speed boost/reduce
   - Neutral bounce
   - Color conversion

2. **Effect System**
   - Obstacle effect assignment
   - Effect application logic
   - Visual feedback

3. **Game Balance**
   - Effect distribution
   - Difficulty scaling
   - Performance optimization

### Phase 3: PvP Foundation (Weeks 3-4)
1. **Real-time Sync**
   - Game event broadcasting
   - Player synchronization
   - State consistency

2. **Multiplayer Management**
   - Player matching
   - Disconnection handling
   - Game session management

3. **Advanced Features**
   - Player-specific obstacles
   - Score tracking
   - Game statistics

## 💡 Key Technical Insights

### Leverage Existing Architecture
- **Canvas Operations**: Reuse object manipulation system
- **Real-time System**: Extend event types for game events
- **Ownership System**: Prevent paddle conflicts in PvP
- **Database Schema**: Minimal changes needed

### Performance Considerations
- **Physics Loop**: 60fps local, 30fps network sync
- **Collision Detection**: Spatial partitioning for many objects
- **Network Optimization**: Delta compression for frequent updates
- **Memory Management**: Cleanup unused game sessions

### Technical Risks
1. **Physics Synchronization**: Keeping ball position consistent across clients
2. **Network Latency**: Handling lag in real-time gameplay
3. **Performance**: Maintaining 60fps with many objects
4. **State Management**: Complex game state across multiple clients

This technical architecture provides a solid foundation for implementing the Pong pivot while leveraging the existing CollabCanvas infrastructure.
