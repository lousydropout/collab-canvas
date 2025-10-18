# 🏗️ **Technical Architecture Document**
## **Prototyping App Builder Pivot**

---

## 📋 **Executive Summary**

This document outlines the technical architecture for transforming CollabCanvas from a collaborative drawing tool into a visual prototyping app builder that generates deployable web applications. The architecture leverages existing infrastructure while extending it to support component-based UI development, logic flows, AI code generation, and multi-tenant app deployment.

---

## 🎯 **System Overview**

### **Core Architecture Principles**
- **Unified Data Model**: Extend existing `canvas_objects` table for both shapes and UI components
- **Client-Side Rendering**: React-Konva canvas for all visual elements (shapes + components)
- **Hybrid AI Processing**: Client-side canvas operations, server-side LLM calls
- **Multi-Tenant Data**: Compound key isolation with separate data tables
- **Single-Page Apps**: Generated apps render as single pages with JSX-based routing

### **Technology Stack**
- **Frontend**: Next.js 15, React 18, TypeScript, React-Konva
- **Backend**: Supabase (PostgreSQL, Auth, Real-time)
- **AI**: OpenAI API (server-side)
- **State Management**: Zustand (generated apps), React hooks (builder)
- **Deployment**: Next.js dynamic routing

---

## 🗄️ **Database Architecture**

### **Extended Canvas Objects Schema**

```sql
-- Existing canvas_objects table (extended via Migration 007)
CREATE TABLE canvas_objects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  canvas_id TEXT NOT NULL DEFAULT 'default',
  user_id UUID NOT NULL REFERENCES auth.users(id),
  type TEXT NOT NULL, -- 'rectangle', 'ellipse', 'button', 'input', 'text', 'container'
  
  -- Existing shape properties
  x REAL NOT NULL DEFAULT 0,
  y REAL NOT NULL DEFAULT 0,
  width REAL NOT NULL DEFAULT 100,
  height REAL NOT NULL DEFAULT 100,
  fill TEXT DEFAULT '#3B82F6',
  stroke TEXT,
  stroke_width REAL DEFAULT 1,
  rotation REAL DEFAULT 0,
  z_index INTEGER DEFAULT 0,
  
  -- New prototyping properties
  node_type TEXT DEFAULT 'shape', -- 'shape', 'component', 'container'
  component_type TEXT, -- 'button', 'input', 'text', 'container', 'image', 'link'
  content TEXT, -- Text content for components
  styles JSONB DEFAULT '{}', -- CSS-like styling properties
  events JSONB DEFAULT '{}', -- Event handlers and interactions
  metadata JSONB DEFAULT '{}', -- Additional component configuration
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### **Component Layering System**

```sql
-- New table for component hierarchy and layering
CREATE TABLE canvas_layers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  canvas_id TEXT NOT NULL DEFAULT 'default',
  layer_id UUID NOT NULL REFERENCES canvas_objects(id) ON DELETE CASCADE,
  parent_layer_id UUID REFERENCES canvas_layers(id) ON DELETE CASCADE,
  layer_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(canvas_id, layer_id),
  CONSTRAINT no_self_parent CHECK (layer_id != parent_layer_id)
);
```

### **Apps Management**

```sql
-- Apps table for deployed prototypes
CREATE TABLE apps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  canvas_data JSONB NOT NULL DEFAULT '{}',
  generated_code TEXT,
  is_public BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT apps_name_not_empty CHECK (length(trim(name)) > 0),
  UNIQUE(user_id, name)
);
```

### **Multi-Tenant Data Architecture**

```sql
-- App state data (global app state)
CREATE TABLE app_state_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  app_owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  app_name TEXT NOT NULL,
  end_user_id UUID NOT NULL, -- Random UUID for end-user session
  state_key TEXT NOT NULL,
  state_value JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT app_state_key_not_empty CHECK (length(trim(state_key)) > 0),
  UNIQUE(app_owner_id, app_name, end_user_id, state_key)
);

