# Data Model and Domain

## 1. Data Modeling Principles

The data model must preserve:

- Tenant isolation
- Clinical history
- Appointment history
- Financial history
- Auditability
- Revenue attribution

Avoid destructive overwrites.

Use immutable or append-oriented history where clinically or financially important.

---

# 2. Core Entities

## Organization

```text
id
name
slug
status
default_currency
default_timezone
created_at
updated_at
```

## Location

```text
id
organization_id
name
address
phone
timezone
active
created_at
updated_at
```

## User

Authentication identity.

## Membership

```text
id
organization_id
user_id
role_id
status
```

## MembershipLocation

Defines allowed locations.

---

# 3. Staff and Dentist Profile

## StaffProfile

```text
id
organization_id
membership_id
display_name
phone
job_title
active
```

## DentistProfile

```text
id
organization_id
staff_profile_id
license_number_optional
specialty
default_appointment_duration
```

---

# 4. Patient

```text
id
organization_id
primary_location_id
patient_number
first_name
last_name
date_of_birth
phone
email
preferred_language
preferred_contact_method
status
lead_source
primary_dentist_id
created_at
updated_at
archived_at
```

### Patient status

- Active
- Recall Due
- Inactive
- Archived

Do not overload patient status with every revenue condition. Revenue conditions belong in revenue opportunities.

---

# 5. Medical Record

Separate sensitive structured records from general demographic data.

Examples:

## MedicalAlert

```text
id
organization_id
patient_id
type
label
severity
active
created_by
created_at
```

## Allergy

```text
id
patient_id
substance
reaction
severity
active
```

## Medication

```text
id
patient_id
name
dose_optional
active
```

---

# 6. Dental Chart

## Tooth

Use a standard tooth identifier system configurable by display convention.

## ToothCondition

```text
id
organization_id
patient_id
tooth_code
surface_optional
condition_type
status
notes
recorded_by
recorded_at
supersedes_id_optional
```

Preserve history.

Do not overwrite previous condition rows.

---

# 7. Appointment

```text
id
organization_id
location_id
patient_id
dentist_id
chair_id
appointment_type_id
start_at
end_at
status
confirmation_status
source
notes
created_by
created_at
updated_at
```

## AppointmentStatusHistory

```text
id
appointment_id
from_status
to_status
reason
changed_by
changed_at
```

---

# 8. Chair

```text
id
organization_id
location_id
name
active
```

---

# 9. Treatment Catalog

## TreatmentDefinition

```text
id
organization_id
code
name
category
default_duration_minutes
default_price
currency
tooth_specific
surface_specific
active
```

---

# 10. Treatment Plan

## TreatmentPlan

```text
id
organization_id
location_id
patient_id
dentist_id
status
presented_at
expires_at_optional
notes
created_at
updated_at
```

## TreatmentPlanItem

```text
id
treatment_plan_id
treatment_definition_id
tooth_code_optional
surface_optional
sequence
priority
price
discount
status
accepted_at_optional
completed_at_optional
```

### Item statuses

- Proposed
- Accepted
- Declined
- Deferred
- Scheduled
- In Progress
- Completed
- Cancelled

---

# 11. Procedure

When treatment is clinically performed, record a procedure instance.

```text
id
organization_id
patient_id
appointment_id_optional
treatment_plan_item_id_optional
dentist_id
treatment_definition_id
tooth_code_optional
performed_at
notes
```

Treatment catalog definitions must not substitute for performed-procedure history.

---

# 12. Billing

## Invoice

```text
id
organization_id
location_id
patient_id
status
currency
subtotal
discount_total
tax_total
total
amount_paid
amount_due
issued_at
due_at_optional
```

## InvoiceItem

```text
id
invoice_id
procedure_id_optional
description
quantity
unit_price
total
```

## Payment

```text
id
organization_id
invoice_id_optional
patient_id
amount
currency
method
reference_optional
paid_at
recorded_by
status
```

Use payment reversal records rather than deleting financial history.

---

# 13. Lead

