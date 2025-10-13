# CollabCanvas MVP - Task List & File Structure

## Project File Structure

```
collabcanvas/
├── app/
│   ├── (auth)/
│   │   ├── login/
│   │   │   └── page.tsx
│   │   └── register/
│   │       └── page.tsx
│   ├── canvas/
│   │   └── page.tsx                 # Main canvas page
│   ├── api/
│   │   ├── auth/
│   │   │   └── route.ts             # Auth API routes (if needed)
│   │   └── canvas/
│   │       ├── claim/
│   │       │   └── route.ts         # Object claim validation
│   │       ├── release/
│   │       │   └── route.ts         # Object release validation
│   │       └── sync/
│   │           └── route.ts         # Delta sync endpoint
│   ├── layout.tsx
│   ├── page.tsx                     # Landing/redirect page
│   └── globals.css
├── components/
│   ├── ui/                          # shadcn/ui components
│   │   ├── button.tsx
│   │   ├── input.tsx
│   │   ├── card.tsx
│   │   ├── avatar.tsx
│   │   └── ...
│   ├── canvas/
│   │   ├── Canvas.tsx               # Main Konva canvas wrapper
│   │   ├── CanvasStage.tsx          # Konva Stage component
│   │   ├── Rectangle.tsx            # Rectangle shape component
│   │   ├── Transformer.tsx          # Selection/transform handles
│   │   ├── Cursor.tsx               # Multiplayer cursor
│   │   └── Grid.tsx                 # Optional background grid
│   ├── layout/
│   │   ├── Header.tsx               # Top header with logo/logout
│   │   ├── Toolbar.tsx              # Rectangle/select/delete tools
│   │   └── UserList.tsx             # Online users sidebar
│   └── auth/
│       ├── LoginForm.tsx
│       └── RegisterForm.tsx
├── lib/
│   ├── supabase/
│   │   ├── client.ts                # Supabase client initialization
│   │   ├── auth.ts                  # Auth helpers
│   │   └── realtime.ts              # Realtime channel setup
│   ├── canvas/
│   │   ├── types.ts                 # TypeScript types/interfaces
│   │   ├── konva-manager.ts         # Konva instance management
│   │   ├── ownership.ts             # Ownership claim/release logic
│   │   ├── sync.ts                  # Delta sync logic
│   │   └── utils.ts                 # Canvas utility functions
│   └── utils.ts                     # General utilities
├── hooks/
│   ├── useAuth.ts                   # Authentication hook
│   ├── useCanvas.ts                 # Canvas state management
│   ├── useRealtime.ts               # Realtime subscription hook
│   ├── usePresence.ts               # User presence hook
│   └── useOwnership.ts              # Object ownership hook
├── types/
│   ├── canvas.ts                    # Canvas-related types
│   ├── events.ts                    # Realtime event types
│   └── user.ts                      # User types
├── public/
│   └── ...                          # Static assets
├── supabase/
│   ├── migrations/
│   │   ├── 001_users.sql
│   │   ├── 002_canvas_objects.sql
│   │   └── 003_rls_policies.sql
│   └── config.toml
├── .env.local
├── .env.example
├── next.config.js
├── tailwind.config.ts
├── tsconfig.json
├── package.json
├── bun.lockb
└── README.md
```

---

## Pull Request Breakdown

### **PR #1: Project Setup & Authentication** ✅ Foundation

**Goal:** Initialize Next.js project with authentication flow

**Tasks:**
1. Initialize Next.js project with Bun
2. Install and configure dependencies (TailwindCSS, shadcn/ui, Supabase, Konva)
3. Set up Supabase project and configure environment variables
4. Create database schema (users table)
5. Implement authentication UI (login/register)
6. Set up protected routes
7. Deploy skeleton to Vercel

**Files to Create:**
- `package.json`
- `.env.local`, `.env.example`
- `next.config.js`
- `tailwind.config.ts`
- `app/layout.tsx`
- `app/page.tsx`
- `app/globals.css`
- `app/(auth)/login/page.tsx`
- `app/(auth)/register/page.tsx`
- `components/auth/LoginForm.tsx`
- `components/auth/RegisterForm.tsx`
- `components/ui/button.tsx` (shadcn)
- `components/ui/input.tsx` (shadcn)
- `components/ui/card.tsx` (shadcn)
- `lib/supabase/client.ts`
- `lib/supabase/auth.ts`
- `lib/utils.ts`
- `hooks/useAuth.ts`
- `types/user.ts`
- `supabase/migrations/001_users.sql`
- `README.md`

**Files to Modify:**
- None (initial setup)

---

### **PR #2: Basic Canvas with Pan/Zoom** 🎨 Core Canvas

