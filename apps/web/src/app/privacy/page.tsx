import type { Metadata } from 'next';
import { PolicyLayout } from '@/components/legal/policy-layout';

export const metadata: Metadata = {
  title: 'Privacy Policy — Dental OS',
  description: 'Learn how Dental OS collects, protects, processes, and respects clinical practice data, patient health information, and payment transactions.',
};

export default function PrivacyPolicyPage() {
  return (
    <PolicyLayout
      activePolicy="privacy"
      title="Privacy Policy"
      subtitle="How Dental OS collects, safeguards, encrypts, and handles clinic account data, patient health information (PHI), and payment records."
      lastUpdated="September 2026"
    >
      <div style={{ marginBottom: '24px' }}>
        <p>
          At <strong>Dental OS</strong> (&quot;Dental OS&quot;, &quot;we&quot;, &quot;our&quot;, or &quot;us&quot;), we recognize the critical importance of privacy, confidentiality, and data protection in healthcare operations. This Privacy Policy sets out how we collect, store, process, protect, and disclose information when dental practices, clinicians, practice managers, and staff use our practice management, interactive charting, billing, and clinical operations platform.
        </p>
      </div>

      <div className="calloutBox">
        <div className="calloutBoxTitle">Healthcare Confidentiality & Multi-Tenant Isolation</div>
        <div className="calloutBoxText">
          Dental OS enforces rigorous tenant boundary isolation. Each dental practice&apos;s records, clinical notes, and patient data are partitioned using strict database Row Level Security (RLS). We never sell, monetize, or disclose your clinical or patient data to third-party advertisers.
        </div>
      </div>

      <h2>1. Information We Collect</h2>
      <p>
        When you register an account, configure a dental clinic, or use the Dental OS platform, we collect the following categories of information:
      </p>

      <h3>1.1 Clinic Account & Practitioner Information</h3>
      <ul>
        <li><strong>Account Credentials:</strong> Full name, professional email address, encrypted password hash, and designated practice role (e.g., Doctor, Clinic Owner, Receptionist, Practice Manager).</li>
        <li><strong>Clinic Organization Details:</strong> Dental clinic name, registered legal entity, physical facility address, official telephone contact numbers, clinical tax/NTN identifiers, operatory/chair counts, and business hours.</li>
      </ul>

      <h3>1.2 Payment & Transaction Information</h3>
      <p>
        To activate and maintain your clinic workspace, we process registration fees and software subscriptions. Payment transactions are processed through regulated payment service providers, notably <strong>Premier PayFast (APPS)</strong>:
      </p>
      <ul>
        <li><strong>Transaction Identifiers:</strong> Basket Reference IDs, gateway transaction reference numbers, paid amounts in PKR, timestamps, and verification status codes.</li>
        <li><strong>Zero Cardholder Data Storage:</strong> Dental OS <strong>never</strong> collects, intercepts, or stores cardholder Primary Account Numbers (PAN), CVV/CVC security codes, debit card PINs, or one-time passwords (OTPs). All card entry and authentication occurs directly on Premier PayFast&apos;s PCI-DSS compliant hosted payment interfaces.</li>
      </ul>

      <h3>1.3 Protected Health Information (PHI) & Clinical Data</h3>
      <p>
        As a practice management platform, your authorized staff may input patient and clinical records, including:
      </p>
      <ul>
        <li>Patient demographic profiles, emergency contacts, and insurance identifiers.</li>
        <li>Dental charts, tooth numbering grids, periodontal pocket depths, surface restorations, and clinical diagnoses.</li>
        <li>Treatment plans, procedural milestones, surgical consent forms, appointment schedules, and chair allocations.</li>
        <li>Itemized dental invoices, procedure line items, fee schedules, and patient payment receipts.</li>
      </ul>

      <h3>1.4 Technical, Device & Telemetry Data</h3>
      <ul>
        <li>IP address, browser type and version, operating system, and system timestamp for each API action.</li>
        <li>Immutable audit trail logs recording user logins, clinical record modifications, invoice issuances, and patient data exports for HIPAA/GDPR regulatory compliance.</li>
      </ul>

      <h2>2. Roles Under Data Protection Laws (GDPR & HIPAA)</h2>
      <p>
        In accordance with international healthcare data governance standards:
      </p>
      <ul>
        <li><strong>Data Controller:</strong> The dental clinic (the Customer) is the legal Data Controller of all patient records, medical history, and clinical documentation entered into Dental OS. The clinic maintains full ownership of this data.</li>
        <li><strong>Data Processor / Business Associate:</strong> Dental OS acts solely as a Data Processor / Business Associate, providing the encrypted cloud software, database infrastructure, and operational tools to host and process that data strictly on the clinic&apos;s instruction.</li>
      </ul>

      <h2>3. How We Use Collected Information</h2>
      <p>
        We use the collected information strictly for operational, clinical, and legitimate business purposes:
      </p>
      <ul>
        <li>Provisioning, authenticating, and maintaining your clinic&apos;s isolated tenant workspace.</li>
        <li>Powering interactive 32/52-tooth dental charting, treatment planning, and chair scheduling.</li>
        <li>Verifying clinic registration fee payments and maintaining accurate accounting ledgers.</li>
        <li>Delivering patient recall reminders, appointment confirmation SMS/emails, and billing statements on your clinic&apos;s behalf.</li>
        <li>Enforcing system security, fraud detection, rate limiting, and technical troubleshooting.</li>
        <li>Complying with statutory tax, healthcare auditing, and regulatory requirements.</li>
      </ul>

      <h2>4. Data Security & Encryption Standards</h2>
      <p>
        We employ multi-layered clinical-grade security measures to safeguard all data:
      </p>
      <ul>
        <li><strong>Encryption in Transit:</strong> All web and API traffic is encrypted using Transport Layer Security (TLS 1.3) with HSTS enforcement.</li>
        <li><strong>Encryption at Rest:</strong> Database volumes and automated database backups are encrypted with AES-256 standard encryption.</li>
        <li><strong>Immutable Audit Logging:</strong> Sensitive clinical actions (viewing, editing, or deleting patient records) generate non-repudiable audit logs.</li>
        <li><strong>Automated Backups:</strong> Point-in-time recovery and automated daily snapshots protect against catastrophic loss.</li>
      </ul>

      <h2>5. Disclosure of Information to Third Parties</h2>
      <p>
        We do not sell, rent, or lease your clinic or patient information. Information is only shared with trusted service providers who adhere to strict data protection agreements:
      </p>
      <ul>
        <li><strong>Payment Processors:</strong> Premier PayFast (APPS) and banking partners to authenticate and settle registration fees and subscriptions.</li>
        <li><strong>Infrastructure Providers:</strong> SOC2 and ISO27001 certified cloud hosting providers (e.g., Supabase, Vercel, AWS) for secure serverless hosting and database management.</li>
        <li><strong>Communication Gateways:</strong> Regulated SMS/telecom gateways to dispatch clinic-initiated patient appointment reminders.</li>
        <li><strong>Legal Compliance:</strong> When strictly mandated by valid court orders, regulatory healthcare subpoenas, or applicable laws in Pakistan or the customer&apos;s jurisdiction.</li>
      </ul>

      <h2>6. Data Portability & Retention</h2>
      <p>
        We believe dental practices should never be locked into a software vendor:
      </p>
      <ul>
        <li><strong>Data Portability Guarantee:</strong> Practice administrators can export patient records, treatment histories, appointments, and ledger items in standard formats (CSV, JSON, PDF) at any time.</li>
        <li><strong>Data Retention:</strong> Active account data is retained for the duration of the clinic&apos;s subscription. Upon formal account closure or written request, clinical records may be exported and subsequently scrubbed or archived according to mandatory statutory medical record retention schedules.</li>
      </ul>

      <h2>7. Cookies & Session Management</h2>
      <p>
        Dental OS utilizes strictly necessary HTTP-only authentication cookies to maintain secure practitioner sessions. We do not use third-party behavioral advertising cookies or cross-site tracking pixels on our clinical workspace interfaces.
      </p>

      <h2>8. Your Rights & Data Inquiries</h2>
      <p>
        Clinicians and clinic administrators have the right to access, inspect, rectify, or request deletion of their personal administrative data. For questions concerning this Privacy Policy or our clinical data governance protocols, contact:
      </p>
      <div className="calloutBox">
        <div className="calloutBoxTitle">Dental OS Data Protection & Compliance Office</div>
        <div className="calloutBoxText">
          Email: <a href="mailto:support@dentalos.com" style={{ color: '#2563eb', fontWeight: 600 }}>support@dentalos.com</a><br />
          Subject: Privacy & Compliance Inquiry<br />
          Response Timeline: 1 to 2 business days
        </div>
      </div>
    </PolicyLayout>
  );
}
