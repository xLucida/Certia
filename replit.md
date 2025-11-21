# RTW-DE - Right to Work Germany

## Overview

RTW-DE is an HR compliance SaaS application for managing employee right-to-work eligibility in Germany. The system enables HR teams to track visa documentation, assess work authorization status, and monitor expiry dates for various German work permits including EU Blue Cards, Employment Authorization Titles (EAT), and Fiktionsbescheinigung documents.

**Core Capabilities:**
- Employee management with biographical data (full CRUD operations including edit)
- Bulk employee import via CSV upload with validation
- **Dual-mode right-to-work checks:**
  - Pre-employment checks for candidates (without employee records)
  - Compliance checks for existing employees
- Automated eligibility evaluation based on German visa rules
- Document upload and storage via Replit Object Storage
- Unified dashboard displaying both employee-linked and standalone candidate checks
- Advanced filtering by name, work status, document type, and expiry dates
- Premium UI design inspired by Linear and Stripe aesthetics

## User Preferences

Preferred communication style: Simple, everyday language.

## Recent Changes

**November 21, 2025:**
- **OCR Integration for Document Auto-Fill:** Smart document scanning feature
  - Created `lib/ocr.ts`: OCR.space API integration with German language support
  - Automatically extracts document type, number, and expiry date from uploaded visa documents
  - Server-side validation: MIME type checking (PDF/JPG/PNG only) and 10MB file size limit
  - POST /api/ocr/extract endpoint with comprehensive error handling
  - UI enhancement: "Smart Document Scan" section on check creation form
  - User feedback: Success alerts show extracted fields, error alerts guide manual entry
  - Graceful degradation: Form works normally if OCR fails or is unavailable
  - Security: File upload validation prevents abuse, proper HTTP status codes for all error cases
  - All extracted fields remain editable for user review and correction
- **German Right-to-Work Rules Engine Integration:** Automated eligibility evaluation
  - Created `lib/rightToWork.ts`: Comprehensive rules engine implementing German visa compliance logic
  - Conservative approach: Ambiguous or incomplete data defaults to NEEDS_REVIEW status
  - Rules cover EU/EEA nationals, document expiry, employment permissions, employer restrictions, occupation limits, Blue Card requirements, Fiktionsbescheinigung edge cases
  - Created `server/rightToWorkAdapter.ts`: Maps minimal form data to detailed evaluation input with safe defaults
  - Schema updates: Added `decisionSummary` (text) and `decisionDetails` (text[]) to rightToWorkChecks table
  - POST /api/checks endpoint now auto-computes workStatus, decisionSummary, and decisionDetails array
  - UI updates: Employee detail page displays decision summary and bullet-point reasoning list
  - Current behavior: Most checks return NEEDS_REVIEW due to minimal form data collection (by design)
  - End-to-end testing confirmed conservative evaluation logic works correctly
- **Standalone Right-to-Work Checks (Pre-Employment Screening):** Major workflow enhancement
  - Right-to-work checks can now be created independently without requiring employee records first
  - Schema updated: `rightToWorkChecks.employeeId` is now nullable, added `firstName/lastName` fields for candidate names
  - Check creation form redesigned with tabs: "New Candidate" vs "Existing Employee" modes
  - Dashboard displays unified view of both employee-linked and standalone checks
  - Standalone checks show "Candidate" badge to distinguish from employee records
  - New API endpoint: GET `/api/checks/standalone` for fetching candidate checks
  - Cache invalidation strategy: standalone checks query properly invalidated after creation
  - Bug fixes: empty date string handling, workStatus auto-evaluation, storage layer null guards
- **Design Overhaul:** Implemented Linear/Stripe-inspired premium aesthetic
  - Dashboard stat cards: text-5xl numbers with color-coded gradients (green for eligible, amber for expiring, red for not eligible)
  - Table improvements: zebra striping, employee avatars with initials, stronger hover states, better spacing
  - Improved empty states: engaging copy with benefits checklist and clear CTAs
  - Color palette update: vibrant blue primary (217 91% 60%) with teal accents
