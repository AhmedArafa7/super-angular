# Super Meet — Technical Architecture & Implementation Context

> **Document Purpose**: Permanent knowledge base and architectural source of truth for the Super Meet video conferencing engine in `Super-Angular`. This document preserves complete system context, engineering decisions, recovered phase states, discovered edge cases, and the roadmap for upcoming phases.

---

## 1. Project & Technology Overview

- **Host Application**: `Super-Angular` (Integrated productivity and collaboration platform)
- **Framework**: Angular 21 (`@angular/core: ^21.2.0`)
- **Language**: TypeScript ~5.9.2
- **Styling**: Tailwind CSS 3.4.19 + Vanilla SCSS (`inlineStyleLanguage: scss`)
- **Iconography**: Lucide Angular (`@lucide/angular: ^1.16.0`)
- **State Management**: Angular Signals (`signal`, `computed`) with OnPush-friendly reactive models
- **Control Flow**: Modern Angular template syntax (`@if`, `@for`, `@switch`)
- **Real-Time Backend**: Firebase / Cloud Firestore (`firebase: ^10.13.0`)
- **SFU Client Engine**: LiveKit Client SDK (`livekit-client: ^2.22.2`)
- **Serverless / Backend APIs**:
  - Cloudflare Pages Function: `functions/api/meeting/token.js`
  - Node.js Express Backend: `backend/routes/meeting.routes.js` with `livekit-server-sdk: ^2.18.0`

---

## 2. Super Meet Core Requirements

1. **Strict 2-Party vs. Multi-Party Partitioning**:
   - **Exactly 2 participants**: Native browser WebRTC P2P direct connection.
   - **3+ participants**: Centralized SFU (Selective Forwarding Unit) architecture.
2. **Absolute Bandwidth Minimization (The One-Upstream Rule)**:
   - Each participant must maintain exactly **ONE logical media upstream** (1 outbound audio track, 1 outbound video track):
     - In P2P mode: Upstream transmits directly to the remote peer.
     - In SFU mode: Upstream transmits directly to the SFU server, which handles selective fan-out to subscribers.
3. **Strict Prohibition of Full Mesh**:
   - Full Mesh ($N \times (N - 1)$ connections) is categorically prohibited for 3 or more participants due to unsustainable upstream bandwidth multiplication on client devices.
4. **Hysteresis / Stability Policy**:
   - When room participant count drops from 3 back to 2, the room **MUST NOT** revert automatically to P2P. It must remain on SFU to prevent stream tear-down, renegotiation renegotiation storms, and visual flickering.
5. **No External Dependencies for P2P**:
   - Native WebRTC APIs only (`RTCPeerConnection`, `RTCRtpSender`, `RTCIceCandidate`).
   - No PeerJS for meeting media (PeerJS is strictly reserved for Arcade games).
   - No Jitsi integration.

---

## 3. High-Level Architecture & Status Summary

| Phase | Description | Status | Verification Status |
| :--- | :--- | :---: | :--- |
| **Phase 1** | Architecture design, bandwidth analysis, P2P vs SFU boundary definition | **COMPLETED** | Verified in architecture documentation |
| **Phase 2** | Meeting lobby, room creation, Firestore presence, media preview, routing | **COMPLETED** | Verified in working code |
| **Phase 3** | Native WebRTC P2P for 2 participants, signaling via Firestore, One-Upstream enforcement | **COMPLETED** | Verified in code & browser recording |
| **Phase 4** | LiveKit SFU deployment, backend token signing, multi-party media relay | **PARTIAL / NEXT** | Client & token code scaffolded; credentials & server needed |
| **Phase 5** | Production hardening, ICE restart, reconnect resiliency, TURN fallback | **NOT IMPLEMENTED** | Planned after Phase 4 |
| **Phase 6** | Screen sharing, in-call chat, participant moderation | **NOT IMPLEMENTED** | UI placeholders exist; implementation planned |

---

## 4. Current File Structure & Module Breakdown

