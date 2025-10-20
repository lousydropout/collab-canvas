# CollabCanvas ✅

A real-time collaborative canvas application where multiple users can create and manipulate rectangles simultaneously on a shared canvas, with live cursor tracking and presence awareness.

## 🎯 Project Overview

CollabCanvas is a collaborative design tool that enables multiple users to work together in real-time on a shared canvas. Users can create, move, resize, and delete rectangles while seeing each other's cursors and presence. The system prevents race conditions through an ownership mechanism where objects must be selected and claimed before modification.

**Status:** ✅ **COMPLETE** - All project requirements met and performance targets achieved.

## 🏗️ Architecture

The application uses a dual-channel real-time architecture with direct database operations for ownership management.

### System Architecture

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

### Key Technical Decisions

1. **Canvas Rendering: react-konva**

   - React integration with Konva.js for component-based architecture
   - React components wrapping Konva elements
   - Canvas components use react-konva components

2. **Real-time Sync: Dual Channel Architecture**

   - **Broadcast Channel:** Object CRUD operations (create, update, delete, duplicate)
   - **Database Channel:** Ownership changes only (prevents duplicate processing)
   - **Pattern:** Optimistic UI with server validation

3. **Ownership System: Claim-Confirm Pattern**

   ```
   1. User clicks object → Check owner === "all"
   2. Show yellow border (pending state)
   3. Send claim request to server
   4. Server validates → Responds success/failure
   5. Update UI: Yellow → User color (success) or Owner color (failure)
   6. On release → Set owner: "all" and broadcast
   ```

4. **State Management: Local + Sync**
   - **Local State:** Immediate UI updates for smooth interactions
   - **Sync State:** Server state for conflict resolution
   - **Pattern:** Optimistic updates with rollback capability

## ✨ Features

- **Real-time Collaboration** - Multiple users editing simultaneously
- **Live Cursors** - See where other users are working with names and colors
- **Presence Awareness** - Modal showing online users with avatars
- **Object Ownership** - Prevents editing conflicts with atomic claim/release system
- **Smooth Performance** - 60 FPS maintained during all interactions with batching system
- **User Authentication** - Secure login with display names
- **State Persistence** - Canvas state saved across sessions
- **Color Picker** - Full color selection for rectangles
- **Multi-select** - Select and manipulate multiple objects
- **Keyboard Shortcuts** - Delete, duplicate, and navigation shortcuts
- **Ellipse Support** - Create and manipulate ellipse shapes
- **Automatic Reconnection** - Handles network disconnections gracefully
- **Optimized Updates** - Batched updates for smooth multi-user collaboration

## 🛠️ Tech Stack

- **Frontend:** Next.js 15 (App Router), TailwindCSS, shadcn/ui
- **Canvas:** react-konva (React wrapper for Konva.js)
- **Backend:** Supabase (Auth + Realtime + Database)
- **State Management:** React hooks (no external state library)
- **Runtime:** Bun
- **Deployment:** Vercel

## 📦 Dependencies

### Core Dependencies

- **next** - React framework with App Router
- **react** - JavaScript library for building component-based applications
- **react-konva** - React wrapper for Konva.js 2D canvas library
- **konva** - 2D canvas library (dependency of react-konva)
- **@supabase/supabase-js** - Supabase client for authentication, database, and real-time features
- **tailwindcss** - CSS framework for styling
- **@radix-ui/react-\*** - UI primitives (via shadcn/ui components)
- **@ai-sdk/openai** - AI SDK for OpenAI integration
- **ai** - Vercel AI SDK for text generation

### Development Dependencies

- **typescript** - Type checking and development
- **@types/react** - React type definitions
- **@types/konva** - Konva type definitions
- **supabase** - CLI for database management (run via `bunx supabase`)

### Key Features by Dependency

