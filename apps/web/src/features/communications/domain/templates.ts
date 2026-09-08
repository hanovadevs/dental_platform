import { TemplateVariables } from './types';

/**
 * Safely interpolates `{{variable}}` tags in a message body or subject.
 */
export function interpolateTemplate(
  templateText: string,
  variables: TemplateVariables
): string {
  if (!templateText) return '';

  return templateText.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_, key) => {
    const val = variables[key];
    return val !== undefined && val !== null ? String(val) : '';
  });
}

/**
 * Renders subject (if provided) and body for a template.
 */
export function renderTemplate(
  template: { subject?: string | null; body: string },
  variables: TemplateVariables
): { subject?: string; body: string } {
  return {
    subject: template.subject
      ? interpolateTemplate(template.subject, variables)
      : undefined,
    body: interpolateTemplate(template.body, variables),
  };
}

/**
 * Extracts all unique placeholder variable names from a template string.
 */
export function extractTemplateVariables(templateText: string): string[] {
  if (!templateText) return [];

  const matches = templateText.matchAll(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g);
  const vars = new Set<string>();

  for (const match of matches) {
    if (match[1]) {
      vars.add(match[1]);
    }
  }

  return Array.from(vars);
}
