import { describe, it, expect } from 'vitest';
import { parsePatientCsvContent } from '@/features/admin/domain/csv-parser';

describe('Bulk CSV Patient Import Domain', () => {
  it('parses valid CSV text with standard headers', () => {
    const csv = [
      'first_name,last_name,phone,email,gender,dob,allergies,notes',
      'Sarah,Connor,+1 (555) 123-4567,SARAH@SKYNET.COM,Female,1985-05-12,Penicillin,High risk case',
      'John,Connor,+1 555 987 6543,john@rebellion.org,Male,2005-02-28,Latex,Follow-up needed',
    ].join('\n');

    const result = parsePatientCsvContent(csv);
    expect(result.valid).toBe(true);
    expect(result.rows.length).toBe(2);
    expect(result.errors.length).toBe(0);

    const row1 = result.rows[0];
    expect(row1.firstName).toBe('Sarah');
    expect(row1.lastName).toBe('Connor');
    expect(row1.phone).toBe('+1 (555) 123-4567');
    expect(row1.cleanPhone).toBe('+15551234567');
    expect(row1.cleanEmail).toBe('sarah@skynet.com');
    expect(row1.allergies).toBe('Penicillin');
    expect(row1.notes).toBe('High risk case');

    const row2 = result.rows[1];
    expect(row2.firstName).toBe('John');
    expect(row2.cleanPhone).toBe('+15559876543');
    expect(row2.cleanEmail).toBe('john@rebellion.org');
  });

  it('supports camelCase and alternative header formats', () => {
    const csv = [
      'firstName,lastName,phone,email,dateOfBirth',
      'Kyle,Reese,+15550001111,kyle@future.net,1990-01-01',
    ].join('\n');

    const result = parsePatientCsvContent(csv);
    expect(result.valid).toBe(true);
    expect(result.rows.length).toBe(1);
    expect(result.rows[0].firstName).toBe('Kyle');
    expect(result.rows[0].dateOfBirth).toBe('1990-01-01');
  });

  it('rejects empty or single-line CSV with EMPTY_FILE code', () => {
    const emptyResult = parsePatientCsvContent('');
    expect(emptyResult.valid).toBe(false);
    expect(emptyResult.errorCode).toBe('EMPTY_FILE');

    const headerOnly = parsePatientCsvContent('first_name,last_name,phone\n');
    expect(headerOnly.valid).toBe(false);
    expect(headerOnly.errorCode).toBe('EMPTY_FILE');
  });

  it('rejects CSV with missing required columns with INVALID_HEADERS code', () => {
    const missingLastName = parsePatientCsvContent('first_name,phone,email\nAlice,+15551112222,alice@test.com');
    expect(missingLastName.valid).toBe(false);
    expect(missingLastName.errorCode).toBe('INVALID_HEADERS');
    expect(missingLastName.errorMessage).toContain('"firstName" and "lastName" are mandatory');

    const missingFirstName = parsePatientCsvContent('last_name,phone,email\nSmith,+15551112222,smith@test.com');
    expect(missingFirstName.valid).toBe(false);
    expect(missingFirstName.errorCode).toBe('INVALID_HEADERS');
  });

  it('collects row errors for missing name while parsing valid rows', () => {
    const csv = [
      'first_name,last_name,phone,email',
      'Valid,Patient,+15551112233,valid@test.com',
      ',MissingFirst,+15552223344,missing@test.com',
      'MissingLast,,+15553334455,missing2@test.com',
      'Another,Valid,+15554445566,valid2@test.com',
    ].join('\n');

    const result = parsePatientCsvContent(csv);
    expect(result.valid).toBe(true);
    expect(result.rows.length).toBe(2);
    expect(result.errors.length).toBe(2);

    expect(result.errors[0].row).toBe(3);
    expect(result.errors[0].error).toContain('First name and Last name are required');

    expect(result.errors[1].row).toBe(4);
    expect(result.errors[1].error).toContain('First name and Last name are required');
  });

  it('collects row errors for rows without phone and email', () => {
    const csv = [
      'first_name,last_name,phone,email',
      'No,Contact,,',
      'Has,Phone,+15551112222,',
      'Has,Email,,email@test.com',
    ].join('\n');

    const result = parsePatientCsvContent(csv);
    expect(result.valid).toBe(true);
    expect(result.rows.length).toBe(2);
    expect(result.errors.length).toBe(1);
    expect(result.errors[0].row).toBe(2);
    expect(result.errors[0].error).toContain('At least one contact method (phone or email) is required');
  });

  it('correctly handles quoted fields with internal commas', () => {
    const csv = [
      'first_name,last_name,phone,email,address',
      'Arthur,"Dent, Esq.",+44123456789,arthur@galaxy.org,"Flat 4, 12 Country Lane"',
    ].join('\n');

    const result = parsePatientCsvContent(csv);
    expect(result.valid).toBe(true);
    expect(result.rows.length).toBe(1);
    expect(result.rows[0].lastName).toBe('Dent, Esq.');
    expect(result.rows[0].address).toBe('Flat 4, 12 Country Lane');
  });
});
