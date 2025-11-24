import {
  users,
  employees,
  rightToWorkChecks,
  rightToWorkCheckNotes,
  rightToWorkCheckDocuments,
  auditLogs,
  talentProfiles,
  type User,
  type UpsertUser,
  type Employee,
  type InsertEmployee,
  type RightToWorkCheck,
  type InsertRightToWorkCheck,
  type CreateRightToWorkCheck,
  type EmployeeWithChecks,
  type RightToWorkCheckNote,
  type InsertRightToWorkCheckNote,
  type RightToWorkCheckDocument,
  type InsertRightToWorkCheckDocument,
  type CaseStatus,
  type AuditLog,
  type TalentProfile,
  type InsertTalentProfile,
  type TalentProfileWithEmployee,
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, and, or, gte, lte, like, sql, inArray } from "drizzle-orm";

export interface EmployeeFilters {
  search?: string;
  status?: string;
  documentType?: string;
  expiryFrom?: string;
  expiryTo?: string;
}

export interface TalentFilters {
  search?: string;
  workArea?: string;
  locationCity?: string;
  shift?: string;
  weeklyHoursBand?: string;
}

export interface IStorage {
  // User operations
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;

  // Employee operations
  getEmployeesByUserId(userId: string, filters?: EmployeeFilters): Promise<EmployeeWithChecks[]>;
  getEmployeeById(id: string): Promise<EmployeeWithChecks | undefined>;
  createEmployee(employee: InsertEmployee): Promise<Employee>;
  updateEmployee(id: string, employee: Partial<InsertEmployee>): Promise<Employee | undefined>;
  deleteEmployeeAndRelatedData(employeeId: string, userId: string): Promise<void>;
  
  // Right-to-work check operations
  createRightToWorkCheck(check: CreateRightToWorkCheck): Promise<RightToWorkCheck>;
  getChecksByEmployeeId(employeeId: string): Promise<RightToWorkCheck[]>;
  getStandaloneChecksByUserId(userId: string): Promise<RightToWorkCheck[]>;
  getRightToWorkCheckById(id: string): Promise<RightToWorkCheck | undefined>;
  updateCaseStatus(id: string, caseStatus: CaseStatus): Promise<RightToWorkCheck | undefined>;
  deleteRightToWorkCheck(id: string): Promise<void>;
  getExpiringRightToWorkChecks(userId: string, withinDays: number): Promise<RightToWorkCheck[]>;
  getAllRightToWorkChecksForUser(userId: string): Promise<RightToWorkCheck[]>;
  
  // Check notes operations
  createRightToWorkCheckNote(note: InsertRightToWorkCheckNote): Promise<RightToWorkCheckNote>;
  getRightToWorkCheckNotesByCheckId(checkId: string, userId: string): Promise<RightToWorkCheckNote[]>;
  
  // Check documents operations
  createRightToWorkCheckDocument(document: InsertRightToWorkCheckDocument): Promise<RightToWorkCheckDocument>;
  getRightToWorkCheckDocumentsByCheckId(checkId: string, userId: string): Promise<RightToWorkCheckDocument[]>;
  deleteRightToWorkCheckDocument(id: string, userId: string): Promise<void>;
  
  // Audit log operations
  createAuditLog(entry: { userId: string; action: string; entityType: string; entityId?: string; details?: string }): Promise<AuditLog>;
  getRecentAuditLogsForCheck(checkId: string, userId: string, limit?: number): Promise<AuditLog[]>;
  
