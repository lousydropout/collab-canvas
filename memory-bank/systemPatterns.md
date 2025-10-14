# System Patterns: CollabCanvas Architecture

## Core Architecture
CollabCanvas follows a real-time collaborative architecture with clear separation of concerns:

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Client A      │    │   Client B      │    │   Client C      │
│                 │    │                 │    │                 │
│ ┌─────────────┐ │    │ ┌─────────────┐ │    │ ┌─────────────┐ │
│ │   Konva     │ │    │ │   Konva     │ │    │ │   Konva     │ │
│ │   Canvas    │ │    │ │   Canvas    │ │    │ │   Canvas    │ │
│ └─────────────┘ │    │ └─────────────┘ │    │ └─────────────┘ │
│ ┌─────────────┐ │    │ ┌─────────────┐ │    │ ┌─────────────┐ │
│ │   React     │ │    │ │   React     │ │    │ │   React     │ │
│ │   State     │ │    │ │   State     │ │    │ │   State     │ │
│ └─────────────┘ │    │ └─────────────┘ │    │ └─────────────┘ │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         └───────────────────────┼───────────────────────┘
                                 │
                    ┌─────────────────┐
                    │   Supabase      │
                    │                 │
                    │ ┌─────────────┐ │
                    │ │  Realtime   │ │
                    │ │  Channels   │ │
                    │ └─────────────┘ │
                    │ ┌─────────────┐ │
                    │ │ PostgreSQL  │ │
                    │ │  Database   │ │
                    │ └─────────────┘ │
                    └─────────────────┘
```

## Key Technical Decisions

### 1. Canvas Rendering: react-konva
- **Why:** React integration with Konva.js for component-based architecture
- **Pattern:** React components wrapping Konva elements
- **Implementation:** Canvas components use react-konva components

### 2. Real-time Sync: Dual Channel Architecture
- **Broadcast Channel:** Object CRUD operations (create, update, delete, duplicate)
- **Database Channel:** Ownership changes only (prevents duplicate processing)
- **Pattern:** Optimistic UI with server validation

### 3. Ownership System: Claim-Confirm Pattern
```
1. User clicks object → Check owner === "all"
2. Show yellow border (pending state)
3. Send claim request to server
4. Server validates → Responds success/failure
5. Update UI: Yellow → User color (success) or Owner color (failure)
6. On release → Set owner: "all" and broadcast
```

### 4. State Management: Local + Sync
- **Local State:** Immediate UI updates for smooth interactions
- **Sync State:** Server state for conflict resolution
- **Pattern:** Optimistic updates with rollback capability

## Component Relationships

### Core Components
- **Canvas.tsx** - Main canvas container and orchestration
- **CanvasStage.tsx** - react-konva Stage wrapper with pan/zoom
- **Rectangle.tsx** - Individual rectangle rendering and interaction
- **Transformer.tsx** - react-konva Transformer for resize/rotate
- **Cursor.tsx** - Multiplayer cursor rendering

### Hooks Architecture
- **useAuth.ts** - Authentication state and operations
- **useCanvas.ts** - Canvas state and object management
- **useRealtime.ts** - Real-time synchronization
- **useOwnership.ts** - Object ownership logic
- **usePresence.ts** - User presence tracking

### Data Flow Patterns
```
User Action → Local State Update → Konva Render → Broadcast → Other Clients
     ↓
Database Persist ← Server Validation ← Ownership Check
```

## Performance Patterns

### 1. Rendering Optimization
- **react-konva Layer Caching** - Static objects cached for performance
- **Viewport Culling** - Only render visible objects (if needed)
- **Throttled Updates** - 50ms throttling for cursor/position updates

### 2. Network Optimization
- **Broadcast vs Database** - Use broadcasts for real-time, DB for persistence
- **Delta Sync** - Periodic sync of recent changes only
- **Connection Recovery** - Graceful reconnection with state sync

### 3. Conflict Resolution
- **Server Authority** - Database state is source of truth
- **Optimistic UI** - Immediate feedback with rollback
- **Ownership Validation** - Server-side ownership checks

## Error Handling Patterns

### 1. Connection Issues
- **Reconnection Logic** - Automatic reconnection with exponential backoff
- **State Recovery** - Delta sync on reconnection
- **Fallback UI** - Connection status indicators

### 2. Sync Conflicts
- **Last-Write-Wins** - Server state overrides client state
- **Ownership Validation** - Server prevents invalid ownership claims
- **Rollback UI** - Visual feedback for failed operations

### 3. Performance Degradation
- **Object Limits** - Prevent excessive object creation
- **Update Throttling** - Limit update frequency
- **Memory Management** - Cleanup unused objects and listeners