- **react-konva + konva**: Canvas rendering, shape manipulation, real-time graphics
- **@supabase/supabase-js**: User authentication, database persistence, real-time synchronization
- **@ai-sdk/openai + ai**: Natural language processing for AI commands
- **tailwindcss + @radix-ui**: Modern UI components and styling
- **next**: Server-side rendering, API routes, deployment optimization

## 🚀 Getting Started

### Prerequisites

- [Bun](https://bun.sh/) installed
- [Supabase CLI](https://supabase.com/docs/guides/cli) installed

### Local Setup

1. **Clone the repository**

   ```bash
   git clone https://github.com/lousydropout/collab-canvas
   cd collab-canvas
   ```

2. **Install dependencies**

   ```bash
   bun install
   ```

3. **Set up Supabase**

   ```bash
   bunx supabase start
   bunx supabase migration up
   ```

4. **Configure environment variables**
   Create `.env.local` with your Supabase credentials:

   ```bash
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
   NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your_supabase_publishable_key
   ```

   **Note:** Get these values from `bunx supabase status`

5. **Start the development server**

   ```bash
   bun dev
   ```

6. **Open your browser**
   Navigate to [http://localhost:3000](http://localhost:3000)

## 🎮 How to Use

1. **Register/Login** - Create an account or sign in
2. **Create Shapes** - Click and drag on the canvas to create rectangles or ellipses
3. **Move Objects** - Click and drag shapes to move them
4. **Resize Objects** - Use the corner handles to resize
5. **Multi-select** - Hold Shift and click multiple objects
6. **Delete Objects** - Select objects and press Delete key
7. **Duplicate Objects** - Select objects and press Ctrl+D
8. **Change Colors** - Use the color picker in the toolbar
9. **View Online Users** - Click the connection status indicator
10. **Switch Tools** - Use toolbar buttons to switch between rectangle and ellipse tools

## 🧪 Testing Real-time Features

1. **Open multiple browser windows/tabs** to the canvas page
2. **Login with different accounts** (or same account in different tabs)
3. **Create shapes** in one window and see them appear in others
4. **Move objects** and watch real-time synchronization
5. **See live cursors** of other users as they work
6. **Test ownership conflicts** - try to edit objects owned by others
7. **Test presence consistency** - verify user counts match across all windows
8. **Test batching performance** - monitor console for batched update messages

For detailed testing instructions, see:

- [REALTIME_TEST_GUIDE.md](./REALTIME_TEST_GUIDE.md) - Real-time collaboration testing
- [BATCHING_TEST_GUIDE.md](./BATCHING_TEST_GUIDE.md) - Performance optimization testing
- [PRESENCE_FIX_VERIFICATION.md](./PRESENCE_FIX_VERIFICATION.md) - Presence system testing

## 📁 Project Structure

```
collab-canvas/
├── app/                    # Next.js App Router
│   ├── (auth)/            # Authentication routes
│   ├── canvas/            # Main canvas page
│   └── layout.tsx         # Root layout
├── components/            # React components
│   ├── canvas/            # Canvas-specific components
│   ├── layout/            # Layout components
│   ├── auth/              # Authentication components
│   └── ui/                # shadcn/ui components
├── hooks/                 # Custom React hooks
├── lib/                   # Utility libraries
│   └── supabase/          # Supabase client configuration
├── types/                 # TypeScript type definitions
├── supabase/              # Database schema and migrations
└── memory-bank/           # Project documentation
```

## 🔧 Development Commands

```bash
# Start development server
bun dev

# Start Supabase locally
bunx supabase start

# Run database migrations
bunx supabase migration up

# Check Supabase status
bunx supabase status

# Reset database
bunx supabase db reset

# Stop Supabase
bunx supabase stop
```

## 🤖 AI Commands

CollabCanvas includes AI-powered natural language commands that let you create and modify objects using simple text instructions.

### Command Types

1. **Generate Objects**

   - "Create rectangle"
   - "Add triangle at top-right"
   - "Make rectangle that's taller than it is long"
   - "Add a 200x15 rectangle"

2. **Generate Multiple Objects**

   - "Add 3 blue circles of different sizes"
   - "16 rectangles on a 4x4 grid"
   - "34 rectangles at random positions"

3. **Modify Selected Objects**
   - "Turn blue"
   - "Make 2x as large"
   - "Move to bottom-left"

## 📊 Performance Targets ✅

- **✅ 60 FPS** - Maintained during all interactions with batching system
- **✅ <100ms** - Object sync latency across users
- **✅ <50ms** - Cursor position sync latency
- **✅ Multiple objects** - Smooth performance with many objects
- **✅ Multiple users** - Smooth collaboration with concurrent users
- **✅ Optimized Updates** - Batched updates reduce React re-renders
- **✅ Presence Consistency** - Fixed duplicate user counting issues

**Note:** Performance is better on the production site due to React rendering things twice while in development mode (due to Strict Mode).

## 🚀 Deployment

The application is deployed on Vercel and publicly accessible at [https://collab-canvas-gamma.vercel.app/](https://collab-canvas-gamma.vercel.app/).

## 📚 Documentation

- [Product Requirements Document](./PRD.md) - Detailed project specifications
- [Real-time Testing Guide](./REALTIME_TEST_GUIDE.md) - How to test collaboration features
- [Performance Testing](./PERFORMANCE_TEST.md) - Performance benchmarks and testing
- [Batching Test Guide](./BATCHING_TEST_GUIDE.md) - Performance optimization testing
- [Presence Fix Verification](./PRESENCE_FIX_VERIFICATION.md) - Presence system testing
- [Memory Bank](./memory-bank/) - Project documentation and context
- [Tasks](./tasks.md) - Development progress and completed features

## 🎯 Success Criteria ✅

### Core Requirements - ALL COMPLETE

- ✅ Canvas with pan/zoom
- ✅ Rectangle creation & movement
- ✅ Real-time 2+ user sync
- ✅ Multiplayer cursors with labels
- ✅ Online presence list (modal)
- ✅ Auth with display names
- ✅ Public deployment
- ✅ Ownership system prevents conflicts
- ✅ State persists

### Performance Goals - ALL ACHIEVED

- ✅ 60 FPS under load
- ✅ <100ms object sync
- ✅ <50ms cursor sync
- ✅ Handles multiple objects smoothly
- ✅ Supports multiple concurrent users smoothly

## 🏗️ Architecture Highlights

- **Dual Channel System** - Broadcast channels for CRUD operations + database subscriptions for ownership
- **Optimistic UI** - Immediate feedback with server validation
- **Automatic Reconnection** - Handles network disconnections gracefully
- **Creator Ownership** - Objects are owned by their creators initially
- **Atomic Ownership Claims** - Database-level validation prevents conflicts
- **Batched Updates** - 16ms timer-based flushing for smooth multi-user collaboration
- **Presence Deduplication** - Prevents duplicate user counting across reconnections
- **Shape Support** - Both rectangles and ellipses with unified transformation system

## 🔒 Conflict Resolution

### Ownership-Based Conflict Prevention

CollabCanvas implements a **claim-based ownership system** to prevent editing conflicts in real-time collaboration. Users must claim ownership of objects before they can modify them.

### How It Works

1. **Object States:**

   - **Available (`owner: "all"`)**: Any user can claim and edit
   - **Claimed (`owner: userId`)**: Only the claiming user can edit
   - **Pending**: User clicked object, awaiting server validation

2. **Claim Process:**

   ```
   User clicks object → Check if owner === "all"
   ↓
   Show yellow border (pending state)
   ↓
   Send claim request to server
   ↓
   Server validates atomically → Success/Failure
   ↓
   Update UI: Yellow → User color (success) or Owner color (failure)
   ```

3. **Visual Feedback:**

   - **Yellow Border**: Pending claim (waiting for server)
   - **User Color Border**: Successfully claimed (can edit)
   - **Red Border**: Claimed by another user (cannot edit)
   - **No Border**: Available for claiming

4. **Release Process:**
   - Owner releases by clicking empty space
   - Owner releases by finishing their edit operation
   - Object returns to `owner: "all"` state

### Why This Approach?

**Prevents Race Conditions:** Without ownership, multiple users could simultaneously modify the same object, leading to:

- Lost changes
- Inconsistent state
- Poor user experience

**Clear User Feedback:** Users always know:

- Which objects they can edit
- Which objects are being edited by others
- When their claim is pending

**Server-Side Validation:** Database-level atomic operations ensure only one user can claim an object at a time.

### Network Resilience Implications

**Online-Only Requirement:** The conflict resolution strategy requires network connectivity because:

- Ownership claims must be validated server-side
- Users cannot claim objects when offline
- This prevents offline users from creating conflicting changes

**Trade-off Decision:** While this limits offline functionality, it ensures data consistency and prevents the complex merge conflicts that would arise from offline editing.

## 🤖 AI Approach

### Single-Prompt Architecture

CollabCanvas uses a **single-prompt approach** for AI command processing, designed to avoid API key exposure while maintaining client-side canvas control.

### Architecture Overview

```
User Input → Server Action → LLM Processing → JSON Response → Client Parsing → Canvas Operations
```

### Why This Design?

**Security First:** API keys must remain server-side to prevent exposure:

- OpenAI API keys are never sent to the client
- All LLM calls happen in Next.js server actions
- Client receives only structured JSON responses

**Client-Side Canvas Control:** Canvas objects must be manipulated client-side because:

- react-konva requires direct DOM manipulation
- Real-time synchronization happens client-side
- Canvas state management is local to each client

**No Tool Calling:** Traditional AI tool calling wasn't feasible because:

- Tools would need to run client-side (security risk)
- Canvas operations require immediate UI updates
- Real-time collaboration needs local state management

### Implementation Details

1. **Server Action (`detectObjectIntent`)**:

   - Receives natural language command
   - Sends structured prompt to OpenAI GPT-4o-mini
   - Returns JSON command object

2. **Prompt Engineering**:

   - Detailed instructions for JSON response format
   - Context about viewport, selection, and canvas state
   - Examples for different command types
   - Validation rules for coordinate systems

3. **Command Types**:

   - **Create**: Single objects, batches, or patterns
   - **Modify**: Position, size, color, or text changes
   - **Layout**: Alignment and distribution operations

4. **Client Processing**:
   - Parses JSON command
   - Maps to appropriate canvas operations
   - Handles ownership claims
   - Executes with optimistic UI updates

### Example Flow

```
User: "Create a blue rectangle"
↓
Server Action: Sends prompt to OpenAI
↓
OpenAI Response: {"command": "create", "objectType": "rectangle", "color": "#0000ff", ...}
↓
Client: Parses JSON, calls createRectangle(), claims ownership
↓
Canvas: Rectangle appears with blue color
```

### Benefits

- **Secure**: API keys never exposed to client
- **Flexible**: Single prompt handles all command types
- **Efficient**: No complex tool calling infrastructure
- **Maintainable**: Clear separation between AI processing and canvas operations
- **Extensible**: Easy to add new command types via prompt engineering

## 🤝 Contributing

This project is complete and successful. Recent improvements include:

- **Ellipse Support** - Added ellipse creation and manipulation
- **Batching System** - Optimized updates for smoother multi-user collaboration
- **Presence Fix** - Resolved duplicate user counting issues
- **Performance Optimization** - Enhanced real-time synchronization

Future enhancements could include:

- Additional shape tools (text, polygons)
- Advanced transformations (rotation handles)
- Undo/redo functionality
- Mobile responsive design
- Layer management system
- Export functionality

## 📄 License

This project is part of a development challenge demonstrating AI-assisted development with comprehensive documentation and clean architecture.

---

**CollabCanvas has been successfully delivered with all requirements met and performance targets achieved.**
