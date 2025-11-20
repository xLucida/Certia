import { sql } from "drizzle-orm";
import {
  index,
  jsonb,
  pgTable,
  text,
  timestamp,
  varchar,
  date,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { relations } from "drizzle-orm";

// Session storage table for Replit Auth
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// User storage table for Replit Auth
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  companyName: varchar("company_name"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const usersRelations = relations(users, ({ many }) => ({
  employees: many(employees),
}));

// Employee table
export const employees = pgTable("employees", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  firstName: varchar("first_name").notNull(),
  lastName: varchar("last_name").notNull(),
  dateOfBirth: date("date_of_birth"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const employeesRelations = relations(employees, ({ one, many }) => ({
  user: one(users, {
    fields: [employees.userId],
    references: [users.id],
  }),
  checks: many(rightToWorkChecks),
}));

// Document type enum values
export const documentTypes = [
  "EU_BLUE_CARD",
  "EAT",
  "FIKTIONSBESCHEINIGUNG",
  "OTHER",
] as const;

// Work status enum values
export const workStatuses = [
  "ELIGIBLE",
  "NOT_ELIGIBLE",
  "NEEDS_REVIEW",
] as const;

// Right to Work Check table
export const rightToWorkChecks = pgTable("right_to_work_checks", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  employeeId: varchar("employee_id").notNull().references(() => employees.id, { onDelete: "cascade" }),
  documentType: varchar("document_type", { enum: documentTypes }).notNull(),
  documentNumber: varchar("document_number"),
  countryOfIssue: varchar("country_of_issue"),
  dateOfIssue: date("date_of_issue"),
  expiryDate: date("expiry_date").notNull(),
  workStatus: varchar("work_status", { enum: workStatuses }).notNull(),
  decisionSummary: varchar("decision_summary"),
  decisionDetails: text("decision_details"),
  fileUrl: varchar("file_url"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const rightToWorkChecksRelations = relations(rightToWorkChecks, ({ one }) => ({
  employee: one(employees, {
    fields: [rightToWorkChecks.employeeId],
    references: [employees.id],
  }),
}));

// Zod schemas and types
export const upsertUserSchema = createInsertSchema(users).pick({
  id: true,
  email: true,
  firstName: true,
  lastName: true,
  profileImageUrl: true,
  companyName: true,
});

export const insertEmployeeSchema = createInsertSchema(employees).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertRightToWorkCheckSchema = createInsertSchema(rightToWorkChecks).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  workStatus: true,
  decisionSummary: true,
  decisionDetails: true,
});

// Extended schema for form validation
export const employeeFormSchema = insertEmployeeSchema.extend({
  dateOfBirth: z.string().optional(),
});

export const checkFormSchema = insertRightToWorkCheckSchema.extend({
  dateOfIssue: z.string().optional(),
  expiryDate: z.string().min(1, "Expiry date is required"),
});

// Types
export type UpsertUser = z.infer<typeof upsertUserSchema>;
export type User = typeof users.$inferSelect;
export type InsertEmployee = z.infer<typeof insertEmployeeSchema>;
export type Employee = typeof employees.$inferSelect;
export type InsertRightToWorkCheck = z.infer<typeof insertRightToWorkCheckSchema>;
export type RightToWorkCheck = typeof rightToWorkChecks.$inferSelect;
export type DocumentType = typeof documentTypes[number];
export type WorkStatus = typeof workStatuses[number];

// Extended types with relations
export type EmployeeWithChecks = Employee & {
  checks: RightToWorkCheck[];
  latestCheck?: RightToWorkCheck;
};

export type CheckWithEmployee = RightToWorkCheck & {
  employee: Employee;
};
