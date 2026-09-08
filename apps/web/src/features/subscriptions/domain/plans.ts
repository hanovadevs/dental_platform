/**
 * Commercial Subscription Plans & Feature Matrix
 * Per spec (02_PHASES_AND_ROADMAP.md Phase 9 & 08_SECURITY_PRIVACY_AND_AUDIT.md).
 */

export type PlanTier = 'starter' | 'growth' | 'enterprise';

export interface PlanDefinition {
  id: PlanTier;
  name: string;
  priceMonthly: number;
  description: string;
  maxLocations: number;
  maxChairs: number;
  features: string[];
}

export const SUBSCRIPTION_PLANS: Record<PlanTier, PlanDefinition> = {
  starter: {
    id: 'starter',
    name: 'Solo Practice Starter',
    priceMonthly: 199,
    description: 'Designed for single-location clinics getting started with digital dental operations.',
    maxLocations: 1,
    maxChairs: 3,
    features: [
      'core_clinical',
      'basic_scheduling',
      'invoicing_and_payments',
      'patient_records',
      'standard_reports',
    ],
  },
  growth: {
    id: 'growth',
    name: 'Practice Growth Accelerator',
    priceMonthly: 399,
    description: 'Perfect for growing clinics needing automated recall, revenue opportunity discovery, and supply tracking.',
    maxLocations: 3,
    maxChairs: 10,
    features: [
      'core_clinical',
      'basic_scheduling',
      'invoicing_and_payments',
      'patient_records',
      'standard_reports',
      'revenue_opportunity_engine',
      'automated_communications',
      'inventory_management',
      'dental_lab_tracking',
      'bulk_patient_import',
    ],
  },
  enterprise: {
    id: 'enterprise',
    name: 'Multi-Location Enterprise',
    priceMonthly: 799,
    description: 'For multi-branch DSO groups and high-volume practices requiring unlimited scale and executive intelligence.',
    maxLocations: 999,
    maxChairs: 999,
    features: [
      'core_clinical',
      'basic_scheduling',
      'invoicing_and_payments',
      'patient_records',
      'standard_reports',
      'revenue_opportunity_engine',
      'automated_communications',
      'inventory_management',
      'dental_lab_tracking',
      'bulk_patient_import',
      'multi_location_analytics',
      'executive_dentist_scorecards',
      'custom_consent_templates',
      'full_audit_export',
      'priority_api_access',
    ],
  },
};

/**
 * Check whether an action or module is enabled for a given plan tier.
 */
export function isFeatureAvailable(feature: string, plan: PlanTier): boolean {
  const planDef = SUBSCRIPTION_PLANS[plan] || SUBSCRIPTION_PLANS.starter;
  return planDef.features.includes(feature);
}

/**
 * Check if practice can create an additional physical branch location.
 */
export function canAddLocation(currentLocationCount: number, plan: PlanTier): {
  allowed: boolean;
  max: number;
  current: number;
  reason?: string;
} {
  const planDef = SUBSCRIPTION_PLANS[plan] || SUBSCRIPTION_PLANS.starter;
  const allowed = currentLocationCount < planDef.maxLocations;
  return {
    allowed,
    max: planDef.maxLocations,
    current: currentLocationCount,
    reason: allowed
      ? undefined
      : `Your ${planDef.name} allows a maximum of ${planDef.maxLocations} branch location(s). Please upgrade to add more locations.`,
  };
}

/**
 * Check if practice can create an additional operatory chair.
 */
export function canAddChair(currentChairCount: number, plan: PlanTier): {
  allowed: boolean;
  max: number;
  current: number;
  reason?: string;
} {
  const planDef = SUBSCRIPTION_PLANS[plan] || SUBSCRIPTION_PLANS.starter;
  const allowed = currentChairCount < planDef.maxChairs;
  return {
    allowed,
    max: planDef.maxChairs,
    current: currentChairCount,
    reason: allowed
      ? undefined
      : `Your ${planDef.name} allows a maximum of ${planDef.maxChairs} operatory chair(s). Please upgrade to expand operatory capacity.`,
  };
}
