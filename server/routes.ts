import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./replitAuth";
import {
  ObjectStorageService,
  ObjectNotFoundError,
} from "./objectStorage";
import { evaluateRightToWork } from "./workEligibility";
import { insertEmployeeSchema, insertRightToWorkCheckSchema } from "@shared/schema";
import multer from "multer";
import { parse } from "csv-parse/sync";

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth middleware
  await setupAuth(app);

  // Auth routes
  app.get('/api/auth/user', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Employee routes
  app.get("/api/employees", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { search, status, documentType, expiryFrom, expiryTo } = req.query;
      
      const employees = await storage.getEmployeesByUserId(userId, {
        search: search as string,
        status: status as string,
        documentType: documentType as string,
        expiryFrom: expiryFrom as string,
        expiryTo: expiryTo as string,
      });
      res.json(employees);
    } catch (error) {
      console.error("Error fetching employees:", error);
      res.status(500).json({ error: "Failed to fetch employees" });
    }
  });

  app.get("/api/employees/:id", isAuthenticated, async (req: any, res) => {
    try {
      const employee = await storage.getEmployeeById(req.params.id);
      if (!employee) {
        return res.status(404).json({ error: "Employee not found" });
      }
      
      // Verify ownership
      const userId = req.user.claims.sub;
      if (employee.userId !== userId) {
        return res.status(403).json({ error: "Access denied" });
      }
      
      res.json(employee);
    } catch (error) {
      console.error("Error fetching employee:", error);
      res.status(500).json({ error: "Failed to fetch employee" });
    }
  });

  app.post("/api/employees", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      
      // Validate request body
      const validatedData = insertEmployeeSchema.parse({
        ...req.body,
        userId,
      });
      
      const employee = await storage.createEmployee(validatedData);
      res.status(201).json(employee);
    } catch (error: any) {
      console.error("Error creating employee:", error);
      if (error.name === "ZodError") {
        return res.status(400).json({ error: "Invalid employee data", details: error.errors });
      }
      res.status(500).json({ error: "Failed to create employee" });
    }
  });

  app.put("/api/employees/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const employeeId = req.params.id;
      
      // Verify ownership
      const existing = await storage.getEmployeeById(employeeId);
      if (!existing) {
        return res.status(404).json({ error: "Employee not found" });
      }
      if (existing.userId !== userId) {
        return res.status(403).json({ error: "Access denied" });
      }
      
      // Validate and update (don't allow userId to be changed)
      const validatedData = insertEmployeeSchema.omit({ userId: true }).parse(req.body);
      const employee = await storage.updateEmployee(employeeId, validatedData);
      
      if (!employee) {
        return res.status(404).json({ error: "Employee not found" });
      }
      
      res.json(employee);
    } catch (error: any) {
      console.error("Error updating employee:", error);
      if (error.name === "ZodError") {
        return res.status(400).json({ error: "Invalid employee data", details: error.errors });
      }
      res.status(500).json({ error: "Failed to update employee" });
    }
  });

  // Bulk import route
  const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });
  app.post("/api/employees/import", isAuthenticated, upload.single("file"), async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      console.log("[IMPORT] Starting import for user:", userId);
      
      if (!req.file) {
        console.log("[IMPORT] No file in request");
        return res.status(400).json({ error: "No file uploaded" });
      }

      console.log("[IMPORT] File received:", req.file.originalname, "size:", req.file.size);
      const csvContent = req.file.buffer.toString("utf-8");
      console.log("[IMPORT] CSV content preview:", csvContent.substring(0, 200));
      
      const records = parse(csvContent, {
        columns: true,
        skip_empty_lines: true,
        trim: true,
      });

      console.log("[IMPORT] Parsed", records.length, "records");

      const results = {
        total: records.length,
        successful: 0,
        failed: 0,
        errors: [] as Array<{ row: number; message: string }>,
      };

      for (let i = 0; i < records.length; i++) {
        try {
          const record = records[i];
          console.log("[IMPORT] Processing row", i + 1, ":", record);
          
          const validatedData = insertEmployeeSchema.parse({
            userId,
            firstName: record.first_name,
            lastName: record.last_name,
            dateOfBirth: record.date_of_birth || null,
            notes: record.notes || null,
          });
          
          await storage.createEmployee(validatedData);
          results.successful++;
          console.log("[IMPORT] Row", i + 1, "imported successfully");
        } catch (error: any) {
          console.error("[IMPORT] Error on row", i + 1, ":", error);
          results.failed++;
          results.errors.push({
            row: i + 2, // +2 because header is row 1 and index starts at 0
            message: error.message || "Invalid data format",
          });
        }
      }

      console.log("[IMPORT] Import complete. Results:", results);
      res.json(results);
    } catch (error: any) {
      console.error("Error processing import:", error);
      console.error("Error stack:", error.stack);
      res.status(500).json({ error: "Failed to process import", details: error.message });
    }
  });

  // Right-to-work check routes
  app.post("/api/checks", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { employeeId, firstName, lastName, documentType, expiryDate, ...otherData } = req.body;
      
      // Verify employee exists and belongs to user if employeeId is provided
      if (employeeId) {
        const employee = await storage.getEmployeeById(employeeId);
        if (!employee) {
          return res.status(404).json({ error: "Employee not found" });
        }
        if (employee.userId !== userId) {
          return res.status(403).json({ error: "Access denied" });
        }
      } else {
        // For standalone checks, require firstName and lastName
        if (!firstName || !lastName) {
          return res.status(400).json({ error: "First name and last name are required for new candidate checks" });
        }
      }
      
      // Evaluate work eligibility
      const evaluation = evaluateRightToWork({
        documentType,
        expiryDate,
      });
      
      // Validate complete data
      const validatedData = insertRightToWorkCheckSchema.parse({
        employeeId: employeeId || null,
        userId,
        firstName: firstName || null,
        lastName: lastName || null,
        documentType,
        expiryDate,
        ...otherData,
        workStatus: evaluation.workStatus,
        decisionSummary: evaluation.decisionSummary,
        decisionDetails: evaluation.decisionDetails,
      });
      
      const check = await storage.createRightToWorkCheck(validatedData);
      res.status(201).json(check);
    } catch (error: any) {
      console.error("Error creating check:", error);
      if (error.name === "ZodError") {
        return res.status(400).json({ error: "Invalid check data", details: error.errors });
      }
      res.status(500).json({ error: "Failed to create check" });
    }
  });

  // Object storage routes
  app.post("/api/objects/upload", isAuthenticated, async (req, res) => {
    try {
      const objectStorageService = new ObjectStorageService();
      const uploadURL = await objectStorageService.getObjectEntityUploadURL();
      res.json({ uploadURL });
    } catch (error) {
      console.error("Error getting upload URL:", error);
      res.status(500).json({ error: "Failed to get upload URL" });
    }
  });

  app.put("/api/documents", isAuthenticated, async (req: any, res) => {
    try {
      if (!req.body.documentURL) {
        return res.status(400).json({ error: "documentURL is required" });
      }

      const userId = req.user.claims.sub;
      const objectStorageService = new ObjectStorageService();
      const objectPath = await objectStorageService.trySetObjectEntityAclPolicy(
        req.body.documentURL,
        {
          owner: userId,
          visibility: "private",
        },
      );

      res.status(200).json({
        objectPath: objectPath,
      });
    } catch (error) {
      console.error("Error setting document ACL:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.get("/objects/:objectPath(*)", isAuthenticated, async (req: any, res) => {
    const userId = req.user?.claims?.sub;
    const objectStorageService = new ObjectStorageService();
    try {
      const objectFile = await objectStorageService.getObjectEntityFile(
        req.path,
      );
      const canAccess = await objectStorageService.canAccessObjectEntity({
        objectFile,
        userId: userId,
      });
      if (!canAccess) {
        return res.sendStatus(401);
      }
      objectStorageService.downloadObject(objectFile, res);
    } catch (error) {
      console.error("Error checking object access:", error);
      if (error instanceof ObjectNotFoundError) {
        return res.sendStatus(404);
      }
      return res.sendStatus(500);
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