-- User input data (form submissions, user interactions)
CREATE TABLE app_user_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  app_owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  app_name TEXT NOT NULL,
  end_user_id UUID NOT NULL,
  input_key TEXT NOT NULL,
  input_value JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT app_user_key_not_empty CHECK (length(trim(input_key)) > 0),
  UNIQUE(app_owner_id, app_name, end_user_id, input_key)
);
```

### **Logic Flow System**

```sql
-- Logic flows between components
CREATE TABLE logic_flows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  canvas_id TEXT NOT NULL DEFAULT 'default',
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  source_component_id UUID NOT NULL REFERENCES canvas_objects(id) ON DELETE CASCADE,
  target_component_id UUID REFERENCES canvas_objects(id) ON DELETE CASCADE,
  trigger_event TEXT NOT NULL, -- 'click', 'change', 'submit', etc.
  action_expression TEXT NOT NULL, -- JavaScript expression
  conditions JSONB DEFAULT '[]', -- Array of conditions
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT logic_flow_expression_not_empty CHECK (length(trim(action_expression)) > 0)
);
```

---

## 🎨 **Frontend Architecture**

### **Component System Architecture**

```typescript
// Extended CanvasObject interface
interface CanvasObject {
  id: string;
  canvas_id: string;
  user_id: string;
  type: 'rectangle' | 'ellipse' | 'button' | 'input' | 'text' | 'container';
  
  // Shape properties
  x: number;
  y: number;
  width: number;
  height: number;
  fill: string;
  stroke?: string;
  stroke_width: number;
  rotation: number;
  z_index: number;
  
  // Component properties
  node_type: 'shape' | 'component' | 'container';
  component_type?: ComponentType;
  content?: string;
  styles: ComponentStyles;
  events: ComponentEvents;
  metadata: ComponentMetadata;
  
  created_at: string;
  updated_at: string;
}

// Component-specific interfaces
interface ComponentStyles {
  backgroundColor?: string;
  color?: string;
  fontSize?: number;
  fontWeight?: string;
  borderRadius?: number;
  padding?: number;
  margin?: number;
  border?: string;
  // ... other CSS properties
}

interface ComponentEvents {
  onClick?: string; // JavaScript expression
  onChange?: string;
  onSubmit?: string;
  onFocus?: string;
  onBlur?: string;
}

interface ComponentMetadata {
  placeholder?: string; // For input components
  buttonText?: string; // For button components
  inputType?: 'text' | 'email' | 'password' | 'number';
  // ... other component-specific metadata
}
```

### **Layering System**

```typescript
interface CanvasLayer {
  id: string;
  canvas_id: string;
  layer_id: string; // References canvas_objects.id
  parent_layer_id?: string; // References canvas_layers.id
  layer_order: number;
  created_at: string;
}

// Layer management utilities
class LayerManager {
  static async createLayer(canvasId: string, objectId: string, parentId?: string): Promise<CanvasLayer>;
  static async updateLayerOrder(layerId: string, newOrder: number): Promise<void>;
  static async moveLayerToParent(layerId: string, newParentId?: string): Promise<void>;
  static async getLayerHierarchy(canvasId: string): Promise<CanvasLayer[]>;
  static async deleteLayer(layerId: string): Promise<void>;
}
```

### **Component Rendering System**

```typescript
// Unified component renderer
class ComponentRenderer {
  static renderObject(object: CanvasObject): React.ReactNode {
    switch (object.node_type) {
      case 'shape':
        return this.renderShape(object);
      case 'component':
        return this.renderComponent(object);
      case 'container':
        return this.renderContainer(object);
      default:
        return null;
    }
  }
  
  private static renderComponent(object: CanvasObject): React.ReactNode {
    const ComponentType = this.getComponentType(object.component_type);
    return (
      <ComponentType
        key={object.id}
        x={object.x}
        y={object.y}
        width={object.width}
        height={object.height}
        styles={object.styles}
        events={object.events}
        metadata={object.metadata}
        content={object.content}
      />
    );
  }
}
```

---

## ⚡ **Logic Flow System**

### **Logic Flow Data Structure**

```typescript
interface LogicFlow {
  id: string;
  canvas_id: string;
  user_id: string;
  source_component_id: string;
  target_component_id?: string;
  trigger_event: string;
  action_expression: string;
  conditions: LogicCondition[];
  created_at: string;
  updated_at: string;
}

interface LogicCondition {
  id: string;
  component_id: string;
  property: string;
  operator: 'equals' | 'not_equals' | 'greater_than' | 'less_than' | 'contains';
  value: any;
}

interface DataBinding {
  id: string;
  source_component_id: string;
  target_component_id: string;
  source_property: string;
  target_property: string;
  transform_function?: string;
}
```

### **Logic Execution Engine**

```typescript
// Client-side logic execution
class LogicExecutor {
  private static componentHelpers = {
    getComponentValue: (id: string, property: string) => {
      // Get component value from Zustand store
    },
    setComponentValue: (id: string, property: string, value: any) => {
      // Set component value in Zustand store
    },
    showComponent: (id: string) => {
      // Show component
    },
    hideComponent: (id: string) => {
      // Hide component
    },
    navigateTo: (route: string) => {
      // Navigate to route (JSX-based routing)
    }
  };
  
