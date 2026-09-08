# Phases and Roadmap

## Objective

Build a stable sellable product by completing full workflows in sequence.

Do not build twenty half-finished modules in parallel.

---

# Phase 0 — Product Foundation

## Goal

Create the technical foundation and the product's shared patterns.

### Deliverables

- Monorepo or clean modular repository
- TypeScript strict mode
- Linting
- Formatting
- Environment validation
- Database setup
- Migration system
- Seed system
- Authentication abstraction
- Organization model
- Location model
- User membership model
- Role / permission model
- Audit log foundation
- Error handling
- Logging
- Shared UI primitives
- Design tokens
- Test harness
- CI pipeline

### Exit Criteria

- User can sign in
- User can create a clinic
- User can create a location
- Permissions work server-side
- Tenant isolation test passes
- Base UI shell is responsive

---

# Phase 1 — Clinic Onboarding and Staff

## Goal

Allow a clinic to become operational quickly.

### Deliverables

Onboarding wizard:

1. Clinic identity
2. Location
3. Currency / timezone
4. Working hours
5. Add dentists
6. Add staff
7. Add chairs
8. Select treatment templates
9. Import patients
10. Finish

Staff management:

- Invite
- Activate
- Deactivate
- Assign role
- Assign location
- Set dentist profile
- Configure availability

### Exit Criteria

A new clinic can be created and configured without developer intervention.

---

# Phase 2 — Patients and Dental Records

## Goal

Create the clinical information foundation.

### Deliverables

- Patient list
- Fast search
- Add patient
- Edit patient
- Patient profile
- Medical alerts
- Allergies
- Clinical notes
- Dental chart
- Tooth history
- File upload
- Images
- Patient timeline

### Exit Criteria

A dentist can open a patient and understand their relevant history quickly.

---

# Phase 3 — Scheduling

## Goal

Make reception workflows fast enough for daily use.

### Deliverables

- Day calendar
- Week calendar
- Multi-chair calendar
- Dentist filter
- Chair filter
- Appointment creation
- Drag to reschedule
- Status workflow
- Confirmation status
- Cancellation reason
- No-show tracking
- Waiting list
- Check-in workflow

### Exit Criteria

A clinic can run one full day without a separate calendar tool.

---

# Phase 4 — Treatments and Billing

## Goal

Connect clinical work to revenue.

### Deliverables

- Treatment catalog
- Treatment plan builder
- Treatment plan status workflow
- Treatment acceptance tracking
- Procedure completion
- Invoice generation
- Partial payments
- Receipts
- Outstanding balance
- Patient financial summary

### Exit Criteria

A patient can move from consultation to treatment to payment entirely inside the product.

---

# Phase 5 — Revenue Engine V1

## Goal

Start identifying recoverable revenue.

### Revenue Opportunity Types

1. Unaccepted treatment
2. Overdue recall
3. Cancelled appointment
4. No-show
5. Outstanding balance
6. Inactive patient
7. Lost lead
8. Empty chair slot

### Deliverables

- Revenue opportunity table
- Opportunity scoring
- Estimated value
- Assigned owner
- Next-action date
- Resolution status
- Follow-up task creation
- Revenue recovered attribution
- Revenue dashboard

### Exit Criteria

The owner can see:

- Total recoverable revenue
- Opportunities by category
- Opportunities converted
- Revenue recovered

---

# Phase 6 — Communication Automation

## Goal

Reduce manual follow-up without building the AI calling agent yet.

### Deliverables

- Communication provider abstraction
- Email integration
- SMS integration
- WhatsApp integration where available
- Templates
- Reminder rules
- Confirmation links
- Recall messages
- Payment reminders
- Treatment follow-up messages
- Communication logs
- Opt-out tracking

### Exit Criteria

Clinics can run reliable automated messaging campaigns from revenue opportunities.

---

# Phase 7 — Inventory, Lab, Documents, Prescriptions

## Goal

Complete common clinic workflows.

### Deliverables

Inventory:

- Stock levels
- Minimum stock
- Expiry
- Supplier
- Adjustments

Lab:

- Case tracking
- Due date
- Cost
- Rework status

Documents:

- Consent templates
- PDF generation
- Signatures
- Signed document storage

Prescriptions:

- Clinic-defined medication templates
- Prescription generation
- Print / PDF

### Exit Criteria

The clinic no longer needs separate spreadsheets for these common workflows.

---

# Phase 8 — Analytics and Multi-Location

## Goal

Make the product suitable for larger practices.

### Deliverables

- Dentist performance
- Location performance
- Production vs collection
- Treatment acceptance rate
- No-show rate
- Recall recovery
- Lead conversion
- Revenue recovered
- Comparative periods
- Multi-location access
- Location-specific permissions

### Exit Criteria

An owner can manage more than one location without combining patient data incorrectly.

---

# Phase 9 — Hardening for Commercial Release

## Goal

Prepare for paid deployment.

### Deliverables

- Security review
- Permission review
- Backup restore drill
- Performance testing
- Accessibility review
- Import validation
- Audit trail review
- Error monitoring
- Subscription plan support
- Feature flags
- Rate limits
- Terms/privacy configuration hooks
- Data export
- Account deletion workflow where applicable
- Support tooling

### Exit Criteria

No unresolved P0 or P1 defects.

---

# Phase 10 — Future AI Calling Agent

Do not implement during the main first build.

Prepare interfaces for:

- Call task creation
- Patient contact intent
- Script context
- Consent status
- Call outcome
- Appointment booking outcome
- Escalation to human
- Transcript reference
- Revenue attribution

The AI agent must be a downstream executor of clinic-approved workflows, not an unrestricted clinical decision-maker.

---

# Release Strategy

## Internal Alpha

Use synthetic data.

Focus on:

- Data integrity
- Workflow completeness
- UX speed

## Pilot

Use 1–3 cooperative clinics.

Focus on:

- Real receptionist workflow
- Import quality
- Treatment-plan behavior
- Follow-up behavior
- Reporting accuracy

## Early Access

Use a limited number of paying clinics.

Focus on:

- Reliability
- Onboarding
- Support load
- Metrics

## General Availability

Only after:

- Tenant isolation is verified
- Restore process is tested
- Audit logs are reliable
- Core workflows are stable
- Revenue metrics are explainable
