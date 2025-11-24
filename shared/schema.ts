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

// Case status enum values
export const caseStatuses = [
  "OPEN",
  "UNDER_REVIEW",
  "CLEARED",
] as const;

// Right to Work Check table
export const rightToWorkChecks = pgTable("right_to_work_checks", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  employeeId: varchar("employee_id").references(() => employees.id, { onDelete: "cascade" }),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  documentType: varchar("document_type", { enum: documentTypes }).notNull(),
  documentNumber: varchar("document_number"),
  countryOfIssue: varchar("country_of_issue"),
  dateOfIssue: date("date_of_issue"),
  expiryDate: date("expiry_date").notNull(),
  workStatus: varchar("work_status", { enum: workStatuses }).notNull(),
  caseStatus: varchar("case_status", { enum: caseStatuses }).notNull().default("OPEN"),
  decisionSummary: text("decision_summary"),
  decisionDetails: text("decision_details").array(),
  fileUrl: varchar("file_url"),
  ocrRawText: text("ocr_raw_text"),
  ocrExtractedFields: jsonb("ocr_extracted_fields"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const rightToWorkChecksRelations = relations(rightToWorkChecks, ({ one, many }) => ({
  employee: one(employees, {
    fields: [rightToWorkChecks.employeeId],
    references: [employees.id],
  }),
  user: one(users, {
    fields: [rightToWorkChecks.userId],
    references: [users.id],
  }),
  notes: many(rightToWorkCheckNotes),
  documents: many(rightToWorkCheckDocuments),
}));

// Right to Work Check Notes table
export const rightToWorkCheckNotes = pgTable("right_to_work_check_notes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  checkId: varchar("check_id").notNull().references(() => rightToWorkChecks.id, { onDelete: "cascade" }),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  content: text("content").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const rightToWorkCheckNotesRelations = relations(rightToWorkCheckNotes, ({ one }) => ({
  check: one(rightToWorkChecks, {
    fields: [rightToWorkCheckNotes.checkId],
    references: [rightToWorkChecks.id],
  }),
  user: one(users, {
    fields: [rightToWorkCheckNotes.userId],
    references: [users.id],
  }),
}));

// Right to Work Check Documents table
export const rightToWorkCheckDocuments = pgTable("right_to_work_check_documents", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  checkId: varchar("check_id").notNull().references(() => rightToWorkChecks.id, { onDelete: "cascade" }),
  fileName: varchar("file_name").notNull(),
  fileUrl: varchar("file_url").notNull(),
  mimeType: varchar("mime_type"),
  sizeBytes: varchar("size_bytes"),
  uploadedAt: timestamp("uploaded_at").defaultNow(),
});

