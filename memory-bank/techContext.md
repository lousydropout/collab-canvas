# Technical Context: CollabCanvas

## Technology Stack

### Frontend
- **Framework:** Next.js 15 with App Router
- **Runtime:** Bun (package manager and runtime)
- **Styling:** TailwindCSS + shadcn/ui components
- **Canvas Library:** react-konva (React wrapper for Konva.js)
- **State Management:** React hooks (no external state library needed)
- **TypeScript:** Full type safety throughout

### Backend & Services
- **Authentication:** Supabase Auth (email + password)
- **Database:** Supabase PostgreSQL with Row Level Security
- **Real-time:** Supabase Realtime (WebSocket-based)
- **Deployment:** Vercel (Next.js optimized)

### Development Tools
- **Package Manager:** Bun (faster than npm/yarn)
- **Database Migrations:** Supabase CLI
- **Type Checking:** TypeScript strict mode
- **Linting:** ESLint + Prettier (if configured)

## Project Structure
```
collab-canvas/
├── app/                    # Next.js App Router
│   ├── (auth)/            # Auth route group
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

## Key Dependencies

### Core Dependencies
- **next** - React framework
- **react** - JavaScript library for building component-based applications
- **react-konva** - React wrapper for Konva.js 2D canvas library
- **konva** - 2D canvas library (dependency of react-konva)
- **@supabase/supabase-js** - Supabase client
- **tailwindcss** - CSS framework
- **@radix-ui/react-*** - UI primitives (via shadcn/ui)

### Development Dependencies
- **typescript** - Type checking
- **@types/react** - React types
- **@types/konva** - Konva types
- **supabase** - CLI for database management (run via `bunx supabase`)

## Database Schema

### Tables
```sql
-- User profiles
profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id),
  display_name text NOT NULL,
  created_at timestamp DEFAULT now(),
  updated_at timestamp DEFAULT now()
)

-- Canvas objects
canvas_objects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  canvas_id text NOT NULL DEFAULT 'default',
  type text NOT NULL DEFAULT 'rectangle',
  x numeric NOT NULL,
  y numeric NOT NULL,
  width numeric NOT NULL,
  height numeric NOT NULL,
  color text NOT NULL DEFAULT '#000000',
  rotation numeric NOT NULL DEFAULT 0,
  owner text NOT NULL DEFAULT 'all',
  created_by uuid REFERENCES profiles(id),
  created_at timestamp DEFAULT now(),
  updated_at timestamp DEFAULT now()
)
```

### Row Level Security (RLS)
- **profiles:** Users can read all profiles, update only their own
- **canvas_objects:** Users can read all objects, create/update/delete with proper ownership

## Environment Configuration

### Required Environment Variables
```bash
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

### Development Setup
1. **Supabase Local Development:**
   ```bash
   bunx supabase start
   bunx supabase db reset
   ```

2. **Application Development:**
   ```bash
   bun install
   bun dev
   ```

## Performance Considerations

### Canvas Performance
- **React-Konva Optimization:** Use Layer caching for static objects
- **Update Throttling:** 50ms throttling for cursor/position updates
- **Viewport Culling:** Only render visible objects (if needed)

### Network Performance
- **Broadcast Channels:** Real-time updates via WebSocket
- **Database Persistence:** Debounced writes (100ms)
- **Delta Sync:** Periodic sync of recent changes only

### Memory Management
- **Event Cleanup:** Proper cleanup of Konva listeners
- **Channel Cleanup:** Supabase channel cleanup on unmount
- **State Cleanup:** Clear state on user logout

## Security Considerations

### Authentication
- **Supabase Auth:** Secure JWT-based authentication
- **Route Protection:** Protected routes with auth checks
- **Session Management:** Automatic session refresh

### Data Security
- **Row Level Security:** Database-level access control
- **Input Validation:** Server-side validation for all operations
- **CORS Configuration:** Proper CORS setup for production

## Deployment Configuration

### Vercel Deployment
- **Environment Variables:** Set in Vercel dashboard
- **Build Command:** `bun run build`
- **Output Directory:** `.next`
- **Node Version:** 18.x or higher

### Supabase Production
- **Database:** Production Supabase project
- **Realtime:** Production realtime channels
- **Auth:** Production authentication service