**Goal:** Create Konva canvas with pan and zoom capabilities

**Tasks:**
1. Set up Konva Stage and Layer
2. Implement pan (click and drag background)
3. Implement zoom (mouse wheel)
4. Create canvas page with proper layout
5. Add header and toolbar UI (empty for now)
6. Test 60 FPS performance

**Files to Create:**
- `app/canvas/page.tsx`
- `components/canvas/Canvas.tsx`
- `components/canvas/CanvasStage.tsx`
- `components/layout/Header.tsx`
- `components/layout/Toolbar.tsx`
- `lib/canvas/konva-manager.ts`
- `lib/canvas/types.ts`
- `lib/canvas/utils.ts`
- `hooks/useCanvas.ts`
- `types/canvas.ts`

**Files to Modify:**
- `app/layout.tsx` (add canvas route protection)

---

### **PR #3: Rectangle Creation & Rendering** 📦 Shapes

**Goal:** Allow users to create and render rectangles on canvas

**Tasks:**
1. Implement rectangle creation tool (click and drag)
2. Create Rectangle component with Konva.Rect
3. Store rectangles in local state
4. Render rectangles on canvas
5. Persist rectangles to Supabase database
6. Load existing rectangles on page load
7. Test with 100+ rectangles for performance

**Files to Create:**
- `components/canvas/Rectangle.tsx`
- `supabase/migrations/002_canvas_objects.sql`

**Files to Modify:**
- `components/canvas/Canvas.tsx` (add rectangle creation logic)
- `components/canvas/CanvasStage.tsx` (render rectangles)
- `components/layout/Toolbar.tsx` (add rectangle tool button)
- `lib/canvas/types.ts` (add Rectangle interface)
- `lib/supabase/client.ts` (add canvas object queries)
- `hooks/useCanvas.ts` (add rectangle state management)
- `types/canvas.ts` (add shape types)

---

### **PR #4: Object Selection & Transformation** 🔧 Interaction

**Goal:** Enable selecting, moving, and resizing rectangles

**Tasks:**
1. Implement click-to-select functionality
2. Add Konva Transformer for resize handles
3. Implement drag-to-move
4. Add multi-select (shift+click)
5. Update rectangle positions in database
6. Add delete functionality (keyboard + button)
7. Add duplicate functionality (Ctrl+D)

**Files to Create:**
- `components/canvas/Transformer.tsx`

**Files to Modify:**
- `components/canvas/Canvas.tsx` (add selection logic)
- `components/canvas/Rectangle.tsx` (add drag handlers)
- `components/layout/Toolbar.tsx` (add select/delete buttons)
- `lib/canvas/utils.ts` (add selection utilities)
- `hooks/useCanvas.ts` (add selection state)

---

### **PR #5: Supabase Realtime Integration** 🔄 Real-time Setup

**Goal:** Set up Supabase Realtime channels for object sync

**Tasks:**
1. Create Realtime channel for canvas objects
2. Subscribe to object CRUD events
3. Broadcast object create/update/delete
4. Handle incoming events and update local state
5. Set up presence channel
6. Test with 2 browser windows

**Files to Create:**
- `lib/supabase/realtime.ts`
- `hooks/useRealtime.ts`
- `types/events.ts`

**Files to Modify:**
- `components/canvas/Canvas.tsx` (integrate realtime)
- `lib/canvas/types.ts` (add event types)
- `hooks/useCanvas.ts` (handle realtime events)

---

### **PR #6: Ownership System with Claim-Confirm** 🔒 Conflict Resolution

**Goal:** Implement server-validated ownership to prevent conflicts

**Tasks:**
1. Create server-side validation API routes (claim/release)
2. Implement ownership claim flow (optimistic UI)
3. Add visual feedback (yellow → user color → owner color borders)
4. Validate ownership on server before allowing updates
5. Broadcast ownership changes via Realtime
6. Handle claim rejection gracefully
7. Test concurrent claims from multiple users

**Files to Create:**
- `app/api/canvas/claim/route.ts`
- `app/api/canvas/release/route.ts`
- `lib/canvas/ownership.ts`
- `hooks/useOwnership.ts`
- `supabase/migrations/003_rls_policies.sql`

**Files to Modify:**
- `components/canvas/Rectangle.tsx` (add ownership visual states)
- `components/canvas/Canvas.tsx` (integrate ownership)
- `lib/canvas/types.ts` (add ownership types)
- `lib/supabase/realtime.ts` (add ownership events)
- `hooks/useCanvas.ts` (ownership state management)
- `types/events.ts` (add claim/release events)

---

### **PR #7: Multiplayer Cursors** 👆 Presence

**Goal:** Show real-time cursor positions for all users

