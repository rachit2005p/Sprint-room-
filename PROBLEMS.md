# Problems Faced & Learnings

> 10 real problems encountered while building SprintRoom, with root causes, solutions, and takeaways.

---

## Problem 1 — Screen Share Local Preview Not Showing

**Symptom:** When a user starts sharing their screen, the floating video overlay stays black. The remote viewers see the shared screen correctly, but the sharer sees nothing.

**Root Cause:** The code assigned `localVideoRef.current.srcObject = stream` immediately inside `startScreenShare()`, but the `<video>` element with `ref={localVideoRef}` hadn't rendered yet because `isSharingScreen` state was still `false` at that point. React hadn't flushed the DOM update yet.

**The Buggy Flow:**
1. `setIsSharingScreen(true)` is called
2. `startScreenShare()` continues synchronously
3. `localVideoRef.current` is still `null` (DOM hasn't re-rendered)
4. `srcObject` assignment silently fails

**Fix:**

```jsx
// Previously (in startScreenShare):
setIsSharingScreen(true);
localVideoRef.current.srcObject = stream; // ref is null here!

// Fixed — useEffect watches isSharingScreen:
useEffect(() => {
  if (isSharingScreen && localStreamRef.current && localVideoRef.current) {
    localVideoRef.current.srcObject = localStreamRef.current;
  }
}, [isSharingScreen]);
```

Now the `<video>` element exists in the DOM when the effect runs, so `srcObject` assignment works.

**Learning:** React state updates are asynchronous. DOM mutations from a `setState` call aren't visible until the next render cycle. If you need to interact with a DOM element that depends on a state change, use `useEffect` with that state as a dependency — never try to access it synchronously right after `setState`.

---

## Problem 2 — Large Files Fail Silently (Socket.io Buffer Limit)

**Symptom:** Uploading a PPTX file (e.g., 8MB) or a large image results in nothing happening. No error message, no console log, no server log. The file just doesn't arrive.

**Root Cause:** Socket.IO has a default `maxHttpBufferSize` of **1MB**. Any message payload larger than 1MB is silently rejected — no error is emitted to either client or server. PPTX files and high-res images regularly exceed this.

```js
// Default (1MB — too small for PPTX and images):
const io = new Server(httpServer, {
  cors: { ... }
  // maxHttpBufferSize defaults to 1e6 (1MB)
});
```

**Fix:**

```js
const io = new Server(httpServer, {
  cors: { ... },
  maxHttpBufferSize: 50 * 1024 * 1024 // 50MB
});
```

**Prevention:** Added file size validation on the frontend too (PPTX capped at 15MB, images display a warning if too large).

Also added frontend toast notifications for socket errors:

```jsx
socket.on('connect_error', (err) => {
  toast.error(`Connection error: ${err.message}`);
});
```

**Learning:** Always check and configure transport-level limits (Socket.IO `maxHttpBufferSize`, Express `body-parser` limits, NGINX `client_max_body_size`) when your app handles binary files. Silent failures are worse than loud ones — they're impossible to debug without reading the library source.

---

## Problem 3 — Timer Could Be Extended Infinitely

**Symptom:** An admin could set the room timer to +100000 minutes, effectively making the room never expire. The countdown would show absurd values like "99999:99".

**Root Cause:** The `extend_room_timer` socket handler had no upper bound on `delta_minutes` or on the total `expires_at`. The code was:

```js
const minutes = Number(delta_minutes);
const newExpires = new Date(baseTime.getTime() + minutes * 60000);
// No caps!
```

**Fix — Three Limits Applied:**

```js
// 1. Clamp delta to ±12 hours per adjustment
const maxDelta = 12 * 60; // 720 minutes
const clampedMinutes = Math.min(Math.max(minutes, -maxDelta), maxDelta);

// 2. Cap total timer to max 24 hours from now
const maxExpires = new Date(now.getTime() + 24 * 60 * 60000);
if (newExpires > maxExpires) newExpires = maxExpires;

// 3. If timer reaches ≤ 0, end the room immediately (existing behavior)
if (newExpires <= now) {
  // delete room, emit room_ended
}
```

**Learning:** User-controllable values that affect system behavior (like room lifetime) must always be bounded on the server. Never trust the client — a malicious user, browser extension, or a buggy frontend can send arbitrary values. Always ask: "What's the maximum reasonable value for this?" and enforce it server-side.

---

## Problem 4 — Users Could Delete Other Users' Messages

**Symptom:** The frontend only showed the Trash2 icon on own messages, but a user could open DevTools and manually emit `delete_message` with any `messageId` and `senderId`, deleting anyone's messages.

**Root Cause:** The frontend UI correctly hid the delete button for other users' messages, but the backend socket handler trusted the `senderId` from the client without verification:

```js
// Vulnerable code:
socket.on('delete_message', async ({ roomId, messageId, senderId }) => {
  await Message.findByIdAndDelete(messageId); // No ownership check!
  io.to(roomId).emit('message_deleted', { messageId });
});
```

**Fix — Server-Side Ownership Verification:**

```js
socket.on('delete_message', async ({ roomId, messageId, senderId }) => {
  // Verify sender owns the message
  const msg = await Message.findOne({ _id: messageId, sender_id: senderId });
  if (!msg) return; // Silent reject — not their message
  await Message.findByIdAndDelete(messageId);
  io.to(roomId).emit('message_deleted', { messageId });
});
```

And in the in-memory store:

```js
deleteMessageById(id, senderId) {
  const idx = this.messages.findIndex(m => m.id === id && String(m.sender_id) === String(senderId));
  if (idx === -1) return false;
  this.messages.splice(idx, 1);
  return true;
}
```

**Learning:** UI gating is not security. Every action that affects data must be re-verified on the server. The rule is: **authorization at the server, presentation at the client.** A user should never be able to perform an action the server wouldn't allow, regardless of what the UI shows.

---

## Problem 5 — Non-Admin Media Approval Flow Complexity

**Symptom:** When a non-admin member tries to send an image or voice message, it needs admin approval. But the original code tried to send the message first, then retroactively "undo" it if the admin denied — leading to inconsistent states.

**Root Cause:** The approval flow was designed as "send first, ask permission later." Messages would appear briefly for some users but not others, and denying didn't reliably remove them.

**Fix — Implemented a proper request→approve→broadcast chain:**

The flow was redesigned:

```
Non-admin clicks send image
    │
    ├─ Is user admin? → Emit `send_message` directly (everyone sees it)
    │
    └─ Is user non-admin?
        │
        ├─ Emit `media_share_request` to admin only
        │
        ├─ Admin sees preview banner with Allow/Deny
        │
        ├─ Allow → Backend creates Message in DB → broadcasts `receive_message` to all
        │
        └─ Deny → Backend sends `media_share_denied` to requester only
```

Key backend code (`roomHandler.js:83-116`):

```js
socket.on('media_share_approve', async ({ roomId, requesterSocketId, senderId, messageType, ...fileData }) => {
  // Create message in DB first
  const msg = await Message.create({
    room_id: roomId, sender_id: senderId,
    message_type: messageType,
    file_data: fileData.fileData ? Buffer.from(fileData.fileData.split(',')[1], 'base64') : undefined,
    file_name: fileData.fileName, file_mime: fileData.fileMime,
  });
  // Broadcast to everyone
  io.to(roomId).emit('receive_message', savedMessage);
  // Notify requester
  io.to(requesterSocketId).emit('media_share_approved');
});
```

**Learning:** "Ask permission, then act" is simpler and more reliable than "act, then ask forgiveness." For multi-user collaborative features, design the approval as a gate *before* the action, not a rollback *after*. This avoids race conditions, inconsistent state, and complex undo logic.

---

## Problem 6 — PPTX File Parsing: ZIP + XML Complexity

**Symptom:** When parsing a PPTX file to extract slide content, the code would fail for many files — missing text, missing images, or throwing errors on certain XML structures.

**Root Cause:** PPTX is a ZIP archive containing XML files in a specific OpenXML layout. The naive approach of reading all XML files failed because:

1. Slide content can be in multiple XML files (`slide1.xml`, `slide2.xml`, ...)
2. Images are stored in `ppt/media/` and referenced via relationships (`rId` attributes)
3. Text can be nested in multiple levels of `<a:p>`, `<a:r>`, `<a:t>` elements
4. Some slides have no text, only images
5. XML namespaces make querying harder

**Fix — Structured Parsing with JSZip:**

```js
export async function parsePPTX(base64Data) {
  const zip = new JSZip();
  const zipContents = await zip.loadAsync(base64Data, { base64: true });

  // 1. Find all slide files
  const slideFiles = Object.keys(zipContents.files)
    .filter(name => /ppt\/slides\/slide\d+\.xml$/i.test(name))
    .sort();

  // 2. Load relationships to resolve image references
  const relsXml = await zipContents.files['ppt/_rels/presentation.xml.rels'].async('text');
  const relsDoc = new DOMParser().parseFromString(relsXml, 'text/xml');
  // ... map rId to image paths

  // 3. Parse each slide
  for (const file of slideFiles) {
    const xml = await zipContents.files[file].async('text');
    const doc = new DOMParser().parseFromString(xml, 'text/xml');

    // Extract text: <a:t> elements inside <a:p> (paragraphs)
    const texts = [...doc.querySelectorAll('a\\:t, t')].map(el => el.textContent);

    // Extract images: <p:blipFill> elements
    const blips = [...doc.querySelectorAll('p\\:blipFill a\\:blip, blipFill blip')];
    // ... resolve rId to image path, read from zip, convert to dataURL
  }
}
```

**Learning:** Working with binary formats often requires understanding their internal structure. For PPTX (OOXML), the key insight is it's a ZIP of XML with specific naming conventions. Tools like JSZip + DOMParser give you full control. Always handle edge cases: slides with only images, slides with only text, empty slides, and malformed XML.

---

## Problem 7 — WebRTC Screen Share Signaling Complexity

**Symptom:** Screen sharing worked for 1 viewer but failed when multiple viewers joined. Some viewers would get "Failed to set remote answer sdp" errors.

**Root Cause:** The screen share signaling assumed one peer connection, but screen sharing with multiple viewers requires **one RTCPeerConnection per viewer**. Each connection needs its own offer/answer/ICE exchange. The original code used a single shared peer connection object.

**Fix — Per-Viewer Peer Connections:**

```js
// Sharer maintains a map: peerConnections = { [socketId]: RTCPeerConnection }

async function startScreenShare() {
  const stream = await navigator.mediaDevices.getDisplayMedia({ video: true });

  // Create a connection for each viewer
  onlineUsers.forEach(user => {
    if (user.socketId !== mySocketId) {
      const pc = new RTCPeerConnection(iceConfig);
      stream.getTracks().forEach(track => pc.addTrack(track, stream));
      pc.onicecandidate = (e) => {
        if (e.candidate) socket.emit('screen_share_ice_candidate', { targetSocketId: user.socketId, candidate: e.candidate });
      };
      pc.createOffer().then(offer => {
        pc.setLocalDescription(offer);
        socket.emit('screen_share_offer', { targetSocketId: user.socketId, offer });
      });
      peerConnectionsRef.current[user.socketId] = pc;
    }
  });
}
```

And the viewer side creates its own connection per sharer:

```js
socket.on('screen_share_offer', ({ socketId, offer }) => {
  const pc = new RTCPeerConnection(iceConfig);
  pc.ontrack = (e) => { remoteVideoRef.current.srcObject = e.streams[0]; };
  pc.onicecandidate = (e) => {
    if (e.candidate) socket.emit('screen_share_ice_candidate', { targetSocketId: socketId, candidate: e.candidate });
  };
  pc.setRemoteDescription(new RTCSessionDescription(offer));
  pc.createAnswer().then(answer => {
    pc.setLocalDescription(answer);
    socket.emit('screen_share_answer', { targetSocketId: socketId, answer });
  });
  peerConnectionsRef.current[socketId] = pc;
});
```

**Learning:** WebRTC is fundamentally peer-to-peer. With N viewers, you need N peer connections. The key pattern: maintain a map of `socketId → RTCPeerConnection`, create offers/answers per-peer, and use Socket.IO as a signaling relay (not the media transport). Always clean up connections on disconnect.

---

## Problem 8 — Room Timer Drift Across Clients

**Symptom:** Different users in the same room saw slightly different countdown times. After a few minutes, User A might see "12:34" while User B sees "12:28".

**Root Cause:** Each client calculated `roomTimerSecondsLeft` independently from `room.expires_at`, but:
1. The initial calculation happened at slightly different times (network latency, render timing)
2. Each client's `setInterval(1000)` drifted independently
3. There was no server-sync mechanism — once the initial value was set, clients never reconciled

**Fix — Server-Authoritative Broadcast + Re-Sync:**

1. When admin adjusts timer, server broadcasts the canonical `expires_at`:

```js
// Backend
io.to(roomId).emit('room_timer_update', { roomId, expires_at: newExpires.toISOString() });
```

2. On receiving update, **all clients recalculate from the same timestamp**:

```js
// Frontend
socket.on('room_timer_update', ({ expires_at }) => {
  const diff = (new Date(expires_at) - Date.now()) / 1000;
  setRoomTimerSecondsLeft(Math.max(0, Math.round(diff)));
});
```

3. Every 60 seconds, the server's auto-cleanup loop ensures rooms actually expire, regardless of client state.

**Learning:** Any timer that needs to be consistent across users must be **server-authoritative**. Clients can display a local countdown for responsiveness, but the source of truth is always the server. Broadcast the remaining time (or absolute expiry timestamp) on every change, and let clients recalculate. The 1-second client-side `setInterval` is just for smooth UI animation — don't rely on it for accuracy.

---

## Problem 9 — Dual Code Paths: MongoDB vs In-Memory Store

**Symptom:** Every feature had to be implemented twice — once for MongoDB (production) and once for the in-memory store (development/fallback). Adding a new feature required editing 2-3 files and was error-prone.

**Root Cause:** The project was designed with two database backends from the start. MongoDB was the primary target, but the in-memory store was added as a fallback when MongoDB was unavailable. Every socket handler and controller had `if (isMemoryDb()) { ... } else { ... }` branches.

**Example — The Proliferation of Branches:**

```js
// roomHandler.js line after line
if (isMemoryDb()) {
  room = await memoryStore.findActiveRoomById(roomId);
} else {
  const { default: Room } = await import('../models/Room.js');
  room = await Room.findOne({ _id: roomId, is_active: true });
}
```

This pattern appeared in:
- `send_message` handler
- `extend_room_timer` handler
- `media_share_approve` handler
- `delete_message` handler
- Server auto-cleanup loop
- All room controller endpoints

**Mitigation — Helper Functions & Consistent Interfaces:**

```js
// Create a uniform interface
async function findRoom(id) {
  if (isMemoryDb()) return memoryStore.findActiveRoomById(id);
  const { default: Room } = await import('../models/Room.js');
  return Room.findOne({ _id: id, is_active: true });
}

async function deleteRoom(id) {
  if (isMemoryDb()) return memoryStore.deleteRoomById(id);
  const { default: Room } = await import('../models/Room.js');
  return Room.findByIdAndDelete(id);
}
```

But the deeper issue remained — different data shapes (MongoDB returns Mongoose documents with `.save()`, `.populate()`; memory returns plain objects).

**Learning:** While having an in-memory fallback is useful for development, abstracting it behind a **repository pattern** from day one would have saved significant effort. A single `RoomRepository` class with `findById()`, `create()`, `delete()`, `updateExpiry()` methods would have eliminated all the `if/else` branching. When starting a project with multiple storage backends, define the interface first, implement both backends against it, and never check the backend type in business logic.

---

## Problem 10 — Auto Room Cleanup Race Conditions

**Symptom:** Sometimes when an admin ended a room manually, the auto-cleanup loop would try to delete it again moments later, causing "Room not found" errors and duplicate `room_ended` events. Users would see the "Room has ended" alert twice.

**Root Cause:** Two independent code paths could delete the same room:

1. **Admin ends room** → `DELETE /api/rooms/:id` (REST) + `room_ended` (socket)
2. **Timer expires** → `extend_room_timer` handler sets `newExpires <= now` → deletes room
3. **Auto-cleanup loop** → `setInterval` checks `expires_at < now` every 60s → deletes expired rooms

If the admin ended a room 5 seconds before the auto-cleanup loop ran, the loop would try to delete a room that no longer existed.

**Fix — Idempotency Guards:**

1. **is_active flag** — Instead of physically deleting the room on the first path, set `is_active = false`:

```js
// When admin ends room
await Room.findByIdAndUpdate(roomId, { is_active: false });

// Auto-cleanup only targets active rooms
const expiredRooms = await Room.find({ expires_at: { $lt: now }, is_active: true });
```

2. **Check before delete** — In the auto-cleanup, verify room still exists:

```js
const room = await Room.findById(roomId);
if (!room) return; // Already deleted, skip
```

3. **Guard in socket handler** — Track whether `room_ended` was already emitted:

```js
const roomEndedSet = new Set();

// Before emitting room_ended:
if (roomEndedSet.has(roomId)) return;
roomEndedSet.add(roomId);
io.to(roomId).emit('room_ended');
```

4. **Socket room cleanup** — The `room_ended` handler leaves the socket room, so subsequent `io.to(roomId)` emits go nowhere:

```js
socket.on('room_ended', ({ roomId }) => {
  io.to(roomId).emit('room_ended');
  io.sockets.in(roomId).socketsLeave(roomId); // All sockets leave
  delete onlineUsers[roomId];
});
```

**Learning:** When multiple code paths can trigger the same side effect (deleting a resource, sending a notification), you need idempotency. The three patterns used here — state flags (`is_active`), existence checks before delete, and deduplication sets — each prevent a different flavor of race condition. Always ask: "What happens if this code runs twice?" If the answer is "bad things," make it idempotent.

---

## Summary of Key Learnings

| # | Problem | Core Lesson |
|---|---------|-------------|
| 1 | Screen share preview broken | State updates are async — use `useEffect` to interact with DOM after state changes |
| 2 | Socket.IO silently drops large files | Always configure transport limits explicitly; silent failures are debugging traps |
| 3 | Infinite timer exploit | **Never trust the client** — bound every user-controllable value on the server |
| 4 | Users can delete others' messages | **UI gating ≠ security** — always re-authorize on the server |
| 5 | Complex media approval flow | Design approval as a **gate before the action**, not a rollback after |
| 6 | PPTX parsing fails | Binary file formats (OOXML = ZIP + XML) require understanding the full spec |
| 7 | WebRTC multi-viewer fails | One viewer = one peer connection; use a `socketId → RTCPeerConnection` map |
| 8 | Timer drift across clients | Timers must be **server-authoritative**; broadcast absolute expiry timestamps |
| 9 | Dual DB code paths proliferate | Use a **repository abstraction** from the start, never check backend type in business logic |
| 10 | Room cleanup race conditions | **Idempotency** — make every side-effect-safe operation safe to run twice |
