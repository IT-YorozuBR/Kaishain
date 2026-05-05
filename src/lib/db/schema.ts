import { sql } from 'drizzle-orm';
import {
  boolean,
  check,
  date,
  integer,
  pgEnum,
  pgTable,
  primaryKey,
  smallint,
  text,
  timestamp,
  unique,
  uuid,
} from 'drizzle-orm/pg-core';

export const roleEnum = pgEnum('role', ['RH', 'GESTOR', 'ADMIN']);
export type UserRole = (typeof roleEnum.enumValues)[number];

export const turnoEnum = pgEnum('turno', ['PRIMEIRO', 'SEGUNDO', 'TERCEIRO']);
export type Turno = (typeof turnoEnum.enumValues)[number];

export const departments = pgTable('departments', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull().unique(),
  active: boolean('active').notNull().default(true),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export type Department = typeof departments.$inferSelect;

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  role: roleEnum('role').notNull(),
  department: text('department'),
  active: boolean('active').notNull().default(true),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const employees = pgTable(
  'employees',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    name: text('name').notNull(),
    email: text('email'),
    registration: text('registration'),
    position: text('position'),
    departmentId: uuid('department_id').references(() => departments.id),
    managerId: uuid('manager_id').references(() => users.id),
    turno: turnoEnum('turno'),
    equipamentos: text('equipamentos').array().notNull().default([]),
    active: boolean('active').notNull().default(true),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (t) => [unique('employees_registration_unique').on(t.registration)],
);

export const checklistItems = pgTable('checklist_items', {
  id: uuid('id').primaryKey().defaultRandom(),
  label: text('label').notNull(),
  description: text('description'),
  order: integer('order').notNull(),
  active: boolean('active').notNull().default(true),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const evaluations = pgTable(
  'evaluations',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    employeeId: uuid('employee_id')
      .notNull()
      .references(() => employees.id),
    evaluatorId: uuid('evaluator_id')
      .notNull()
      .references(() => users.id),
    // DATE sem hora — garante unicidade por dia e facilita comparações
    evaluationDate: date('evaluation_date').notNull(),
    score: smallint('score').notNull(),
    note: text('note'),
    employeeDepartment: text('employee_department'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (t) => [
    unique('uq_employee_evaluation_date').on(t.employeeId, t.evaluationDate),
    check('chk_score_range', sql`${t.score} between 0 and 10`),
  ],
);

export const evaluationChecklistResults = pgTable(
  'evaluation_checklist_results',
  {
    evaluationId: uuid('evaluation_id')
      .notNull()
      .references(() => evaluations.id),
    checklistItemId: uuid('checklist_item_id')
      .notNull()
      .references(() => checklistItems.id),
    checked: boolean('checked').notNull().default(false),
  },
  (t) => [primaryKey({ columns: [t.evaluationId, t.checklistItemId] })],
);