**Tasks:**
1. Track local cursor position on canvas
2. Broadcast cursor movements via presence channel
3. Subscribe to other users' cursor positions
4. Render cursors with user names and colors
5. Throttle cursor updates to ~20ms
6. Remove cursors when users disconnect
7. Test with 5+ concurrent users

**Files to Create:**
- `components/canvas/Cursor.tsx`
- `hooks/usePresence.ts`

**Files to Modify:**
- `components/canvas/Canvas.tsx` (track and render cursors)
- `lib/supabase/realtime.ts` (add presence channel)
- `types/events.ts` (add cursor event types)
- `types/user.ts` (add cursor properties)

---

### **PR #8: User List & Presence Awareness** 👥 Collaboration UI

**Goal:** Display online users and their status

**Tasks:**
1. Create user list sidebar/component
2. Show user avatars/initials with colors
3. Display online/active status
4. Handle user join/leave events
5. Assign unique colors to users
6. Add logout functionality to header

**Files to Create:**
- `components/layout/UserList.tsx`
- `components/ui/avatar.tsx` (shadcn)

**Files to Modify:**
- `components/layout/Header.tsx` (add user info and logout)
- `app/canvas/page.tsx` (add UserList component)
- `hooks/usePresence.ts` (track online users)
- `lib/supabase/auth.ts` (add logout function)

---

### **PR #9: Periodic Delta Sync** 🔄 State Synchronization

**Goal:** Implement 10-second delta sync for state consistency

**Tasks:**
1. Create delta sync API endpoint
2. Track client's last sync timestamp
3. Query changes since timestamp from database
4. Send delta sync request every 10 seconds
5. Merge delta changes with local state (server wins)
6. Handle edge cases (delayed responses, missed events)
7. Test sync recovery after network issues

**Files to Create:**
- `app/api/canvas/sync/route.ts`
- `lib/canvas/sync.ts`

**Files to Modify:**
- `components/canvas/Canvas.tsx` (add periodic sync)
- `hooks/useRealtime.ts` (integrate delta sync)
- `lib/supabase/client.ts` (add sync queries)
- `types/events.ts` (add delta sync events)

---

### **PR #10: Performance Optimization & Testing** ⚡ Polish

**Goal:** Ensure 60 FPS and <100ms sync latency

**Tasks:**
1. Optimize Konva rendering (layer caching)
2. Implement viewport culling if needed
3. Debounce expensive operations
4. Add performance monitoring
5. Test with 500+ objects
6. Test with 5+ concurrent users
7. Test on throttled network (Fast 3G)
8. Fix any performance bottlenecks

**Files to Create:**
- `lib/canvas/performance.ts` (monitoring utilities)

**Files to Modify:**
- `components/canvas/CanvasStage.tsx` (rendering optimizations)
- `components/canvas/Rectangle.tsx` (minimize re-renders)
- `lib/canvas/konva-manager.ts` (layer caching)
- `hooks/useCanvas.ts` (optimize state updates)

---

### **PR #11: UI/UX Polish & Final Testing** ✨ Final Touches

**Goal:** Polish UI and ensure all MVP requirements are met

**Tasks:**
1. Add keyboard shortcuts (Delete, Ctrl+D, Ctrl+A, Escape)
2. Improve visual feedback for all interactions
3. Add loading states and error handling
4. Improve toolbar and header styling
5. Test all user flows end-to-end
6. Fix any remaining bugs
7. Update README with setup instructions
8. Create demo video

**Files to Modify:**
- `components/canvas/Canvas.tsx` (keyboard shortcuts)
- `components/layout/Header.tsx` (styling)
- `components/layout/Toolbar.tsx` (styling)
- `components/layout/UserList.tsx` (styling)
- `app/canvas/page.tsx` (loading states)
- `components/auth/LoginForm.tsx` (error handling)
- `README.md` (documentation)

---

## Development Timeline (24 Hours)

### Hours 1-6: Foundation
- **PR #1:** Project Setup & Authentication (3 hours)
- **PR #2:** Basic Canvas with Pan/Zoom (3 hours)

### Hours 7-12: Core Features
- **PR #3:** Rectangle Creation & Rendering (2 hours)
- **PR #4:** Object Selection & Transformation (2 hours)
- **PR #5:** Supabase Realtime Integration (2 hours)

### Hours 13-18: Collaboration
- **PR #6:** Ownership System (3 hours)
- **PR #7:** Multiplayer Cursors (2 hours)
- **PR #8:** User List & Presence (1 hour)

### Hours 19-22: Sync & Performance
- **PR #9:** Periodic Delta Sync (2 hours)
- **PR #10:** Performance Optimization (2 hours)

