# Deployment Guide

This guide explains how to deploy the Finance Tracker application using Docker and Docker Compose.

## Prerequisites

- [Docker](https://docs.docker.com/get-docker/) installed on your machine.
- [Docker Compose](https://docs.docker.com/compose/install/) installed.

## Quick Start (Self-Hosted)

1. **Clone the repository** (if you haven't already):
   ```bash
   git clone <repository-url>
   cd financial-management
   ```

2. **Configure Environment Variables** (Optional):

   You can create a `.env` file in the root directory to override default credentials.
   
   ```env
   # Database Configuration
   DB_NAME=finance_tracker
   DB_USER=my_user
   DB_PASSWORD=my_secure_password

   # Backend Configuration
   JWT_SECRET=complex_secret_key_here
   ```

   *If you do not create a `.env` file, default values will be used (not recommended for production).*

3. **Start the Application**:

   Run the following command to build and start all services:

   ```bash
   docker compose up -d --build
   ```

   This will start:
   - **Postgres Database**: Port 5432 (internal)
   - **Backend API**: Port 3000
   - **Frontend**: Port 80

4. **Access the Application**:
   Open your browser and navigate to `http://localhost`.

## Database Management

### Initial Setup
The application does not automatically push the schema on startup in the Docker container to avoid accidental data loss or conflicts. You need to run migrations manually the first time.

**Option A: Run from your local machine (Development)**
If you have Node.js installed locally:
```bash
cd backend
npm install
npm run db:push
npm run db:seed-demo # Optional: Adds demo data
```

**Option B: Run inside the container (Production)**
```bash
# Push the database schema
docker compose exec backend npm run db:push

# (Optional) Seed demo data
docker compose exec backend npm run db:seed-demo
```

> **Note:** The `backend` service must be running for Option B.

## Troubleshooting

- **Container Conflicts**: If you have port conflicts (e.g., port 80 or 3000 is already in use), modify the `ports` mapping in `docker-compose.yml`.
- **Database Connection**: Ensure the `postgres` container is healthy before the backend starts (Docker Compose handles this with `depends_on`).

## Stopping the Application

To stop the containers:
```bash
docker compose down
```

To stop and remove data volumes (WARNING: Deletes database data):
```bash
docker compose down -v
```
