# RTW-DE - Right to Work Germany

## Overview
RTW-DE is an HR compliance SaaS application designed to manage employee right-to-work eligibility in Germany. It provides HR teams with tools to track visa documentation, assess work authorization status, and monitor expiry dates for various German work permits. Key capabilities include full CRUD operations for employee management, bulk employee imports, dual-mode right-to-work checks for pre-employment candidates and existing employees, automated eligibility evaluation based on German visa rules, document upload and storage, public upload links for secure document collection, and a unified dashboard with advanced filtering. The application offers a premium SaaS user experience with a professional design aesthetic.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend
The frontend uses React 18+ with TypeScript, Vite, and Wouter for routing. UI components are built with shadcn/ui on Radix UI primitives, styled using Tailwind CSS. It features a premium design system with deep navy/ink primary colors, refined typography, subtle gradients, and polished micro-interactions. State management uses TanStack Query for server state and React Hook Form with Zod for form handling.

### Backend
The backend is built with Express.js and TypeScript, using ESM, providing RESTful APIs under `/api`. It uses session-based authentication with Replit Auth.

**AI-Powered Decision Engine & Guardrail System:**
The application integrates with Venice AI for right-to-work assessment, with a traditional rules engine (`lib/rightToWork.ts`) acting as a guardrail. Decisions are made conservatively, prioritizing German visa compliance. In cases of disagreement between AI and rules, the status defaults to `NEEDS_REVIEW`. If Venice AI is unavailable, the rules engine's result is used. All evaluations and conflicts are recorded for audit. Token usage for AI requests is controlled, and robust error handling is implemented.

### Data Storage
PostgreSQL, hosted via Neon serverless, is the primary database, utilizing Drizzle ORM for type-safe queries. The schema includes `users`, `employees`, `rightToWorkChecks`, and `rightToWorkCheckNotes` tables, supporting both employee-linked and standalone right-to-work checks.

### Authentication & Authorization
Replit Auth (OpenID Connect) via Passport.js handles authentication, using session-based management with PostgreSQL for storage. Sessions have a 7-day TTL, HTTP-only cookies, and CSRF protection. Authorization ensures user-based resource isolation.

### File Upload & Storage
File uploads are managed via Google Cloud Storage, accessed through the Replit Object Storage sidecar. Uppy.js facilitates client-side direct-to-storage uploads for PDF, JPG, JPEG, and PNG formats.

### OCR & Document Processing
The application uses Google Cloud Vision API for Optical Character Recognition (OCR) to extract text from uploaded work permit documents. The OCR system automatically identifies document types (EU Blue Card, EAT, Fiktionsbescheinigung), extracts document numbers, expiry dates, employer names, and employment permissions. Extracted data pre-fills form fields to speed up right-to-work check creation. The system provides graceful fallbacks - if OCR fails, users can manually enter document details. Google Cloud Vision offers superior accuracy for German text extraction compared to alternatives, with a generous free tier (1,000 requests/month).

### Public Upload Link System
A secure public upload link system allows HR users to request documents from employees without requiring login. It uses HMAC-SHA256 signed tokens with encrypted payloads and a 14-day expiry. Backend endpoints handle link generation, token validation, and document submission with automatic OCR processing and right-to-work evaluation. Frontend provides a public upload interface.

### Renewals Tracking System
A comprehensive renewals tracking system monitors expiring work authorization documents. A dashboard card displays checks expiring within 90 days, categorized by urgency (Overdue, Expiring Soon, Upcoming). Employee detail pages show the latest check status, next expiry date, and a color-coded countdown.

### Case File Notes System
An internal notes system allows HR teams to add unlimited text notes to any right-to-work check for audit trails and follow-up actions. Notes are timestamped, sorted by newest first, and tenant-isolated.

### Case Workflow Status System
A manual case workflow tracking system helps HR teams manage the administrative status of right-to-work checks independently from the AI/rules-based work authorization status. Checks can be marked `OPEN`, `UNDER_REVIEW`, or `CLEARED`, providing a distinct workflow state.

### Employee Cascade Delete
The system supports secure deletion of employee records and all related compliance data (checks, notes, documents) via a confirmation workflow. Deletion is tenant-scoped and irreversible.

