# UI/UX Design System

## 1. Design Direction

The interface must feel:

- Minimal
- Premium
- Calm
- Clinical without looking sterile
- Modern
- Precise
- Spacious
- Fast
- Intentionally designed

The visual direction is:

> **Light-theme premium liquid glass with restrained transparency, soft depth, strong typography, and extremely clear navigation.**

The interface must not look like:

- A generic admin dashboard
- A copied SaaS template
- A crypto dashboard
- A neon glassmorphism demo
- A page full of cards
- A mobile app enlarged for desktop
- A traditional hospital ERP

---

# 2. Non-Negotiable UI Rules

- No emojis
- Very minimal icon usage
- No decorative icons
- No icon inside every button
- No excessive gradients
- No dark-heavy surfaces
- No thick borders
- No random shadow stacks
- No unnecessary separators
- No cluttered KPI walls
- No oversized pills everywhere
- No excessive rounded cards
- No dashboard made of identical rectangles

Icons should be used only when they improve recognition.

Examples where icons are justified:

- Search
- Calendar navigation
- Close
- Upload
- More actions
- Expand/collapse
- Back
- Settings

Text labels should carry most navigation.

---

# 3. Visual Philosophy

Liquid glass should be used as a material, not as decoration.

Good use:

- Navigation rail
- Floating action surface
- Context panel
- Modal
- Compact toolbar
- Search palette

Avoid putting every content section inside translucent glass.

Main reading areas should remain highly legible with near-solid light surfaces.

---

# 4. Color System

Use a neutral clinical foundation.

Suggested structure:

```text
Canvas:          near-white
Surface:         white
Raised Surface:  translucent white
Primary Text:    near-black
Secondary Text:  neutral gray
Muted Text:      lighter gray
Accent:          one restrained brand color
Success:         muted green
Warning:         muted amber
Danger:          muted red
Info:            restrained blue
```

The product accent should be configurable later.

Avoid multi-color dashboards.

Revenue categories may use subtle semantic differences, but text and labels should remain readable without depending on color alone.

---

# 5. Glass Material

Example material behavior:

```css
background: rgba(255, 255, 255, 0.72);
backdrop-filter: blur(20px) saturate(140%);
border: 1px solid rgba(255, 255, 255, 0.7);
box-shadow:
  0 1px 2px rgba(0,0,0,0.04),
  0 12px 36px rgba(0,0,0,0.06);
```

These are directional values, not rigid requirements.

Keep:

- Blur subtle
- Shadow soft
- Border barely visible
- Transparency controlled

Never reduce text contrast just to achieve glass styling.

---

# 6. Corner Radius

Use a coherent radius scale.

Example:

```text
Small controls: 10px
Inputs:         12px
Cards:          16px
Floating glass: 18–22px
Modal:          22px
```

Do not make everything 24–32px rounded.

---

# 7. Typography

Typography should create most of the hierarchy.

Use a clean modern sans-serif.

Possible choices:

- Inter
- Geist
- SF-like system stack
- Another highly legible professional typeface

Hierarchy:

```text
Page title      28–32 / semibold
Section title   18–22 / semibold
Card title      15–17 / medium
Body            14–16 / regular
Meta            12–13 / medium
Table           13–14
```

Avoid giant marketing-style headings inside the application.

---

# 8. Spacing

Use spacious composition.

Recommended baseline:

```text
4
8
12
16
20
24
32
40
48
64
```

Content should breathe without wasting screen area.

Reception-heavy pages may be denser than owner dashboards.

---

# 9. Application Shell

## Desktop

Recommended layout:

```text
┌────────────────────────────────────────────────────────────┐
│                    Top contextual region                   │
├─────────────┬──────────────────────────────────────────────┤
│ Slim        │                                              │
│ navigation  │               Main workspace                 │
│ rail        │                                              │
│             │                                              │
└─────────────┴──────────────────────────────────────────────┘
```

Primary navigation labels:

- Home
- Calendar
- Patients
- Treatments
- Revenue
- Billing
- Operations
- Reports

Secondary features should appear contextually.

Do not place 15 permanent navigation items in the rail.

---

# 10. Unique Navigation Model

Use three navigation layers:

## Layer 1 — Global

Primary clinic areas.

## Layer 2 — Contextual

Changes based on current area.

Example inside Patients:

- All Patients
- Recall
- Inactive
- New Patients

Example inside Revenue:

- Opportunities
- Treatment Recovery
- Recall Recovery
- ChairFill
- Leads
- Payments

## Layer 3 — Object Context

When inside a patient:

- Overview
- Chart
- Treatment
- Appointments
- Billing
- Files
- Timeline

This creates depth without filling the screen with global navigation.

---

# 11. Smooth Navigation Behavior

Navigation should feel immediate.

Use:

- Route prefetch
- Skeletons only where helpful
- Preserved filters
- Preserved scroll where appropriate
- Contextual drawers
- Split views
- Optimistic safe updates
- Animated transition of small surfaces

Avoid full-screen page fades between every route.

Motion should be subtle and functional.

---

# 12. Motion Language

Motion rules:

- 140–220 ms for control interactions
- 180–280 ms for drawers/panels
- Spring motion only for small responsive surfaces
- No bouncing
- No dramatic zoom
- No parallax in operational screens
- No looping decorative animations

Motion should communicate:

- Origin
- Destination
- Hierarchy
- Confirmation

---

# 13. Dashboard UX

The dashboard should use asymmetric layout, not a grid of equal cards.

Suggested structure:

