'use client';

import React, { useState } from 'react';
import styles from './faq-accordion.module.css';

interface FAQItem {
  question: string;
  answer: string;
}

const faqs: FAQItem[] = [
  {
    question: 'What kind of dental practices is Dental OS designed for?',
    answer:
      'Dental OS is engineered for modern solo practices, multi-provider clinics, dental surgical centers, and multi-location DSO networks. Whether you operate a single operatory chair or manage a group with multiple clinical locations, the multi-tenant architecture scales seamlessly with strict tenant data isolation.',
  },
  {
    question: 'Can a solo dentist use this, or is it only for multi-dentist clinics?',
    answer:
      'Solo dentists love Dental OS because it automates administrative burdens that usually require multiple front-desk personnel. Solo practitioners get instant access to automated appointment reminders, chair scheduling, treatment acceptance tracking, and background revenue recovery without needing enterprise IT staff.',
  },
  {
    question: 'How does Dental OS actively recover clinic revenue?',
    answer:
      'Unlike traditional passive dental ERPs that only store records, Dental OS features an Autonomous Revenue Recovery Engine. It continuously analyzes 8 distinct clinical vectors: unaccepted proposed treatments (e.g. diagnosed crowns and implants sitting dormant), 6-month hygiene recall drop-offs, last-minute cancellations, unfilled operatory chair slots, and outstanding patient balances. Each opportunity is algorithmically scored (0–100) and surfaced with one-click outreach workflows.',
  },
  {
    question: 'How long does clinic setup take?',
    answer:
      'Initial practice registration takes less than 3 minutes. From there, configuring your physical locations, operatories, and staff accounts takes approximately 10 to 15 minutes. Dental OS is ready to schedule patients on day one with zero hardware installations or local server configuration.',
  },
  {
    question: 'Is it easy for front-desk receptionists and assistants to learn?',
    answer:
      'Yes. The interface is designed around the principles of calm, restrained clinical software with minimal cognitive friction. Common actions like scheduling appointments, patient check-in, recording payments, and sending reminders use intuitive keyboard shortcuts (such as Cmd+K) and clear text labels rather than cryptic icon toolbars.',
  },
  {
    question: 'Does it include clinical charting, treatment plans, and billing?',
    answer:
      'Yes, all three are seamlessly integrated. Clinicians can chart conditions on an interactive 32-tooth universal/FDI dental chart, convert diagnosed conditions into phased treatment plans with procedure fee estimates, and instantly issue transparent invoices with multi-method payment splits (card, cash, insurance, bank transfer).',
  },
  {
    question: 'Can existing clinics migrate their existing patient data?',
    answer:
      'Yes. Dental OS supports standard CSV and clinical format patient imports, including contact details, medical alerts, emergency contacts, and past appointment history. Our system also complies with full GDPR and HIPAA data portability standards.',
  },
  {
    question: 'Is Dental OS cloud-based? Does it work on Mac, Windows, and iPads?',
    answer:
      'Dental OS is 100% cloud-based, hosted on high-availability serverless infrastructure with PostgreSQL replication. It operates smoothly in any modern web browser across Windows PCs, macOS workstations, iPad operatories, and tablet chairs with zero software installation.',
  },
  {
    question: 'How is patient healthcare data secured and protected?',
    answer:
      'All data in transit is encrypted with TLS 1.3, and data at rest is protected with AES-256 encryption. Every database query enforces strict tenant isolation at the SQL query layer with composite B-tree indexing. Role-based access control (RBAC) ensures staff members only access records authorized by their clinical role.',
  },
  {
    question: 'Can existing clinic staff log in directly from anywhere?',
    answer:
      'Yes. Clinic team members simply navigate to the login portal with their credentials. Clinic administrators can define distinct permissions for lead dentists, associate clinicians, hygienists, front-desk receptionists, and billing coordinators.',
  },
];

export function FaqAccordion() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const toggle = (index: number) => {
    setOpenIndex((current) => (current === index ? null : index));
  };

  return (
    <div className={styles.container}>
      {faqs.map((faq, index) => {
        const isOpen = openIndex === index;
        return (
          <div key={index} className={`${styles.item} ${isOpen ? styles.itemOpen : ''}`}>
            <button
              type="button"
              className={styles.questionBtn}
              onClick={() => toggle(index)}
              aria-expanded={isOpen}
            >
              <span className={styles.questionText}>{faq.question}</span>
              <span className={styles.indicator} aria-hidden="true">
                {isOpen ? '—' : '+'}
              </span>
            </button>
            {isOpen && (
              <div className={styles.answerWrapper}>
                <p className={styles.answerText}>{faq.answer}</p>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
