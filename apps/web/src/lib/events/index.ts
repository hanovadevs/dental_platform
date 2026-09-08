/**
 * Domain event bus for the modular monolith.
 * Per spec (04_SYSTEM_ARCHITECTURE.md Section 6):
 * "Use domain events inside the modular monolith."
 *
 * Events enable revenue logic without tightly coupling modules.
 * In-process event bus for now; can be extracted to a message queue later.
 */

export type DomainEventHandler<T = unknown> = (event: T) => Promise<void>;

interface EventSubscription {
  eventType: string;
  handler: DomainEventHandler;
}

class DomainEventBus {
  private subscriptions: EventSubscription[] = [];

  /**
   * Subscribe to a domain event type.
   */
  on<T>(eventType: string, handler: DomainEventHandler<T>): void {
    this.subscriptions.push({
      eventType,
      handler: handler as DomainEventHandler,
    });
  }

  /**
   * Emit a domain event. All matching handlers are executed.
   * Errors in individual handlers are logged but do not block other handlers.
   */
  async emit<T>(eventType: string, event: T): Promise<void> {
    const handlers = this.subscriptions.filter(
      (s) => s.eventType === eventType,
    );

    const results = await Promise.allSettled(
      handlers.map((s) => s.handler(event)),
    );

    for (const result of results) {
      if (result.status === 'rejected') {
        console.error(
          `[EventBus] Handler failed for ${eventType}:`,
          result.reason,
        );
      }
    }
  }

  /**
   * Remove all subscriptions (for testing).
   */
  clear(): void {
    this.subscriptions = [];
  }
}

// Singleton event bus
export const eventBus = new DomainEventBus();

/**
 * Domain event type constants.
 */
export const DomainEvents = {
  PATIENT_CREATED: 'patient.created',
  APPOINTMENT_CREATED: 'appointment.created',
  APPOINTMENT_CONFIRMED: 'appointment.confirmed',
  APPOINTMENT_CANCELLED: 'appointment.cancelled',
  APPOINTMENT_NO_SHOW: 'appointment.no_show',
  APPOINTMENT_COMPLETED: 'appointment.completed',
  TREATMENT_PLAN_PRESENTED: 'treatment_plan.presented',
  TREATMENT_PLAN_ACCEPTED: 'treatment_plan.accepted',
  TREATMENT_COMPLETED: 'treatment.completed',
  INVOICE_CREATED: 'invoice.created',
  INVOICE_OVERDUE: 'invoice.overdue',
  PAYMENT_RECORDED: 'payment.recorded',
  RECALL_DUE: 'recall.due',
  LEAD_CREATED: 'lead.created',
  LEAD_LOST: 'lead.lost',
  REVENUE_OPPORTUNITY_CREATED: 'revenue_opportunity.created',
  REVENUE_OPPORTUNITY_RESOLVED: 'revenue_opportunity.resolved',
} as const;
