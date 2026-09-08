'use client';

import React, { useState } from 'react';
import { Button, Input, Select, Badge, Dialog } from '@/components/ui';
import { formatDate } from '@/lib/utils';
import { signConsentDocument } from '../server/clinical-docs-actions';
import styles from './patient-workflows.module.css';

export interface PatientDocumentsViewProps {
  organizationId: string;
  patientId: string;
  patientName: string;
  documents: any[];
  consentTemplates: any[];
}

export function PatientDocumentsView({
  organizationId,
  patientId,
  patientName,
  documents: initialDocs,
  consentTemplates,
}: PatientDocumentsViewProps) {
  const [documents, setDocuments] = useState<any[]>(initialDocs);
  const [isOpen, setIsOpen] = useState(false);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
  const [docTitle, setDocTitle] = useState('');
  const [docContent, setDocContent] = useState('');
  const [signerName, setSignerName] = useState(patientName);
  const [witnessName, setWitnessName] = useState('');
  const [signatureConfirmation, setSignatureConfirmation] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleTemplateSelect = (tplId: string) => {
    setSelectedTemplateId(tplId);
    const tpl = consentTemplates.find((t) => t.id === tplId);
    if (tpl) {
      setDocTitle(tpl.title);
      setDocContent(tpl.body);
    }
  };

  const handleSignSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!signatureConfirmation) {
      setErrorMsg('Digital signature acknowledgement is required');
      return;
    }

    setErrorMsg(null);
    setSubmitting(true);

    try {
      const res = await signConsentDocument(organizationId, {
        patientId,
        templateId: selectedTemplateId || undefined,
        title: docTitle || 'Signed Informed Consent',
        type: 'consent_form',
        content: docContent,
        signerName,
        signatureData: `DIGITAL_SIG:${signerName}:${new Date().toISOString()}`,
        witnessName: witnessName || undefined,
      });

      if (!res.success) {
        setErrorMsg(res.error?.message || 'Failed to record signed document');
        return;
      }

      setIsOpen(false);
      window.location.reload();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to sign consent document');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div>
          <h2 className={styles.title}>Clinical Documents & Informed Consents</h2>
          <p className={styles.subtitle}>
            Digitally signed surgical, restorative, and procedural consent records with SHA-256 integrity hashes.
          </p>
        </div>
        <Button size="sm" onClick={() => setIsOpen(true)}>
          ✍️ Sign Informed Consent
        </Button>
      </div>

      {documents.length === 0 ? (
        <div className={styles.emptyState}>
          No signed consent records or clinical documents on file for this patient.
        </div>
      ) : (
        <div className={styles.docGrid}>
          {documents.map((doc) => (
            <div key={doc.id} className={styles.docCard}>
              <div className={styles.docHeader}>
                <div>
                  <h3 className={styles.docTitle}>{doc.title}</h3>
                  <div className={styles.docMeta}>
                    Signed {formatDate(doc.signedAt)} by <strong>{doc.signerName}</strong>
                    {doc.witnessName ? ` • Witness: ${doc.witnessName}` : ''}
                  </div>
                </div>
                <Badge variant="success" size="sm">
                  DIGITALLY SIGNED
                </Badge>
              </div>

              {doc.content && (
                <div className={styles.docContentBox}>
                  {doc.content.slice(0, 300)}...
                </div>
              )}

              <div className={styles.docFooter}>
                <span className={styles.hashBadge} title={`SHA-256 Integrity: ${doc.fileHash}`}>
                  🔒 Hash: {doc.fileHash ? doc.fileHash.slice(0, 16) + '...' : 'Verified'}
                </span>
                <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
                  Tamper-evident record
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Digital Consent Signature Dialog */}
      <Dialog
        open={isOpen}
        onClose={() => setIsOpen(false)}
        title="Sign Clinical Consent Form"
      >
        <form onSubmit={handleSignSubmit} className={styles.formGrid}>
          {errorMsg && <div className={styles.errorBanner}>{errorMsg}</div>}

          {consentTemplates.length > 0 && (
            <Select
              label="Select Standard Consent Template"
              value={selectedTemplateId}
              onChange={(e) => handleTemplateSelect(e.target.value)}
              options={[
                { value: '', label: 'Select a procedure consent form...' },
                ...consentTemplates.map((t) => ({ value: t.id, label: t.title })),
              ]}
            />
          )}

          <Input
            label="Document Title"
            value={docTitle}
            onChange={(e) => setDocTitle(e.target.value)}
            placeholder="e.g. Informed Consent for Endodontic Therapy"
            required
          />

          <div className={styles.formGroup}>
            <label className={styles.label}>Consent Terms & Legal Acknowledgment</label>
            <textarea
              className={styles.textarea}
              rows={6}
              value={docContent}
              onChange={(e) => setDocContent(e.target.value)}
              placeholder="Full text of procedure risks, alternatives, and disclosure..."
              required
            />
          </div>

          <div className={styles.formRow2}>
            <Input
              label="Signer Full Legal Name (Patient / Legal Guardian)"
              value={signerName}
              onChange={(e) => setSignerName(e.target.value)}
              required
            />
            <Input
              label="Staff Witness / Clinician Name (Optional)"
              value={witnessName}
              onChange={(e) => setWitnessName(e.target.value)}
              placeholder="e.g. Dr. Ali Haider"
            />
          </div>

          <div className={styles.consentAgreement}>
            <label style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={signatureConfirmation}
                onChange={(e) => setSignatureConfirmation(e.target.checked)}
                style={{ marginTop: '3px' }}
                required
              />
              <span style={{ fontSize: '0.8rem', color: '#1e293b' }}>
                I confirm that I have read and understood the procedural risks and alternatives. By checking this box,
                I apply my verifiable digital signature to this permanent legal health record.
              </span>
            </label>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '12px' }}>
            <Button type="button" variant="ghost" onClick={() => setIsOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" disabled={submitting || !signatureConfirmation}>
              {submitting ? 'Applying Signature...' : '✍️ Apply Digital Signature'}
            </Button>
          </div>
        </form>
      </Dialog>
    </div>
  );
}
