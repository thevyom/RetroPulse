# Collaborative Retro Board - Product Documentation

## Project Overview
A web-based collaborative retrospective board platform that enables teams to conduct effective retrospectives and brainstorming sessions with real-time collaboration, flexible organization, and integrated action item tracking.

**Version**: 1.2
**Last Updated**: 2025-12-24
**Status**: Requirements Complete - Ready for Design Phase

---

## Documentation Index

### 📋 Product Requirements

1. **[PRD.md](PRD.md)** - Product Requirements Document
   - Complete functional and non-functional requirements
   - User workflows and acceptance criteria
   - Success metrics and prioritization (P0/P1/P2/P3)
   - **Start here** for complete product understanding

2. **[PRFAQ.md](PRFAQ.md)** - Press Release & FAQ
   - Customer-facing product vision
   - Value proposition and key features
   - Common questions answered
   - Use for stakeholder communication

### 🎨 Design Decisions

3. **[UX_DECISIONS_SUMMARY.md](UX_DECISIONS_SUMMARY.md)** - User Experience Decisions
   - All UX interaction patterns defined
   - Visual design questions for UI team
   - Rationale for each UX decision
   - Essential for design handoff

4. **[TECHNICAL_DESIGN_DECISIONS.md](TECHNICAL_DESIGN_DECISIONS.md)** - Backend & Architecture
   - Database schema and technology choices
   - Real-time synchronization architecture
   - Security and privacy implementation
   - Deployment and scaling strategy
   - Essential for engineering team

### 📝 Change History

5. **[PRD_CHANGES_SUMMARY.md](PRD_CHANGES_SUMMARY.md)** - Version 1.1 Changes
   - Summary of all updates from initial draft
   - New requirements added
   - Features clarified and prioritized

---

## Quick Start Guide

### For Product Managers
1. Read [PRFAQ.md](PRFAQ.md) for product vision
2. Review [PRD.md](PRD.md) Section 1-5 for functional requirements
3. Check [PRD.md](PRD.md) Prioritization section for roadmap

### For Designers
1. Read [UX_DECISIONS_SUMMARY.md](UX_DECISIONS_SUMMARY.md) completely
2. Review [PRD.md](PRD.md) User Workflows section
3. Note open design questions at end of UX document
4. Create wireframes and mockups based on interaction patterns

### For Engineers
1. Read [TECHNICAL_DESIGN_DECISIONS.md](TECHNICAL_DESIGN_DECISIONS.md) completely
2. Review [PRD.md](PRD.md) Non-Functional Requirements (NFRs)
3. Review data model schema in technical doc
4. Set up architecture review meeting for open items

### For Stakeholders
1. Read [PRFAQ.md](PRFAQ.md) for product overview
2. Review [PRD.md](PRD.md) Success Criteria section
3. Check [PRD.md](PRD.md) Prioritization for release planning

---

## Key Features Summary

### MVP (P0 - Must Have)
- ✅ Web-based real-time collaboration
- ✅ Customizable board columns
- ✅ Board and column renaming by admins
- ✅ Anonymous or attributed feedback cards
- ✅ Thumbs up reactions with attribution
- ✅ Parent-child card relationships (drag to link)
- ✅ Reaction aggregation for parent cards
- ✅ Unlinking child cards (any user can unlink)
- ✅ Sort-based card organization (no manual reordering)
- ✅ Action items linked to feedback
- ✅ Board admin and co-admin roles
- ✅ Board closure to read-only state
- ✅ Configurable card/reaction limits per user
- ✅ Cookie-based user sessions

### Post-MVP (P1)
- Enhanced parent-child relationship visualization
- Responsive tablet design
- Improved sorting algorithms

### Next Phase (P2)
- Advanced column management (add, remove, reorder)
- Multiple reaction types
- Board cloning
- Action item export (CSV/JSON)
- Many-to-many action-feedback links
- SWOT quadrant layouts
- Board templates
- Card commenting

### Future (P3)
- Board reopen (24-hour window)
- Per-column limits
- System admin archival
- Full board export (PDF/CSV)
- SSO integration
- Mobile native apps
- Analytics and reporting
- External tool integrations

---

## Key Design Decisions

### User Experience
- **Parent-Child Relationships**: Drag one card onto another to create parent-child link; child can have only one parent
- **Unlinking**: Any user can unlink child cards via unlink button
- **Card Organization**: Cards arrange ONLY by sorting (no manual reordering); drag used for linking and column movement only
- **Reaction Aggregation**: Parent cards show own + children's reactions; used for sorting
- **Linking**: Drag action item onto feedback card to link
- **Admin Selection**: Choose from active user list at top of board
- **Board Closure**: Banner notification, read-only state
- **Sorting**: User-specific, not persisted, parents sort by aggregated count
- **Columns**: Board and column names can be renamed by admins; advanced column management in P2

