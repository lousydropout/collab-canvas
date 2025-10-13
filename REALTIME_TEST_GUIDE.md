# Realtime Testing Guide

## 🧪 How to Test Real-time Collaboration

### Prerequisites
1. Ensure Supabase is running: `supabase start`
2. Apply the latest migrations: `supabase db reset`
3. Start the development server: `npm run dev`

### Testing Steps

#### 1. Basic Connection Test
1. Open the canvas page in your browser
2. Look for the **realtime status indicator** in the top-right corner
3. It should show:
   - 🟢 "Connected" (green dot)
   - "1 online" (your presence)

#### 2. Multi-User Test (Same Device)
1. Open 2 browser windows/tabs to the canvas page
2. Login with the same account in both tabs
3. Check that both show:
   - 🟢 "Connected"
   - "1 online" (same user, multiple sessions)

#### 3. Multi-User Test (Different Accounts)
1. **Window 1**: Login with first account
2. **Window 2**: Login with different account (register a new one if needed)
3. Both should show "2 online"

#### 4. Real-time Object Synchronization

**Test Rectangle Creation:**
1. In Window 1: Select rectangle tool, drag to create rectangle
2. Window 2 should immediately show the new rectangle
3. Check browser console for: `📥 Received object created: [id]`

**Test Object Updates:**
1. In Window 1: Select and drag a rectangle
2. Window 2 should see the rectangle move in real-time
3. Check console for: `📥 Received object updated: [id]`

**Test Object Deletion:**
1. In Window 1: Select rectangle, press Delete
2. Window 2 should see rectangle disappear immediately
3. Check console for: `📥 Received object deleted: [id]`

**Test Batch Operations:**
1. In Window 1: Select multiple rectangles, press Ctrl+D (duplicate)
2. Window 2 should see new rectangles appear
3. In Window 1: Select multiple rectangles, press Delete
4. Window 2 should see rectangles disappear

#### 5. Connection Recovery Test
1. Stop Supabase: `supabase stop`
2. Both windows should show: 🔴 "Disconnected"
3. Restart Supabase: `supabase start`
4. Windows should reconnect: 🟢 "Connected"

### Expected Console Output

**Successful Connection:**
```
🚀 Setting up realtime channels for canvas: default
🔗 Subscribing to realtime channels...
📡 Canvas channel status: SUBSCRIBED
👥 Presence channel status: SUBSCRIBED
👋 User joined: [user-id] [presence-data]
```

**Successful Operations:**
```
📡 Broadcasting object created: [object-id]
📥 Received object created: [object-id] by user: [user-id]
```

### Troubleshooting

**Connection Issues:**
- Check Supabase is running: `supabase status`
- Verify environment variables in `.env.local`
- Check browser network tab for WebSocket connections

**Sync Issues:**
- Check console for error messages
- Verify RLS policies allow operations
- Ensure realtime is enabled: Check migration 004

**Performance Issues:**
- Monitor console for excessive log messages
- Check for infinite loops in conflict resolution
- Test with fewer objects if performance degrades

### Performance Benchmarks

**Target Metrics:**
- ✅ Object sync: < 100ms
- ✅ Connection time: < 2s
- ✅ Presence updates: < 50ms
- ✅ Handles 100+ objects smoothly
- ✅ 5+ concurrent users

### Success Criteria

✅ **PR #5 Complete When:**
- [x] Real-time channel connects automatically
- [x] Object CRUD operations sync across clients
- [x] Presence tracking shows online users
- [x] Connection status is visible to users
- [x] No infinite loops or duplicate events
- [x] Performance remains smooth with multiple users
- [x] Graceful reconnection after network issues

---

**Next Steps (PR #6):**
- Implement ownership system with claim/release
- Add visual ownership indicators
- Prevent editing conflicts
