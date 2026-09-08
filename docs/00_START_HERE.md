# Dental Revenue OS — Start Here

> Working title: **Dental Revenue OS**
>
> This repository specification defines a cloud-first dental practice management and revenue recovery platform. The product must help dentists run daily clinic operations while continuously identifying and recovering missed revenue opportunities.

---

## 1. Product Intent

Dental Revenue OS is not a generic CRM and should not be implemented like one.

It is a **dental practice operating system** with two tightly connected layers:

1. **Clinic Operations Layer**
   - Appointments
   - Patients
   - Dental charting
   - Treatment plans
   - Billing
   - Documents
   - Inventory
   - Staff
   - Labs
   - Reports

2. **Revenue Engine Layer**
   - Unaccepted treatment recovery
   - Recall recovery
   - Cancellation and no-show recovery
   - Empty-chair filling
   - Lead recovery
   - Outstanding payment recovery
   - Inactive patient reactivation
   - Review/referral triggers

The software must make the clinic more organized **and** prove that it helps generate or recover revenue.

---

## 2. Core Product Principle

Every major workflow should answer:

> "What should the clinic do next, and what revenue may be gained or lost if nothing happens?"

This principle should influence:

- Dashboard cards
- Appointment handling
- Treatment-plan status
- Patient timelines
- Follow-up queues
- Revenue reports
- Notifications
- Staff task prioritization

---

## 3. Target Customers

### Initial Target

- Solo dentists
- Small dental clinics
- 2–10 dentist practices
- Clinics with one or more receptionists
- Clinics currently using spreadsheets, paper, WhatsApp, basic scheduling software, or fragmented tools

### Later Target

- Multi-location dental groups
- Specialist clinics
- Orthodontic practices
- Cosmetic dental clinics
- Implant-focused clinics
- Dental chains

---

## 4. Product Positioning

Avoid positioning the product as only:

> "Dental clinic management software"

Preferred positioning:

> **A dental operating system that helps clinics reduce revenue leakage and recover more value from the patients they already have.**

The product should be useful even if a clinic does not enable any future AI calling features.

---

## 5. Non-Negotiable Product Requirements

### The product must be:

- Cloud-first
- Multi-tenant from day one
- Responsive on desktop, tablet, and mobile
- Fast enough for reception use
- Easy to learn without training videos
- Capable of onboarding a clinic in one session
- Role-based
- Audit-friendly
- Built around clean, minimal workflows
- Safe for sensitive patient data
- Designed for future integrations without hard-coding external vendors

### The product must not:

- Become a generic ERP
- Become visually crowded
- Put every feature on the dashboard
- Use emojis in the product UI
- Depend on decorative icons
- Use unnecessary gradients
- Use excessive cards, dividers, borders, or badges
- Ask users for information that can be inferred from context
- Force a full-page refresh for ordinary navigation
- Mix multiple clinic tenants in any query, cache, job, or log

---

## 6. Initial Technology Direction

This is the recommended architecture unless there is a strong implementation reason to change it.

### Frontend

- Next.js
- TypeScript
- React
- Server Components where appropriate
- Client Components only where interaction requires them
- Tailwind CSS or an equivalent utility system
- Custom component system
- Framer Motion or a similarly lightweight motion layer for controlled transitions

### Backend

Prefer a modular monolith first.

- TypeScript backend
- Next.js server actions / route handlers or a dedicated Node API layer
- PostgreSQL
- Drizzle ORM or Prisma
- Redis only where it provides clear value
- Background job queue for reminders, imports, follow-ups, and scheduled revenue rules
- S3-compatible object storage for X-rays, documents, images, and consent files

### Authentication

- Provider-agnostic authentication abstraction
- Email/password or passwordless sign-in
- Optional MFA
- Session management
- Role and permission enforcement server-side

### Deployment

- Cloud deployment
- Managed PostgreSQL
- Managed object storage
- HTTPS only
- Centralized logging
- Error monitoring
- Environment-specific configuration

---

## 7. Repository Shape

Recommended shape:

```text
/
├── apps/
│   └── web/
│       ├── app/
│       ├── components/
│       ├── features/
│       ├── lib/
│       └── styles/
│
├── packages/
│   ├── db/
│   ├── ui/
│   ├── auth/
│   ├── domain/
│   ├── validation/
│   ├── analytics/
│   └── config/
│
├── workers/
│   └── revenue-jobs/
│
├── docs/
│   ├── 00_START_HERE.md
│   ├── 01_PRODUCT_SCOPE_AND_REQUIREMENTS.md
│   ├── 02_PHASES_AND_ROADMAP.md
│   ├── 03_IMPLEMENTATION_PLAN.md
│   ├── 04_SYSTEM_ARCHITECTURE.md
│   ├── 05_DATA_MODEL_AND_DOMAIN.md
│   ├── 06_UI_UX_DESIGN_SYSTEM.md
│   ├── 07_REVENUE_ENGINE.md
│   ├── 08_SECURITY_PRIVACY_AND_AUDIT.md
│   ├── 09_TESTING_AND_QA.md
│   └── 10_DEPLOYMENT_OBSERVABILITY_AND_OPERATIONS.md
│
└── README.md
```

---

## 8. Antigravity Execution Rules

Antigravity should:

1. Read all specification files before writing major implementation code.
2. Build one bounded module at a time.
3. Keep business logic outside presentational components.
4. Keep tenant filtering explicit.
5. Write tests with each feature.
6. Reuse design tokens and shared components.
7. Avoid adding libraries for minor conveniences.
8. Avoid placeholder dashboards with fake analytics unless the task explicitly requires fixtures.
9. Prefer complete workflows over broad but shallow feature coverage.
10. Keep future AI calling integrations behind an interface, but do not implement them in the first release.

---

## 9. First Build Order

The first implementation sequence should be:

1. Project foundation
2. Authentication
3. Organization / clinic onboarding
4. Staff roles
5. Patient records
6. Appointment calendar
7. Treatment catalog
8. Treatment plans
9. Billing
10. Revenue opportunity engine
11. Follow-up queue
12. Reports
13. Inventory and lab tracking
14. Documents and media
15. Notifications and integrations

Do not start with advanced dashboards before reliable transactional workflows exist.

---

## 10. Definition of the First Sellable Version

The first sellable release is ready when a clinic can:

- Create a clinic
- Invite staff
- Add or import patients
- Create appointments
- Check a patient in
- Record dental history
- Create a treatment plan
- Record treatment completion
- Generate an invoice
- Record payment
- View outstanding balances
- See overdue recalls
- See unaccepted treatments
- See cancellations/no-shows
- Create revenue follow-up tasks
- Track revenue recovered
- View clinic performance
- Upload patient documents and images
- Export critical reports

At that point the product is already commercially usable without an AI calling agent.

---

## 11. Naming Note

All project names, database names, route names, and example clinics in these documents are placeholders.

Do not tightly couple implementation to the working title "Dental Revenue OS."

Use a configurable product name and branding layer.
