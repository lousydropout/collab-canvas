# CollabCanvas MVP - Product Requirements Document

## Project Overview
Build a real-time collaborative canvas application where multiple users can create and manipulate rectangles simultaneously on a **single shared canvas**, with live cursor tracking and presence awareness. This MVP is the foundation for a future AI-assisted design tool.

**Timeline:** 24 hours  
**Hard Gate:** Must pass MVP checkpoint to proceed  
**Canvas:** Single shared canvas (canvasId = "default") for all users

---

## Technical Stack

### Frontend
- **Runtime:** Bun
- **Framework:** Next.js 14+ (App Router)
- **Styling:** TailwindCSS + shadcn/ui components
- **Canvas Rendering:** Konva.js (vanilla, installed via `bun install konva`)
- **State Management:** Zustand (if needed, likely not required)

### Backend & Services
- **Authentication:** Supabase (email + password only)
- **Real-time Sync:** Supabase Realtime
- **Deployment:** Vercel

---

## Core Requirements

### 1. User Authentication
**Must Have:**
- Email + password registration
- Email + password login
- Persistent sessions
- User profile with display name
- Logout functionality

**User Properties:**
- `userId` (unique identifier)
- `displayName` (shown on cursor)
- `email`

### 2. Canvas Workspace

#### Pan & Zoom
- **Pan:** Click and drag background to move viewport
- **Zoom:** Mouse wheel or pinch gesture
- **Zoom Range:** 10% - 500%
- **Performance:** Maintain 60 FPS during all pan/zoom operations

#### Viewport Properties
- Workspace size: 5000x5000 pixels (feels spacious)
- Initial view: Centered at 2500, 2500
- Grid optional (nice-to-have)

### 3. Rectangle Objects

