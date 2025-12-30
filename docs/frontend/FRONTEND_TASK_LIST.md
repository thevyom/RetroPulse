# Frontend Implementation Task List - Collaborative Retro Board

**Document Version**: 1.0
**Date**: 2025-12-25
**Based On**: FRONTEND_COMPONENT_DESIGN_V2.md, FRONTEND_TEST_PLAN.md
**Status**: Ready for Implementation

---

## Task Overview

This task list breaks down the frontend implementation into discrete, manageable coding steps following the MVVM architecture pattern. Tasks are sequenced to validate core functionality early through incremental development and testing.

**Total Estimated Tasks**: 45-50 implementation tasks + 30-35 test tasks

---

## Phase 1: Project Setup & Infrastructure

### 1. Initial Project Setup

- [ ] 1.1 Initialize Vite + React + TypeScript project
  - Create project with `npm create vite@latest`
  - Configure TypeScript with strict mode
  - Set up ESLint + Prettier
  - _Requirements: Tech stack decision from design doc_

- [ ] 1.2 Install and configure core dependencies
  - Install React 19+, TypeScript 5+
  - Install Zustand for state management
  - Install shadcn/ui + Tailwind CSS for UI components
  - Install Lucide React for icons
  - Install @dnd-kit for drag-and-drop
  - Install Socket.io-client for real-time
  - Install axios for HTTP requests
  - _Requirements: Technology stack (Section 1.2 of design doc)_

- [ ] 1.3 Configure testing framework
  - Install Vitest + React Testing Library
  - Install Playwright for E2E testing
  - Install MSW (Mock Service Worker) for API mocking
  - Configure coverage reporting (c8)
  - Create test utilities and setup files
  - _Requirements: Test plan Section 1.2_

- [ ] 1.4 Set up project structure following MVVM
  - Create folder structure: `features/`, `shared/`, `models/`
  - Create subfolders: `components/`, `viewmodels/`, `models/`, `types/`
  - Set up path aliases in tsconfig.json (@/, @shared/, @features/)
  - _Requirements: MVVM architecture pattern_

---

## Phase 2: Shared Utilities & Infrastructure Components

### 2. Form Validation Utilities

- [ ] 2.1 Implement form validation module
  - Create `shared/validation/index.ts`
  - Implement `validateAlias()` function with ALIAS_PATTERN regex
  - Implement `validateCardContent()` with length checks
  - Implement `validateBoardName()` with length validation
  - Implement `validateColumnName()` with constraints
  - Export constants (MAX_ALIAS_LENGTH, MAX_CARD_CONTENT_LENGTH, etc.)
  - _Requirements: Section 4.12 of design doc_

- [ ] 2.2 Write unit tests for validation utilities
  - Test valid inputs pass validation
  - Test empty/null inputs fail with correct error
  - Test length boundaries (min/max)
  - Test special character validation for alias
  - Test trimming behavior
  - _Requirements: Test plan Section 5_

### 3. ErrorBoundary Component

- [ ] 3.1 Implement ErrorBoundary component
  - Create `shared/components/ErrorBoundary.tsx`
  - Implement React error boundary lifecycle methods
  - Create ErrorFallback UI component
  - Add reset functionality
  - Implement onError callback for logging
  - _Requirements: Section 4.10 of design doc_

- [ ] 3.2 Write tests for ErrorBoundary
  - Test catches component errors
  - Test displays fallback UI
  - Test onError callback invoked
  - Test reset functionality
  - _Requirements: Test plan Section 11.1.1_

### 4. LoadingIndicator Components

- [ ] 4.1 Implement LoadingIndicator variants
  - Create `shared/components/LoadingIndicator.tsx`
  - Implement Skeleton variant (BoardSkeleton, HeaderSkeleton, ColumnSkeleton)
  - Implement Spinner variant (CircularProgress wrapper)
  - Implement LinearProgress variant
  - Add aria-busy and aria-live attributes
  - _Requirements: Section 4.11 of design doc_

- [ ] 4.2 Write tests for LoadingIndicator
  - Test all three variants render correctly
  - Test size prop variations
  - Test accessibility attributes
  - _Requirements: Test plan Section 11.1.2_

---

## Phase 3: Model Layer (API Services & State)

### 5. API Service Infrastructure

