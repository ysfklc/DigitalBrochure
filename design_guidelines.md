# e-Brochure Design Guidelines

## Design Approach: Enterprise SaaS System

**Selected Approach:** Design System (Fluent Design inspired)
**Justification:** This is a utility-focused enterprise SaaS platform requiring efficiency, data density, and professional credibility. The multi-tenant architecture and complex workflows (canvas editor, campaign management, analytics dashboards) demand consistency and scalability over visual experimentation.

**Design Principles:**
- Clarity and efficiency in complex workflows
- Professional, trustworthy aesthetic for B2B audience
- Scannable information hierarchy for data-heavy interfaces
- Consistent patterns across authentication, dashboards, and management interfaces

---

## Typography System

**Font Stack:** 
- Primary: Inter (Google Fonts) - for UI elements, body text
- Monospace: JetBrains Mono - for codes, API configs

**Hierarchy:**
- Display: text-4xl to text-5xl, font-semibold (Dashboard headlines, page headers)
- Heading 1: text-3xl, font-semibold (Section titles)
- Heading 2: text-2xl, font-semibold (Card headers, modal titles)
- Heading 3: text-xl, font-medium (Subsections, list headers)
- Body Large: text-base, font-normal (Primary content)
- Body: text-sm, font-normal (Table cells, descriptions)
- Small: text-xs, font-medium (Labels, metadata)

---

## Layout & Spacing System

**Tailwind Spacing Units:** Standardize on 2, 4, 6, 8, 12, 16, 20, 24
- Micro spacing (components): p-2, gap-2, m-2
- Standard spacing (cards, sections): p-4, p-6, gap-4
- Major spacing (page sections): p-8, py-12, gap-8
- Large spacing (page separators): py-16, py-20, gap-16

**Grid System:**
- Container: max-w-7xl mx-auto px-4 md:px-6 lg:px-8
- Dashboard layouts: 12-column grid (grid-cols-12)
- Card grids: grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6

---

## Component Library

### Authentication Pages (Login, Register, 2FA, Password Reset)

**Layout:** Centered card approach
- Split-screen: Left 40% = branding/messaging, Right 60% = form
- Card: max-w-md centered with shadow-lg, rounded-lg, p-8
- Form elements: Full-width inputs, vertical stacking, gap-6
- Primary CTA: w-full button at bottom
- Links: Subtle text-sm below form (Register, Forgot Password)
- Captcha: Integrated above submit button

**2FA Page:**
- QR code display: Centered, bordered container
- TOTP input: Large text-center input for 6-digit code
- Backup codes: Grid display with copy functionality

### Subscription Selection

**Layout:** Three-column pricing cards (grid-cols-1 md:grid-cols-3 gap-6)
- Card structure: Border, shadow-md, rounded-lg, p-8, hover:shadow-xl transition
- Plan header: Plan name (text-xl), price (text-4xl font-bold), billing period
- Features list: Checkmark icons (Heroicons) + text-sm, vertical stack
- CTA button: w-full, positioned at card bottom
- Highlight popular: Border accent, "Most Popular" badge

### Navigation

**Top Navigation Bar:**
- Fixed header: sticky top-0, h-16, border-b
- Left: Logo + app name
- Center: Main navigation (Dashboard, Products, Templates, Campaigns, etc.)
- Right: Language selector, notifications icon, user avatar + dropdown
- Responsive: Hamburger menu for mobile (< md)

**Sidebar Navigation (for data-heavy pages):**
- Fixed left sidebar: w-64, h-screen, border-r
- Collapsible on tablet: Hamburger toggle
- Navigation items: py-3 px-4, icon + label, active state with subtle background
- Role indicator: Badge showing Super Admin/Tenant Admin/User at bottom

### Dashboard

**Layout:** Multi-widget grid
- Stats cards row: grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6
  - Each card: p-6, rounded-lg, shadow
  - Icon + metric value (text-3xl) + label + change indicator
- Charts section: grid-cols-1 lg:grid-cols-2 gap-6
  - Chart containers: p-6, rounded-lg, shadow, min-h-[400px]
- Recent activity: Full-width table or list below charts

### Products Page

**Layout:** Filterable data table
- Filter bar: Top section with search input, category dropdowns, tenant filter (Super Admin), Add Product button
- Product grid/table: 
  - Grid view: grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4
  - Table view: Striped rows, sortable columns, action buttons
- Product card: Image thumbnail, name, category, price, edit/delete actions
- Bulk actions: Checkbox selection, toolbar appears when items selected

### Template Management

**Layout:** Template library + editor preview
- Left sidebar (w-80): Template list with thumbnails, filter by type
- Main area: Template preview + metadata form
- Template cards: Thumbnail preview, template name, type badge, actions
- Form: Vertical layout with sections (General, Cover Page, Inner Pages, Styling)
- Live preview: Canvas simulation showing template applied to sample content

### Canvas Brochure Editor

**Layout:** Full-screen canvas interface
- Top toolbar: fixed, contains save, undo/redo, template selector, page navigation, share
- Left sidebar (w-72): Products panel with search, drag-and-drop product cards
- Center: Canvas workspace (variable dimensions based on template)
  - Grid overlay for alignment
  - Zoom controls (bottom-right floating)
  - Page thumbnails (left column for multi-page)
- Right sidebar (w-80): Element properties (position, size, price display settings)
- Product elements: Draggable, resizable, with automatic price tag insertion

### Campaign Management

**Layout:** Campaign list + detail view
- List view: Table or card grid
  - Columns: Campaign name, template, status (badge), date range, actions
  - Filters: Status, date range, search
- Detail view (modal or full page):
  - Campaign header: Name, status, dates
  - Brochure preview: Rendered pages
  - Sharing section: Social media integration buttons, sharing history
  - Edit button: Opens canvas editor with campaign data

### Messages System

**Layout:** Two-panel messaging interface
- Left panel (w-80): Conversation list with avatars, names, last message preview
- Right panel: Active conversation
  - Header: Recipient info
  - Message thread: Scrollable, alternating sender alignment
  - Compose area: Textarea + send button at bottom

### Account Page

**Layout:** Tabbed interface
- Tabs: Profile, Subscription, Security
- Profile tab: Form with email, name, phone fields
- Subscription tab: Plan details card, billing history table, upgrade/downgrade CTAs
- Two-column layout for forms: Label left, input right (on desktop)

---

## Icon System

**Library:** Heroicons (CDN link)
- Use outline variant for navigation, actions
- Use solid variant for filled states, selected items
- Size: w-5 h-5 for inline icons, w-6 h-6 for standalone, w-8 h-8 for feature icons

---

## Animations

**Minimal, purposeful motion:**
- Page transitions: None (instant)
- Hover states: transition-all duration-150 (subtle scale/shadow)
- Modal appearance: fade-in only, duration-200
- Toast notifications: slide-in-right, duration-300
- No canvas element animations during editing

---

## Images

**Usage Strategy:**
- Authentication pages: Subtle abstract background pattern on left panel (geometric/gradient)
- No hero images - this is a functional SaaS application
- Product thumbnails: Square aspect ratio, object-cover
- Template previews: Actual brochure renderings
- Tutorial section: Video thumbnails, PDF icons

---

## Responsive Behavior

**Breakpoints:**
- Mobile (< 768px): Single column, stacked navigation, full-width cards
- Tablet (768px - 1024px): Two-column grids, collapsible sidebars
- Desktop (> 1024px): Full multi-column layouts, persistent sidebars

**Canvas Editor:** Minimum viewport warning for screens < 1024px, recommend desktop use