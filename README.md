# Finance Tracker

A lightweight, mobile-responsive financial tracking web application designed to help users track expenses, manage budgets, and visualize spending patterns.

## ⚡ Quick Start (Demo)

```bash
# 1. Start PostgreSQL
cd backend
docker-compose up -d

# 2. Setup backend
npm install
cp .env.example .env  # Edit with your credentials
npm run db:push       # Push schema to database
npm run db:seed-demo  # Seed demo data

# 3. Start backend
npm run dev

# 4. In another terminal - setup frontend
cd frontend
npm install
npm run dev
```

### 🔐 Demo Login Credentials

| Field    | Value             |
|----------|-------------------|
| Email    | `demo@example.com` |
| Password | `Demo123!`         |

The demo data includes:
- **8 categories** with monthly budgets
- **4 payment methods** (Cash, Debit, Credit Card with 1.5% cashback, Premium Card with 3%)
- **~150 sample expenses** over the past 3 months
- **3 monthly income records** (₩3,500,000/month)

---

## Features

- **📊 Dashboard & Analytics**: Visual summary of monthly spending, budget progress, and category breakdowns
- **💰 Expense Management**: Easy manual entry and bulk import capabilities
- **💳 Cashback Calculation**: Automatic calculation of cashback for credit card payments
- **📂 Excel Import**: Bulk import expenses from Excel files (auto-creates categories)
- **🏷️ Budgeting**: Set and track monthly budgets per category with visual indicators
- **⚙️ Custom Billing Cycle**: Configure your credit card billing cycle (e.g., 27th to 26th)
- **📱 Mobile-First Design**: Optimized for both mobile devices and desktops
- **💱 Currency**: Native support for KRW (stored as integers)
- **🔒 Self-Hosted**: Privacy-focused with full data ownership

## Technology Stack

| Layer | Technologies |
|-------|-------------|
| Frontend | React, TypeScript, Vite, Tailwind CSS, shadcn/ui, Recharts, TanStack Query |
| Backend | Node.js, Express, Drizzle ORM, PostgreSQL |
| Auth | JWT (30-day), bcrypt (12 rounds) |
| Infrastructure | Docker, Docker Compose |

## Getting Started

### Prerequisites

- Node.js (v18+)
- PostgreSQL 15+ (or Docker)

### Local Development

1. **Backend Setup**
   ```bash
   cd backend
   npm install
   cp .env.example .env  # Configure database credentials
   npm run db:push       # Push schema to database
   npm run dev           # Start dev server on port 3000
   ```

2. **Frontend Setup**
   ```bash
   cd frontend
   npm install
   npm run dev           # Start dev server on port 5173
   ```

### Environment Variables

Create `backend/.env` with:
```env
DB_USER=finance_user
DB_PASSWORD=your_password
DB_NAME=finance_tracker
DB_HOST=localhost
DB_PORT=5432
DATABASE_URL=postgresql://${DB_USER}:${DB_PASSWORD}@${DB_HOST}:${DB_PORT}/${DB_NAME}

JWT_SECRET=your-secret-key-here
PORT=3000
CORS_ORIGINS=http://localhost:5173
```

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Register new user |
| POST | `/api/auth/login` | Login, returns JWT |
| GET/POST/PATCH/DELETE | `/api/expenses` | Expense CRUD |
| POST | `/api/expenses/bulk-delete` | Bulk delete expenses |
| GET/POST/PATCH/DELETE | `/api/categories` | Category CRUD |
| GET/POST/PATCH/DELETE | `/api/payment-methods` | Payment method CRUD |
| GET | `/api/dashboard/summary` | Monthly summary (supports custom date range) |
| GET | `/api/dashboard/trends` | 6-month spending trends |
| POST | `/api/import/excel` | Bulk import from Excel |
| GET/POST/PATCH/DELETE | `/api/income` | Income CRUD |
| GET/PATCH | `/api/settings` | User settings (billing cycle) |

## License

Private / Proprietary
