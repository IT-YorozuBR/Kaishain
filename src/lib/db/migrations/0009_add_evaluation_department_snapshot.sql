ALTER TABLE "evaluations" ADD COLUMN "employee_department" text;

UPDATE "evaluations" AS "evaluation"
SET "employee_department" = COALESCE("evaluator"."department", "department"."name")
FROM "employees" AS "employee"
LEFT JOIN "departments" AS "department" ON "employee"."department_id" = "department"."id",
  "users" AS "evaluator"
WHERE "evaluation"."employee_id" = "employee"."id"
  AND "evaluation"."evaluator_id" = "evaluator"."id";
