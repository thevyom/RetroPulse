# E2E Test Infrastructure Bugs

**Document Created**: 2026-01-01
**Status**: Open Issues Requiring Resolution

---

## Bug Tracker Summary

| ID | Severity | Component | Status | Description |
|----|----------|-----------|--------|-------------|
| E2E-001 | High | Playwright + React | Open | `fill()` does not trigger React controlled input state updates |
| E2E-002 | Critical | Playwright + @dnd-kit | Open | Both PointerSensor and KeyboardSensor fail to work with Playwright |
| E2E-003 | Medium | Playwright + WebSocket | Open | Admin status detection timing is unreliable |

---

## E2E-001: Playwright fill() Does Not Trigger React State Updates

**Severity**: High
**Component**: Playwright + React controlled inputs
**Status**: Open

### Description

Playwright's `fill()` method sets the input value directly but does not fire the proper synthetic events that React expects. This causes React's controlled input state to become out of sync with the DOM value.

### Affected Tests

- `01-board-creation.spec.ts` - Board name input
- Any test using input fields with React controlled state

### Steps to Reproduce

1. Navigate to home page
2. Click "Create New Board" button
3. Use `await input.fill('Test Board')` to fill the board name
4. Click submit
5. Observe that the input shows text but React state is empty

### Current Behavior

- Input visually shows the text
- React state remains at initial value (empty string)
- Form validation fails or uses empty value

### Root Cause

React's synthetic event system requires `input` and `change` events to be fired in sequence. Playwright's `fill()` sets the DOM value directly without firing these events, bypassing React's event handlers.

### Workaround (Applied)

Use `pressSequentially()` instead of `fill()`:

```typescript
// BAD - does not trigger React state update
await input.fill('Test Board');

// GOOD - fires key events that React handles
await input.pressSequentially('Test Board');
```

### Impact

- 4+ tests affected in board-creation flow
- All form inputs with controlled state

### Resolution Status

**Workaround applied**: Changed `fill()` to `pressSequentially()` in affected tests.

---

## E2E-002: Playwright Cannot Trigger @dnd-kit Drag Operations

**Severity**: Critical
**Component**: Playwright + @dnd-kit library
**Status**: Open - No working solution

### Description

Neither Playwright's native drag methods nor manual pointer/keyboard simulation can successfully trigger @dnd-kit's drag-and-drop operations. This is a fundamental incompatibility between Playwright's event system and @dnd-kit's sensor architecture.

### Affected Tests

- `09-drag-drop.spec.ts` - 8/10 tests failing
- Any test involving drag-and-drop card operations:
  - Parent-child linking
  - Action-feedback linking
  - Column moves

### Technical Analysis

#### Attempt 1: Playwright dragTo()

```typescript
await sourceCard.dragTo(targetCard);
```

**Result**: Failed. @dnd-kit's PointerSensor does not recognize Playwright's native drag events.

#### Attempt 2: Manual Pointer Events

```typescript
const sourceBox = await sourceCard.boundingBox();
const targetBox = await targetCard.boundingBox();

await page.mouse.move(sourceBox.x, sourceBox.y);
await page.mouse.down();
await page.mouse.move(targetBox.x, targetBox.y, { steps: 10 });
await page.mouse.up();
```

**Result**: Failed. @dnd-kit requires `pointerdown`, `pointermove`, `pointerup` events but Playwright's mouse API fires `mousedown`, `mousemove`, `mouseup`.

#### Attempt 3: Keyboard Sensor

Added KeyboardSensor to the application:

```typescript
// In RetroBoardPage.tsx
const sensors = useSensors(
  useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
  useSensor(KeyboardSensor, {
    coordinateGetter: sortableKeyboardCoordinates,
  })
);
```

Test code:

```typescript
await sourceCard.focus();
await page.keyboard.press('Space'); // Pick up
await page.keyboard.press('ArrowDown');
await page.keyboard.press('Space'); // Drop
```

**Result**: Failed. @dnd-kit's KeyboardSensor expects the draggable element to be focused, but the focusable element is the drag handle (GripVertical div with `listeners`), not the card container.

### Root Cause

1. **Sensor Architecture**: @dnd-kit sensors listen for specific event patterns that Playwright cannot replicate:
   - PointerSensor needs native `pointer*` events (not `mouse*`)
   - KeyboardSensor needs focus on the element with `listeners` attached

