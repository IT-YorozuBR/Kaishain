CREATE TYPE "public"."turno" AS ENUM('MANHA', 'TARDE', 'NOITE');--> statement-breakpoint
ALTER TABLE "employees" ADD COLUMN "turno" "turno";