CREATE TABLE "departments" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "name" text NOT NULL,
  "active" boolean DEFAULT true NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL,
  CONSTRAINT "departments_name_unique" UNIQUE("name")
);

ALTER TABLE "employees"
  ADD COLUMN "department_id" uuid REFERENCES "departments"("id");
