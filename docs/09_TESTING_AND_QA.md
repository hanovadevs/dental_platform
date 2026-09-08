# Testing and QA

## 1. Testing Philosophy

Test the workflows that can:

- Expose patient data
- Lose clinical history
- Double-book chairs
- Miscalculate money
- Misattribute revenue
- Cross tenant boundaries
- Send incorrect communications

Do not chase arbitrary test coverage percentages while ignoring business risk.

---

# 2. Test Layers

## Unit Tests

Use for:

- Revenue calculations
- Appointment state transitions
- Treatment plan totals
- Balance calculations
- Recall eligibility
- Opportunity scoring
- Permission mapping

## Integration Tests

Use for:

- Database transactions
- Tenant filtering
- API/server actions
- Event handlers
- Background jobs
- Import validation

## End-to-End Tests

Use for complete workflows.

---

# 3. Critical E2E Scenarios

## Scenario A — New Patient to Payment

1. Create patient
2. Create appointment
3. Check in
4. Add clinical note
5. Create treatment plan
6. Accept one item
7. Complete treatment
8. Generate invoice
9. Record partial payment
10. Verify balance
11. Verify timeline

---

## Scenario B — Unaccepted Treatment Revenue

1. Create treatment plan
2. Present plan
3. Leave item unaccepted
4. Advance evaluation date
5. Run revenue rule
6. Verify opportunity
7. Follow up
8. Accept treatment
9. Complete procedure
10. Verify revenue attribution

---

## Scenario C — Cancellation and ChairFill

1. Create appointment
2. Cancel appointment
3. Verify appointment history preserved
4. Verify open chair slot
5. Create ChairFill opportunity
6. Match waiting-list patient
7. Book replacement
8. Verify no double counting

---

## Scenario D — Recall

1. Complete recall-qualifying treatment
2. Generate future recall
3. Advance date
4. Verify due
5. Advance further
6. Verify overdue
7. Book appointment
8. Verify recall closed/booked

---

## Scenario E — Cross-Tenant Attack

1. Create Clinic A
2. Create Clinic B
3. Create patient in B
4. Authenticate as A
5. Attempt direct URL access
6. Attempt API access
7. Attempt file access
8. Attempt search access
9. Verify all fail

This is a release-blocking test.

---

# 4. Financial Tests

Test:

- Discounts
- Partial payment
- Multiple payments
- Refund
- Reversal
- Overpayment
- Credit
- Zero balance
- Currency
- Rounding
- Treatment plan totals

Use exact money representations.

---

# 5. Appointment Tests

Test:

- Time zones
- Daylight-saving behavior where applicable
- Overlap prevention
- Dentist conflict
- Chair conflict
- Rescheduling
- Cancellation
- No-show
- Multi-location behavior
- Long appointments
- Date boundaries

---

# 6. Permission Matrix Tests

For each role, verify allowed and denied actions.

Example matrix:

| Action | Owner | Dentist | Reception | Assistant | Finance |
|---|---|---|---|---|---|
| View patient | Yes | Yes | Yes | Limited | Limited |
| Edit clinical chart | Configurable | Yes | No | Limited | No |
| Record payment | Yes | Configurable | Yes | No | Yes |
| Manage staff | Yes | No | No | No | No |
| View reports | Yes | Configurable | Limited | No | Yes |

Actual permissions should remain configurable through role definitions.

---

# 7. Import Testing

Test CSV:

- Missing required columns
- Wrong date format
- Duplicate patients
- Duplicate phone
- Empty row
- Large file
- Unicode names
- Malformed CSV
- Mixed currencies
- Invalid email
- Invalid date

Never partially import without a clear report.

---

# 8. File Upload Testing

Test:

- Allowed image
- Allowed PDF
- Oversized file
- Wrong MIME
- Script disguised as image
- Unauthorized file access
- Deleted/archived patient
- Signed URL expiry

---

# 9. Background Job Testing

Test:

- Retry
- Duplicate delivery
- Idempotency
- Provider timeout
- Worker crash
- Job resumed
- Wrong tenant context blocked

---

# 10. UI Testing

Check:

- Keyboard navigation
- Focus management
- Mobile layout
- Tablet layout
- 125%/150% zoom
- Empty states
- Long names
- Long clinic names
- Large monetary values
- Slow network
- Failed request
- Double click
- Accidental duplicate submission

---

# 11. UX Acceptance Tests

A receptionist should be able to:

- Find patient under 5 seconds
- Create simple appointment quickly
- Reschedule without opening many pages
- See if patient owes money
- See if patient has pending treatment

A dentist should be able to:

- Open today's schedule
- Open patient record
- Add chart condition
- Create treatment plan
- Review patient history

An owner should be able to:

- Understand today's clinic status
- See recoverable revenue
- See collected revenue
- See high priority actions

---

# 12. Performance Tests

Test with realistic scale.

Example tenant:

- 50,000 patients
- 500,000 appointments
- 100,000 invoices
- 100,000 treatment items
- 50,000 revenue opportunities

Critical queries must remain responsive.

---

# 13. Regression Suite

Release-blocking regression:

- Authentication
- Tenant isolation
- Patient creation
- Appointment creation
- Treatment plan
- Invoice
- Payment
- Revenue opportunity
- Export permission
- File access

---

# 14. Bug Severity

## P0

- Cross-tenant data exposure
- Financial corruption
- Clinical data loss
- Authentication bypass

## P1

- Cannot create appointment
- Cannot access patient
- Incorrect balance
- Broken treatment plan
- Revenue duplicate causing major reporting error

## P2

- Significant UX failure with workaround

## P3

- Cosmetic or minor usability issue

No release with open P0 or P1 defects.

---

# 15. QA Output Per Phase

For each phase produce:

- Automated test summary
- Manual test checklist
- Known limitations
- Regression impact
- Screenshots for major UI states if practical
- Security considerations
