# Performance Test Guide

## Test 1: Drag Smoothness
1. **Drag a rectangle slowly** in one browser
2. **Count the lag/stutters** - should be minimal
3. **Check FPS** - Open DevTools > Performance tab, record while dragging

## Test 2: Real-time Updates  
1. **Browser 1**: Start dragging a rectangle
2. **Browser 2**: Watch the rectangle move
3. **Expected**: Smooth 20fps updates (every 50ms)

## Test 3: Console Messages
**During drag (Browser 1):**
- Should NOT see: `📝 Updating object` messages
- Should see: Local drag movement (smooth)

**During drag (Browser 2):**  
- Should see: `📥 Broadcast object_updated received:` every 50ms

**After drag ends (Browser 1):**
- Should see ONE: `📝 Updating object` (database persistence)

## Test 4: Network Activity
1. **Open DevTools > Network tab**
2. **Drag rectangle** 
3. **During drag**: Should see frequent WebSocket messages
4. **At drag end**: Should see ONE HTTP request to Supabase

## Expected Improvements
- ✅ Smoother dragging for the person doing the drag
- ✅ No database delays during drag movement  
- ✅ Final position saved to database on drag end
- ✅ Other users see smooth real-time updates

## If Still Laggy
Possible causes:
1. **Computer performance** - Try closing other apps
2. **Network latency** - Test with local network only
3. **Browser performance** - Try different browser
4. **Too many objects** - Test with fewer rectangles
