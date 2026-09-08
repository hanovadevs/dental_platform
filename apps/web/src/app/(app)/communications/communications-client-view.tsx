'use client';

import React, { useState, useTransition } from 'react';
import { Button, Input, Select, Badge, Dialog } from '@/components/ui';
import { formatDate } from '@/lib/utils';
import {
  sendMessage,
  createTemplate,
  triggerAutomationRun,
  toggleCommunicationRule,
} from '@/features/communications/server/actions';
import {
  CommunicationChannel,
  TemplateCategory,
  COMMUNICATION_CHANNELS,
  TEMPLATE_CATEGORIES,
} from '@/features/communications/domain/types';
import styles from './communications.module.css';

export interface CommunicationsClientViewProps {
  organizationId: string;
  initialLogs: any[];
  initialTemplates: any[];
  initialRules: any[];
  patientsList: Array<{ id: string; name: string; phone?: string | null; email?: string | null }>;
}

export function CommunicationsClientView({
  organizationId,
  initialLogs,
  initialTemplates,
  initialRules,
  patientsList,
}: CommunicationsClientViewProps) {
  const [activeTab, setActiveTab] = useState<'logs' | 'templates' | 'rules'>('logs');
  const [logs, setLogs] = useState<any[]>(initialLogs);
  const [templates, setTemplates] = useState<any[]>(initialTemplates);
  const [rules, setRules] = useState<any[]>(initialRules);

  // Filters for logs
  const [channelFilter, setChannelFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Dialogs
  const [isNewMessageOpen, setIsNewMessageOpen] = useState(false);
  const [isNewTemplateOpen, setIsNewTemplateOpen] = useState(false);
  const [selectedMessage, setSelectedMessage] = useState<any | null>(null);

  // Send Message Form State
  const [selectedPatientId, setSelectedPatientId] = useState<string>('');
  const [recipient, setRecipient] = useState<string>('');
  const [msgChannel, setMsgChannel] = useState<CommunicationChannel>('sms');
  const [msgSubject, setMsgSubject] = useState<string>('');
  const [msgBody, setMsgBody] = useState<string>('');
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // New Template Form State
  const [tplName, setTplName] = useState('');
  const [tplCategory, setTplCategory] = useState<TemplateCategory>('appointment_reminder');
  const [tplChannel, setTplChannel] = useState<CommunicationChannel>('sms');
  const [tplSubject, setTplSubject] = useState('');
  const [tplBody, setTplBody] = useState('');

  // Automation Run
  const [isPending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<string | null>(null);

  // Filter logs
  const filteredLogs = logs.filter((l) => {
    if (channelFilter !== 'all' && l.channel !== channelFilter) return false;
    if (statusFilter !== 'all' && l.status !== statusFilter) return false;
    return true;
  });

  // Calculate metrics
  const deliveredCount = logs.filter((l) => l.status === 'delivered').length;
  const failedCount = logs.filter((l) => l.status === 'failed').length;

  const handlePatientSelect = (patId: string) => {
    setSelectedPatientId(patId);
    const pat = patientsList.find((p) => p.id === patId);
    if (pat) {
      if (msgChannel === 'email' && pat.email) {
        setRecipient(pat.email);
      } else if (pat.phone) {
        setRecipient(pat.phone);
      }
    }
  };

  const handleTemplateSelect = (tplId: string) => {
    setSelectedTemplateId(tplId);
    const tpl = templates.find((t) => t.id === tplId);
    if (tpl) {
      setMsgChannel(tpl.channel);
      if (tpl.subject) setMsgSubject(tpl.subject);
      setMsgBody(tpl.body);
    }
  };

  const handleSendMessageSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setIsSubmitting(true);
    try {
      const res = await sendMessage(organizationId, {
        patientId: selectedPatientId || undefined,
        channel: msgChannel,
        recipient,
        subject: msgChannel === 'email' ? msgSubject : undefined,
        body: msgBody,
        templateId: selectedTemplateId || undefined,
      });

      if (!res.success) {
        setFormError(res.error?.message || 'Failed to send message');
        return;
      }

      setIsNewMessageOpen(false);
      setMsgBody('');
      setMsgSubject('');
      setRecipient('');
      setSelectedPatientId('');
      window.location.reload();
    } catch (err: any) {
      setFormError(err.message || 'Failed to send message');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreateTemplateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setIsSubmitting(true);
    try {
      const res = await createTemplate(organizationId, {
        name: tplName,
        category: tplCategory,
        channel: tplChannel,
        subject: tplChannel === 'email' ? tplSubject : undefined,
        body: tplBody,
      });

      if (!res.success) {
        setFormError(res.error?.message || 'Failed to create template');
        return;
      }

      setIsNewTemplateOpen(false);
      setTplName('');
      setTplBody('');
      setTplSubject('');
      window.location.reload();
    } catch (err: any) {
      setFormError(err.message || 'Failed to create template');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleTriggerAutomation = () => {
    setFeedback(null);
    startTransition(async () => {
      const res = await triggerAutomationRun(organizationId);
      if (res.success && res.data) {
        setFeedback(
          `Automation executed: ${res.data.remindersSent} reminder(s) sent, ${res.data.recallsSent} recall(s) sent, ${res.data.skippedOptOut} skipped due to opt-out.`
        );
        window.location.reload();
      } else {
        setFeedback(res.error?.message || 'Automation run failed');
      }
    });
  };

  const handleToggleRule = async (ruleId: string, currentActive: boolean) => {
    await toggleCommunicationRule(organizationId, ruleId, !currentActive);
    setRules((prev) =>
      prev.map((r) => (r.id === ruleId ? { ...r, active: !currentActive } : r))
    );
  };

  const getStatusVariant = (s: string): 'success' | 'info' | 'danger' | 'warning' | 'neutral' => {
    switch (s) {
      case 'delivered':
        return 'success';
      case 'sent':
      case 'queued':
        return 'info';
      case 'failed':
        return 'danger';
      default:
        return 'neutral';
    }
  };

  return (
    <div className={styles.wrapper}>
      {/* Header */}
      <div className={styles.header}>
        <div>
          <h1 className={styles.pageTitle}>Communications & Automation</h1>
          <p className={styles.pageSubtitle}>
            Manage automated appointment reminders, hygiene recalls, message templates, and outreach history.
          </p>
        </div>
        <div className={styles.headerActions}>
          <Button
            variant="secondary"
            onClick={handleTriggerAutomation}
            disabled={isPending}
          >
            {isPending ? 'Running Rules...' : 'Run Reminder Rules'}
          </Button>
          <Button
            variant="primary"
            onClick={() => setIsNewMessageOpen(true)}
          >
            + Send Message
          </Button>
        </div>
      </div>

      {feedback && <div className={styles.feedbackBanner}>{feedback}</div>}

      {/* KPI Metric Cards */}
      <div className={styles.metricsGrid}>
        <div className={styles.kpiCard}>
          <span className={styles.kpiLabel}>Total Sent</span>
          <span className={styles.kpiValue}>{logs.length}</span>
          <span className={styles.kpiSubtext}>Communications logged</span>
        </div>
        <div className={styles.kpiCard}>
          <span className={styles.kpiLabel}>Delivered</span>
          <span className={styles.kpiValueSuccess}>{deliveredCount}</span>
          <span className={styles.kpiSubtext}>Confirmed delivered</span>
        </div>
        <div className={styles.kpiCard}>
          <span className={styles.kpiLabel}>Delivery Failures</span>
          <span className={styles.kpiValueDanger}>{failedCount}</span>
          <span className={styles.kpiSubtext}>Check diagnostics</span>
        </div>
        <div className={styles.kpiCard}>
          <span className={styles.kpiLabel}>Active Templates</span>
          <span className={styles.kpiValue}>{templates.length}</span>
          <span className={styles.kpiSubtext}>SMS, Email & WhatsApp</span>
        </div>
      </div>

      {/* Main Tabs */}
      <div className={styles.tabNav}>
        <button
          type="button"
          className={[styles.tabButton, activeTab === 'logs' ? styles.activeTab : ''].join(' ')}
          onClick={() => setActiveTab('logs')}
        >
          Message Logs ({logs.length})
        </button>
        <button
          type="button"
          className={[styles.tabButton, activeTab === 'templates' ? styles.activeTab : ''].join(' ')}
          onClick={() => setActiveTab('templates')}
        >
          Templates ({templates.length})
        </button>
        <button
          type="button"
          className={[styles.tabButton, activeTab === 'rules' ? styles.activeTab : ''].join(' ')}
          onClick={() => setActiveTab('rules')}
        >
          Automation Rules ({rules.length})
        </button>
      </div>

      {/* Tab 1: Message Logs */}
      {activeTab === 'logs' && (
        <div className={styles.tabContent}>
          <div className={styles.filterBar}>
            <div className={styles.dropdownFilters}>
              <Select
                value={channelFilter}
                onChange={(e) => setChannelFilter(e.target.value)}
                options={[
                  { value: 'all', label: 'All Channels' },
                  { value: 'sms', label: 'SMS' },
                  { value: 'email', label: 'Email' },
                  { value: 'whatsapp', label: 'WhatsApp' },
                  { value: 'phone', label: 'Phone' },
                ]}
              />
              <Select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                options={[
                  { value: 'all', label: 'All Statuses' },
                  { value: 'delivered', label: 'Delivered' },
                  { value: 'sent', label: 'Sent' },
                  { value: 'failed', label: 'Failed' },
                ]}
              />
            </div>
          </div>

          <div className={styles.tableCard}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Recipient / Patient</th>
                  <th>Channel</th>
                  <th>Subject / Message Preview</th>
                  <th>Status</th>
                  <th>Sent At</th>
                  <th>Details</th>
                </tr>
              </thead>
              <tbody>
                {filteredLogs.length === 0 ? (
                  <tr>
                    <td colSpan={6} className={styles.emptyCell}>
                      No communication records match your filters.
                    </td>
                  </tr>
                ) : (
                  filteredLogs.map((log) => (
                    <tr key={log.id}>
                      <td>
                        <div className={styles.recipientName}>
                          {log.patient
                            ? `${log.patient.firstName} ${log.patient.lastName}`
                            : log.recipient}
                        </div>
                        <div className={styles.recipientContact}>{log.recipient}</div>
                      </td>
                      <td>
                        <span className={styles.channelTag}>{log.channel.toUpperCase()}</span>
                      </td>
                      <td>
                        <div className={styles.messagePreview}>
                          {log.subject && <strong>{log.subject} — </strong>}
                          {log.body}
                        </div>
                      </td>
                      <td>
                        <Badge variant={getStatusVariant(log.status)} size="sm">
                          {log.status.toUpperCase()}
                        </Badge>
                      </td>
                      <td className={styles.timeCell}>{formatDate(log.createdAt)}</td>
                      <td>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelectedMessage(log)}
                        >
                          View
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 2: Templates */}
      {activeTab === 'templates' && (
        <div className={styles.tabContent}>
          <div className={styles.templatesHeader}>
            <p className={styles.templatesHint}>
              Use tokens like <code>{'{{patientName}}'}</code>, <code>{'{{clinicName}}'}</code>, <code>{'{{appointmentDate}}'}</code>, <code>{'{{appointmentTime}}'}</code>, <code>{'{{confirmationUrl}}'}</code> to personalize automated messages.
            </p>
            <Button variant="primary" size="sm" onClick={() => setIsNewTemplateOpen(true)}>
              + New Template
            </Button>
          </div>

          <div className={styles.templatesGrid}>
            {templates.map((tpl) => (
              <div key={tpl.id} className={styles.templateCard}>
                <div className={styles.templateCardHeader}>
                  <div>
                    <h3 className={styles.templateName}>{tpl.name}</h3>
                    <div className={styles.templateCategory}>
                      {tpl.category.replace(/_/g, ' ')}
                    </div>
                  </div>
                  <Badge variant="neutral" size="sm">
                    {tpl.channel.toUpperCase()}
                  </Badge>
                </div>

                {tpl.subject && (
                  <div className={styles.templateSubject}>
                    <strong>Subject:</strong> {tpl.subject}
                  </div>
                )}

                <div className={styles.templateBody}>{tpl.body}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 3: Automation Rules */}
      {activeTab === 'rules' && (
        <div className={styles.tabContent}>
          <div className={styles.rulesList}>
            {rules.map((rule) => (
              <div key={rule.id} className={styles.ruleCard}>
                <div className={styles.ruleInfo}>
                  <h3 className={styles.ruleName}>{rule.name}</h3>
                  <div className={styles.ruleMeta}>
                    Trigger: <strong>{rule.triggerEvent.replace(/_/g, ' ')}</strong> • Channel: <strong>{rule.channel.toUpperCase()}</strong> • Offset: <strong>{rule.offsetHours}h</strong>
                  </div>
                  {rule.template && (
                    <div className={styles.ruleTemplate}>
                      Assigned Template: {rule.template.name}
                    </div>
                  )}
                </div>

                <div className={styles.ruleAction}>
                  <Button
                    variant={rule.active ? 'secondary' : 'primary'}
                    size="sm"
                    onClick={() => handleToggleRule(rule.id, rule.active)}
                  >
                    {rule.active ? 'Disable' : 'Enable'}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Send Message Dialog */}
      <Dialog
        open={isNewMessageOpen}
        onClose={() => setIsNewMessageOpen(false)}
        title="Send Patient Communication"
        description="Dispatch SMS, Email, or WhatsApp message to a patient."
      >
        <form onSubmit={handleSendMessageSubmit} className={styles.dialogForm}>
          {formError && <div className={styles.formErrorAlert}>{formError}</div>}

          <div className={styles.formGroup}>
            <Select
              label="Select Patient (Optional)"
              value={selectedPatientId}
              onChange={(e) => handlePatientSelect(e.target.value)}
              options={[
                { value: '', label: '-- Manual Recipient --' },
                ...patientsList.map((p) => ({
                  value: p.id,
                  label: `${p.name} ${p.phone ? `(${p.phone})` : ''}`,
                })),
              ]}
            />
          </div>

          <div className={styles.formGroup}>
            <Input
              label="Recipient Phone or Email *"
              value={recipient}
              onChange={(e) => setRecipient(e.target.value)}
              required
            />
          </div>

          <div className={styles.formGroup}>
            <Select
              label="Communication Channel"
              value={msgChannel}
              onChange={(e) => setMsgChannel(e.target.value as CommunicationChannel)}
              options={COMMUNICATION_CHANNELS.filter((c) => c !== 'internal_note').map((c) => ({
                value: c,
                label: c.toUpperCase(),
              }))}
            />
          </div>

          <div className={styles.formGroup}>
            <Select
              label="Load From Template (Optional)"
              value={selectedTemplateId}
              onChange={(e) => handleTemplateSelect(e.target.value)}
              options={[
                { value: '', label: '-- Custom Message --' },
                ...templates
                  .filter((t) => t.channel === msgChannel)
                  .map((t) => ({ value: t.id, label: t.name })),
              ]}
            />
          </div>

          {msgChannel === 'email' && (
            <div className={styles.formGroup}>
              <Input
                label="Email Subject"
                value={msgSubject}
                onChange={(e) => setMsgSubject(e.target.value)}
                required
              />
            </div>
          )}

          <div className={styles.formGroup}>
            <label className={styles.inputLabel}>Message Content *</label>
            <textarea
              className={styles.textarea}
              rows={4}
              value={msgBody}
              onChange={(e) => setMsgBody(e.target.value)}
              required
            />
          </div>

          <div className={styles.formActions}>
            <Button
              type="button"
              variant="ghost"
              onClick={() => setIsNewMessageOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" variant="primary" disabled={isSubmitting}>
              {isSubmitting ? 'Sending...' : 'Send Message'}
            </Button>
          </div>
        </form>
      </Dialog>

      {/* Create Template Dialog */}
      <Dialog
        open={isNewTemplateOpen}
        onClose={() => setIsNewTemplateOpen(false)}
        title="Create Message Template"
        description="Add a reusable template for automated reminders and campaigns."
      >
        <form onSubmit={handleCreateTemplateSubmit} className={styles.dialogForm}>
          {formError && <div className={styles.formErrorAlert}>{formError}</div>}

          <div className={styles.formGroup}>
            <Input
              label="Template Name *"
              value={tplName}
              onChange={(e) => setTplName(e.target.value)}
              placeholder="e.g. 48-Hour Reminder"
              required
            />
          </div>

          <div className={styles.formGroup}>
            <Select
              label="Category"
              value={tplCategory}
              onChange={(e) => setTplCategory(e.target.value as TemplateCategory)}
              options={TEMPLATE_CATEGORIES.map((c) => ({
                value: c,
                label: c.replace(/_/g, ' ').toUpperCase(),
              }))}
            />
          </div>

          <div className={styles.formGroup}>
            <Select
              label="Channel"
              value={tplChannel}
              onChange={(e) => setTplChannel(e.target.value as CommunicationChannel)}
              options={COMMUNICATION_CHANNELS.filter((c) =>
                ['sms', 'email', 'whatsapp'].includes(c)
              ).map((c) => ({
                value: c,
                label: c.toUpperCase(),
              }))}
            />
          </div>

          {tplChannel === 'email' && (
            <div className={styles.formGroup}>
              <Input
                label="Email Subject"
                value={tplSubject}
                onChange={(e) => setTplSubject(e.target.value)}
                placeholder="Subject line with {{patientName}} tags"
              />
            </div>
          )}

          <div className={styles.formGroup}>
            <label className={styles.inputLabel}>Body Text *</label>
            <textarea
              className={styles.textarea}
              rows={4}
              value={tplBody}
              onChange={(e) => setTplBody(e.target.value)}
              placeholder="Message body with {{clinicName}} and {{appointmentTime}} tags..."
              required
            />
          </div>

          <div className={styles.formActions}>
            <Button
              type="button"
              variant="ghost"
              onClick={() => setIsNewTemplateOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" variant="primary" disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : 'Save Template'}
            </Button>
          </div>
        </form>
      </Dialog>

      {/* Message Details Modal */}
      {selectedMessage && (
        <Dialog
          open={!!selectedMessage}
          onClose={() => setSelectedMessage(null)}
          title="Communication Details"
          description={`Logged ID: ${selectedMessage.id.slice(0, 8)}`}
        >
          <div className={styles.msgDetails}>
            <div className={styles.detailRow}>
              <strong>Recipient:</strong> {selectedMessage.recipient}
            </div>
            <div className={styles.detailRow}>
              <strong>Channel:</strong> {selectedMessage.channel.toUpperCase()}
            </div>
            <div className={styles.detailRow}>
              <strong>Status:</strong>{' '}
              <Badge variant={getStatusVariant(selectedMessage.status)} size="sm">
                {selectedMessage.status.toUpperCase()}
              </Badge>
            </div>
            {selectedMessage.providerReference && (
              <div className={styles.detailRow}>
                <strong>Provider Ref:</strong>{' '}
                <code>{selectedMessage.providerReference}</code>
              </div>
            )}
            {selectedMessage.failureReason && (
              <div className={styles.errorBanner}>
                <strong>Failure Reason:</strong> {selectedMessage.failureReason}
              </div>
            )}
            <div className={styles.detailBodyBox}>
              {selectedMessage.subject && (
                <div className={styles.detailSubject}>
                  <strong>Subject:</strong> {selectedMessage.subject}
                </div>
              )}
              <div className={styles.detailBody}>{selectedMessage.body}</div>
            </div>
            <div className={styles.formActions}>
              <Button variant="secondary" onClick={() => setSelectedMessage(null)}>
                Close
              </Button>
            </div>
          </div>
        </Dialog>
      )}
    </div>
  );
}
