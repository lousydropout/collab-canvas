# CollabCanvas v2.0 - Product Requirements Document

## Project Overview

CollabCanvas v2.0 is a next-generation collaborative canvas application designed for real-time prototyping of simple web apps. Multiple users can create, manipulate, and manage visual objects simultaneously on a shared canvas. Users can also share a "preview" link for end-users to interact with prototypes in a live session, with data persisted independently per user in Supabase.

**Core Goals:**
- Collaborative prototyping tool similar to Figma's flow preview
- Real-time canvas with pan/zoom, selection, and object manipulation
- AI-powered natural language operations for creating and modifying objects
- Token-based access control for collaborators and end-users
- Hierarchical object structure for grouping and prototyping flows

**Timeline:** 4-6 weeks  
**Target:** Production-ready collaborative prototyping tool  
**Canvas:** Single shared canvas (canvasId = "default") for all users  
**AI Integration:** Core feature with Vercel AI SDK

---

## Technical Stack

### Frontend
- **Runtime:** Bun (package manager and runtime)
- **Framework:** Next.js 15 (App Router)
- **Styling:** TailwindCSS + shadcn/ui components
- **Canvas Rendering:** react-konva (React wrapper for Konva.js)
- **State Management:** React hooks (no external state library)
- **AI Integration:** Vercel AI SDK with OpenAI GPT-4o-mini

### Backend & Services
- **Authentication:** Supabase Auth (email + password)
- **Database:** Supabase PostgreSQL with Row Level Security
- **Real-time Sync:** Supabase Realtime (dual-channel architecture)
- **AI Service:** Vercel AI SDK + OpenAI GPT-4o-mini
- **Deployment:** Vercel

---

## Core Architecture Patterns

### Service Layer Pattern
- **CanvasOperations Service:** Abstracts all canvas operations
- **AI Service Integration:** Vercel AI SDK tools for natural language operations
- **Clean Separation:** UI components ↔ Service layer ↔ Database
- **Testability:** Easy unit testing and AI integration

### Dual Channel Real-time Architecture
- **Broadcast Channels:** Object CRUD operations (create, update, delete, duplicate)
- **Database Subscriptions:** Ownership changes only
- **Performance Benefit:** Prevents duplicate event processing
- **Scalability:** Optimized for multiple concurrent users

### Hierarchical Object System
- **Parent-Child Relationships:** Objects can be grouped and nested
- **Prototyping Flows:** Support for user journey mapping
- **Tree Structure:** Efficient hierarchy traversal and manipulation
- **Group Operations:** Move, resize, and manipulate entire groups

### Token-Based Access Control
- **Collaborator Tokens:** Full edit access to canvas
- **End-User Tokens:** Read-only preview access
- **Independent Data:** End-user interactions scoped per user
- **Expiration Support:** Time-limited access tokens

---

## Database Schema

### Enhanced Tables