```text
src/app/core/services/meeting/
├── meeting-engine.interface.ts   # Common contract (IMeetingEngine) for P2P and SFU engines
├── meeting-media.service.ts      # Device acquisition (getUserMedia), mic meter, track toggles
├── meeting-p2p.service.ts        # Native WebRTC RTCPeerConnection engine (Phase 3)
├── meeting-room.service.ts       # Firestore room lifecycle, presence, and mode transitions
├── meeting-sfu.service.ts        # LiveKit SFU client wrapper (Phase 4 client scaffold)
├── meeting.models.ts             # TypeScript domain models (MeetingRoom, MeetingParticipant, MeetingMode)
└── meeting.service.ts            # Central meeting coordinator, state machine, and migration manager

src/app/features/meeting/
├── meeting.component.ts          # Meeting view controller, route param watcher, stream binder
├── meeting.component.html        # Adaptive layout: Hub (/meeting), Lobby, Active Call Grid
└── meeting.component.scss        # Glassmorphic styles and custom sizing utilities

src/app/features/peer-chat/
├── peer-chat.component.ts        # Direct messaging integration with "Start Super Meet" trigger
└── peer-chat.component.html      # Header action button launching Super Meet

Backend & Serverless:
├── backend/routes/meeting.routes.js  # Express route generating signed LiveKit access tokens
├── functions/api/meeting/token.js    # Cloudflare Pages Function generating signed LiveKit tokens
└── firestore.rules                   # Security rules for room, presence, and signaling subcollections
```

---

## 5. Detailed Responsibilities of Each Meeting Service

### 5.1 `MeetingMediaService` (`meeting-media.service.ts`)
- **Lobby Media Initialization**: Invokes `navigator.mediaDevices.getUserMedia()` with optimal constraints (`1280x720` video, echo cancellation, noise suppression).
- **Track Reuse**: Holds the canonical `localStream` signal. Prevents secondary `getUserMedia` calls when moving from Lobby into an active P2P or SFU call.
- **Hardware Control**: Disables tracks via `track.enabled = false` without closing the hardware device or destroying `RTCPeerConnection` senders.
- **Audio Meter**: Uses the Web Audio API (`AudioContext`, `AnalyserNode`) to compute an audio level (0–100%) for real-time visual feedback in the Lobby.
- **Teardown**: Completely stops hardware tracks when leaving meetings or exiting the route.

### 5.2 `MeetingRoomService` (`meeting-room.service.ts`)
- **Room Code Generation**: Generates 4-character alphanumeric codes prefixed with `NEURO-` (e.g., `NEURO-DDTX`).
- **Room Lifecycle**: Creates and fetches room documents at `meeting_rooms/{roomId}`.
- **Presence Management**: Manages real-time presence subcollection `meeting_rooms/{roomId}/participants/{participantId}`.
- **Mode Transition**: Authoritatively updates room mode from `'p2p'` to `'sfu'` with migration metadata.
- **Clean Leave**: Deletes participant presence on exit and marks room `status: 'ended'` if the host leaves with no remaining users.

### 5.3 `MeetingP2pService` (`meeting-p2p.service.ts`)
- **Engine Implementation**: Implements `IMeetingEngine` for direct 1-to-1 WebRTC.
- **Connection**: Exactly ONE `RTCPeerConnection` configured with public Google STUN servers.
- **Track Attachment**: Adds existing audio and video tracks from `MeetingMediaService.localStream`.
- **Sender References**: Retains `audioSender` and `videoSender` (`RTCRtpSender`) for seamless track replacement via `replaceTrack`.
- **Candidate Buffering**: Maintains `remoteCandidateQueue` to buffer incoming remote ICE candidates that arrive before `setRemoteDescription` completes.
- **Signaling Handshake**:
  - Initiator (Host): Creates SDP Offer $\rightarrow$ writes to `signaling/p2p_session` $\rightarrow$ listens for Answer.
  - Receiver (Guest): Listens for Offer on `signaling/p2p_session` $\rightarrow$ sets remote description $\rightarrow$ creates SDP Answer $\rightarrow$ writes back to `signaling/p2p_session`.
  - ICE Exchange: Host writes to `signaling_host_candidates` and listens to `signaling_guest_candidates`; Guest does the inverse.