- **Bulk Employee Import:** CSV upload feature with validation
  - New `/import` page with template download
  - POST /api/employees/import endpoint using multer for file upload
  - CSV parsing with validation and detailed error reporting
  - Import results UI showing successful/failed counts and specific errors
- **Email Notifications Infrastructure:** Database schema created for future implementation
  - `notification_preferences` table for user email settings and notification day thresholds (60/30/14/7 days before expiry)
  - `audit_logs` table for tracking employee/check modifications
  - **Note:** User dismissed Resend integration - email notifications deferred until user provides API credentials

**November 20, 2025:**
- **Employee Edit Feature:** Added full CRUD support with edit functionality
  - New PUT /api/employees/:id endpoint with ownership validation
  - Employee edit page with form pre-populated from existing data
  - Edit button on dashboard for quick access to employee records
- **Advanced Filtering & Search:** Implemented comprehensive filtering system
  - Database-level search filtering using SQL LIKE with LOWER() and COALESCE()
  - Status filter (ELIGIBLE, NOT_ELIGIBLE, NEEDS_REVIEW) applied in-memory
  - Document type filter (EU_BLUE_CARD, EAT, FIKTIONSBESCHEINIGUNG, OTHER)
  - Expiry date range filtering (from/to dates)
  - Optimized query performance: single employee query + batched check fetch (no N+1 problem)
  - Clear filters button for easy reset
  - SQL injection protection via Drizzle parameter binding
- **OCR Integration:** Deferred to future phase
  - Server-side Tesseract.js identified as problematic (CPU-intensive, SSRF risk)
  - Reverted to stub implementation for now
  - Future: implement client-side OCR or use hosted OCR service

## System Architecture

### Frontend Architecture

**Framework & Build System:**
- React 18+ with TypeScript
- Vite for build tooling and development server
- Wouter for client-side routing (lightweight alternative to React Router)

**UI Component System:**
- shadcn/ui components built on Radix UI primitives
- Tailwind CSS for styling with custom design tokens
- Design inspiration from Linear and Stripe for professional, data-focused aesthetics
- Custom theme system with CSS variables for colors and spacing

**State Management:**
- TanStack Query (React Query) for server state management
- React Hook Form with Zod validation for form handling
- No global client state management (relying on server state)

**Key Design Decisions:**
- **Rationale:** shadcn/ui provides accessible, customizable components without adding bundle bloat
- **Alternative:** Material-UI or Ant Design (rejected due to heavier bundle size and less customization flexibility)
- **Pro:** Type-safe, tree-shakeable, full styling control
- **Con:** Requires manual component installation

### Backend Architecture

**Server Framework:**
- Express.js with TypeScript
- ESM module system throughout

**API Design:**
- RESTful endpoints under `/api` prefix
- Session-based authentication with Replit Auth (OpenID Connect)
- JSON request/response format

**Business Logic:**
- Work eligibility evaluation engine (`workEligibility.ts`) implements German visa compliance rules
- Hard-coded rule logic for document types:
  - EU_BLUE_CARD/EAT: eligible if not expired, otherwise not eligible
  - FIKTIONSBESCHEINIGUNG: needs review if valid, not eligible if expired
  - OTHER: always needs manual review

**Key Design Decisions:**
- **Rationale:** Express chosen for simplicity and ecosystem maturity
- **Alternative:** Fastify, Koa (rejected for lower learning curve with Express)
- **Pro:** Extensive middleware ecosystem, well-documented
- **Con:** Less modern than newer frameworks

### Data Storage

**Database:**
- PostgreSQL via Neon serverless
- Drizzle ORM for type-safe database queries
- WebSocket-based connection pooling for serverless environment

**Schema Design:**
- `users`: Stores authenticated user profiles from Replit Auth
- `employees`: Employee records with biographical data (linked to users)
- `rightToWorkChecks`: Work authorization documents and evaluation results
  - **Nullable `employeeId`**: Allows standalone checks for candidates
  - **Candidate fields**: `firstName`, `lastName` for pre-employment checks
  - **Always required**: `userId` for ownership, `workStatus` for evaluation
