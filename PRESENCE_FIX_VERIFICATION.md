# Presence Channel Fix Verification Guide

## Issue Fixed
The realtime indicator was showing inconsistent user counts across different browser instances (e.g., one showing "3 online" while another showed "2 online").

## Root Cause (Actual)
The presence channel was showing duplicate entries for the same user. When a user reconnects or refreshes their browser, they can create multiple presence entries with the same `user_id`, causing the same user to appear multiple times in the presence state. This resulted in inflated user counts.

**Example from logs:**
```
👥 Raw presence state: {user1: Array(1), user2: Array(2)}  // user2 appears twice
👥 Updated online users from sync: 3 ['User1', 'User2', 'User2']  // User2 counted twice
```

## Solution Implemented (Final)
1. **Deduplication Logic**: Added user deduplication based on `user_id` to prevent the same user from appearing multiple times
2. **Dependency Fixes**: Fixed useEffect dependencies to prevent multiple channel creation
3. **Channel Protection**: Added guards to prevent creating channels if they already exist
4. **Enhanced Logging**: Added detailed logging (development only) to track duplicate users
5. **Sync-Only Updates**: Relies solely on presence sync events for consistency

## How to Test the Fix

### Prerequisites
1. Ensure Supabase is running: `bunx supabase start`
2. Start the development server: `bun dev`

### Test Steps
1. **Open Multiple Browser Instances**
   - Open 2-3 browser windows/tabs to `http://localhost:3000/canvas`
   - Login with different accounts in each window

2. **Check Initial State**
   - All windows should show the same user count
   - Console should show: `👥 Updated online users from sync: X [user names]`

3. **Test Join Events**
   - Open a new browser window and login
   - Existing windows should update to show the new user count
   - Console should show: `👋 User joined: [user_id] [presence data]` (development only)

4. **Test Leave Events**
   - Close one browser window
   - Remaining windows should update to show the reduced user count
   - Console should show: `👋 User left: [user_id] [presence data]` (development only)

5. **Verify Consistency**
   - All remaining windows should show the exact same user count
   - The realtime indicator should be consistent across all instances

### Expected Console Output (Development Only)
```
👥 Presence sync
👥 Raw presence state: {user1: Array(1), user2: Array(1)}
👥 Updated online users from sync: 2 ["User1", "User2"]
👥 Skipping duplicate user: user2 User2  // If duplicates are detected
👥 Updated online users from sync: 2 ["User1", "User2"]  // After deduplication
```

## Files Modified
- `hooks/useRealtime.ts` - Enhanced presence channel event handling

## Technical Details
- Added user deduplication logic using `Set<string>` to track seen user IDs
- Fixed useEffect dependencies to prevent multiple channel creation
- Added channel existence checks to prevent duplicate connections
- Enhanced presence sync handler to skip duplicate users
- Added development-only logging to track when duplicates are detected and skipped
- Relies solely on presence sync events for consistency
- Fixed TypeScript type casting issues

The fix ensures that each user is counted only once, even if they have multiple presence entries due to reconnections or browser refreshes. This resolves the inconsistent user count issue by deduplicating users based on their unique `user_id` and preventing multiple channel connections in the first place.
