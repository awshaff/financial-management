import dotenv from 'dotenv';
import { expand } from 'dotenv-expand';

expand(dotenv.config());
import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';

// Route imports
import authRoutes from './routes/auth.js';
import expensesRoutes from './routes/expenses.js';
import categoriesRoutes from './routes/categories.js';
import paymentMethodsRoutes from './routes/payment-methods.js';
import dashboardRoutes from './routes/dashboard.js';
import importRoutes from './routes/import.js';
import incomeRoutes from './routes/income.js';
import settingsRoutes from './routes/settings.js';

// Create Express app
const app = express();

// ============================================
// Security Middleware
// ============================================

// Helmet - Security headers
app.use(helmet());

// CORS configuration
const corsOrigins = process.env.CORS_ORIGINS?.split(',') || ['http://localhost:5173'];
app.use(
    cors({
        origin: corsOrigins,
        credentials: true,
    })
);

// Rate limiting - Global (100 requests per minute)
const globalLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 100,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many requests, please try again later' },
});
app.use(globalLimiter);

// Rate limiting - Auth routes (5 requests per minute)
const authLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 5,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many auth attempts, please try again later' },
});

// ============================================
// Body Parsing
// ============================================

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// ============================================
// Health Check
// ============================================

app.get('/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ============================================
// API Routes
// ============================================

// Apply stricter rate limit to auth routes
app.use('/api/auth', authLimiter, authRoutes);

// Protected routes
app.use('/api/expenses', expensesRoutes);
app.use('/api/categories', categoriesRoutes);
app.use('/api/payment-methods', paymentMethodsRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/import', importRoutes);
app.use('/api/income', incomeRoutes);
app.use('/api/settings', settingsRoutes);

// ============================================
// 404 Handler
// ============================================

app.use((_req, res) => {
    res.status(404).json({ error: 'Not found' });
});

// ============================================
// Global Error Handler
// ============================================

app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
    console.error('Unhandled error:', err);

    // Don't expose internal errors in production
    const isProduction = process.env.NODE_ENV === 'production';

    res.status(500).json({
        error: isProduction ? 'Internal server error' : err.message,
        ...(isProduction ? {} : { stack: err.stack }),
    });
});

// ============================================
// Start Server
// ============================================

const PORT = parseInt(process.env.PORT || '3000', 10);

app.listen(PORT, () => {
    console.log(`
╔════════════════════════════════════════════════════╗
║              Finance Tracker API                   ║
╠════════════════════════════════════════════════════╣
║  Status:    Running                                 ║
║  Port:      ${PORT.toString().padEnd(41)}║
║  Env:       ${(process.env.NODE_ENV || 'development').padEnd(41)}║
╚════════════════════════════════════════════════════╝
  `);
});

export default app;
