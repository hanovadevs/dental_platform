CREATE TYPE "public"."voice_call_intent" AS ENUM('treatment_followup', 'overdue_recall', 'appointment_confirmation', 'unscheduled_care', 'reactivation', 'custom');--> statement-breakpoint
CREATE TYPE "public"."voice_call_task_status" AS ENUM('pending', 'queued', 'in_progress', 'completed', 'failed', 'escalated_to_human', 'cancelled');--> statement-breakpoint
CREATE TABLE "voice_call_tasks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"patient_id" uuid NOT NULL,
	"opportunity_id" uuid,
	"intent" "voice_call_intent" DEFAULT 'treatment_followup' NOT NULL,
	"status" "voice_call_task_status" DEFAULT 'pending' NOT NULL,
	"approved_context" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"constraints" jsonb DEFAULT '{"no_clinical_advice":true,"human_escalation_required_for":["acute_pain","pricing_dispute","clinical_diagnosis"],"max_duration_seconds":300}'::jsonb NOT NULL,
	"provider_job_id" varchar(150),
	"outcome" varchar(50),
	"booked_appointment_id" uuid,
	"needs_human_followup" boolean DEFAULT false NOT NULL,
	"human_followup_reason" text,
	"transcript" text,
	"call_duration_seconds" integer DEFAULT 0,
	"scheduled_for" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"created_by_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "voice_call_tasks" ADD CONSTRAINT "voice_call_tasks_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "voice_call_tasks" ADD CONSTRAINT "voice_call_tasks_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "voice_call_tasks" ADD CONSTRAINT "voice_call_tasks_opportunity_id_revenue_opportunities_id_fk" FOREIGN KEY ("opportunity_id") REFERENCES "public"."revenue_opportunities"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "voice_call_tasks" ADD CONSTRAINT "voice_call_tasks_booked_appointment_id_appointments_id_fk" FOREIGN KEY ("booked_appointment_id") REFERENCES "public"."appointments"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "voice_call_tasks" ADD CONSTRAINT "voice_call_tasks_created_by_id_users_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;