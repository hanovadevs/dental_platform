CREATE TABLE "payment_records" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"registration_intent_id" uuid,
	"organization_id" uuid,
	"provider" varchar(50) DEFAULT 'payfast' NOT NULL,
	"provider_transaction_id" varchar(100),
	"provider_reference" varchar(100),
	"amount" numeric(12, 2) NOT NULL,
	"currency" varchar(10) DEFAULT 'PKR' NOT NULL,
	"status" varchar(30) DEFAULT 'pending' NOT NULL,
	"verification_status" varchar(30) DEFAULT 'unverified' NOT NULL,
	"idempotency_key" varchar(150) NOT NULL,
	"provider_metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"paid_at" timestamp with time zone,
	"failed_at" timestamp with time zone,
	"cancelled_at" timestamp with time zone,
	CONSTRAINT "payment_records_idempotency_key_unique" UNIQUE("idempotency_key")
);
--> statement-breakpoint
CREATE TABLE "registration_intents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"organization_id" uuid,
	"clinic_name" varchar(255) NOT NULL,
	"contact_email" varchar(255) NOT NULL,
	"contact_phone" varchar(50) NOT NULL,
	"plan" varchar(50) DEFAULT 'starter' NOT NULL,
	"amount" numeric(12, 2) NOT NULL,
	"currency" varchar(10) DEFAULT 'PKR' NOT NULL,
	"status" varchar(30) DEFAULT 'pending_payment' NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "payment_records" ADD CONSTRAINT "payment_records_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_records" ADD CONSTRAINT "payment_records_registration_intent_id_registration_intents_id_fk" FOREIGN KEY ("registration_intent_id") REFERENCES "public"."registration_intents"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_records" ADD CONSTRAINT "payment_records_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "registration_intents" ADD CONSTRAINT "registration_intents_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "registration_intents" ADD CONSTRAINT "registration_intents_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "payment_records_user_idx" ON "payment_records" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "payment_records_intent_idx" ON "payment_records" USING btree ("registration_intent_id");--> statement-breakpoint
CREATE INDEX "payment_records_ref_idx" ON "payment_records" USING btree ("provider_reference");--> statement-breakpoint
CREATE INDEX "payment_records_status_idx" ON "payment_records" USING btree ("status");--> statement-breakpoint
CREATE INDEX "registration_intents_user_idx" ON "registration_intents" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "registration_intents_status_idx" ON "registration_intents" USING btree ("status");--> statement-breakpoint
CREATE INDEX "registration_intents_org_idx" ON "registration_intents" USING btree ("organization_id");