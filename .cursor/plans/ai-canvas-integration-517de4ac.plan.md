<!-- 517de4ac-893d-41e0-98e2-45501d11e3f1 0843f2ff-3e1e-476e-bf73-7ab8d5b6a314 -->
# AI Canvas Integration Plan

## Overview

Refactor existing canvas operations into a clean service layer, then add LangChain-powered AI chat that allows users to create and manipulate canvas objects using natural language.

## Phase 1: Refactor Canvas Operations into Service Layer

### 1.1 Create CanvasOperations Service

**File:** `lib/canvas/CanvasOperations.ts`

Extract all canvas operation logic from `useCanvas` hook into a service class:

- `createRectangle(data)` - Create rectangle with position, size, color
- `createEllipse(data)` - Create ellipse with position, size, color
- `updateObject(id, updates)` - Update any object property
- `deleteObjects(ids)` - Delete one or more objects
- `duplicateObjects(ids)` - Duplicate selected objects
- `moveObject(id, deltaX, deltaY)` - Move object by delta
- `getObject(id)` - Get single object by ID
- `getAllObjects()` - Get all objects on canvas
- `createRandomObject(canvasWidth, canvasHeight)` - Create random shape

The service will accept dependencies via constructor:

```typescript
constructor(
  private supabase: SupabaseClient,
  private realtime: RealtimeService, 
  private user: User,
  private canvasId: string
)
```

### 1.2 Update useCanvas Hook

**File:** `hooks/useCanvas.ts`

Refactor to use `CanvasOperations` service:

- Create `CanvasOperations` instance with `useMemo`
- Delegate all operations to the service
- Keep UI state management (selectedObjects, tool, color)
- Keep batching and realtime event handling

### 1.3 Create Coordinate Helper

**File:** `lib/canvas/coordinateUtils.ts`

Add utility functions for coordinate parsing:

- `parseCoordinate(value, viewportSize)` - Parse "100", "50%", "center", etc.
- `parsePosition(x, y, canvasSize)` - Parse position strings
- Natural language keywords: "center", "top", "bottom", "left", "right", "top-left", etc.

## Phase 2: LangChain AI Integration

### 2.1 Install Dependencies

```bash
bun add @langchain/openai @langchain/core langchain
```

### 2.2 Create AI Tools

**File:** `lib/ai/canvasTools.ts`

Create LangChain tools using the `tool` function from `@langchain/core/tools`:

- `createRectangleTool` - Create rectangle with natural language parameters
- `createEllipseTool` - Create ellipse with natural language parameters  
- `moveObjectTool` - Move object by pixels or percentage
- `deleteObjectsTool` - Delete objects by selection or criteria
- `createRandomObjectTool` - Create random shapes

Each tool uses `CanvasOperations` service and `coordinateUtils`.

### 2.3 Create AI Service

**File:** `lib/ai/CanvasAI.ts`

LangChain agent service:

- Initialize `ChatOpenAI` with GPT-4
- Create agent with canvas tools
- `processMessage(message)` - Process user input and execute tools
- System prompt explaining canvas context and capabilities
- Handle tool execution errors gracefully

### 2.4 Create AI Chat Component

**File:** `components/ai/AIChat.tsx`

Floating modal UI component:

- Bottom-right corner positioning (z-50)
- Collapsible/expandable state
- Message list with user/AI messages
- Input field with send button
- Loading state during AI processing
- Error handling display
- Styled with TailwindCSS matching existing UI

### 2.5 Create AI Toggle Button

**File:** `components/ai/AIToggleButton.tsx`

Button to open/close AI chat:

- Fixed positioning (bottom-right)
- Robot/AI icon
- Badge showing unread AI messages (future enhancement)

## Phase 3: Integration with Canvas

### 3.1 Update Canvas Component

**File:** `components/canvas/Canvas.tsx`

Integrate AI chat:

- Add `CanvasOperations` instance creation
- Initialize `CanvasAI` with operations service
- Add AI chat visibility state
- Pass operations context to AI (viewport size, current objects)
- Render `AIToggleButton` and `AIChat` components

### 3.2 Environment Configuration

**File:** `.env.local` (document in plan, don't create)

User needs to add:

```
NEXT_PUBLIC_OPENAI_API_KEY=sk-...
```

## Phase 4: Documentation

### 4.1 Update Memory Bank

**File:** `memory-bank/activeContext.md`

Document AI integration:

- New AI chat feature
- Architecture changes (service layer)
- LangChain integration

### 4.2 Create AI Usage Guide

**File:** `memory-bank/ai-integration.md`

Document:

- How AI tools work
- Example commands users can use
- Architecture of AI system
- How to extend with new tools (for future)

## Example AI Commands

After implementation, users can say:

- "Create a red rectangle at 100, 100 with size 200x150"
- "Add a blue ellipse in the center"
- "Move the selected object 50 pixels right"
- "Create a random shape"
- "Delete all objects at position greater than 1000"

## Files to Create

1. `lib/canvas/CanvasOperations.ts` - Service class
2. `lib/canvas/coordinateUtils.ts` - Coordinate parsing
3. `lib/ai/canvasTools.ts` - LangChain tools
4. `lib/ai/CanvasAI.ts` - AI service
5. `components/ai/AIChat.tsx` - Chat UI
6. `components/ai/AIToggleButton.tsx` - Toggle button
7. `memory-bank/ai-integration.md` - Documentation

## Files to Modify

1. `hooks/useCanvas.ts` - Use service layer
2. `components/canvas/Canvas.tsx` - Integrate AI chat
3. `memory-bank/activeContext.md` - Update status

## Implementation Notes

- Objects created by AI are owned by the user who's chatting
- AI operates within the same permission system as manual operations
- All AI actions sync in real-time with other users
- Service layer makes operations testable and reusable
- Future: Add query tools, advanced operations, conversation memory

### To-dos

- [ ] Create CanvasOperations service class in lib/canvas/CanvasOperations.ts
- [ ] Create coordinate parsing utilities in lib/canvas/coordinateUtils.ts
- [ ] Refactor useCanvas hook to use CanvasOperations service
- [ ] Install LangChain dependencies (@langchain/openai, @langchain/core, langchain)
- [ ] Create LangChain tools in lib/ai/canvasTools.ts
- [ ] Create CanvasAI service in lib/ai/CanvasAI.ts
- [ ] Create AIChat component in components/ai/AIChat.tsx
- [ ] Create AIToggleButton component in components/ai/AIToggleButton.tsx
- [ ] Integrate AI chat into Canvas component
- [ ] Update memory bank with AI integration details