### 5.4 `MeetingSfuService` (`meeting-sfu.service.ts`)
- **Engine Implementation**: Implements `IMeetingEngine` using `livekit-client`.
- **Token Request**: Fetches short-lived JWT tokens from `/api/meeting/token`.
- **Adaptive Publishing**: Publishes existing audio and video tracks once to the LiveKit room with `simulcast: true` and `dynacast: true`.
- **Remote Subscription**: Subscribes to incoming remote participant tracks and maps them to `remoteStreams: Map<string, MediaStream>`.
- **Fallback / Standby**: Handles missing LiveKit server credentials gracefully by setting `isLiveKitConfigured = false`.

### 5.5 `MeetingService` (`meeting.service.ts`)
- **Facade & Coordinator**: Acts as the central orchestrator injecting `MeetingMediaService`, `MeetingRoomService`, `MeetingP2pService`, and `MeetingSfuService`.
- **Session ID Resolution**: `getSessionParticipantId()` ensures unique endpoint identities even when multiple tabs share the same authenticated user account.
- **Adaptive State Machine**:
  - Monitors participant count via real-time Firestore listener.
  - Exactly 2 participants + `mode === 'p2p'` $\rightarrow$ starts P2P call.
  - 3+ participants + `mode === 'p2p'` $\rightarrow$ Host executes authoritative `transitionToSfu()`.
  - Room `mode === 'sfu'` $\rightarrow$ triggers `executeSfuMigration()`, parallel SFU connection, and teardown of P2P.
  - Remaining on SFU when count drops to 2 (hysteresis rule enforced).

---

## 6. Firestore Data Model & Signaling Schema

### 6.1 Room Document (`meeting_rooms/{roomId}`)
```typescript
{
  roomId: string;             // e.g. "NEURO-DDTX"
  roomCode: string;           // Normalized uppercase room code
  hostId: string;             // Session endpoint ID of the host
  hostName: string;           // Display name of the host
  mode: 'p2p' | 'sfu';        // Active topology mode
  status: 'active' | 'ended'; // Room operational state
  createdAt: number;          // Timestamp (epoch ms)
  participantsCount: number;  // Current participant count
  updatedAt: Timestamp;       // Firestore server timestamp
  migration?: {               // Present when upgraded to SFU
    state: 'completed';
    initiatedBy: string;
    migratedAt: number;
  };
}
```

### 6.2 Participant Subcollection (`meeting_rooms/{roomId}/participants/{participantId}`)
```typescript
{
  id: string;                 // Session endpoint ID (e.g. "guest_3f9a2b")
  name: string;               // Display name
  avatarUrl: string;          // Avatar image URL
  role: 'host' | 'guest';     // Assigned role
  isAudioEnabled: boolean;    // Live mic status
  isVideoEnabled: boolean;    // Live camera status
  isScreenSharing: boolean;   // Screen share flag
  joinedAt: number;           // Timestamp
  lastPing: number;           // Keepalive ping
}
```

### 6.3 P2P Signaling Document (`meeting_rooms/{roomId}/signaling/p2p_session`)
```typescript
{
  offer?: {
    type: 'offer';
    sdp: string;
  };
  hostId?: string;
  createdAt?: number;
  answer?: {
    type: 'answer';
    sdp: string;
  };
  guestId?: string;
  answeredAt?: number;
}
```

### 6.4 ICE Candidates Subcollections
- `meeting_rooms/{roomId}/signaling_host_candidates/{candidateId}`
- `meeting_rooms/{roomId}/signaling_guest_candidates/{candidateId}`
```typescript
{
  candidate: RTCIceCandidateInit; // Native candidate payload (candidate, sdpMid, sdpMLineIndex)
  fromId: string;                 // Sender endpoint ID
  createdAt: Timestamp;           // Firestore server timestamp
}
```

