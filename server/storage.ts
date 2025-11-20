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
import { eq, desc } from "drizzle-orm";

export interface IStorage {
  // User operations
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;

  // Employee operations
  getEmployeesByUserId(userId: string): Promise<EmployeeWithChecks[]>;
  getEmployeeById(id: string): Promise<EmployeeWithChecks | undefined>;
  createEmployee(employee: InsertEmployee): Promise<Employee>;
  updateEmployee(id: string, employee: Partial<InsertEmployee>): Promise<Employee | undefined>;
  
  // Right-to-work check operations
  createRightToWorkCheck(check: InsertRightToWorkCheck): Promise<RightToWorkCheck>;
  getChecksByEmployeeId(employeeId: string): Promise<RightToWorkCheck[]>;
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

  async getEmployeesByUserId(userId: string): Promise<EmployeeWithChecks[]> {
    const employeesList = await db
      .select()
      .from(employees)
      .where(eq(employees.userId, userId))
      .orderBy(desc(employees.createdAt));

    const employeesWithChecks: EmployeeWithChecks[] = await Promise.all(
      employeesList.map(async (employee) => {
        const checks = await this.getChecksByEmployeeId(employee.id);
        return {
          ...employee,
          checks,
          latestCheck: checks.sort(
            (a, b) => new Date(b.createdAt!).getTime() - new Date(a.createdAt!).getTime()
          )[0],
        };
      })
    );

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
}

export const storage = new DatabaseStorage();
