import { Router } from 'express';
import { z } from 'zod';
import { eq, and, gte, lte, sql } from 'drizzle-orm';
import { startOfMonth, endOfMonth, format, subMonths } from 'date-fns';

import { db } from '../db/client.js';
import { expenses, categories, income } from '../db/schema.js';
import { authMiddleware } from '../middleware/auth.js';

const router = Router();

// Use auth middleware for all routes
router.use(authMiddleware);

// Validation schemas
const summaryQuerySchema = z.object({
    // Legacy month param (uses calendar month)
    month: z
        .string()
        .regex(/^\d{4}-\d{2}$/, 'Invalid month format (YYYY-MM)')
        .optional(),
    // Custom date range (overrides month if provided)
    startDate: z
        .string()
        .regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (YYYY-MM-DD)')
        .optional(),
    endDate: z
        .string()
        .regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (YYYY-MM-DD)')
        .optional(),
});

/**
 * GET /api/dashboard/summary
 * Optimized single-query dashboard summary
 * Supports:
 *   - ?month=2026-01 (calendar month: Jan 1 - Jan 31)
 *   - ?startDate=2025-12-27&endDate=2026-01-26 (custom billing cycle)
 */
router.get('/summary', async (req, res) => {
    try {
        const { userId } = req.user!;
        const query = summaryQuerySchema.parse(req.query);

        // Determine date range
        let startDate: string;
        let endDate: string;
        let label: string;

        if (query.startDate && query.endDate) {
            // Custom date range (for billing cycles like 27th to 26th)
            startDate = query.startDate;
            endDate = query.endDate;
            label = `${query.startDate} to ${query.endDate}`;
        } else {
            // Calendar month (legacy)
            const targetDate = query.month
                ? new Date(query.month + '-01')
                : new Date();
            startDate = format(startOfMonth(targetDate), 'yyyy-MM-dd');
            endDate = format(endOfMonth(targetDate), 'yyyy-MM-dd');
            label = format(targetDate, 'yyyy-MM');
        }

        // Get expenses aggregated by category
        const categoryBreakdown = await db
            .select({
                categoryId: categories.id,
                categoryName: categories.name,
                budget: categories.monthlyBudget,
                spent: sql<number>`coalesce(sum(${expenses.amountNet}), 0)::int`,
                cashback: sql<number>`coalesce(sum(${expenses.cashbackAmount}), 0)::int`,
                transactionCount: sql<number>`count(${expenses.id})::int`,
            })
            .from(categories)
            .leftJoin(
                expenses,
                and(
                    eq(expenses.categoryId, categories.id),
                    gte(expenses.date, startDate),
                    lte(expenses.date, endDate)
                )
            )
            .where(eq(categories.userId, userId))
            .groupBy(categories.id, categories.name, categories.monthlyBudget);

        // Calculate totals
        const totalSpent = categoryBreakdown.reduce((sum, c) => sum + c.spent, 0);
        const totalCashback = categoryBreakdown.reduce(
            (sum, c) => sum + c.cashback,
            0
        );
        const totalExpenses = categoryBreakdown.reduce(
            (sum, c) => sum + c.transactionCount,
            0
        );
        const totalBudget = categoryBreakdown.reduce(
            (sum, c) => sum + (c.budget || 0),
            0
        );

        // Calculate budget progress
        const budgetProgress =
            totalBudget > 0 ? Math.round((totalSpent / totalBudget) * 100 * 10) / 10 : 0;

        // Format category breakdown with percentages and status
        const formattedCategoryBreakdown = categoryBreakdown
            .filter((c) => c.spent > 0)
            .map((c) => ({
                category: c.categoryName,
                spent: c.spent,
                cashback: c.cashback,
                percentage:
                    totalSpent > 0
                        ? Math.round((c.spent / totalSpent) * 100 * 10) / 10
                        : 0,
            }))
            .sort((a, b) => b.spent - a.spent);

        // Budget status per category
        const budgetStatus = categoryBreakdown
            .filter((c) => c.budget && c.budget > 0)
            .map((c) => {
                const percentage = Math.round((c.spent / c.budget!) * 100);
                let status: 'on_track' | 'warning' | 'over_budget';
                if (percentage >= 100) {
                    status = 'over_budget';
                } else if (percentage >= 80) {
                    status = 'warning';
                } else {
                    status = 'on_track';
                }

                return {
                    categoryId: c.categoryId,
                    categoryName: c.categoryName,
                    budget: c.budget,
                    spent: c.spent,
                    remaining: c.budget! - c.spent,
                    percentage,
                    status,
                };
            })
            .sort((a, b) => b.percentage - a.percentage);

        // Top merchants
        const topMerchants = await db
            .select({
                merchant: expenses.merchant,
                totalSpent: sql<number>`sum(${expenses.amountNet})::int`,
                cashbackEarned: sql<number>`sum(${expenses.cashbackAmount})::int`,
                transactionCount: sql<number>`count(*)::int`,
            })
            .from(expenses)
            .where(
                and(
                    eq(expenses.userId, userId),
                    gte(expenses.date, startDate),
                    lte(expenses.date, endDate)
                )
            )
            .groupBy(expenses.merchant)
            .orderBy(sql`sum(${expenses.amountNet}) desc`)
            .limit(5);

        // Get income for this month (use startDate to determine month)
        const incomeMonthStart = format(startOfMonth(new Date(startDate)), 'yyyy-MM-dd');
        const [monthlyIncome] = await db
            .select({ amount: income.amount })
            .from(income)
            .where(
                and(
                    eq(income.userId, userId),
                    eq(income.month, incomeMonthStart)
                )
            )
            .limit(1);

        return res.json({
            period: label,
            startDate,
            endDate,
            totalSpent,
            totalCashback,
            totalExpenses,
            totalBudget,
            budgetProgress,
            income: monthlyIncome?.amount || 0,
            netSavings: (monthlyIncome?.amount || 0) - totalSpent,
            categoryBreakdown: formattedCategoryBreakdown,
            budgetStatus,
            topMerchants,
        });
    } catch (error) {
        if (error instanceof z.ZodError) {
            return res.status(400).json({
                error: 'Validation failed',
                details: error.errors,
            });
        }
        console.error('Dashboard summary error:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
});

/**
 * GET /api/dashboard/trends
 * Monthly trends for the last 6 months
 */
router.get('/trends', async (req, res) => {
    try {
        const { userId } = req.user!;

        const months = [];
        for (let i = 5; i >= 0; i--) {
            const monthDate = subMonths(new Date(), i);
            months.push({
                month: format(monthDate, 'yyyy-MM'),
                startDate: format(startOfMonth(monthDate), 'yyyy-MM-dd'),
                endDate: format(endOfMonth(monthDate), 'yyyy-MM-dd'),
            });
        }

        const trends = await Promise.all(
            months.map(async ({ month, startDate, endDate }) => {
                const [result] = await db
                    .select({
                        totalSpent: sql<number>`coalesce(sum(${expenses.amountNet}), 0)::int`,
                        totalCashback: sql<number>`coalesce(sum(${expenses.cashbackAmount}), 0)::int`,
                        transactionCount: sql<number>`count(*)::int`,
                    })
                    .from(expenses)
                    .where(
                        and(
                            eq(expenses.userId, userId),
                            gte(expenses.date, startDate),
                            lte(expenses.date, endDate)
                        )
                    );

                // Get income for this month
                const [monthlyIncome] = await db
                    .select({ amount: income.amount })
                    .from(income)
                    .where(
                        and(eq(income.userId, userId), eq(income.month, startDate))
                    )
                    .limit(1);

                return {
                    month,
                    totalSpent: result.totalSpent,
                    totalCashback: result.totalCashback,
                    transactionCount: result.transactionCount,
                    income: monthlyIncome?.amount || 0,
                };
            })
        );

        return res.json({ months: trends });
    } catch (error) {
        console.error('Dashboard trends error:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
});

export default router;