#### profiles
```sql
CREATE TABLE public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  display_name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### canvas_nodes
```sql
CREATE TABLE public.canvas_nodes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  canvas_id TEXT NOT NULL DEFAULT 'default',
  parent_id UUID REFERENCES public.canvas_nodes(id) ON DELETE CASCADE,
  visual_type TEXT NOT NULL CHECK (visual_type IN ('rectangle', 'ellipse', 'textbox', 'image')),
  role_type TEXT NOT NULL CHECK (role_type IN ('button', 'dropdown', 'link', 'text', 'header', 'footer')),
  props JSONB DEFAULT '{}',
  position INTEGER NOT NULL,
  owner TEXT NOT NULL DEFAULT 'all',
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### canvas_shares
```sql
CREATE TABLE public.canvas_shares (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  canvas_id TEXT NOT NULL,
  share_type TEXT NOT NULL CHECK (share_type IN ('collaborator', 'enduser')),
  user_id UUID REFERENCES auth.users(id),
  token TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### Row Level Security Policies
- **Profiles:** Viewable by all, editable by owner
- **Canvas Nodes:** Read by all authenticated users, write with ownership validation
- **Canvas Shares:** Token-based access control with expiration
- **End-User Data:** Scoped by canvas_id + owner_id + table + enduser_id

---

## Core Requirements

### 1. User Authentication & Profiles

**Must Have:**
- Email + password registration with display names
- Persistent sessions with automatic refresh
- User profile management
- Secure logout functionality

**User Properties:**
- `userId` (UUID, references auth.users)
- `displayName` (shown on cursors and AI responses)
- `email` (authentication)
- `createdAt`, `updatedAt` (timestamps)

### 2. Canvas Workspace

#### Pan & Zoom
- **Pan:** Click and drag background to move viewport
- **Zoom:** Mouse wheel or pinch gesture
- **Zoom Range:** 10% - 500%
- **Performance:** Maintain 60 FPS during all pan/zoom operations
- **Smooth Transitions:** Hardware-accelerated canvas operations

#### Viewport Properties
- **Workspace Size:** 5000x5000 pixels (infinite canvas feel)
- **Initial View:** Centered at 2500, 2500
- **Grid:** Optional 20px grid with zoom-aware rendering
- **Responsive:** Adapts to container size changes

### 3. Hierarchical Object System

#### Supported Visual Types
- **Rectangle:** Primary shape type with full manipulation
- **Ellipse:** Secondary shape type with unified transformation
- **Textbox:** Text input with rich formatting options
- **Image:** Image display with aspect ratio preservation
- **Extensible:** Architecture supports adding more visual types

#### Role Types (Prototyping Context)
- **Button:** Interactive button element
- **Dropdown:** Select dropdown component
- **Link:** Navigation link element
- **Text:** Static text content
- **Header:** Page/section header
- **Footer:** Page/section footer

#### Object Schema
```typescript
interface CanvasNode {
  id: string              // UUID
  canvas_id: string      // Always "default" for single canvas
  parent_id?: string     // UUID of parent node (for grouping)
  visual_type: 'rectangle' | 'ellipse' | 'textbox' | 'image'
  role_type: 'button' | 'dropdown' | 'link' | 'text' | 'header' | 'footer'
  props: {
    // Visual properties
    x: number
    y: number
    width: number
    height: number
    color: string
    rotation: number
    z_index: number
    
    // Content properties
    text?: string
    fontSize?: number
    fontFamily?: string
    textAlign?: 'left' | 'center' | 'right'
    
    // Interactive properties
    href?: string
    onClick?: string
    placeholder?: string
    options?: string[]
    
    // Image properties
    src?: string
    alt?: string
    
    // Styling properties
    backgroundColor?: string
    borderColor?: string
    borderWidth?: number
    borderRadius?: number
    opacity?: number
  }
  position: number       // Order within parent
  owner: string          // userId or "all"
  created_by: string     // userId of creator
  created_at: string     // ISO timestamp
  updated_at: string     // ISO timestamp
}
```

#### Object Operations
- **Create:** Click and drag to define size and position
- **Move:** Drag to reposition (requires ownership)
- **Resize:** Corner/edge handles via Konva Transformer
- **Rotate:** Rotation handle via Konva Transformer
- **Select:** Click to select, Shift+click for multi-select
- **Delete:** Delete key or button
- **Duplicate:** Ctrl+D with 20px offset
- **Group/Ungroup:** Create parent-child relationships
- **Layer Management:** Bring to front, send to back

### 4. AI-Powered Canvas Operations

#### Natural Language Interface
- **Chat Interface:** Floating modal in bottom-right corner
- **Vercel AI SDK Integration:** OpenAI GPT-4o-mini with custom tools
- **Real-time Processing:** Immediate execution of canvas operations
- **Context Awareness:** Understands current canvas state and hierarchy

#### Available AI Commands
```markdown
Object Creation:
- "Create a red button in the center"
- "Add a textbox for email input at position 100, 200"
- "Make a header with 'Welcome' text"
- "Create a dropdown menu with options"

Object Manipulation:
- "Move the selected button 50 pixels to the right"
- "Group the selected elements together"
- "Change the button text to 'Submit'"
- "Make the textbox wider"

Prototyping Operations:
- "Create a login form with email and password fields"
- "Add a navigation menu with Home, About, Contact links"
- "Create a card layout with image and text"
- "Build a contact form with name, email, and message fields"