  static async executeFlow(flow: LogicFlow): Promise<void> {
    // Evaluate conditions
    const conditionsMet = await this.evaluateConditions(flow.conditions);
    if (!conditionsMet) return;
    
    // Execute action expression
    await this.executeExpression(flow.action_expression);
  }
  
  private static async executeExpression(expression: string): Promise<any> {
    // Safe execution of user-defined JavaScript
    const func = new Function('helpers', `return ${expression}`);
    return func(this.componentHelpers);
  }
}
```

---

## 🤖 **AI Code Generation Architecture**

### **Code Generation Service**

```typescript
// Server-side AI code generation
class PrototypeCodeGenerator {
  private static readonly APPROVED_LIBRARIES = [
    // Initially empty - hardcoded approved list
  ];
  
  static async generateComponentCode(object: CanvasObject): Promise<string> {
    const prompt = this.buildComponentPrompt(object);
    const response = await this.callLLM(prompt);
    return this.validateAndCleanCode(response);
  }
  
  static async generateAppCode(canvasData: CanvasObject[], logicFlows: LogicFlow[]): Promise<string> {
    const prompt = this.buildAppPrompt(canvasData, logicFlows);
    const response = await this.callLLM(prompt);
    return this.validateAndCleanCode(response);
  }
  
  private static buildComponentPrompt(object: CanvasObject): string {
    return `
      Generate React JSX code for a ${object.component_type} component with:
      - Styles: ${JSON.stringify(object.styles)}
      - Events: ${JSON.stringify(object.events)}
      - Metadata: ${JSON.stringify(object.metadata)}
      - Content: ${object.content}
      
      Use only approved libraries: ${this.APPROVED_LIBRARIES.join(', ')}
      Generate clean, production-ready code.
    `;
  }
  
  private static validateAndCleanCode(code: string): string {
    // Basic syntax validation
    // Remove any references to non-approved libraries
    // Return cleaned code
    return code;
  }
}
```

### **Generated App Structure**

```typescript
// Generated app template
const GeneratedAppTemplate = `
import React from 'react';
import { create } from 'zustand';

// Global state store
const useAppStore = create((set) => ({
  // Component states
  components: {},
  
  // Actions
  setComponentValue: (id, property, value) => 
    set((state) => ({
      components: {
        ...state.components,
        [id]: { ...state.components[id], [property]: value }
      }
    })),
    
  getComponentValue: (id, property) => 
    state.components[id]?.[property],
}));

// Generated component code
{/* Generated JSX components */}

// Main app component
export default function GeneratedApp() {
  return (
    <div className="generated-app">
      {/* Generated component tree */}
    </div>
  );
}
`;
```

---

## 🚀 **Deployment Architecture**

### **Dynamic Routing System**

```typescript
// app/[username]/[appname]/page.tsx
interface AppPageProps {
  params: {
    username: string;
    appname: string;
  };
}

export default async function AppPage({ params }: AppPageProps) {
  const app = await getApp(params.username, params.appname);
  
  if (!app) {
    return <div>App not found</div>;
  }
  
  return <GeneratedAppRenderer app={app} />;
}

// Generated app renderer
function GeneratedAppRenderer({ app }: { app: App }) {
  return (
    <div className="generated-app-container">
      <Script
        id="generated-app-code"
        dangerouslySetInnerHTML={{
          __html: app.generated_code
        }}
      />
    </div>
  );
}
```

### **App Management API**

```typescript
// app/api/apps/[username]/[appname]/route.ts
export async function GET(
  request: Request,
  { params }: { params: { username: string; appname: string } }
) {
  const app = await getAppByUsernameAndName(params.username, params.appname);
  
  if (!app) {
    return Response.json({ error: 'App not found' }, { status: 404 });
  }
  
  return Response.json(app);
}

