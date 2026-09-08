# Implementation Plan

## 1. Engineering Method

Use a **vertical-slice implementation strategy**.

A vertical slice should include:

- Database schema
- Domain logic
- Authorization
- API/server action
- UI
- Validation
- Audit event
- Tests
- Loading state
- Empty state
- Error state

Do not create screens that are disconnected from reliable backend behavior.

---

# 2. Module Boundaries

Recommended domains:

```text
auth
organizations
locations
staff
patients
clinical
appointments
treatments
billing
communications
revenue
inventory
labs
documents
reports
audit
settings
```

Modules may share infrastructure but should not freely reach into each other's database internals.

Use service interfaces or domain functions for cross-module behavior.

---

# 3. Recommended Folder Strategy

Example:

```text
features/
  patients/
    components/
    server/
    schema/
    domain/
    tests/
    types.ts

  appointments/
    components/
    server/
    schema/
    domain/
    tests/

  revenue/
    components/
    server/
    rules/
    scoring/
    tests/
```

Avoid a giant global:

```text
components/
services/
utils/
```

that contains unrelated code.

---

# 4. Request Lifecycle

For every write operation:

1. Authenticate user
2. Resolve tenant membership
3. Verify permission
4. Validate input
5. Execute business rule
6. Write database transaction
7. Create audit event
8. Enqueue follow-up job if required
9. Return typed result
10. Update client state

Do not trust tenant IDs sent by the browser without server-side membership validation.

---

# 5. Validation Strategy

Use shared schemas for:

- Server input validation
- Form validation
- Import validation
- Webhook payload validation

Validation errors should be human readable.

Example:

Bad:

> invalid_string

Good:

> Enter a valid phone number or leave the field empty.

---

# 6. Database Transaction Rules

Use database transactions for workflows such as:

- Complete treatment + generate invoice item
- Record payment + update balance
- Cancel appointment + create revenue opportunity
- Accept treatment plan + create scheduled procedure
- Merge duplicate patient records

Do not create partial clinical or financial state.

---

# 7. Background Jobs

Use workers for:

- Reminder scheduling
- Recall generation
- Revenue opportunity generation
- Revenue opportunity rescoring
- Large imports
- Data exports
- Document generation
- Expiry checks
- Follow-up task creation

Each job must support:

- Idempotency
- Retry
- Failure logging
- Tenant context
- Correlation ID

---

# 8. Revenue Rule Execution

Revenue rules should be event-driven where possible.

Examples:

### Appointment cancelled

Event:

```text
appointment.cancelled
```

Handlers:

- Update schedule metrics
- Create ChairFill opportunity
- Update patient timeline
- Evaluate future follow-up
- Add audit entry

### Treatment plan presented

Event:

```text
treatment_plan.presented
```

Possible future evaluation:

- If unaccepted after configured delay, create treatment recovery opportunity

### Invoice becomes overdue

Event or scheduled evaluation:

```text
invoice.overdue
```

Action:

- Create payment recovery opportunity

Avoid deeply coupling rules to UI actions.

---

# 9. Frontend State Strategy

Prefer server state as the source of truth.

Use client state only for:

- Dialog state
- Selection
- Draft form state
- Local filters
- Optimistic interactions
- Temporary UI preferences

Avoid maintaining a second copy of patient or financial state in global client stores.

---

# 10. Navigation Strategy

Use persistent application shell.

Recommended desktop layout:

- Slim left rail
- Contextual secondary navigation when needed
- Main content canvas
- Optional right contextual inspector

Mobile:

- Compact top bar
- Bottom or sheet-based primary navigation
- Full-screen forms where appropriate

Navigation must preserve context.

Examples:

- Opening a patient from calendar should return to same calendar date
- Opening a treatment plan from patient should return to same patient tab
- Closing a drawer should not reset filters

---

# 11. Search

Global command/search should support:

- Patient
- Phone
- Appointment
- Invoice
- Treatment plan
- Staff

Keyboard shortcut:

```text
Ctrl/Cmd + K
```

The command interface should be text-first and minimally icon-based.

---

# 12. Import System

CSV patient import should include:

1. Upload
2. Column mapping
3. Preview
4. Validation
5. Duplicate detection
6. Import confirmation
7. Background processing
8. Result report

Never silently discard invalid rows.

---

# 13. Deletion Strategy

Prefer soft deletion / archival for:

- Patients
- Staff memberships
- Treatments
- Appointments
- Financial entities

Hard deletion should be limited to safe cases and admin-controlled workflows.

Clinical and financial history should not disappear due to ordinary delete actions.

---

# 14. Feature Flags

Use feature flags for:

- Experimental dashboard modules
- New revenue rules
- New communication providers
- AI calling integration
- Multi-location beta
- Advanced analytics

Feature flags should be tenant-aware where needed.

---

# 15. Error Handling

Distinguish:

- Validation error
- Permission error
- Conflict
- Not found
- Provider error
- Internal error

Never expose raw stack traces or database errors to users.

User-facing errors should include a retry or next action when possible.

---

# 16. Implementation Order Within Each Feature

For every feature:

1. Domain description
2. Schema
3. Migration
4. Repository/data access
5. Domain service
6. Authorization
7. API/server action
8. Tests
9. UI
10. Integration tests
11. Analytics
12. Audit

This prevents UI-first implementation from defining poor data models.

---

# 17. Code Quality Rules

- Strict TypeScript
- No `any` unless isolated and documented
- No duplicate business rules in frontend and backend
- No direct database calls from presentation components
- No magic strings for critical statuses
- No uncontrolled tenant filtering
- No giant 1000-line components
- No business logic hidden inside effects
- No time-zone-naive appointment calculations
- No floating-point money arithmetic

Use integer minor currency units or a decimal-safe database representation for money.

---

# 18. Performance Rules

- Paginate large lists
- Index patient phone/email/name
- Index appointment date/location/dentist
- Index treatment-plan status
- Index invoice due status
- Index revenue opportunities by clinic, type, status, priority
- Cache static configuration
- Do not cache sensitive cross-tenant data globally
- Avoid N+1 queries
- Use precomputed aggregates only when needed

---

# 19. Antigravity Completion Behavior

When implementing a phase, Antigravity should produce:

- Code
- Migrations
- Tests
- Short changelog
- Known limitations
- Manual test instructions

It should not claim a phase is complete if only the UI exists.