#### Creation
- **Tool:** Rectangle creation mode (default active)
- **Interaction:** Click and drag to define size and position
- **Default Properties:**
  - Width/Height: Based on drag distance (minimum 20x20px)
  - Color: Black (#000000)
  - Position: Where user clicked
  - Rotation: 0 degrees
  - Owner: "all" (initially not being moved)

#### Rectangle Schema
```javascript
{
  id: string,              // UUID
  type: "rectangle",
  x: number,               // Top-left X
  y: number,               // Top-left Y
  width: number,
  height: number,
  color: string,           // Hex color
  rotation: number,        // Degrees
  owner: string,           // userId or "all"
  createdBy: string,       // userId
  createdAt: timestamp,
  updatedAt: timestamp
}
```

#### Transformation
- **Move:** Click and drag (Konva drag events)
- **Resize:** Drag corner/edge handles with Konva Transformer
- **Rotate:** Drag rotation handle via Konva Transformer (nice-to-have for MVP)
- **Selection:** Click to select, shift+click for multi-select
- **Multi-select drag:** Move all selected objects together

### 4. Object Ownership & Conflict Resolution

#### Ownership Rules
- **Default State:** All objects have `owner: "all"`
- **Claiming Ownership:** When user clicks/drags an object:
  1. Check if `owner === "all"`
  2. If yes, set `owner: currentUserId`
  3. Broadcast ownership change immediately
  4. If no (owned by another user), prevent interaction and show visual feedback
  
- **Releasing Ownership:** When user releases mouse:
  1. Set `owner: "all"`
  2. Broadcast ownership release

#### Conflict Prevention
- Only the owner can transform an object
- Other users see a visual indicator (border color, lock icon) when object is owned
- Optimistic UI updates only for the owner
- Last-write-wins for other properties (color, z-index) if conflicts occur

### 5. Real-Time Collaboration

#### Multiplayer Cursors
- **Display:** SVG cursor or CSS-styled div
- **Label:** Display name floating above cursor
- **Update Frequency:** 50ms max latency
- **Properties:**
```javascript
{
  userId: string,
  displayName: string,
  x: number,
  y: number,
  color: string,        // Unique per user
  lastSeen: timestamp
}
```

#### Presence Awareness
- **User List:** Sidebar or header showing online users
- **Display:**
  - Avatar/initial
  - Display name
  - Status indicator (active/idle)
- **Idle Detection:** 30 seconds without activity
- **Remove:** User disconnect or 60 seconds idle

#### Synchronization Events
```javascript
// Event Types
{
  type: "cursor_move",
  userId: string,
  x: number,
  y: number,
  timestamp: number
}

{
  type: "object_create",
  object: Rectangle,
  userId: string,
  timestamp: number
}

{
  type: "object_update",
  objectId: string,
  updates: Partial<Rectangle>,
  userId: string,
  timestamp: number
}

{
  type: "object_delete",
  objectId: string,
  userId: string,
  timestamp: number
}

{
  type: "object_claim",
  objectId: string,
  userId: string,
  timestamp: number
}

{
  type: "object_claim_confirmation",
  objectId: string,
  userId: string,
  success: boolean,
  timestamp: number
}

{
  type: "object_release",
  objectId: string,
  userId: string,
  timestamp: number
}

{
  type: "user_join",
  user: User,
  timestamp: number
}

{
  type: "user_leave",
  userId: string,
  timestamp: number
}

{
  type: "request_full_sync",
  userId: string,
  timestamp: number
}

{
  type: "full_sync",
  objects: Rectangle[],
  timestamp: number
}

{
  type: "request_delta_sync",
  userId: string,
  timestamp: number    // Client's last successful sync timestamp
}

{
  type: "delta_sync",
  changes: Array<{
    type: "create" | "update" | "delete",
    objectId: string,
    object?: Rectangle,      // for create
    updates?: Partial<Rectangle>,  // for update
    timestamp: number
  }>,
  timestamp: number    // Server's current timestamp
}
```

#### Periodic Delta Sync
- **Frequency:** Every 10 seconds
- **Type:** Delta sync (changes from last 15 seconds)
- **Purpose:** Recover from missed events, handle drift, correct delayed/stuck states
- **Flow:**
  1. Client sends `{ type: "request_delta_sync", timestamp: clientLastSyncTimestamp }`
  2. Server responds with changes since client's timestamp
  3. Client merges with local state (server state wins)
- **Conflict Resolution:** Server state is source of truth
- **Payload Optimization:** Delta sync contains only recent changes (create/update/delete events), not entire object list
- **Recovery:** If sync issues persist, user refreshes page to get full state

### 6. Layer Management

#### Operations
- **Delete:** Selected object(s) → Backspace/Delete key or button
- **Duplicate:** Cmd/Ctrl+D or button → Create copy offset by 20px
- **Select All:** Cmd/Ctrl+A
- **Deselect:** Click background or Escape key

#### Z-Index
- New objects appear on top
- Send to back / Bring to front (nice-to-have)

### 7. State Persistence

#### What to Persist
- All rectangle objects
- Canvas state (zoom level, pan position optional)

#### When to Persist
- On every object create/update/delete
- Debounce rapid updates (100ms)

#### Recovery
- On app load: Fetch all objects from database
- On reconnect: Sync local state with server state
- Handle conflicts: Server state wins

---

## Performance Targets

### Required (MVP Gate)
- **60 FPS:** All interactions (pan, zoom, move, resize)
- **<100ms:** Object sync latency across users
- **<50ms:** Cursor position sync latency
- **500+ objects:** No FPS degradation
- **5+ concurrent users:** No performance loss

### Monitoring
- Use browser Performance API
- Log frame times during testing
- Test with throttled network (Fast 3G)

---

## UI/UX Requirements

### Layout
```
┌─────────────────────────────────────────┐
│ Header: Logo | Users Online | Logout    │
├─────────────────────────────────────────┤
│ Toolbar: [Rectangle Mode] [Select] [Del]│
├─────────────────────────────────────────┤
│                                         │
│                                         │
│        Konva Stage (Canvas)             │
│      (Layer with Rectangles)            │
│         (with pan/zoom)                 │
│                                         │
│                                         │
└─────────────────────────────────────────┘
```

### Visual Feedback
- **Object Selected (by you):** Border with your user color (e.g., blue)
- **Object Pending Claim:** Yellow border (waiting for server confirmation)
- **Object Owned by Other:** Border with owner's user color (e.g., red)
- **Cursor Labels:** Rounded rectangle with user color
- **Resize Handles:** Small circles on corners/edges (via Konva Transformer)
- **Loading States:** Spinners for auth and initial load

### Keyboard Shortcuts
- **Delete:** Delete/Backspace
- **Duplicate:** Cmd/Ctrl+D
- **Select All:** Cmd/Ctrl+A
- **Deselect:** Escape
- **Pan:** Space+Drag (alternative to click-drag)

---

## Data Architecture

### Database Schema (Supabase)

#### Collections/Tables

**users**
```javascript
{
  id: string,
  email: string,
  displayName: string,
  createdAt: timestamp
}
```

**canvas_objects**
```javascript
{
  id: string,
  canvasId: string,      // Always "default" for MVP
  type: "rectangle",
  x: number,
  y: number,
  width: number,
  height: number,
  color: string,
  rotation: number,
  owner: string,         // userId or "all"
  createdBy: string,
  createdAt: timestamp,
  updatedAt: timestamp
}
```

**presence** (Realtime only, not persisted)
```javascript
{
  userId: string,
  canvasId: string,      // Always "default" for MVP
  displayName: string,
  cursorX: number,
  cursorY: number,
  color: string,
  timestamp: number
}
```

### Real-time Channels
- `canvas:default:objects` - Object CRUD operations (single canvas)
- `canvas:default:presence` - Cursor positions and user presence
- `canvas:default:ownership` - Object ownership claims/releases/confirmations

### Server-Side Functions
**claimObject(objectId, userId)**
- Validates `owner === "all"`
- Sets `owner = userId`
- Returns success boolean

**releaseObject(objectId, userId)**
- Validates `owner === userId`
- Sets `owner = "all"`
- Returns success boolean

**updateObject(objectId, userId, updates)**
- Validates `owner === userId`
- Updates object properties
- Returns success boolean

---

## Testing Requirements

### Manual Testing Scenarios
1. **Two Users Editing:**
   - Open app in Chrome and Firefox
   - User A creates rectangle
   - User B sees it instantly
   - Both users move different rectangles simultaneously

2. **State Persistence:**
   - User A creates 5 rectangles
   - User A refreshes browser
   - All rectangles still present

3. **Rapid Operations:**
   - Create 10 rectangles quickly
   - Move multiple rectangles rapidly
   - All users see smooth updates

4. **Ownership Conflicts:**
   - User A clicks and attempts to claim a rectangle (yellow border)
   - Server confirms claim to User A (shows User A's color border)
   - User B tries to claim same rectangle (yellow border)
   - Server rejects User B's claim
   - User B's yellow border removed, shows User A's color border (locked)
   - User A releases, server broadcasts owner: "all"
   - User B can now successfully claim it

5. **Disconnect/Reconnect:**
   - User A creates rectangles
   - Disconnect network
   - User B continues working
   - Reconnect User A
   - User A requests delta sync with their last timestamp
   - Server sends changes since that timestamp
   - User A sees all of User B's changes
   - If issues persist, User A refreshes page

6. **Periodic Delta Sync:**
   - Multiple users editing for 30+ seconds
   - Every 10s, delta sync occurs automatically
   - Only changes from last 15s transmitted
   - No visible interruption
   - All users maintain consistent state
   - Corrects any stuck pending states from delayed responses

### Performance Testing
- Use Chrome DevTools Performance monitor
- Record frame rate during:
  - Pan with 100+ objects
  - Zoom with 100+ objects
  - Dragging multiple selected objects
- Target: Never drop below 60 FPS

---

## Deployment Requirements

### Pre-deployment Checklist
- [ ] Environment variables configured on Vercel
- [ ] Supabase project URL and anon key set
- [ ] Firebase/Pusher credentials configured
- [ ] Build succeeds without errors
- [ ] Authentication flow works end-to-end
- [ ] At least 2 test accounts created

### Post-deployment Verification
- [ ] Public URL accessible
- [ ] Can create account
- [ ] Can login
- [ ] Can create rectangles
- [ ] Real-time sync works across devices
- [ ] Cursors visible for multiple users
- [ ] State persists after refresh

---

## Out of Scope (Post-MVP)

### Explicitly NOT in MVP
- Circles and text objects
- Advanced transformations (rotation handle)
- Undo/redo
- Copy/paste
- Canvas export
- Collaborative permissions
- AI agent features
- Mobile responsive design (desktop-first)
- Keyboard-only navigation
- Accessibility features (ARIA)

These can be added after MVP checkpoint is passed.

---

## Success Criteria

### MVP Gate Pass Requirements
✅ Basic canvas with pan/zoom  
✅ Rectangle creation and movement  
✅ Real-time sync between 2+ users  
✅ Multiplayer cursors with name labels  
✅ Presence awareness (who's online)  
✅ User authentication with display names  
✅ Deployed and publicly accessible  
✅ Object ownership prevents conflicts  
✅ State persists across sessions  

### Performance Pass Requirements
✅ 60 FPS maintained during all interactions  
✅ Object sync <100ms latency  
✅ Cursor sync <50ms latency  
✅ Handles 500+ objects without degradation  
✅ Supports 5+ concurrent users smoothly  

---

## Development Phases

### Phase 1: Foundation (Hours 1-8)
1. Next.js project setup with Bun
2. Supabase authentication implementation
3. Basic Konva.js canvas setup with pan/zoom (Stage + Layer) using vanilla Konva
4. Deploy skeleton to Vercel

### Phase 2: Core Features (Hours 9-16)
1. Rectangle creation and rendering with Konva.Rect (vanilla JS)
2. Object selection and transformation (Konva.Transformer) 
3. Supabase Realtime integration (single canvas channel)
4. Server-side validation functions (claim/release/update)
5. Real-time object synchronization with claim-confirm pattern
6. Ownership system implementation

### Phase 3: Collaboration (Hours 17-20)
1. Multiplayer cursors
2. Presence system
3. User list UI
4. State persistence
5. Periodic delta sync (every 10s, last 15s of changes)
6. Optimistic UI for ownership claims

### Phase 4: Polish & Testing (Hours 21-24)
1. Delete and duplicate operations
2. Multi-select functionality
3. Visual feedback for locked objects
4. Performance testing and optimization
5. Final deployment and verification

---

## Risk Mitigation

### High Risk Items
1. **Real-time sync latency**
   - Mitigation: Use Supabase Realtime with optimized payloads
   - Test with multiple clients early
   - Server-side validation prevents race conditions
   
2. **Canvas performance with many objects**
   - Mitigation: Konva.js handles rendering optimization automatically
   - Use Layer caching for static objects
   - Implement viewport culling if needed

3. **Claim-confirm roundtrip latency**
   - Mitigation: Optimistic UI with immediate yellow border (pending state)
   - Target <50ms server response time
   - If delayed, delta sync corrects state within 10s
   - User sees yellow → their color (success) or owner's color (failure)

3. **Ownership race conditions**
   - Mitigation: Server-side validation of ownership claims
   - Optimistic UI with rollback

### Medium Risk Items
1. **Pan/zoom performance**
   - Mitigation: Use Konva's built-in Stage dragging and scale
   - Hardware acceleration via canvas

2. **Network disconnection handling**
   - Mitigation: Use built-in reconnection from Supabase
   - Queue operations during offline

3. **Konva re-render optimization**
   - Mitigation: Only update changed shapes
   - Use Konva's layer caching when appropriate

---

## Open Questions

1. ~~Which real-time service?~~ **RESOLVED: Supabase Realtime**

2. ~~Canvas library or raw Canvas API?~~ **RESOLVED: Vanilla Konva.js (not react-konva)**

3. ~~Color picker or predefined palette?~~ **RESOLVED: Black only (#000000)**

4. ~~Framework choice?~~ **RESOLVED: Next.js with Bun**

5. ~~Single canvas or multiple canvases?~~ **RESOLVED: Single canvas only (canvasId = "default")**

6. ~~Ownership conflict resolution?~~ **RESOLVED: Server-side validation with claim-confirm pattern**

All technical decisions finalized.

---

## Appendix: Event Flow Examples

### Creating a Rectangle
```
1. User clicks rectangle tool
2. User drags on canvas
3. Local state creates rectangle with owner: "all"
4. Broadcast { type: "object_create", object: {...} }
5. Database persists rectangle
6. Other users receive event and render rectangle
```

### Moving a Rectangle
```
1. User clicks rectangle
2. Check owner === "all" locally
3. Immediately show yellow border (pending state)
4. Send { type: "object_claim", objectId, userId } to server
5. Server validates: only allows if owner === "all"
6. Server responds { type: "object_claim_confirmation", objectId, userId, success: boolean }
7. If success === true:
   - Show border with user's color
   - Set local state owner: userId
   - Enable dragging
8. If success === false:
   - Remove yellow pending border
   - If another user owns it, show border with owner's color
   - Prevent dragging
9. If response delayed: delta sync (every 10s) corrects state
10. User drags rectangle (if successful claim)
11. Broadcast { type: "object_update", objectId, x, y }
12. Server validates: only allows if owner === userId
13. User releases mouse
14. Send { type: "object_release", objectId, userId }
15. Server validates: only allows if owner === userId
16. Server sets owner: "all" and broadcasts
```

### Conflict Scenario
```
1. User A claims rectangle (owner: userA)
2. User B clicks same rectangle
3. User B checks owner !== "all"
4. User B shows "locked" visual feedback
5. User B cannot drag
6. User A releases (owner: "all")
7. User B can now claim it
```