Natural Language Support:
- Positions: "center", "top-left", "100, 200", "50%", "right"
- Sizes: "200x150", "large", "small", "50%"
- Colors: "red", "#ff0000", "blue", "green"
- Directions: "up", "down", "left", "right", "north", "south"
- Role Types: "button", "textbox", "header", "footer", "link"
```

#### AI Tools Architecture
- **createNodeTool:** Natural language node creation with role types
- **updateNodeTool:** Modify node properties and content
- **groupNodesTool:** Create parent-child relationships
- **createFormTool:** Generate complete form layouts
- **createLayoutTool:** Generate common UI patterns
- **moveNodeTool:** Direction and distance-based movement
- **deleteNodesTool:** Criteria-based node deletion
- **getCanvasStateTool:** Canvas state and hierarchy queries

### 5. Access Control & Shareable Links

#### Token-Based Access Control
- **Collaborator Tokens:** Full edit access to canvas
- **End-User Tokens:** Read-only preview access with independent data
- **Token Storage:** Secure token generation and validation
- **Expiration Support:** Time-limited access tokens

#### Shareable Link Types
```typescript
interface CanvasShare {
  id: string
  canvas_id: string
  share_type: 'collaborator' | 'enduser'
  user_id?: string
  token: string
  expires_at?: string
  created_at: string
  updated_at: string
}
```

#### End-User Preview Mode
- **Read-Only Access:** View canvas without editing capabilities
- **Independent Data:** End-user interactions scoped per user
- **Live Updates:** Real-time updates from collaborators
- **Interaction Tracking:** Track end-user behavior for analytics

### 6. Real-Time Collaboration

#### Multiplayer Cursors
- **Live Tracking:** Real-time cursor positions with user names
- **Color Coding:** Consistent colors per user (generated from user ID)
- **Update Frequency:** 60fps with batching system
- **Cleanup:** Automatic removal after 10 seconds of inactivity

#### Presence Awareness
- **User List Modal:** Click connection indicator to view online users
- **Avatar Display:** User initials with consistent colors
- **Status Indicators:** Active/idle detection
- **Connection Status:** Real-time connection health indicator

#### Synchronization Events
```typescript
// Node Operations
interface NodeCreatedEvent {
  type: 'node_created'
  node: CanvasNode
  user_id: string
  creatorDisplayName: string
  timestamp: string
}

// Hierarchy Operations
interface NodeGroupedEvent {
  type: 'node_grouped'
  parent_id: string
  child_ids: string[]
  user_id: string
  timestamp: string
}

