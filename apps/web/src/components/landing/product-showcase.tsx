'use client';

import React, { useState } from 'react';
import styles from './product-showcase.module.css';

type ShowcaseTab = 'pulse' | 'calendar' | 'chart' | 'billing' | 'revenue';

export function ProductShowcase() {
  const [activeTab, setActiveTab] = useState<ShowcaseTab>('pulse');

  return (
    <div className={styles.showcaseWrapper}>
      {/* Navigation Tab Bar */}
      <div className={styles.tabBar} role="tablist" aria-label="Product Showcase Modules">
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'pulse'}
          className={`${styles.tabBtn} ${activeTab === 'pulse' ? styles.tabActive : ''}`}
          onClick={() => setActiveTab('pulse')}
        >
          Clinic Pulse
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'calendar'}
          className={`${styles.tabBtn} ${activeTab === 'calendar' ? styles.tabActive : ''}`}
          onClick={() => setActiveTab('calendar')}
        >
          Chair Scheduling
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'chart'}
          className={`${styles.tabBtn} ${activeTab === 'chart' ? styles.tabActive : ''}`}
          onClick={() => setActiveTab('chart')}
        >
          FDI Dental Charting
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'billing'}
          className={`${styles.tabBtn} ${activeTab === 'billing' ? styles.tabActive : ''}`}
          onClick={() => setActiveTab('billing')}
        >
          Treatment & Billing
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'revenue'}
          className={`${styles.tabBtn} ${activeTab === 'revenue' ? styles.tabActive : ''}`}
          onClick={() => setActiveTab('revenue')}
        >
          Revenue Recovery Engine
        </button>
      </div>

      {/* Product Mockup Window Frame */}
      <div className={styles.windowFrame}>
        {/* Window Chrome / Titlebar */}
        <div className={styles.windowTitleBar}>
          <div className={styles.windowDots}>
            <span className={styles.dotRed} />
            <span className={styles.dotYellow} />
            <span className={styles.dotGreen} />
          </div>
          <div className={styles.windowUrl}>
            https://app.dentalos.cloud/demo-practice/{activeTab}
          </div>
          <div className={styles.statusBadge}>Live Production Demo</div>
        </div>

        {/* Dynamic Screen Content */}
        <div className={styles.windowBody}>
          {activeTab === 'pulse' && <PulsePreview />}
          {activeTab === 'calendar' && <CalendarPreview />}
          {activeTab === 'chart' && <ChartPreview />}
          {activeTab === 'billing' && <BillingPreview />}
          {activeTab === 'revenue' && <RevenuePreview />}
        </div>
      </div>
    </div>
  );
}

