# RTW-DE - Right to Work Germany

## Overview

RTW-DE is an HR compliance SaaS application designed to manage employee right-to-work eligibility in Germany. It provides HR teams with tools to track visa documentation, assess work authorization status, and monitor expiry dates for various German work permits like EU Blue Cards, Employment Authorization Titles (EAT), and Fiktionsbescheinigung documents. The system supports full CRUD operations for employee management, bulk employee imports, and dual-mode right-to-work checks for both pre-employment candidates and existing employees. It features automated eligibility evaluation based on German visa rules, document upload and storage, public upload links for secure document collection from employees, and a unified dashboard with advanced filtering capabilities. The application delivers a premium SaaS user experience with deep navy/ink primary colors (#0F172A), subtle gradients, refined typography, and polished micro-interactions throughout.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

The frontend uses React 18+ with TypeScript, Vite for tooling, and Wouter for routing. UI components are built with shadcn/ui on Radix UI primitives, styled using Tailwind CSS with a premium design system featuring:
- Deep navy/ink primary colors (#0F172A) for professional enterprise feel
- Refined success (#10B981), warning (#F59E0B), and error (#EF4444) color palette
- Enhanced typography scale with improved letter-spacing and line-height
- Subtle gradients across cards, buttons, and interactive elements
- Premium micro-interactions with button-transition and card-hover utility classes
- Consistent spacing, shadows, and visual hierarchy across all pages

State management relies on TanStack Query for server state and React Hook Form with Zod for form handling.

### Backend Architecture

The backend is built with Express.js and TypeScript, using ESM. It features RESTful APIs under `/api` and employs session-based authentication with Replit Auth.

**AI-Powered Decision Engine:**
The application uses Venice AI as the primary right-to-work decision engine, with the traditional rules engine (`lib/rightToWork.ts`) running as a guardrail. The Venice integration (`server/veniceClient.ts`) provides:
- OpenAI-compatible API integration for right-to-work assessment
- Conservative decision-making with German visa compliance prompts
- Type-safe request/response handling with structured outputs
- Graceful fallback when Venice is not configured (returns UNKNOWN)
- Token usage control: OCR text and extracted fields JSON are clipped to 4000 characters max before sending to Venice
- Robust error handling: JSON serialization wrapped in try-catch, null/undefined inputs safely handled

**Guardrail System:**
When a new check is created, both Venice AI and the rules engine evaluate the document:
- **Agreement**: If AI and rules agree on status, use AI's decision and explanation
- **Disagreement**: If AI and rules disagree, downgrade to NEEDS_REVIEW for safety
- **AI Unavailable**: If Venice returns UNKNOWN, use rules engine result
- All evaluations and conflicts are recorded in decisionDetails for full audit trail

**Environment Variables (Production):**
- `VENICE_API_KEY`: Required for Venice AI integration
- `VENICE_MODEL_ID`: Model identifier for Venice API
- `VENICE_API_BASE_URL`: Defaults to https://api.venice.ai

### Data Storage

PostgreSQL, hosted via Neon serverless, is the primary database. Drizzle ORM is used for type-safe queries. The schema includes `users`, `employees`, and `rightToWorkChecks` tables, with `rightToWorkChecks` allowing nullable `employeeId` for standalone candidate checks. Relationships are designed to link users to employees and checks, with checks optionally linked to employees.

### Authentication & Authorization

Authentication is handled by Replit Auth (OpenID Connect) via Passport.js, using session-based management with PostgreSQL for session storage. Sessions have a 7-day TTL and HTTP-only cookies, with CSRF protection. Authorization ensures user-based resource isolation, validating ownership for all resource access.

### File Upload & Storage

File uploads are managed via Google Cloud Storage, accessed through the Replit Object Storage sidecar. Uppy.js facilitates client-side file management and direct-to-storage uploads (S3-compatible API), supporting PDF, JPG, JPEG, and PNG formats.

### Public Upload Link System

The application includes a secure public upload link feature that allows HR users to request documents from employees without requiring them to log in. Key components:

**Token System (server/publicUploadToken.ts):**
- Uses HMAC-SHA256 signing for secure token generation
- Tokens contain encrypted payload: userId, employeeId, and expiry timestamp
- 14-day default expiry with configurable duration
- Timing-safe comparison for validation
- Requires `PUBLIC_UPLOAD_SECRET` environment variable in production
- Fixed development secret for testing (stable across restarts)

**Backend Endpoints:**
- `POST /api/public-upload/link` (authenticated) - Generates secure upload link for an employee
- `GET /api/public-upload/validate` (public) - Validates token without revealing employee data
- `POST /api/public-upload/submit` (public) - Accepts document upload, runs OCR, creates check

**Frontend:**
- "Request Documents" button on employee detail page generates link and copies to clipboard
- Public upload page (`/upload?token=...`) provides drag-and-drop file upload interface
- No authentication required for candidates to submit documents
- Automatic OCR processing and right-to-work evaluation on submission

**Security:**
- No employee personal data leaked to unauthenticated users
- Tokens expire automatically
- File validation (type, size) on both client and server
- Links can only be used for the specific employee they were generated for

## External Dependencies

### Third-Party Services

- **Replit Platform Services:** Replit Auth, Replit Object Storage, Neon PostgreSQL.
- **Cloud Services:** Google Cloud Storage (proxied via Replit).
- **OCR Service (Planned):** Future integration with services like Google Cloud Vision or AWS Textract for document field extraction.

### Key NPM Packages

**Frontend:**
- `@tanstack/react-query`: Server state management.
- `react-hook-form`: Form state and validation.
- `zod`: Schema validation.
- `@radix-ui/*`: Headless UI components.
- `@uppy/core`, `@uppy/dashboard`, `@uppy/aws-s3`: File upload.
- `wouter`: Client-side routing.

**Backend:**
- `express`: HTTP server.
- `drizzle-orm`: Database ORM.
- `@neondatabase/serverless`: PostgreSQL client.
- `passport`, `openid-client`: Authentication middleware and OIDC client.
- `@google-cloud/storage`: GCS client.
- `multer`, `csv-parse`: File upload and CSV processing for bulk import.