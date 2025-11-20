# RTW-DE Design Guidelines

## Design Approach

**Selected Approach**: Design System-Inspired (Linear + Stripe)

**Justification**: This HR compliance SaaS is utility-focused, information-dense, and requires professional credibility. Drawing from Linear's clean productivity aesthetics and Stripe's data-clarity principles ensures efficient workflows for HR teams managing critical compliance documentation.

**Core Principles**:
- Data clarity over decoration
- Scannable tables and status indicators
- Professional, trustworthy appearance
- Efficient form completion
- Clear visual hierarchy for compliance states

---

## Typography

**Font Families**:
- Primary: Inter (via Google Fonts CDN)
- Monospace: JetBrains Mono (for document numbers, dates)

**Hierarchy**:
- Page Titles: `text-3xl font-semibold` 
- Section Headers: `text-xl font-semibold`
- Card Titles: `text-lg font-medium`
- Body Text: `text-base font-normal`
- Labels: `text-sm font-medium uppercase tracking-wide`
- Helper Text: `text-sm`
- Table Data: `text-sm`
- Status Badges: `text-xs font-semibold uppercase tracking-wider`

---

## Layout System

**Spacing Primitives**: Use Tailwind units of **2, 4, 6, 8, 12, 16**

**Container Strategy**:
- Main app container: `max-w-7xl mx-auto px-6`
- Dashboard cards: `p-6` 
- Forms: `space-y-6`
- Table cells: `px-4 py-3`
- Status sections: `mb-12`

**Grid Patterns**:
- Dashboard stats: `grid grid-cols-1 md:grid-cols-3 gap-6`
- Employee cards: `grid grid-cols-1 lg:grid-cols-2 gap-6`
- Form layouts: Single column `max-w-2xl`

---

## Component Library

### Navigation
**Top Navigation Bar**:
- Fixed header with company logo (text-based: "RTW-DE")
- Navigation links: Dashboard, Employees, New Check
- User menu (right-aligned): Company name, Sign Out
- Height: `h-16`, padding: `px-6`

### Dashboard Components

**Stats Cards** (3-column grid):
- Total Employees count
- Eligible Workers count  
- Expiring Soon count (next 60 days)
- Each card: Rounded corners `rounded-lg`, shadow `shadow-sm`, padding `p-6`

**Employee Table**:
- Full-width responsive table with fixed header
- Columns: Employee Name, Document Type, Status Badge, Expiry Date, Actions
- Alternating row treatment for scannability
- Sticky header on scroll: `sticky top-0`
- Row hover state for interactivity

**Status Badges**:
- Pill-shaped: `rounded-full px-3 py-1`
- ELIGIBLE: Solid treatment, prominent
- NOT_ELIGIBLE: Solid treatment, alert style
- NEEDS_REVIEW: Outlined treatment, warning style
- Font: `text-xs font-semibold uppercase tracking-wider`

**Expiring Soon Section**:
- Prominent alert-style card above main table
- Shows checks expiring within 60 days
- Urgent visual treatment with warning icon (Heroicons: ExclamationTriangleIcon)
- Compact table format

### Forms

**Employee Creation Form**:
- Single column layout, `max-w-2xl`
- Field spacing: `space-y-6`
- Input fields: `rounded-md`, height `h-11`, padding `px-4`
- Labels above inputs: `text-sm font-medium mb-2 block`
- Required indicators: Asterisk in label

**Right-to-Work Check Form**:
- Employee selector dropdown (searchable if >10 employees)
- Document type radio group with visual cards
- Date pickers for Issue/Expiry dates (HTML5 date inputs)
- File upload zone: Dashed border `border-2 border-dashed`, padding `p-8`, centered content
- Upload icon: DocumentArrowUpIcon from Heroicons
- Clear file type indicators: "PDF or Image (JPG, PNG) up to 10MB"

**Form Buttons**:
- Primary action: Full width on mobile, `w-full md:w-auto`, height `h-11`, padding `px-6`
- Secondary/Cancel: Ghost treatment
- Button group spacing: `space-x-4`

### Data Display

**Employee Detail Page**:
- Header section: Employee name (large), basic info grid
- Check History section: Timeline of all checks (newest first)
- Each check: Card format with document details, status, uploaded file preview/download
- Document preview: Thumbnail if image, file icon if PDF

**Document Display**:
- Uploaded documents shown as cards
- Image previews: `aspect-video` or `aspect-square`, `rounded-lg`
- PDF indicator: Document icon + filename + download button
- Download button: Small, secondary style with download icon

### Icons
**Icon Library**: Heroicons (outline for UI, solid for status)

**Key Icons**:
- CheckCircleIcon (eligible status)
- XCircleIcon (not eligible status)  
- ExclamationTriangleIcon (needs review, expiring soon)
- DocumentArrowUpIcon (file upload)
- CalendarIcon (date fields)
- UserGroupIcon (employees section)
- DocumentTextIcon (checks/documents)

---

## Authentication Pages

**Sign Up / Log In**:
- Centered card layout: `max-w-md mx-auto mt-16`
- Simple form with logo/title above
- Email/password fields with clear labels
- Primary CTA button full width
- Toggle between sign up/log in: Text link below form
- No hero image - focus on form completion

---

## Animations

**Minimal, Purposeful Only**:
- Table row hover: Subtle background transition
- Form field focus: Border emphasis (no animation)
- Button states: Standard hover/active (built-in)
- NO scroll animations, NO page transitions, NO loading spinners beyond basic states

---

## Images

**No Hero Images** - This is a utility application, not a marketing site.

**Image Usage**:
- Employee photos (optional): Small circular avatars `w-10 h-10 rounded-full` in tables/headers
- Document uploads: User-provided PDFs/images displayed as thumbnails
- Empty states: Simple icon-based illustrations (Heroicons large icons)

---

## Accessibility

- All form inputs have associated labels (no placeholders as labels)
- Status badges use both visual treatment AND text ("Eligible", "Not Eligible", "Needs Review")
- Interactive elements have clear focus states
- Sufficient contrast for all text (especially status badges)
- Table headers properly marked with `<th>` scope
- Form validation messages clearly associated with fields