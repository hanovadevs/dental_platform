import { describe, it, expect } from 'vitest';
import {
  interpolateTemplate,
  renderTemplate,
  extractTemplateVariables,
} from '../features/communications/domain/templates';

describe('Communication Templates & Variable Interpolation', () => {
  it('replaces single and multiple tokens accurately', () => {
    const template = 'Hi {{patientFirstName}}, your appointment is at {{appointmentTime}} with Dr. {{dentistName}}.';
    const result = interpolateTemplate(template, {
      patientFirstName: 'Sarah',
      appointmentTime: '10:30 AM',
      dentistName: 'Chen',
    });

    expect(result).toBe('Hi Sarah, your appointment is at 10:30 AM with Dr. Chen.');
  });

  it('tolerates whitespace inside token brackets', () => {
    const template = 'Hello {{  patientName  }}, welcome to {{clinicName}}!';
    const result = interpolateTemplate(template, {
      patientName: 'John Doe',
      clinicName: 'Apex Dental',
    });

    expect(result).toBe('Hello John Doe, welcome to Apex Dental!');
  });

  it('replaces unsupplied variables with empty strings without crashing', () => {
    const template = 'Dear {{patientName}}, your balance is {{balanceDue}}. Pay here: {{paymentUrl}}';
    const result = interpolateTemplate(template, {
      patientName: 'Alice',
    });

    expect(result).toBe('Dear Alice, your balance is . Pay here: ');
  });

  it('renders both subject and body together', () => {
    const template = {
      subject: 'Reminder: Visit at {{clinicName}}',
      body: 'Hi {{patientFirstName}}, see you on {{appointmentDate}}!',
    };

    const rendered = renderTemplate(template, {
      clinicName: 'Smile Clinic',
      patientFirstName: 'Alex',
      appointmentDate: 'Tomorrow',
    });

    expect(rendered.subject).toBe('Reminder: Visit at Smile Clinic');
    expect(rendered.body).toBe('Hi Alex, see you on Tomorrow!');
  });

  it('extracts unique variable names from template string', () => {
    const template = 'Hi {{patientFirstName}}! Reminder from {{clinicName}} for {{patientFirstName}} on {{appointmentDate}}.';
    const vars = extractTemplateVariables(template);

    expect(vars).toHaveLength(3);
    expect(vars).toContain('patientFirstName');
    expect(vars).toContain('clinicName');
    expect(vars).toContain('appointmentDate');
  });
});
