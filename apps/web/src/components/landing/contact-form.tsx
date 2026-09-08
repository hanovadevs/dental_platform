'use client';

import React, { useState } from 'react';
import styles from './contact-form.module.css';

export function ContactForm() {
  const [formData, setFormData] = useState({
    clinicName: '',
    contactName: '',
    email: '',
    phone: '',
    location: '',
    clinicSize: '1-3 Chairs',
    message: '',
  });

  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (fieldErrors[name]) {
      setFieldErrors((prev) => {
        const updated = { ...prev };
        delete updated[name];
        return updated;
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setSuccessMessage(null);
    setErrorMessage(null);
    setFieldErrors({});

    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        if (data.details) {
          setFieldErrors(data.details);
        }
        setErrorMessage(data.error || 'Failed to submit inquiry. Please check your inputs.');
      } else {
        setSuccessMessage(data.message || 'Inquiry received. Our practice team will contact you shortly.');
        setFormData({
          clinicName: '',
          contactName: '',
          email: '',
          phone: '',
          location: '',
          clinicSize: '1-3 Chairs',
          message: '',
        });
      }
    } catch {
      setErrorMessage('Network error occurred. Please try again or reach out directly.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form className={styles.formCard} onSubmit={handleSubmit} noValidate>
      {successMessage && (
        <div className={styles.successBanner} role="status">
          <div className={styles.bannerTitle}>Inquiry Sent Successfully</div>
          <div className={styles.bannerText}>{successMessage}</div>
        </div>
      )}

      {errorMessage && (
        <div className={styles.errorBanner} role="alert">
          <div className={styles.bannerTitle}>Submission Issue</div>
          <div className={styles.bannerText}>{errorMessage}</div>
        </div>
      )}

      <div className={styles.grid2}>
        <div className={styles.formGroup}>
          <label htmlFor="clinicName" className={styles.label}>
            Practice / Clinic Name *
          </label>
          <input
            id="clinicName"
            name="clinicName"
            type="text"
            className={`${styles.input} ${fieldErrors.clinicName ? styles.inputError : ''}`}
            placeholder="e.g. Apex Dental Care"
            value={formData.clinicName}
            onChange={handleChange}
            required
          />
          {fieldErrors.clinicName && (
            <span className={styles.fieldErrorText}>{fieldErrors.clinicName[0]}</span>
          )}
        </div>

        <div className={styles.formGroup}>
          <label htmlFor="contactName" className={styles.label}>
            Contact Person Name *
          </label>
          <input
            id="contactName"
            name="contactName"
            type="text"
            className={`${styles.input} ${fieldErrors.contactName ? styles.inputError : ''}`}
            placeholder="Dr. Sarah Jenkins"
            value={formData.contactName}
            onChange={handleChange}
            required
          />
          {fieldErrors.contactName && (
            <span className={styles.fieldErrorText}>{fieldErrors.contactName[0]}</span>
          )}
        </div>
      </div>

      <div className={styles.grid2}>
        <div className={styles.formGroup}>
          <label htmlFor="email" className={styles.label}>
            Clinic Email Address *
          </label>
          <input
            id="email"
            name="email"
            type="email"
            className={`${styles.input} ${fieldErrors.email ? styles.inputError : ''}`}
            placeholder="s.jenkins@apexdental.com"
            value={formData.email}
            onChange={handleChange}
            required
          />
          {fieldErrors.email && (
            <span className={styles.fieldErrorText}>{fieldErrors.email[0]}</span>
          )}
        </div>

        <div className={styles.formGroup}>
          <label htmlFor="phone" className={styles.label}>
            Phone Number *
          </label>
          <input
            id="phone"
            name="phone"
            type="tel"
            className={`${styles.input} ${fieldErrors.phone ? styles.inputError : ''}`}
            placeholder="+1 (555) 234-5678"
            value={formData.phone}
            onChange={handleChange}
            required
          />
          {fieldErrors.phone && (
            <span className={styles.fieldErrorText}>{fieldErrors.phone[0]}</span>
          )}
        </div>
      </div>

      <div className={styles.grid2}>
        <div className={styles.formGroup}>
          <label htmlFor="location" className={styles.label}>
            City / Country *
          </label>
          <input
            id="location"
            name="location"
            type="text"
            className={`${styles.input} ${fieldErrors.location ? styles.inputError : ''}`}
            placeholder="e.g. Austin, Texas, USA"
            value={formData.location}
            onChange={handleChange}
            required
          />
          {fieldErrors.location && (
            <span className={styles.fieldErrorText}>{fieldErrors.location[0]}</span>
          )}
        </div>

        <div className={styles.formGroup}>
          <label htmlFor="clinicSize" className={styles.label}>
            Clinic Size / Operatory Chairs *
          </label>
          <select
            id="clinicSize"
            name="clinicSize"
            className={styles.select}
            value={formData.clinicSize}
            onChange={handleChange}
          >
            <option value="Solo Practice (1-2 Chairs)">Solo Practice (1-2 Chairs)</option>
            <option value="Mid-Size Clinic (3-6 Chairs)">Mid-Size Clinic (3-6 Chairs)</option>
            <option value="Large Surgical Center (7-15 Chairs)">Large Surgical Center (7-15 Chairs)</option>
            <option value="Multi-Location DSO Network">Multi-Location DSO Network</option>
          </select>
        </div>
      </div>

      <div className={styles.formGroup}>
        <label htmlFor="message" className={styles.label}>
          How can we help your practice? *
        </label>
        <textarea
          id="message"
          name="message"
          rows={4}
          className={`${styles.textarea} ${fieldErrors.message ? styles.inputError : ''}`}
          placeholder="Tell us about your current clinic software setup, pain points with revenue recovery, or specific questions..."
          value={formData.message}
          onChange={handleChange}
          required
        />
        {fieldErrors.message && (
          <span className={styles.fieldErrorText}>{fieldErrors.message[0]}</span>
        )}
      </div>

      <div className={styles.submitRow}>
        <button type="submit" className={styles.submitBtn} disabled={loading}>
          {loading ? 'Submitting Inquiry...' : 'Submit Clinic Inquiry'}
        </button>
        <p className={styles.privacyNote}>
          We respect medical confidentiality. No spam. A dental solutions director will respond directly.
        </p>
      </div>
    </form>
  );
}