export const rightToWorkCheckDocumentsRelations = relations(rightToWorkCheckDocuments, ({ one }) => ({
  check: one(rightToWorkChecks, {
    fields: [rightToWorkCheckDocuments.checkId],
    references: [rightToWorkChecks.id],
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

// Schema for creating checks with evaluation results (used by backend)
export const createRightToWorkCheckSchema = createInsertSchema(rightToWorkChecks).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Extended schema for form validation
export const employeeFormSchema = insertEmployeeSchema.omit({ userId: true }).extend({
  dateOfBirth: z.string().optional(),
});

export const checkFormSchema = insertRightToWorkCheckSchema.omit({ userId: true }).extend({
  dateOfIssue: z.string().optional(),
  expiryDate: z.string().min(1, "Expiry date is required"),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  employeeId: z.string().optional(),
});

export const insertRightToWorkCheckNoteSchema = createInsertSchema(rightToWorkCheckNotes).omit({
  id: true,
  createdAt: true,
});

export const insertRightToWorkCheckDocumentSchema = createInsertSchema(rightToWorkCheckDocuments).omit({
  id: true,
  uploadedAt: true,
});

// Types
export type UpsertUser = z.infer<typeof upsertUserSchema>;
export type User = typeof users.$inferSelect;
export type InsertEmployee = z.infer<typeof insertEmployeeSchema>;
export type Employee = typeof employees.$inferSelect;
export type InsertRightToWorkCheck = z.infer<typeof insertRightToWorkCheckSchema>;
export type CreateRightToWorkCheck = z.infer<typeof createRightToWorkCheckSchema>;
export type RightToWorkCheck = typeof rightToWorkChecks.$inferSelect;
export type DocumentType = typeof documentTypes[number];
export type WorkStatus = typeof workStatuses[number];
export type CaseStatus = typeof caseStatuses[number];

// Notification preferences table
export const notificationPreferences = pgTable("notification_preferences", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  emailEnabled: varchar("email_enabled").notNull().default("true"),
  notificationDays: varchar("notification_days").array().notNull().default(sql`ARRAY['60', '30', '14', '7']`),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const notificationPreferencesRelations = relations(notificationPreferences, ({ one }) => ({
  user: one(users, {
    fields: [notificationPreferences.userId],
    references: [users.id],
  }),
}));

// Audit log table
export const auditLogs = pgTable("audit_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  action: varchar("action").notNull(),
  entityType: varchar("entity_type").notNull(),
  entityId: varchar("entity_id"),
  details: text("details"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const auditLogsRelations = relations(auditLogs, ({ one }) => ({
  user: one(users, {
    fields: [auditLogs.userId],
    references: [users.id],
  }),
}));

// Talent Profile enums
export const workAreas = [
  "CLEANING",
  "STADIUM_EVENTS",
  "CATERING",
  "WAREHOUSE",
  "RETAIL",
  "CARE",
  "OTHER",
] as const;

export const shiftPreferences = [
  "DAY",
  "EVENING",
  "NIGHT",
  "WEEKEND",
] as const;

export const weeklyHoursBands = [
  "UNDER_20",
  "H20_30",
  "OVER_30",
  "UNKNOWN",
] as const;

export const languageLevels = [
  "NONE",
  "BASIC",
  "GOOD",
  "FLUENT",
  "UNKNOWN",
] as const;

export const permitHorizonBands = [
  "OVER_24M",
  "M12_24",
  "M6_12",
  "UNDER_6",
  "UNKNOWN",
] as const;

// Talent Profile table
export const talentProfiles = pgTable("talent_profiles", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  employeeId: varchar("employee_id").notNull().references(() => employees.id, { onDelete: "cascade" }),
  isVisibleInTalentPool: varchar("is_visible_in_talent_pool").notNull().default("false"),
  consentTimestamp: timestamp("consent_timestamp"),
  
  headline: varchar("headline"),
  workArea: varchar("work_area", { enum: workAreas }),
  locationCity: varchar("location_city"),
  locationRegion: varchar("location_region"),
  travelRadiusKm: varchar("travel_radius_km"),
  
  shiftPreferencesList: varchar("shift_preferences_list").array().default(sql`ARRAY[]::varchar[]`),
  weeklyHoursBand: varchar("weekly_hours_band", { enum: weeklyHoursBands }),
  
  germanLevel: varchar("german_level", { enum: languageLevels }),
  englishLevel: varchar("english_level", { enum: languageLevels }),
  
  isActivelyLooking: varchar("is_actively_looking").notNull().default("false"),
  availableFrom: timestamp("available_from"),
  
  lastCheckId: varchar("last_check_id"),
  lastCheckDate: timestamp("last_check_date"),
  lastCheckStatus: varchar("last_check_status", { enum: workStatuses }),
  permitHorizonBand: varchar("permit_horizon_band", { enum: permitHorizonBands }),
  employerChangePossible: varchar("employer_change_possible"),
  workAuthorizationSummary: text("work_authorization_summary"),
  internalVisaNotes: text("internal_visa_notes"),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const talentProfilesRelations = relations(talentProfiles, ({ one }) => ({
  user: one(users, {
    fields: [talentProfiles.userId],
    references: [users.id],
  }),
  employee: one(employees, {
    fields: [talentProfiles.employeeId],
    references: [employees.id],
  }),
}));

// Extended types with relations
export type EmployeeWithChecks = Employee & {
  checks: RightToWorkCheck[];
  latestCheck?: RightToWorkCheck;
};

export type CheckWithEmployee = RightToWorkCheck & {
  employee: Employee;
};

export type AuditLog = typeof auditLogs.$inferSelect;
export type NotificationPreference = typeof notificationPreferences.$inferSelect;
export type InsertRightToWorkCheckNote = z.infer<typeof insertRightToWorkCheckNoteSchema>;
export type RightToWorkCheckNote = typeof rightToWorkCheckNotes.$inferSelect;
export type InsertRightToWorkCheckDocument = z.infer<typeof insertRightToWorkCheckDocumentSchema>;
export type RightToWorkCheckDocument = typeof rightToWorkCheckDocuments.$inferSelect;

export const insertTalentProfileSchema = createInsertSchema(talentProfiles).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  lastCheckId: true,
  lastCheckDate: true,
  lastCheckStatus: true,
  permitHorizonBand: true,
  employerChangePossible: true,
  workAuthorizationSummary: true,
});

export type InsertTalentProfile = z.infer<typeof insertTalentProfileSchema>;
export type TalentProfile = typeof talentProfiles.$inferSelect;
export type WorkArea = typeof workAreas[number];
export type ShiftPreference = typeof shiftPreferences[number];
export type WeeklyHoursBand = typeof weeklyHoursBands[number];
export type LanguageLevel = typeof languageLevels[number];
export type PermitHorizonBand = typeof permitHorizonBands[number];

export type TalentProfileWithEmployee = TalentProfile & {
  employee: Employee;
};