### Multi-Document Support
Right-to-work checks support multiple document uploads. The `rightToWorkCheckDocuments` table stores all documents with an `isPrimary` boolean field to designate which document drives OCR auto-fill. Features include:
- **Primary Document Designation**: First uploaded document is automatically marked as primary; OCR runs only on the primary document to populate form fields.
- **Document Management APIs**: GET/POST/DELETE/PATCH endpoints at `/api/checks/:checkId/documents` for CRUD operations including set-as-primary functionality.
- **Check Detail Page**: Displays all documents with a visual "Primary" badge; star icon allows changing the primary document. Documents can be viewed (download) or deleted individually.
- **Check Creation UI**: Document list with add/remove/primary toggle during check creation; "Add another document" button for additional uploads.

### Public Upload Page Polish
The candidate-facing upload page has updated copy and design to be clearer, more trustworthy, and consistent with Certia branding, emphasizing privacy and ease of use for external candidates.

### Audit Logging & Activity Tracking
A comprehensive audit logging system automatically records all key actions for compliance and transparency. Backend audit logs capture CHECK_CREATED, CASE_STATUS_UPDATED, NOTE_ADDED, ATTACHMENT_ADDED, and EMPLOYEE_DELETED events with timestamps and user attribution. The check detail page displays a "Recent Activity" section showing the latest audit log entries. A "Next action" hint provides status-specific guidance (e.g., for ELIGIBLE checks: keep on file; for NEEDS_REVIEW: review missing information; for NOT_ELIGIBLE: do not proceed with employment).

### Certia Talent Pool (Phase 1)
An internal talent pool system for managing low-skilled, shift-based workers on work visas. HR teams can invite employees to the talent pool with shift-specific metadata. Features include:
- **Talent Invite Dialog**: HR users invite employees via a comprehensive form capturing work area (cleaning, catering, warehouse, etc.), location with travel radius, shift preferences (day, evening, night, weekend), weekly hours bands, language proficiency levels, and availability status (actively looking + available from date).
- **Talent Pool Page**: Card-based layout displaying talent profiles with all relevant shift-work details. Each card shows employee name, headline, work area, location with travel radius, shift badges, weekly hours, languages, permit horizon, availability status, RTW badge with context-specific copy, and check freshness tag.
- **Availability Tracking**: Profiles track whether workers are actively looking (boolean) and their availability date. Displays "✓ Actively looking" + "Available now" or "Available from: DD.MM.YYYY". Includes "Only actively looking" filter checkbox.
- **Enhanced RTW Status Display**: Context-aware badges show work authorization status with actionable copy (e.g., ELIGIBLE ≤90d shows "✅ Work authorization verified via Certia (≤ 90 days)"). Check freshness displayed as "Checked X days ago".
- **Color-Coded Permit Horizons**: Automatically computed from latest check expiry date. Red text for <6 months, amber for 6-12 months, muted for longer horizons. Format: "Permit horizon: ~X months".
- **Multi-Dimensional Filtering**: Filter by work area, location (checks both city and region), shift preference, weekly hours band, permit horizon, and actively looking status. Filters are combinable and individually clearable via "All X" reset options.
- **Visibility Control**: Only profiles marked as visible appear in the talent pool. Profiles with NOT_ELIGIBLE status are automatically excluded from the /talent listing to show only viable candidates. Profiles with ELIGIBLE, NEEDS_REVIEW, or NULL status remain visible with clear status indicators.
- **Schema**: `talent_profiles` table with fields for headline, workArea, locationCity, locationRegion, travelRadiusKm, shiftPreferencesList (array), weeklyHoursBand, germanLevel, englishLevel, permitHorizonBand, isVisibleInTalentPool flag, isActivelyLooking (varchar "true"/"false"), and availableFrom (timestamp nullable).
- **Button Visibility**: "Add to Talent pool" button only appears on employee detail pages when the employee has at least one right-to-work check (ensures work authorization is verified before talent pool inclusion).
- **Phase 1 Scope**: Internal-only tool for HR teams. No candidate-facing UI. Future phases may include candidate self-service and external visibility.

## External Dependencies

### Third-Party Services
- **Replit Platform Services:** Replit Auth, Replit Object Storage, Neon PostgreSQL.
- **Cloud Services:** Google Cloud Storage (proxied via Replit), Google Cloud Vision API (OCR).
- **AI Service:** Venice AI (OpenAI-compatible API).

### Key NPM Packages
- **Frontend:** `@tanstack/react-query`, `react-hook-form`, `zod`, `@radix-ui/*`, `@uppy/*`, `wouter`.
- **Backend:** `express`, `drizzle-orm`, `@neondatabase/serverless`, `passport`, `openid-client`, `@google-cloud/storage`, `@google-cloud/vision`, `multer`, `csv-parse`.