// Ownership Events
interface OwnershipClaimedEvent {
  type: 'ownership_claimed'
  node_id: string
  owner_id: string
  owner_name: string
  claimed_at: string
  expires_at: string
}
```

### 7. Ownership & Conflict Resolution

#### Ownership Rules
- **Creator Ownership:** Nodes owned by creator initially
- **Claim Process:** Click node → Check availability → Atomic database claim
- **Visual Feedback:** Color-coded borders (yellow pending, user color success, owner color locked)
- **Release Process:** Click empty space or finish edit → Set owner to "all"
- **Auto-release:** 30 seconds of inactivity

#### Conflict Prevention
- **Atomic Operations:** Database-level validation prevents race conditions
- **Optimistic UI:** Immediate feedback with server validation
- **Last-write-wins:** Server state is source of truth
- **Clear Visual Indicators:** Users understand ownership status immediately

### 8. Performance Architecture

#### Batching System
- **16ms Timer:** Flushes updates at 60fps for smooth collaboration
- **Update Queuing:** Prevents React re-render storms
- **Separate Channels:** Cursor updates separate from node updates
- **Memory Efficient:** Automatic cleanup of stale data

#### Real-time Optimization
- **Dual Channel Architecture:** Broadcast + database subscriptions
- **Throttled Updates:** Optimized frequency for different data types
- **Connection Recovery:** Automatic reconnection with state sync
- **Error Handling:** Graceful degradation on network issues

#### Memory Management
- **Event Cleanup:** Proper cleanup of Konva listeners
- **Channel Management:** Supabase channel cleanup on unmount
- **State Cleanup:** Clear state on user logout
- **Timer Management:** Cleanup ownership timers

---

## User Experience Requirements

### Layout & Interface
```
┌─────────────────────────────────────────────────────────┐
│ Header: Logo | AI Assistant | Share | Users Online | Logout │
├─────────────────────────────────────────────────────────┤
│ Toolbar: [Rectangle] [Ellipse] [Textbox] [Image] [Group] │
│         [Button] [Dropdown] [Link] [Select] [Color] [Del] │
├─────────────────────────────────────────────────────────┤
│                                                         │
│                                                         │
│        Konva Stage (Canvas)                             │
│      (Hierarchical Nodes)                               │
│         (with pan/zoom)                                 │
│                                                         │
│                                                         │
├─────────────────────────────────────────────────────────┤
│ AI Chat Modal (Bottom-right, collapsible)              │
└─────────────────────────────────────────────────────────┘
```

### Visual Feedback System
- **Node Selected (by you):** Border with your user color
- **Node Pending Claim:** Yellow border (waiting for server confirmation)
- **Node Owned by Other:** Border with owner's user color
- **Grouped Nodes:** Visual grouping indicators
- **Cursor Labels:** Rounded rectangle with user color and name
- **Resize Handles:** Small circles on corners/edges (Konva Transformer)
- **Connection Status:** Real-time indicator with user count and health

### Keyboard Shortcuts
- **Delete:** Delete/Backspace (selected nodes)
- **Duplicate:** Cmd/Ctrl+D (selected nodes)
- **Group:** Cmd/Ctrl+G (selected nodes)
- **Ungroup:** Cmd/Ctrl+Shift+G (selected group)
- **Select All:** Cmd/Ctrl+A
- **Deselect:** Escape (cancel creation or deselect all)
- **AI Chat:** Cmd/Ctrl+I (toggle AI chat)

### AI Chat Interface
- **Floating Modal:** Bottom-right corner, collapsible
- **Message History:** Scrollable conversation with timestamps
- **Quick Actions:** Example commands and clear button
- **Loading States:** "Thinking..." indicator during AI processing
- **Error Handling:** User-friendly error messages
- **Minimize/Expand:** Space-efficient interface

### Sharing Interface
- **Share Modal:** Generate collaborator and end-user links
- **Token Management:** View active shares and expiration
- **Preview Mode:** Read-only view for end-users
- **Access Control:** Manage permissions and revoke access

---

## Performance Targets

### Required Performance Metrics
- **60 FPS:** All interactions (pan, zoom, move, resize, AI operations)
- **<100ms:** Node sync latency across users
- **<50ms:** Cursor position sync latency
- **<200ms:** AI command processing latency
- **500+ nodes:** No FPS degradation
- **10+ concurrent users:** Smooth collaboration

### Performance Monitoring
- **Browser Performance API:** Frame time monitoring
- **Real-time Metrics:** Connection health and sync latency
- **AI Performance:** Command processing time and success rate
- **Memory Usage:** Leak detection and cleanup verification

---

## AI Integration Architecture

### Vercel AI SDK Implementation
```typescript
// Example: Node Creation Tool
export const createNodeTool = (operations: CanvasOperations, canvasSize: CanvasSize) => 
  tool(
    async (input: { 
      visual_type: string; 
      role_type: string; 
      x: string | number; 
      y: string | number; 
      width: string | number; 
      height: string | number; 
      props: Record<string, any>
    }) => {
      const position = parsePosition(input.x, input.y, canvasSize)
      const parsedWidth = parseSize(input.width, canvasSize.width)
      const parsedHeight = parseSize(input.height, canvasSize.height)
      
      const node = await operations.createNode({
        visual_type: input.visual_type,
        role_type: input.role_type,
        props: {
          x: position.x,
          y: position.y,
          width: parsedWidth,
          height: parsedHeight,
          ...input.props
        }
      })
      
      return `Successfully created a ${input.role_type} ${input.visual_type} at (${Math.round(position.x)}, ${Math.round(position.y)})`
    },
    {
      name: 'create_node',
      description: 'Create nodes with visual type, role type, and properties',
      schema: z.object({
        visual_type: z.enum(['rectangle', 'ellipse', 'textbox', 'image']),
        role_type: z.enum(['button', 'dropdown', 'link', 'text', 'header', 'footer']),
        x: z.union([z.string(), z.number()]),
        y: z.union([z.string(), z.number()]),
        width: z.union([z.string(), z.number()]),
        height: z.union([z.string(), z.number()]),
        props: z.record(z.any())
      })
    }
  )
