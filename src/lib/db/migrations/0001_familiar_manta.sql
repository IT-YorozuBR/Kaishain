ALTER TABLE "checklist_items" ADD COLUMN "created_at" timestamp DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "checklist_items" ADD COLUMN "updated_at" timestamp DEFAULT now() NOT NULL;