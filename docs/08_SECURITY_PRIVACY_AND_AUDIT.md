# Security, Privacy, and Audit

## 1. Scope

Dental data can include highly sensitive health and financial information.

Security is a product feature, not a later deployment task.

The application must be designed so that country-specific legal requirements can be added without redesigning the entire system.

This document is an engineering baseline and not a substitute for legal compliance review.

---

# 2. Core Security Principles

- Least privilege
- Tenant isolation
- Encryption
- Auditability
- Secure defaults
- Minimal data collection
- Explicit access control
- No sensitive data in client logs
- No sensitive data in public URLs
- No silent privilege escalation

---

# 3. Authentication

Requirements:

- Secure session cookies
- Session expiry
- Device/session revocation
- Optional MFA
- Password reset protection
- Email verification
- Brute-force protection
- Rate limiting
- Suspicious login monitoring where practical

---

# 4. Authorization

Authorization must run server-side for every protected operation.

Check:

1. User session
2. Organization membership
3. Membership status
4. Location access if relevant
5. Permission
6. Entity belongs to allowed organization

Never accept:

```text
organization_id
```

from the browser and trust it directly.

---

# 5. Tenant Isolation Testing

Create explicit tests that attempt:

- User A reads Patient B from another clinic
- User A edits Appointment B
- User A downloads another tenant's file
- User A queries another tenant's revenue data
- User A guesses sequential IDs
- User A reuses stale signed file URLs

All must fail.

---

# 6. Encryption

## In Transit

- HTTPS only
- Secure TLS configuration

## At Rest

Use encryption provided by managed database/storage.

For especially sensitive fields, application-level encryption can be considered after threat modeling.

---

# 7. File Security

Patient files must:

- Be private
- Use authorization before access
- Use short-lived signed URLs when needed
- Have randomized storage keys
- Validate MIME type
- Validate file size
- Be malware scanned when infrastructure supports it
- Never be served from a public static directory

---

# 8. Sensitive Logging

Never log:

- Passwords
- Authentication tokens
- Full medical notes
- Full patient records
- Full payment details
- Uploaded document contents

Use IDs and correlation IDs.

---

# 9. Audit Trail

Audit these at minimum:

- Patient created
- Patient archived
- Medical alert changed
- Dental chart changed
- Clinical note changed
- Treatment plan presented/changed
- Appointment cancelled/deleted
- Payment recorded
- Payment reversed
- Invoice adjusted
- User invited
- Permission changed
- Export created
- Sensitive file accessed if required

Audit events should be append-only.

---

# 10. Data Retention

Retention policies must be configurable by jurisdiction.

Do not automatically purge clinical records without policy.

Support:

- Archive
- Export
- Legal retention configuration
- Administrative deletion process where legally permissible

---

# 11. Backups

Minimum:

- Automated database backups
- Point-in-time recovery where available
- Object storage durability
- Restore procedure
- Periodic restore test

A backup that has never been restored should not be considered proven.

---

# 12. Incident Readiness

Prepare:

- Security contact
- Incident classification
- Access revocation procedure
- Credential rotation
- Session invalidation
- Backup restore
- Audit extraction
- Customer communication process

---

# 13. Consent and Communication Preferences

Track:

- Channel consent
- Marketing opt-in/opt-out
- Appointment reminder preference
- Treatment follow-up preference
- Preferred contact channel

Do not treat operational notifications and marketing consent as automatically equivalent.

---

# 14. Clinical Safety

The product may:

- Store dentist-entered clinical information
- Display treatment plans
- Generate clinic-configured documents
- Remind patients of clinic-approved care

The product must not:

- Diagnose
- Prescribe autonomously
- Suggest treatment that was not entered by clinical staff
- Change medication
- Give emergency medical advice through automation

---

# 15. Financial Safety

Financial actions should require appropriate permissions.

Examples:

- Refund
- Reverse payment
- Write off balance
- Modify invoice total
- Change treatment price

High-impact operations should require reason capture.

---

# 16. Export Security

Exports should:

- Be generated asynchronously
- Require permission
- Be tenant-scoped
- Expire
- Be logged
- Avoid public permanent URLs

---

# 17. Secrets Management

Do not store secrets in code.

Use environment or secret manager for:

- Database credentials
- Storage credentials
- Messaging provider keys
- Payment provider keys
- Future AI provider keys

Rotate compromised secrets.

---

# 18. Dependency Security

- Pin important dependencies
- Run vulnerability scans
- Remove unused packages
- Avoid abandoned libraries
- Review packages that touch authentication, encryption, file parsing, and payments

---

# 19. Security Definition of Done

A feature is not complete until:

- Permission checks exist
- Tenant isolation exists
- Validation exists
- Audit impact is considered
- Sensitive logging is reviewed
- Tests cover unauthorized access
