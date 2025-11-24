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
import { insertEmployeeSchema, insertRightToWorkCheckSchema, caseStatuses } from "@shared/schema";
import multer from "multer";
import { parse } from "csv-parse/sync";
import { createPublicUploadToken, verifyPublicUploadToken } from "./publicUploadToken";
import { getVeniceRightToWorkDecision } from "./veniceClient";

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

  // Venice AI diagnostics endpoint
  app.post("/api/venice/test", isAuthenticated, async (req: any, res) => {
    try {
      const { ocrRawText, ocrExtractedFields, currentRulesStatus } = req.body || {};

      const hasBaseUrl = !!process.env.VENICE_API_BASE_URL;
      const hasApiKey = !!process.env.VENICE_API_KEY;
      const hasModelId = !!process.env.VENICE_MODEL_ID;

      const config = {
        hasBaseUrl,
        hasApiKey,
        hasModelId,
      };

      if (!hasApiKey || !hasModelId) {
        return res.json({
          config,
          aiReview: {
            status: "UNKNOWN",
            explanation: "Venice.ai is not fully configured (missing API key or model id). Update VENICE_* env vars.",
            missingInformation: [],
          },
        });
      }

      let parsedExtracted: any = undefined;
      if (typeof ocrExtractedFields === "string") {
        try {
          parsedExtracted = JSON.parse(ocrExtractedFields);
        } catch (err) {
          console.warn("Failed to parse ocrExtractedFields in /api/venice/test:", err);
        }
      } else if (ocrExtractedFields) {
        parsedExtracted = ocrExtractedFields;
      }

      const rulesStatus =
        typeof currentRulesStatus === "string" && currentRulesStatus.length > 0
          ? currentRulesStatus
          : "NEEDS_REVIEW";

      const aiReview = await getVeniceRightToWorkDecision({
        currentRulesStatus: rulesStatus,
        ocrRawText: ocrRawText || "",
        ocrExtractedFields: parsedExtracted,
      });

      return res.json({ config, aiReview });
    } catch (err) {
      console.error("Error in /api/venice/test:", err);
      return res.status(500).json({
        config: {
          hasBaseUrl: !!process.env.VENICE_API_BASE_URL,
          hasApiKey: !!process.env.VENICE_API_KEY,
          hasModelId: !!process.env.VENICE_MODEL_ID,
        },
        error: "Failed to call Venice.ai test endpoint",
      });
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

  app.delete("/api/employees/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const employeeId = req.params.id;
      
      // Delete employee and all related checks and notes
      await storage.deleteEmployeeAndRelatedData(employeeId, userId);
      
      res.json({ success: true });
    } catch (error: any) {
      console.error("Error deleting employee:", error);
      if (error.message === "Employee not found or unauthorized") {
        return res.status(404).json({ error: "Employee not found" });
      }
      res.status(500).json({ error: "Failed to delete employee" });
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

  app.patch("/api/checks/:id/case-status", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { caseStatus } = req.body;
      
      // Validate caseStatus
      if (!caseStatus || !caseStatuses.includes(caseStatus as any)) {
        return res.status(400).json({ error: "Invalid case status. Must be one of: OPEN, UNDER_REVIEW, CLEARED" });
      }
      
      // Get check and verify ownership
      const check = await storage.getRightToWorkCheckById(req.params.id);
      if (!check) {
        return res.status(404).json({ error: "Check not found" });
      }
      if (check.userId !== userId) {
        return res.status(403).json({ error: "Unauthorized" });
      }
      
      // Update case status
      const updatedCheck = await storage.updateCaseStatus(req.params.id, caseStatus);
      res.json(updatedCheck);
    } catch (error: any) {
      console.error("Error updating case status:", error);
      res.status(500).json({ error: "Failed to update case status" });
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
      
      // Evaluate work eligibility using comprehensive rules engine (as guardrail)
      const rulesResult = evaluateRightToWork(rulesEngineInput);
      
      // Parse OCR extracted fields safely
      let parsedOcrFields = null;
      if (ocrExtractedFields) {
        try {
          parsedOcrFields = typeof ocrExtractedFields === 'string' 
            ? JSON.parse(ocrExtractedFields) 
            : ocrExtractedFields;
        } catch (e) {
          console.warn("Failed to parse ocrExtractedFields:", e);
        }
      }
      
      // Call Venice AI as primary decision engine
      const veniceResult = await getVeniceRightToWorkDecision({
        currentRulesStatus: rulesResult.workStatus,
        ocrRawText,
        ocrExtractedFields: parsedOcrFields,
      });
      
      // Merge AI and rules results with conservative guardrails
      const aiStatus = veniceResult.status;
      const rulesStatus = rulesResult.workStatus;
      let finalStatus: string = rulesStatus;
      let conflictDetail: string | null = null;
      
      if (aiStatus !== "UNKNOWN") {
        // If AI and rules agree, use AI status
        if (aiStatus === rulesStatus) {
          finalStatus = aiStatus as any;
        } else {
          // If AI and rules disagree, downgrade to NEEDS_REVIEW for safety
          finalStatus = "NEEDS_REVIEW" as any;
          conflictDetail = `AI status (${aiStatus}) did not match rules-engine status (${rulesStatus}); final status set to NEEDS_REVIEW for safety per guardrail policy.`;
        }
      } else {
        // AI returned UNKNOWN, use rules result
        finalStatus = rulesStatus;
      }
      
      // Build decision summary - prefer AI explanation if available and non-empty, else use rules summary
      let decisionSummary: string;
      if (aiStatus !== "UNKNOWN" && veniceResult.explanation && veniceResult.explanation.trim().length > 0) {
        decisionSummary = veniceResult.explanation;
      } else {
        decisionSummary = rulesResult.decisionSummary;
      }
      
      const decisionDetails: string[] = [];
      
      // Only add AI decision details if AI provided a meaningful result (not UNKNOWN)
      if (aiStatus !== "UNKNOWN" && veniceResult.explanation) {
        decisionDetails.push("AI decision: " + veniceResult.explanation);
        if (veniceResult.missingInformation.length > 0) {
          veniceResult.missingInformation.forEach(item => {
            decisionDetails.push("AI missing information: " + item);
          });
        }
      }
      
      // Append all rules engine details (for transparency)
      decisionDetails.push(...rulesResult.decisionDetails);
      
      // Add conflict detail if present
      if (conflictDetail) {
        decisionDetails.push(conflictDetail);
      }
      
      // Build validated data with merged evaluation results
      const validatedData = {
        employeeId: employeeId || null,
        userId,
        firstName: firstName || null,
        lastName: lastName || null,
        documentType,
        expiryDate,
        workStatus: finalStatus,
        decisionSummary,
        decisionDetails,
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

  // Check notes routes
  app.get("/api/checks/:id/notes", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const checkId = req.params.id;
      
      // Verify check exists and belongs to user
      const check = await storage.getRightToWorkCheckById(checkId);
      if (!check) {
        return res.status(404).json({ error: "Check not found" });
      }
      if (check.userId !== userId) {
        return res.status(403).json({ error: "Unauthorized" });
      }
      
      const notes = await storage.getRightToWorkCheckNotesByCheckId(checkId, userId);
      res.json(notes);
    } catch (error: any) {
      console.error("Error fetching check notes:", error);
      res.status(500).json({ error: "Failed to fetch notes" });
    }
  });

  app.post("/api/checks/:id/notes", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const checkId = req.params.id;
      const { content } = req.body;
      
      if (!content || typeof content !== "string" || content.trim().length === 0) {
        return res.status(400).json({ error: "Note content is required" });
      }
      
      // Verify check exists and belongs to user
      const check = await storage.getRightToWorkCheckById(checkId);
      if (!check) {
        return res.status(404).json({ error: "Check not found" });
      }
      if (check.userId !== userId) {
        return res.status(403).json({ error: "Unauthorized" });
      }
      
      const note = await storage.createRightToWorkCheckNote({
        checkId,
        userId,
        content: content.trim(),
      });
      
      res.status(201).json(note);
    } catch (error: any) {
      console.error("Error creating check note:", error);
      res.status(500).json({ error: "Failed to create note" });
    }
  });

  // Public upload link routes
  // Create upload link (authenticated - for HR users)
  app.post("/api/public-upload/link", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { employeeId, expiresInDays } = req.body || {};

      if (!employeeId) {
        return res.status(400).json({ error: "employeeId is required" });
      }

      // Ensure employee belongs to this user
      const employee = await storage.getEmployeeById(employeeId);
      if (!employee) {
        return res.status(404).json({ error: "Employee not found" });
      }
      if (employee.userId !== userId) {
        return res.status(403).json({ error: "Access denied" });
      }

      const days = typeof expiresInDays === "number" && expiresInDays > 0 ? expiresInDays : 14;
      const exp = Date.now() + days * 24 * 60 * 60 * 1000;

      const token = createPublicUploadToken({
        uid: userId,
        empId: employeeId,
        exp,
      });

      console.log("[PUBLIC UPLOAD LINK] Generated token (first 50 chars):", token.substring(0, 50));
      console.log("[PUBLIC UPLOAD LINK] Token expiry:", new Date(exp).toISOString());

      const urlPath = `/upload?token=${encodeURIComponent(token)}`;

      return res.json({ token, urlPath, expiresAt: exp });
    } catch (err) {
      console.error("Error creating public upload link:", err);
      return res.status(500).json({ error: "Failed to create public upload link" });
    }
  });

  // Validate token (public - no auth)
  app.get("/api/public-upload/validate", async (req: any, res) => {
    try {
      const token = req.query.token as string | undefined;
      console.log("[PUBLIC UPLOAD VALIDATE] Received token (first 50 chars):", token?.substring(0, 50));
      
      if (!token) {
        console.log("[PUBLIC UPLOAD VALIDATE] No token provided");
        return res.status(400).json({ valid: false, error: "Missing token" });
      }

      const payload = verifyPublicUploadToken(token);
      console.log("[PUBLIC UPLOAD VALIDATE] Verification result:", payload ? "VALID" : "INVALID");
      
      if (!payload) {
        console.log("[PUBLIC UPLOAD VALIDATE] Token invalid or expired");
        return res.status(400).json({ valid: false, error: "Invalid or expired token" });
      }

      console.log("[PUBLIC UPLOAD VALIDATE] Token valid, expiry:", new Date(payload.exp).toISOString());
      // For privacy, DO NOT return employee details; just say it's valid.
      return res.json({ valid: true });
    } catch (err) {
      console.error("Error validating public upload token:", err);
      return res.status(500).json({ valid: false, error: "Server error" });
    }
  });

  // Submit upload (public - no auth)
  app.post("/api/public-upload/submit", upload.array("documents", 5), async (req: any, res) => {
    try {
      const token = req.body.token as string | undefined;
      if (!token) {
        return res.status(400).json({ error: "Missing token" });
      }

      const payload = verifyPublicUploadToken(token);
      if (!payload) {
        return res.status(400).json({ error: "Invalid or expired token" });
      }

      const { uid: userId, empId: employeeId } = payload;

      // Basic sanity check: employee still exists and belongs to this user
      const employee = await storage.getEmployeeById(employeeId);
      if (!employee) {
        return res.status(404).json({ error: "Employee not found" });
      }
      if (employee.userId !== userId) {
        return res.status(403).json({ error: "Access denied" });
      }

      const files = req.files as Express.Multer.File[] | undefined;
      if (!files || files.length === 0) {
        return res.status(400).json({ error: "No documents uploaded" });
      }

      // Validate each file
      const allowedMimeTypes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];
      const maxSize = 10 * 1024 * 1024;

      for (const file of files) {
        if (!allowedMimeTypes.includes(file.mimetype)) {
          return res.status(400).json({ 
            error: "Invalid file type",
            message: `File "${file.originalname}" has invalid type. Only PDF, JPG, and PNG files are supported`
          });
        }
        if (file.size > maxSize) {
          return res.status(400).json({ 
            error: "File too large",
            message: `File "${file.originalname}" exceeds 10MB limit`
          });
        }
      }

      console.log(`[PUBLIC UPLOAD] Processing ${files.length} file(s) for employee:`, employeeId);

      // Run OCR on each file
      const ocrResults = await Promise.all(
        files.map(file => extractFieldsFromDocument(file.buffer))
      );

      // Aggregate OCR results
      let combinedRawText = "";
      let primaryDocumentTypeGuess: string | null = null;
      let primaryDocumentNumberGuess = "";
      let earliestExpiryGuessIso: string | null = null;
      let employerNameGuess = "";
      let employmentPermissionGuess = "";

      const documents = files.map((file, index) => {
        const ocr = ocrResults[index];
        
        // Append to combined raw text with separator
        combinedRawText += `\n\n--- Document: ${file.originalname} ---\n\n${ocr.rawText}`;
        
        // First non-UNKNOWN document type wins
        if (!primaryDocumentTypeGuess && ocr.documentTypeGuess && (ocr.documentTypeGuess as string) !== "UNKNOWN") {
          primaryDocumentTypeGuess = ocr.documentTypeGuess;
        }
        
        // First non-empty document number wins
        if (!primaryDocumentNumberGuess && ocr.documentNumberGuess) {
          primaryDocumentNumberGuess = ocr.documentNumberGuess;
        }
        
        // Earliest expiry date (most conservative for compliance)
        if (ocr.expiryDateGuessIso) {
          const currentExpiry = new Date(ocr.expiryDateGuessIso);
          if (!earliestExpiryGuessIso || currentExpiry < new Date(earliestExpiryGuessIso)) {
            earliestExpiryGuessIso = ocr.expiryDateGuessIso;
          }
        }
        
        // First non-empty employer name wins
        if (!employerNameGuess && ocr.employerNameGuess) {
          employerNameGuess = ocr.employerNameGuess;
        }
        
        // First non-empty employment permission wins
        if (!employmentPermissionGuess && ocr.employmentPermissionGuess) {
          employmentPermissionGuess = ocr.employmentPermissionGuess;
        }
        
        return {
          fileName: file.originalname,
          mimeType: file.mimetype,
          documentTypeGuess: ocr.documentTypeGuess,
          documentNumberGuess: ocr.documentNumberGuess,
          expiryDateGuessIso: ocr.expiryDateGuessIso,
          employerNameGuess: ocr.employerNameGuess,
          employmentPermissionGuess: ocr.employmentPermissionGuess,
        };
      });

      console.log("[PUBLIC UPLOAD] OCR complete for all files:", {
        fileCount: files.length,
        primaryDocumentType: primaryDocumentTypeGuess,
        hasEarliestExpiry: !!earliestExpiryGuessIso,
      });

      // Prepare data for rules engine using aggregated results
      // If no document type was detected (null or "UNKNOWN"), treat as OTHER for evaluation
      const documentType = (primaryDocumentTypeGuess && primaryDocumentTypeGuess !== "UNKNOWN") 
        ? primaryDocumentTypeGuess 
        : "OTHER";
      const expiryDateStr = earliestExpiryGuessIso;
      const expiryDateObj = expiryDateStr ? new Date(expiryDateStr) : null;

      // Map to rules engine input and evaluate
      const rulesEngineInput = mapToRulesEngineInput({
        documentType: documentType as any,
        expiryDate: expiryDateObj as any,
      });

      const evaluation = evaluateRightToWork(rulesEngineInput);

      console.log("[PUBLIC UPLOAD] Evaluation complete:", {
        workStatus: evaluation.workStatus,
        decisionSummary: evaluation.decisionSummary,
      });

      // Create right-to-work check with aggregated OCR data
      const createdCheck = await storage.createRightToWorkCheck({
        userId,
        employeeId,
        firstName: null,
        lastName: null,
        documentType: (primaryDocumentTypeGuess && primaryDocumentTypeGuess !== "UNKNOWN" ? documentType : null) as any,
        documentNumber: (primaryDocumentNumberGuess || null) as any,
        expiryDate: (expiryDateStr || null) as any,
        workStatus: evaluation.workStatus,
        decisionSummary: evaluation.decisionSummary,
        decisionDetails: evaluation.decisionDetails,
        ocrRawText: combinedRawText,
        ocrExtractedFields: JSON.stringify({
          documentTypeGuess: primaryDocumentTypeGuess,
          documentNumberGuess: primaryDocumentNumberGuess,
          expiryDateGuessIso: earliestExpiryGuessIso,
          employerNameGuess,
          employmentPermissionGuess,
          documents,
        }),
      } as any);

      console.log("[PUBLIC UPLOAD] Check created:", createdCheck.id);

      return res.json({
        success: true,
        checkId: createdCheck.id,
        workStatus: evaluation.workStatus,
        decisionSummary: evaluation.decisionSummary,
      });
    } catch (err: any) {
      console.error("Error submitting public upload:", err);
      return res.status(500).json({ 
        error: "Failed to process upload",
        message: err.message || "An unexpected error occurred"
      });
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

  // CSV export route for audit purposes
  app.get("/api/audit/checks.csv", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;

      // Fetch all checks for this user
      const checks = await storage.getAllRightToWorkChecksForUser(userId);

      // Fetch all employees for this user to join with checks
      const employees = await storage.getEmployeesByUserId(userId);
      const employeeMap = new Map(employees.map(e => [e.id, e]));

      // Build CSV header
      const header = [
        "employeeName",
        "employeeId",
        "checkId",
        "workStatus",
        "documentType",
        "documentNumber",
        "expiryDate",
        "createdAt"
      ];

      const rows = [header.join(",")];

      // Build CSV rows
      for (const check of checks) {
        let employeeName = "";
        let employeeExternalId = "";
        
        if (check.employeeId) {
          const employee = employeeMap.get(check.employeeId);
          if (employee) {
            employeeName = `${employee.firstName} ${employee.lastName}`;
            employeeExternalId = employee.id;
          }
        } else if (check.firstName && check.lastName) {
          // Standalone check - use candidate name
          employeeName = `${check.firstName} ${check.lastName}`;
        }

        const row = [
          JSON.stringify(employeeName),
          JSON.stringify(employeeExternalId),
          JSON.stringify(check.id),
          JSON.stringify(check.workStatus),
          JSON.stringify(check.documentType ?? ""),
          JSON.stringify(check.documentNumber ?? ""),
          JSON.stringify(check.expiryDate ?? ""),
          JSON.stringify(check.createdAt ?? "")
        ].join(",");

        rows.push(row);
      }

      const csv = rows.join("\n");

      res.setHeader("Content-Type", "text/csv; charset=utf-8");
      res.setHeader("Content-Disposition", "attachment; filename=\"certia-checks.csv\"");
      return res.send(csv);
    } catch (err) {
      console.error("Error exporting checks CSV:", err);
      return res.status(500).json({ error: "Failed to export checks CSV" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
