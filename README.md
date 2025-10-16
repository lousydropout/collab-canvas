# CollabCanvas MVP ✅

**🎉 MVP SUCCESSFULLY DELIVERED!**

A real-time collaborative canvas application where multiple users can create and manipulate rectangles simultaneously on a shared canvas, with live cursor tracking and presence awareness.

## 🎯 Project Overview

CollabCanvas is a completed MVP for a collaborative design tool that enables multiple users to work together in real-time on a shared canvas. Users can create, move, resize, and delete rectangles while seeing each other's cursors and presence. The system prevents race conditions through an ownership mechanism where objects must be selected and claimed before modification.

**Status:** ✅ **COMPLETE** - All MVP requirements met and performance targets achieved.

## 🏗️ Architecture

![CollabCanvas Architecture](./diagram.png)

The application uses a dual-channel real-time architecture with direct database operations for ownership management.

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

### MVP Requirements - ALL COMPLETE
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

### Ownership Conflict Management

The ownership system prevents editing conflicts through an atomic claim/release mechanism:

1. **Pending Claim** - When a user clicks an object, they make a pending claim (yellow border)
2. **Server Validation** - Database validates the claim atomically (only if `owner === "all"`)
3. **Success** - User can move the object, which shows their color border
4. **Rejection** - If another user claimed it first, shows red border with owner's name
5. **Locked State** - Other users cannot select the object until the owner releases it
6. **Release** - Owner releases by clicking empty space or finishing their edit

This ensures only one user can edit an object at a time while providing clear visual feedback about ownership status.

**Note:** To prevent race conditions when users modify objects, objects have to be selected and claimed before they can be modified. This prevents conflicts when multiple users try to edit the same object simultaneously.

## 🤝 Contributing

This MVP is complete and successful. Recent improvements include:
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

**The CollabCanvas MVP has been successfully delivered with all requirements met and performance targets achieved.**