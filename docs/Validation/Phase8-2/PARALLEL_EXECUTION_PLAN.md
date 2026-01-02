# Parallel Execution Plan

**Quick Reference for 2-QA Team**

---

## Daily Schedule

### Day 1: Infrastructure + Model Layer Start

| Time | QA-1 | QA-2 | Sync Point |
|------|------|------|------------|
| 9:00 | INF-01: Backend Health | INF-03: CORS Config | |
| 9:30 | INF-02: Frontend Health | INF-04: WebSocket | |
| 10:00 | | | Sync: Infrastructure Complete? |
| 10:30 | MOD-A: BoardAPI (4 tests) | MOD-B: CardAPI (5 tests) | |
| 12:00 | Lunch | Lunch | |
| 13:00 | MOD-C: ReactionAPI (3 tests) | MOD-D: SocketService (4 tests) | |
| 15:00 | | | Sync: Model Layer Complete? |
| 15:30 | Document issues | Document issues | |
| 16:00 | | | Daily standup |

### Day 2: ViewModel + E2E Prep

| Time | QA-1 | QA-2 | Sync Point |
|------|------|------|------------|
| 9:00 | VM-B: CardViewModel | VM-A: BoardViewModel | |
| 10:30 | VM-C: ParticipantVM | VM-C: ParticipantVM (pair) | |
| 11:30 | | | Sync: ViewModel Complete? |
| 12:00 | Lunch | Lunch | |
| 13:00 | Setup E2E env | Setup E2E env | |
| 14:00 | E2E-01: Board Creation (debug) | E2E-02: Board Lifecycle (debug) | |
| 16:00 | | | Daily standup |

### Day 3: E2E Critical Path (P0)

| Time | QA-1 | QA-2 | Sync Point |
|------|------|------|------------|
| 9:00 | E2E-01: Board Creation (fix) | E2E-02: Board Lifecycle (fix) | |
| 12:00 | Lunch | Lunch | |
| 13:00 | E2E-01: Retest | E2E-02: Retest | |
| 15:00 | | | Sync: P0 Complete? |
| 15:30 | E2E-03: Retro Session (start) | E2E-04: Card Quota (start) | |
| 16:00 | | | Daily standup |

### Day 4: E2E Extended (P1/P2)

| Time | QA-1 | QA-2 | Sync Point |
|------|------|------|------------|
| 9:00 | E2E-03: Retro Session | E2E-04: Card Quota | |
| 10:30 | E2E-05: Sorting/Filtering | E2E-06: Parent-Child | |
| 12:00 | Lunch | Lunch | |
| 13:00 | E2E-07: Admin Operations | E2E-08: Tablet Viewport | |
| 14:30 | E2E-09: Drag-Drop | E2E-10: Accessibility | |
| 16:00 | | | Daily standup |

### Day 5: Fixes + Regression

| Time | QA-1 | QA-2 | Sync Point |
|------|------|------|------------|
| 9:00 | Fix top issues | Fix top issues | |
| 12:00 | Lunch | Lunch | |
| 13:00 | Full Regression Run | Full Regression Run | |
| 15:00 | | | Sync: Regression Complete? |
| 15:30 | Generate report | Document findings | |
| 16:00 | | | Final review |

---

## Dependency Graph

```
PHASE 1: Infrastructure (parallel)
┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐
│ INF-01   │  │ INF-02   │  │ INF-03   │  │ INF-04   │
│ Backend  │  │ Frontend │  │ CORS     │  │ WebSocket│
└────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘
     │             │             │             │
     └─────────────┴─────────────┴─────────────┘
                        │
                        ▼
PHASE 2: Model Layer (parallel groups)
┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐
│ MOD-A    │  │ MOD-B    │  │ MOD-C    │  │ MOD-D    │
│ BoardAPI │  │ CardAPI  │  │ Reaction │  │ Socket   │
│ QA-1     │  │ QA-2     │  │ QA-1     │  │ QA-2     │
└────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘
     │             │             │             │
     └─────────────┴─────────────┴─────────────┘
                        │
                        ▼
PHASE 3: ViewModel (parallel groups)
┌──────────┐  ┌──────────┐  ┌──────────┐
│ VM-A     │  │ VM-B     │  │ VM-C     │
│ BoardVM  │  │ CardVM   │  │ ParticVM │
│ QA-2     │  │ QA-1     │  │ Both     │
└────┬─────┘  └────┬─────┘  └────┬─────┘
     │             │             │
     └─────────────┴─────────────┘
                   │
                   ▼
PHASE 4: E2E Critical (2 parallel)
┌───────────────────┐  ┌───────────────────┐
│ E2E-01            │  │ E2E-02            │
│ Board Creation    │  │ Board Lifecycle   │
│ QA-1              │  │ QA-2              │
└─────────┬─────────┘  └─────────┬─────────┘
          │                      │
          └──────────┬───────────┘
                     │
                     ▼
PHASE 5: E2E Extended (3-4 parallel)
┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐
│ E2E-03  │ │ E2E-04  │ │ E2E-05  │ │ E2E-06  │
│ Retro   │ │ Quota   │ │ Sort    │ │ Parent  │
└────┬────┘ └────┬────┘ └────┬────┘ └────┬────┘
     │           │           │           │
     └───────────┴───────────┴───────────┘
                      │
                      ▼
┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐
│ E2E-07  │ │ E2E-08  │ │ E2E-09  │ │ E2E-10  │
│ Admin   │ │ Tablet  │ │ DnD     │ │ A11y    │
└────┬────┘ └────┬────┘ └────┬────┘ └────┬────┘
     │           │           │           │
     └───────────┴───────────┴───────────┘
                      │
                      ▼
PHASE 6: Regression (sequential)
┌─────────────────────────────────────────┐
│           Full Test Suite Run           │
│              (Both QAs)                 │
└─────────────────────────────────────────┘
```

---

## Communication Channels

| Channel | Purpose | Frequency |
|---------|---------|-----------|
| Slack/Teams | Quick questions, blockers | Instant |
| Daily Standup | Progress sync | 4:00 PM daily |
| Issue Tracker | Bug logging | As found |
| Shared Doc | Test results | Real-time |

---

## Escalation Path

```
Minor Issue (test fix needed)
     │
     ▼
Log in Issue Tracker → Continue Testing

Major Issue (blocks multiple tests)
     │
     ▼
Notify other QA → Escalate to Dev Lead

Blocker (environment down)
     │
     ▼
Stop Testing → Notify Everyone → Fix First
```

---

## Quick Commands Reference

```bash
# Start environment
docker-compose -f docker-compose.test.yml up -d
cd frontend && npm run dev

# Run single test (debug)
npx playwright test {spec-file} --headed --debug

# Run test suite
npx playwright test {spec-file}

# Run all tests
npm run test:e2e

# View report
npx playwright show-report

# Check backend health
curl http://localhost:3001/health

# View container logs
docker-compose -f docker-compose.test.yml logs -f backend
```

---

*Quick reference for parallel test execution*
