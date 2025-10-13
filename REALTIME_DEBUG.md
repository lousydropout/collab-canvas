# Realtime Debug Steps

## Current Issue
- ✅ Broadcasts are being sent (`📡 Broadcasting object updated`)
- ❌ Database changes (`postgres_changes`) are not being received on other clients
- ✅ Data persists in database (visible after refresh)

## Debug Steps

### 1. Check Receiving Browser Console
In the browser that should receive updates, check for:

**Connection messages (should see):**
```
🚀 Setting up realtime channels for canvas: default
🔗 Subscribing to realtime channels...
📡 Canvas channel status: SUBSCRIBED
👥 Presence channel status: SUBSCRIBED
```

**Missing messages (looking for):**
```
📥 Database UPDATE received: [payload]
📥 Received object updated: [id] by user: [user-id]
```

### 2. Test Simple Database Change
Try creating a new rectangle (not just moving). This uses INSERT events which might work differently than UPDATE events.

### 3. Check RLS Policies
The issue might be that postgres_changes events are blocked by Row Level Security policies.

### 4. Test with Broadcast Events
The broadcast events should work immediately. Try deleting multiple objects to test broadcast-based sync.

## Potential Causes
1. **RLS blocking realtime events**
2. **Realtime publication not working**
3. **Filter not matching** (`canvas_id=eq.default`)
4. **Event handler not properly attached**
