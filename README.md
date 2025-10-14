# CollabCanvas MVP

A real-time collaborative canvas application where multiple users can create and manipulate rectangles simultaneously on a shared canvas, with live cursor tracking and presence awareness.

## 🎯 Project Overview

CollabCanvas is an MVP for a collaborative design tool that enables multiple users to work together in real-time on a shared canvas. Users can create, move, resize, and delete rectangles while seeing each other's cursors and presence.

## ✨ Features

- **Real-time Collaboration** - Multiple users editing simultaneously
- **Live Cursors** - See where other users are working
- **Presence Awareness** - Know who's online and active
- **Object Ownership** - Prevents editing conflicts with claim/release system
- **Smooth Performance** - 60 FPS maintained during all interactions
- **User Authentication** - Secure login with display names
- **State Persistence** - Canvas state saved across sessions

## 🛠️ Tech Stack

- **Frontend:** Next.js 15 (App Router), TailwindCSS, shadcn/ui
- **Canvas:** react-konva (React wrapper for Konva.js)
- **Backend:** Supabase (Auth + Realtime + Database)
- **Runtime:** Bun
- **Deployment:** Vercel

## 🚀 Getting Started

### Prerequisites

- [Bun](https://bun.sh/) installed
- [Supabase CLI](https://supabase.com/docs/guides/cli) installed

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd collab-canvas
   ```

2. **Install dependencies**
   ```bash
   bun install
   ```

3. **Set up Supabase**
   ```bash
   bunx supabase start
   bunx supabase db reset
   ```

4. **Configure environment variables**
   Create `.env.local` with your Supabase credentials:
   ```bash
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
   ```

5. **Start the development server**
   ```bash
   bun dev
   ```

6. **Open your browser**
   Navigate to [http://localhost:3000](http://localhost:3000)

## 🎮 How to Use

1. **Register/Login** - Create an account or sign in
2. **Create Rectangles** - Click and drag on the canvas
3. **Move Objects** - Click and drag rectangles to move them
4. **Resize Objects** - Use the corner handles to resize
5. **Multi-select** - Hold Shift and click multiple objects
6. **Delete Objects** - Select objects and press Delete key
7. **Duplicate Objects** - Select objects and press Ctrl+D

## 🧪 Testing Real-time Features

1. **Open multiple browser windows/tabs** to the canvas page
2. **Login with different accounts** (or same account in different tabs)
3. **Create rectangles** in one window and see them appear in others
4. **Move objects** and watch real-time synchronization
5. **See live cursors** of other users as they work

For detailed testing instructions, see [REALTIME_TEST_GUIDE.md](./REALTIME_TEST_GUIDE.md).

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

# Reset database
bunx supabase db reset

# Stop Supabase
bunx supabase stop

# Build for production
bun run build

# Start production server
bun start
```

## 📊 Performance Targets

- **60 FPS** - Maintained during all interactions
- **<100ms** - Object sync latency across users
- **<50ms** - Cursor position sync latency
- **500+ objects** - No FPS degradation
- **5+ concurrent users** - No performance loss

## 🚀 Deployment

The application is deployed on Vercel. For deployment instructions, see the [Vercel deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying).

## 📚 Documentation

- [Product Requirements Document](./PRD.md) - Detailed project specifications
- [Real-time Testing Guide](./REALTIME_TEST_GUIDE.md) - How to test collaboration features
- [Performance Testing](./PERFORMANCE_TEST.md) - Performance benchmarks and testing
- [Memory Bank](./memory-bank/) - Project documentation and context

## 🤝 Contributing

This is an MVP project. For contribution guidelines, please refer to the project documentation in the `memory-bank/` directory.

## 📄 License

This project is part of a development challenge. Please refer to the project requirements for licensing information.

## 🎯 Success Criteria

### MVP Requirements ✅
- ✅ Canvas with pan/zoom
- ✅ Rectangle creation & movement
- ✅ Real-time 2+ user sync
- ✅ Multiplayer cursors with labels
- ✅ Online presence list
- ✅ Auth with display names
- ✅ Public deployment
- ✅ Ownership system prevents conflicts
- ✅ State persists

### Performance Goals ✅
- ✅ <100ms object sync
- ✅ <50ms cursor sync
- 🔄 60 FPS under load (testing in progress)
- 🔄 Handles 500+ objects (testing in progress)
- 🔄 5+ concurrent users smoothly (testing in progress)