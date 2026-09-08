'use client';

import React, { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Button, Select, Dialog } from '@/components/ui';
import { importPatientsFromCsv } from '@/features/admin/server/data-management-actions';

interface LocationOption {
  id: string;
  name: string;
}

interface ImportCsvDialogProps {
  organizationId: string;
  locations: LocationOption[];
}

export function ImportCsvDialog({ organizationId, locations }: ImportCsvDialogProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [csvContent, setCsvContent] = useState('');
  const [fileName, setFileName] = useState('');
  const [selectedLocation, setSelectedLocation] = useState(locations[0]?.id || '');
  const [duplicateStrategy, setDuplicateStrategy] = useState<'skip' | 'update'>('skip');
  const [error, setError] = useState<string | null>(null);
  const [importResult, setImportResult] = useState<{
    totalRows: number;
    importedCount: number;
    skippedCount: number;
    failedCount: number;
    errors: Array<{ row: number; error: string }>;
  } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    setError(null);
    const reader = new FileReader();
    reader.onload = (event) => {
      setCsvContent(event.target?.result as string || '');
    };
    reader.onerror = () => {
      setError('Failed to read selected CSV file.');
    };
    reader.readAsText(file);
  };

  const handleDownloadSample = () => {
    const sample = 'first_name,last_name,phone,email,gender,dob,allergies,notes\n' +
      'Eleanor,Vance,+15559871101,eleanor.vance@example.com,female,1988-04-12,Penicillin,Transfer patient from dental records\n' +
      'Marcus,Sterling,+15559871102,marcus.sterling@example.com,male,1979-11-23,None,Annual checkup patient';
    const blob = new Blob([sample], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'sample_patient_roster.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleImport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!csvContent.trim()) {
      setError('Please upload or paste CSV data to import.');
      return;
    }

    setLoading(true);
    setError(null);
    setImportResult(null);

    const result = await importPatientsFromCsv(organizationId, csvContent, {
      fileName: fileName || 'patient-import.csv',
      primaryLocationId: selectedLocation || undefined,
      onDuplicate: duplicateStrategy,
    });

    setLoading(false);

    if (result.success && result.data) {
      setImportResult(result.data);
      router.refresh();
    } else {
      setError(result.error?.message || 'Failed to import CSV.');
    }
  };

  const handleClose = () => {
    setOpen(false);
    setCsvContent('');
    setFileName('');
    setError(null);
    setImportResult(null);
  };

  return (
    <>
      <Button variant="secondary" onClick={() => setOpen(true)}>
        📥 Import CSV
      </Button>

      <Dialog
        open={open}
        onClose={handleClose}
        title="Bulk Import Patients (CSV)"
        description="Migrate existing patient databases into Dental OS with automatic phone deduplication and field mapping."
        size="lg"
      >
        {importResult ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
            <div
              style={{
                padding: 'var(--space-4)',
                background: 'var(--color-canvas)',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-input)',
              }}
            >
              <h4 style={{ font: 'var(--text-card-title)', color: 'var(--color-text-primary)', marginBottom: 'var(--space-2)' }}>
                Import Batch Summary
              </h4>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 'var(--space-3)', marginTop: 'var(--space-3)' }}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ font: 'var(--text-page-title)', color: 'var(--color-primary)' }}>{importResult.totalRows}</div>
                  <div style={{ font: 'var(--text-meta)', color: 'var(--color-text-secondary)' }}>Total Rows</div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ font: 'var(--text-page-title)', color: 'var(--color-success)' }}>{importResult.importedCount}</div>
                  <div style={{ font: 'var(--text-meta)', color: 'var(--color-text-secondary)' }}>Imported</div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ font: 'var(--text-page-title)', color: 'var(--color-accent)' }}>{importResult.skippedCount}</div>
                  <div style={{ font: 'var(--text-meta)', color: 'var(--color-text-secondary)' }}>Duplicates Skipped</div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ font: 'var(--text-page-title)', color: importResult.failedCount > 0 ? 'var(--color-danger)' : 'var(--color-text-muted)' }}>
                    {importResult.failedCount}
                  </div>
                  <div style={{ font: 'var(--text-meta)', color: 'var(--color-text-secondary)' }}>Failed</div>
                </div>
              </div>
            </div>

            {importResult.errors.length > 0 && (
              <div style={{ maxHeight: '180px', overflowY: 'auto', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-input)', padding: 'var(--space-3)' }}>
                <h5 style={{ font: 'var(--text-label)', color: 'var(--color-danger)', marginBottom: 'var(--space-2)' }}>
                  Errors ({importResult.errors.length}):
                </h5>
                <ul style={{ margin: 0, paddingLeft: 'var(--space-4)', font: 'var(--text-meta)', color: 'var(--color-text-secondary)' }}>
                  {importResult.errors.map((err, idx) => (
                    <li key={idx}>Row {err.row}: {err.error}</li>
                  ))}
                </ul>
              </div>
            )}


            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-3)', marginTop: 'var(--space-2)' }}>
              <Button onClick={handleClose}>
                Done
              </Button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleImport} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
            {error && (
              <div
                style={{
                  padding: 'var(--space-3)',
                  background: 'var(--color-danger-light)',
                  border: '1px solid var(--color-danger)',
                  borderRadius: 'var(--radius-input)',
                  color: 'var(--color-danger)',
                  fontSize: '0.875rem',
                }}
                role="alert"
              >
                {error}
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ font: 'var(--text-label)', color: 'var(--color-text-secondary)' }}>
                Supported columns: first_name, last_name, phone, email, gender, dob, allergies, notes
              </span>
              <button
                type="button"
                onClick={handleDownloadSample}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--color-primary)',
                  font: 'var(--text-meta)',
                  cursor: 'pointer',
                  textDecoration: 'underline',
                  padding: 0,
                }}
              >
                Download Sample CSV
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)' }}>
              <Select
                label="Assign to Branch Location"
                value={selectedLocation}
                onChange={(e) => setSelectedLocation(e.target.value)}
                options={locations.map((l) => ({ value: l.id, label: l.name }))}
              />
              <Select
                label="Duplicate Phone/Email Strategy"
                value={duplicateStrategy}
                onChange={(e) => setDuplicateStrategy(e.target.value as 'skip' | 'update')}
                options={[
                  { value: 'skip', label: 'Skip Duplicate Records' },
                  { value: 'update', label: 'Update Existing Patient Profiles' },
                ]}
              />
            </div>

            <div>
              <label style={{ display: 'block', font: 'var(--text-label)', color: 'var(--color-text-secondary)', marginBottom: 'var(--space-1)' }}>
                Upload File or Paste CSV
              </label>
              <div style={{ display: 'flex', gap: 'var(--space-2)', marginBottom: 'var(--space-2)' }}>
                <input
                  type="file"
                  ref={fileInputRef}
                  accept=".csv,text/csv"
                  onChange={handleFileUpload}
                  style={{ display: 'none' }}
                />
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => fileInputRef.current?.click()}
                >
                  📁 Select CSV File {fileName ? `(${fileName})` : ''}
                </Button>
              </div>
              <textarea
                rows={6}
                value={csvContent}
                onChange={(e) => setCsvContent(e.target.value)}
                placeholder={'first_name,last_name,phone,email,gender,dob,allergies,notes\nJane,Smith,+15552345678,jane@example.com,female,1990-01-01,Latex,Routine cleaning'}
                style={{
                  width: '100%',
                  fontFamily: 'monospace',
                  fontSize: '0.8125rem',
                  padding: 'var(--space-3)',
                  border: '1px solid var(--color-border)',
                  borderRadius: 'var(--radius-input)',
                  background: 'var(--color-canvas)',
                  color: 'var(--color-text-primary)',
                  boxSizing: 'border-box',
                }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-3)', marginTop: 'var(--space-2)' }}>
              <Button type="button" variant="ghost" onClick={handleClose} disabled={loading}>
                Cancel
              </Button>
              <Button type="submit" loading={loading} disabled={!csvContent.trim()}>
                Import {csvContent ? 'Roster' : ''}
              </Button>
            </div>
          </form>
        )}
      </Dialog>
    </>
  );
}
