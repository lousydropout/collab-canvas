# Next Development Tasks: CollabCanvas Phase 2 & 3

## 🚀 **Development Roadmap**

**Status:** Planning Complete - Ready for Implementation  
**Created:** Current Session  
**Total Tasks:** 30 tasks across 10 major features

## 📋 **Task List Overview**

### **🔺 Triangle Shape Support (5 tasks)**

**Priority:** High | **Complexity:** Medium | **Estimated Time:** 4-6 hours

1. **Database Migration** - Add triangle support to canvas_objects.type enum
2. **Triangle Component** - Create Triangle.tsx using react-konva
3. **Toolbar Integration** - Add triangle tool button
4. **Transformation System** - Extend unified transformation for triangles
5. **Overall Integration** - Complete triangle shape support

### **📝 Textbox with Formatting (4 tasks)**

**Priority:** High | **Complexity:** High | **Estimated Time:** 8-12 hours

6. **Database Migration** - Add text fields to canvas_objects
7. **Textbox Component** - Create Textbox.tsx with Konva Text
8. **Formatting Toolbar** - Create TextFormattingToolbar.tsx
9. **Editing Mode** - Double-click to edit with real-time sync

### **🎯 Live Dragging Broadcast (2 tasks)**

**Priority:** Medium | **Complexity:** Medium | **Estimated Time:** 3-4 hours

10. **Drag Handler Modification** - Broadcast intermediate positions
11. **Throttling Implementation** - Prevent network spam (50ms intervals)

### **⏰ Ownership Expiration (2 tasks)**

**Priority:** Medium | **Complexity:** Low | **Estimated Time:** 2-3 hours

12. **Automatic Release** - Implement 2-minute ownership expiration
13. **Activity Tracking** - Add last_activity timestamp column

### **👁️ User Viewport Fix (2 tasks)**

**Priority:** High | **Complexity:** Medium | **Estimated Time:** 4-5 hours

14. **Viewport Tracking** - Track user viewport states in real-time
15. **Viewport Display** - Show other users' viewport rectangles

### **🔍 AI Search Function (2 tasks)**

**Priority:** High | **Complexity:** High | **Estimated Time:** 6-8 hours

16. **AI Search Parsing** - Extend AI to recognize search commands
17. **Search Implementation** - Object search/filtering logic

### **📚 Basic Layering System (3 tasks)**

**Priority:** Medium | **Complexity:** Medium | **Estimated Time:** 4-5 hours

18. **Database Update** - Remove z_index constraints for negative values
19. **Layer Controls** - Create LayerControls.tsx component
20. **Layering Functionality** - Implement bring to front/send to back

### **🎨 Multi-Canvas System (8 tasks)**

**Priority:** High | **Complexity:** High | **Estimated Time:** 12-16 hours

21. **Canvas URL Routing** - Add canvas ID/name to URL for shareable links
22. **Canvas Management System** - Create canvas creation functionality
23. **User Default Canvas** - Generate default canvas per user instead of shared default
24. **Canvas Selection Dropdown** - Header dropdown for switching between canvases
25. **Canvas Renaming** - Add canvas renaming functionality
26. **Canvas Privacy Management** - Implement public, private, allowed list settings
27. **Canvas Database Schema** - Create canvas table with privacy settings and ownership
28. **Canvas Objects Reference** - Update canvas_objects table to reference specific canvas_id

### **🔗 Canvas Sharing System (1 task)**

**Priority:** Medium | **Complexity:** Medium | **Estimated Time:** 3-4 hours

29. **Canvas Sharing System** - Implement canvas sharing and invitation system

### **🔐 Enhanced Authentication (1 task)**

**Priority:** Medium | **Complexity:** Medium | **Estimated Time:** 2-3 hours

30. **Google OAuth Auth** - Add Google social authentication

## 🏗️ **Implementation Strategy**

### **Phase 2A: Core Shape Extensions (Tasks 1-9)**

**Focus:** Extending the shape system with triangles and text

- Triangle support builds on existing architecture
- Textbox introduces new component type with formatting
- Estimated completion: 12-18 hours

### **Phase 2B: Real-time Enhancements (Tasks 10-17)**

**Focus:** Improving real-time collaboration experience

- Live dragging enhances real-time feel
- Ownership expiration improves UX
- AI search adds intelligent capabilities
- Estimated completion: 11-15 hours

