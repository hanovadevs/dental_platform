# System Architecture

## 1. Architecture Style

Start with a **modular monolith**.

Reason:

- Faster to build
- Easier deployment
- Easier transactions
- Easier debugging
- Lower operational cost
- Sufficient for early and mid-scale clinics

Design boundaries so modules can be extracted later if needed.

---

# 2. High-Level Architecture

```text
                       ┌──────────────────────┐
                       │      Web / PWA       │
                       │ Next.js + TypeScript │
                       └──────────┬───────────┘
                                  │ HTTPS
                         ┌────────▼────────┐
                         │ Application API │
                         │ / Server Layer  │
                         └───┬─────────┬───┘
                             │         │
                 ┌───────────▼──┐   ┌──▼──────────────┐
                 │  PostgreSQL  │   │ Background Jobs │
                 │  Main Store  │   │ + Scheduler     │
                 └──────────────┘   └──┬──────────────┘
                                        │
                                  ┌─────▼─────┐
                                  │   Redis   │
                                  │ optional  │
                                  └───────────┘

          ┌────────────────────────────────────────────┐
          │ External Adapters                          │
          │ Email | SMS | WhatsApp | Storage | Future │
          │ AI Calls | Payments | Analytics           │
          └────────────────────────────────────────────┘
```

---

# 3. Application Layers

## Presentation

Responsible for:

- Pages
- Components
- Forms
- Navigation
- Loading states
- Error states

Not responsible for:

- Permission decisions
- Revenue rules
- Financial calculations
- Tenant isolation

## Application

Coordinates use cases.

Examples:

- Create appointment
- Present treatment plan
- Record payment
- Mark no-show
- Generate recall
- Resolve revenue opportunity

## Domain

Contains business rules.

Examples:

- Treatment recoverable value
- Appointment state transitions
- Balance calculation
- Revenue opportunity scoring
- Recall eligibility

## Infrastructure

Responsible for:

- PostgreSQL
- Object storage
- Email
- Queue
- SMS
- WhatsApp
- Logging

---

# 4. Multi-Tenancy

Use organization-based tenancy.

Primary hierarchy:

```text
Organization
  └── Locations
       └── Operational data
```

Users join organizations through memberships.

Data should generally include:

```text
organization_id
```

Location-specific data should additionally include:

```text
location_id
```

### Critical Rule

Every tenant-sensitive query must be scoped by the authenticated user's organization.

Do not rely only on UI filtering.

---

# 5. Authorization

Use:

- Role-based access control
- Permission checks
- Location access

Example permissions:

```text
patient.read
patient.write
appointment.read
appointment.write
clinical.read
clinical.write
billing.read
billing.write
reports.read
staff.manage
settings.manage
audit.read
```

Roles map to permissions.

Do not hard-code behavior such as:

```text
if role === "receptionist"
```

throughout the application.

---

# 6. Event Model

Use domain events inside the modular monolith.

Examples:

```text
patient.created
appointment.created
appointment.confirmed
appointment.cancelled
appointment.no_show
appointment.completed
treatment_plan.presented
treatment_plan.accepted
treatment.completed
invoice.created
invoice.overdue
payment.recorded
recall.due
lead.created
lead.lost
revenue_opportunity.created
revenue_opportunity.resolved
```

Events enable revenue logic without tightly coupling modules.

---

# 7. Background Processing

Use a queue for delayed or expensive work.

Required characteristics:

- Retry with backoff
- Idempotent handlers
- Dead-letter inspection
- Job metadata
- Tenant context
- Correlation ID

Examples:

- Reminder 24 hours before appointment
- Weekly recall scan
- Revenue opportunity rescore
- Large CSV import
- Export generation

---

# 8. Data Storage

## PostgreSQL

Use for:

- Users/memberships
- Patients
- Clinical state
- Appointments
- Treatments
- Billing
- Revenue opportunities
- Audit events
- Configuration

## Object Storage

Use for:

- X-rays
- Images
- Signed consent files
- Attachments
- Generated PDFs

Store metadata in PostgreSQL.

Never use public file URLs for patient files.

Use authorized signed access.

---

# 9. Caching

Caching is optional in early versions.

Safe uses:

- Treatment catalog
- Clinic configuration
- Public reference data

Be cautious with:

- Patient data
- Billing data
- Appointment data
- Revenue opportunities

Never allow a cache key to omit tenant context for sensitive data.

---

# 10. API Design

Use typed contracts.

Examples:

```text
POST /patients
GET  /patients/:id
POST /appointments
PATCH /appointments/:id/status
POST /treatment-plans
POST /payments
GET  /revenue/opportunities
```

If using server actions instead of public HTTP endpoints, maintain the same domain boundaries and validation discipline.

---

# 11. Provider Adapters

Define interfaces such as:

```ts
interface MessageProvider {
  send(input: MessageInput): Promise<MessageResult>;
}

interface FileStorage {
  put(input: PutFileInput): Promise<StoredFile>;
  getSignedUrl(input: FileAccessInput): Promise<string>;
}

interface PaymentProvider {
  createPaymentLink(input: PaymentLinkInput): Promise<PaymentLink>;
}

interface VoiceAgentProvider {
  enqueueCall(input: VoiceCallInput): Promise<VoiceCallJob>;
}
```

The future AI calling agent must use `VoiceAgentProvider`.

No vendor-specific call logic should leak into treatment or appointment modules.

---

# 12. Audit Architecture

Every sensitive mutation should record:

- organization
- location
- actor
- entity type
- entity ID
- action
- timestamp
- request/correlation ID
- changed fields where appropriate
- reason if required

Examples:

- Patient medical alert changed
- Treatment plan changed
- Payment reversed
- Appointment deleted/archived
- Permission changed
- File downloaded where required by policy

---

# 13. Reporting Architecture

Early reports can query transactional tables.

As scale grows:

- Add optimized aggregate tables
- Add daily metrics snapshots
- Add background rollups

Avoid premature data warehouse complexity.

---

# 14. Time Handling

Store timestamps in UTC.

Store clinic timezone separately.

Display in clinic/local user timezone.

Appointments should include clear location/timezone context.

Do not use browser timezone as the only source of truth.

---

# 15. Money Handling

Store:

- Currency code
- Integer minor units or exact decimal

Never use JavaScript floating-point arithmetic for financial totals.

---

# 16. Future Scalability

Potential later extractions:

- Communication service
- Revenue rule engine
- Report service
- File/media service
- Voice calling service

Do not extract until operational need exists.
