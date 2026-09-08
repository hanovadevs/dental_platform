# Product Scope and Requirements

## 1. Product Definition

Dental Revenue OS is a multi-tenant dental practice management system with a built-in revenue recovery engine.

The product supports both:

- Daily clinical/administrative workflows
- Business performance and revenue optimization

The first version should be useful to a clinic even if the clinic does not use external automation tools.

---

## 2. Primary User Roles

### Owner

Needs:

- Clinic overview
- Revenue visibility
- Staff activity visibility
- Reports
- Locations
- Permissions
- Billing configuration
- Revenue opportunity reports
- Audit access

### Dentist

Needs:

- Daily schedule
- Patient clinical record
- Dental chart
- Treatment plans
- Notes
- Images
- Prescriptions
- Procedure completion
- Follow-up tasks

### Receptionist

Needs:

- Fast appointment creation
- Patient search
- Check-in
- Rescheduling
- Cancellations
- Payments
- Follow-up queues
- Recall queue
- Lead management
- Waiting list
- Confirmation tracking

### Assistant

Needs:

- Assigned appointments
- Patient preparation information
- Treatment workflow support
- Internal tasks
- Lab tracking
- Inventory visibility where permitted

### Finance / Accountant

Needs:

- Invoices
- Payments
- Outstanding balances
- Revenue reports
- Expense reports
- Export tools

---

# 3. Functional Modules

## 3.1 Dashboard

The dashboard must not be a wall of widgets.

It should show:

### Today

- Appointments
- Confirmed appointments
- Cancellations
- No-shows
- New patients
- Expected production
- Collected amount
- Outstanding amount

### Revenue Opportunities

- Unaccepted treatment value
- Overdue recall value
- Inactive patient opportunities
- Cancelled-slot value
- Outstanding balances
- Lost lead opportunities

### Action Queue

Show only high-priority actions.

Examples:

- 5 appointments require confirmation
- 3 high-value treatments need follow-up
- 1 chair slot opened tomorrow
- 12 patients are overdue for recall

---

## 3.2 Patient Management

Each patient must have one canonical profile.

### Required patient fields

- First name
- Last name
- Phone
- Email
- Date of birth
- Gender if collected by clinic
- Address if collected
- Emergency contact
- Preferred language
- Preferred communication method
- Medical alerts
- Allergies
- Current medications
- Notes
- Primary dentist
- Lead source
- Status
- Last appointment
- Next appointment
- Outstanding balance

### Patient profile tabs

- Overview
- Dental Chart
- Treatment Plans
- Appointments
- Clinical Notes
- Payments
- Documents
- Images
- Communications
- Timeline

---

## 3.3 Appointment Management

Appointments should support:

- Patient
- Dentist
- Location
- Chair
- Appointment type
- Treatment association
- Start time
- End time
- Estimated duration
- Status
- Confirmation status
- Notes
- Source
- Follow-up status

### Statuses

- Scheduled
- Confirmed
- Arrived
- Checked In
- In Treatment
- Completed
- Cancelled
- No Show
- Rescheduled

### Important behavior

When an appointment is cancelled or moved, the old appointment must remain visible in history.

Never destroy appointment history.

---

## 3.4 Chair and Resource Scheduling

Each clinic can define:

- Chairs
- Rooms
- Equipment
- Dentist availability
- Assistant availability

The calendar should support:

- Day view
- Multi-chair day view
- Week view
- Dentist filter
- Chair filter
- Location filter

Do not build a complex generic resource planner in V1.

---

## 3.5 Dental Chart

The chart should support adult and pediatric dentition.

Each tooth can hold:

- Current status
- Surface-level findings
- Existing treatment
- Proposed treatment
- Notes
- Images
- History

Example states:

- Healthy
- Caries
- Filling
- Crown
- Root canal treated
- Missing
- Implant
- Bridge abutment
- Extraction recommended
- Fracture
- Other

The chart must preserve history.

Never overwrite historical charting without an audit trail.

---

## 3.6 Treatment Catalog

A clinic can configure treatments.

Fields:

- Name
- Category
- Default duration
- Default price
- Tooth-specific
- Surface-specific
- Specialist category
- Tax behavior if applicable
- Active / inactive
- Revenue category

Examples:

- Consultation
- Scaling
- Filling
- Root canal
- Crown
- Extraction
- Implant
- Whitening
- Veneer
- Orthodontic visit

---

## 3.7 Treatment Plans

A treatment plan must support:

- Multiple procedures
- Multiple teeth
- Sequence
- Priority
- Estimated price
- Discount
- Accepted amount
- Declined procedures
- Deferred procedures
- Notes
- Expiry
- Approval state