- [ ] 5.1 Create axios HTTP client configuration
  - Create `models/api/client.ts`
  - Configure base URL from environment variables
  - Set up request/response interceptors
  - Add cookie handling for session auth
  - Add error response parsing
  - _Requirements: Section 6.2 of design doc_

- [ ] 5.2 Implement BoardAPI service
  - Create `models/api/BoardAPI.ts`
  - Implement `getBoard(boardId)` - GET /boards/:id
  - Implement `createBoard(data)` - POST /boards
  - Implement `updateBoardName(boardId, name)` - PATCH /boards/:id/name
  - Implement `closeBoard(boardId)` - PATCH /boards/:id/close
  - Implement `addAdmin(boardId, userHash)` - POST /boards/:id/admins
  - Implement `joinBoard(boardId, alias)` - POST /boards/:id/join
  - Implement `updateAlias(boardId, alias)` - PATCH /boards/:id/users/alias
  - _Requirements: Section 6.2.1, Backend API spec_

- [ ] 5.3 Write unit tests for BoardAPI
  - Mock axios for all methods
  - Test correct HTTP method and URL
  - Test request payload structure
  - Test response data extraction
  - Test error handling (404, 403, 409)
  - _Requirements: Test plan Section 5.1_

- [ ] 5.4 Implement CardAPI service
  - Create `models/api/CardAPI.ts`
  - Implement `getCards(boardId, includeRelationships)` - GET /boards/:id/cards
  - Implement `checkCardQuota(boardId)` - GET /boards/:id/cards/quota
  - Implement `createCard(boardId, data)` - POST /boards/:id/cards
  - Implement `updateCard(cardId, content)` - PUT /cards/:id
  - Implement `deleteCard(cardId)` - DELETE /cards/:id
  - Implement `moveCard(cardId, columnId)` - PATCH /cards/:id/column
  - Implement `linkCards(sourceId, targetId, linkType)` - POST /cards/:id/link
  - Implement `unlinkCards(sourceId, targetId, linkType)` - DELETE /cards/:id/link
  - _Requirements: Section 6.2.2, Backend API spec_

- [ ] 5.5 Write unit tests for CardAPI
  - Test all CRUD operations
  - Test quota check API
  - Test link/unlink operations
  - Test embedded relationships parameter
  - _Requirements: Test plan Section 5.1_

- [ ] 5.6 Implement ReactionAPI service
  - Create `models/api/ReactionAPI.ts`
  - Implement `addReaction(cardId, type)` - POST /cards/:id/reactions
  - Implement `removeReaction(cardId)` - DELETE /cards/:id/reactions
  - Implement `checkQuota(boardId)` - GET /boards/:id/reactions/quota
  - _Requirements: Section 6.2.3_

- [ ] 5.7 Write unit tests for ReactionAPI
  - Test add/remove operations
  - Test quota check
  - Test error handling
  - _Requirements: Test plan Section 5.1_

### 6. WebSocket Service

- [ ] 6.1 Implement SocketService
  - Create `models/socket/SocketService.ts`
  - Implement `connect(boardId)` with socket.io-client
  - Implement `disconnect()` method
  - Implement `on(eventType, handler)` subscription
  - Implement `off(eventType)` unsubscription
  - Implement `emit(eventType, data)` for client events
  - Handle 'join-board' and 'leave-board' events
  - _Requirements: Section 6.3 of design doc_

- [ ] 6.2 Write tests for SocketService
  - Mock socket.io-client
  - Test connect establishes connection
  - Test event subscription
  - Test disconnect cleanup
  - _Requirements: Test plan Section 5.3_

### 7. Zustand State Stores

- [ ] 7.1 Implement boardStore
  - Create `models/stores/boardStore.ts`
  - Define Board state shape
  - Implement `setBoard(board)` action
  - Implement `updateBoardName(name)` action
  - Implement `closeBoard(closedAt)` action
  - Implement `addAdmin(userHash)` action
  - _Requirements: Section 6.1.1 of design doc_

- [ ] 7.2 Write tests for boardStore
  - Test initial state
  - Test setBoard updates state
  - Test updateBoardName mutation
  - Test closeBoard sets state to 'closed'
  - _Requirements: Test plan Section 5.2_