export async function PUT(
  request: Request,
  { params }: { params: { username: string; appname: string } }
) {
  const updates = await request.json();
  const updatedApp = await updateApp(params.username, params.appname, updates);
  
  return Response.json(updatedApp);
}
```

---

## 🔄 **Real-time Collaboration Architecture**

### **Extended Real-time System**

```typescript
// Extended useRealtime hook for components
export function useRealtime() {
  const [objects, setObjects] = useState<CanvasObject[]>([]);
  const [layers, setLayers] = useState<CanvasLayer[]>([]);
  const [logicFlows, setLogicFlows] = useState<LogicFlow[]>([]);
  
  useEffect(() => {
    // Subscribe to canvas_objects changes
    const objectsChannel = supabase
      .channel('canvas_objects')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'canvas_objects'
      }, handleObjectChange)
      .subscribe();
    
    // Subscribe to canvas_layers changes
    const layersChannel = supabase
      .channel('canvas_layers')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'canvas_layers'
      }, handleLayerChange)
      .subscribe();
    
    // Subscribe to logic_flows changes
    const flowsChannel = supabase
      .channel('logic_flows')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'logic_flows'
      }, handleFlowChange)
      .subscribe();
    
    return () => {
      objectsChannel.unsubscribe();
      layersChannel.unsubscribe();
      flowsChannel.unsubscribe();
    };
  }, []);
  
  // Unified batching system for all updates
  const batchUpdates = useCallback((updates: any[]) => {
    // Same 16ms batching as current system
    // Update entire hierarchy for component changes
  }, []);
}
```

---

## 🗃️ **State Management Architecture**

### **Builder State (React Hooks)**

```typescript
// Builder state management
export function useCanvasBuilder() {
  const [selectedObjects, setSelectedObjects] = useState<string[]>([]);
  const [selectedLayer, setSelectedLayer] = useState<string | null>(null);
  const [logicFlows, setLogicFlows] = useState<LogicFlow[]>([]);
  
  // Follow existing project conventions
  const [authState] = useAuth();
  const [color] = useLocalStorage('canvas-color', '#3B82F6');
  
  return {
    selectedObjects,
    setSelectedObjects,
    selectedLayer,
    setSelectedLayer,
    logicFlows,
    setLogicFlows,
    authState,
    color
  };
}
```

### **Generated App State (Zustand)**

```typescript
// Generated app state management
interface AppStore {
  components: Record<string, any>;
  appState: Record<string, any>;
  userData: Record<string, any>;
  
  // Actions
  setComponentValue: (id: string, property: string, value: any) => void;
  getComponentValue: (id: string, property: string) => any;
  setAppState: (key: string, value: any) => void;
  getAppState: (key: string) => any;
  setUserData: (key: string, value: any) => void;
  getUserData: (key: string) => any;
}

export const useAppStore = create<AppStore>((set, get) => ({
  components: {},
  appState: {},
  userData: {},
  
  setComponentValue: (id, property, value) =>
    set((state) => ({
      components: {
        ...state.components,
        [id]: { ...state.components[id], [property]: value }
      }
    })),
    
  getComponentValue: (id, property) =>
    get().components[id]?.[property],
    
  setAppState: (key, value) =>
    set((state) => ({
      appState: { ...state.appState, [key]: value }
    })),
    
  getAppState: (key) =>
    get().appState[key],
    
  setUserData: (key, value) =>
    set((state) => ({
      userData: { ...state.userData, [key]: value }
    })),
    
  getUserData: (key) =>
    get().userData[key]
}));
```

---

## 🔒 **Security Architecture**

### **Multi-tenant Data Isolation**

```sql
-- Row Level Security policies
CREATE POLICY "Users can only access their own apps" ON apps
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can only access their own app data" ON app_state_data
  FOR ALL USING (auth.uid() = app_owner_id);

CREATE POLICY "Users can only access their own user data" ON app_user_data
  FOR ALL USING (auth.uid() = app_owner_id);

-- End users can only access public apps
CREATE POLICY "End users can access public apps" ON apps
  FOR SELECT USING (is_public = true);
```

### **Code Execution Safety**

```typescript
// Client-side code execution safety
class SafeCodeExecutor {
  private static readonly ALLOWED_FUNCTIONS = [
    'getComponentValue',
    'setComponentValue',
    'showComponent',
    'hideComponent',
    'navigateTo'
  ];
  
  static executeUserCode(code: string): any {
    // Create sandboxed execution environment
    const sandbox = {
      helpers: this.componentHelpers,
      // Only expose approved functions
    };
    
    // Execute in restricted context
    const func = new Function('sandbox', `
      with (sandbox) {
        return ${code};
      }
    `);
    
    return func(sandbox);
  }
}
```

---

## 📊 **Performance Architecture**

### **Caching Strategy**

```typescript
// No caching initially - keep it simple
// Can add caching later if needed
class AppCache {
  // Placeholder for future caching implementation
  static async getApp(username: string, appname: string): Promise<App | null> {
    // Direct database query for now
    return await getAppByUsernameAndName(username, appname);
  }
}
```

### **Real-time Optimization**

```typescript
// Unified batching system
class UpdateBatcher {
  private static updateQueue: any[] = [];
  private static flushTimer: NodeJS.Timeout | null = null;
  
