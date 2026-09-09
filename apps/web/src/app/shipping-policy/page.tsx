import type { Metadata } from 'next';
import { PolicyLayout } from '@/components/legal/policy-layout';

export const metadata: Metadata = {
  title: 'Shipping & Service Delivery Policy — Dental OS',
  description: 'Learn about how Dental OS fulfills, provisions, and delivers cloud software licenses, workspace access, and electronic services.',
};

export default function ShippingPolicyPage() {
  return (
    <PolicyLayout
      activePolicy="shipping"
      title="Shipping & Service Delivery Policy"
      subtitle="Fulfillment timeline, electronic provisioning mechanisms, and delivery confirmation for Dental OS cloud healthcare software."
      lastUpdated="September 2026"
    >
      <div style={{ marginBottom: '24px' }}>
        <p>
          Thank you for choosing <strong>Dental OS</strong>. Dental OS is a purely digital, cloud-hosted Software-as-a-Service (SaaS) practice management and clinical platform. We do not manufacture, package, or distribute physical hardware, disks, USB installation keys, or boxed merchandise. This Service Delivery &amp; Shipping Policy explains how your digital subscriptions and clinic registrations are fulfilled, delivered, and confirmed.
        </p>
      </div>

      <div className="calloutBox calloutSuccess">
        <div className="calloutBoxTitle">Zero Shipping Charges &amp; Instant Electronic Fulfillment</div>
        <div className="calloutBoxText">
          All Dental OS products, clinic workspace provisioning, and software licenses are delivered <strong>100% electronically</strong> via secure web browser access and encrypted API channels. There are <strong>no shipping fees (PKR 0.00)</strong>, no postal transit delays, and no import duties.
        </div>
      </div>

      <h2>1. Delivery Methods &amp; Fulfillment Channels</h2>
      <p>
        Upon successful payment processing through Premier PayFast, your service is provisioned through the following electronic mechanisms:
      </p>
      <ul>
        <li><strong>Immediate Web Redirection:</strong> The moment payment is verified by the gateway, the user interface automatically redirects your session to the <em>Clinic Onboarding Wizard</em> (<code>/onboarding</code>), allowing you to immediately configure clinic chairs, locations, and staff profiles.</li>
        <li><strong>Automated Email Confirmation:</strong> An electronic order receipt and fulfillment notice is dispatched to your registered clinic administrator email within <strong>5 minutes</strong> of transaction completion. The email contains your Basket Reference ID, paid amount in PKR, and direct workspace sign-in link.</li>
        <li><strong>Cloud Tenant Activation:</strong> A dedicated, isolated multi-tenant schema partition is initialized on our PostgreSQL database cluster, granting full access to dental charting, appointment scheduling, and billing features.</li>
      </ul>

      <h2>2. Fulfillment Timelines</h2>
      <table className="policyTable">
        <thead>
          <tr>
            <th>Service Type</th>
            <th>Delivery Method</th>
            <th>Estimated Delivery Time</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><strong>New Clinic Registration</strong></td>
            <td>Instant Electronic Workspace Provisioning</td>
            <td>Immediate (Typically &lt; 30 seconds)</td>
          </tr>
          <tr>
            <td><strong>Subscription Renewal / Tier Upgrade</strong></td>
            <td>Automated In-App Feature Entitlement</td>
            <td>Instant upon gateway confirmation</td>
          </tr>
          <tr>
            <td><strong>Electronic Transaction Invoice</strong></td>
            <td>Automated Email Delivery (PDF format)</td>
            <td>Within 5 to 15 minutes</td>
          </tr>
          <tr>
            <td><strong>Assisted Clinic Data Migration (CSV)</strong></td>
            <td>Specialist Assisted Cloud Import</td>
            <td>1 to 2 business days (if requested)</td>
          </tr>
        </tbody>
      </table>

      <h2>3. Technical Requirements for Delivery</h2>
      <p>
        Because Dental OS is a zero-footprint web application, no physical installation or local server hardware is necessary. To receive and operate the Service, clinics only require:
      </p>
      <ul>
        <li>A modern, secure web browser (Google Chrome, Microsoft Edge, Mozilla Firefox, or Apple Safari) with JavaScript enabled.</li>
        <li>A stable broadband or mobile internet connection (sub-50ms cloud latency optimized).</li>
        <li>A valid, accessible email address to receive administrative credentials and two-factor authentication notifications.</li>
      </ul>

      <h2>4. Non-Delivery or Delayed Activation Support</h2>
      <p>
        While 99.8% of transactions are confirmed and provisioned instantaneously, technical network timeouts between banking switches and the gateway can occasionally occur:
      </p>
      <ul>
        <li><strong>Automated Reconciliation (IPN):</strong> If your browser window was closed prematurely before the redirect finished, our server-to-server Instant Payment Notification (IPN) listener reconciles the payment in the background within 10 minutes.</li>
        <li><strong>Manual Activation Desk:</strong> If you have completed payment but find your workspace unactivated after 15 minutes, our 24/7 Digital Fulfillment Desk will manually verify your Basket Reference ID and activate your clinic immediately.</li>
      </ul>

      <div className="calloutBox">
        <div className="calloutBoxTitle">24/7 Digital Fulfillment &amp; Activation Desk</div>
        <div className="calloutBoxText">
          <strong>Email:</strong> <a href="mailto:support@dentalos.com" style={{ color: '#2563eb' }}>support@dentalos.com</a><br />
          <strong>Subject:</strong> Immediate Activation Request - [Your Basket ID]<br />
          <strong>Support Hours:</strong> 24/7 Monitoring for payment-related activation issues
        </div>
      </div>

      <h2>5. Physical Shipments Disclaimer</h2>
      <p>
        Dental OS expressly reiterates that we do not supply, deliver, or handle physical dental instruments, autoclaves, intraoral cameras, dental chairs, or physical medical supplies. All references to &quot;shipping&quot; or &quot;delivery&quot; in our documentation refer strictly to electronic delivery of cloud software licenses and digital services.
      </p>
    </PolicyLayout>
  );
}