- [ ] 7.3 Implement cardStore
  - Create `models/stores/cardStore.ts`
  - Define Card state with Map<cardId, Card>
  - Implement `addCard(card)` action
  - Implement `updateCard(cardId, updates)` action
  - Implement `removeCard(cardId)` action
  - Implement `setCardsWithChildren(cards)` for API response
  - Implement `incrementReactionCount(cardId)` action
  - Implement `decrementReactionCount(cardId)` action
  - Create normalized indexes: cardsByBoard, cardsByColumn
  - _Requirements: Section 6.1.2_

- [ ] 7.4 Write tests for cardStore
  - Test addCard adds to map
  - Test setCardsWithChildren populates embedded children
  - Test incrementReactionCount updates count
  - Test removeCard deletes from map
  - _Requirements: Test plan Section 5.2_

- [ ] 7.5 Implement userStore
  - Create `models/stores/userStore.ts`
  - Define User state with currentUser and activeUsers
  - Implement `setCurrentUser(user)` action
  - Implement `updateAlias(newAlias)` action
  - Implement `addActiveUser(user)` action
  - Implement `removeUser(userHash)` action
  - Implement `updateHeartbeat(userHash)` action
  - _Requirements: Section 6.1.3_

- [ ] 7.6 Write tests for userStore
  - Test setCurrentUser updates state
  - Test updateAlias modifies currentUser
  - Test addActiveUser adds to array
  - Test heartbeat updates last_active_at
  - _Requirements: Test plan Section 5.2_

---

## Phase 4: ViewModel Layer (Business Logic Hooks)

### 8. useBoardViewModel

- [ ] 8.1 Implement useBoardViewModel hook
  - Create `features/board/viewmodels/useBoardViewModel.ts`
  - Implement board data loading on mount
  - Implement loading and error state management
  - Derive isAdmin from board.admins and currentUserHash
  - Derive isCreator from board.admins[0]
  - Derive isClosed from board.state
  - Implement `handleRenameBoard(newName)` function
  - Implement `handleCloseBoard()` function
  - Subscribe to 'board:renamed' and 'board:closed' socket events
  - _Requirements: Section 5.1 of design doc_

- [ ] 8.2 Write tests for useBoardViewModel
  - Test loads board data on mount
  - Test derives isAdmin correctly
  - Test derives isCreator correctly
  - Test handleRenameBoard calls API and updates store
  - Test handleCloseBoard sets closed state
  - Test error handling
  - _Requirements: Test plan Section 4.1_

### 9. useCardViewModel

- [ ] 9.1 Implement useCardViewModel hook (Part 1 - Data & Quota)
  - Create `features/card/viewmodels/useCardViewModel.ts`
  - Implement card loading with embedded children
  - Implement quota state (cardQuota, reactionQuota)
  - Implement `checkCardQuota()` function
  - Implement `checkReactionQuota()` function
  - Store cards in cardStore on fetch
  - _Requirements: Section 5.2 of design doc_

- [ ] 9.2 Implement useCardViewModel (Part 2 - CRUD Operations)
  - Implement `handleCreateCard(data)` with quota check
  - Implement `handleUpdateCard(cardId, content)` function
  - Implement `handleDeleteCard(cardId)` function
  - Implement `handleMoveCard(cardId, columnId)` function
  - Add optimistic updates with rollback on error
  - _Requirements: Section 5.2_

- [ ] 9.3 Implement useCardViewModel (Part 3 - Relationships)
  - Implement `handleLinkParentChild(parentId, childId)` function
  - Implement `handleUnlinkChild(childId)` function
  - Implement `handleLinkAction(actionId, feedbackId)` function
  - Implement circular relationship validation
  - Refresh cards after linking to get updated aggregation
  - _Requirements: Section 5.2_

- [ ] 9.4 Implement useCardViewModel (Part 4 - Sorting & Filtering)
  - Implement `applySortFilter(cards, sortMode, filters)` function
  - Implement sort by recency (created_at desc)
  - Implement sort by popularity (aggregated_reaction_count desc)
  - Implement filter by user (created_by_hash)
  - Implement filter by "All Users" (show all)
  - Implement filter by "Anonymous" (is_anonymous)
  - Implement multiple user filter (OR logic)
  - _Requirements: Section 5.2_

- [ ] 9.5 Write tests for useCardViewModel
  - Test fetches cards with embedded children
  - Test quota check blocks creation when at limit
  - Test create card success flow
  - Test link parent-child updates aggregation
  - Test unlink child decreases parent count
  - Test delete card orphans children
  - Test sorting by recency and popularity
  - Test filtering logic (all users, anonymous, specific users)
  - Test optimistic update rollback on error
  - _Requirements: Test plan Section 4.2_