```

### Natural Language Processing
- **Coordinate Parsing:** "center", "top-left", "50%", "100, 200"
- **Size Parsing:** "large", "small", "200x150", "50%"
- **Color Parsing:** "red", "#ff0000", "rgb(255,0,0)"
- **Direction Parsing:** "up", "down", "north", "southeast"
- **Role Type Parsing:** "button", "textbox", "header", "footer"

### AI Service Configuration
- **Model:** OpenAI GPT-4o-mini (cost-effective)
- **Temperature:** 0.1 (consistent responses)
- **Max Iterations:** 3 (prevent infinite loops)
- **Error Handling:** User-friendly error messages
- **Rate Limiting:** Graceful handling of API limits

---

## Testing Strategy

### Real-time Collaboration Testing
1. **Multi-user Scenarios:**
   - Open multiple browser windows with different accounts
   - Test simultaneous node creation and manipulation
   - Verify ownership conflict resolution
   - Test presence consistency across reconnections

2. **Network Resilience:**
   - Disconnect/reconnect testing
   - Slow network simulation
   - Connection recovery verification
   - State synchronization validation

### AI Integration Testing
1. **Natural Language Processing:**
   - Test various command formats
   - Verify coordinate parsing accuracy
   - Test error handling for invalid commands
   - Validate tool execution success rates

2. **Prototyping Operations:**
   - Test form creation commands
   - Verify layout generation
   - Test hierarchy manipulation
   - Validate role type assignments

### Access Control Testing
1. **Token Management:**
   - Test collaborator token generation
   - Verify end-user token functionality
   - Test token expiration
   - Validate permission enforcement

2. **End-User Preview:**
   - Test read-only access
   - Verify independent data scoping
   - Test real-time updates
   - Validate interaction tracking

### Performance Testing
1. **Canvas Performance:**
   - 60fps maintenance during all interactions
   - Large canvas performance (500+ nodes)
   - Multi-user collaboration performance
   - Memory leak detection

2. **Real-time Performance:**
   - <100ms node sync latency
   - <50ms cursor sync latency
   - Connection health monitoring
   - Batching system effectiveness

---

## Environment Configuration

### Required Environment Variables
```bash
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# AI Configuration
OPENAI_API_KEY=your_openai_api_key
```

### Development Setup
1. **Supabase Local Development:**
   ```bash
   bunx supabase start
   bunx supabase migration up
   ```

2. **Application Development:**
   ```bash
   bun install
   bun dev
   ```

3. **AI Service Testing:**
   - OpenAI API key required for AI features
   - Fallback to manual operations if AI unavailable
   - Development mode with verbose logging

---

## Deployment Requirements

### Pre-deployment Checklist
- [ ] Environment variables configured on Vercel
- [ ] Supabase project with all migrations applied
- [ ] OpenAI API key configured
- [ ] Build succeeds without errors
- [ ] Authentication flow works end-to-end
- [ ] AI service responds correctly
- [ ] Real-time sync works across devices
- [ ] Token-based access control functional
- [ ] Performance targets met

### Post-deployment Verification
- [ ] Public URL accessible
- [ ] User registration and login functional
- [ ] Canvas operations work smoothly
- [ ] AI chat responds to commands
- [ ] Real-time collaboration functional
- [ ] Multi-user cursors visible
- [ ] State persists after refresh
- [ ] Shareable links work correctly
- [ ] End-user preview mode functional
- [ ] Performance metrics within targets

---

## Success Criteria

### MVP Requirements ✅
- [ ] Canvas with pan/zoom (60fps)
- [ ] Hierarchical node creation/manipulation
- [ ] Real-time sync between 5+ users
- [ ] Multiplayer cursors with name labels
- [ ] Presence awareness (online users modal)
- [ ] User authentication with display names
- [ ] AI-powered natural language operations
- [ ] Token-based access control
- [ ] Shareable links for collaborators and end-users
- [ ] Ownership system prevents conflicts
- [ ] State persists across sessions
- [ ] Public deployment accessible

### Performance Goals ✅
- [ ] 60 FPS maintained during all interactions
- [ ] <100ms node sync latency
- [ ] <50ms cursor sync latency
- [ ] <200ms AI command processing
- [ ] Handles 500+ nodes without degradation
- [ ] Supports 10+ concurrent users smoothly

### AI Integration Goals ✅
- [ ] Natural language command processing
- [ ] All canvas operations available via AI
- [ ] Prototyping-specific commands (forms, layouts)
- [ ] Error handling and user feedback
- [ ] Performance within acceptable limits
- [ ] Fallback to manual operations if AI unavailable

### Access Control Goals ✅
- [ ] Collaborator token generation and validation
- [ ] End-user preview mode with independent data
- [ ] Token expiration and renewal
- [ ] Permission enforcement via RLS
- [ ] Shareable link management interface

---

## Development Phases

### Phase 1: Foundation (Week 1)
1. Next.js project setup with Bun
2. Supabase authentication and database setup
3. Basic react-konva canvas with pan/zoom
4. CanvasOperations service layer
5. Deploy skeleton to Vercel

### Phase 2: Core Features (Week 2)
1. Hierarchical node creation/manipulation
2. Node selection and transformation
3. Supabase Realtime integration (dual-channel)
4. Ownership system implementation
5. Basic AI service setup with Vercel AI SDK

### Phase 3: AI Integration (Week 3)
1. Vercel AI SDK tools implementation
2. Natural language processing
3. AI chat interface
4. Prototyping-specific commands
5. AI command testing and validation

### Phase 4: Access Control & Sharing (Week 4)
1. Token-based access control
2. Shareable link generation
3. End-user preview mode
4. RLS policy implementation
5. Sharing interface development

### Phase 5: Collaboration Features (Week 5)
1. Multiplayer cursors
2. Presence system
3. User list modal
4. Real-time synchronization
5. Performance optimization

### Phase 6: Polish & Testing (Week 6)
1. Comprehensive testing
2. Performance optimization
3. Error handling improvements
4. Documentation completion
5. Final deployment and verification

---

## Risk Mitigation

### High Risk Items
1. **AI Service Reliability**
   - Mitigation: Fallback to manual operations
   - Monitoring: API health and response times
   - Error Handling: User-friendly error messages

2. **Real-time Sync Performance**
   - Mitigation: Dual-channel architecture with batching
   - Testing: Multi-user load testing
   - Monitoring: Sync latency metrics

3. **Token Security**
   - Mitigation: Secure token generation and validation
   - Testing: Access control validation
   - Monitoring: Unauthorized access attempts

### Medium Risk Items
1. **AI Command Parsing Accuracy**
   - Mitigation: Comprehensive natural language testing
   - Fallback: Clear error messages and suggestions
   - Improvement: Continuous learning from user feedback

2. **Hierarchy Complexity**
   - Mitigation: Clear visual grouping indicators
   - Testing: Complex hierarchy scenarios
   - Monitoring: Performance with deep nesting

---

## Future Enhancements (Post-MVP)

### Advanced Prototyping Features
- Interactive prototypes with real functionality
- Component library and templates
- Design system integration
- Animation and transitions

### Enhanced AI Features
- Smart layout suggestions
- Automatic responsive design
- Content-aware object creation
- Voice command integration

### Collaboration Enhancements
- User permissions and roles
- Comment and annotation system
- Version history and branching
- Export and sharing options

### Mobile and Accessibility
- Mobile responsive design
- Touch gesture support
- Keyboard navigation
- Screen reader compatibility

---

This PRD represents a significant evolution focused on collaborative prototyping with hierarchical object structures, token-based access control, and AI-powered operations. The architecture is designed for scalability, maintainability, and extensibility while maintaining the collaborative real-time experience and adding powerful prototyping capabilities.