- `sessions`: Server-side session storage for authentication
- `notification_preferences`: User email notification settings (future use)
- `audit_logs`: Activity tracking for compliance (future use)

**Relationships:**
- Users → Employees (one-to-many)
- Users → RightToWorkChecks (one-to-many, both employee-linked and standalone)
- Employees → RightToWorkChecks (optional one-to-many, only for employee-linked checks)

**Key Design Decisions:**
- **Rationale:** Drizzle chosen for TypeScript-first design and lighter weight than Prisma
- **Alternative:** Prisma (rejected due to slower generation and larger runtime)
- **Pro:** Full type inference, SQL-like API, smaller bundle
- **Con:** Smaller ecosystem than Prisma

### Authentication & Authorization

**Authentication Provider:**
- Replit Auth via OpenID Connect
- Passport.js with `openid-client` strategy
- Session-based auth with PostgreSQL session store (`connect-pg-simple`)

**Session Management:**
- 7-day session TTL
- HTTP-only cookies
- CSRF protection via session secrets

**Authorization Model:**
- User-based resource isolation
- Employees and checks are scoped to the authenticated user
- Ownership verification on all resource access

**Key Design Decisions:**
- **Rationale:** Replit Auth provides zero-config authentication in Replit environment
- **Alternative:** Custom email/password auth (rejected for faster MVP development)
- **Pro:** No credential management, instant user provisioning
- **Con:** Platform lock-in to Replit

### File Upload & Storage

**Object Storage:**
- Google Cloud Storage via Replit Object Storage sidecar
- External account credentials with token exchange flow
- Custom ACL system for access control (implemented but currently unused)

**Upload Flow:**
- Uppy.js dashboard component for client-side file management
- AWS S3-compatible upload API
- Direct-to-storage uploads (no server proxy)
- Supported formats: PDF, JPG, JPEG, PNG

**Key Design Decisions:**
- **Rationale:** Replit Object Storage provides managed GCS integration
- **Alternative:** Direct GCS, AWS S3 (rejected for simpler Replit integration)
- **Pro:** No additional cloud account setup required
- **Con:** Vendor-specific implementation

## External Dependencies

### Third-Party Services

**Replit Platform Services:**
- Replit Auth (OpenID Connect authentication)
- Replit Object Storage (Google Cloud Storage wrapper)
- Neon PostgreSQL (serverless Postgres hosting)

**Cloud Services:**
- Google Cloud Storage (via Replit sidecar proxy)

### Key NPM Packages

**Frontend:**
- `@tanstack/react-query`: Server state management
- `react-hook-form`: Form state and validation
- `zod`: Schema validation
- `@radix-ui/*`: Headless UI components
- `@uppy/core`, `@uppy/dashboard`, `@uppy/aws-s3`: File upload
- `wouter`: Client-side routing

**Backend:**
- `express`: HTTP server
- `drizzle-orm`: Database ORM
- `@neondatabase/serverless`: Postgres client
- `passport`: Authentication middleware
- `openid-client`: OIDC client implementation
- `@google-cloud/storage`: GCS client
- `multer`: File upload middleware (CSV import)
- `csv-parse`: CSV parsing for bulk import

**Development:**
- `vite`: Build tool and dev server
- `tsx`: TypeScript execution
- `esbuild`: Server bundling
- `tailwindcss`: CSS framework

### Future Features

**OCR Service (Not Yet Implemented):**
- Stub exists in `server/ocr.ts` for document field extraction
- Planned integration options: Google Cloud Vision, AWS Textract, Tesseract.js, Azure Computer Vision
- Purpose: Auto-populate visa document fields from uploaded images

**Email Notifications (Schema Ready, Implementation Pending):**
- Database tables created: `notification_preferences`, `audit_logs`
- User dismissed Resend integration setup
- To activate: user must provide email service API credentials (Resend, SendGrid, etc.)
- Planned features:
  - Automated expiry alerts (60/30/14/7 days before expiration)
  - Weekly digest emails for HR teams
  - Configurable notification preferences per user