### 10. useParticipantViewModel

- [ ] 10.1 Implement useParticipantViewModel hook
  - Create `features/participant/viewmodels/useParticipantViewModel.ts`
  - Implement active users fetching
  - Implement heartbeat timer (every 60 seconds)
  - Implement `handleUpdateAlias(newAlias)` function
  - Implement `handlePromoteToAdmin(userHash)` function (creator only)
  - Implement filter state management (showAll, showAnonymous, filteredUsers)
  - Implement `handleToggleAllUsersFilter()` function
  - Implement `handleToggleAnonymousFilter()` function
  - Implement `handleToggleUserFilter(userHash)` function
  - Subscribe to 'user:joined' and 'user:alias_changed' events
  - _Requirements: Section 5.3 of design doc_

- [ ] 10.2 Write tests for useParticipantViewModel
  - Test fetches active users on mount
  - Test handleUpdateAlias calls API and updates store
  - Test heartbeat sent every 60 seconds
  - Test promote user to admin (creator only)
  - Test filter toggle functions
  - Test real-time event handling
  - _Requirements: Test plan Section 4.3_

### 11. useDragDropViewModel

- [ ] 11.1 Implement useDragDropViewModel hook
  - Create `features/card/viewmodels/useDragDropViewModel.ts`
  - Implement drag state (isDragging, draggedItem)
  - Implement `handleCardDragStart(cardId, cardType)` function
  - Implement `handleCardDragOver(targetId, targetType)` validation
  - Implement `handleCardDrop(sourceId, targetId, targetType)` function
  - Implement circular relationship detection
  - Implement card type validation (feedback-feedback, action-feedback)
  - Implement `handleCardDragEnd()` cleanup
  - _Requirements: Section 5.4 of design doc_

- [ ] 11.2 Write tests for useDragDropViewModel
  - Test drag start sets dragged item
  - Test drop validates card types
  - Test prevents circular relationship
  - Test drop on card vs column differentiation
  - Test drag end clears state
  - _Requirements: Test plan Section 4.4_

---

## Phase 5: View Components (UI Layer)

### 12. RetroBoardPage Container

- [ ] 12.1 Implement RetroBoardPage component
  - Create `features/board/components/RetroBoardPage.tsx`
  - Use useBoardViewModel, useCardViewModel, useParticipantViewModel hooks
  - Implement loading state with LoadingIndicator (skeleton)
  - Implement error state display
  - Implement successful board layout
  - Compose Header, MyUserCard, ParticipantBar, SortBar, ColumnContainer
  - Handle closed board state (read-only mode)
  - _Requirements: Section 4.1 of design doc_

- [ ] 12.2 Write tests for RetroBoardPage
  - Mock all ViewModels
  - Test renders loading skeleton when isLoading true
  - Test renders error message when error exists
  - Test renders full board layout when loaded
  - Test closed board shows lock icon
  - _Requirements: Test plan Section 3.1_

### 13. RetroBoardHeader Component

- [ ] 13.1 Implement RetroBoardHeader component
  - Create `features/board/components/RetroBoardHeader.tsx`
  - Display board title with edit icon (admin only)
  - Implement edit title dialog with validation
  - Implement close board button (admin only) with confirmation
  - Display lock icon when board is closed
  - Use validateBoardName from validation utils
  - _Requirements: Section 4.2 of design doc_

- [ ] 13.2 Write tests for RetroBoardHeader
  - Test admin sees edit and close controls
  - Test non-admin does not see controls
  - Test closed board shows lock icon
  - Test edit title dialog opens and validates input
  - Test close board confirmation dialog
  - Test onEditTitle callback with new value
  - _Requirements: Test plan Section 3.2_

### 14. MyUserCard Component

- [ ] 14.1 Implement MyUserCard component
  - Create `features/user/components/MyUserCard.tsx`
  - Display UUID (truncated with tooltip for full value)
  - Display alias prominently
  - Implement edit alias button (appears on hover)
  - Implement edit alias dialog with validation
  - Use validateAlias from validation utils
  - Show validation errors inline
  - _Requirements: Section 4.3 of design doc_