### **Phase 2C: Advanced Features (Tasks 18-20)**

**Focus:** Organizational and management tools

- Layering system for better object organization
- Estimated completion: 4-5 hours

### **Phase 3A: Multi-Canvas Foundation (Tasks 21-28)**

**Focus:** Core multi-canvas functionality

- Canvas management and routing
- Privacy and sharing controls
- Database schema updates
- Estimated completion: 12-16 hours

### **Phase 3B: Sharing & Auth (Tasks 29-30)**

**Focus:** Collaboration and authentication enhancements

- Canvas sharing and invitations
- Google OAuth integration
- Estimated completion: 5-7 hours

## 🔧 **Technical Implementation Notes**

### **Database Migrations Required**

- `007_add_triangle_support.sql` - Triangle enum value
- `008_add_textbox_support.sql` - Text fields and textbox type
- `009_add_ownership_expiration.sql` - Activity tracking
- `010_update_z_index_constraints.sql` - Layer system support
- `011_create_canvas_table.sql` - Multi-canvas support
- `012_update_canvas_objects_canvas_id.sql` - Canvas reference updates

### **New Components to Create**

- `components/canvas/Triangle.tsx`
- `components/canvas/Textbox.tsx`
- `components/canvas/UserViewport.tsx`
- `components/layout/TextFormattingToolbar.tsx`
- `components/layout/LayerControls.tsx`
- `components/layout/CanvasSelector.tsx`
- `components/canvas/CanvasManagement.tsx`
- `lib/canvas/searchUtils.ts`
- `lib/canvas/canvasUtils.ts`

### **Files to Modify**

- `components/layout/Toolbar.tsx` - Add triangle and text tools
- `components/layout/Header.tsx` - Add canvas selector dropdown
- `hooks/useCanvas.ts` - Extend for new shapes and multi-canvas
- `hooks/useOwnership.ts` - Add expiration logic
- `hooks/usePresence.ts` - Add viewport tracking
- `lib/ai/CanvasAI.ts` - Add search capabilities
- `types/canvas.ts` - Update type definitions
- `app/canvas/[canvasId]/page.tsx` - Dynamic canvas routing

## 📊 **Success Metrics**

### **Phase 2 Targets**

- ✅ All 20 Phase 2 tasks completed successfully
- ✅ Backward compatibility maintained
- ✅ Performance targets still met (60 FPS)
- ✅ Real-time collaboration enhanced

### **Phase 3 Targets**

- ✅ All 10 Phase 3 tasks completed successfully
- ✅ Multi-canvas functionality working smoothly
- ✅ Canvas privacy and sharing controls functional
- ✅ Google OAuth integration working
- ✅ URL routing for shareable canvas links

### **Overall Quality Standards**

- ✅ Clean, maintainable code
- ✅ Comprehensive testing
- ✅ Updated documentation
- ✅ No regression in existing features
- ✅ Proper error handling

## 🎯 **Recommended Starting Points**

### **Option 1: Triangle Shape Support (Tasks 1-5)**

**Pros:** Builds on existing architecture, medium complexity, immediate user value
**Cons:** None significant
**Best for:** Getting momentum with familiar patterns

### **Option 2: Multi-Canvas Foundation (Tasks 21-28)**

**Pros:** High user value, transforms the application scope
**Cons:** High complexity, requires careful database design
**Best for:** Major feature expansion

### **Option 3: User Viewport Fix (Tasks 14-15)**

**Pros:** High user value for collaboration, addresses current limitation
**Cons:** Medium complexity, requires careful real-time implementation
**Best for:** High-impact collaboration improvement

## 📝 **Task Status Legend**

- **Pending** - Not yet started
- **In Progress** - Currently being worked on
- **Completed** - Finished and tested
- **Cancelled** - No longer needed or replaced

## 🔄 **Next Steps**

1. Choose starting point (recommended: Triangle Shape Support)
2. Mark first task as "In Progress"
3. Begin implementation following existing patterns
4. Update task status as work progresses
5. Document any issues or decisions in activeContext.md

---

**Total Estimated Development Time:** 44-58 hours across all 30 tasks  
**Recommended Development Approach:** Incremental, feature-by-feature implementation  
**Success Criteria:** All MVP functionality preserved + 10 new features working smoothly
