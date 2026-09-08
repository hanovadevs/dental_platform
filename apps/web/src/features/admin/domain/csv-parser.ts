/**
 * Pure domain CSV parser and validation for Patient Bulk Imports.
 * Per spec (09_TESTING_AND_QA.md Section 7).
 */

export interface ParsedCsvRow {
  rowNumber: number;
  firstName: string;
  lastName: string;
  phone: string;
  cleanPhone: string;
  email: string;
  cleanEmail: string;
  dateOfBirth?: string;
  gender?: string;
  address?: string;
  allergies?: string;
  notes?: string;
}

export interface ParseCsvResult {
  valid: boolean;
  errorCode?: 'EMPTY_FILE' | 'INVALID_HEADERS';
  errorMessage?: string;
  headers: string[];
  rows: ParsedCsvRow[];
  errors: Array<{ row: number; error: string }>;
}

export function parsePatientCsvContent(csvContent: string): ParseCsvResult {
  const lines = csvContent
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  if (lines.length < 2) {
    return {
      valid: false,
      errorCode: 'EMPTY_FILE',
      errorMessage: 'CSV file must contain a header row and at least one data row',
      headers: [],
      rows: [],
      errors: [],
    };
  }

  // Parse header
  const headers = lines[0]
    .split(',')
    .map((h) => h.trim().replace(/^["']|["']$/g, '').toLowerCase());

  const firstIdx = headers.findIndex((h) => h === 'firstname' || h === 'first_name');
  const lastIdx = headers.findIndex((h) => h === 'lastname' || h === 'last_name');
  const phoneIdx = headers.findIndex((h) => h === 'phone');
  const emailIdx = headers.findIndex((h) => h === 'email');
  const dobIdx = headers.findIndex((h) => h === 'dob' || h === 'dateofbirth' || h === 'birthdate');
  const genderIdx = headers.findIndex((h) => h === 'gender');
  const addressIdx = headers.findIndex((h) => h === 'address');
  const allergiesIdx = headers.findIndex((h) => h === 'allergies' || h === 'allergy');
  const notesIdx = headers.findIndex((h) => h === 'notes' || h === 'note');

  if (firstIdx === -1 || lastIdx === -1) {
    return {
      valid: false,
      errorCode: 'INVALID_HEADERS',
      errorMessage: 'Missing required header columns: "firstName" and "lastName" are mandatory',
      headers,
      rows: [],
      errors: [],
    };
  }

  const rows: ParsedCsvRow[] = [];
  const errors: Array<{ row: number; error: string }> = [];

  for (let i = 1; i < lines.length; i++) {
    const rowNum = i + 1;
    const line = lines[i];

    // CSV token parser with basic quotes handling
    const cells: string[] = [];
    let currentCell = '';
    let inQuotes = false;

    for (let c = 0; c < line.length; c++) {
      const char = line[c];
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        cells.push(currentCell.trim().replace(/^["']|["']$/g, ''));
        currentCell = '';
      } else {
        currentCell += char;
      }
    }
    cells.push(currentCell.trim().replace(/^["']|["']$/g, ''));

    const firstName = cells[firstIdx] || '';
    const lastName = cells[lastIdx] || '';
    const phone = phoneIdx !== -1 ? cells[phoneIdx] || '' : '';
    const email = emailIdx !== -1 ? cells[emailIdx] || '' : '';
    const dateOfBirth = dobIdx !== -1 ? cells[dobIdx] : undefined;
    const gender = genderIdx !== -1 ? cells[genderIdx] : undefined;
    const address = addressIdx !== -1 ? cells[addressIdx] : undefined;
    const allergies = allergiesIdx !== -1 ? cells[allergiesIdx] : undefined;
    const notes = notesIdx !== -1 ? cells[notesIdx] : undefined;

    if (!firstName || !lastName) {
      errors.push({ row: rowNum, error: 'First name and Last name are required' });
      continue;
    }

    if (!phone && !email) {
      errors.push({ row: rowNum, error: 'At least one contact method (phone or email) is required' });
      continue;
    }

    const cleanPhone = phone.replace(/[^0-9+]/g, '');
    const cleanEmail = email.toLowerCase();

    rows.push({
      rowNumber: rowNum,
      firstName,
      lastName,
      phone,
      cleanPhone,
      email,
      cleanEmail,
      dateOfBirth: dateOfBirth || undefined,
      gender: gender || undefined,
      address: address || undefined,
      allergies: allergies || undefined,
      notes: notes || undefined,
    });
  }

  return {
    valid: true,
    headers,
    rows,
    errors,
  };
}
