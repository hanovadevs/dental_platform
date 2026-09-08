# Deployment, Observability, and Operations

## 1. Deployment Goals

The platform must be:

- Easy to deploy
- Easy to update
- Observable
- Recoverable
- Environment separated
- Secure by default

---

# 2. Environments

Use at minimum:

- Local
- Staging
- Production

Optional:

- Preview per pull request

Never connect local development to production patient data.

---

# 3. Environment Variables

Validate required variables at startup.

Groups:

- Application
- Database
- Auth
- Object storage
- Queue
- Email
- SMS
- WhatsApp
- Monitoring
- Future payments
- Future voice agent

Fail fast when required config is missing.

---

# 4. Database Migrations

Rules:

- Version controlled
- Reviewed
- Reversible where practical
- Tested on staging
- Backward compatible during rolling deployment where needed

Do not edit historical migration files after production use.

---

# 5. Seed Data

Use:

- Synthetic patients
- Synthetic dentists
- Synthetic appointments
- Synthetic invoices
- Synthetic treatments

Never use real patient data in public demos.

---

# 6. Continuous Integration

Every pull request should run:

- Type check
- Lint
- Unit tests
- Integration tests
- Build
- Migration validation
- Security scan where available

Critical branches require passing CI.

---

# 7. Continuous Deployment

Recommended:

```text
merge -> staging -> automated tests -> production approval
```

Do not auto-deploy unreviewed database migrations directly to production.

---

# 8. Logging

Use structured logs.

Include:

- Request ID
- Correlation ID
- Organization ID where safe
- User ID where appropriate
- Job ID
- Event type
- Error classification

Do not include full patient content.

---

# 9. Error Monitoring

Capture:

- Frontend exceptions
- Backend exceptions
- Failed background jobs
- Provider failures
- Database errors
- Slow requests

Errors should link to correlation IDs.

---

# 10. Metrics

Track technical:

- Request latency
- Error rate
- Job success/failure
- Queue depth
- Database connection usage
- Slow queries
- File upload failures

Track product:

- Daily active clinics
- Appointments created
- Treatment plans presented
- Payments recorded
- Revenue opportunities created
- Opportunities converted
- Messaging delivery success

Do not send sensitive patient-level data to generic analytics providers.

---

# 11. Alerting

Alerts for:

- Error spike
- Database unavailable
- Queue stalled
- Backup failed
- Storage unavailable
- Messaging provider outage
- High failed login rate
- Cross-tenant guard exception
- Migration failure

---

# 12. Backups and Recovery

Document:

- Backup frequency
- Retention
- Restore steps
- RPO
- RTO
- Object storage recovery

Perform restore drills.

---

# 13. Rollback Strategy

Support:

- Application rollback
- Feature flag disable
- Provider disable
- Migration recovery plan

Avoid irreversible destructive migrations.

---

# 14. Support Tooling

Internal support may need:

- Tenant lookup
- Subscription status
- Job retry
- Import status
- Error correlation
- Audit search

Support tools must not provide unrestricted silent access to patient records.

Access must be limited and auditable.

---

# 15. Clinic Onboarding Operations

Goal:

A clinic should not need a technician.

Flow:

1. Create account
2. Create clinic
3. Configure location
4. Invite staff
5. Set treatments
6. Import patients
7. Configure messaging
8. Start using system

Provide inline onboarding progress.

---

# 16. Data Export

Support clinic-owned export of:

- Patients
- Appointments
- Treatment plans
- Invoices
- Payments
- Revenue opportunities
- Audit where appropriate

Large exports should run in background.

---

# 17. Subscription Architecture

Keep subscription logic separate from clinical permissions.

Example plans may later limit:

- Locations
- Staff seats
- Messaging volume
- Advanced analytics
- Revenue automation
- AI calling

Never make a patient inaccessible because a subscription payment failed without a clear safe policy.

---

# 18. Operational Definition of Ready

Before commercial production:

- HTTPS
- Managed database
- Managed storage
- Backups
- Restore test
- Monitoring
- Error tracking
- Audit logs
- Tenant isolation tests
- Rate limiting
- CI
- Staging
- Documented rollback
- Support escalation path
