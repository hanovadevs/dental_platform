import React from 'react';
import Link from 'next/link';
import { auth } from '@/lib/auth';
import { LandingNav } from '@/components/landing/landing-nav';
import { FaqAccordion } from '@/components/landing/faq-accordion';
import { ContactForm } from '@/components/landing/contact-form';
import { ProductShowcase } from '@/components/landing/product-showcase';
import styles from './landing.module.css';

export const metadata = {
  title: 'Dental OS — Practice Operating System & Revenue Recovery Platform',
  description:
    'The modern clinical operating system for dental practices. Manage multi-chair appointments, FDI dental charts, treatment plans, billing, and autonomous revenue recovery in one premium platform.',
};

export default async function LandingPage() {
  const session = await auth();
  const isAuthenticated = !!session?.user;

  return (
    <div className={styles.landingWrapper}>
      {/* 1. Header Navigation */}
      <LandingNav isAuthenticated={isAuthenticated} />

      {/* 2. Hero Section */}
      <section className={styles.hero}>
        <div className={styles.container}>
          <div className={styles.heroContent}>
            <h1 className={styles.heroTitle}>
              The Modern Operating System for Dental Practices
            </h1>
            <p className={styles.heroSubtitle}>
              Streamline appointments, FDI clinical charting, treatment plans, billing, and automated patient recall recovery in one unified platform.
            </p>

            <div className={styles.heroCtaGroup}>
              <Link href="/register" className={styles.primaryCta}>
                Register Your Clinic
              </Link>
              <Link href="/login" className={styles.secondaryCta}>
                Login to Clinic
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* 3. Platform Overview Grid */}
      <section className={styles.section} id="overview">
        <div className={styles.container}>
          <div className={styles.sectionHeader}>
            <div className={styles.eyebrow}>Unified Architecture</div>
            <h2 className={styles.sectionTitle}>One Platform. Every Clinical & Revenue Workflow.</h2>
            <p className={styles.sectionSubtitle}>
              Dental OS replaces fragmented software with an intentional, cohesive operating system engineered specifically for dental workflows.
            </p>
          </div>

          <div className={styles.modulesGrid}>
            <div className={styles.moduleCard}>
              <span className={styles.moduleTag}>Module 01</span>
              <h3 className={styles.moduleTitle}>Multi-Chair Calendar</h3>
              <p className={styles.moduleDesc}>
                Visual day and operatory timelines, drag-and-drop chair booking, automated confirmations, and instant status updates.
              </p>
            </div>

            <div className={styles.moduleCard}>
              <span className={styles.moduleTag}>Module 02</span>
              <h3 className={styles.moduleTitle}>Patient Health Records</h3>
              <p className={styles.moduleDesc}>
                Comprehensive medical histories, allergy banners, past appointments, communications logs, and encrypted clinical documents.
              </p>
            </div>

            <div className={styles.moduleCard}>
              <span className={styles.moduleTag}>Module 03</span>
              <h3 className={styles.moduleTitle}>FDI Dental Charting</h3>
              <p className={styles.moduleDesc}>
                Interactive 32-tooth odontogram supporting universal and FDI notations. Visual condition tracking across all tooth surfaces.
              </p>
            </div>

            <div className={styles.moduleCard}>
              <span className={styles.moduleTag}>Module 04</span>
              <h3 className={styles.moduleTitle}>Treatment Plans</h3>
              <p className={styles.moduleDesc}>
                Phased restorative and surgical treatment plans with itemized procedure fee codes and patient acceptance tracking.
              </p>
            </div>

            <div className={styles.moduleCard}>
              <span className={styles.moduleTag}>Module 05</span>
              <h3 className={styles.moduleTitle}>Transparent Invoicing</h3>
              <p className={styles.moduleDesc}>
                One-click invoice issuance, partial payment splits (card, cash, insurance), printable receipts, and automated aging reports.
              </p>
            </div>

            <div className={styles.moduleCard}>
              <span className={styles.moduleTag}>Module 06</span>
              <h3 className={styles.moduleTitle}>Revenue Recovery Engine</h3>
              <p className={styles.moduleDesc}>
                Continuous background scanning across 8 clinical vectors with algorithmic opportunity scoring (0–100) and 1-click outreach.
              </p>
            </div>

            <div className={styles.moduleCard}>
              <span className={styles.moduleTag}>Module 07</span>
              <h3 className={styles.moduleTitle}>Omnichannel Recalls</h3>
              <p className={styles.moduleDesc}>
                Automated recall notifications across SMS, WhatsApp, and Email with strict TCPA consent compliance and audit trails.
              </p>
            </div>

            <div className={styles.moduleCard}>
              <span className={styles.moduleTag}>Module 08</span>
              <h3 className={styles.moduleTitle}>Practice Operations</h3>
              <p className={styles.moduleDesc}>
                Lab case tracking, clinical consumables inventory management, location controls, and role-based staff permissions.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 5. Strategic Conversion Injection 1 */}
      <section className={styles.ctaInjection}>
        <div className={styles.container}>
          <div className={styles.ctaInjectionContent}>
            <div>
              <h3 className={styles.ctaInjectionTitle}>Ready to eliminate revenue leakage in your clinic?</h3>
              <p className={styles.ctaInjectionSub}>Join forward-thinking dental practices streamlining operations today.</p>
            </div>
            <div className={styles.ctaInjectionActions}>
              <Link href="/register" className={styles.ctaLightBtn}>
                Register Your Dental Clinic Now
              </Link>
              <Link href="/login" className={styles.ctaGhostLink}>
                Already have a clinic? Login
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* 6. Smart Scheduling Deep Dive */}
      <section className={styles.featureSection} id="scheduling">
        <div className={styles.container}>
          <div className={styles.featureGrid}>
            <div className={styles.featureTextCol}>
              <div className={styles.eyebrow}>Operational Velocity</div>
              <h2 className={styles.featureTitle}>Fast, Multi-Chair Operatory Scheduling</h2>
              <p className={styles.featureParagraph}>
                Your reception desk is the command center of clinic revenue. Dental OS replaces slow, clunky calendar software with a rapid operatory timeline that eliminates scheduling gaps.
              </p>
              <ul className={styles.featureList}>
                <li className={styles.featureListItem}>
                  <span className={styles.checkIndicator}>✓</span>
                  <span><strong>Multi-Chair Timeline:</strong> Real-time operatory columns (Chair 1, Chair 2, Hygiene Suite) with clear doctor allocation and chair utilization metrics.</span>
                </li>
                <li className={styles.featureListItem}>
                  <span className={styles.checkIndicator}>✓</span>
                  <span><strong>Visual Stage Tracking:</strong> Instantly see whether a patient is Booked, Arrived in waiting, In-Chair with the clinician, or Completed.</span>
                </li>
                <li className={styles.featureListItem}>
                  <span className={styles.checkIndicator}>✓</span>
                  <span><strong>Automated Confirmation Loops:</strong> Reduces no-shows by automatically verifying patient attendance via SMS and email 48 hours prior.</span>
                </li>
                <li className={styles.featureListItem}>
                  <span className={styles.checkIndicator}>✓</span>
                  <span><strong>Keyboard-First Navigation:</strong> Press Cmd+K to jump to any patient, search upcoming appointments, or book a slot in under 5 seconds.</span>
                </li>
              </ul>
            </div>

            <div className={styles.featureVisualCol}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', borderBottom: '1px solid #e2e8f0', paddingBottom: '12px' }}>
                <strong style={{ fontSize: '0.95rem', color: '#0f172a' }}>Daily Operatory Schedule</strong>
                <span style={{ fontSize: '0.75rem', color: '#0284c7', background: '#e0f2fe', padding: '3px 8px', borderRadius: '6px', fontWeight: 600 }}>Chair Utilization: 94%</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div style={{ padding: '12px', background: '#f8fafc', borderLeft: '4px solid #0284c7', borderRadius: '8px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: '#64748b' }}>
                    <span>09:00 - 10:30 AM • Chair 1</span>
                    <span style={{ color: '#16a34a', fontWeight: 600 }}>In-Chair</span>
                  </div>
                  <strong style={{ fontSize: '0.9rem', color: '#0f172a' }}>Eleanor Vance — Crown Preparation (#14)</strong>
                  <div style={{ fontSize: '0.8rem', color: '#475569', marginTop: '2px' }}>Provider: Dr. Katherine Reyes • Assistant: Marcus</div>
                </div>

                <div style={{ padding: '12px', background: '#f8fafc', borderLeft: '4px solid #10b981', borderRadius: '8px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: '#64748b' }}>
                    <span>10:30 - 11:15 AM • Chair 2</span>
                    <span style={{ color: '#0284c7', fontWeight: 600 }}>Arrived in Waiting</span>
                  </div>
                  <strong style={{ fontSize: '0.9rem', color: '#0f172a' }}>David Morales — Adult Prophylaxis & Exam</strong>
                  <div style={{ fontSize: '0.8rem', color: '#475569', marginTop: '2px' }}>Provider: Nurse Sarah • Hygiene Suite</div>
                </div>

                <div style={{ padding: '12px', background: '#f8fafc', borderLeft: '4px solid #f59e0b', borderRadius: '8px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: '#64748b' }}>
                    <span>11:30 - 12:45 PM • Chair 1</span>
                    <span style={{ color: '#64748b', fontWeight: 600 }}>Confirmed (SMS)</span>
                  </div>
                  <strong style={{ fontSize: '0.9rem', color: '#0f172a' }}>Sophia Chen — Surgical Implant Placement (#19)</strong>
                  <div style={{ fontSize: '0.8rem', color: '#475569', marginTop: '2px' }}>Provider: Dr. Katherine Reyes • Surgical Suite</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 7. Dental Charting Deep Dive */}
      <section className={styles.sectionAlt} id="charting">
        <div className={styles.container}>
          <div className={styles.featureGrid}>
            <div className={styles.featureVisualCol}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', borderBottom: '1px solid #e2e8f0', paddingBottom: '10px' }}>
                <div>
                  <strong style={{ fontSize: '0.95rem', color: '#0f172a' }}>Odontogram: Eleanor Vance</strong>
                  <div style={{ fontSize: '0.75rem', color: '#dc2626', fontWeight: 600 }}>Medical Alert: Penicillin Allergy</div>
                </div>
                <span style={{ fontSize: '0.75rem', color: '#475569', background: '#f1f5f9', padding: '4px 8px', borderRadius: '6px' }}>FDI / Universal</span>
              </div>

              {/* Tooth Chart Representation */}
              <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '14px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textAlign: 'center' }}>Maxillary Arch (Upper)</span>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(8, 1fr)', gap: '6px' }}>
                  {[18, 17, 16, 15, 14, 13, 12, 11].map((t) => (
                    <div key={t} style={{ background: '#ffffff', border: t === 14 ? '2px solid #eab308' : '1px solid #cbd5e1', borderRadius: '6px', padding: '4px', textAlign: 'center' }}>
                      <div style={{ fontSize: '0.65rem', fontWeight: 700, color: '#475569' }}>#{t}</div>
                      <div style={{ width: '14px', height: '18px', background: t === 14 ? '#fef08a' : t === 16 ? '#bae6fd' : '#ffffff', border: '1px solid #94a3b8', margin: '2px auto', borderRadius: '4px' }} />
                      <div style={{ fontSize: '0.55rem', color: '#64748b' }}>{t === 14 ? 'Crown' : t === 16 ? 'Comp' : 'OK'}</div>
                    </div>
                  ))}
                </div>

                <div style={{ borderTop: '1px dashed #cbd5e1', paddingTop: '10px', marginTop: '4px' }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#0f172a', display: 'block', marginBottom: '4px' }}>Diagnosed Clinical Conditions</span>
                  <div style={{ fontSize: '0.8rem', color: '#475569', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <div>• <strong>Tooth #14:</strong> Extensive mesial-occlusal decay. Full coverage Zirconia crown advised.</div>
                    <div>• <strong>Tooth #16:</strong> Previous composite restoration intact. Margins sound.</div>
                  </div>
                </div>
              </div>
            </div>

            <div className={styles.featureTextCol}>
              <div className={styles.eyebrow}>High-Precision Clinical Care</div>
              <h2 className={styles.featureTitle}>Interactive FDI Dental Charting & Electronic Records</h2>
              <p className={styles.featureParagraph}>
                Clinicians need software that gets out of their way. Chart conditions at tooth-level with precise surface mapping, visual condition indicators, and medical history integration.
              </p>
              <ul className={styles.featureList}>
                <li className={styles.featureListItem}>
                  <span className={styles.checkIndicator}>✓</span>
                  <span><strong>Complete 32-Tooth Visual Odontogram:</strong> Full anatomical upper and lower arch mapping supporting adult dentition and primary pedodontic numbering.</span>
                </li>
                <li className={styles.featureListItem}>
                  <span className={styles.checkIndicator}>✓</span>
                  <span><strong>Surface-Level Precision:</strong> Record mesial, occlusal, distal, facial, and lingual findings with single-click diagnostic tagging.</span>
                </li>
                <li className={styles.featureListItem}>
                  <span className={styles.checkIndicator}>✓</span>
                  <span><strong>Instant Treatment Plan Conversion:</strong> Diagnosed chart conditions convert automatically into line-item treatment proposals for the patient.</span>
                </li>
                <li className={styles.featureListItem}>
                  <span className={styles.checkIndicator}>✓</span>
                  <span><strong>Secure Audit Trail:</strong> Complete timestamped clinical notes, procedure records, and tamper-resistant documentation.</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* 8. Treatment Plans & Transparent Billing */}
      <section className={styles.featureSection}>
        <div className={styles.container}>
          <div className={styles.featureGrid}>
            <div className={styles.featureTextCol}>
              <div className={styles.eyebrow}>Financial Transparency</div>
              <h2 className={styles.featureTitle}>Clear Treatment Acceptance & Modern Invoicing</h2>
              <p className={styles.featureParagraph}>
                Patients accept treatment when fees are transparent and easy to understand. Dental OS produces itemized, phased treatment proposals that convert diagnoses into accepted care.
              </p>
              <ul className={styles.featureList}>
                <li className={styles.featureListItem}>
                  <span className={styles.checkIndicator}>✓</span>
                  <span><strong>Phased Treatment Plans:</strong> Group complex care into logical stages (e.g. Phase 1: Urgent Endodontics, Phase 2: Crown & Aesthetic Restorations).</span>
                </li>
                <li className={styles.featureListItem}>
                  <span className={styles.checkIndicator}>✓</span>
                  <span><strong>Itemized Fee Schedules:</strong> Automatically calculates procedure fees, estimated insurance contributions, and out-of-pocket patient balances.</span>
                </li>
                <li className={styles.featureListItem}>
                  <span className={styles.checkIndicator}>✓</span>
                  <span><strong>Flexible Payment Recording:</strong> Split payments across cash, credit cards, insurance checks, and online transfers with instant balance updates.</span>
                </li>
                <li className={styles.featureListItem}>
                  <span className={styles.checkIndicator}>✓</span>
                  <span><strong>Professional Receipts & Invoices:</strong> Generate clean branded invoices and patient statements ready for digital distribution or printing.</span>
                </li>
              </ul>
            </div>

            <div className={styles.featureVisualCol}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', borderBottom: '1px solid #e2e8f0', paddingBottom: '10px' }}>
                <strong style={{ fontSize: '0.95rem', color: '#0f172a' }}>Treatment Proposal & Ledger</strong>
                <span style={{ fontSize: '0.75rem', color: '#15803d', background: '#dcfce7', padding: '3px 8px', borderRadius: '6px', fontWeight: 600 }}>Proposal Accepted</span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', background: '#f8fafc', borderRadius: '6px', fontSize: '0.85rem' }}>
                  <span>D2740 • Porcelain/Ceramic Crown (#14)</span>
                  <strong>$1,450.00</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', background: '#f8fafc', borderRadius: '6px', fontSize: '0.85rem' }}>
                  <span>D2950 • Core Buildup with Pins (#14)</span>
                  <strong>$350.00</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', background: '#f8fafc', borderRadius: '6px', fontSize: '0.85rem' }}>
                  <span>D0140 • Limited Oral Evaluation</span>
                  <strong>$120.00</strong>
                </div>

                <div style={{ borderTop: '1px solid #cbd5e1', paddingTop: '10px', marginTop: '6px', display: 'flex', flexDirection: 'column', gap: '4px', textAlign: 'right', fontSize: '0.85rem' }}>
                  <div>Total Treatment Value: <strong>$1,920.00</strong></div>
                  <div style={{ color: '#0284c7' }}>Insurance Estimated Coverage: <strong>-$800.00</strong></div>
                  <div style={{ color: '#16a34a' }}>Patient Initial Deposit: <strong>-$620.00</strong></div>
                  <div style={{ fontSize: '1.05rem', fontWeight: 700, color: '#0f172a', borderTop: '1px solid #e2e8f0', paddingTop: '6px' }}>
                    Remaining Balance Due: <span style={{ color: '#0284c7' }}>$500.00</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 9. Revenue Recovery Engine Deep Dive */}
      <section className={styles.sectionAlt} id="revenue">
        <div className={styles.container}>
          <div className={styles.featureGrid}>
            <div className={styles.featureVisualCol}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', borderBottom: '1px solid #e2e8f0', paddingBottom: '12px' }}>
                <div>
                  <strong style={{ fontSize: '0.95rem', color: '#0f172a' }}>Active Opportunity Queue</strong>
                  <div style={{ fontSize: '0.75rem', color: '#16a34a', fontWeight: 600 }}>8 Potential Opportunities Detected Today</div>
                </div>
                <span style={{ fontSize: '0.75rem', color: '#0369a1', background: '#bae6fd', padding: '4px 8px', borderRadius: '6px', fontWeight: 700 }}>Scoring Active</span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div style={{ border: '1px solid #fee2e2', background: '#fff5f5', borderRadius: '10px', padding: '12px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                    <span style={{ fontSize: '0.7rem', fontWeight: 700, color: '#b91c1c', background: '#fee2e2', padding: '2px 6px', borderRadius: '4px' }}>Priority 96/100</span>
                    <strong style={{ fontSize: '0.9rem', color: '#16a34a' }}>$3,400 Value</strong>
                  </div>
                  <strong style={{ fontSize: '0.85rem', color: '#0f172a' }}>Robert Langdon — Unaccepted Quadrant 2 Bridge</strong>
                  <p style={{ margin: '4px 0 0 0', fontSize: '0.75rem', color: '#64748b' }}>Diagnosed 21 days ago • High clinical urgency • 1-click recall recommended</p>
                </div>

                <div style={{ border: '1px solid #e0f2fe', background: '#f0f9ff', borderRadius: '10px', padding: '12px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                    <span style={{ fontSize: '0.7rem', fontWeight: 700, color: '#0369a1', background: '#bae6fd', padding: '2px 6px', borderRadius: '4px' }}>Priority 89/100</span>
                    <strong style={{ fontSize: '0.9rem', color: '#16a34a' }}>$420 Value</strong>
                  </div>
                  <strong style={{ fontSize: '0.85rem', color: '#0f172a' }}>Claire Henderson — Overdue 6-Month Recall</strong>
                  <p style={{ margin: '4px 0 0 0', fontSize: '0.75rem', color: '#64748b' }}>Hygiene period due 3 weeks ago • Automated recall SMS ready</p>
                </div>
              </div>
            </div>

            <div className={styles.featureTextCol}>
              <div className={styles.eyebrow}>The Core Differentiator</div>
              <h2 className={styles.featureTitle}>The Autonomous Revenue Recovery Engine</h2>
              <p className={styles.featureParagraph}>
                This is what sets Dental OS apart from all generic dental management tools. The platform runs a continuous intelligence engine that hunts for leaked revenue and presents high-probability recovery actions.
              </p>
              <ul className={styles.featureList}>
                <li className={styles.featureListItem}>
                  <span className={styles.checkIndicator}>✓</span>
                  <span><strong>8 Clinical Scanning Vectors:</strong> Unaccepted treatments, overdue hygiene recalls, unbooked consultations, cancelled slots, inactive patients, and aged receivables.</span>
                </li>
                <li className={styles.featureListItem}>
                  <span className={styles.checkIndicator}>✓</span>
                  <span><strong>Algorithmic Opportunity Scoring:</strong> Each potential recovery is scored from 0 to 100 based on diagnosis recency, patient visit history, and clinical urgency.</span>
                </li>
                <li className={styles.featureListItem}>
                  <span className={styles.checkIndicator}>✓</span>
                  <span><strong>One-Click Patient Reactivation:</strong> Launch personalized recall messages, phone call queues, or booking links with zero manual copy-pasting.</span>
                </li>
                <li className={styles.featureListItem}>
                  <span className={styles.checkIndicator}>✓</span>
                  <span><strong>Causal Revenue Attribution:</strong> Accurately tracks every dollar earned directly from recovery outreach so you measure true return on investment.</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* 10. Strategic Conversion Injection 2 */}
      <section className={styles.ctaInjection}>
        <div className={styles.container}>
          <div className={styles.ctaInjectionContent}>
            <div>
              <h3 className={styles.ctaInjectionTitle}>Recover up to $15,000+ in missed clinic revenue each month.</h3>
              <p className={styles.ctaInjectionSub}>Start managing your appointments, charts, and revenue in one unified operating system.</p>
            </div>
            <div className={styles.ctaInjectionActions}>
              <Link href="/register" className={styles.ctaLightBtn}>
                Register Your Dental Clinic Now
              </Link>
              <Link href="/login" className={styles.ctaGhostLink}>
                Login to Your Clinic
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* 11. Recalls, Follow-ups, and Communication */}
      <section className={styles.featureSection}>
        <div className={styles.container}>
          <div className={styles.featureGrid}>
            <div className={styles.featureTextCol}>
              <div className={styles.eyebrow}>Patient Retention</div>
              <h2 className={styles.featureTitle}>Omnichannel Recalls & Voice Calling Interface</h2>
              <p className={styles.featureParagraph}>
                Keep patients connected to their treatment plans through coordinated automated outreach that respects clinical boundaries and communication regulations.
              </p>
              <ul className={styles.featureList}>
                <li className={styles.featureListItem}>
                  <span className={styles.checkIndicator}>✓</span>
                  <span><strong>Multi-Channel Reach:</strong> Deliver reminders and recall prompts across SMS, WhatsApp, and professional email templates.</span>
                </li>
                <li className={styles.featureListItem}>
                  <span className={styles.checkIndicator}>✓</span>
                  <span><strong>AI Voice Calling Agent Interface:</strong> Outbound calling automation to confirm appointments and fill empty hygiene chairs without receptionist burnout.</span>
                </li>
                <li className={styles.featureListItem}>
                  <span className={styles.checkIndicator}>✓</span>
                  <span><strong>Clinical Safety Guardrails:</strong> Strict execution constraints: zero clinical medical advice, pre-approved scripts only, and instant escalation to staff.</span>
                </li>
                <li className={styles.featureListItem}>
                  <span className={styles.checkIndicator}>✓</span>
                  <span><strong>TCPA & Consent Compliance:</strong> Complete communication consent management with explicit opt-out handling and delivery logs.</span>
                </li>
              </ul>
            </div>

            <div className={styles.featureVisualCol}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', borderBottom: '1px solid #e2e8f0', paddingBottom: '10px' }}>
                <strong style={{ fontSize: '0.95rem', color: '#0f172a' }}>Communication & Voice Queue</strong>
                <span style={{ fontSize: '0.75rem', color: '#15803d', background: '#dcfce7', padding: '3px 8px', borderRadius: '6px', fontWeight: 600 }}>Consent Verified</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div style={{ padding: '12px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: '#64748b' }}>
                    <span>SMS Delivery • 2 min ago</span>
                    <span style={{ color: '#16a34a', fontWeight: 600 }}>Delivered</span>
                  </div>
                  <strong style={{ fontSize: '0.85rem', color: '#0f172a', marginTop: '2px', display: 'block' }}>Recall Prompt: 6-Month Hygiene Due</strong>
                  <p style={{ margin: '2px 0 0 0', fontSize: '0.75rem', color: '#475569' }}>&quot;Hi Eleanor, Dr. Reyes noticed your 6-month hygiene recall is due. Tap here to select your preferred chair slot.&quot;</p>
                </div>

                <div style={{ padding: '12px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: '#64748b' }}>
                    <span>Voice Agent Recall • Completed</span>
                    <span style={{ color: '#0284c7', fontWeight: 600 }}>Booked Appointment</span>
                  </div>
                  <strong style={{ fontSize: '0.85rem', color: '#0f172a', marginTop: '2px', display: 'block' }}>Call Task: David Morales — Hygiene Booking</strong>
                  <p style={{ margin: '2px 0 0 0', fontSize: '0.75rem', color: '#475569' }}>Call duration 1m 18s • Accepted Thursday 10:15 AM slot • No clinical advice provided</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 12. How It Works / 4-Step Onboarding */}
      <section className={styles.sectionAlt} id="how-it-works">
        <div className={styles.container}>
          <div className={styles.sectionHeader}>
            <div className={styles.eyebrow}>Rapid Adoption</div>
            <h2 className={styles.sectionTitle}>Up and Running in Under 15 Minutes</h2>
            <p className={styles.sectionSubtitle}>
              A clinic should not need an IT technician. Setting up your practice in Dental OS is fast, intuitive, and completely self-guided.
            </p>
          </div>

          <div className={styles.stepsGrid}>
            <div className={styles.stepCard}>
              <div className={styles.stepNumber}>1</div>
              <h3 className={styles.stepTitle}>Register Your Clinic</h3>
              <p className={styles.stepDesc}>
                Create your practice account online in 60 seconds. No credit card or complex contract required to begin.
              </p>
            </div>

            <div className={styles.stepCard}>
              <div className={styles.stepNumber}>2</div>
              <h3 className={styles.stepTitle}>Configure Chairs & Staff</h3>
              <p className={styles.stepDesc}>
                Add your physical clinic locations, surgical chairs, and team members with appropriate clinical roles.
              </p>
            </div>

            <div className={styles.stepCard}>
              <div className={styles.stepNumber}>3</div>
              <h3 className={styles.stepTitle}>Import Records & Fees</h3>
              <p className={styles.stepDesc}>
                Bring in existing patient lists via CSV or start fresh with built-in standard dental procedure fee schedules.
              </p>
            </div>

            <div className={styles.stepCard}>
              <div className={styles.stepNumber}>4</div>
              <h3 className={styles.stepTitle}>Recover Leaked Care</h3>
              <p className={styles.stepDesc}>
                Begin scheduling appointments while the revenue recovery engine continuously surfaces unbooked clinical care.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 13. Interactive Product Walkthrough & Showcase */}
      <section className={styles.section} id="showcase">
        <div className={styles.container}>
          <div className={styles.sectionHeader}>
            <div className={styles.eyebrow}>Live Product Walkthrough</div>
            <h2 className={styles.sectionTitle}>Experience the Dental OS Workspace</h2>
            <p className={styles.sectionSubtitle}>
              Explore the actual interfaces built for doctors and clinic receptionists. Click any tab below to inspect live simulated views.
            </p>
          </div>

          <ProductShowcase />
        </div>
      </section>

      {/* 14. Why Clinics Choose Dental OS */}
      <section className={styles.sectionAlt}>
        <div className={styles.container}>
          <div className={styles.sectionHeader}>
            <div className={styles.eyebrow}>The Modern Standard</div>
            <h2 className={styles.sectionTitle}>Why Leading Practices Choose Dental OS</h2>
            <p className={styles.sectionSubtitle}>
              See how an integrated practice operating system outperforms fragmented software and legacy on-premise tools.
            </p>
          </div>

          <div className={styles.comparisonGrid}>
            <div className={styles.comparisonCard}>
              <h3 className={styles.comparisonTitle}>Single Source of Truth</h3>
              <p className={styles.comparisonDesc}>
                Eliminates the chaos of having separate apps for scheduling, charting, invoicing, and patient messaging. Everything connects seamlessly in one PostgreSQL database.
              </p>
            </div>

            <div className={styles.comparisonCard}>
              <h3 className={styles.comparisonTitle}>Revenue-First Architecture</h3>
              <p className={styles.comparisonDesc}>
                Traditional dental software is merely a passive file cabinet. Dental OS actively works for your clinic, surfacing thousands of dollars in unbooked treatment each week.
              </p>
            </div>

            <div className={styles.comparisonCard}>
              <h3 className={styles.comparisonTitle}>Sub-50ms Cloud Speed</h3>
              <p className={styles.comparisonDesc}>
                Hosted on modern serverless architecture with connection pooling. Pages load instantly with keyboard-first workflows that save receptionists hours every week.
              </p>
            </div>

            <div className={styles.comparisonCard}>
              <h3 className={styles.comparisonTitle}>Zero IT Maintenance</h3>
              <p className={styles.comparisonDesc}>
                No local server towers sitting in a closet, no manual nightly backup drives, and no technician call-out fees. Automatic secure updates delivered in the cloud.
              </p>
            </div>

            <div className={styles.comparisonCard}>
              <h3 className={styles.comparisonTitle}>Calm, Professional UI</h3>
              <p className={styles.comparisonDesc}>
                Designed around the principles of clinical elegance. No neon gradients, no confusing icon walls, and no visual clutter. Pure focus on patient care and efficiency.
              </p>
            </div>

            <div className={styles.comparisonCard}>
              <h3 className={styles.comparisonTitle}>Data Portability Guarantee</h3>
              <p className={styles.comparisonDesc}>
                Your clinic owns your data. Full GDPR and HIPAA portability with one-click export of patients, treatments, invoices, and clinical notes at any time.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 15. Frequently Asked Questions */}
      <section className={styles.section} id="faq">
        <div className={styles.containerNarrow}>
          <div className={styles.sectionHeader}>
            <div className={styles.eyebrow}>Answers for Practices</div>
            <h2 className={styles.sectionTitle}>Frequently Asked Questions</h2>
            <p className={styles.sectionSubtitle}>
              Everything you need to know about adopting Dental OS in your practice.
            </p>
          </div>

          <FaqAccordion />
        </div>
      </section>

      {/* 16. Clinic Inquiry / Contact Form */}
      <section className={styles.sectionAlt} id="contact">
        <div className={styles.containerNarrow}>
          <div className={styles.sectionHeader}>
            <div className={styles.eyebrow}>Connect with Specialists</div>
            <h2 className={styles.sectionTitle}>Request a Practice Consultation</h2>
            <p className={styles.sectionSubtitle}>
              Have questions about multi-location support, data migration, or custom clinical workflows? Send our dental practice specialists an inquiry below.
            </p>
          </div>

          <ContactForm />
        </div>
      </section>

      {/* 17. Final High-Conviction CTA Section */}
      <section className={styles.finalCta}>
        <div className={styles.container}>
          <div className={styles.finalCtaBox}>
            <div className={styles.eyebrow}>Modernize Today</div>
            <h2 className={styles.finalCtaTitle}>
              Transform your clinic operations. Stop losing patients and revenue.
            </h2>
            <p className={styles.finalCtaSubtitle}>
              Join dental practices recovering thousands in unbooked care while giving their clinicians and front desk the modern software they deserve.
            </p>

            <div className={styles.heroCtaGroup} style={{ marginTop: '12px' }}>
              <Link href="/register" className={styles.primaryCta}>
                Register Your Dental Clinic Now
              </Link>
              <Link href="/login" className={styles.secondaryCta}>
                Already have a clinic? Login
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* 18. Footer */}
      <footer className={styles.footer}>
        <div className={styles.container}>
          <div className={styles.footerGrid}>
            <div className={styles.footerBrandCol}>
              <div className={styles.footerLogoRow}>
                <img
                  src="/logo.png"
                  alt="Dental OS"
                  className={styles.footerLogoImg}
                />
                <span className={styles.footerBrandName}>Dental OS</span>
              </div>
              <p className={styles.footerTagline}>
                Enterprise dental practice management, interactive clinical charting, and autonomous revenue recovery platform.
              </p>
            </div>

            <div className={styles.footerCol}>
              <h4 className={styles.footerColTitle}>Platform</h4>
              <ul className={styles.footerLinks}>
                <li><a href="#overview" className={styles.footerLink}>Overview</a></li>
                <li><a href="#modules" className={styles.footerLink}>All Modules</a></li>
                <li><a href="#scheduling" className={styles.footerLink}>Chair Scheduling</a></li>
                <li><a href="#charting" className={styles.footerLink}>Dental Charting</a></li>
                <li><a href="#revenue" className={styles.footerLink}>Revenue Engine</a></li>
              </ul>
            </div>

            <div className={styles.footerCol}>
              <h4 className={styles.footerColTitle}>Resources</h4>
              <ul className={styles.footerLinks}>
                <li><a href="#how-it-works" className={styles.footerLink}>How It Works</a></li>
                <li><a href="#showcase" className={styles.footerLink}>Product Showcase</a></li>
                <li><a href="#faq" className={styles.footerLink}>Practice FAQ</a></li>
                <li><a href="#contact" className={styles.footerLink}>Contact Practice Team</a></li>
              </ul>
            </div>

            <div className={styles.footerCol}>
              <h4 className={styles.footerColTitle}>Clinic Portals</h4>
              <ul className={styles.footerLinks}>
                <li><Link href="/login" className={styles.footerLink}>Clinic Login</Link></li>
                <li><Link href="/register" className={styles.footerLink}>Register New Clinic</Link></li>
                <li><Link href="/dashboard" className={styles.footerLink}>Practice Dashboard</Link></li>
              </ul>
            </div>
          </div>

          <div className={styles.footerBottom}>
            <div>
              © {new Date().getFullYear()} Dental OS Platform. Built for modern dental practices. All rights reserved.
            </div>
            <div className={styles.footerBadges}>
              <span className={styles.footerBadge}>HIPAA Compliant Architecture</span>
              <span className={styles.footerBadge}>TLS 1.3 Encryption</span>
              <span className={styles.footerBadge}>GDPR Data Portability</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
