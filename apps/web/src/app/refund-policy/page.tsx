import type { Metadata } from 'next';
import { PolicyLayout } from '@/components/legal/policy-layout';

export const metadata: Metadata = {
  title: 'Return & Refund Policy — Dental OS',
  description: 'Understand the cancellation, return, and refund policies for Dental OS clinic registration fees and subscription licenses.',
};

export default function RefundPolicyPage() {
  return (
    <PolicyLayout
      activePolicy="refund"
      title="Return & Refund Policy"
      subtitle="Clear, fair, and transparent guidelines regarding clinic registration fees, duplicate billing protection, and subscription refund eligibility."
      lastUpdated="September 2026"
    >
      <div style={{ marginBottom: '24px' }}>
        <p>
          At <strong>Dental OS</strong>, we are committed to delivering a reliable, high-performance practice operating system for dental clinics. Because Dental OS is a digital Software-as-a-Service (SaaS) platform where cloud tenant infrastructure is provisioned immediately upon registration, standard physical goods return rules do not apply. This Return &amp; Refund Policy outlines the specific conditions under which refunds and fee reversals are granted.
        </p>
      </div>

      <div className="calloutBox calloutSuccess">
        <div className="calloutBoxTitle">7-Day Technical Satisfaction Guarantee</div>
        <div className="calloutBoxText">
          If your clinic experiences a verified infrastructure outage or technical failure on Dental OS&apos;s systems preventing you from using the core platform within the first 7 days following registration, and our engineering team cannot resolve the defect within 5 business days of your written report, you are entitled to a <strong>100% full refund of your registration fee</strong>.
        </div>
      </div>

      <h2>1. Clinic Registration Fee</h2>
      <p>
        The one-time clinic registration fee covers automated cloud infrastructure provisioning, dedicated multi-tenant database partitioning, and onboarding verification.
      </p>
      <ul>
        <li><strong>Standard Status:</strong> The clinic registration fee is generally non-refundable once the clinic workspace has been successfully activated and accessed by the clinic administrator.</li>
        <li><strong>Exception — Pre-Activation Cancellation:</strong> If you submit a registration fee payment but decide to cancel before configuring your clinic organization, chairs, or patients, you may request a refund within <strong>48 hours</strong> of transaction completion.</li>
      </ul>

      <h2>2. Erroneous &amp; Duplicate Charges</h2>
      <p>
        We maintain a zero-tolerance policy for duplicate or erroneous billing:
      </p>
      <ul>
        <li><strong>Automatic Reconciliation:</strong> If a network failure, gateway timeout, or double-click results in duplicate charges for the same registration basket or subscription cycle, our automated billing engine reconciles and flags the duplicate.</li>
        <li><strong>Immediate Reversal:</strong> Confirmed duplicate charges are reversed in full within <strong>2 to 3 business days</strong> without any administrative processing deductions.</li>
      </ul>

      <h2>3. Recurring Subscriptions &amp; Plan Cancellations</h2>
      <p>
        Dental OS operates on monthly or annual cloud subscriptions:
      </p>
      <ul>
        <li><strong>Cancel Anytime:</strong> Practice administrators can cancel their recurring subscription at any time directly through the <em>Settings &gt; Subscription</em> portal in their workspace.</li>
        <li><strong>Billing Cycle Completion:</strong> Upon cancellation, your clinic maintains full access to all features and patient records until the end of your current paid billing period. No further recurring charges will occur.</li>
        <li><strong>Pro-Ration:</strong> Subscription fees for partially elapsed months are generally non-refundable unless required by applicable local consumer law.</li>
      </ul>

      <h2>4. Non-Refundable Scenarios</h2>
      <p>
        Refunds cannot be issued under the following circumstances:
      </p>
      <ul>
        <li>Change of mind or internal clinic staffing changes after the clinic organization has been configured and active clinical charting/patient records have been created.</li>
        <li>Accounts terminated or suspended due to a material violation of our Terms &amp; Conditions (e.g., fraud, unauthorized sharing of credentials, or illegal clinical practice).</li>
        <li>Downtime or service disruption caused by the customer&apos;s own local internet service provider (ISP), local hardware malfunction, or third-party computer configuration.</li>
      </ul>

      <h2>5. Refund Processing Timelines &amp; Methods</h2>
      <table className="policyTable">
        <thead>
          <tr>
            <th>Payment Channel</th>
            <th>Issuing Provider</th>
            <th>Estimated Reversal Timeline</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><strong>Debit / Credit Card</strong> (Visa / Mastercard)</td>
            <td>Premier PayFast Gateway / SBP Clearing</td>
            <td>5 to 10 Business Days</td>
          </tr>
          <tr>
            <td><strong>Direct Bank Account / Raast</strong></td>
            <td>1Link / Interbank Clearing</td>
            <td>3 to 7 Business Days</td>
          </tr>
          <tr>
            <td><strong>Mobile Wallets</strong> (Easypaisa / JazzCash)</td>
            <td>Premier PayFast / Microfinance Bank</td>
            <td>2 to 5 Business Days</td>
          </tr>
        </tbody>
      </table>
      <p>
        <em>Note: Reversals are processed strictly to the original payment instrument used during checkout. In compliance with State Bank of Pakistan anti-money laundering (AML) guidelines, we cannot issue refunds in cash or to an unrelated third-party bank account.</em>
      </p>

      <h2>6. How to Submit a Refund Request</h2>
      <p>
        To request a refund under the qualifying conditions outlined above, please submit a written ticket to our billing desk:
      </p>
      <div className="calloutBox">
        <div className="calloutBoxTitle">Refund &amp; Billing Review Desk</div>
        <div className="calloutBoxText">
          <strong>Email:</strong> <a href="mailto:support@dentalos.com" style={{ color: '#2563eb' }}>support@dentalos.com</a> (or <a href="mailto:billing@dentalos.com" style={{ color: '#2563eb' }}>billing@dentalos.com</a>)<br />
          <strong>Required Details to Include:</strong>
          <ol style={{ margin: '8px 0 0', paddingLeft: '20px' }}>
            <li>Registered Clinic Name and Administrator Email</li>
            <li>Basket Reference ID (e.g. <code>CLINIC-REG-...</code>) or PayFast Transaction ID</li>
            <li>Date and Amount of Transaction (in PKR)</li>
            <li>Clear explanation of the technical issue or reason for request</li>
          </ol>
        </div>
      </div>
      <p>
        Our financial review team will acknowledge your request within <strong>24 business hours</strong> and notify you of the formal determination within 3 business days.
      </p>
    </PolicyLayout>
  );
}
