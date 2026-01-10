# Functional Specification Document: Family Financial Tracking App

**Project Name:** Family Finance Tracker  
**Document Version:** 1.0  
**Date:** January 10, 2026  
**Prepared By:** Barney (Project Manager)  
**Estimated Effort:** 48 hours  
**Budget:** $2,400 (Fixed Price)  
**Timeline:** 3 weeks to launch + 1 week support  

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Project Objectives](#project-objectives)
3. [Scope Definition](#scope-definition)
4. [User Personas](#user-personas)
5. [Functional Requirements](#functional-requirements)
6. [Technical Specifications](#technical-specifications)
7. [User Flows](#user-flows)
8. [Data Model](#data-model)
9. [UI/UX Requirements](#uiux-requirements)
10. [Acceptance Criteria](#acceptance-criteria)
11. [Out of Scope](#out-of-scope)
12. [Assumptions & Dependencies](#assumptions--dependencies)
13. [Timeline & Milestones](#timeline--milestones)
14. [Risk Assessment](#risk-assessment)

---

## Executive Summary

This document outlines the functional specifications for building a **lightweight, mobile-responsive family financial tracking web application**. The primary objective is to create a simple, customizable expense tracker that allows a family to upload Excel expense records, categorize spending, set budgets, and view financial trends.

**Key Strategy:** Single-user authentication with cloud sync for multi-device access (phone + laptop). Focus on simplicity and speed over complex features.

**Core Technology:** React-based progressive web app with Supabase backend for authentication and data sync.

**Platform Rationale:** Web app chosen over native mobile app to:
- Minimize development cost and timeline
- Enable instant deployment without app store approval
- Work seamlessly across phone and laptop browsers
- Provide cloud sync without complex infrastructure

---

## Project Objectives

### Primary Goal
Enable a family to track expenses, manage budgets, and visualize spending patterns across multiple devices with a simple, password-protected interface.

### Success Metrics
- **Time to Market:** Live app within 3 weeks
- **Mobile Performance:** App loads in < 2 seconds on 4G
- **Data Sync:** Changes on phone sync to laptop within 5 seconds
- **Excel Import:** User can upload and parse expense Excel files in < 10 seconds
- **User Independence:** User can customize categories and budgets without developer help

### Business Impact
- Replace manual Excel tracking with automated categorization and visualization
- Reduce time spent on monthly budget reviews (from hours to minutes)
- Enable real-time expense tracking on-the-go via mobile
- Provide visual insights into spending patterns and budget adherence

---

## Scope Definition

### In Scope (MVP Features)

#### 1. User Authentication
- Password-protected single-user access
- Simple login screen (email + password)
- Session persistence (stay logged in)
- Logout functionality
- No signup flow needed (admin creates account manually)

#### 2. Excel File Upload & Import
- Upload Excel files (.xlsx, .xls)
- Parse columns: **Date | Merchant Name | Amount | Category | Payment**
- Automatic import into expense database
- Validation (check for required fields)
- Success/error feedback after import

#### 3. Expense Management (CRUD)
- **Create:** Manually add new expenses
- **Read:** View all expenses in sortable, filterable table
- **Update:** Edit existing expense details
- **Delete:** Remove expenses with confirmation

**Expense Fields:**
- Date (date picker)
- Merchant Name (text)
- Amount (number, KRW format)
- Category (dropdown from user-defined categories)
- Payment Method (dropdown: Cash, Credit Card, Debit Card, Bank Transfer)

**Credit Card Cashback Feature:**
- When payment method = "Credit Card":
  - Auto-calculate 1.2% cashback
  - Display: "Original: ₩5,000 → Cashback: ₩60 → Net: ₩4,940"
  - Store both values:
    - `amount_original`: ₩5,000 (what you paid)
    - `amount_net`: ₩4,940 (what it actually cost after cashback)
    - `cashback_amount`: ₩60 (1.2% of original)
- Dashboard and charts use `amount_net` for spending calculations
- User can toggle "Show original amounts" in settings (if they want to see pre-cashback totals)
- Cashback percentage is configurable per user (default 1.2%, editable in settings)

#### 4. Category Management
- **Default Categories (Pre-loaded):**
  - Food
  - Baby
  - Groceries
  - Utilities
  - Household
  - Transport
  - Others
  - Subscription
  - Insurance
  - Monthly Rent
  - Instalment

- **User Customization:**
  - Add new categories
  - Edit category names
  - Delete categories (with warning if expenses exist in that category)
  - Set monthly budget per category

#### 5. Budget Management
- Set monthly budget amount per category (in KRW)
- View budget vs actual spending per category
- Visual indicator: On Track (green) | Warning (yellow, >80%) | Over Budget (red, >100%)
- Monthly budget reset (auto-reset on 1st of each month)

#### 6. Currency Support
- **Primary Currency:** KRW (Korean Won)
- **Secondary Currency:** IDR (Indonesian Rupiah)
- User can toggle between currencies in settings
- Display format: ₩1,234,567 (KRW) or Rp1,234,567 (IDR)

#### 7. Monthly Summary Dashboard
- **Total Spending:** Current month's total expenses
- **Spending by Category:** Pie chart or bar chart showing breakdown
- **Budget Overview:** Table showing Category | Budget | Spent | Remaining
- **Top Merchants:** List of merchants with highest spending this month

#### 8. Monthly Trend Analysis
- **Spending Trend:** Line chart showing monthly expenses over last 6 months
- **Income vs Expenses:** Comparative chart (requires manual income entry)
- **Category Trends:** Line chart showing spending per category over time

#### 9. Income Tracking (Simple)
- Manually add monthly income
- View income vs expenses comparison
- Track net savings (income - expenses)

#### 10. Mobile-Responsive Design
- Optimized for phone screens (iOS Safari, Android Chrome)
- Touch-friendly UI (buttons min 44x44px)
- Bottom navigation for key actions (Home, Add Expense, Budget, Profile)
- Works seamlessly on laptop/desktop browsers

#### 11. Cloud Sync
- Data stored in cloud database (Supabase)
- Changes sync across devices in real-time
- Offline support (local cache, sync when online)

---

## User Personas

### Persona 1: The Tech-Savvy Early Adult (Primary User)
- **Age:** 22-29
- **Tech Level:** High (comfortable with self-hosting, Docker, GitHub)
- **Behavior:** Tracks expenses daily on phone, reviews weekly on laptop
- **Pain Points:** Commercial apps have ads/paywalls, wants data ownership, Excel is clunky
- **Expectations:** 
  - Clean, modern UI (dark mode optional)
  - Fast, snappy interactions
  - Privacy-first (self-hosted, no data sold)
  - Customizable everything
  - Works offline

### Persona 2: The Young Professional Couple (Secondary User)
- **Age:** 25-30
- **Behavior:** Shares one login to track household expenses together
- **Pain Points:** Need simple budget tracking for rent, groceries, date nights
- **Expectations:** 
  - Mobile-first (log expenses on-the-go)
  - Visual spending insights (where did our money go?)
  - Easy Excel import (from bank statements)

---

## Functional Requirements

### FR-001: User Authentication
**Priority:** P0 (Critical)  
**Description:** User must be able to securely access the app with password protection.

**Requirements:**
- Login screen with email and password fields
- "Remember me" checkbox for persistent login
- Session timeout after 30 days of inactivity
- Logout button in profile/settings
- Password reset not needed for MVP (admin can reset manually)

**Acceptance Criteria:**
- [ ] User can log in with correct credentials
- [ ] Wrong password shows clear error message
- [ ] Session persists after browser close (if "Remember me" checked)
- [ ] User can log out successfully
- [ ] Unauthorized access redirects to login screen

---

### FR-002: Excel File Upload & Import
**Priority:** P0 (Critical)  
**Description:** User must be able to upload Excel files and import expenses automatically.

**Requirements:**
- Drag-and-drop file upload area
- Click to select file (file picker)
- Support .xlsx and .xls formats
- Parse columns in this exact order: **Date | Merchant Name | Amount | Category | Payment**
- Validate required fields (Date, Amount, Category)
- Skip rows with missing required fields (show count of skipped rows)
- Import button (process file after upload)
- Progress indicator during import
- Success message: "X expenses imported successfully, Y rows skipped"

**Acceptance Criteria:**
- [ ] User can upload Excel file via drag-and-drop or file picker
- [ ] File is parsed correctly (columns match expected format)
- [ ] Valid expenses are imported into database
- [ ] Invalid rows are skipped with clear feedback
- [ ] Import completes in < 10 seconds for 500 rows
- [ ] Duplicate detection: Warn if expense with same Date + Merchant + Amount already exists

---

### FR-003: Expense Management (CRUD)
**Priority:** P0 (Critical)  
**Description:** User must be able to manually create, view, edit, and delete expenses with automatic cashback calculation for credit card payments.

**Requirements:**

**Create:**
- "Add Expense" button (accessible from bottom nav on mobile)
- Form fields:
  - Date (date picker, default: today)
  - Merchant Name (text input, autocomplete from previous merchants)
  - Amount (number input, no decimals for KRW/IDR)
  - Category (dropdown from user-defined categories)
  - Payment (dropdown: Cash, Credit Card, Debit Card, Bank Transfer)
- **Cashback Calculation (Auto-trigger when Payment = "Credit Card"):**
  - User enters amount: ₩5,000
  - System calculates:
    - Cashback: ₩5,000 × 1.2% = ₩60
    - Net amount: ₩5,000 - ₩60 = ₩4,940
  - Display inline preview: 
    ```
    Amount: ₩5,000
    💳 Credit Card Cashback (1.2%): -₩60
    Net Cost: ₩4,940
    ```
  - Save button stores:
    - `amount_original`: 5000
    - `cashback_percentage`: 1.2
    - `cashback_amount`: 60
    - `amount_net`: 4940
- Validation: All fields required except Payment (optional)

**Read:**
- Table view with columns: Date | Merchant | Amount | Cashback | Net Amount | Category | Payment | Actions
- "Net Amount" column shows amount after cashback (if applicable)
- Cashback column shows: "₩60 (1.2%)" for CC payments, "—" for others
- Toggle in header: "Show Original Amounts" (switches between net and original)
- Sort by: Date (default, newest first), Amount, Category, Net Amount
- Filter by: Category, Date Range, Payment Method
- Search: Free text search in Merchant Name
- Pagination: 50 expenses per page
- Mobile view: Card-based list with cashback badge

**Update:**
- Click "Edit" button on expense row
- Open same form as Create (pre-filled)
- If user changes payment method from CC to Cash, remove cashback
- If user changes payment method from Cash to CC, recalculate cashback
- Save changes

**Delete:**
- Click "Delete" button on expense row
- Confirmation modal: "Are you sure you want to delete this expense?"
- Permanent deletion (no undo for MVP)

**Cashback Settings (User Configurable):**
- Settings > Cashback page
- Set cashback percentage (default: 1.2%)
- Options: 0.5%, 1.0%, 1.2%, 1.5%, 2.0%, or custom
- Applied to all future CC expenses (doesn't retroactively update existing)
- Option to retroactively apply to all existing CC expenses (bulk update)

**Acceptance Criteria:**
- [ ] User can add a new expense manually
- [ ] When payment = "Credit Card", cashback auto-calculates
- [ ] Net amount displays correctly (original - cashback)
- [ ] All expenses display in table/list with cashback column
- [ ] User can toggle between net and original amounts
- [ ] User can edit cashback percentage in settings
- [ ] User can bulk-update existing CC expenses with new cashback rate
- [ ] User can sort and filter expenses
- [ ] User can edit any expense
- [ ] Changing payment method recalculates cashback correctly
- [ ] User can delete expense with confirmation
- [ ] Changes sync to server immediately

---

### FR-004: Category Management
**Priority:** P1 (High)  
**Description:** User must be able to customize expense categories and set budgets.

**Requirements:**

**Default Categories (Pre-loaded on First Login):**
Food, Baby, Groceries, Utilities, Household, Transport, Others, Subscription, Insurance, Monthly Rent, Instalment

**Category CRUD:**
- Settings > Categories page
- List all categories with:
  - Category name
  - Current month budget (editable inline)
  - Expense count (how many expenses use this category)
  - Edit/Delete buttons

**Add Category:**
- "Add Category" button
- Modal with fields:
  - Category Name (text, required, max 30 chars)
  - Monthly Budget (number, optional, KRW)
- Save creates new category immediately available in dropdowns

**Edit Category:**
- Click Edit icon
- Inline edit of name and budget
- Save on blur or Enter key

**Delete Category:**
- Click Delete icon
- Confirmation: "X expenses use this category. Assign them to another category before deleting."
- If 0 expenses, delete immediately
- If >0 expenses, show dropdown to reassign expenses to another category

**Acceptance Criteria:**
- [ ] Default categories load on first login
- [ ] User can add new categories
- [ ] User can edit category name and budget
- [ ] User cannot delete category with active expenses (without reassignment)
- [ ] Category changes sync across devices

---

### FR-005: Budget Management
**Priority:** P1 (High)  
**Description:** User must be able to set budgets per category and track spending against them.

**Requirements:**
- Budget page with table:
  - Category | Budget | Spent | Remaining | Status
- Status indicator:
  - **Green (On Track):** Spent < 80% of budget
  - **Yellow (Warning):** Spent 80-100% of budget
  - **Red (Over Budget):** Spent > 100% of budget
- Progress bar visual (0-100%+)
- Inline editing of budget amounts
- "Save Changes" button
- Monthly auto-reset (budgets stay, spent resets to 0 on 1st of month)

**Acceptance Criteria:**
- [ ] User can view all category budgets
- [ ] User can edit budget amounts inline
- [ ] Spent amounts calculate correctly from expenses
- [ ] Status colors display correctly
- [ ] Budget resets automatically on 1st of each month

---

### FR-006: Currency Support
**Priority:** P2 (Medium)  
**Description:** User must be able to toggle between KRW and IDR currencies.

**Requirements:**
- Settings > Currency toggle
- Options: KRW (Korean Won) or IDR (Indonesian Rupiah)
- Display format:
  - KRW: ₩1,234,567 (no decimals, comma separators)
  - IDR: Rp1,234,567 (no decimals, comma separators)
- Currency setting persists per user
- Does NOT convert amounts (user enters amounts in their chosen currency)

**Acceptance Criteria:**
- [ ] User can select KRW or IDR in settings
- [ ] All amounts display with correct currency symbol
- [ ] Format uses comma separators (no decimals)
- [ ] Currency preference saves

---

### FR-007: Monthly Summary Dashboard
**Priority:** P0 (Critical)  
**Description:** User must see a visual summary of current month's spending with cashback insights.

**Requirements:**

**Dashboard Cards (Top Row):**
1. Total Spending This Month (net amount after cashback)
2. Total Cashback Earned This Month (sum of all CC cashback)
3. Budget Progress (X% of total budget used, calculated with net amounts)
4. Top Category (category with highest net spending)

**Spending by Category:**
- Pie chart OR horizontal bar chart
- Uses net amounts (after cashback)
- Shows each category with percentage of total
- Click on slice/bar to filter expense table to that category

**Budget Overview Table:**
- Category | Budget | Spent (net) | Cashback Saved | Remaining | Status
- "Cashback Saved" column shows total cashback for that category this month
- Sort by: Spent (default, highest first)

**Top Merchants:**
- List of top 5 merchants by total net spending this month
- Format: Merchant Name - ₩Amount (net) [₩Cashback saved] (X transactions)

**Cashback Summary Card (New):**
- "This Month's Cashback"
- Total cashback earned: ₩12,345
- Average cashback per transaction: ₩206
- Breakdown by category:
  - Food: ₩3,500 (15 transactions)
  - Groceries: ₩5,200 (8 transactions)
  - Transport: ₩2,100 (12 transactions)

**Date Range Selector:**
- Default: Current month
- Dropdown: Last 30 days, This Month, Last Month, Last 3 Months

**Acceptance Criteria:**
- [ ] Dashboard loads in < 2 seconds
- [ ] All calculations use net amounts (after cashback)
- [ ] Cashback summary card displays total earned
- [ ] Charts render correctly on mobile and desktop
- [ ] Date range filter updates all widgets
- [ ] Cashback breakdown shows per-category savings

---

### FR-008: Monthly Trend Analysis
**Priority:** P1 (High)  
**Description:** User must visualize spending trends over time and compare to income.

**Requirements:**

**Spending Trend Chart:**
- Line chart showing total expenses per month (last 6 months)
- X-axis: Month (Jan, Feb, Mar...)
- Y-axis: Amount (KRW/IDR)

**Income vs Expenses Chart:**
- Dual-line or bar chart
- Blue line: Income per month
- Red line: Expenses per month
- Green area: Net savings (income - expenses)
- Requires user to manually enter income per month

**Category Trends:**
- Line chart with multiple lines (one per category)
- Toggle categories on/off (legend with checkboxes)
- Last 6 months of data

**Acceptance Criteria:**
- [ ] Charts display data for last 6 months
- [ ] Income data is editable per month
- [ ] Category trends allow toggling categories
- [ ] Charts are responsive (work on mobile)

---

### FR-009: Income Tracking
**Priority:** P2 (Medium)  
**Description:** User must be able to track monthly income to compare with expenses.

**Requirements:**
- Income page with table: Month | Income Amount | Actions
- Add income button
- Form: Month (month picker), Amount (number)
- Edit/delete income entries
- Income displays in Dashboard (total for current month)
- Income vs Expenses chart uses this data

**Acceptance Criteria:**
- [ ] User can add monthly income
- [ ] User can edit/delete income entries
- [ ] Income appears in dashboard and charts
- [ ] Default income is 0 if not entered

---

### FR-010: Mobile Responsiveness
**Priority:** P0 (Critical)  
**Description:** App must work seamlessly on mobile phones and tablets.

**Requirements:**
- Mobile-first design approach
- Bottom navigation bar (fixed):
  - Home (dashboard)
  - Add Expense (+ icon)
  - Budget
  - Settings
- Touch-friendly UI:
  - Buttons min 44x44px
  - No hover states (use tap states)
  - Swipe gestures for delete (optional enhancement)
- Table view converts to card list on mobile
- Forms use native mobile inputs (date picker, number keyboard)
- No horizontal scrolling

**Acceptance Criteria:**
- [ ] App loads and functions on iOS Safari
- [ ] App loads and functions on Android Chrome
- [ ] All interactive elements are easily tappable
- [ ] Bottom nav works on mobile
- [ ] No layout breaks on screens < 375px width

---

### FR-011: Cloud Sync
**Priority:** P0 (Critical)  
**Description:** Data must sync across phone and laptop in real-time.

**Requirements:**
- All data stored in Supabase PostgreSQL database
- Real-time sync using Supabase Realtime subscriptions
- Changes on one device appear on other device within 5 seconds
- Offline support:
  - Cache last loaded data in browser
  - Allow viewing (read-only) when offline
  - Queue changes when offline, sync when back online
- Conflict resolution: Last write wins (simple strategy for single user)

**Acceptance Criteria:**
- [ ] Adding expense on phone shows on laptop within 5 seconds
- [ ] Editing category on laptop updates phone immediately
- [ ] App works in read-only mode when offline
- [ ] Changes made offline sync when connection restored
- [ ] No data loss during sync

---

## Technical Specifications

### Platform & Architecture
- **Application Type:** Self-hosted Progressive Web App (PWA)
- **Deployment:** Docker Compose (single command deployment)
- **Frontend Framework:** React 18+ with TypeScript
- **Backend Framework:** Node.js + Express (REST API)
- **Database:** PostgreSQL 15+ (containerized)
- **Authentication:** JWT-based (no third-party dependencies)

### Technology Stack

**Frontend:**
- **Framework:** React 18.2+ with TypeScript
- **Build Tool:** Vite (fast dev server, optimized builds)
- **Styling:** Tailwind CSS 3.4+ with shadcn/ui components
- **Charts:** Recharts (React charting library)
- **Excel Parsing:** SheetJS (xlsx) for client-side Excel file parsing
- **Date Handling:** date-fns (lightweight, modern)
- **Forms:** React Hook Form (performant form validation)
- **Icons:** Lucide React (modern icon set)
- **State Management:** TanStack Query (React Query) + Zustand

**Backend:**
- **Runtime:** Node.js 20+ LTS
- **Framework:** Express.js 4.18+
- **Database ORM:** Drizzle ORM (TypeScript-first, lightweight)
- **Authentication:** JWT (jsonwebtoken) + bcrypt for password hashing
- **Validation:** Zod (TypeScript schema validation)
- **File Upload:** Multer (for future receipt photos)

**Database:**
- **RDBMS:** PostgreSQL 15+
- **Migration Tool:** Drizzle Kit (type-safe migrations)

**DevOps & Deployment:**
- **Containerization:** Docker + Docker Compose
- **Web Server:** Nginx (reverse proxy, static file serving)
- **Process Manager:** PM2 (Node.js process management)
- **Environment Management:** dotenv

**Self-Hosting Requirements:**
- **Minimum Server Specs:**
  - 1 CPU core
  - 1GB RAM
  - 10GB storage (5GB for app + database, 5GB buffer)
  - Ubuntu 22.04 LTS or similar
- **Recommended Providers:**
  - Hetzner Cloud (€3.79/month, CX11)
  - DigitalOcean Droplet ($6/month, Basic)
  - Contabo VPS (€4.50/month, VPS S)
  - Client's existing server/NAS (if available)

### Hosting Architecture (Self-Hosted)

```
User's Browser
    ↓
[Domain/Subdomain] finance.clientdomain.com
    ↓
Nginx Reverse Proxy (port 80/443)
    ↓
    ├─→ Frontend (React SPA) - served as static files
    └─→ Backend API (Node.js Express) - port 3000
            ↓
        PostgreSQL Database - port 5432 (internal only)
```

**Docker Compose Stack:**
```yaml
services:
  postgres:
    image: postgres:15-alpine
    volumes:
      - ./data/postgres:/var/lib/postgresql/data
    environment:
      POSTGRES_DB: finance_tracker
      POSTGRES_USER: finance_user
      POSTGRES_PASSWORD: ${DB_PASSWORD}
  
  backend:
    build: ./backend
    depends_on:
      - postgres
    environment:
      DATABASE_URL: postgresql://finance_user:${DB_PASSWORD}@postgres:5432/finance_tracker
      JWT_SECRET: ${JWT_SECRET}
  
  frontend:
    build: ./frontend
    depends_on:
      - backend
  
  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
      - ./ssl:/etc/nginx/ssl  # SSL certificates
    depends_on:
      - frontend
      - backend
```

### Browser Support
- **Mobile:**
  - iOS Safari 15+ (iPhone)
  - Android Chrome 100+ (Android phone)
- **Desktop:**
  - Chrome 100+ (latest 2 versions)
  - Firefox 100+ (latest 2 versions)
  - Safari 15+ (macOS)
  - Edge 100+ (Windows)

### Performance Targets
- **Initial Load:** < 1.5 seconds (self-hosted on decent server)
- **Time to Interactive:** < 2 seconds
- **Excel Import (500 rows):** < 5 seconds
- **API Response Time:** < 100ms (database queries)
- **Lighthouse Score:** > 95 (Performance, Accessibility)

### Security
- **Authentication:** JWT tokens with HTTP-only cookies
- **Password Storage:** bcrypt with salt rounds = 10
- **HTTPS:** Let's Encrypt SSL (auto-renewed via Certbot)
- **CORS:** Configured for same-origin only
- **SQL Injection:** Prevented via Drizzle ORM parameterized queries
- **XSS Protection:** Content Security Policy headers
- **Rate Limiting:** Express rate limit (100 req/min per IP)

### Self-Hosting Benefits
- ✅ **Full data ownership** (no third-party cloud)
- ✅ **No monthly fees** (just server cost, ~$5/month or free on home server)
- ✅ **Privacy-first** (data never leaves your server)
- ✅ **Unlimited users** (add family members later without extra cost)
- ✅ **Customizable** (full source code access, modify as needed)
- ✅ **Portable** (backup = copy Docker volume, restore anywhere)

### Deployment Options

**Option 1: Cloud VPS (Recommended for Beginners)**
- Hetzner Cloud CX11 (€3.79/month)
- One-command setup: `docker-compose up -d`
- Automatic SSL via Certbot
- Access via subdomain (finance.yourdomain.com)

**Option 2: Home Server/NAS**
- Synology/QNAP NAS with Docker support
- Raspberry Pi 4 (4GB RAM minimum)
- Old laptop running Ubuntu Server
- Free hosting (just electricity cost)
- Requires port forwarding + dynamic DNS (or Cloudflare Tunnel)

**Option 3: Client's Existing Hosting**
- If they have VPS/dedicated server already
- Deploy alongside existing services
- Share resources (PostgreSQL, Nginx)

### Backup Strategy
- **Automated Daily Backups:**
  - PostgreSQL dump via `pg_dump` (cron job)
  - Backup to external storage (rsync to another server, or cloud storage)
  - Retention: 7 daily, 4 weekly, 12 monthly
- **One-Command Restore:**
  - `docker-compose down`
  - `pg_restore backup.sql`
  - `docker-compose up -d`

### Update/Maintenance
- **Docker Image Updates:** Pull new images, restart containers
- **Database Migrations:** Run `npm run migrate` (safe, reversible)
- **Zero-Downtime Updates:** Optional (use blue-green deployment if critical)
- **Estimated Maintenance:** < 1 hour/month (security updates, backups check)

---

## User Flows

### Flow 1: First-Time Login & Setup

```
User visits app URL
  ↓
Login screen (email + password)
  ↓
User enters credentials
  ↓
Dashboard loads (empty state)
  ↓
System auto-creates default categories
  ↓
User sees "Get Started" prompt:
  - "Upload your first Excel file"
  - "Or add an expense manually"
  ↓
User clicks "Upload Excel"
  ↓
Drag-and-drop area appears
  ↓
User uploads file
  ↓
File parsed, expenses imported
  ↓
Success message: "150 expenses imported"
  ↓
Dashboard updates with spending summary
  ↓
User sets budgets per category (Settings > Categories)
```

---

### Flow 2: Daily Expense Logging (Mobile)

```
User opens app on phone
  ↓
Dashboard loads (cached data if offline)
  ↓
User makes purchase (coffee, ₩5,000)
  ↓
Taps "+" button in bottom nav
  ↓
Add Expense form appears
  ↓
Date: Auto-filled (today)
Merchant: User types "Starbucks"
Amount: 5000
Category: Selects "Food"
Payment: Selects "Credit Card"
  ↓
Taps "Save"
  ↓
Expense syncs to cloud
  ↓
Success toast: "Expense added"
  ↓
Returns to dashboard
  ↓
Dashboard updates with new total
```

---

### Flow 3: Weekly Budget Review (Laptop)

```
User opens app on laptop
  ↓
Dashboard loads with current month summary
  ↓
User sees "Food" category is at 85% budget (yellow warning)
  ↓
Clicks on "Food" in pie chart
  ↓
Expense table filters to Food category
  ↓
User reviews expenses, sees many coffee purchases
  ↓
User goes to Settings > Categories
  ↓
Creates new category "Coffee" (split from Food)
  ↓
Returns to expense table
  ↓
Bulk-selects coffee-related expenses
  ↓
Changes category from "Food" to "Coffee"
  ↓
Dashboard recalculates
  ↓
"Food" budget now at 60% (green)
```

---

### Flow 4: Monthly Trend Analysis

```
User navigates to "Trends" page
  ↓
Spending Trend chart loads (last 6 months)
  ↓
User sees spike in September
  ↓
Clicks on September data point
  ↓
Expense table filters to September
  ↓
User sees large "Household" expenses (furniture purchase)
  ↓
User goes to Income vs Expenses chart
  ↓
Adds income for each month
  ↓
Chart updates showing net savings
  ↓
User exports screenshot for financial planning
```

---

## Data Model

### User Table (Supabase Auth)

```typescript
User {
  id: uuid (primary key, auto-generated)
  email: string (unique)
  created_at: timestamp
  // Managed by Supabase Auth
}
```

---

### Expenses Table

```typescript
Expense {
  id: uuid (primary key, auto-generated)
  user_id: uuid (foreign key to User, indexed)
  date: date (indexed)
  merchant_name: string (max 100 chars)
  amount_original: integer (amount paid, in smallest currency unit)
  cashback_percentage: decimal (nullable, e.g., 1.2 for 1.2%)
  cashback_amount: integer (nullable, calculated: original × percentage)
  amount_net: integer (amount after cashback, what actually cost)
  category: string (foreign key to Categories table)
  payment_method: enum ['Cash', 'Credit Card', 'Debit Card', 'Bank Transfer']
  created_at: timestamp (auto-generated)
  updated_at: timestamp (auto-updated)
}

Indexes:
- user_id, date (for fast monthly queries)
- user_id, category (for category filtering)
- user_id, payment_method (for cashback reports)

Calculations:
- If payment_method = 'Credit Card':
  - cashback_amount = amount_original × (cashback_percentage / 100)
  - amount_net = amount_original - cashback_amount
- Else:
  - cashback_percentage = null
  - cashback_amount = null
  - amount_net = amount_original

Notes:
- Dashboard uses amount_net for all spending calculations
- Charts use amount_net by default
- User can toggle to see amount_original in settings
```

---

### Categories Table

```typescript
Category {
  id: uuid (primary key, auto-generated)
  user_id: uuid (foreign key to User)
  name: string (max 30 chars)
  monthly_budget: integer (nullable, in smallest currency unit)
  is_default: boolean (true for pre-loaded categories)
  created_at: timestamp
  updated_at: timestamp
}

Unique constraint: (user_id, name) // User can't have duplicate category names
```

---

### Income Table

```typescript
Income {
  id: uuid (primary key, auto-generated)
  user_id: uuid (foreign key to User)
  month: date (format: YYYY-MM-01, first day of month)
  amount: integer (in smallest currency unit)
  created_at: timestamp
  updated_at: timestamp
}

Unique constraint: (user_id, month) // One income entry per month
```

---

### User Settings Table

```typescript
UserSettings {
  user_id: uuid (primary key, foreign key to User)
  currency: enum ['KRW', 'IDR'] (default: 'KRW')
  cashback_percentage: decimal (default: 1.2, for credit card payments)
  show_original_amounts: boolean (default: false, if true show pre-cashback amounts)
  created_at: timestamp
  updated_at: timestamp
}
```

---

## UI/UX Requirements

### Design Principles
1. **Mobile-First:** Design for phone, enhance for desktop
2. **Minimalist & Modern:** Clean interface inspired by Notion, Linear, Arc browser
3. **Dark Mode First:** Default dark theme with light mode toggle
4. **Quick Actions:** Add expense in < 5 seconds (gesture-based if possible)
5. **Data Visualization:** Beautiful charts that tell a story
6. **Privacy-Focused:** No tracking, no analytics, no external CDNs

### Design Philosophy (Early Adult Aesthetic)
- **Inspiration:** Notion, Linear, Superhuman, Arc Browser, Vercel Dashboard
- **Vibe:** Calm, focused, professional but not corporate
- **Typography:** Clean sans-serif, generous spacing, clear hierarchy
- **Animations:** Subtle, fast (< 200ms), purpose-driven (not decorative)
- **Empty States:** Helpful, friendly, guide user to next action

---

### Color Palette

**Dark Mode (Default):**
- **Background Primary:** #0A0A0A (true black)
- **Background Secondary:** #141414 (card backgrounds)
- **Background Tertiary:** #1F1F1F (hover states)
- **Text Primary:** #FAFAFA (high contrast white)
- **Text Secondary:** #A3A3A3 (neutral gray)
- **Text Tertiary:** #737373 (muted gray)
- **Border:** #262626 (subtle dividers)

**Accent Colors:**
- **Primary (Blue):** #3B82F6 (buttons, links, focus states)
- **Success (Green):** #10B981 (on-track budgets, positive)
- **Warning (Amber):** #F59E0B (80-100% budget)
- **Danger (Red):** #EF4444 (over budget, delete)
- **Purple (Accent):** #8B5CF6 (income, special highlights)

**Light Mode (Optional):**
- **Background Primary:** #FFFFFF (white)
- **Background Secondary:** #F9FAFB (light gray)
- **Text Primary:** #0A0A0A (dark)
- **Text Secondary:** #525252 (gray)
- **Border:** #E5E7EB (light border)

---

### Typography

**Font Family:**
- **Default:** `"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`
- **Monospace (amounts):** `"JetBrains Mono", "SF Mono", Consolas, monospace`

**Type Scale:**
- **Display (dashboard totals):** 32px, bold, tabular nums
- **H1 (page titles):** 24px, semibold
- **H2 (section titles):** 18px, semibold
- **H3 (card titles):** 16px, medium
- **Body:** 14px, regular
- **Small (labels):** 12px, regular
- **Tiny (metadata):** 11px, regular, text-tertiary

**Number Formatting:**
- Use tabular nums (font-feature-settings: "tnum")
- Large amounts: ₩1,234,567 (no decimals)
- Always right-aligned in tables

---

### Component Library

#### Bottom Navigation (Mobile)
```
┌─────────────────────────────────────────┐
│                                         │
│          [Main Content Area]            │
│                                         │
└─────────────────────────────────────────┘
┌─────────────────────────────────────────┐
│  [📊]    [➕]    [💰]    [⚙️]          │ ← Fixed bottom
│  Home    Add    Budget   Settings       │
└─────────────────────────────────────────┘
```

**Specs:**
- Height: 64px
- Background: blur(10px) backdrop + 90% opacity (frosted glass effect)
- Border top: 1px solid border color
- Active state: Icon + label in primary color
- Inactive state: Icon only, text-secondary

#### Expense Card (Mobile, Dark Mode)
```
┌─────────────────────────────────────────┐
│ Starbucks Gangnam                       │
│ ₩5,000 → ₩4,940              [⋮]       │
│ 💳 1.2% cashback (₩60 saved)           │
│ Food • Credit Card • 2 hours ago        │
└─────────────────────────────────────────┘
```

**Specs:**
- Background: #141414
- Border: 1px solid #262626
- Padding: 12px
- Border radius: 8px
- Cashback line: Green text (#10B981), small font
- Show strikethrough on original amount if cashback applied
- Tap: Expand to show edit/delete actions
- Swipe left: Quick delete (with undo toast)

#### Dashboard Cashback Card (New)
```
┌─────────────────────────────────────────┐
│ 💳 This Month's Cashback                │
│ ₩12,345                                 │
│ ↑ 8% vs last month                      │
│                                         │
│ Top Categories:                         │
│ • Food: ₩3,500 (15 transactions)        │
│ • Groceries: ₩5,200 (8 tx)              │
│ • Transport: ₩2,100 (12 tx)             │
└─────────────────────────────────────────┘
```

**Specs:**
- Green accent color (not blue, since it's savings)
- Sparkle animation on mount (optional, celebratory)
- Click to expand full cashback breakdown

#### Budget Progress Card
```
┌─────────────────────────────────────────┐
│ Food                                    │
│ ₩50,000 / ₩80,000                       │
│ [████████████░░░░░░░] 62%               │
│ ₩30,000 remaining • On track 🟢         │
└─────────────────────────────────────────┘
```

**Specs:**
- Progress bar height: 6px
- Border radius: 3px (pill shape)
- Gradient fill (subtle): from primary to primary-light
- Animate on load (0 → 62% in 500ms)

#### Dashboard Stat Card (Desktop)
```
┌───────────────────────────┐
│ Total Spending            │
│ ₩1,234,567                │
│ ↑ 12.5% vs last month     │
└───────────────────────────┘
```

**Specs:**
- Background: #141414
- Border: 1px solid #262626
- Padding: 24px
- Hover: Border → primary color (subtle glow)
- Transition: 150ms ease

#### Chart Container
```
┌─────────────────────────────────────────┐
│ Spending by Category                    │
│                                         │
│   [Beautiful Recharts Pie Chart]        │
│   - No legend clutter                   │
│   - Tooltip on hover                    │
│   - Smooth animations                   │
│                                         │
└─────────────────────────────────────────┘
```

**Specs:**
- Chart colors: Use accent palette (blue, green, purple, amber, red)
- Background: transparent (inherit from card)
- Tooltip: Dark background, rounded corners, subtle shadow
- Animations: 400ms ease-out on mount

---

### Navigation Structure

**Mobile (Bottom Nav):**
```
[📊 Home] [➕ Add] [💰 Budget] [⚙️ Settings]
```

**Desktop (Sidebar, Collapsible):**
```
┌─────────────────┐
│ [Logo]          │
│                 │
│ 📊 Dashboard    │
│ 📝 Expenses     │
│ 💰 Budget       │
│ 📈 Trends       │
│ 💵 Income       │
│ ⚙️  Settings    │
│                 │
│ ───────────     │
│ 🌙 Dark Mode    │ ← Toggle
│ 👤 Logout       │
└─────────────────┘
```

---

### Animations & Micro-Interactions

**Loading States:**
- Skeleton screens (not spinners) - show content shape while loading
- Fade in when data loads (200ms)

**Transitions:**
- Page transitions: Slide left/right (mobile), fade (desktop)
- Button press: Scale 0.98 (50ms)
- Card hover: Lift shadow (150ms ease)

**Success Feedback:**
- Expense added: Green toast (top-right, auto-dismiss 3s)
- Confetti on budget goal achieved (optional, fun touch)

**Gestures (Mobile):**
- Swipe left on expense card: Delete (with undo)
- Pull to refresh: Refresh dashboard data
- Long press expense: Quick edit modal

---

### Empty States

**No Expenses Yet:**
```
┌─────────────────────────────────────────┐
│                                         │
│        [Illustration or Icon]           │
│                                         │
│     No expenses yet                     │
│     Start by uploading an Excel file    │
│     or adding your first expense        │
│                                         │
│  [Upload Excel]  [Add Manually]         │
│                                         │
└─────────────────────────────────────────┘
```

**No Budget Set:**
```
Set a budget to start tracking your spending
[Set Budget]
```

---

### Accessibility

- **Keyboard Navigation:** Full support (Tab, Enter, Esc)
- **Focus Indicators:** 2px outline in primary color
- **Screen Reader:** Semantic HTML, ARIA labels where needed
- **Color Contrast:** WCAG AA compliant (4.5:1 minimum)
- **Touch Targets:** 44x44px minimum (mobile)

---

### Responsive Breakpoints

```css
/* Mobile first */
default: 0-640px (mobile)
sm: 640px+ (large phone, small tablet)
md: 768px+ (tablet)
lg: 1024px+ (laptop)
xl: 1280px+ (desktop)
```

**Layout Strategy:**
- Mobile: Single column, bottom nav
- Tablet: Two columns (dashboard cards), bottom nav or top nav
- Desktop: Sidebar + main content, multi-column grids

---

## Acceptance Criteria

### Pre-Launch Checklist

**Functionality:**
- [ ] User can log in with email/password
- [ ] User can upload Excel file and import expenses
- [ ] User can manually add/edit/delete expenses
- [ ] User can create/edit/delete categories
- [ ] User can set budgets per category
- [ ] User can toggle currency (KRW/IDR)
- [ ] Dashboard shows correct monthly summary
- [ ] Charts render correctly (pie, bar, line)
- [ ] Trends page shows 6-month history
- [ ] Income tracking works
- [ ] Data syncs between phone and laptop within 5 seconds

**Mobile Responsiveness:**
- [ ] App works on iPhone (iOS Safari 15+)
- [ ] App works on Android phone (Chrome 100+)
- [ ] Bottom navigation functions correctly
- [ ] Forms use native mobile keyboards
- [ ] No horizontal scrolling on any screen
- [ ] All tap targets are 44x44px minimum

**Performance:**
- [ ] App loads in < 2 seconds on 4G
- [ ] Excel import (500 rows) completes in < 10 seconds
- [ ] Charts render without lag
- [ ] Lighthouse Performance score > 90

**Data & Security:**
- [ ] User can only access their own expenses (RLS enforced)
- [ ] Logout clears session
- [ ] HTTPS enforced on all pages
- [ ] API keys not exposed in client code

**Offline Support:**
- [ ] App loads with cached data when offline
- [ ] User can view (read-only) expenses offline
- [ ] Changes made offline queue and sync when online

**User Experience:**
- [ ] Loading states show for all async operations
- [ ] Success messages appear after create/update/delete
- [ ] Error messages are clear and actionable
- [ ] Form validation prevents invalid data

---

## Out of Scope

The following features are **explicitly excluded** from the MVP and may be considered for Phase 2:

### ❌ Advanced Features
- **Receipt Photo Upload:** Attach images to expenses
- **Recurring Expenses:** Auto-add monthly bills (rent, subscriptions)
- **Bank Account Integration:** Connect to bank via Plaid API
- **Multi-Currency Conversion:** Auto-convert between KRW and IDR with exchange rates
- **Export to Excel:** Download filtered expense data
- **Shared Access:** Multiple family members with separate logins

### ❌ Advanced Analytics
- **Spending Predictions:** ML-based forecast of future expenses
- **Anomaly Detection:** Alert when unusual spending detected
- **Year-over-Year Comparison:** Compare spending across multiple years
- **Custom Reports:** User-defined reports with filters

### ❌ Notifications
- **Budget Alerts:** Push notifications when approaching budget limits
- **Payment Reminders:** Remind to log cash expenses
- **Weekly Summaries:** Email digest of spending

### ❌ Integrations
- **Calendar Integration:** Link expenses to calendar events
- **Accounting Software:** Export to QuickBooks, Xero
- **Tax Reporting:** Generate tax reports

---

## Assumptions & Dependencies

### Assumptions
1. **Client Deliverables:** Client will provide:
   - Sample Excel file with actual expense data (for testing import)
   - Preferred email address for login account
   - Server access (VPS credentials or home server setup)
   - Domain/subdomain (e.g., finance.yourdomain.com) OR use server IP

2. **Self-Hosting Setup:** 
   - Client has access to a server (VPS, home server, or NAS)
   - OR willing to rent a cheap VPS (~$5/month)
   - Comfortable with Docker (or we provide one-command setup script)
   - Server has minimum 1GB RAM, 10GB storage

3. **Technical Comfort Level:**
   - Client can SSH into server (or we do initial setup)
   - Client can run `docker-compose up -d` (or we provide full docs)
   - Client understands basic server concepts (ports, domains, SSL)

4. **Data Privacy:**
   - Client wants full control of data (self-hosted, not cloud)
   - Willing to handle own backups (we provide automated scripts)
   - Understands they're responsible for server security updates

5. **Excel Format:**
   - Excel files follow format: Date | Merchant Name | Amount | Category | Payment
   - Date format is consistent (YYYY-MM-DD preferred)
   - Amount is numeric (no currency symbols in Excel)

6. **Single User Model:**
   - One shared login for household/couple
   - No need for separate user accounts initially
   - Can add multi-user in Phase 2 if needed

### Dependencies

1. **Server Requirements:**
   - Linux-based OS (Ubuntu 22.04 LTS recommended)
   - Docker + Docker Compose installed (or we install during setup)
   - Public IP or dynamic DNS (if self-hosting at home)
   - Port 80/443 open for HTTP/HTTPS

2. **Domain/DNS (Optional but Recommended):**
   - Subdomain pointed to server IP
   - OR use Cloudflare Tunnel (no port forwarding needed)
   - OR access via IP address (http://server-ip:3000)

3. **SSL Certificate:**
   - Let's Encrypt (free, auto-renewed) if using domain
   - OR self-signed certificate if IP-only access
   - OR no SSL for local network access only

4. **Initial Setup Support:**
   - We provide setup script + full documentation
   - Optional: We do initial deployment via screen-share (1 hour)
   - Client maintains afterwards (with our docs)

### Deployment Options

**Option 1: Cloud VPS (Easiest)**
- **Providers:** Hetzner, DigitalOcean, Vultr, Contabo
- **Cost:** $3-6/month
- **Setup Time:** 30 minutes (automated script)
- **SSL:** Automatic via Certbot
- **Pros:** Always online, fast, public access
- **Cons:** Monthly cost (small)

**Option 2: Home Server (Free)**
- **Hardware:** Raspberry Pi, old laptop, NAS (Synology/QNAP)
- **Cost:** $0/month (just electricity)
- **Setup Time:** 1-2 hours (port forwarding + dynamic DNS)
- **SSL:** Cloudflare Tunnel (free) or Let's Encrypt
- **Pros:** Zero cost, full control
- **Cons:** Depends on home internet, slightly more complex

**Option 3: Shared Hosting with Docker Support**
- **If client has existing VPS/dedicated server**
- Deploy alongside other services
- Share PostgreSQL instance if already running
- Minimal additional resource usage

### Risks

**Low Risk (We Handle):**
✅ **Docker setup complexity** - We provide one-command script  
✅ **Database migrations** - Automated via Drizzle Kit  
✅ **SSL certificate renewal** - Automatic via Certbot cron  
✅ **Backup automation** - Cron job + rsync script provided

**Medium Risk (Client Needs to Understand):**
⚠️ **Server maintenance** - Client responsible for OS security updates  
- **Mitigation:** Provide monthly maintenance checklist, auto-update scripts

⚠️ **Backup responsibility** - Client must verify backups work  
- **Mitigation:** Weekly backup test script, restore docs

⚠️ **Downtime if server fails** - No automatic failover in MVP  
- **Mitigation:** Quick restore from backup (~15 mins), consider HA in Phase 2

**Near-Zero Risk:**
✅ No vendor lock-in (open source stack)  
✅ No external dependencies (no third-party APIs)  
✅ No data privacy concerns (all data on client's server)  
✅ Portable (Docker = deploy anywhere)

---

## Timeline & Milestones

### Week 1: Foundation & Backend Setup (18 hours)

**Day 1-2 (8 hours):**
- Project setup (monorepo structure: frontend + backend)
- **Backend:**
  - Node.js + Express + TypeScript setup
  - PostgreSQL + Drizzle ORM setup
  - Database schema design (Expenses, Categories, Income, UserSettings)
  - JWT authentication implementation
- **Frontend:**
  - Vite + React + TypeScript + Tailwind setup
  - shadcn/ui components installation
  - Auth context (login/logout state management)

**Day 3-4 (6 hours):**
- **Backend API Routes:**
  - POST /auth/login (JWT generation)
  - POST /auth/logout
  - GET /expenses (with filters)
  - POST /expenses (create)
  - PATCH /expenses/:id (update)
  - DELETE /expenses/:id
  - GET /categories
  - POST /categories
- **Frontend:**
  - Login screen UI (dark mode first)
  - Expense CRUD forms
  - API client setup (fetch wrapper with auth headers)

**Day 5 (4 hours):**
- Excel file upload UI (drag-and-drop)
- Excel parsing (SheetJS integration, client-side)
- POST /expenses/bulk (bulk import endpoint)
- Import validation and error handling

**Deliverable:** Working auth + CRUD + Excel import (backend API + frontend UI)

---

### Week 2: Dashboard, Charts & Docker (16 hours)

**Day 6-7 (8 hours):**
- Dashboard page layout (dark mode)
  - Total spending card
  - Budget progress cards
  - Top category card
- **Backend:**
  - GET /dashboard/summary (current month stats)
  - GET /dashboard/spending-by-category
  - GET /dashboard/top-merchants
- Charts integration (Recharts):
  - Pie chart (spending by category)
  - Budget progress bars

**Day 8-9 (6 hours):**
- Budget management page
  - Budget settings per category
  - PATCH /categories/:id (update budget)
- Income tracking
  - Income CRUD endpoints
  - GET /income/:month
  - POST /income (add/update monthly income)
- Currency toggle (KRW/IDR)
  - User settings table
  - PATCH /settings (update currency preference)

**Day 10 (2 hours):**
- **Docker Compose setup:**
  - Dockerfile for backend (Node.js)
  - Dockerfile for frontend (Nginx static serve)
  - PostgreSQL service
  - Nginx reverse proxy config
  - docker-compose.yml (all services)
- Environment variables setup (.env.example)

**Deliverable:** Full-featured app with Docker deployment ready

---

### Week 3: Trends, Mobile Polish & Deployment (14 hours)

**Day 11-12 (6 hours):**
- Trends page
  - Monthly spending trend (line chart, 6 months)
  - Category trends (multi-line chart)
  - GET /trends/monthly (expense aggregation by month)
  - GET /trends/by-category
- Income vs Expenses chart
  - GET /trends/income-vs-expenses

**Day 13 (4 hours):**
- Mobile responsiveness polish
  - Bottom navigation (mobile)
  - Sidebar navigation (desktop)
  - Touch-friendly forms
  - Card-based expense list (mobile)
  - Responsive charts
- Dark mode toggle (settings page)

**Day 14 (4 hours):**
- Deployment automation
  - Setup script (install-docker.sh)
  - Deployment script (deploy.sh)
  - SSL setup script (certbot-setup.sh)
  - Backup script (backup-db.sh with cron)
- Documentation:
  - README.md (setup instructions)
  - DEPLOYMENT.md (step-by-step VPS setup)
  - MAINTENANCE.md (backup, updates, troubleshooting)
- Final testing (mobile + desktop)

**Deliverable:** Production-ready Docker stack with full docs

---

### Post-Launch Support (1 week, on-demand)

**Activities:**
- Bug fixes (if any issues arise)
- Server setup assistance (if client needs help)
- Backup verification (test restore process)
- Performance monitoring
- Minor UX tweaks based on feedback

---

### Total Effort Summary

| Phase | Hours | Percentage |
|-------|-------|------------|
| Week 1: Foundation & Backend | 18h | 37.5% |
| Week 2: Dashboard & Docker | 16h | 33.3% |
| Week 3: Trends & Deployment | 14h | 29.2% |
| **TOTAL** | **48h** | **100%** |

**Calendar Timeline:** 3 weeks to launch + 1 week support

**Effective Rate:** $2,400 ÷ 48h = $50/hour
- Monthly summary calculations
  - Spending by category (pie chart)
  - Budget overview table
  - Top merchants list
- Chart integration (Recharts)

**Day 8-9 (6 hours):**
- Budget management page
  - Set budgets per category
  - Budget vs actual spending table
  - Progress bars with color-coded status
  - Monthly auto-reset logic

**Day 10 (4 hours):**
- Income tracking
  - Add/edit monthly income
  - Income vs expenses chart (dual-line)
- Currency toggle (KRW/IDR)
  - Settings page
  - Currency formatting

**Deliverable:** Dashboard with charts, budget tracking, income comparison

---

### Week 3: Trends, Mobile Polish & Launch (14 hours)

**Day 11-12 (6 hours):**
- Trends page
  - Monthly spending trend (line chart, 6 months)
  - Category trends (multi-line chart)
  - Toggle categories on/off
- Date range filters

**Day 13 (4 hours):**
- Mobile responsiveness
  - Bottom navigation
  - Card-based expense list on mobile
  - Touch-friendly forms
  - Responsive charts
- Cross-browser testing (iOS Safari, Android Chrome)

**Day 14 (4 hours):**
- Real-time sync verification
  - Test multi-device sync
  - Offline mode (cache last data)
  - Loading states and error handling
- Performance optimization
  - Code splitting
  - Lazy loading charts
  - Lighthouse audit

**Deliverable:** Fully functional app, mobile-optimized, deployed to Vercel

---

### Post-Launch Support (1 week, on-demand)

**Activities:**
- Bug fixes (if any issues arise from real usage)
- Minor UX tweaks based on client feedback
- Data migration assistance (if client has existing Excel data to import)
- User training (walkthrough of features)

---

### Total Effort Summary

| Phase | Hours | Percentage |
|-------|-------|------------|
| Week 1: Foundation & CRUD | 16h | 33% |
| Week 2: Dashboard & Budget | 18h | 38% |
| Week 3: Trends & Mobile | 14h | 29% |
| **TOTAL** | **48h** | **100%** |

**Calendar Timeline:** 3 weeks to launch + 1 week support

**Effective Rate:** $2,400 ÷ 48h = $50/hour

---

## Risk Assessment

### High-Impact Risks

| Risk | Probability | Impact | Mitigation Strategy |
|------|-------------|--------|---------------------|
| Excel format doesn't match expected columns | Medium | High | Provide sample template; document exact format; add column mapping UI in Phase 2 |
| Supabase free tier limits exceeded | Low | Medium | Monitor database size; archive old expenses; upgrade to paid plan if needed ($25/mo) |
| Offline sync conflicts | Low | Medium | Use "last write wins" strategy; warn user about offline editing risks |
| Mobile browser compatibility issues | Medium | Medium | Test early on iOS Safari and Android Chrome; use polyfills for older browsers |

### Medium-Impact Risks

| Risk | Probability | Impact | Mitigation Strategy |
|------|-------------|--------|---------------------|
| Client requests feature creep mid-project | High | Medium | Clearly define scope in FSD; defer additional features to Phase 2 with pricing |
| Chart rendering performance on old phones | Low | Medium | Use lazy loading; test on iPhone 8 (older device); simplify charts if needed |
| Real-time sync latency > 5 seconds | Low | Medium | Optimize Supabase queries; use pagination for large datasets |

### Low-Impact Risks

| Risk | Probability | Impact | Mitigation Strategy |
|------|-------------|--------|---------------------|
| User forgets password (no reset flow in MVP) | Medium | Low | Admin can reset password manually in Supabase dashboard |
| Duplicate expenses from re-uploading same Excel file | Medium | Low | Add duplicate detection (same date + merchant + amount); warn user |

---

## Phase 2 Roadmap (Future Enhancements)

Once the MVP is live and validated, these features can be added:

### Additional Features (Estimated Costs)

| Feature | Business Value | Investment | Timeline |
|---------|---------------|-----------|----------|
| **Multiple cashback rates per card** | Track different cards with different rates (e.g., 1.5% dining, 2% groceries) | $300 | 6 hours |
| **Cashback goal tracking** | Set annual cashback goal (e.g., "Earn ₩500,000 cashback this year") | $200 | 4 hours |
| **Receipt photo upload** | Attach images to expenses for record-keeping | $400 | 8 hours |
| **Recurring expenses** | Auto-add monthly bills (rent, subscriptions) | $300 | 6 hours |
| **Export to Excel** | Download filtered expense data with cashback columns | $200 | 4 hours |
| **Multi-user access** | Family members with separate logins + permissions | $800 | 16 hours |
| **Bank integration (Plaid)** | Auto-import transactions from bank | $1,200 | 24 hours |
| **Budget alerts (push notifications)** | Notify when approaching budget limits | $400 | 8 hours |
| **Year-over-year comparison** | Compare spending and cashback across multiple years | $300 | 6 hours |
| **Custom date ranges** | Flexible date filters (not just monthly) | $200 | 4 hours |
| **Cashback leaderboard** | Gamify: "Top cashback earners this month" (if multi-user) | $200 | 4 hours |

**Typical Phase 2 Investment:** $1,000-2,000 (based on selected features)  
**Recommended Timeline:** 3-6 months after launch

---

## Appendix

### A. Glossary

- **CRUD:** Create, Read, Update, Delete (basic database operations)
- **PWA:** Progressive Web App (web app that works like a native app)
- **KRW:** Korean Won (₩, South Korean currency)
- **IDR:** Indonesian Rupiah (Rp, Indonesian currency)
- **RLS:** Row-Level Security (Supabase feature for data access control)
- **JWT:** JSON Web Token (authentication token)

### B. Reference Links

**Technology Documentation:**
- React: https://react.dev/
- Tailwind CSS: https://tailwindcss.com/
- Supabase: https://supabase.com/docs
- Recharts: https://recharts.org/
- SheetJS: https://sheetjs.com/

**Design Inspiration:**
- Mint (personal finance app)
- YNAB (budgeting app)
- Spendee (expense tracker)

### C. Sample Excel Template

User's Excel file should follow this exact format:

```
Date          | Merchant Name | Amount | Category    | Payment
2026-01-05    | Starbucks     | 5000   | Food        | Credit Card
2026-01-06    | Coupang       | 45000  | Groceries   | Debit Card
2026-01-07    | Subway        | 12000  | Transport   | Cash
```

**Notes:**
- Date format: YYYY-MM-DD
- Amount: Integer (no decimals, no currency symbol)
- Category: Must match existing category name
- Payment: Cash | Credit Card | Debit Card | Bank Transfer

---

## Document Revision History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | Jan 10, 2026 | Barney | Initial FSD creation based on client requirements |

---

**Next Steps:**
1. Client reviews and approves FSD
2. Confirm Supabase usage and free tier limits
3. Provide sample Excel file for testing
4. Create initial user account credentials
5. Kickoff Week 1 Day 1

---

*This document is a living specification and may be updated as the project evolves. All changes require client approval and will be tracked in the revision history.*