- [ ] 14.2 Write tests for MyUserCard
  - Test displays UUID and alias
  - Test UUID tooltip shows full value
  - Test edit button appears on hover
  - Test edit dialog validates alias
  - Test invalid alias shows error
  - Test onUpdateAlias callback
  - _Requirements: Test plan Section 3.3_

### 15. ParticipantBar Component

- [ ] 15.1 Implement ParticipantBar component
  - Create `features/participant/components/ParticipantBar.tsx`
  - Render "All Users" special avatar (*)
  - Render "Anonymous" special avatar (ghost icon)
  - Render active user avatars with admin hat icon
  - Implement admin dropdown (creator only)
  - Handle avatar click for filter toggle
  - Highlight active filters
  - _Requirements: Section 4.4 of design doc_

- [ ] 15.2 Implement ParticipantAvatar sub-component
  - Create `features/participant/components/ParticipantAvatar.tsx`
  - Render avatar with alias initials or icon
  - Show admin hat icon (🎩) if user is admin
  - Show active filter indicator (ring/border)
  - Handle click event for filter toggle
  - Support special avatars (All Users, Anonymous)
  - _Requirements: Section 4.5_

- [ ] 15.3 Implement AdminDropdown component
  - Create `features/participant/components/AdminDropdown.tsx`
  - Show dropdown button (creator only)
  - Display list of active users in menu
  - Show checkmark for current admins
  - Handle click to promote user
  - _Requirements: Section 4.9_

- [ ] 15.4 Write tests for ParticipantBar
  - Test special avatars render
  - Test admin has hat icon
  - Test All Users filter active by default
  - Test click avatar toggles filter
  - Test admin dropdown visible for creator
  - Test promote user from dropdown
  - _Requirements: Test plan Section 3.4_

### 16. SortBar Component

- [ ] 16.1 Implement SortBar component
  - Create `features/board/components/SortBar.tsx`
  - Implement sort type dropdown (Recency, Popularity)
  - Implement sort direction toggle (Asc/Desc with arrow icon)
  - Handle sort mode change events
  - No filter chips (filters moved to avatars)
  - _Requirements: Section 4.6 of design doc_

- [ ] 16.2 Write tests for SortBar
  - Test sort dropdown renders options
  - Test direction toggle icon changes
  - Test onSortChange callback with mode
  - _Requirements: Test plan Section 3.6_

### 17. RetroColumn Component

- [ ] 17.1 Implement RetroColumn component
  - Create `features/card/components/RetroColumn.tsx`
  - Render column header with title and edit button (admin)
  - Render + button for adding cards
  - Implement drop zone with @dnd-kit
  - Highlight drop zone on drag-over
  - Implement add card dialog
  - Disable + button when quota reached (show tooltip)
  - Validate card content before creation
  - _Requirements: Section 4.7 of design doc_

- [ ] 17.2 Write tests for RetroColumn
  - Test renders column header
  - Test edit column name (admin only)
  - Test + button enabled when canCreateCard true
  - Test + button disabled with tooltip when quota reached
  - Test drag-over highlights drop zone
  - Test drop card triggers callback
  - _Requirements: Test plan Section 3.6_

### 18. RetroCard Component

- [ ] 18.1 Implement RetroCard component
  - Create `features/card/components/RetroCard.tsx`
  - Render card header with drag handle OR link icon
  - Show drag handle when no parent_card_id
  - Show link icon when card has parent_card_id
  - Implement reaction button with count badge
  - Implement delete button (owner only) with confirmation
  - Render card content text
  - Recursively render children cards with no gap
  - Support drag-and-drop with @dnd-kit
  - Show aggregated count for parent cards
  - _Requirements: Section 4.8 of design doc_

- [ ] 18.2 Write tests for RetroCard
  - Test standalone card has drag handle
  - Test linked card shows link icon (no drag handle)
  - Test click link icon calls onUnlinkFromParent
  - Test delete button only for owner
  - Test reaction button shows count
  - Test recursively renders children
  - Test no gap between parent and children
  - Test anonymous card shows no author
  - _Requirements: Test plan Section 3.5_

---

## Phase 6: Integration & Real-time Features

### 19. Real-time Event Handling