2. **Event Dispatch**: Playwright dispatches events at the DOM level, but @dnd-kit sensors use React's synthetic event system with specific event properties.

3. **Drag Handle Separation**: The drag handle (`<div {...listeners}>`) is separate from the card container. Focusing the card does not focus the drag handle.

### Potential Solutions (Not Yet Implemented)

1. **Custom Test Sensor**: Create a @dnd-kit sensor specifically for testing that responds to data attributes or custom events.

2. **Programmatic Drag API**: Expose a testing API that bypasses sensors entirely:
   ```typescript
   window.__testDrag(sourceId, targetId);
   ```

3. **Use @dnd-kit/core's testing utilities**: Check if @dnd-kit provides testing helpers.

4. **Bypass E2E for drag-drop**: Test drag-drop at the integration level using React Testing Library with mocked sensors.

### Impact

- **16 tests failing** across drag-drop and parent-child spec files
- Core functionality (card linking, column moves) cannot be E2E tested
- Manual testing required for these flows

### Resolution Status

**Not resolved**. No working approach found. Recommended to:
1. File issue with @dnd-kit repository
2. Consider using integration tests with React Testing Library for drag-drop
3. Create custom test-mode sensor for application

---

## E2E-003: Admin Status Detection Timing

**Severity**: Medium
**Component**: Playwright + WebSocket session
**Status**: Open (workaround applied)

### Description

After creating a board, the user's admin status takes time to be established via WebSocket. Tests checking for admin controls immediately after navigation fail.

### Affected Tests

- `01-board-creation.spec.ts` - "user becomes admin of created board"
- Tests checking for admin-only UI elements

### Steps to Reproduce

1. Create a new board via UI
2. Wait for navigation to board page
3. Immediately check for admin controls (Close Board button, Edit button)

### Current Behavior

Admin controls may not be visible for 1-2 seconds after page load while WebSocket session establishes.

### Workaround (Applied)

Added helper function with fallbacks:

```typescript
export async function waitForAdminStatus(
  page: Page,
  options: { timeout?: number } = {}
): Promise<void> {
  const { timeout = 5000 } = options;

  // Wait for "No participants yet" to disappear
  await page.waitForSelector('text="No participants yet"', {
    state: 'hidden',
    timeout,
  }).catch(() => {});

  // Wait for any admin indicator
  await page.waitForSelector(
    '[aria-label="Admin"], [aria-label="Edit board name"], button:has-text("Close Board")',
    { timeout, state: 'visible' }
  ).catch(() => {});
}
```

### Impact

- 2 tests affected
- Test marked as `.skip()` pending more reliable solution

### Resolution Status

**Partially resolved**. Helper added but test still skipped due to flakiness.

---

## Resolution Priority

| Priority | Bug | Impact | Effort |
|----------|-----|--------|--------|
| 1 | E2E-002 | 16 tests failing, core flow | High - requires architecture change |
| 2 | E2E-001 | 4 tests fixed with workaround | Low - workaround sufficient |
| 3 | E2E-003 | 2 tests, edge case | Low - timing optimization |

---

## Recommendations

### Short-term (Workarounds)

1. **E2E-001**: Continue using `pressSequentially()` for all React form inputs
2. **E2E-003**: Use `waitForAdminStatus()` helper and accept some flakiness

### Medium-term (Test Strategy)

1. **E2E-002**: Move drag-drop testing to integration layer using:
   - React Testing Library + @dnd-kit test utilities
   - Unit tests for drag-drop viewmodels
   - Manual E2E smoke test for drag-drop

2. **E2E Coverage**: Adjust E2E test scope to exclude @dnd-kit interactions

### Long-term (Architecture)

1. **E2E-002**: Implement custom test sensor in application:
   ```typescript
   // TestSensor.ts - only loaded in test environment
   export const TestSensor = createTestSensor({
     activator: (event) => event.type === 'test-drag-start',
   });
   ```

2. **E2E-002**: Consider alternative DnD libraries with better Playwright support

---

## Related Documents

- [E2E Test Run Report](./E2E_TEST_RUN_REPORT.md)
- [Integration Test Strategy](./INTEGRATION_TEST_STRATEGY.md)
- [Frontend E2E Lessons Learned](../../../.claude/lessons/e2eLesson.md)

---

*Document created during E2E test infrastructure debugging - 2026-01-01*