```text
Good morning, Dr. Ahmed
Monday, September 7

[ Today's clinic pulse ------------------------------------- ]

Revenue opportunities                Today's next actions
Large primary number                 Priority list
Short explanation                    4–6 items max

[ Schedule preview ]

[ This month performance ]           [ Recovery trend ]
```

Avoid showing 12 KPIs equally.

Primary KPI hierarchy:

1. Today's clinic state
2. Revenue opportunities
3. Required actions
4. Monthly trend

---

# 14. Calendar UX

Calendar is one of the most important screens.

Requirements:

- Extremely fast
- Clean
- Multi-chair support
- Strong time alignment
- Distinguishable statuses
- Patient name visible
- Procedure visible when space permits
- Payment status hidden unless operationally necessary
- Compact appointment quick view
- Drag to reschedule
- Keyboard-friendly creation where practical

Appointment cards should not use five icons.

Use text and subtle status markers.

---

# 15. Patient Search UX

The receptionist should find a patient in seconds.

Global search result example:

```text
Ali Raza
0300 1234567
Last visit: Aug 14
Next: Sep 10
Outstanding: Rs. 8,000
```

The result should support immediate actions:

- Open
- Book
- Record payment

Actions can appear on hover/focus instead of always cluttering the result.

---

# 16. Patient Profile UX

Suggested composition:

```text
Ali Raza
Patient #10241          Active

Medical alert if any
Phone · Age · Last visit · Next visit

Overview | Chart | Treatment | Appointments | Billing | Files | Timeline

------------------------------------------------------------

Main clinical content                 Context summary
                                      Outstanding
                                      Pending treatment
                                      Recall
                                      Primary dentist
```

Avoid a page filled with tiny summary cards.

---

# 17. Dental Chart UX

The dental chart should be visually clear and not cartoon-like.

Use:

- Clean anatomical representation
- Subtle tooth shapes
- Selected tooth focus
- Status colors with accessible labels
- Side panel for details

Interaction:

1. Select tooth
2. Select surface if needed
3. Add condition or treatment
4. Save
5. Timeline updates

Keep common actions fast.

---

# 18. Treatment Plan UX

Treatment plan should feel like a premium quotation + clinical plan.

Structure:

```text
Treatment Plan
Presented Sep 7

Recommended Care
------------------------------------------------
16   Root Canal               Rs. 30,000
16   Zirconia Crown           Rs. 25,000
     Scaling                  Rs. 8,000

Total                         Rs. 63,000
Accepted                      Rs. 8,000
Pending                       Rs. 55,000
```

Make pending treatment value visible but not manipulative.

Clinical priority and financial value must be separate concepts.

---

# 19. Revenue Opportunity UX

Revenue screen should feel like an intelligent work queue.

Example:

```text
Revenue Opportunities                         Rs. 2.54M

High Priority
---------------------------------------------------------
Ali Raza
Unaccepted root canal + crown
Potential Rs. 55,000
Last contact 7 days ago
Next action: Follow up today
[Open]

Sara Khan
Overdue recall
Potential Rs. 8,000
...
```

Sorting:

- Priority
- Value
- Age
- Due date
- Assigned staff

Use no "gamified" visuals.

---

# 20. Forms

Forms should be:

- Short
- Contextual
- Progressive
- Keyboard usable
- Auto-saving only when safe
- Explicitly saved when financial/clinical consequences exist

Do not place 30 fields on one page.

Use sections and progressive disclosure.

---

# 21. Drawers vs Modals vs Pages

Use drawer for:

- Appointment quick view
- Patient quick summary
- Task details
- Revenue opportunity details

Use modal for:

- Confirmation
- Small edit
- Delete/archive
- Simple selector

Use full page for:

- Patient record
- Treatment plan
- Billing detail
- Reports
- Complex settings

---

# 22. Empty States

Empty states should be calm and useful.

Bad:

> No data :(

Good:

> No appointments are scheduled for this chair.

Action:

> Create appointment

No illustrations unless they add real value.

---

# 23. Loading States

Use:

- Small local skeletons
- Inline pending states
- Optimistic state where safe

Avoid making the entire application blank during small saves.

---

# 24. Tables

Tables should be clean.

Use:

- Minimal dividers
- Strong alignment
- Sticky header where useful
- Row hover
- Column controls
- Filters outside table
- Bulk actions only where justified

Avoid table cells full of badges.

---

# 25. Icon Rules

Maximum restraint.

Prefer:

```text
Search
Calendar arrows
Close
Chevron
Upload
External link
More
Back
```

Do not place icons next to labels like:

```text
Patients
Revenue
Billing
Reports
```

unless usability testing proves they help.

---

# 26. Accessibility

- Minimum readable text contrast
- Visible focus ring
- Never rely on color only
- Proper button labels
- Semantic headings
- Keyboard calendar fallback
- Form errors associated with fields
- Motion reduction support

---

# 27. Responsive Design

## Desktop

Primary clinic workstation experience.

## Tablet

Important for dental chair use.

Optimize:

- Patient overview
- Dental chart
- Notes
- Treatment plan
- Photos
- Consent

## Mobile

Owner and quick-action experience.

Optimize:

- Today
- Approvals
- Revenue
- Search
- Patient quick view
- Tasks
- Notifications

Do not shrink desktop tables blindly onto mobile.

---

# 28. Design Quality Bar

Before accepting a page, check:

- Is the primary action obvious?
- Is anything repeated?
- Can an icon be removed?
- Can a card be removed?
- Can two sections become one?
- Are all borders necessary?
- Is the page understandable in five seconds?
- Does it preserve the user's navigation context?
- Does it look custom rather than template-generated?
- Would a receptionist be able to use it all day?

If not, redesign before adding more features.
