# RTW-DE - Right to Work Germany

## Overview

RTW-DE is an HR compliance SaaS application for managing employee right-to-work eligibility in Germany. The system enables HR teams to track visa documentation, assess work authorization status, and monitor expiry dates for various German work permits including EU Blue Cards, Employment Authorization Titles (EAT), and Fiktionsbescheinigung documents.

**Core Capabilities:**
- Employee management with biographical data
- Right-to-work check creation and tracking
- Automated eligibility evaluation based on German visa rules
- Document upload and storage
- Dashboard with compliance status overview

## User Preferences

Preferred communication style: Simple, everyday language.

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
- `sessions`: Server-side session storage for authentication

**Relationships:**
- Users → Employees (one-to-many)
- Employees → RightToWorkChecks (one-to-many)

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

**Development:**
- `vite`: Build tool and dev server
- `tsx`: TypeScript execution
- `esbuild`: Server bundling
- `tailwindcss`: CSS framework

### Future Integration Placeholder

**OCR Service (Not Yet Implemented):**
- Stub exists in `server/ocr.ts` for document field extraction
- Planned integration options: Google Cloud Vision, AWS Textract, Tesseract.js, Azure Computer Vision
- Purpose: Auto-populate visa document fields from uploaded images