---

## 7. Media & Bandwidth Architecture

### 7.1 P2P Mode (2 Participants)
```
[ Participant A (Host) ] ── (1 Outbound Stream) ──► [ Participant B (Guest) ]
[ Participant A (Host) ] ◄── (1 Inbound Stream)  ─── [ Participant B (Guest) ]
```
- **Outbound connections**: Exactly 1 `RTCPeerConnection`.
- **Upload Bandwidth**: 1 video track (~1.5 Mbps) + 1 audio track (~48 kbps) = ~1.55 Mbps total.
- **Media path**: Direct peer-to-peer via STUN/ICE. Zero media bytes routed through Firestore or application servers.

### 7.2 SFU Mode (3+ Participants)
```
[ Participant A ] ── (1 Upstream) ──► [ LiveKit SFU Server ] ──► Downstream ──► [ Participant B ]
                                                             └──► Downstream ──► [ Participant C ]
[ Participant B ] ── (1 Upstream) ──► [ LiveKit SFU Server ] ──► Downstream ──► [ Participant A ]
                                                             └──► Downstream ──► [ Participant C ]
[ Participant C ] ── (1 Upstream) ──► [ LiveKit SFU Server ] ──► Downstream ──► [ Participant A ]
                                                             └──► Downstream ──► [ Participant B ]
```
- **Outbound connections**: Exactly 1 upstream connection to the SFU per participant.
- **Upload Bandwidth**: Exactly 1 video track + 1 audio track upstream per client. Upload requirement **never scales with participant count**.
- **Downstream Bandwidth**: $N - 1$ incoming streams received from the SFU, optimized with Simulcast and Dynacast.

### 7.3 Full Mesh Prohibition Comparison
| Metric | 2 Participants (P2P) | 4 Participants (Mesh - PROHIBITED) | 4 Participants (SFU - REQUIRED) |
| :--- | :---: | :---: | :---: |
| **PeerConnections per client** | 1 | 3 | 1 (to SFU) |
| **Upstream media copies per client** | 1 | 3 | **1** |
| **Upload bandwidth per client** | ~1.5 Mbps | ~4.5 Mbps (Crashes mobile/weak uplinks) | **~1.5 Mbps** |
| **Total network uplinks in room** | 2 | 12 | **4** |

---

## 8. Session & Endpoint Identification

To enable realistic local testing (running two browser windows/tabs on `localhost:4200`) without collision from shared `localStorage` or identical Firebase Auth tokens:
1. `getSessionParticipantId()` checks `sessionStorage.getItem('super_meet_endpoint_id')`.
2. If missing, it generates an endpoint ID: `${baseUid.slice(0, 10)}_${randomHex}` and stores it in `sessionStorage`.
3. Because `sessionStorage` is isolated per tab, Tab 1 and Tab 2 obtain distinct IDs and can negotiate P2P calls against each other on the same machine.
4. When entering a room, `room.hostId === endpointId` determines the authoritative `host` role.

---

## 9. Third-Participant Arrival & Migration Flow

1. Participant 1 (Host) and Participant 2 (Guest) are connected via P2P.
2. Participant 3 enters the room and writes their presence to `meeting_rooms/{roomId}/participants/{participant3Id}`.
3. The real-time listener `listenToParticipants` triggers on all connected clients.
4. Participant 3 recognizes `participants.length >= 3` in `joinMeeting()` and **does not initiate P2P**.
5. The Host recognizes `parts.length >= 3` and initiates authoritative mode migration:
   - Calls `MeetingRoomService.transitionToSfu(roomId, hostId)`.
   - Firestore document `meeting_rooms/{roomId}` updates with `mode: 'sfu'`.
6. Room snapshot triggers on all clients:
   - `updatedRoom.mode === 'sfu'` triggers `executeSfuMigration()`.
   - Clients initialize connection to the SFU engine.
   - Once SFU connection is established, the old P2P `RTCPeerConnection` is cleanly stopped via `MeetingP2pService.stop()`.