Statuses:

- Draft
- Presented
- Partially Accepted
- Accepted
- Declined
- Deferred
- In Progress
- Completed

Every treatment plan should expose its:

- Proposed value
- Accepted value
- Completed value
- Remaining value
- Recoverable value

This is fundamental to the revenue engine.

---

## 3.8 Billing

Billing should support:

- Invoices
- Invoice items
- Discounts
- Deposits
- Partial payments
- Multiple payment methods
- Refunds
- Credit balance
- Outstanding balance
- Payment plan reference
- Receipt printing

Do not attempt to replace full accounting software.

---

## 3.9 Expenses

Allow clinics to enter operating expenses.

Categories:

- Rent
- Salaries
- Lab
- Materials
- Utilities
- Marketing
- Equipment
- Repairs
- Software
- Miscellaneous

The product may estimate operating profit, but should clearly label reports if they are not formal accounting statements.

---

## 3.10 Recall System

Recall rules are configurable by clinic.

Example:

- General recall: 6 months
- Cleaning: 6 months
- Orthodontic follow-up: 4 weeks
- Implant review: configurable
- Pediatric recall: configurable

Patient recall states:

- Upcoming
- Due
- Overdue
- Contacted
- Booked
- Snoozed
- Not Eligible

---

## 3.11 Lead Management

Track prospective patients.

Stages:

- New Lead
- Contact Attempted
- Contacted
- Consultation Booked
- Consultation Attended
- Treatment Proposed
- Converted
- Lost

Fields:

- Name
- Contact
- Source
- Interested service
- Estimated value
- Notes
- Assigned staff member
- Last contact
- Next action

---

## 3.12 Waiting List and ChairFill

Patients can opt into:

- Earlier appointment
- Specific day
- Specific dentist
- Specific time range

When a slot opens, ChairFill should rank suitable patients.

Ranking factors can include:

- Matching duration
- Patient availability
- Treatment readiness
- Distance from current date
- High-priority clinical need
- Previous request for earlier appointment
- Estimated production

Avoid fully automated booking in V1 unless the clinic explicitly enables it.

---

## 3.13 Communications

Communication records should support:

- SMS
- WhatsApp
- Email
- Phone call log
- Internal note

The core system must store communication events independent of provider.

This allows providers to be changed later.

---

## 3.14 Documents

Support:

- Consent forms
- Medical history forms
- Treatment-plan PDF
- Invoice PDF
- Prescription
- Uploaded external documents

Features:

- Template
- Version
- Signed status
- Signature timestamp
- Signer identity
- File hash where appropriate

---

## 3.15 Images and X-Ray Files

V1 should support:

- Upload
- Categorize
- Preview common file types
- Associate with tooth, appointment, or treatment
- Add note
- Compare before/after images

Do not build advanced diagnostic imaging tools in V1.

---

## 3.16 Inventory

Track:

- Item
- SKU
- Category
- Quantity
- Minimum quantity
- Unit
- Cost
- Supplier
- Expiry
- Batch number
- Location

Events:

- Stock in
- Stock used
- Stock adjusted
- Wasted
- Expired

---

## 3.17 Dental Lab Tracking

Track:

- Patient
- Tooth
- Work type
- Lab
- Sent date
- Expected date
- Received date
- Fitted date
- Cost
- Status
- Notes

Statuses:

- Prepared
- Sent
- In Production
- Received
- Fitted
- Rework
- Cancelled

---

# 4. Non-Functional Requirements

## Performance

Targets:

- Initial dashboard response under 2 seconds under normal conditions
- Patient search perceived response under 500 ms
- Calendar navigation should feel immediate
- Large patient imports should run asynchronously

## Reliability

- Transactional operations must not silently fail
- Background jobs must be retryable
- Duplicate jobs must be idempotent
- Failed jobs must be inspectable

## Accessibility

- Keyboard navigable
- Proper focus states
- WCAG-aware contrast
- Form labels
- Screen-reader compatible semantic structure

## Localization

Prepare for:

- Multiple currencies
- Multiple date formats
- Multiple time zones
- Multiple languages
- Country-specific settings

Do not hard-code PKR even if Pakistan is an early market.

---

# 5. Explicit V1 Exclusions

Do not implement in V1:

- AI diagnosis
- Automatic medical advice
- Autonomous treatment recommendations
- Full insurance claims clearinghouse
- Advanced DICOM viewer
- Device drivers for dental hardware
- Payroll
- Full accounting ledger
- Tax filing
- AI calling agent
- Marketing website builder
- Social media scheduler

The architecture should allow future integrations, but V1 must remain focused.
