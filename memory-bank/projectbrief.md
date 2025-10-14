# Project Brief: CollabCanvas MVP

## Project Overview
CollabCanvas is a real-time collaborative canvas application where multiple users can create and manipulate rectangles simultaneously on a single shared canvas, with live cursor tracking and presence awareness. This MVP serves as the foundation for a future AI-assisted design tool.

## Core Requirements
- **Timeline:** 24 hours MVP development
- **Hard Gate:** Must pass MVP checkpoint to proceed
- **Canvas:** Single shared canvas (canvasId = "default") for all users
- **Target:** Real-time collaboration with 5+ concurrent users

## Key Features
1. **User Authentication** - Email/password with Supabase
2. **Canvas Workspace** - 5000x5000px with pan/zoom (10%-500%)
3. **Rectangle Objects** - Create, move, resize, delete with Konva.js
4. **Object Ownership** - Claim/release system to prevent conflicts
5. **Real-time Sync** - Supabase Realtime for live collaboration
6. **Multiplayer Cursors** - Live cursor tracking with user names
7. **Presence Awareness** - Show online users and status

## Technical Stack
- **Frontend:** Next.js 15 (App Router), TailwindCSS, shadcn/ui
- **Canvas:** react-konva (React wrapper for Konva.js)
- **Backend:** Supabase (Auth + Realtime + Database)
- **Runtime:** Bun
- **Deployment:** Vercel

## Success Criteria
- ✅ 60 FPS maintained during all interactions
- ✅ Object sync <100ms latency
- ✅ Cursor sync <50ms latency
- ✅ Handles 500+ objects without degradation
- ✅ Supports 5+ concurrent users smoothly
- ✅ State persists across sessions
- ✅ Public deployment accessible

## Current Status
The project is in active development with core features implemented:
- Authentication system ✅
- Basic canvas with pan/zoom ✅
- Rectangle creation and manipulation ✅
- Real-time synchronization ✅
- Ownership system ✅
- Multiplayer cursors ✅
- Presence tracking ✅

## Next Steps
- User list UI and presence awareness
- Periodic delta sync for state consistency
- Performance optimization and testing
- UI/UX polish and final testing
