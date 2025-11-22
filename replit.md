# RTW-DE - Right to Work Germany

## Overview

RTW-DE is an HR compliance SaaS application designed to manage employee right-to-work eligibility in Germany. It provides HR teams with tools to track visa documentation, assess work authorization status, and monitor expiry dates for various German work permits like EU Blue Cards, Employment Authorization Titles (EAT), and Fiktionsbescheinigung documents. The system supports full CRUD operations for employee management, bulk employee imports, and dual-mode right-to-work checks for both pre-employment candidates and existing employees. It features automated eligibility evaluation based on German visa rules, document upload and storage, and a unified dashboard with advanced filtering capabilities. The application delivers a premium SaaS user experience with deep navy/ink primary colors (#0F172A), subtle gradients, refined typography, and polished micro-interactions throughout.

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

The backend is built with Express.js and TypeScript, using ESM. It features RESTful APIs under `/api` and employs session-based authentication with Replit Auth. A key component is the work eligibility evaluation engine, `workEligibility.ts`, which implements German visa compliance rules, providing conservative evaluations that default to "NEEDS_REVIEW" for ambiguous data.

### Data Storage

PostgreSQL, hosted via Neon serverless, is the primary database. Drizzle ORM is used for type-safe queries. The schema includes `users`, `employees`, and `rightToWorkChecks` tables, with `rightToWorkChecks` allowing nullable `employeeId` for standalone candidate checks. Relationships are designed to link users to employees and checks, with checks optionally linked to employees.

### Authentication & Authorization

Authentication is handled by Replit Auth (OpenID Connect) via Passport.js, using session-based management with PostgreSQL for session storage. Sessions have a 7-day TTL and HTTP-only cookies, with CSRF protection. Authorization ensures user-based resource isolation, validating ownership for all resource access.

### File Upload & Storage

File uploads are managed via Google Cloud Storage, accessed through the Replit Object Storage sidecar. Uppy.js facilitates client-side file management and direct-to-storage uploads (S3-compatible API), supporting PDF, JPG, JPEG, and PNG formats.

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