### Technical
- **Database**: PostgreSQL with parent-child self-referencing foreign keys
- **Real-time**: WebSocket via Socket.IO
- **Identity**: Cookie-based sessions with SHA-256 hashing
- **Privacy**: Anonymous cards fully protected
- **Parent-Child Model**: Self-referencing foreign key in cards table (parent_card_id)
- **Reaction Counts**: Two fields - direct_reaction_count and aggregated_reaction_count
- **Limits**: Board-wide (not per-column) for MVP
- **Conflicts**: Last-write-wins strategy
- **Deployment**: Heroku MVP → AWS at scale

---

## Success Criteria

The MVP is considered successful when:
1. ✅ Users can create and share retro boards with customizable columns
2. ✅ Admins can rename board and column names
3. ✅ Users create alias and join via shareable links
4. ✅ Users contribute cards anonymously or with attribution
5. ✅ Users react, modify, and remove reactions with attribution
6. ✅ Users create parent-child card relationships via drag-and-drop
7. ✅ Parent cards display aggregated reaction counts
8. ✅ Any user can unlink child cards from parents
9. ✅ Parent-child relationships work across columns
10. ✅ Users sort by popularity (aggregated for parents) or recency
11. ✅ Cards arrange by sorting only (no manual reordering)
12. ✅ Users create action items linked to feedback
13. ✅ Admins designate co-admins and close boards
14. ✅ Data persists across sessions and refreshes
15. ✅ 20+ users collaborate simultaneously with real-time updates
16. ✅ Concurrent editing prevented without data loss
17. ✅ Board performs well with 100+ cards
18. ✅ System enforces configured limits per user

---

## Technical Specifications

### Performance Targets
- **Load Time**: < 3 seconds on standard broadband
- **Real-time Updates**: < 1 second latency
- **Concurrent Users**: 50 per board minimum
- **Card Capacity**: 100 cards minimum, 500 cards maximum
- **Drag Responsiveness**: Minimal lag

### Browser Support
- Chrome (latest 2 versions)
- Firefox (latest 2 versions)
- Safari (latest 2 versions)
- Edge (latest 2 versions)

### Security Requirements
- HTTPS only
- HttpOnly cookies with SameSite=Lax
- Anonymous card privacy protected
- Input validation and XSS prevention
- SQL injection prevention via parameterized queries

---

## Next Steps

### Immediate Actions Required

1. **Architecture Review Meeting**
   - Finalize cloud provider choice (AWS vs Heroku)
   - Approve database schema
   - Confirm technology stack
   - Review open items in technical doc

2. **Design Phase**
   - Create wireframes for all workflows
   - Define visual design system (colors, typography, spacing)
   - Design card grouping visual treatment
   - Design action item hyperlink appearance
   - Design banner for closed boards
   - Create interactive prototype

3. **Project Setup**
   - Set up development environment
   - Initialize Git repository
   - Set up CI/CD pipeline
   - Configure monitoring tools (Sentry, etc.)
   - Set up staging environment

4. **Development Planning**
   - Break down into engineering sprints
   - Estimate story points
   - Assign to engineering team
   - Set up project tracking (Jira, Linear, etc.)

### Proposed Timeline (To Be Validated)

| Phase | Duration | Deliverables |
|-------|----------|-------------|
| Design | 2-3 weeks | Wireframes, mockups, prototype |
| Backend Setup | 1 week | Database, API scaffolding, auth |
| Frontend Setup | 1 week | UI framework, component library |
| Core Features | 4-6 weeks | Board creation, cards, reactions |
| Real-time Sync | 2 weeks | WebSocket implementation |
| Polish & Testing | 2 weeks | Bug fixes, performance optimization |
| **Total** | **10-15 weeks** | **MVP Launch** |

---

## Questions or Feedback?

### Product Questions
Contact: Product Manager (to be assigned)

### Technical Questions
Contact: Engineering Lead (to be assigned)

### Design Questions
Contact: Design Lead (to be assigned)

---

## Document Maintenance

This documentation set should be updated:
- After architecture review decisions
- When design is finalized
- When technical specifications change
- At each major milestone
- Before each release

**Last Review**: 2025-12-24
**Next Review**: After architecture review meeting
**Owner**: Product Manager
