import {
  users,
  employees,
  rightToWorkChecks,
  type User,
  type UpsertUser,
  type Employee,
  type InsertEmployee,
  type RightToWorkCheck,
  type InsertRightToWorkCheck,
  type EmployeeWithChecks,
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

export interface IStorage {
  // User operations
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;

  // Employee operations
  getEmployeesByUserId(userId: string, filters?: EmployeeFilters): Promise<EmployeeWithChecks[]>;
  getEmployeeById(id: string): Promise<EmployeeWithChecks | undefined>;
  createEmployee(employee: InsertEmployee): Promise<Employee>;
  updateEmployee(id: string, employee: Partial<InsertEmployee>): Promise<Employee | undefined>;
  
  // Right-to-work check operations
  createRightToWorkCheck(check: InsertRightToWorkCheck): Promise<RightToWorkCheck>;
  getChecksByEmployeeId(employeeId: string): Promise<RightToWorkCheck[]>;
  getStandaloneChecksByUserId(userId: string): Promise<RightToWorkCheck[]>;
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
          sql`LOWER(${employees.lastName}) LIKE ${searchPattern}`,
          sql`LOWER(COALESCE(${employees.email}, '')) LIKE ${searchPattern}`
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

  async createRightToWorkCheck(checkData: InsertRightToWorkCheck): Promise<RightToWorkCheck> {
    const [check] = await db.insert(rightToWorkChecks).values(checkData).returning();
    return check;
  }

  async getChecksByEmployeeId(employeeId: string): Promise<RightToWorkCheck[]> {
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
}

export const storage = new DatabaseStorage();
