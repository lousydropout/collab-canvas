# CollabCanvas MVP — Progress Checklist

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
│   │   ├── Canvas.tsx
│   │   ├── CanvasStage.tsx
│   │   ├── Rectangle.tsx
│   │   ├── Transformer.tsx
│   │   ├── Cursor.tsx
│   │   └── Grid.tsx
│   ├── layout/
│   │   ├── Header.tsx
│   │   ├── Toolbar.tsx
│   │   └── UserList.tsx
│   └── auth/
│       ├── LoginForm.tsx
│       └── RegisterForm.tsx
├── lib/
│   ├── supabase/
│   │   ├── client.ts
│   │   ├── auth.ts
│   │   └── realtime.ts
│   ├── canvas/
│   │   ├── types.ts
│   │   ├── konva-manager.ts
│   │   ├── ownership.ts
│   │   ├── sync.ts
│   │   └── utils.ts
│   └── utils.ts
├── hooks/
│   ├── useAuth.ts
│   ├── useCanvas.ts
│   ├── useRealtime.ts
│   ├── usePresence.ts
│   └── useOwnership.ts
├── types/
│   ├── canvas.ts
│   ├── events.ts
│   └── user.ts
├── public/
│   └── ...
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

## 🧩 Pull Request Progress

### **PR #1: Project Setup & Authentication** 🚧

**Goal:** Initialize project with authentication.

* [x] Initialize Next.js project with Bun
* [x] Install dependencies (Tailwind, shadcn/ui, Supabase, Konva)  
* [x] Configure Supabase project and `.env`
* [x] Set up Git repository
* [x] Deploy to Vercel (initial deployment)
* [x] Create `profiles` schema
* [ ] Build auth UI (login/register)
* [ ] Add protected routes

---

### **PR #2: Basic Canvas with Pan/Zoom** 🎨

**Goal:** Core canvas functionality.

* [ ] Set up Konva Stage and Layer
* [ ] Implement pan (drag background)
* [ ] Implement zoom (scroll wheel)
* [ ] Create canvas page layout
* [ ] Add header and toolbar (stub)
* [ ] Test 60 FPS

---

### **PR #3: Rectangle Creation & Rendering** 📦

**Goal:** Draw and render rectangles.

* [ ] Add rectangle creation tool
* [ ] Implement Rectangle component
* [ ] Store rectangles in local state
* [ ] Persist rectangles to Supabase
* [ ] Load rectangles on refresh
* [ ] Test 100+ rectangles

---

### **PR #4: Object Selection & Transformation** 🔧

**Goal:** Move, resize, select, and delete objects.

* [ ] Add click-to-select
* [ ] Add Konva Transformer
* [ ] Implement drag-to-move
* [ ] Multi-select (Shift+click)
* [ ] Delete and duplicate
* [ ] Update positions in DB

---

### **PR #5: Supabase Realtime Integration** 🔄

**Goal:** Real-time sync across clients.

* [ ] Create Realtime channel
* [ ] Subscribe to object CRUD events
* [ ] Broadcast changes
* [ ] Handle incoming events
* [ ] Set up presence channel
* [ ] Test with 2+ browsers

---

### **PR #6: Ownership System with Claim-Confirm** 🔒

**Goal:** Prevent editing conflicts.

* [ ] Implement claim/release APIs
* [ ] Add ownership claim logic
* [ ] Add ownership visuals (borders)
* [ ] Server-validate ownership
* [ ] Broadcast ownership updates
* [ ] Handle rejections gracefully

---

### **PR #7: Multiplayer Cursors** 👆

**Goal:** Show all users' cursors live.

* [ ] Track local cursor position
* [ ] Broadcast via presence
* [ ] Render others' cursors
* [ ] Show user names/colors
* [ ] Throttle updates (~20ms)
* [ ] Remove cursors on disconnect

---

### **PR #8: User List & Presence Awareness** 👥

**Goal:** Display online users and statuses.

* [ ] Create user list sidebar
* [ ] Show avatars and colors
* [ ] Track join/leave
* [ ] Match cursor colors
* [ ] Add logout function

---

### **PR #9: Periodic Delta Sync** 🔁

**Goal:** Ensure state consistency.

* [ ] Create delta sync API
* [ ] Track last sync timestamp
* [ ] Query DB for deltas
* [ ] Merge delta updates
* [ ] Reconnect gracefully
* [ ] Recover missed events

---

### **PR #10: Performance Optimization & Testing** ⚡

**Goal:** Maintain 60 FPS, <100ms sync.

* [ ] Optimize rendering (cache layers)
* [ ] Add viewport culling if needed
* [ ] Debounce expensive ops
* [ ] Add perf monitoring
* [ ] Test with 500+ objects
* [ ] Throttle networks and stress test

---

### **PR #11: UI/UX Polish & Final Testing** ✨

**Goal:** Final polish and launch prep.

* [ ] Add keyboard shortcuts
* [ ] Improve visuals and feedback
* [ ] Add loading and error states
* [ ] Polish toolbar and header
* [ ] End-to-end test
* [ ] Update README
* [ ] Create demo video

---

## 🧠 Success Criteria Checklist

### MVP Requirements

* [ ] Canvas with pan/zoom
* [ ] Rectangle creation & movement
* [ ] Real-time 2+ user sync
* [ ] Multiplayer cursors with labels
* [ ] Online presence list
* [ ] Auth with display names
* [x] Public deployment
* [ ] Ownership system prevents conflicts
* [ ] State persists

### Performance Goals

* [ ] 60 FPS under load
* [ ] <100ms object sync
* [ ] <50ms cursor sync
* [ ] Handles 500+ objects
* [ ] 5+ concurrent users smoothly