# UTB-027: No Visual Indicator for Active vs Inactive Participants

**Document Created**: 2026-01-01
**Severity**: Medium
**Component**: [ParticipantBar.tsx](../../frontend/src/features/participant/components/ParticipantBar.tsx)
**PRD Reference**: [FR-1.2.7](../PRD.md#12-board-access--user-identity)
**Status**: Open

---

## Problem

There is no way to know if a participant is currently active (connected) or inactive (disconnected/away).

---

## Current Behavior

All participant avatars look the same regardless of connection status.

---

## Expected Behavior

Users should be able to see at a glance who is currently active on the board.

---

## Proposed Solution

**Option A: Green Dot Indicator** (Recommended)
```
  ┌───┐
  │JS │●  ← small green dot (online)
  └───┘

  ┌───┐
  │AK │○  ← hollow/gray dot (offline)
  └───┘
```

**Option B: Avatar Opacity**
- Active: Full opacity (100%)
- Inactive: Reduced opacity (50%) + grayscale

**Option C: Border Color**
- Active: Green border
- Inactive: Gray border

**Recommendation**: Option A - Green dot is a universal pattern (Slack, Teams, Discord)

---

## Implementation Details

**Active State:**
- User has WebSocket connection
- Small green dot (8px) positioned bottom-right of avatar
- Dot has white border (2px) for visibility on colored backgrounds

**Inactive State:**
- User disconnected or idle for >5 minutes
- Gray/hollow dot OR no dot
- Optional: Remove from participant list after extended inactivity (configurable)

**Idle State (Optional P2):**
- User connected but no activity for >2 minutes
- Yellow/orange dot

---

## Technical Considerations

- WebSocket presence tracking required
- Heartbeat mechanism to detect disconnections
- Server-side participant list with connection status
- Real-time sync when users connect/disconnect

---

## Acceptance Criteria

- [ ] Active users show green presence indicator
- [ ] Inactive/disconnected users show gray/no indicator
- [ ] Presence updates in real-time when users join/leave
- [ ] Tooltip shows status: "John Smith (online)" or "John Smith (offline)"

---

## Design Spec Update Required

Update Section 4.3 Avatar Display:
```
- **Presence Indicator**: 8px dot, bottom-right of avatar
  - Online: Green (#22c55e) with 2px white border
  - Offline: Gray (#9ca3af) or hidden
  - Idle (P2): Yellow (#eab308)
```

---

*Enhancement identified during user testing session - 2026-01-01*
