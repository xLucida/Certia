import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./replitAuth";
import {
  ObjectStorageService,
  ObjectNotFoundError,
} from "./objectStorage";
import { evaluateRightToWork } from "../lib/rightToWork";
import { mapToRulesEngineInput } from "./rightToWorkAdapter";
import { extractFieldsFromDocument } from "../lib/ocr";
import { insertEmployeeSchema, insertRightToWorkCheckSchema } from "@shared/schema";
import multer from "multer";
import { parse } from "csv-parse/sync";

// Simple in-memory rate limiter for OCR endpoint (MVP level)
// Map of userId -> array of request timestamps
const ocrRateLimiter = new Map<string, number[]>();
const OCR_RATE_LIMIT = 30; // requests per hour
const OCR_RATE_WINDOW = 60 * 60 * 1000; // 1 hour in milliseconds

function checkOcrRateLimit(userId: string): { allowed: boolean; remaining: number } {
  const now = Date.now();
  const userRequests = ocrRateLimiter.get(userId) || [];
  
  // Filter out requests outside the time window
  const recentRequests = userRequests.filter(timestamp => now - timestamp < OCR_RATE_WINDOW);
  
  if (recentRequests.length >= OCR_RATE_LIMIT) {
    return { allowed: false, remaining: 0 };
  }
  
  // Add current request
  recentRequests.push(now);
  ocrRateLimiter.set(userId, recentRequests);
  
  return { allowed: true, remaining: OCR_RATE_LIMIT - recentRequests.length };
}

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

  // Demo/Dev routes (only available in non-production)
  app.post("/api/demo/seed", isAuthenticated, async (req: any, res) => {
    // Only allow in non-production environments
    if (process.env.NODE_ENV === 'production') {
      return res.status(403).json({ error: "Demo seeding not allowed in production" });
    }

    try {
      const userId = req.user.claims.sub;
      
      // Create demo employees
      const employee1 = await storage.createEmployee({
        userId,
        firstName: "Anna",
        lastName: "Schmidt",
        dateOfBirth: "1990-05-15",
      });

      const employee2 = await storage.createEmployee({
        userId,
        firstName: "Raj",
        lastName: "Patel",
        dateOfBirth: "1988-11-22",
      });

      const employee3 = await storage.createEmployee({
        userId,
        firstName: "Maria",
        lastName: "Garcia",
        dateOfBirth: "1992-03-08",
      });

      // Create demo checks with various statuses
      const futureDate = new Date();
      futureDate.setFullYear(futureDate.getFullYear() + 2);
      
      const pastDate = new Date();
      pastDate.setFullYear(pastDate.getFullYear() - 1);
      
      const nearFutureDate = new Date();
      nearFutureDate.setMonth(nearFutureDate.getMonth() + 2);

      // Create checks by evaluating through the rules engine
      // ELIGIBLE check
      const eligibleInput = mapToRulesEngineInput({
        documentType: "EU_BLUE_CARD",
        expiryDate: futureDate,
      });
      const eligibleEval = evaluateRightToWork(eligibleInput);
      
      await storage.createRightToWorkCheck({
        userId,
        employeeId: employee1.id,
        documentType: "EU_BLUE_CARD",
        documentNumber: "DEMO-BC-001",
        expiryDate: futureDate.toISOString().split('T')[0],
        ...eligibleEval,
      });

      // NOT_ELIGIBLE check (expired)
      const notEligibleInput = mapToRulesEngineInput({
        documentType: "EAT",
        expiryDate: pastDate,
      });
      const notEligibleEval = evaluateRightToWork(notEligibleInput);
      
      await storage.createRightToWorkCheck({
        userId,
        employeeId: employee2.id,
        documentType: "EAT",
        documentNumber: "DEMO-EAT-002",
        expiryDate: pastDate.toISOString().split('T')[0],
        ...notEligibleEval,
      });

      // NEEDS_REVIEW check (Fiktionsbescheinigung)
      const needsReviewInput = mapToRulesEngineInput({
        documentType: "FIKTIONSBESCHEINIGUNG",
        expiryDate: nearFutureDate,
      });
      const needsReviewEval = evaluateRightToWork(needsReviewInput);
      
      await storage.createRightToWorkCheck({
        userId,
        employeeId: employee3.id,
        documentType: "FIKTIONSBESCHEINIGUNG",
        documentNumber: "DEMO-FIKT-003",
        expiryDate: nearFutureDate.toISOString().split('T')[0],
        ...needsReviewEval,
      });

      // Standalone candidate checks
      await storage.createRightToWorkCheck({
        userId,
        firstName: "John",
        lastName: "Candidate",
        documentType: "EU_BLUE_CARD",
        documentNumber: "DEMO-BC-CAND",
        expiryDate: futureDate.toISOString().split('T')[0],
        ...eligibleEval,
      });

      await storage.createRightToWorkCheck({
        userId,
        firstName: "Sarah",
        lastName: "Applicant",
        documentType: "EAT",
        documentNumber: "DEMO-EAT-CAND",
        expiryDate: nearFutureDate.toISOString().split('T')[0],
        ...eligibleEval,
      });

      res.json({
        message: "Demo data seeded successfully",
        employees: 3,
        checks: 5,
      });
    } catch (error: any) {
      console.error("Error seeding demo data:", error);
      res.status(500).json({ error: "Failed to seed demo data" });
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
          const record = records[i] as any;
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

  // OCR extraction route with file validation
  app.post("/api/ocr/extract", isAuthenticated, upload.single("file"), async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;

      // Check rate limit
      const rateLimitCheck = checkOcrRateLimit(userId);
      if (!rateLimitCheck.allowed) {
        return res.status(429).json({
          error: "Too many OCR requests. Please wait a bit before trying again.",
          message: "Rate limit exceeded. You can make up to 30 OCR requests per hour."
        });
      }

      if (!req.file) {
        return res.status(400).json({ 
          error: "No file uploaded",
          message: "Please select a file to upload"
        });
      }

      // Validate MIME type
      const allowedMimeTypes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];
      if (!allowedMimeTypes.includes(req.file.mimetype)) {
        return res.status(400).json({ 
          error: "Invalid file type",
          message: "Only PDF, JPG, and PNG files are supported"
        });
      }

      // Validate file size (10MB limit)
      const maxSize = 10 * 1024 * 1024; // 10MB
      if (req.file.size > maxSize) {
        return res.status(400).json({ 
          error: "File too large",
          message: "File size must be less than 10MB"
        });
      }

      console.log("[OCR] Processing file:", req.file.originalname, "type:", req.file.mimetype, "size:", req.file.size);

      const result = await extractFieldsFromDocument(req.file.buffer);

      console.log("[OCR] Extraction complete:", {
        hasRawText: result.rawText.length > 0,
        documentTypeGuess: result.documentTypeGuess,
        hasDocumentNumber: !!result.documentNumberGuess,
        hasExpiryDate: !!result.expiryDateGuessIso,
      });

      res.json(result);
    } catch (error: any) {
      console.error("[OCR] Extraction failed:", error);
      
      if (error.message?.includes('OCR_SPACE_API_KEY')) {
        return res.status(500).json({ 
          error: "OCR service not configured",
          message: "OCR service is not available. Please contact your administrator."
        });
      }

      if (error.message?.includes('OCR.space API')) {
        return res.status(503).json({
          error: "OCR service unavailable",
          message: error.message
        });
      }

      return res.status(500).json({
        error: "OCR extraction failed",
        message: error.message || "Failed to process document. Please enter details manually."
      });
    }
  });

  // Right-to-work check routes
  app.get("/api/checks/standalone", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const checks = await storage.getStandaloneChecksByUserId(userId);
      res.json(checks);
    } catch (error: any) {
      console.error("Error fetching standalone checks:", error);
      res.status(500).json({ error: "Failed to fetch checks" });
    }
  });

  app.get("/api/checks/export", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;

      const employeesWithChecks = await storage.getEmployeesByUserId(userId);
      const standaloneChecks = await storage.getStandaloneChecksByUserId(userId);

      type ExportRow = {
        recordType: "EMPLOYEE" | "CANDIDATE";
        name: string;
        documentType: string;
        documentNumber: string;
        workStatus: string;
        expiryDate: string;
        createdAt: string;
        decisionSummary: string;
      };

      const rows: ExportRow[] = [];

      for (const emp of employeesWithChecks) {
        for (const check of emp.checks) {
          rows.push({
            recordType: "EMPLOYEE",
            name: `${emp.firstName ?? ""} ${emp.lastName ?? ""}`.trim(),
            documentType: check.documentType ?? "",
            documentNumber: check.documentNumber ?? "",
            workStatus: check.workStatus ?? "",
            expiryDate: check.expiryDate ?? "",
            createdAt: check.createdAt?.toISOString?.() ?? String(check.createdAt ?? ""),
            decisionSummary: check.decisionSummary ?? "",
          });
        }
      }

      for (const check of standaloneChecks) {
        rows.push({
          recordType: "CANDIDATE",
          name: `${check.firstName ?? ""} ${check.lastName ?? ""}`.trim(),
          documentType: check.documentType ?? "",
          documentNumber: check.documentNumber ?? "",
          workStatus: check.workStatus ?? "",
          expiryDate: check.expiryDate ?? "",
          createdAt: check.createdAt?.toISOString?.() ?? String(check.createdAt ?? ""),
          decisionSummary: check.decisionSummary ?? "",
        });
      }

      const headers: (keyof ExportRow)[] = [
        "recordType",
        "name",
        "documentType",
        "documentNumber",
        "workStatus",
        "expiryDate",
        "createdAt",
        "decisionSummary",
      ];

      const escapeCsvValue = (value: unknown): string => {
        if (value === null || value === undefined) return "";
        const str = String(value);
        if (str.includes('"') || str.includes(",") || str.includes("\n") || str.includes("\r")) {
          return `"${str.replace(/"/g, '""')}"`;
        }
        return str;
      };

      const lines = [
        headers.join(","),
        ...rows.map((row) =>
          headers
            .map((header) => escapeCsvValue(row[header]))
            .join(",")
        ),
      ];

      const csv = lines.join("\n");

      res.setHeader("Content-Type", "text/csv; charset=utf-8");
      res.setHeader("Content-Disposition", 'attachment; filename="right-to-work-checks.csv"');
      res.send(csv);
    } catch (error) {
      console.error("Error exporting checks:", error);
      res.status(500).json({ error: "Failed to export checks" });
    }
  });

  app.get("/api/checks/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const check = await storage.getRightToWorkCheckById(req.params.id);
      
      if (!check) {
        return res.status(404).json({ error: "Check not found" });
      }
      
      // Verify ownership
      if (check.userId !== userId) {
        return res.status(403).json({ error: "Unauthorized" });
      }
      
      res.json(check);
    } catch (error: any) {
      console.error("Error fetching check:", error);
      res.status(500).json({ error: "Failed to fetch check" });
    }
  });

  app.delete("/api/checks/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const check = await storage.getRightToWorkCheckById(req.params.id);
      
      if (!check) {
        return res.status(404).json({ error: "Check not found" });
      }
      
      // Verify ownership
      if (check.userId !== userId) {
        return res.status(403).json({ error: "Unauthorized" });
      }
      
      await storage.deleteRightToWorkCheck(req.params.id);
      res.status(204).send();
    } catch (error: any) {
      console.error("Error deleting check:", error);
      res.status(500).json({ error: "Failed to delete check" });
    }
  });

  app.post("/api/checks", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { 
        employeeId, 
        firstName, 
        lastName, 
        documentType, 
        expiryDate, 
        ocrRawText, 
        ocrExtractedFields,
        ...otherData 
      } = req.body;
      
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
      
      // Convert expiry date to Date object
      const expiryDateObj = new Date(expiryDate);
      const dateOfIssueObj = otherData.dateOfIssue ? new Date(otherData.dateOfIssue) : undefined;
      
      // Map form data to rules engine input
      const rulesEngineInput = mapToRulesEngineInput({
        documentType,
        expiryDate: expiryDateObj,
        dateOfIssue: dateOfIssueObj,
      });
      
      // Evaluate work eligibility using comprehensive rules engine
      const evaluation = evaluateRightToWork(rulesEngineInput);
      
      // Build validated data with evaluation results
      const validatedData = {
        employeeId: employeeId || null,
        userId,
        firstName: firstName || null,
        lastName: lastName || null,
        documentType,
        expiryDate,
        workStatus: evaluation.workStatus,
        decisionSummary: evaluation.decisionSummary,
        decisionDetails: evaluation.decisionDetails,
        ocrRawText: ocrRawText || null,
        ocrExtractedFields: ocrExtractedFields || null,
        ...otherData,
      } as any;
      
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