function PulsePreview() {
  return (
    <div className={styles.screenContent}>
      <div className={styles.screenHeader}>
        <div>
          <span className={styles.screenEyebrow}>Daily Operations Dashboard</span>
          <h3 className={styles.screenTitle}>Good morning, Dr. Katherine Reyes</h3>
          <p className={styles.screenSubtitle}>Today is Tuesday, October 14 • Westside Dental Specialists (3 Chairs Active)</p>
        </div>
        <div className={styles.headerPillGroup}>
          <span className={styles.pillGreen}>All Chairs Online</span>
          <span className={styles.pillBlue}>Cloud Sync Active</span>
        </div>
      </div>

      <div className={styles.metricGrid}>
        <div className={styles.metricCard}>
          <span className={styles.metricLabel}>Today&apos;s Appointments</span>
          <div className={styles.metricValue}>18</div>
          <span className={styles.metricSub}>4 In-Chair • 11 Confirmed • 3 Arrived</span>
        </div>
        <div className={styles.metricCard}>
          <span className={styles.metricLabel}>Monthly Recovered Revenue</span>
          <div className={styles.metricValue}>$24,680</div>
          <span className={styles.metricSubTextSuccess}>+18.4% vs last month</span>
        </div>
        <div className={styles.metricCard}>
          <span className={styles.metricLabel}>Unaccepted Care Pipeline</span>
          <div className={styles.metricValue}>$52,140</div>
          <span className={styles.metricSub}>14 high-priority treatment plans</span>
        </div>
        <div className={styles.metricCard}>
          <span className={styles.metricLabel}>Recall Hygiene Due</span>
          <div className={styles.metricValue}>32</div>
          <span className={styles.metricSub}>Automated reminders active</span>
        </div>
      </div>

      <div className={styles.twoColGrid}>
        <div className={styles.cardBox}>
          <div className={styles.boxTitle}>Upcoming Appointments (Next 2 Hours)</div>
          <div className={styles.patientList}>
            <div className={styles.patientRow}>
              <div className={styles.patientTime}>09:30 AM</div>
              <div className={styles.patientInfo}>
                <strong>Eleanor Vance</strong>
                <span>Crown Preparation • Tooth #14</span>
              </div>
              <span className={styles.chipSuccess}>In-Chair (Chair 1)</span>
            </div>
            <div className={styles.patientRow}>
              <div className={styles.patientTime}>10:15 AM</div>
              <div className={styles.patientInfo}>
                <strong>Marcus Sterling</strong>
                <span>6-Month Hygiene Recall & Bitewings</span>
              </div>
              <span className={styles.chipNeutral}>Arrived in Waiting</span>
            </div>
            <div className={styles.patientRow}>
              <div className={styles.patientTime}>11:00 AM</div>
              <div className={styles.patientInfo}>
                <strong>Sophia Chen</strong>
                <span>Implant Consultation • Quadrant 3</span>
              </div>
              <span className={styles.chipBlue}>Confirmed via SMS</span>
            </div>
          </div>
        </div>

        <div className={styles.cardBox}>
          <div className={styles.boxTitle}>Autonomous Revenue Alerts</div>
          <div className={styles.patientList}>
            <div className={styles.alertRow}>
              <div className={styles.alertScore}>96/100</div>
              <div className={styles.alertInfo}>
                <strong>James Thornton — $2,850 Crown Opportunity</strong>
                <span>Diagnosed 21 days ago • Unscheduled • 1-click recall recommended</span>
              </div>
              <button type="button" className={styles.quickActionBtn}>Reach Out</button>
            </div>
            <div className={styles.alertRow}>
              <div className={styles.alertScore}>89/100</div>
              <div className={styles.alertInfo}>
                <strong>Claire Henderson — 6-Month Hygiene Overdue</strong>
                <span>Last visited April 2026 • Automated SMS drafted</span>
              </div>
              <button type="button" className={styles.quickActionBtn}>Send Recall</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function CalendarPreview() {
  return (
    <div className={styles.screenContent}>
      <div className={styles.screenHeader}>
        <div>
          <span className={styles.screenEyebrow}>Multi-Operatory Visual Timeline</span>
          <h3 className={styles.screenTitle}>Operatory Chair Schedule</h3>
          <p className={styles.screenSubtitle}>October 14, 2026 • 09:00 AM - 05:00 PM</p>
        </div>
        <div className={styles.headerPillGroup}>
          <button type="button" className={styles.quickActionBtn}>Book Appointment</button>
        </div>
      </div>

      <div className={styles.timelineGrid}>
        <div className={styles.timelineCol}>
          <div className={styles.chairHeader}>
            <strong>Chair 1 (Surgical)</strong>
            <span>Dr. Reyes • Active</span>
          </div>
          <div className={styles.timeBlockSlot}>
            <div className={styles.apptCardSurgery}>
              <div className={styles.apptTime}>09:00 - 10:30 AM</div>
              <strong>Eleanor Vance</strong>
              <p>Crown Prep & Scan (#14)</p>
              <span className={styles.chipSuccess}>In-Chair</span>
            </div>
          </div>
          <div className={styles.timeBlockSlot}>
            <div className={styles.apptCardSurgery}>
              <div className={styles.apptTime}>11:00 - 12:30 PM</div>
              <strong>Sophia Chen</strong>
              <p>Implant Consultation (#19)</p>
              <span className={styles.chipBlue}>Confirmed</span>
            </div>
          </div>
        </div>

        <div className={styles.timelineCol}>
          <div className={styles.chairHeader}>
            <strong>Chair 2 (Hygiene Suite)</strong>
            <span>Nurse Sarah • Active</span>
          </div>
          <div className={styles.timeBlockSlot}>
            <div className={styles.apptCardHygiene}>
              <div className={styles.apptTime}>09:15 - 10:00 AM</div>
              <strong>David Morales</strong>
              <p>Adult Prophy & Fluoride</p>
              <span className={styles.chipNeutral}>Arrived</span>
            </div>
          </div>
          <div className={styles.timeBlockSlot}>
            <div className={styles.apptCardHygiene}>
              <div className={styles.apptTime}>10:15 - 11:00 AM</div>
              <strong>Marcus Sterling</strong>
              <p>Periodontal Maintenance</p>
              <span className={styles.chipBlue}>Confirmed</span>
            </div>
          </div>
        </div>

        <div className={styles.timelineCol}>
          <div className={styles.chairHeader}>
            <strong>Chair 3 (Restorative)</strong>
            <span>Dr. Chen • Active</span>
          </div>
          <div className={styles.timeBlockSlot}>
            <div className={styles.apptCardRestorative}>
              <div className={styles.apptTime}>09:30 - 10:45 AM</div>
              <strong>Liam O&apos;Connor</strong>
              <p>Composite Restorations (#3, #4)</p>
              <span className={styles.chipSuccess}>In-Chair</span>
            </div>
          </div>
          <div className={styles.timeBlockSlot}>
            <div className={styles.emptySlotFill}>
              <span>11:00 - 12:00 PM Slot Opened</span>
              <button type="button" className={styles.fillSlotBtn}>Auto-Fill Chair (Recall Engine)</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ChartPreview() {
  return (
    <div className={styles.screenContent}>
      <div className={styles.screenHeader}>
        <div>
          <span className={styles.screenEyebrow}>Interactive Clinical Odontogram</span>
          <h3 className={styles.screenTitle}>Patient Chart: Eleanor Vance (DOB: 1988-04-12)</h3>
          <p className={styles.screenSubtitle}>Medical Alerts: Penicillin Allergy • Last Full Exam: 2 months ago</p>
        </div>
        <div className={styles.headerPillGroup}>
          <span className={styles.pillBlue}>FDI 2-Digit Notation</span>
        </div>
      </div>

      <div className={styles.chartVisualBox}>
        <div className={styles.chartRowTitle}>Upper Maxillary Arch</div>
        <div className={styles.teethGrid}>
          {[18, 17, 16, 15, 14, 13, 12, 11, 21, 22, 23, 24, 25, 26, 27, 28].map((tooth) => (
            <div
              key={tooth}
              className={`${styles.toothCell} ${
                tooth === 14 ? styles.toothTreated : tooth === 16 ? styles.toothRestored : ''
              }`}
            >
              <div className={styles.toothNumber}>{tooth}</div>
              <div className={styles.toothGraphic}>
                <div className={styles.toothCrown} />
              </div>
              <div className={styles.toothLabel}>
                {tooth === 14 ? 'Crown' : tooth === 16 ? 'Composite' : 'Healthy'}
              </div>
            </div>
          ))}
        </div>

        <div className={styles.chartRowTitle}>Lower Mandibular Arch</div>
        <div className={styles.teethGrid}>
          {[48, 47, 46, 45, 44, 43, 42, 41, 31, 32, 33, 34, 35, 36, 37, 38].map((tooth) => (
            <div
              key={tooth}
              className={`${styles.toothCell} ${
                tooth === 46 ? styles.toothImplant : tooth === 36 ? styles.toothCaries : ''
              }`}
            >
              <div className={styles.toothNumber}>{tooth}</div>
              <div className={styles.toothGraphic}>
                <div className={styles.toothCrown} />
              </div>
              <div className={styles.toothLabel}>
                {tooth === 46 ? 'Implant' : tooth === 36 ? 'Caries' : 'Healthy'}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className={styles.legendRow}>
        <span className={styles.legendItem}><span className={styles.dotGreen} /> Healthy / Intact</span>
        <span className={styles.legendItem}><span className={styles.dotBlue} /> Restored (Composite)</span>
        <span className={styles.legendItem}><span className={styles.dotYellow} /> Crown / Prosthetic</span>
        <span className={styles.legendItem}><span className={styles.dotRed} /> Caries / Needs Treatment</span>
      </div>
    </div>
  );
}

function BillingPreview() {
  return (
    <div className={styles.screenContent}>
      <div className={styles.screenHeader}>
        <div>
          <span className={styles.screenEyebrow}>Financial Ledger & Treatment Acceptance</span>
          <h3 className={styles.screenTitle}>Invoice #INV-2026-0841 — Eleanor Vance</h3>
          <p className={styles.screenSubtitle}>Issued October 14, 2026 • Status: Partially Paid</p>
        </div>
        <div className={styles.headerPillGroup}>
          <button type="button" className={styles.quickActionBtn}>Print Receipt</button>
          <button type="button" className={styles.primaryPillBtn}>Record Payment</button>
        </div>
      </div>

      <div className={styles.invoiceTable}>
        <div className={styles.tableHeader}>
          <span>Code</span>
          <span>Description</span>
          <span>Tooth</span>
          <span>Qty</span>
          <span>Unit Fee</span>
          <span>Total</span>
        </div>
        <div className={styles.tableRow}>
          <code>D2740</code>
          <span>Crown - Porcelain/Ceramic Substrate</span>
          <span>#14</span>
          <span>1</span>
          <span>$1,450.00</span>
          <span>$1,450.00</span>
        </div>
        <div className={styles.tableRow}>
          <code>D2950</code>
          <span>Core Buildup, Including Any Pins</span>
          <span>#14</span>
          <span>1</span>
          <span>$350.00</span>
          <span>$350.00</span>
        </div>
        <div className={styles.tableRow}>
          <code>D0140</code>
          <span>Limited Oral Evaluation - Problem Focused</span>
          <span>—</span>
          <span>1</span>
          <span>$120.00</span>
          <span>$120.00</span>
        </div>
      </div>

      <div className={styles.invoiceTotals}>
        <div className={styles.totalRow}>
          <span>Subtotal:</span>
          <strong>$1,920.00</strong>
        </div>
        <div className={styles.totalRow}>
          <span>Insurance Estimated Portion:</span>
          <strong>-$800.00</strong>
        </div>
        <div className={styles.totalRow}>
          <span>Patient Payments Recorded:</span>
          <strong style={{ color: '#16a34a' }}>-$620.00 (Visa)</strong>
        </div>
        <div className={`${styles.totalRow} ${styles.balanceDue}`}>
          <span>Outstanding Balance Due:</span>
          <strong>$500.00</strong>
        </div>
      </div>
    </div>
  );
}

function RevenuePreview() {
  return (
    <div className={styles.screenContent}>
      <div className={styles.screenHeader}>
        <div>
          <span className={styles.screenEyebrow}>Algorithmic Opportunity Scoring</span>
          <h3 className={styles.screenTitle}>Autonomous Revenue Recovery Engine</h3>
          <p className={styles.screenSubtitle}>Active Opportunity Pipeline: $42,850 Across 24 Unscheduled Patients</p>
        </div>
        <div className={styles.headerPillGroup}>
          <span className={styles.pillGreen}>Engine Status: Active 24/7</span>
        </div>
      </div>

      <div className={styles.opportunityList}>
        <div className={styles.opportunityCard}>
          <div className={styles.oppTop}>
            <span className={styles.priorityHigh}>Priority 98/100</span>
            <span className={styles.oppValue}>$3,400 Recovery Value</span>
          </div>
          <div className={styles.oppDetails}>
            <strong>Robert Langdon — Unaccepted Quadrant 2 Bridge</strong>
            <p>Diagnosed 3 weeks ago. Patient accepted treatment in principle but left without booking calendar slot. High clinical urgency.</p>
          </div>
          <div className={styles.oppFooter}>
            <span className={styles.oppChannel}>Recommended Outreach: Phone Call + WhatsApp Template</span>
            <button type="button" className={styles.quickActionBtn}>Launch Recovery Task</button>
          </div>
        </div>

        <div className={styles.opportunityCard}>
          <div className={styles.oppTop}>
            <span className={styles.priorityMedium}>Priority 86/100</span>
            <span className={styles.oppValue}>$420 Recovery Value</span>
          </div>
          <div className={styles.oppDetails}>
            <strong>Emily Watson — Overdue 6-Month Hygiene Recall</strong>
            <p>Last prophylaxis completed 7 months ago. Insurance period resets in 60 days. High historical booking conversion.</p>
          </div>
          <div className={styles.oppFooter}>
            <span className={styles.oppChannel}>Recommended Outreach: Automated SMS Recall</span>
            <button type="button" className={styles.quickActionBtn}>Send Recall</button>
          </div>
        </div>

        <div className={styles.opportunityCard}>
          <div className={styles.oppTop}>
            <span className={styles.priorityMedium}>Priority 82/100</span>
            <span className={styles.oppValue}>$1,850 Recovery Value</span>
          </div>
          <div className={styles.oppDetails}>
            <strong>Michael Chang — Unscheduled Molar Crown (#30)</strong>
            <p>Root canal completed 14 days ago. Temporary crown in place. Needs permanent restoration to prevent fracture.</p>
          </div>
          <div className={styles.oppFooter}>
            <span className={styles.oppChannel}>Recommended Outreach: Smart Voice Recall Agent</span>
            <button type="button" className={styles.quickActionBtn}>Dispatch Task</button>
          </div>
        </div>
      </div>
    </div>
  );
}