  static queueUpdate(update: any): void {
    this.updateQueue.push(update);
    
    if (!this.flushTimer) {
      this.flushTimer = setTimeout(() => {
        this.flushUpdates();
        this.flushTimer = null;
      }, 16); // 60fps
    }
  }
  
  private static flushUpdates(): void {
    if (this.updateQueue.length === 0) return;
    
    // Process all queued updates
    const updates = [...this.updateQueue];
    this.updateQueue = [];
    
    // Update entire hierarchy for component changes
    this.processUpdates(updates);
  }
}
```

---

## 🧪 **Testing Architecture**

### **Testing Strategy**

```typescript
// Test structure
__tests__/
├── components/
│   ├── ComponentRenderer.test.tsx
│   ├── LogicFlowBuilder.test.tsx
│   └── GeneratedAppRenderer.test.tsx
├── hooks/
│   ├── useCanvasBuilder.test.ts
│   ├── useLogicExecutor.test.ts
│   └── useAppStore.test.ts
├── lib/
│   ├── PrototypeCodeGenerator.test.ts
│   ├── LayerManager.test.ts
│   └── SafeCodeExecutor.test.ts
└── integration/
    ├── realtime-collaboration.test.ts
    ├── app-deployment.test.ts
    └── multi-tenant-data.test.ts
```

---

## 🚀 **Deployment Architecture**

### **Production Deployment**

```typescript
// Production build configuration
const nextConfig = {
  // Next.js 15 configuration
  experimental: {
    // Enable dynamic routing for generated apps
  },
  
  // Environment variables
  env: {
    SUPABASE_URL: process.env.SUPABASE_URL,
    SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY,
    OPENAI_API_KEY: process.env.OPENAI_API_KEY,
  }
};
```

### **Generated App Deployment**

```typescript
// Generated app deployment process
class AppDeployer {
  static async deployApp(app: App): Promise<string> {
    // 1. Generate code
    const generatedCode = await PrototypeCodeGenerator.generateAppCode(
      app.canvas_data,
      app.logic_flows
    );
    
    // 2. Update app record
    await updateApp(app.id, { generated_code: generatedCode });
    
    // 3. Return deployment URL
    return `/${app.user.username}/${app.name}`;
  }
}
```

---

## 📈 **Scalability Considerations**

### **Database Scaling**

- **Indexing**: Proper indexes on compound keys for multi-tenant queries
- **Partitioning**: Consider partitioning by user_id for large datasets
- **Connection Pooling**: Supabase handles this automatically

### **Real-time Scaling**

- **Channel Management**: Efficient channel subscription/unsubscription
- **Update Batching**: 16ms batching prevents overwhelming clients
- **Hierarchy Updates**: Update entire hierarchy for simplicity (optimize later)

### **AI Scaling**

- **Rate Limiting**: Implement rate limiting for AI requests
- **Caching**: Cache generated code for identical inputs
- **Queue System**: Queue AI requests for high-volume scenarios

---

## 🔄 **Migration Strategy**

### **Phase 1: Database Extensions**
1. Apply existing Migration 007 (prototyping columns)
2. Create Migration 008 (canvas_layers table)
3. Create Migration 009 (apps table)
4. Create Migration 010 (multi-tenant data tables)
5. Create Migration 011 (logic_flows table)

### **Phase 2: Component System**
1. Extend CanvasObject interface
2. Implement ComponentRenderer
3. Add LayerManager
4. Integrate with existing canvas

### **Phase 3: Logic & AI**
1. Implement LogicExecutor
2. Add PrototypeCodeGenerator
3. Integrate AI service
4. Add code validation

### **Phase 4: Deployment**
1. Implement dynamic routing
2. Add GeneratedAppRenderer
3. Create app management API
4. Test multi-tenant data

---

## 🎯 **Success Metrics**

### **Technical Metrics**
- **Code Generation Success Rate**: 95%+ successful generation
- **Real-time Latency**: <100ms for component updates
- **App Deployment Time**: <60 seconds
- **Database Query Performance**: <100ms for multi-tenant queries

### **User Experience Metrics**
- **Component Creation Time**: <30 seconds per component
- **Logic Flow Creation**: <2 minutes per flow
- **App Deployment**: One-click deployment
- **Collaboration Smoothness**: 60fps during multi-user editing

---

**This architecture provides a solid foundation for the Prototyping App Builder pivot while leveraging existing infrastructure and maintaining system performance and security.**