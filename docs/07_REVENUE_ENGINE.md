# Revenue Engine

## 1. Purpose

The Revenue Engine identifies operational states where revenue may be lost and turns them into prioritized, trackable actions.

It is not a marketing gimmick.

It must use explainable rules and conservative attribution.

---

# 2. Core Model

Every revenue opportunity has:

- Type
- Patient or lead
- Source entity
- Reason
- Estimated value
- Priority
- Confidence
- Next action
- Owner
- Status
- Outcome
- Recovered revenue if attributable

---

# 3. Opportunity Type: Unaccepted Treatment

## Trigger

Treatment plan was presented and remains partially or fully unaccepted after a configured delay.

### Example rule

```text
IF treatment_plan.status IN [Presented, Partially Accepted]
AND unaccepted_value > 0
AND days_since_presented >= clinic.followup_delay
THEN create/update opportunity
```

### Estimated Value

Sum of currently proposed, non-accepted treatment items.

### Resolution

- Treatment accepted
- Patient declined
- Clinically no longer relevant
- Patient transferred
- Lost

---

# 4. Opportunity Type: Overdue Recall

## Trigger

Recall is overdue and no future qualifying appointment exists.

### Estimated Value

Use one of:

- Clinic-configured average recall value
- Treatment-specific expected value
- Historical average per clinic

Keep the method visible in reports.

---

# 5. Opportunity Type: Cancelled Appointment

## Trigger

An appointment with production value is cancelled.

### Estimated Value

Prefer:

- Treatment-plan value linked to appointment
- Appointment-type default value
- Clinic configured estimate

### Action

- Reschedule original patient
- Fill released chair slot

This may produce both:

- Cancellation Recovery opportunity
- ChairFill opportunity

Avoid double counting recovered revenue.

---

# 6. Opportunity Type: No Show

Similar to cancellation, but behavior and priority may differ.

Track repeated no-shows.

Do not automatically label a patient as low-value or undesirable based on protected or sensitive characteristics.

---

# 7. Opportunity Type: Empty Chair

## Trigger

A usable appointment gap exists above a configurable duration threshold.

Example:

```text
chair available
AND dentist available
AND gap >= 30 minutes
AND within next 7 days
```

### Candidate Matching

Rank waiting-list patients by:

- Duration fit
- Requested earlier appointment
- Treatment readiness
- Date urgency
- Clinic priority rules
- Estimated production

Clinical need should never be overridden solely by revenue value.

---

# 8. Opportunity Type: Outstanding Balance

## Trigger

Invoice has amount due and meets clinic reminder policy.

Stages:

- Upcoming due
- Due
- 1–30 days overdue
- 31–60
- 61–90
- 90+

The system should not send aggressive collection messages by default.

---

# 9. Opportunity Type: Inactive Patient

## Trigger

No completed appointment within clinic-defined inactive period.

Default example:

```text
12 months
```

Exclude:

- Archived
- Deceased if such status exists
- Opted out
- Transferred
- Clinically inappropriate
- Already scheduled

---

# 10. Opportunity Type: Lost Lead

## Trigger

Lead has not converted and has no next action.

Examples:

- Missed call
- Website inquiry not contacted
- Consultation not booked
- Consultation no-show
- Treatment proposed but no patient record yet

---

# 11. Priority Scoring

Use an explainable score.

Example inputs:

```text
Value score             0–30
Urgency score           0–25
Age score               0–15
Clinical priority       0–20
Engagement score        0–10
```

Total:

```text
0–100
```

Do not use an opaque machine-learning model in V1.

---

# 12. Confidence Score

Estimated value is not guaranteed revenue.

Use a separate confidence score.

Example:

```text
High confidence:
- Appointment already requested
- Patient asked for earlier slot

Medium:
- Treatment presented recently

Low:
- Patient inactive for 2 years
```

Display:

```text
Potential value
```

not:

```text
Guaranteed revenue
```

---

# 13. Opportunity Work Queue

Views:

- All
- High Priority
- Due Today
- Unassigned
- Treatment Recovery
- Recall
- ChairFill
- Leads
- Payments

Each row should show:

- Patient
- Opportunity reason
- Potential value
- Last action
- Next action
- Owner
- Status

---

# 14. Follow-Up Actions

Possible actions:

- Send template
- Call manually
- Create task
- Book appointment
- Snooze
- Mark declined
- Mark not applicable
- Reassign

Future:

- Send to AI calling agent

---

# 15. Revenue Attribution

Do not attribute revenue just because communication occurred.

Preferred attribution rules:

### Strong

Opportunity -> booked appointment -> completed procedure -> paid invoice

### Medium

Opportunity -> treatment accepted

### Weak

Opportunity -> message delivered

Only strong or defined medium events should count as recovered revenue.

---

# 16. Dashboard Metrics

Show:

- Open opportunity value
- High-priority value
- Converted this month
- Recovered revenue this month
- Opportunities by type
- Conversion rate
- Average days to conversion

Provide definitions.

---

# 17. Revenue Safety Rules

The engine must never:

- Recommend unnecessary clinical treatment
- Change treatment priority based only on money
- Diagnose
- Create treatment not prescribed by a dentist
- Pressure vulnerable patients
- Circumvent consent preferences
- Spam patients
- Misrepresent estimated revenue as guaranteed

Clinical decisions remain with licensed dental staff.

---

# 18. Future AI Calling Agent Interface

The Revenue Engine should eventually create a normalized call task:

```json
{
  "intent": "treatment_followup",
  "patient_id": "...",
  "opportunity_id": "...",
  "approved_context": {
    "treatment_summary": "...",
    "appointment_options": []
  },
  "constraints": {
    "no_clinical_advice": true,
    "human_escalation_required_for": []
  }
}
```

The voice agent should return:

```json
{
  "outcome": "booked",
  "appointment_id": "...",
  "needs_human_followup": false,
  "summary": "..."
}
```

Do not store unrestricted agent prompts directly as business logic.