7. Full Mesh is completely prevented.

---

## 10. Audit of Current Implementation: Known Issues & Bugs

> [!WARNING]
> These issues were uncovered during code inspection of the existing commit. They **MUST** be resolved as part of the Phase 4 work before production usage.

### 10.1 Bug 1: Hardcoded Host ID in `PeerChatComponent`
- **Location**: `src/app/features/peer-chat/peer-chat.component.ts:163`
- **Code**: `await this.meetingRoomService.createRoom('me', 'أنت', roomCode);`
- **Defect**: When launching a meeting from Peer Chat, `hostId` is written as `'me'`. When the user is redirected to `/meeting/:roomCode`, `MeetingService.joinMeeting()` compares `room.hostId` against `getSessionParticipantId()` (which produces e.g. `guest_a4b9c1` or `${uid}_rand`). The comparison `room.hostId === endpointId` evaluates to `false`.
- **Consequence**: Both caller and receiver enter the room as `guest`. Neither party initiates the Host Offer flow. The P2P call never connects when started from Peer Chat.

### 10.2 Bug 2: Stale ICE Candidates Accumulation in Firestore
- **Location**: `src/app/core/services/meeting/meeting-p2p.service.ts:304`
- **Defect**: `listenToRemoteIceCandidates()` listens to `signaling_host_candidates` and `signaling_guest_candidates` without querying by session ID or deleting previous candidate documents.
- **Consequence**: If a room code is reused or participants reconnect, `onSnapshot` immediately yields all historical candidates from past calls as `change.type === 'added'`. Stale candidates from expired sessions are fed into the new `RTCPeerConnection`, triggering ICE failures or parsing errors.

### 10.3 Bug 3: Firestore Security Rule Mismatch on Room Deletion
- **Location**: `firestore.rules:76`
- **Code**: `allow delete: if isAuthenticated() && resource.data.hostId == request.auth.uid;`
- **Defect**: `resource.data.hostId` stores the session endpoint ID (`${uid.slice(0, 10)}_${rand}`), whereas `request.auth.uid` contains the raw Firebase Auth UID.
- **Consequence**: The condition never matches. Room deletion via Firestore client SDK is permanently rejected with permission denied.

### 10.4 Bug 4: Unauthenticated User Rejection in Firestore Rules
- **Location**: `firestore.rules:74-96`
- **Code**: `allow read, write: if isAuthenticated();` (requires `request.auth != null`)
- **Defect**: The application supports guest users (`baseUid = this.firebase.getUserId() || 'guest'`). If an unauthenticated guest opens a shared meeting link, all Firestore operations immediately fail with `FirebaseError: Missing or insufficient permissions`.
- **Requirement**: Guest users must either use Firebase Anonymous Authentication or rules must permit read/write access to valid room tokens.

### 10.5 Bug 5: Unhandled Browser Unload / Refresh
- **Location**: `src/app/core/services/meeting/meeting.service.ts`
- **Defect**: There is no `@HostListener('window:beforeunload')` or `pagehide` handler.
- **Consequence**: If a user closes the tab or refreshes, `ngOnDestroy` may not finish asynchronous Firestore deletion. The participant remains stranded in the Firestore presence list, causing ghost participants and preventing proper count decrements.

### 10.6 Bug 6: LiveKit Server Token Proxy Configuration
- **Location**: `proxy.conf.json:54` & `src/app/core/services/meeting/meeting-sfu.service.ts:48`
- **Defect**: `proxy.conf.json` maps `/api` to `https://super-axd.pages.dev`. In local development, calls to `/api/meeting/token` bypass the local Express server (`backend/routes/meeting.routes.js` on port 3000) and hit the remote Cloudflare Pages deployment, which fails if environment variables (`LIVEKIT_URL`, `LIVEKIT_API_KEY`, `LIVEKIT_API_SECRET`) are not set in Cloudflare.

