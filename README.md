# Finance Tracker

A lightweight, mobile-responsive financial tracking web application designed to help users track expenses, manage budgets, and visualize spending patterns.

## Features

- **📊 Dashboard & Analytics**: Visual summary of monthly spending, budget progress, and category breakdowns.
- **💰 Expense Management**: Easy manual entry and bulk import capabilities for expenses.
- **💳 Cashback Calculation**: Automatic calculation of cashback for credit card payments (configurable rates).
- **📂 Excel Import**: Support for uploading and parsing Excel expense records.
- **🏷️ Budgeting**: Set and track monthly budgets per category with visual indicators.
- **📱 Mobile-First Design**: Optimized for seamless use on both mobile devices and desktops.
- **💱 Multi-Currency Support**: Native support for KRW and IDR.
- **🔒 Self-Hosted**: Privacy-focused, single-user authentication with full data ownership.

## Technology Stack

- **Frontend**: React, TypeScript, Vite, Tailwind CSS, shadcn/ui, Recharts
- **Backend**: Node.js, Express, Drizzle ORM, PostgreSQL
- **Infrastructure**: Docker, Docker Compose

## Getting Started

### Prerequisites

- Node.js (v18+)
- PostgreSQL
- Docker (optional, for containerized deployment)

### Local Development

1. **Backend Setup**
   ```bash
   cd backend
   npm install
   # Configure .env with your database credentials
   npm run generate # Generate Drizzle migrations
   npm run migrate  # Apply migrations
   npm run dev
   ```

2. **Frontend Setup**
   ```bash
   cd frontend
   npm install
   npm run dev
   ```

## License

Private / Proprietary