### Hours 23-24: Polish
- **PR #11:** UI/UX Polish & Testing (2 hours)

---

## Testing Checklist (Per PR)

### PR #1 ✅
- [ ] Can register new account
- [ ] Can login with email/password
- [ ] Session persists after refresh
- [ ] Protected routes redirect to login
- [ ] Deployed to Vercel successfully

### PR #2 ✅
- [ ] Canvas renders correctly
- [ ] Can pan by dragging background
- [ ] Can zoom with mouse wheel
- [ ] Maintains 60 FPS during pan/zoom
- [ ] Canvas is spacious (5000x5000)

### PR #3 ✅
- [ ] Can create rectangle by dragging
- [ ] Rectangle appears on canvas
- [ ] Rectangle persists in database
- [ ] Rectangles load on page refresh
- [ ] 100+ rectangles render smoothly

### PR #4 ✅
- [ ] Can click to select rectangle
- [ ] Can drag to move rectangle
- [ ] Can resize with handles
- [ ] Can multi-select with shift+click
- [ ] Can delete with backspace
- [ ] Can duplicate with Ctrl+D

### PR #5 ✅
- [ ] Two browsers see same canvas
- [ ] Creating rectangle appears in other browser
- [ ] Moving rectangle syncs in real-time
- [ ] Deleting rectangle syncs correctly
- [ ] Sync latency <100ms

### PR #6 ✅
- [ ] Yellow border appears on click
- [ ] User color border on successful claim
- [ ] Owner's color border when locked
- [ ] Can't move object owned by another
- [ ] Claim rejected when already owned
- [ ] Released objects become available

### PR #7 ✅
- [ ] Other users' cursors visible
- [ ] Cursor names display correctly
- [ ] Cursors move smoothly
- [ ] Cursor updates <50ms latency
- [ ] Cursors disappear on disconnect

### PR #8 ✅
- [ ] User list shows online users
- [ ] User colors match cursors
- [ ] Join/leave updates work
- [ ] Can logout successfully
- [ ] User count is accurate

### PR #9 ✅
- [ ] Delta sync happens every 10s
- [ ] Missed events recovered
- [ ] Reconnection works properly
- [ ] Server state wins conflicts
- [ ] Delayed claims get corrected

### PR #10 ✅
- [ ] 60 FPS with 500+ objects
- [ ] No lag during rapid operations
- [ ] Performance stable with 5+ users
- [ ] Network throttling handled well

### PR #11 ✅
- [ ] All keyboard shortcuts work
- [ ] All visual feedback clear
- [ ] No console errors
- [ ] All user flows work end-to-end
- [ ] README is complete
- [ ] Demo video created

---

## Git Branch Strategy

```
main (production)
  ├── PR #1: feat/setup-auth
  ├── PR #2: feat/canvas-pan-zoom
  ├── PR #3: feat/rectangle-creation
  ├── PR #4: feat/object-transform
  ├── PR #5: feat/realtime-sync
  ├── PR #6: feat/ownership-system
  ├── PR #7: feat/multiplayer-cursors
  ├── PR #8: feat/user-presence
  ├── PR #9: feat/delta-sync
  ├── PR #10: feat/performance-optimization
  └── PR #11: feat/ui-polish
```

---

## Dependencies to Install

```json
{
  "dependencies": {
    "next": "^14.0.0",
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "@supabase/supabase-js": "^2.39.0",
    "konva": "^9.2.0",
    "zustand": "^4.4.0",
    "tailwindcss": "^3.3.0",
    "class-variance-authority": "^0.7.0",
    "clsx": "^2.0.0",
    "tailwind-merge": "^2.0.0"
  },
  "devDependencies": {
    "@types/node": "^20.0.0",
    "@types/react": "^18.2.0",
    "@types/react-dom": "^18.2.0",
    "typescript": "^5.0.0",
    "autoprefixer": "^10.4.16",
    "postcss": "^8.4.31"
  }
}
```

---

## Environment Variables

```bash
# .env.example
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

---

## Success Criteria Checklist

### MVP Gate Requirements
- [ ] Basic canvas with pan/zoom
- [ ] Rectangle creation and movement
- [ ] Real-time sync between 2+ users
- [ ] Multiplayer cursors with name labels
- [ ] Presence awareness (who's online)
- [ ] User authentication with display names
- [ ] Deployed and publicly accessible
- [ ] Object ownership prevents conflicts
- [ ] State persists across sessions

### Performance Requirements
- [ ] 60 FPS maintained during all interactions
- [ ] Object sync <100ms latency
- [ ] Cursor sync <50ms latency
- [ ] Handles 500+ objects without degradation
- [ ] Supports 5+ concurrent users smoothly