### 10.7 Bug 7: Remote Video Element Audio Suppressed When Camera is Off
- **Location**: `src/app/features/meeting/meeting.component.html:462`
- **Code**: `<video [class.hidden]="!p.isVideoEnabled || !hasRemoteStream(p.id)" ...>`
- **Defect**: In some browser engines (notably WebKit/Safari), setting `display: none` (`class="hidden"`) on a `<video>` element halts audio decoding and playback for that element. If a remote user turns off their camera, their audio stream may be unintentionally silenced.
- **Recommendation**: Render a dedicated `<audio>` element for the remote stream or use visibility/opacity styling rather than `display: none`.

---

## 11. Exact State of Phase 4 (SFU) Scaffolding

Inspection confirms the current state of Phase 4:
- **`meeting-sfu.service.ts` is NOT an empty placeholder**. It contains a working implementation of `IMeetingEngine` utilizing the official `livekit-client` SDK (`Room`, `LocalAudioTrack`, `LocalVideoTrack`, `RoomEvent`).
- **Token generation endpoints exist in two places**:
  1. `functions/api/meeting/token.js`: Cloudflare Pages serverless function using Web Crypto API.
  2. `backend/routes/meeting.routes.js`: Node.js Express route using `livekit-server-sdk`.
- **What is missing for full Phase 4 operation**:
  1. LiveKit server instance (LiveKit Cloud or self-hosted instance with valid `LIVEKIT_URL`, `LIVEKIT_API_KEY`, `LIVEKIT_API_SECRET`).
  2. Development proxy alignment to route `/api/meeting/token` to the desired backend.
  3. UI error surfacing when LiveKit server credentials are not configured.
  4. Fixes for the Phase 3 issues identified in Section 10.

---

## 12. Verification & Test History

- **Room Tested**: `NEURO-DDTX`
- **Compilation**: `npx tsc --noEmit` returns **0 errors** (Exit Code 0).
- **Previous Manual Test**: Two browser tabs (Host & Guest) successfully established a 1-to-1 WebRTC P2P audio/video call with active bandwidth indicators (`1 Upstream Active`, `1 Downstream P2P`), verified mic/camera toggles without renegotiation, and verified 3rd participant detection.
- **Saved Test Artifacts**:
  - Screenshot: `C:\Users\LENOVO\.gemini\antigravity-ide\brain\85f166b5-fe95-4ac9-8abe-ec9d27cb5310\p2p_meeting_connected_1788768516507.png`
  - Browser Recording: `C:\Users\LENOVO\.gemini\antigravity-ide\brain\85f166b5-fe95-4ac9-8abe-ec9d27cb5310\p2p_host_guest_call_1788768235327.webp`

---

## 13. Next Steps (Roadmap for Phase 4)

1. **Bug Remediation (Prerequisite)**:
   - Fix `hostId` assignment in `PeerChatComponent.startDirectMeeting` to use `MeetingService.getSessionParticipantId()` or pass proper ID.
   - Add session timestamp or clear old ICE candidates in `MeetingP2pService` to eliminate stale candidate contamination.
   - Adjust `firestore.rules` for room deletion and guest authentication.
   - Add `beforeunload` cleanup listener in `MeetingService`.
2. **SFU Infrastructure Configuration**:
   - Provide LiveKit Cloud or self-hosted server credentials (`LIVEKIT_URL`, `LIVEKIT_API_KEY`, `LIVEKIT_API_SECRET`).
   - Configure environment variables in Cloudflare Pages and/or local Express `.env`.
3. **LiveKit Integration Testing**:
   - Verify 3-participant and 4-participant calls connecting to LiveKit SFU.
   - Verify that each participant maintains exactly 1 upstream to LiveKit.
   - Verify multi-tile grid video rendering and speaker audio.
4. **Hysteresis Verification**:
   - Drop participant count from 3 to 2 and verify that the room remains in SFU mode without tearing down or reverting to P2P.
