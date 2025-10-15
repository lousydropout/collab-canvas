# Batching System Test Guide

## Overview
This guide helps you test the new batching system implemented in `useCanvas.ts` to ensure it's working correctly and providing performance improvements.

## What Changed
- **Remote broadcasts** are now queued instead of immediately updating React state
- **Local operations** still update immediately for responsive UI
- **Timer-based flushing** processes queued updates every 16ms (60fps)
- **Loop prevention** tracks local operations to avoid infinite loops

## Test Scenarios

### Test 1: Basic Batching Verification
1. **Open 2 browser tabs** with the canvas
2. **Tab 1**: Create a rectangle
3. **Tab 2**: Watch console for batching messages
4. **Expected**: Should see `🔄 Flushing X batched updates` messages

### Test 2: High-Frequency Updates
1. **Open 3+ browser tabs**
2. **Each tab**: Rapidly create/move rectangles
3. **Monitor console**: Look for batching messages
4. **Expected**: Multiple updates should be batched together

### Test 3: Performance Comparison
1. **Before batching**: Open DevTools Performance tab
2. **Record** while multiple users interact
3. **Look for**: Frame drops, high CPU usage
4. **After batching**: Repeat test
5. **Expected**: Smoother performance, fewer React re-renders

### Test 4: Loop Prevention
1. **Single user**: Create, update, delete objects
2. **Check console**: Should NOT see duplicate processing
3. **Expected**: Each operation processed only once

## Console Messages to Look For

### ✅ Good Signs
```
📥 Queuing object created: [id] by user: [user_id]
📥 Queuing object updated: [id] by user: [user_id]
🔄 Flushing 3 batched updates
🔄 Skipping own object creation: [id]
```

### ❌ Warning Signs
```
⚠️ Object already exists, skipping: [id] (should be rare)
❌ Error loading objects
❌ Failed to create rectangle
```

## Performance Metrics

### Before Batching
- **Re-renders**: 1 per broadcast
- **Frame rate**: May drop during high activity
- **CPU usage**: Higher during collaborative sessions

### After Batching
- **Re-renders**: 1 per 16ms (60fps max)
- **Frame rate**: Consistent 60fps
- **CPU usage**: Lower, more efficient

## Troubleshooting

### If Updates Are Stuck
- Check if timer is running (should see flush messages every 16ms)
- Verify `flushUpdates` function is working
- Check for JavaScript errors in console

### If Performance Is Still Poor
- Verify batching is actually working (check console messages)
- Test with fewer objects
- Check network latency
- Monitor browser DevTools Performance tab

### If Objects Are Duplicated
- Check loop prevention logic
- Verify `localOperationsRef` is working
- Look for timing issues in broadcasts

## Expected Results

With the batching system:
- **Smoother collaboration** with multiple users
- **Consistent 60fps** during high activity
- **Reduced CPU usage** during collaborative sessions
- **No stuck updates** (timer ensures flushing)
- **Maintained responsiveness** for local operations

## Next Steps

If tests pass:
1. Deploy to production
2. Monitor performance metrics
3. Gather user feedback
4. Consider additional optimizations (virtual scrolling, object pooling)

If issues found:
1. Check console for error messages
2. Verify implementation matches the guide
3. Test with different scenarios
4. Consider reverting to previous implementation