- [ ] 19.1 Implement real-time event subscriptions in ViewModels
  - In useBoardViewModel: subscribe to 'board:renamed', 'board:closed'
  - In useCardViewModel: subscribe to 'card:created', 'card:updated', 'card:deleted', 'card:moved', 'card:linked', 'reaction:added', 'reaction:removed'
  - In useParticipantViewModel: subscribe to 'user:joined', 'user:alias_changed'
  - Update stores on event reception
  - Handle event cleanup on unmount
  - _Requirements: Section 6.3, real-time architecture_

- [ ] 19.2 Write integration tests for real-time sync
  - Test card:created event updates all clients
  - Test reaction:added event updates counts
  - Test user:joined event updates active users
  - Test board:closed event disables write operations
  - _Requirements: Test plan Section 8.1_

### 20. Drag-and-Drop Integration

- [ ] 20.1 Integrate @dnd-kit with RetroCard and RetroColumn
  - Set up DndContext in RetroBoardPage
  - Configure sensors (PointerSensor)
  - Implement useDraggable in RetroCard
  - Implement useDroppable in RetroCard and RetroColumn
  - Handle onDragStart, onDragOver, onDragEnd events
  - Call useDragDropViewModel for validation
  - _Requirements: Section 5.4, drag-drop architecture_

- [ ] 20.2 Write integration tests for drag-and-drop
  - Test drag feedback card onto feedback card creates parent-child
  - Test drag action card onto feedback card creates link
  - Test drag card to column moves card
  - Test circular relationship prevention
  - _Requirements: Test plan Section 9.1_

---

## Phase 7: End-to-End Integration Testing

### 21. Integration Tests with MSW

- [ ] 21.1 Set up MSW for API mocking
  - Create `tests/mocks/handlers.ts`
  - Mock all BoardAPI endpoints
  - Mock all CardAPI endpoints
  - Mock all ReactionAPI endpoints
  - Return realistic test data
  - _Requirements: Test plan Section 6_

- [ ] 21.2 Write card creation integration test
  - Test full flow: quota check → dialog → create → card appears
  - Use real ViewModels (not mocked)
  - Verify API calls with MSW
  - _Requirements: Test plan Section 6.1_

- [ ] 21.3 Write parent-child linking integration test
  - Test drag child onto parent
  - Verify aggregation updates
  - Test unlink functionality
  - _Requirements: Test plan Section 6.2_

- [ ] 21.4 Write card quota enforcement integration test
  - Test quota check before creation
  - Test creation blocked at limit
  - Test action cards exempt from limit
  - _Requirements: Test plan Section 6.1_

- [ ] 21.5 Write reaction quota integration test
  - Test reaction quota check
  - Test reaction limit enforcement
  - Test board isolation (quota per board)
  - _Requirements: Test plan Section 6.2_

### 22. Playwright E2E Tests

- [ ] 22.1 Set up Playwright configuration
  - Create `playwright.config.ts`
  - Configure test directory and browsers
  - Set up webServer for dev mode
  - Create E2E test helpers (createBoard, joinBoard, createCard)
  - _Requirements: Test plan Section 7.2_

- [ ] 22.2 Write E2E: Complete retro session
  - Test 3 users join board
  - Test all users see each other in real-time
  - Test card creation from different users
  - Test real-time card sync
  - Test parent-child linking via drag-drop
  - Test reactions with real-time updates
  - Test board closure
  - _Requirements: Test plan Section 7.3_

- [ ] 22.3 Write E2E: Card quota enforcement
  - Test create 2 cards (limit=2)
  - Test 3rd card blocked with error
  - Test action card creation succeeds
  - Test delete card frees quota
  - _Requirements: Test plan Section 7.4_

- [ ] 22.4 Write E2E: Anonymous card privacy
  - Test anonymous card hides creator name
  - Test public card shows creator
  - Test user can delete own anonymous card
  - _Requirements: Test plan Section 7.5_

- [ ] 22.5 Write E2E: Drag-and-drop interactions
  - Test drag card to create parent-child (Playwright dragTo API)
  - Test link icon appears after linking
  - Test drag action card onto feedback card
  - Test verify no gap between parent and child
  - _Requirements: Test plan Section 9.2_

---

## Phase 8: Polish & Production Readiness

### 23. Error Handling & Edge Cases

- [ ] 23.1 Implement error handling in all ViewModels
  - Wrap API calls in try/catch
  - Set error state on failure
  - Show user-friendly error messages
  - Implement retry logic for transient errors
  - _Requirements: Error handling best practices_

