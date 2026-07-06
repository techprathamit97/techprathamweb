# BigBlueButton Integration Plan

## Objective
Remove the custom WebSocket/WebRTC live class implementation and replace it with BigBlueButton integration.

## Current Implementation to Remove

### Files to Delete:
1. **Server:**
   - `server/live-class-server.js` - WebSocket signaling server

2. **Components:**
   - `components/live-class/LiveClassRoom.tsx`
   - `components/live-class/useWebRTC.ts`
   - `components/live-class/useMediaRecorder.ts`
   - `components/live-class/VideoGrid.tsx`
   - `components/live-class/socket-service.ts`
   - `components/live-class/webrtc-peer.ts`
   - `components/live-class/useMediaRecorder.ts`

3. **Pages:**
   - `pages/live-class/[roomId].tsx`
   - `pages/module-class/[roomId].tsx`
   - `pages/trainer/join-class.tsx`
   - `pages/test-webrtc.tsx`

4. **API Routes:**
   - `app/api/live-class/rooms/route.ts`
   - `app/api/live-class/recordings/route.ts`
   - `app/api/lms/live-classes/route.ts`
   - `app/api/lms/live-classes/[id]/route.ts`
   - `app/api/lms/live-classes/sessions/route.ts`
   - `app/api/lms/live-classes/sessions/[id]/route.ts`
   - `app/api/lms/live-classes/sessions/[id]/participants/route.ts`
   - `app/api/lms/live-classes/sessions/[id]/attendance/route.ts`
   - `app/api/lms/live-classes/today/route.ts`
   - `app/api/lms/live-classes/events/route.ts`
   - `app/api/lms/live-classes/recordings/route.ts`
   - `app/api/debug/create-test-live-class/route.ts`

5. **Models:**
   - `models/LiveClass.js`
   - `models/LiveClassSession.js`

6. **Lib:**
   - `lib/socket.ts`

### Environment Variables to Remove:
- `NEXT_PUBLIC_SOCKET_URL`

### Package.json Dependencies to Remove:
- socket.io
- socket.io-client

## BigBlueButton Integration

### 1. Environment Variables to Add:
```
# BigBlueButton Configuration
BIGBLUEBUTTON_SERVER_URL=https://your-bbb-server.com
BIGBLUEBUTTON_API_SECRET=your-api-secret
```

### 2. New API Routes:
- `app/api/bbb/meetings/route.ts` - Create/delete meetings
- `app/api/bbb/join/route.ts` - Generate join URLs
- `app/api/bbb/meetings/[meetingId]/route.ts` - Get meeting status

### 3. BigBlueButton Service:
- `lib/bigbluebutton.ts` - API wrapper service

### 4. Updated Pages:
- Modify student course pages to link to BBB instead of custom WebRTC
- Modify trainer dashboard to use BBB for live classes

## Implementation Order

1. Add BigBlueButton environment variables
2. Create BBB service library
3. Create BBB API routes
4. Update existing pages to use BBB
5. Remove old WebRTC files
6. Clean up dependencies

## Notes
- BigBlueButton provides: video conferencing, screen sharing, chat, recording
- Meetings can be created dynamically via API
- Join URLs are generated with roles (moderator for trainers, attendee for students)
- Recordings are handled by BBB server