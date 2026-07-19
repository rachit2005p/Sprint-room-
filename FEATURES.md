# SprintRoom — Feature Implementation Reference

> A complete map of every feature to its file and line numbers, organized so you can go learn how each feature was written.

---

## Table of Contents

1. [Authentication](#1-authentication)
2. [Room Creation](#2-room-creation)
3. [Joining Rooms / Password](#3-joining-rooms--password)
4. [Real-Time Chat](#4-real-time-chat)
5. [Screen Sharing (WebRTC)](#5-screen-sharing-webrtc)
6. [Media Message Admin Approval](#6-media-message-admin-approval)
7. [PPT Broadcast](#7-ppt-broadcast)
8. [Timer / Countdown](#8-timer--countdown)
9. [Message Deletion](#9-message-deletion)
10. [Recording (Voice Messages)](#10-recording-voice-messages)
11. [Room Ending](#11-room-ending)
12. [Typing Indicators](#12-typing-indicators)
13. [User List / Online Members](#13-user-list--online-members)
14. [Emoji Picker](#14-emoji-picker)
15. [Files Page (Mock)](#15-files-page-mock)
16. [Tasks Page (Kanban)](#16-tasks-page-kanban)
17. [Theme / CSS / Layout](#17-theme--css--layout)
18. [Socket Event Reference](#18-socket-event-reference)
19. [REST API Reference](#19-rest-api-reference)

---

## 1. Authentication

### Login / Register Page

| File | Lines | What it does |
|------|-------|-------------|
| `frontend/src/pages/Login.jsx` | 1–168 | Login/signup form with mode toggle. Calls `login()` / `register()` from AuthContext. |
| `frontend/src/pages/Login.jsx` | 13–34 | `handleSubmit()` — validates form, calls auth functions, navigates to `/` on success, shows toasts on error. |

### AuthContext (state management)

| File | Lines | What it does |
|------|-------|-------------|
| `frontend/src/context/AuthContext.jsx` | 1–49 | `AuthProvider` — manages `user` + `loading` state. Provides `login()`, `register()`, `logout()`. Stores JWT in `localStorage`. |
| `frontend/src/context/AuthContext.jsx` | 10–23 | On mount: checks for existing token, calls `GET /auth/profile` to restore session. Clears token on error. |
| `frontend/src/context/AuthContext.jsx` | 25–35 | `login(email, password)` and `register(username, email, password)` — POST to backend, store token in `localStorage`, set `user`. |

### Route Protection

| File | Lines | What it does |
|------|-------|-------------|
| `frontend/src/App.jsx` | 16–23 | `ProtectedRoute` — redirects to `/landing` if no `user` in AuthContext. |
| `frontend/src/App.jsx` | 25–30 | `PublicRoute` — redirects to `/` if already logged in. |

### API Client (JWT Interceptor)

| File | Lines | What it does |
|------|-------|-------------|
| `frontend/src/services/api.js` | 1–19 | Axios instance. Reads `VITE_API_URL` for base URL. Request interceptor attaches `Bearer <token>` from `localStorage`. |

### Backend Auth Controller

| File | Lines | What it does |
|------|-------|-------------|
| `backend/controllers/authController.js` | 19–44 | `register()` — checks for existing user by email, hashes password with bcrypt, creates user, returns JWT. |
| `backend/controllers/authController.js` | 46–67 | `login()` — finds user by email, compares password with bcrypt, returns JWT with user id + username. |
| `backend/controllers/authController.js` | 69–85 | `getProfile()` — returns user data from the decoded JWT. |

### JWT Middleware

| File | Lines | What it does |
|------|-------|-------------|
| `backend/middleware/auth.js` | 1–17 | Reads `Authorization` header, verifies JWT with `jsonwebtoken`, sets `req.user = { id, username }`. Returns 401 if invalid/expired. |

### User Model

| File | Lines | What it does |
|------|-------|-------------|
| `backend/models/User.js` | 1–10 | Mongoose schema: `username` (unique), `email` (unique), `password`, `avatar_url`. |

---

## 2. Room Creation

### Frontend — Dashboard Form

| File | Lines | What it does |
|------|-------|-------------|
| `frontend/src/pages/Dashboard.jsx` | 19–25 | `form` state: `room_name`, `agenda`, `description`, `expires_in_minutes`, `password`. |
| `frontend/src/pages/Dashboard.jsx` | 41–55 | `handleCreateRoom()` — clamps duration to min 5, POSTs to `/rooms/create`, navigates to `/room/{id}`. |
| `frontend/src/pages/Dashboard.jsx` | 207–253 | Create Room Modal with form inputs: room name (required), agenda, description, duration (min=5), password. |

### Backend — Create Room API

| File | Lines | What it does |
|------|-------|-------------|
| `backend/controllers/roomController.js` | 49–87 | `createRoom()` — clamps duration to min 5, hashes password with bcrypt, sets `is_private=true` if password present, creates room with `expires_at = now + mins*60000`, adds creator as admin member. |
| `backend/routes/rooms.js` | 16–24 | `POST /api/rooms/create` — validates `room_name` required, applies auth middleware. |

### Room Model

| File | Lines | What it does |
|------|-------|-------------|
| `backend/models/Room.js` | 1–21 | Schema: `room_name`, `agenda`, `description`, `created_by` (ref User), `password`, `is_private`, `expires_at`, `is_active` (default true), `members[]` (with `user` ref + `role` string). |

### In-Memory Store (Fallback)

| File | Lines | What it does |
|------|-------|-------------|
| `backend/services/memoryStore.js` | 50–66 | `createRoom()` — creates room object with generated `_id`, timestamps, member user IDs converted to strings. |

---

## 3. Joining Rooms / Password

### Frontend — Dashboard Join Logic

| File | Lines | What it does |
|------|-------|-------------|
| `frontend/src/pages/Dashboard.jsx` | 57–78 | `handleJoinRoom(roomId, isPrivate)` — if private, shows password modal; otherwise POSTs to `/rooms/join` and navigates. |
| `frontend/src/pages/Dashboard.jsx` | 80–89 | `handleJoinSubmit()` — sends password with join request, displays error if wrong. |
| `frontend/src/pages/Dashboard.jsx` | 256–280 | Join Password Modal — password input, error display, submit/cancel buttons. |
| `frontend/src/pages/Dashboard.jsx` | 143 | Room card `onClick` → `handleJoinRoom(room.id, room.is_private)`. |

### Standalone Join by Code Page

| File | Lines | What it does |
|------|-------|-------------|
| `frontend/src/pages/JoinRoom.jsx` | 1–58 | Text input for room code, navigates to `/room/{code}`. |

### Backend — Join Room API

| File | Lines | What it does |
|------|-------|-------------|
| `backend/controllers/roomController.js` | 112–139 | `joinRoom()` — checks room exists + is active; if private & no password in body, returns `requires_password: true`; verifies bcrypt password; adds user as member. |
| `backend/routes/rooms.js` | 28 | `POST /api/rooms/join` — auth middleware. |

---

## 4. Real-Time Chat

### Frontend — Sending & Receiving

| File | Lines | What it does |
|------|-------|-------------|
| `frontend/src/pages/Room.jsx` | 71–104 | `initRoom()` — fetches room details and previous messages via `api.get('/rooms/:roomId/messages')`. |
| `frontend/src/pages/Room.jsx` | 359–372 | `handleSendMessage()` — emits `send_message` socket event with `roomId, senderId, message, username`. Clears input. |
| `frontend/src/pages/Room.jsx` | 122–124 | `socket.on('receive_message')` — appends incoming message to `messages` state. |
| `frontend/src/pages/Room.jsx` | 1155–1273 | Messages rendering — maps `messages` array: avatar initials, green bubbles for own messages, white for others, renders image/audio/ppt types. |
| `frontend/src/pages/Room.jsx` | 1276–1403 | Input bar — text input, send button, file upload buttons, emoji button, mic button. |

### Backend — Message Handling

| File | Lines | What it does |
|------|-------|-------------|
| `backend/sockets/roomHandler.js` | 31–76 | `send_message` handler — creates Message record in DB, broadcasts `receive_message` to the entire room. |
| `backend/sockets/roomHandler.js` | 5–7 | `createMessage()` helper — routes to `memoryStore.createMessage()` or Mongoose `new Message().save()` based on DB mode. |
| `backend/controllers/roomController.js` | 161–188 | `getMessages()` — fetches all messages for a room, populates `sender_id` with username/avatar_url, returns sorted by `createdAt`. |
| `backend/routes/rooms.js` | 32 | `GET /api/rooms/:roomId/messages` — auth middleware. |

### Message Model

| File | Lines | What it does |
|------|-------|-------------|
| `backend/models/Message.js` | 1–17 | Schema: `room_id`, `sender_id`, `message` (text content), `message_type` (text/audio/ppt/image), `audio_data` (Buffer), `file_data` (Buffer), `file_name`, `file_mime`. |

---

## 5. Screen Sharing (WebRTC)

### Frontend — State & Setup

| File | Lines | What it does |
|------|-------|-------------|
| `frontend/src/pages/Room.jsx` | 40–52 | State variables: `isSharingScreen`, `isViewingScreen`, `screenSharerInfo`, `pendingScreenShareRequest`, `screenShareSize`, drag position refs, peer connections, video refs. |

### Starting / Stopping Screen Share

| File | Lines | What it does |
|------|-------|-------------|
| `frontend/src/pages/Room.jsx` | 640–690 | `startScreenShare()` — calls `navigator.mediaDevices.getDisplayMedia()`, creates one `RTCPeerConnection` per viewer, sends `screen_share_offer` with SDP to each, handles stream end. |
| `frontend/src/pages/Room.jsx` | 692–704 | `stopScreenShare()` — stops all local tracks, closes all peer connections, emits `screen_share_stop`. |
| `frontend/src/pages/Room.jsx` | 706–713 | `handleScreenShareRequest()` — if admin, starts immediately; if non-admin, emits `screen_share_request`. |
| `frontend/src/pages/Room.jsx` | 715–733 | `handleApproveScreenShare()` / `handleDenyScreenShare()` — emits approval/denial socket events. |

### WebRTC Signaling (Frontend Listeners)

| File | Lines | What it does |
|------|-------|-------------|
| `frontend/src/pages/Room.jsx` | 242–308 | Full WebRTC signaling: `screen_share_started` → initializes viewers; `screen_share_offer` → creates answer; `screen_share_answer` → sets remote description; `screen_share_ice_candidate` → adds ICE candidate; `screen_share_stopped` → cleanup viewer. |
| `frontend/src/pages/Room.jsx` | 249–282 | `screen_share_offer` handler — creates new `RTCPeerConnection`, sets `remoteDescription`, creates answer, emits `screen_share_answer` back. |
| `frontend/src/pages/Room.jsx` | 284–293 | `screen_share_answer` — sets remote description on the **sender's** peer connection. |
| `frontend/src/pages/Room.jsx` | 295–302 | `screen_share_ice_candidate` — adds ICE candidate to peer connection. |

### Local Preview

| File | Lines | What it does |
|------|-------|-------------|
| `frontend/src/pages/Room.jsx` | 762–767 | `useEffect` — when `isSharingScreen` becomes true, assigns `localStream` to `localVideoRef.current.srcObject`. Fixes the ref-null bug. |

### Floating Video Overlay

| File | Lines | What it does |
|------|-------|-------------|
| `frontend/src/pages/Room.jsx` | 594–621 | Drag handlers — `onMouseDown` / `onMouseMove` / `onMouseUp` for repositioning the screen share video overlay. |
| `frontend/src/pages/Room.jsx` | 1406–1463 | Floating screen share overlay — shows `<video>` element, draggable, resizable (range slider 200–900px), displays local stream (sharer) or remote stream (viewers). |

### Cleanup

| File | Lines | What it does |
|------|-------|-------------|
| `frontend/src/pages/Room.jsx` | 623–638 | `cleanupScreenShare()` — stops all tracks, closes all peer connections, resets sharing state. |
| `frontend/src/pages/Room.jsx` | 741–749 | `cleanupScreenShareViewer()` — closes viewer's peer connections, resets viewer state. |

### UI Elements

| File | Lines | What it does |
|------|-------|-------------|
| `frontend/src/pages/Room.jsx` | 856–877 | Screen share button in header — "Share Screen" / "Stop Sharing" toggle; shows "Request Share" for non-admin. |
| `frontend/src/pages/Room.jsx` | 922–945 | Pending Screen Share Request banner (admin-only) — shows "X wants to share their screen" with Allow / Deny buttons. |

### Backend — Signaling Relay

| File | Lines | What it does |
|------|-------|-------------|
| `backend/sockets/roomHandler.js` | 293–303 | `screen_share_request` → forwards to admin socket. `screen_share_approve` / `screen_share_deny` → forwards to the requester's socket. |
| `backend/sockets/roomHandler.js` | 306–324 | `screen_share_start` → broadcasts `screen_share_started` to room (excluding sender). `screen_share_offer` / `screen_share_answer` / `screen_share_ice_candidate` → relays to the target socket. `screen_share_stop` → broadcasts `screen_share_stopped`. |

---

## 6. Media Message Admin Approval

### How it works:
1. Non-admin clicks send image or records voice → emits `media_share_request` instead of `send_message`.
2. Admin sees a preview banner with the image or mic icon + Allow/Deny.
3. On Allow, backend saves the message and broadcasts it to everyone.
4. On Deny, the requester gets a toast notification.

### Frontend

| File | Lines | What it does |
|------|-------|-------------|
| `frontend/src/pages/Room.jsx` | 44 | State: `pendingMediaRequest` — stores the full request data (sender info, file data, type). |
| `frontend/src/pages/Room.jsx` | 209–214 | `socket.on('media_share_requested')` — admin stores the request in state, banner appears automatically. |
| `frontend/src/pages/Room.jsx` | 216–222 | `socket.on('media_share_approved')` → toast "approved". `media_share_denied` → toast "denied". |
| `frontend/src/pages/Room.jsx` | 397–437 | `sendImageMessage()` — reads file as dataURL (base64). If admin: emits `send_message` directly. If non-admin: emits `media_share_request` with file data + shows "sent for approval" toast. |
| `frontend/src/pages/Room.jsx` | 374–395 | `sendAudioMessage(audioData)` — if admin: emits `send_message` with `messageType='audio'`. If non-admin: emits `media_share_request` with audio data. |
| `frontend/src/pages/Room.jsx` | 947–1002 | Media Request Banner (admin-only) — shows image preview or mic icon, file name, Allow / Deny buttons. |
| `frontend/src/pages/Room.jsx` | 968–982 | Allow button — emits `media_share_approve` with all message fields (senderId, messageType, file data, file name, mime type). |
| `frontend/src/pages/Room.jsx` | 988–995 | Deny button — emits `media_share_deny`. |

### Backend

| File | Lines | What it does |
|------|-------|-------------|
| `backend/sockets/roomHandler.js` | 79–81 | `media_share_request` — forwards to admin socket with `requesterSocketId` so admin can respond directly. |
| `backend/sockets/roomHandler.js` | 83–116 | `media_share_approve` — creates a Message record in DB, broadcasts `receive_message` to the whole room, sends `media_share_approved` back to the requester. |
| `backend/sockets/roomHandler.js` | 118–120 | `media_share_deny` — sends `media_share_denied` only to the requester's socket. |

---

## 7. PPT Broadcast

### How it works:
1. A user uploads a `.ppt`/`.pptx` file.
2. If non-admin, admin approves first (similar to media approval).
3. On approval, the frontend parses the PPTX file locally using `pptParser.js`.
4. Slides are displayed as an image-based panel synced across all users via sockets.

### PPT Parser Utility

| File | Lines | What it does |
|------|-------|-------------|
| `frontend/src/utils/pptParser.js` | 16–100 | `parsePPTX(base64Data)` — uses `JSZip` to unzip the PPTX, finds `slide*.xml` files, extracts `<a:t>` text elements and `<blip>` image references, resolves images via relationships, returns array of `{slideNumber, text, images[]}`. |
| `frontend/src/utils/pptParser.js` | 31–34 | Filters slide files: `/ppt/slides/slide\d+\.xml$`, sorted by slide number. |

### Frontend

| File | Lines | What it does |
|------|-------|-------------|
| `frontend/src/pages/Room.jsx` | 34–38 | State: `pendingPresentationRequest`, `activePresentation`, `isPPTUploading`, `presentationSlides[]`. |
| `frontend/src/pages/Room.jsx` | 510–543 | `handleRequestPresentation()` — validates file size (<15MB), reads as dataURL. If admin: directly emits `approve_presentation`. If non-admin: emits `request_presentation` with file data. |
| `frontend/src/pages/Room.jsx` | 545–564 | `handleApprovePresentation()` / `handleDenyPresentation()` — admin approves/denies pending PPT request. |
| `frontend/src/pages/Room.jsx` | 154–177 | Socket listeners: `presentation_requested` → sets pending state. `presentation_approved` → shows toast, sets `activePresentation`, calls `parsePPTX()` and loads slides. `presentation_denied` → toast. |
| `frontend/src/pages/Room.jsx` | 185–187 | `socket.on('slide_changed')` — updates `currentSlide` state for sync. |
| `frontend/src/pages/Room.jsx` | 189–201 | `socket.on('presentation_image_added')` — appends new image to `presentationSlides`. |
| `frontend/src/pages/Room.jsx` | 202–206 | `socket.on('presentation_stopped')` — clears `activePresentation`, `currentSlide`, `presentationSlides`. |
| `frontend/src/pages/Room.jsx` | 566–580 | `handleSlideChange(direction)` — emits `change_slide` with next/prev slide number. |
| `frontend/src/pages/Room.jsx` | 582–592 | `handleStopPresentation()` — emits `stop_presentation`. `handleDownloadPPT()` — downloads the original file. |
| `frontend/src/pages/Room.jsx` | 895–919 | Presentation Request Banner (admin-only) — shows username, filename, Allow / Deny. |
| `frontend/src/pages/Room.jsx` | 1004–1153 | Active Presentation Slides Panel — slide image + text display, slide counter (e.g. "3 / 12"), previous / next buttons, add image input (presenter only), download button, stop button. |
| `frontend/src/pages/Room.jsx` | 1095–1149 | Presenter-only controls: file input for adding images, prev/next slide navigation. |
| `frontend/src/pages/Room.jsx` | 1355–1377 | PPT upload button (`FileSymlink` icon) in input bar — hidden file input accepting `.ppt,.pptx`. |

### Backend

| File | Lines | What it does |
|------|-------|-------------|
| `backend/sockets/roomHandler.js` | 228–231 | `request_presentation` — broadcasts `presentation_requested` to the room (admin hears it). |
| `backend/sockets/roomHandler.js` | 233–271 | `approve_presentation` — saves the PPT as a message in DB, broadcasts `presentation_approved` + `receive_message` (chat notification). |
| `backend/sockets/roomHandler.js` | 273–276 | `deny_presentation` — broadcasts `presentation_denied` back to the requester. |
| `backend/sockets/roomHandler.js` | 278–280 | `change_slide` — broadcasts `slide_changed` to the room. |
| `backend/sockets/roomHandler.js` | 282–285 | `stop_presentation` — broadcasts `presentation_stopped` to the room. |
| `backend/sockets/roomHandler.js` | 287–290 | `add_image_to_presentation` — broadcasts `presentation_image_added` to the room. |

---

## 8. Timer / Countdown

### How it works:
- Room has an `expires_at` timestamp set on creation.
- Frontend calculates `roomTimerSecondsLeft = (expires_at - now) / 1000`.
- A `useEffect` with `setInterval` decrements every second.
- Admin can adjust via `extend_room_timer` (capped: delta ±12h, total max 24h from now).
- Backend auto-cleanup runs every 60 seconds to expire rooms.

### Frontend

| File | Lines | What it does |
|------|-------|-------------|
| `frontend/src/pages/Room.jsx` | 26 | State: `roomTimerSecondsLeft` (number or null). |
| `frontend/src/pages/Room.jsx` | 89–95 | On room load: calculates `roomTimerSecondsLeft = (new Date(room.expires_at) - Date.now()) / 1000`. |
| `frontend/src/pages/Room.jsx` | 143–152 | `socket.on('room_timer_update')` — recalculates countdown from server-authoritative `expires_at`. |
| `frontend/src/pages/Room.jsx` | 751–760 | `useEffect` — 1-second `setInterval` that decrements `roomTimerSecondsLeft`. When it reaches ≤0, navigates to `/`. |
| `frontend/src/pages/Room.jsx` | 505–508 | `handleAdjustTimer(minutes)` — emits `extend_room_timer` with delta. Admin-only button. |
| `frontend/src/pages/Room.jsx` | 811–844 | Timer display in header — SVG circular progress ring + `MM:SS` text. Click opens timer modal (admin only). |
| `frontend/src/pages/Room.jsx` | 823–837 | SVG ring: `circle` with `strokeDasharray` = circumference, `strokeDashoffset` calculated from remaining fraction. Green fades to red as time runs out. |
| `frontend/src/pages/Room.jsx` | 839–843 | Timer text shows `MM:SS` or `"No limit"` if null. |
| `frontend/src/pages/Room.jsx` | 1531–1643 | Adjust Timer Modal — shows remaining time, quick adjust buttons (-10m, -5m, +5m, +10m), custom adjust with minutes input + Add / Subtract buttons. |

### Backend — Timer Adjustment

| File | Lines | What it does |
|------|-------|-------------|
| `backend/sockets/roomHandler.js` | 153–224 | `extend_room_timer` — validates admin/creator role, clamps `delta_minutes` to ±12h, caps total `expires_at` to max 24h from now, saves room, broadcasts `room_timer_update`. If new time ≤ now, deletes room entirely and emits `room_ended`. |
| `backend/sockets/roomHandler.js` | 190–195 | Clamping logic: `clampedMinutes = Math.min(Math.max(minutes, -720), 720)`, `maxExpires = now + 24h`. |
| `backend/sockets/roomHandler.js` | 192–206 | If `newExpires <= now` — deletes all messages and the room, emits `room_ended`, leaves all sockets. |

### Auto-Cleanup (Server)

| File | Lines | What it does |
|------|-------|-------------|
| `backend/server.js` | 52–82 | `setInterval` every 60 seconds — finds all rooms where `expires_at < now` and `is_active === true`, deletes their messages and the room record, emits `room_ended`, clears socket room. |

---

## 9. Message Deletion

### Frontend

| File | Lines | What it does |
|------|-------|-------------|
| `frontend/src/pages/Room.jsx` | 735–739 | `handleDeleteMessage(msg)` — gets message ID, emits `delete_message` with `{ roomId, messageId, senderId }`. |
| `frontend/src/pages/Room.jsx` | 310–312 | `socket.on('message_deleted')` — filters out the deleted message from `messages` state by `messageId`. |
| `frontend/src/pages/Room.jsx` | 1247–1255 | Trash2 icon button — appears on own messages only (image/audio/ppt types). Uses `opacity-0 group-hover:opacity-100` for hover reveal. |

### Backend

| File | Lines | What it does |
|------|-------|-------------|
| `backend/sockets/roomHandler.js` | 122–136 | `delete_message` — verifies sender owns the message (checks `senderId`), deletes from DB or memoryStore, broadcasts `message_deleted` with `{ messageId }` to the room. |
| `backend/services/memoryStore.js` | 131–138 | `deleteMessageById(id, senderId)` — finds message in array by id, checks sender, splices it out. Returns true/false. |

---

## 10. Recording (Voice Messages)

### Frontend

| File | Lines | What it does |
|------|-------|-------------|
| `frontend/src/pages/Room.jsx` | 29–30 | State: `isRecording` (boolean), `recordingError` (string). |
| `frontend/src/pages/Room.jsx` | 67–68 | Refs: `mediaRecorderRef`, `audioChunksRef`. |
| `frontend/src/pages/Room.jsx` | 439–481 | `handleToggleRecording()` — if not recording: requests `getUserMedia({ audio: true })`, creates `MediaRecorder`, pushes `dataavailable` chunks to array, sets `isRecording = true`. If recording: stops recorder, collects chunks into a Blob, reads as dataURL via `FileReader`, calls `sendAudioMessage(dataURL)`, stops all tracks. |
| `frontend/src/pages/Room.jsx` | 350–356 | Cleanup effect — stops recorder and stream tracks on component unmount. |
| `frontend/src/pages/Room.jsx` | 1278–1282 | Recording error display (red text). |
| `frontend/src/pages/Room.jsx` | 1303–1316 | Mic button in input bar — toggles between `Mic` and `Square` icons, shows recording state (pulsing red dot + "Recording..." text). |
| `frontend/src/pages/Room.jsx` | 1214–1218 | Audio message rendering — `<audio controls>` element with "Voice message" label. |

---

## 11. Room Ending

### Frontend

| File | Lines | What it does |
|------|-------|-------------|
| `frontend/src/pages/Room.jsx` | 21 | State: `showEndModal` (boolean). |
| `frontend/src/pages/Room.jsx` | 493–503 | `handleEndRoom()` — calls `api.delete('/rooms/:roomId')`, emits `room_ended` socket event, navigates to `/`. |
| `frontend/src/pages/Room.jsx` | 138–141 | `socket.on('room_ended')` — shows alert and navigates to `/`. Listens for both admin-initiated and timer-based end. |
| `frontend/src/pages/Room.jsx` | 878–892 | "End Sprint" button in header — red background, admin-only (hidden for members). |
| `frontend/src/pages/Room.jsx` | 1497–1529 | End Room Confirmation Modal — warning text: "This will permanently delete all messages and files." + Cancel / "Yes, End Sprint" buttons. |

### Backend

| File | Lines | What it does |
|------|-------|-------------|
| `backend/controllers/roomController.js` | 141–159 | `deleteRoom()` — verifies the requester is the room creator, deletes all messages for the room, deletes the room record. |
| `backend/routes/rooms.js` | 30 | `DELETE /api/rooms/:id` — auth middleware. |
| `backend/sockets/roomHandler.js` | 146–150 | `room_ended` — broadcasts to room, kicks all sockets out of the socket room, clears `onlineUsers[roomId]`. |

---

## 12. Typing Indicators

### Frontend

| File | Lines | What it does |
|------|-------|-------------|
| `frontend/src/pages/Room.jsx` | 20 | State: `typingUsers` (array of strings). |
| `frontend/src/pages/Room.jsx` | 1272 | `roomTimerSecondsLeft` state. |
| `frontend/src/pages/Room.jsx` | 130–132 | `socket.on('typing')` — adds username to `typingUsers` if not already present. |
| `frontend/src/pages/Room.jsx` | 134–136 | `socket.on('stop_typing')` — removes username from `typingUsers`. |
| `frontend/src/pages/Room.jsx` | 483–491 | `handleTyping()` — emits `typing` on every input change, debounces `stop_typing` after 2 seconds of inactivity. |
| `frontend/src/pages/Room.jsx` | 1263–1272 | Typing indicator UI — animated bouncing dots + text: "X is typing..." or "X and Y are typing..." for multiple users. |

### Backend

| File | Lines | What it does |
|------|-------|-------------|
| `backend/sockets/roomHandler.js` | 138–144 | `typing` / `stop_typing` — relays to room using `socket.to(roomId)` (excludes the sender). |

---

## 13. User List / Online Members

### Frontend

| File | Lines | What it does |
|------|-------|-------------|
| `frontend/src/pages/Room.jsx` | 19 | State: `onlineUsers` (array of `{ userId, username, socketId, role }`). |
| `frontend/src/pages/Room.jsx` | 126–128 | `socket.on('room_users_update')` — replaces `onlineUsers` state with the server-sent array. |
| `frontend/src/pages/Room.jsx` | 1465–1495 | Online Users sidebar — renders each user with: avatar circle (first letter), green online dot, username, role badge (ADMIN / MEMBER). |
| `frontend/src/pages/Room.jsx` | 868–871 | Header shows count: `Users` icon + `onlineUsers.length`. |

### Backend

| File | Lines | What it does |
|------|-------|-------------|
| `backend/sockets/roomHandler.js` | 10 | `onlineUsers` — object keyed by `roomId`, each value is an array of user objects. |
| `backend/sockets/roomHandler.js` | 15–29 | `join_room` — pushes `{ userId, username, socketId, role }` to `onlineUsers[roomId]`, broadcasts `room_users_update`. |
| `backend/sockets/roomHandler.js` | 326–339 | `disconnect` — removes the socket from all rooms it was in, broadcasts updated `room_users_update` to each affected room. |

---

## 14. Emoji Picker

### Frontend

| File | Lines | What it does |
|------|-------|-------------|
| `frontend/src/pages/Room.jsx` | 33 | State: `showEmojiPicker` (boolean). |
| `frontend/src/pages/Room.jsx` | 1285–1301 | Emoji Picker panel — absolute-positioned panel with 11 emojis: 👍 ❤️ 😂 🎉 🔥 🚀 👀 😱 😢 💯 ✨. Each is a clickable button. |
| `frontend/src/pages/Room.jsx` | 1291–1293 | Click handler — appends the emoji to `newMessage` state, closes the picker. |
| `frontend/src/pages/Room.jsx` | 1318–1329 | Emoji toggle button (`Smile` icon) — toggles `showEmojiPicker`. |

---

## 15. Files Page (Mock)

### Frontend

| File | Lines | What it does |
|------|-------|-------------|
| `frontend/src/pages/Files.jsx` | 1–88 | Files page with table. Static mock data (not connected to backend). |
| `frontend/src/pages/Files.jsx` | 4–11 | `initialFiles` — array of 6 mock files with id, name, type, uploadedBy, size, time. |
| `frontend/src/pages/Files.jsx` | 13–18 | `getIcon(type)` — returns `Image` icon for `'image'` type, `FileText` icon for everything else. |
| `frontend/src/pages/Files.jsx` | 23–25 | `handleDelete(id)` — filters file out of state array. |
| `frontend/src/pages/Files.jsx` | 34–36 | Upload button (UI only, no backend handler). |
| `frontend/src/pages/Files.jsx` | 50–84 | Table: Name (with icon), Uploaded By, Size, Time, Actions (Download + Trash2 on hover). |
| `frontend/src/pages/Files.jsx` | 76–86 | Trash2 button — renders only on hover (`opacity-0 group-hover:opacity-100`). Shows "No files yet" when list empty. |

---

## 16. Tasks Page (Kanban)

### Frontend

| File | Lines | What it does |
|------|-------|-------------|
| `frontend/src/pages/Tasks.jsx` | 1–73 | Tasks page — Kanban board with 3 columns. |
| `frontend/src/pages/Tasks.jsx` | 4–12 | `initialTasks` — mock data: id, title, description, status ('todo'|'in_progress'|'done'), assignees (string array). |
| `frontend/src/pages/Tasks.jsx` | 14–18 | Column definitions: key, label, badge color. |
| `frontend/src/pages/Tasks.jsx` | 23 | `getColumnTasks(status)` — filters tasks by status. |
| `frontend/src/pages/Tasks.jsx` | 30–68 | Three Kanban columns — each renders cards with title, description, assignee initials in circles. |
| `frontend/src/pages/Tasks.jsx` | 62–64 | "Add Task" button (UI only, no backend). |

---

## 17. Theme / CSS / Layout

### Tailwind Config

| File | Lines | What it does |
|------|-------|-------------|
| `frontend/tailwind.config.js` | 6–71 | Full custom theme: brand colors (`#2E9E44`), bg shades (`#FAFBF9` / `#FFFFFF` / `#F6F8F4`), borders (`#E4E9DF`), success/danger/warning, border radius (btn 12px, card 18px, hero 22px), box shadows (`soft`, `lift`). |

### Global CSS

| File | Lines | What it does |
|------|-------|-------------|
| `frontend/src/index.css` | 1–86 | Inter font import. Base body styles (bg, font, antialiased). Utility classes: `.glass-panel` (backdrop-blur), `.btn-primary` (brand bg + hover scale), `.btn-secondary`, `.btn-ghost`, `.input-field` (border + focus ring), `.card`, `.card-hover`, `.badge-*` (green/pink/blue/orange), `.section-title`, `.section-subtitle`, custom scrollbar. |

### App Layout

| File | Lines | What it does |
|------|-------|-------------|
| `frontend/src/layouts/MainLayout.jsx` | 24–103 | App shell: sidebar (220px, `bg-bg-card`, `border-r`), header with "Join Room" button + settings link, main content area with `<Outlet />`. Mobile-responsive. |
| `frontend/src/App.jsx` | 55–63 | Root: `<AuthProvider>` → `<BrowserRouter>` → `<App>`. |

---

## 18. Socket Event Reference

| Event | Direction | Purpose | Backend (File:Line) | Frontend (File:Line) |
|-------|-----------|---------|-------------------|-------------------|
| `join_room` | Client→Server | User joins socket room | roomHandler.js:15 | Room.jsx:113 |
| `send_message` | Client→Server | Send chat message | roomHandler.js:31 | Room.jsx:363 |
| `receive_message` | Server→Client | Receive chat message | roomHandler.js:72 | Room.jsx:122 |
| `typing` | Client→Server | User is typing | roomHandler.js:138 | Room.jsx:485 |
| `stop_typing` | Client→Server | User stopped typing | roomHandler.js:142 | Room.jsx:370,489 |
| `room_ended` | Server→Client | Room terminated | roomHandler.js:147 | Room.jsx:138 |
| `room_timer_update` | Server→Client | Timer adjusted | roomHandler.js:220 | Room.jsx:143 |
| `extend_room_timer` | Client→Server | Admin adjusts timer | roomHandler.js:153 | Room.jsx:507 |
| `request_presentation` | Client→Server | Non-admin requests PPT | roomHandler.js:228 | Room.jsx:531 |
| `approve_presentation` | Client→Server | Admin approves PPT | roomHandler.js:233 | Room.jsx:522,547 |
| `deny_presentation` | Client→Server | Admin denies PPT | roomHandler.js:273 | Room.jsx:559 |
| `presentation_requested` | Server→Client | PPT request received | roomHandler.js:230 | Room.jsx:154 |
| `presentation_approved` | Server→Client | PPT approved | roomHandler.js:264 | Room.jsx:161 |
| `presentation_denied` | Server→Client | PPT denied | roomHandler.js:275 | Room.jsx:179 |
| `change_slide` | Client→Server | Navigate slide | roomHandler.js:278 | Room.jsx:578 |
| `slide_changed` | Server→Client | Slide synced | roomHandler.js:279 | Room.jsx:185 |
| `stop_presentation` | Client→Server | Stop presentation | roomHandler.js:282 | Room.jsx:583 |
| `presentation_stopped` | Server→Client | Presentation ended | roomHandler.js:284 | Room.jsx:202 |
| `add_image_to_presentation` | Client→Server | Add image to PPT | roomHandler.js:287 | Room.jsx:1108 |
| `presentation_image_added` | Server→Client | Image added to slides | roomHandler.js:289 | Room.jsx:189 |
| `media_share_request` | Client→Server | Non-admin requests media share | roomHandler.js:79 | Room.jsx:386,419 |
| `media_share_approve` | Client→Server | Admin approves media | roomHandler.js:83 | Room.jsx:970 |
| `media_share_deny` | Client→Server | Admin denies media | roomHandler.js:118 | Room.jsx:990 |
| `media_share_requested` | Server→Client | Media request received by admin | roomHandler.js:80 | Room.jsx:209 |
| `media_share_approved` | Server→Client | Media approved (requester notified) | roomHandler.js:112 | Room.jsx:216 |
| `media_share_denied` | Server→Client | Media denied (requester notified) | roomHandler.js:119 | Room.jsx:220 |
| `screen_share_request` | Client→Server | Request screen share | roomHandler.js:293 | Room.jsx:710 |
| `screen_share_approve` | Client→Server | Admin approves screen share | roomHandler.js:297 | Room.jsx:717 |
| `screen_share_deny` | Client→Server | Admin denies screen share | roomHandler.js:301 | Room.jsx:727 |
| `screen_share_requested` | Server→Client | Screen share request received | roomHandler.js:294 | Room.jsx:225 |
| `screen_share_approved` | Server→Client | Screen share approved | roomHandler.js:298 | Room.jsx:232 |
| `screen_share_denied` | Server→Client | Screen share denied | roomHandler.js:302 | Room.jsx:237 |
| `screen_share_start` | Client→Server | Start sharing | roomHandler.js:306 | Room.jsx:649 |
| `screen_share_started` | Server→Client | Sharing started (viewers) | roomHandler.js:307 | Room.jsx:242 |
| `screen_share_offer` | Bidirectional | WebRTC offer | roomHandler.js:310 | Room.jsx:249,675 |
| `screen_share_answer` | Bidirectional | WebRTC answer | roomHandler.js:314 | Room.jsx:274,284 |
| `screen_share_ice_candidate` | Bidirectional | ICE candidate | roomHandler.js:318 | Room.jsx:262,295 |
| `screen_share_stop` | Client→Server | Stop sharing | roomHandler.js:322 | Room.jsx:703 |
| `screen_share_stopped` | Server→Client | Sharing stopped (viewers) | roomHandler.js:323 | Room.jsx:304 |
| `delete_message` | Client→Server | Delete message | roomHandler.js:122 | Room.jsx:738 |
| `message_deleted` | Server→Client | Message deleted (all users) | roomHandler.js:132 | Room.jsx:310 |
| `room_users_update` | Server→Client | User list update | roomHandler.js:26,333 | Room.jsx:126 |

---

## 19. REST API Reference

| Method | Path | Purpose | Controller | File:Line |
|--------|------|---------|------------|-----------|
| POST | `/api/auth/signup` | Register new user | `authController.register` | routes/auth.js:16–25 |
| POST | `/api/auth/login` | Login | `authController.login` | routes/auth.js:27–35 |
| GET | `/api/auth/profile` | Get current user profile | `authController.getProfile` | routes/auth.js:37 |
| POST | `/api/rooms/create` | Create a sprint room | `roomController.createRoom` | routes/rooms.js:16–24 |
| GET | `/api/rooms` | List all active rooms | `roomController.getRooms` | routes/rooms.js:26 |
| POST | `/api/rooms/join` | Join a room (with optional password) | `roomController.joinRoom` | routes/rooms.js:28 |
| DELETE | `/api/rooms/:id` | Delete / end a room (creator only) | `roomController.deleteRoom` | routes/rooms.js:30 |
| GET | `/api/rooms/:roomId/messages` | Get all messages for a room | `roomController.getMessages` | routes/rooms.js:32 |

---

## Architecture Summary

```
frontend/src/
├── pages/
│   ├── Room.jsx          ← Main workspace: chat, screen share, PPT, timer, recording, admin
│   ├── Dashboard.jsx     ← Room list, create/join rooms
│   ├── Login.jsx         ← Auth forms
│   ├── Landing.jsx       ← Marketing page
│   ├── Files.jsx         ← File management (mock)
│   ├── Tasks.jsx         ← Kanban board (mock)
│   ├── JoinRoom.jsx      ← Join by code
│   ├── Profile.jsx       ← User profile (UI only)
│   └── NotFound.jsx      ← 404 page
├── layouts/
│   └── MainLayout.jsx    ← App shell (sidebar + header + content)
├── context/
│   └── AuthContext.jsx    ← Auth state manager
├── services/
│   └── api.js            ← Axios instance with JWT interceptor
├── socket/
│   └── socket.js         ← Socket.IO client instance
├── utils/
│   └── pptParser.js      ← PPTX file parser (JSZip + XML)
├── index.css             ← Global styles + Tailwind component classes
└── tailwind.config.js    ← Theme configuration

backend/
├── server.js             ← Express + Socket.IO setup, auto-cleanup
├── sockets/
│   └── roomHandler.js    ← All socket event handlers (335 lines)
├── controllers/
│   ├── authController.js ← Auth endpoints
│   └── roomController.js ← Room CRUD + messages
├── routes/
│   ├── auth.js           ← Auth route definitions
│   └── rooms.js          ← Room route definitions
├── models/
│   ├── User.js           ← User schema
│   ├── Room.js           ← Room schema
│   └── Message.js        ← Message schema
├── middleware/
│   ├── auth.js           ← JWT verification middleware
│   └── errorHandler.js   ← Global error handler
├── services/
│   └── memoryStore.js    ← In-memory DB fallback (159 lines)
└── config/
    └── db.js             ← MongoDB connection with memory fallback
```