- [ ] 23.2 Implement optimistic updates with rollback
  - Add card to UI immediately on create
  - Rollback if API fails
  - Show error notification
  - _Requirements: Test plan Section 8.2_

- [ ] 23.3 Test error scenarios
  - Test network errors (500, timeout)
  - Test validation errors (400)
  - Test authorization errors (403)
  - Test not found errors (404)
  - Test conflict errors (409 - board closed)
  - _Requirements: Comprehensive error coverage_

### 24. Performance Optimization

- [ ] 24.1 Implement React.memo for expensive components
  - Memoize RetroCard to prevent unnecessary re-renders
  - Memoize ParticipantAvatar
  - Use useMemo for sorted/filtered card arrays
  - Use useCallback for event handlers passed to children
  - _Requirements: Performance best practices_

- [ ] 24.2 Optimize WebSocket event handling
  - Debounce heartbeat events
  - Batch state updates from multiple events
  - Prevent duplicate subscriptions
  - _Requirements: Real-time performance_

### 25. Accessibility & UX Polish

- [ ] 25.1 Add ARIA labels for UX testing
  - Label all interactive elements (buttons, inputs)
  - Add role attributes where needed
  - Ensure focus management for dialogs
  - Add aria-busy for loading states
  - _Requirements: Test plan accessibility notes_

- [ ] 25.2 Implement keyboard shortcuts (basic)
  - Escape to close dialogs
  - Enter to submit forms
  - Tab navigation through interactive elements
  - _Requirements: UX polish_

### 26. CI/CD Integration

- [ ] 26.1 Create GitHub Actions workflow
  - Create `.github/workflows/test.yml`
  - Run unit tests on every commit
  - Run integration tests on pull requests
  - Run E2E tests on merge to main
  - Upload coverage reports
  - _Requirements: Test plan Section 10.1_

- [ ] 26.2 Set up pre-commit hooks
  - Install Husky
  - Run linter on pre-commit
  - Run unit tests on changed files
  - Run type check
  - _Requirements: Test plan Section 10.4_

---

## Phase 9: Documentation & Handoff

### 27. Code Documentation

- [ ] 27.1 Document all ViewModels with JSDoc
  - Document hook parameters and return types
  - Explain business logic in complex functions
  - Add usage examples in comments
  - _Requirements: Code maintainability_

- [ ] 27.2 Create component Storybook (optional)
  - Set up Storybook
  - Create stories for all View components
  - Document props and variations
  - _Requirements: Component documentation_

### 28. Developer Onboarding

- [ ] 28.1 Create README with setup instructions
  - Document npm commands
  - Explain project structure
  - Add environment variable configuration
  - Include troubleshooting guide
  - _Requirements: Developer experience_

- [ ] 28.2 Create CONTRIBUTING guide
  - Explain MVVM architecture
  - Document testing requirements
  - Provide PR checklist
  - _Requirements: Team collaboration_

---

## Task Completion Checklist Summary

**Infrastructure & Setup**: 4 tasks
**Shared Utilities**: 6 tasks
**Model Layer**: 16 tasks
**ViewModel Layer**: 16 tasks
**View Components**: 18 tasks
**Integration**: 10 tasks
**E2E Testing**: 5 tasks
**Polish**: 6 tasks
**Documentation**: 4 tasks

**Total**: ~85 discrete implementation tasks

**Estimated Timeline**:
- Phase 1-2 (Setup & Utilities): 3-5 days
- Phase 3 (Model Layer): 1-2 weeks
- Phase 4 (ViewModel Layer): 1-2 weeks
- Phase 5 (View Components): 2-3 weeks
- Phase 6-7 (Integration & E2E): 1-2 weeks
- Phase 8-9 (Polish & Docs): 3-5 days

**Total Estimated Time**: 6-9 weeks for full implementation with testing

---

## Related Documents

- [FRONTEND_COMPONENT_DESIGN_V2.md](./FRONTEND_COMPONENT_DESIGN_V2.md) - Component architecture and responsibilities
- [FRONTEND_TEST_PLAN.md](./FRONTEND_TEST_PLAN.md) - Testing strategy and coverage goals
- [BACKEND_API_SPECIFICATION_V2.md](./BACKEND_API_SPECIFICATION_V2.md) - API contracts for integration
- [HIGH_LEVEL_TECHNICAL_DESIGN.md](./HIGH_LEVEL_TECHNICAL_DESIGN.md) - System architecture overview