```text
id
organization_id
location_id_optional
name
phone
email
source
service_interest
estimated_value
stage
assigned_to
last_contact_at
next_action_at
lost_reason_optional
converted_patient_id_optional
```

---

# 14. Recall

## RecallRule

```text
id
organization_id
name
interval_days
based_on_treatment_definition_id_optional
active
```

## Recall

```text
id
organization_id
patient_id
rule_id
due_at
status
last_contact_at
booked_appointment_id_optional
```

---

# 15. Revenue Opportunity

This is a first-class domain entity.

## RevenueOpportunity

```text
id
organization_id
location_id_optional
patient_id_optional
lead_id_optional
appointment_id_optional
treatment_plan_id_optional
invoice_id_optional

type
status
priority
estimated_value
currency
confidence_score
reason
detected_at
next_action_at
assigned_to

resolved_at_optional
resolution_type_optional
recovered_revenue_optional
attribution_reference_optional
```

### Types

- Unaccepted Treatment
- Overdue Recall
- Cancelled Appointment
- No Show
- Empty Chair
- Outstanding Balance
- Inactive Patient
- Lost Lead

### Status

- Open
- In Progress
- Snoozed
- Converted
- Lost
- Not Applicable
- Closed

---

# 16. Revenue Attribution

## RevenueAttribution

```text
id
organization_id
opportunity_id
event_type
source_entity_type
source_entity_id
amount
currency
occurred_at
```

Examples:

- Recall opportunity resulted in completed scaling
- Cancelled-slot opportunity resulted in new booking
- Treatment follow-up resulted in accepted crown

Avoid claiming revenue was "recovered" when attribution is uncertain.

---

# 17. Communications

## Communication

```text
id
organization_id
patient_id_optional
lead_id_optional
channel
direction
template_id_optional
status
provider_reference_optional
sent_at_optional
delivered_at_optional
failed_at_optional
```

## CommunicationConsent

Track consent / opt-out where required.

---

# 18. Task

```text
id
organization_id
location_id_optional
patient_id_optional
opportunity_id_optional
assigned_to
title
description
priority
due_at
status
```

---

# 19. Inventory

## InventoryItem

```text
id
organization_id
location_id
name
sku
category
unit
current_quantity
minimum_quantity
cost_per_unit
supplier_id_optional
expiry_tracking
active
```

## InventoryMovement

```text
id
inventory_item_id
type
quantity
batch_optional
expiry_optional
reason
recorded_by
created_at
```

Never rely only on mutable `current_quantity`; movements should allow reconciliation.

---

# 20. Lab

## LabCase

```text
id
organization_id
patient_id
tooth_code_optional
treatment_plan_item_id_optional
lab_supplier_id
work_type
status
sent_at
expected_at
received_at_optional
fitted_at_optional
cost
notes
```

---

# 21. File

## PatientFile

```text
id
organization_id
patient_id
storage_key
file_name
mime_type
size
category
tooth_code_optional
uploaded_by
created_at
```

Never store sensitive binary files directly in normal public web directories.

---

# 22. Audit Event

```text
id
organization_id
location_id_optional
actor_user_id
entity_type
entity_id
action
changed_fields_optional
reason_optional
correlation_id
created_at
```

Audit records should be append-only.

---

# 23. Important Indexes

At minimum:

```text
patient(organization_id, last_name)
patient(organization_id, phone)
appointment(organization_id, start_at)
appointment(location_id, start_at)
appointment(dentist_id, start_at)
treatment_plan(organization_id, status)
invoice(organization_id, status, due_at)
revenue_opportunity(organization_id, status, priority)
recall(organization_id, due_at, status)
lead(organization_id, stage, next_action_at)
```

---

# 24. Referential Integrity

Use foreign keys where practical.

Do not allow:

- Appointment to reference patient from another tenant
- Invoice to reference patient from another tenant
- Revenue opportunity to reference entity from another tenant
- Staff assignment across organizations

These must be enforced by application rules and tested rigorously.
