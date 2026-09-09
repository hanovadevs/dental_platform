import type { Metadata } from 'next';
import { PolicyLayout } from '@/components/legal/policy-layout';

export const metadata: Metadata = {
  title: 'Terms & Conditions — Dental OS',
  description: 'Read the official Terms and Conditions governing use of the Dental OS practice management and clinical platform.',
};

export default function TermsPage() {
  return (
    <PolicyLayout
      activePolicy="terms"
      title="Terms & Conditions"
      subtitle="The legal agreement governing your clinic's registration, workspace access, payment obligations, and use of Dental OS software."
      lastUpdated="September 2026"
    >
      <div style={{ marginBottom: '24px' }}>
        <p>
          Welcome to <strong>Dental OS</strong>. These Terms and Conditions (&quot;Terms&quot;, &quot;Agreement&quot;) constitute a legally binding agreement between <strong>Dental OS</strong> (&quot;Company&quot;, &quot;we&quot;, &quot;us&quot;, or &quot;our&quot;) and the dental practice, dental practitioner, clinic owner, or corporate healthcare entity (&quot;Customer&quot;, &quot;Clinic&quot;, &quot;you&quot;, or &quot;your&quot;) accessing or using the Dental OS software-as-a-service platform, websites, and associated services (collectively, the &quot;Service&quot;).
        </p>
        <p>
          By creating an account, paying a clinic registration fee, or accessing any portion of the platform, you acknowledge that you have read, understood, and agree to be bound by these Terms and our Privacy Policy.
        </p>
      </div>

      <div className="calloutBox">
        <div className="calloutBoxTitle">Important Clinical Disclaimer</div>
        <div className="calloutBoxText">
          Dental OS is an operational management, clinical charting, and administrative record-keeping system. Dental OS is <strong>not</strong> a medical practitioner and does not provide clinical diagnosis, medical counsel, or clinical treatment recommendations. All clinical decisions, treatment verifications, drug prescriptions, and procedural evaluations remain the sole, unmitigated legal and professional responsibility of the licensed dental practitioner.
        </div>
      </div>

      <h2>1. Account Eligibility & Practice Registration</h2>
      <p>
        To register and maintain a clinic workspace on Dental OS:
      </p>
      <ul>
        <li>You represent and warrant that you are a duly licensed dental professional or an authorized administrative representative with legal capacity to bind your dental clinic to this Agreement.</li>
        <li>You agree to provide accurate, current, and complete information during registration (including legal clinic name, registered practitioner contact, and contact phone numbers).</li>
        <li>You are responsible for safeguarding your login credentials and for all activities conducted under your clinic&apos;s administrative and staff user accounts.</li>
        <li>You must immediately notify Dental OS at <a href="mailto:support@dentalos.com" style={{ color: '#2563eb' }}>support@dentalos.com</a> of any unauthorized access, security incident, or compromised user credentials.</li>
      </ul>

      <h2>2. Clinic Registration Fee & Payments</h2>
      <h3>2.1 One-Time Registration Fee</h3>
      <p>
        To provision a dedicated, tenant-isolated cloud workspace, each new dental clinic is required to pay a non-refundable one-time registration fee (unless eligible under our Return & Refund Policy).
      </p>
      <ul>
        <li><strong>Configured Currency:</strong> All registration and recurring transactions are denominated and processed in <strong>Pakistani Rupees (PKR)</strong>.</li>
        <li><strong>Payment Gateway:</strong> Online payments are processed through <strong>Premier PayFast</strong> (regulated by the State Bank of Pakistan) or other authorized payment channels.</li>
        <li><strong>Gatekept Activation:</strong> Clinic workspace setup, staff invitations, and patient charting capabilities remain inactive until payment confirmation is cryptographically validated from the payment gateway.</li>
      </ul>

      <h3>2.2 Recurring Subscriptions & Fee Changes</h3>
      <p>
        Subscription tiers, operatory add-ons, and supplemental clinical modules are billed in advance on a recurring monthly or annual billing cycle. Dental OS reserves the right to modify pricing with a minimum of 30 days advance notice to active practice administrators.
      </p>

      <h2>3. Software License & Acceptable Use</h2>
      <p>
        Subject to compliance with these Terms and timely payment of applicable fees, Dental OS grants you a non-exclusive, non-transferable, revocable license to access and use the Service for the internal operational purposes of your licensed dental practice.
      </p>
      <p>You agree <strong>not</strong> to:</p>
      <ul>
        <li>Sub-license, resell, lease, distribute, or time-share access to the Dental OS platform to any third party.</li>
        <li>Reverse engineer, decompile, disassemble, or attempt to derive the source code or underlying algorithms of the platform.</li>
        <li>Use automated scrapers, data extraction robots, or unauthorized programmatic access against our endpoints.</li>
        <li>Transmit or store malicious code, viruses, malware, or unauthorized automated scripts.</li>
        <li>Input or process fraudulent, stolen, or unlawful medical or payment records.</li>
      </ul>

      <h2>4. Data Ownership & Intellectual Property</h2>
      <h3>4.1 Customer Clinical Data</h3>
      <p>
        The Clinic retains sole and exclusive ownership of all proprietary data, patient health information, radiographs, invoices, and clinical notes uploaded or generated within the Clinic&apos;s account (&quot;Customer Data&quot;). Dental OS claims no ownership rights over your clinical records.
      </p>
      <h3>4.2 Platform Intellectual Property</h3>
      <p>
        Dental OS, including its software architecture, source code, interactive 32/52-tooth charting interfaces, user experience designs, algorithms, logos, and trademarks, remains the exclusive intellectual property of Dental OS. All rights not expressly granted are reserved.
      </p>

      <h2>5. Service Availability & Support SLA</h2>
      <p>
        We target <strong>99.9% platform availability</strong> for our cloud infrastructure, excluding scheduled maintenance windows. Scheduled maintenance is scheduled during off-peak hours whenever feasible, with advance notification displayed in the administrator workspace.
      </p>

      <h2>6. Termination & Suspension</h2>
      <p>
        Either party may terminate this Agreement:
      </p>
      <ul>
        <li><strong>For Convenience:</strong> The Clinic may cancel its account and subscription at any time through the in-app subscription settings or by written notice to our support team.</li>
        <li><strong>For Cause:</strong> Dental OS may suspend or terminate account access immediately if the Clinic fails to pay required fees, engages in unlawful conduct, or violates the acceptable use provisions of these Terms.</li>
        <li><strong>Post-Termination Data Access:</strong> Upon termination, the Clinic will have a grace period of 30 days to export all patient records and accounting ledgers before tenant data is permanently decommissioned.</li>
      </ul>

      <h2>7. Limitation of Liability</h2>
      <p>
        To the maximum extent permitted by applicable law, in no event shall Dental OS, its directors, employees, or technology partners be liable for:
      </p>
      <ul>
        <li>Any indirect, incidental, consequential, special, punitive, or exemplary damages.</li>
        <li>Loss of profits, business revenue, goodwill, clinical practice interruption, or loss of patient data resulting from system downtime or user operational error.</li>
        <li>Any claims arising from clinical dental malpractice, practitioner misdiagnosis, or treatment outcomes.</li>
      </ul>
      <p>
        Dental OS&apos;s cumulative aggregate liability arising under or relating to this Agreement shall not exceed the total fees actually paid by the Clinic to Dental OS in the twelve (12) months preceding the incident giving rise to liability.
      </p>

      <h2>8. Governing Law & Dispute Resolution</h2>
      <p>
        These Terms shall be governed by and construed in accordance with the laws of Pakistan, without regard to its conflict of law principles. Any dispute, controversy, or claim arising out of or relating to these Terms shall first be submitted to good-faith mediation. If unresolved within 30 days, the dispute shall be resolved through binding arbitration in Islamabad, Pakistan.
      </p>

      <h2>9. Modifications to Terms</h2>
      <p>
        We may amend these Terms periodically to reflect updates in regulatory requirements, payment gateway protocols, or platform features. We will notify active accounts of material revisions via email or an administrative dashboard alert at least 15 days prior to the effective date.
      </p>

      <h2>10. Contact Us</h2>
      <p>
        If you have questions regarding these Terms &amp; Conditions, please reach out to our legal and operations team:
      </p>
      <div className="calloutBox">
        <div className="calloutBoxTitle">Dental OS Legal &amp; Governance Affairs</div>
        <div className="calloutBoxText">
          Email: <a href="mailto:support@dentalos.com" style={{ color: '#2563eb', fontWeight: 600 }}>support@dentalos.com</a><br />
          Inquiries: Terms of Service &amp; Healthcare SaaS Licensing
        </div>
      </div>
    </PolicyLayout>
  );
}
