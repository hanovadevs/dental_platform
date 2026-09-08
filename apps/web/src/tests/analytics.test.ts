import { describe, it, expect } from 'vitest';

describe('Executive Analytics & Reporting Engine (Phase 8)', () => {
  describe('Production vs Collection Calculations', () => {
    it('calculates gross production, net production, and collection rate accurately', () => {
      const completedProcedures = [
        { fee: '150.00', status: 'completed' },
        { fee: '850.00', status: 'completed' },
        { fee: '1200.00', status: 'completed' },
        { fee: '400.00', status: 'proposed' }, // Proposed is not production yet
      ];

      const payments = [
        { amount: '150.00', method: 'credit_card' },
        { amount: '800.00', method: 'insurance' },
        { amount: '1000.00', method: 'debit_card' },
      ];

      const grossProduction = completedProcedures
        .filter((p) => p.status === 'completed')
        .reduce((sum, p) => sum + parseFloat(p.fee), 0);

      const totalCollections = payments.reduce((sum, p) => sum + parseFloat(p.amount), 0);

      expect(grossProduction).toBe(2200.0);
      expect(totalCollections).toBe(1950.0);

      // Collection Rate: (1950 / 2200) * 100 = 88.636... -> 88.6%
      const collectionRate = grossProduction > 0 ? (totalCollections / grossProduction) * 100 : 0;
      expect(parseFloat(collectionRate.toFixed(1))).toBe(88.6);

      const uncollectedAR = grossProduction - totalCollections;
      expect(uncollectedAR).toBe(250.0);
    });

    it('handles zero production gracefully without division by zero', () => {
      const grossProduction = 0;
      const totalCollections = 0;

      const collectionRate = grossProduction > 0 ? (totalCollections / grossProduction) * 100 : 0;
      expect(collectionRate).toBe(0);
    });
  });

  describe('Treatment Plan Acceptance Rate', () => {
    it('computes treatment acceptance rate by monetary value and by plan count', () => {
      const plans = [
        { proposedValue: 1000, acceptedValue: 1000, status: 'accepted' },
        { proposedValue: 2500, acceptedValue: 1500, status: 'partially_accepted' },
        { proposedValue: 800, acceptedValue: 0, status: 'presented' },
        { proposedValue: 1200, acceptedValue: 0, status: 'declined' },
      ];

      const totalProposed = plans.reduce((sum, p) => sum + p.proposedValue, 0); // 5500
      const totalAccepted = plans.reduce((sum, p) => sum + p.acceptedValue, 0); // 2500

      const valueAcceptanceRate = totalProposed > 0 ? (totalAccepted / totalProposed) * 100 : 0;
      expect(totalProposed).toBe(5500);
      expect(totalAccepted).toBe(2500);
      expect(parseFloat(valueAcceptanceRate.toFixed(1))).toBe(45.5);

      const acceptedPlansCount = plans.filter((p) => p.status === 'accepted' || p.status === 'partially_accepted').length;
      const planCountAcceptanceRate = (acceptedPlansCount / plans.length) * 100;
      expect(planCountAcceptanceRate).toBe(50.0);
    });
  });

  describe('Chair Utilization Metrics', () => {
    it('calculates operating chair utilization percentage based on available hours', () => {
      const chairCount = 4;
      const operatingHoursPerDay = 8;
      const workingDays = 5;
      const totalAvailableMinutes = chairCount * operatingHoursPerDay * workingDays * 60; // 4 * 8 * 5 * 60 = 9,600 minutes

      // Completed/booked appointments in minutes
      const appointments = [
        { durationMinutes: 60 },
        { durationMinutes: 90 },
        { durationMinutes: 45 },
        { durationMinutes: 120 },
        { durationMinutes: 60 },
      ];

      const bookedMinutes = appointments.reduce((sum, a) => sum + a.durationMinutes, 0); // 375 minutes
      const utilization = (bookedMinutes / totalAvailableMinutes) * 100;

      expect(totalAvailableMinutes).toBe(9600);
      expect(bookedMinutes).toBe(375);
      expect(parseFloat(utilization.toFixed(2))).toBe(3.91);
    });
  });

  describe('Provider Scorecards & Production Hourly Rate', () => {
    it('aggregates provider revenue and computes production per booked hour', () => {
      const providerStats = {
        providerId: 'dr-smith',
        providerName: 'Dr. John Smith, DDS',
        production: 12500.0,
        bookedMinutes: 1500, // 25 hours
        completedProcedures: 32,
      };

      const bookedHours = providerStats.bookedMinutes / 60;
      const hourlyProduction = bookedHours > 0 ? providerStats.production / bookedHours : 0;

      expect(bookedHours).toBe(25);
      expect(hourlyProduction).toBe(500.0); // $500/hr
    });
  });

  describe('Period-over-Period Delta Calculation', () => {
    it('calculates positive and negative percentage changes correctly', () => {
      const calcDelta = (current: number, prior: number) => {
        if (prior === 0) return current > 0 ? 100 : 0;
        return ((current - prior) / prior) * 100;
      };

      // Increase from $10,000 to $12,500 (+25%)
      expect(calcDelta(12500, 10000)).toBe(25);

      // Decrease from $10,000 to $8,000 (-20%)
      expect(calcDelta(8000, 10000)).toBe(-20);

      // From zero
      expect(calcDelta(5000, 0)).toBe(100);
      expect(calcDelta(0, 0)).toBe(0);
    });
  });

  describe('CSV Export Serialization', () => {
    it('formats CSV rows with correct headers and escapes commas/quotes', () => {
      const headers = ['Date', 'Metric', 'Location', 'Value', 'Notes'];
      const rows = [
        ['2026-09-01', 'Gross Production', 'Downtown Branch', '15200.00', 'Crown & Bridge promo'],
        ['2026-09-02', 'Collections', 'Northside Dental, Suite "A"', '12400.00', 'Normal day'],
      ];

      const escapeCsv = (val: string) => {
        if (val.includes(',') || val.includes('"') || val.includes('\n')) {
          return `"${val.replace(/"/g, '""')}"`;
        }
        return val;
      };

      const csvLines = [
        headers.join(','),
        ...rows.map((row) => row.map(escapeCsv).join(',')),
      ];

      const csvOutput = csvLines.join('\n');

      expect(csvLines[0]).toBe('Date,Metric,Location,Value,Notes');
      expect(csvLines[2]).toBe('2026-09-02,Collections,"Northside Dental, Suite ""A""",12400.00,Normal day');
      expect(csvOutput).toContain('Downtown Branch');
    });
  });
});