  // Talent profile operations
  createOrUpdateTalentProfile(userId: string, employeeId: string, data: Partial<InsertTalentProfile>): Promise<TalentProfile>;
  getTalentProfiles(userId: string, filters?: TalentFilters): Promise<TalentProfileWithEmployee[]>;
  getTalentProfileById(userId: string, id: string): Promise<TalentProfileWithEmployee | undefined>;
  setTalentVisibility(userId: string, id: string, isVisible: boolean): Promise<TalentProfile | undefined>;
  updateTalentProfileWithLastCheck(userId: string, employeeId: string): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...userData,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }

  async getEmployeesByUserId(userId: string, filters?: EmployeeFilters): Promise<EmployeeWithChecks[]> {
    // Build WHERE conditions for employee search at DB level
    const employeeConditions: any[] = [eq(employees.userId, userId)];
    
    if (filters?.search) {
      const searchPattern = `%${filters.search.toLowerCase()}%`;
      employeeConditions.push(
        or(
          sql`LOWER(${employees.firstName}) LIKE ${searchPattern}`,
          sql`LOWER(${employees.lastName}) LIKE ${searchPattern}`
        )
      );
    }

    // First, get filtered employees from DB
    const employeesList = await db
      .select()
      .from(employees)
      .where(and(...employeeConditions))
      .orderBy(desc(employees.createdAt));

    // Build employee IDs for checks query
    const employeeIds = employeesList.map(e => e.id);
    
    if (employeeIds.length === 0) {
      return [];
    }

    // Fetch ALL checks for these employees in one query
    const allChecks = await db
      .select()
      .from(rightToWorkChecks)
      .where(inArray(rightToWorkChecks.employeeId, employeeIds))
      .orderBy(desc(rightToWorkChecks.createdAt));

    // Group checks by employee and find latest for each
    const checksByEmployee = new Map<string, RightToWorkCheck[]>();
    for (const check of allChecks) {
      // Skip standalone checks (employeeId is null)
      if (!check.employeeId) continue;
      
      if (!checksByEmployee.has(check.employeeId)) {
        checksByEmployee.set(check.employeeId, []);
      }
      checksByEmployee.get(check.employeeId)!.push(check);
    }

    // Build employees with checks and apply check-based filters
    const employeesWithChecks: EmployeeWithChecks[] = [];
    
    for (const employee of employeesList) {
      const checks = checksByEmployee.get(employee.id) || [];
      const latestCheck = checks[0]; // Already sorted by createdAt DESC
      
      // Apply check-based filters
      if (filters) {
        if (filters.status && latestCheck?.workStatus !== filters.status) {
          continue;
        }

        if (filters.documentType && latestCheck?.documentType !== filters.documentType) {
          continue;
        }

        if (filters.expiryFrom || filters.expiryTo) {
          if (!latestCheck?.expiryDate) {
            continue;
          }
          const expiryDate = new Date(latestCheck.expiryDate);
          
          if (filters.expiryFrom && new Date(filters.expiryFrom) > expiryDate) {
            continue;
          }
          if (filters.expiryTo && new Date(filters.expiryTo) < expiryDate) {
            continue;
          }
        }
      }
      
      employeesWithChecks.push({
        ...employee,
        checks,
        latestCheck,
      });
    }

    return employeesWithChecks;
  }

  async getEmployeeById(id: string): Promise<EmployeeWithChecks | undefined> {
    const [employee] = await db.select().from(employees).where(eq(employees.id, id));
    if (!employee) return undefined;

    const checks = await this.getChecksByEmployeeId(id);
    return {
      ...employee,
      checks,
      latestCheck: checks.sort(
        (a, b) => new Date(b.createdAt!).getTime() - new Date(a.createdAt!).getTime()
      )[0],
    };
  }

  async createEmployee(employeeData: InsertEmployee): Promise<Employee> {
    const [employee] = await db.insert(employees).values(employeeData).returning();
    return employee;
  }

  async updateEmployee(id: string, employeeData: Partial<InsertEmployee>): Promise<Employee | undefined> {
    const [employee] = await db
      .update(employees)
      .set({
        ...employeeData,
        updatedAt: new Date(),
      })
      .where(eq(employees.id, id))
      .returning();
    return employee;
  }

  async deleteEmployeeAndRelatedData(employeeId: string, userId: string): Promise<void> {
    // 1. Verify employee belongs to this user/tenant
    const [employee] = await db
      .select()
      .from(employees)
      .where(and(eq(employees.id, employeeId), eq(employees.userId, userId)));
    
    if (!employee) {
      throw new Error("Employee not found or unauthorized");
    }

    // 2. Get all checks for this employee
    const checks = await db
      .select()
      .from(rightToWorkChecks)
      .where(eq(rightToWorkChecks.employeeId, employeeId));
    
    const checkIds = checks.map(check => check.id);

    // 3. Delete notes for those checks
    if (checkIds.length > 0) {
      await db
        .delete(rightToWorkCheckNotes)
        .where(inArray(rightToWorkCheckNotes.checkId, checkIds));
    }

    // 4. Delete the checks
    await db
      .delete(rightToWorkChecks)
      .where(eq(rightToWorkChecks.employeeId, employeeId));

    // 5. Delete the employee
    await db
      .delete(employees)
      .where(eq(employees.id, employeeId));
  }

  async createRightToWorkCheck(checkData: CreateRightToWorkCheck): Promise<RightToWorkCheck> {
    const [check] = await db.insert(rightToWorkChecks).values(checkData).returning();
    return check;
  }

  async getChecksByEmployeeId(employeeId: string): Promise<RightToWorkCheck[]> {
    if (!employeeId) return [];
    
    return await db
      .select()
      .from(rightToWorkChecks)
      .where(eq(rightToWorkChecks.employeeId, employeeId))
      .orderBy(desc(rightToWorkChecks.createdAt));
  }

  async getStandaloneChecksByUserId(userId: string): Promise<RightToWorkCheck[]> {
    return await db
      .select()
      .from(rightToWorkChecks)
      .where(
        and(
          eq(rightToWorkChecks.userId, userId),
          sql`${rightToWorkChecks.employeeId} IS NULL`
        )
      )
      .orderBy(desc(rightToWorkChecks.createdAt));
  }

  async getRightToWorkCheckById(id: string): Promise<RightToWorkCheck | undefined> {
    const [check] = await db
      .select()
      .from(rightToWorkChecks)
      .where(eq(rightToWorkChecks.id, id));
    return check;
  }

  async updateCaseStatus(id: string, caseStatus: CaseStatus): Promise<RightToWorkCheck | undefined> {
    const [check] = await db
      .update(rightToWorkChecks)
      .set({
        caseStatus,
        updatedAt: new Date(),
      })
      .where(eq(rightToWorkChecks.id, id))
      .returning();
    return check;
  }

  async deleteRightToWorkCheck(id: string): Promise<void> {
    await db.delete(rightToWorkChecks).where(eq(rightToWorkChecks.id, id));
  }

  async getExpiringRightToWorkChecks(userId: string, withinDays: number): Promise<RightToWorkCheck[]> {
    const today = new Date();
    const futureDate = new Date();
    futureDate.setDate(today.getDate() + withinDays);

    const todayStr = today.toISOString().split('T')[0];
    const futureDateStr = futureDate.toISOString().split('T')[0];

    return await db
      .select()
      .from(rightToWorkChecks)
      .where(
        and(
          eq(rightToWorkChecks.userId, userId),
          sql`${rightToWorkChecks.expiryDate} IS NOT NULL`,
          lte(rightToWorkChecks.expiryDate, futureDateStr)
        )
      )
      .orderBy(rightToWorkChecks.expiryDate);
  }

  async getAllRightToWorkChecksForUser(userId: string): Promise<RightToWorkCheck[]> {
    return await db
      .select()
      .from(rightToWorkChecks)
      .where(eq(rightToWorkChecks.userId, userId))
      .orderBy(desc(rightToWorkChecks.createdAt));
  }

  async createRightToWorkCheckNote(noteData: InsertRightToWorkCheckNote): Promise<RightToWorkCheckNote> {
    // Verify the check belongs to this user before creating note
    const check = await this.getRightToWorkCheckById(noteData.checkId);
    if (!check || check.userId !== noteData.userId) {
      throw new Error("Check not found or access denied");
    }

    const [note] = await db.insert(rightToWorkCheckNotes).values(noteData).returning();
    return note;
  }

  async getRightToWorkCheckNotesByCheckId(checkId: string, userId: string): Promise<RightToWorkCheckNote[]> {
    // Verify the check belongs to this user before returning notes
    const check = await this.getRightToWorkCheckById(checkId);
    if (!check || check.userId !== userId) {
      return [];
    }

    return await db
      .select()
      .from(rightToWorkCheckNotes)
      .where(eq(rightToWorkCheckNotes.checkId, checkId))
      .orderBy(rightToWorkCheckNotes.createdAt);
  }

  async createRightToWorkCheckDocument(documentData: InsertRightToWorkCheckDocument): Promise<RightToWorkCheckDocument> {
    const [document] = await db.insert(rightToWorkCheckDocuments).values(documentData).returning();
    return document;
  }

  async getRightToWorkCheckDocumentsByCheckId(checkId: string, userId: string): Promise<RightToWorkCheckDocument[]> {
    // Verify the check belongs to this user before returning documents
    const check = await this.getRightToWorkCheckById(checkId);
    if (!check || check.userId !== userId) {
      return [];
    }

    return await db
      .select()
      .from(rightToWorkCheckDocuments)
      .where(eq(rightToWorkCheckDocuments.checkId, checkId))
      .orderBy(desc(rightToWorkCheckDocuments.uploadedAt));
  }

  async deleteRightToWorkCheckDocument(id: string, userId: string): Promise<void> {
    // First, get the document to find its checkId
    const [document] = await db
      .select()
      .from(rightToWorkCheckDocuments)
      .where(eq(rightToWorkCheckDocuments.id, id));

    if (!document) {
      throw new Error("Document not found");
    }

    // Verify the check belongs to this user
    const check = await this.getRightToWorkCheckById(document.checkId);
    if (!check || check.userId !== userId) {
      throw new Error("Access denied");
    }

    await db.delete(rightToWorkCheckDocuments).where(eq(rightToWorkCheckDocuments.id, id));
  }

  async createAuditLog(entry: { userId: string; action: string; entityType: string; entityId?: string; details?: string }): Promise<AuditLog> {
    const [log] = await db.insert(auditLogs).values(entry).returning();
    return log;
  }

  async getRecentAuditLogsForCheck(checkId: string, userId: string, limit: number = 5): Promise<AuditLog[]> {
    // Verify the check belongs to this user before returning logs
    const check = await this.getRightToWorkCheckById(checkId);
    if (!check || check.userId !== userId) {
      return [];
    }

    return await db
      .select()
      .from(auditLogs)
      .where(
        and(
          eq(auditLogs.entityType, "check"),
          eq(auditLogs.entityId, checkId)
        )
      )
      .orderBy(desc(auditLogs.createdAt))
      .limit(limit);
  }

  async createOrUpdateTalentProfile(userId: string, employeeId: string, data: Partial<InsertTalentProfile>): Promise<TalentProfile> {
    // Verify employee belongs to this user
    const [employee] = await db.select().from(employees).where(
      and(eq(employees.id, employeeId), eq(employees.userId, userId))
    );
    
    if (!employee) {
      throw new Error("Employee not found or access denied");
    }

    // Check if profile already exists
    const [existingProfile] = await db
      .select()
      .from(talentProfiles)
      .where(
        and(
          eq(talentProfiles.employeeId, employeeId),
          eq(talentProfiles.userId, userId)
        )
      );

    if (existingProfile) {
      // Update existing profile
      const [updated] = await db
        .update(talentProfiles)
        .set({
          ...data,
          updatedAt: new Date(),
        })
        .where(eq(talentProfiles.id, existingProfile.id))
        .returning();
      return updated;
    } else {
      // Create new profile
      const [created] = await db
        .insert(talentProfiles)
        .values({
          userId,
          employeeId,
          ...data,
        })
        .returning();
      return created;
    }
  }

  async getTalentProfiles(userId: string, filters?: TalentFilters): Promise<TalentProfileWithEmployee[]> {
    // Build WHERE conditions
    const conditions: any[] = [
      eq(talentProfiles.userId, userId),
      eq(talentProfiles.isVisibleInTalentPool, "true")
    ];

    if (filters?.workArea) {
      conditions.push(eq(talentProfiles.workArea, filters.workArea as any));
    }

    if (filters?.locationCity) {
      conditions.push(eq(talentProfiles.locationCity, filters.locationCity));
    }

    if (filters?.weeklyHoursBand) {
      conditions.push(eq(talentProfiles.weeklyHoursBand, filters.weeklyHoursBand as any));
    }

    // Fetch profiles with employee data
    const profiles = await db
      .select()
      .from(talentProfiles)
      .leftJoin(employees, eq(talentProfiles.employeeId, employees.id))
      .where(and(...conditions))
      .orderBy(desc(talentProfiles.updatedAt));

    // Filter in-memory for shift preferences and text search
    let results = profiles.map(row => ({
      ...row.talent_profiles,
      employee: row.employees!,
    }));

    if (filters?.shift) {
      results = results.filter(p => 
        p.shiftPreferencesList?.includes(filters.shift!)
      );
    }

    if (filters?.search) {
      const searchLower = filters.search.toLowerCase();
      results = results.filter(p => {
        const employeeName = `${p.employee.firstName} ${p.employee.lastName}`.toLowerCase();
        const headline = (p.headline || "").toLowerCase();
        const workArea = (p.workArea || "").toLowerCase();
        return employeeName.includes(searchLower) || 
               headline.includes(searchLower) || 
               workArea.includes(searchLower);
      });
    }

    return results;
  }

  async getTalentProfileById(userId: string, id: string): Promise<TalentProfileWithEmployee | undefined> {
    const [row] = await db
      .select()
      .from(talentProfiles)
      .leftJoin(employees, eq(talentProfiles.employeeId, employees.id))
      .where(
        and(
          eq(talentProfiles.id, id),
          eq(talentProfiles.userId, userId)
        )
      );

    if (!row || !row.talent_profiles || !row.employees) {
      return undefined;
    }

    return {
      ...row.talent_profiles,
      employee: row.employees,
    };
  }

  async setTalentVisibility(userId: string, id: string, isVisible: boolean): Promise<TalentProfile | undefined> {
    // Verify the profile belongs to this user
    const [existing] = await db
      .select()
      .from(talentProfiles)
      .where(
        and(
          eq(talentProfiles.id, id),
          eq(talentProfiles.userId, userId)
        )
      );

    if (!existing) {
      return undefined;
    }

    const [updated] = await db
      .update(talentProfiles)
      .set({
        isVisibleInTalentPool: isVisible ? "true" : "false",
        consentTimestamp: isVisible ? new Date() : existing.consentTimestamp,
        updatedAt: new Date(),
      })
      .where(eq(talentProfiles.id, id))
      .returning();

    return updated;
  }

  async updateTalentProfileWithLastCheck(userId: string, employeeId: string): Promise<void> {
    // Find the latest RTW check for this employee
    const latestCheck = await db
      .select()
      .from(rightToWorkChecks)
      .where(
        and(
          eq(rightToWorkChecks.employeeId, employeeId),
          eq(rightToWorkChecks.userId, userId)
        )
      )
      .orderBy(desc(rightToWorkChecks.createdAt))
      .limit(1);

    if (latestCheck.length === 0) {
      return; // No checks exist
    }

    const check = latestCheck[0];
    
    // Calculate permit horizon band based on expiry date
    let permitHorizonBand: string = "UNKNOWN";
    let employerChangePossible: string | null = null;
    let workAuthorizationSummary = "Work authorization details need to be checked on hire.";

    if (check.expiryDate) {
      const expiryDate = new Date(check.expiryDate);
      const now = new Date();
      const monthsDiff = (expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24 * 30);

      if (monthsDiff > 24) {
        permitHorizonBand = "OVER_24M";
      } else if (monthsDiff >= 12) {
        permitHorizonBand = "M12_24";
      } else if (monthsDiff >= 6) {
        permitHorizonBand = "M6_12";
      } else if (monthsDiff >= 0) {
        permitHorizonBand = "UNDER_6";
      } else {
        permitHorizonBand = "UNKNOWN"; // Expired
      }
    }

    // Generate work authorization summary based on status
    if (check.workStatus === "ELIGIBLE") {
      // Try to detect employer restrictions from decision details
      const hasEmployerRestriction = check.decisionDetails?.some(detail => 
        detail.toLowerCase().includes("employer") || 
        detail.toLowerCase().includes("restriction")
      );

      if (hasEmployerRestriction) {
        workAuthorizationSummary = "Allowed to work, but employer or conditions may be restricted – manual review recommended on hire.";
        employerChangePossible = "false";
      } else {
        workAuthorizationSummary = "Currently allowed to work in Germany; no employer restriction detected.";
        employerChangePossible = "true";
      }
    } else if (check.workStatus === "NEEDS_REVIEW") {
      workAuthorizationSummary = "Work authorization requires manual review before hire.";
      employerChangePossible = null;
    } else {
      workAuthorizationSummary = "Work authorization status unclear – verification needed before hire.";
      employerChangePossible = null;
    }

    // Update the talent profile
    await db
      .update(talentProfiles)
      .set({
        lastCheckId: check.id,
        lastCheckDate: check.createdAt,
        lastCheckStatus: check.workStatus,
        permitHorizonBand: permitHorizonBand as any,
        employerChangePossible,
        workAuthorizationSummary,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(talentProfiles.employeeId, employeeId),
          eq(talentProfiles.userId, userId)
        )
      );
  }
}

export const storage = new DatabaseStorage();
