import { Router } from 'express';
import { z } from 'zod';
import { eq, and, gte, lte, desc, sql } from 'drizzle-orm';

import { db } from '../db/client.js';
import { expenses, categories, paymentMethods } from '../db/schema.js';
import { authMiddleware } from '../middleware/auth.js';

const router = Router();

// Use auth middleware for all routes
router.use(authMiddleware);

// Validation schemas
const createExpenseSchema = z.object({
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (YYYY-MM-DD)'),
    merchant: z.string().min(1, 'Merchant is required').max(255),
    amount: z.number().int().min(0).max(100000000), // Max ₩100M
    categoryId: z.string().uuid('Invalid category ID'),
    paymentMethodId: z.string().uuid('Invalid payment method ID'),
});

const updateExpenseSchema = z.object({
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    merchant: z.string().min(1).max(255).optional(),
    amount: z.number().int().min(0).max(100000000).optional(),
    categoryId: z.string().uuid().optional(),
    paymentMethodId: z.string().uuid().optional(),
});

const querySchema = z.object({
    categoryId: z.string().uuid().optional(),
    paymentMethodId: z.string().uuid().optional(),
    startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    sortBy: z.enum(['date', 'merchant', 'category', 'payment', 'amount']).default('date'),
    sortOrder: z.enum(['asc', 'desc']).default('desc'),
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(50),
});

/**
 * GET /api/expenses
 * List expenses with pagination and filtering (optimized with JOINs - no N+1)
 */
router.get('/', async (req, res) => {
    try {
        const { userId } = req.user!;
        const query = querySchema.parse(req.query);

        // Build WHERE conditions
        const conditions = [eq(expenses.userId, userId)];

        if (query.categoryId) {
            conditions.push(eq(expenses.categoryId, query.categoryId));
        }
        if (query.paymentMethodId) {
            conditions.push(eq(expenses.paymentMethodId, query.paymentMethodId));
        }
        if (query.startDate) {
            conditions.push(gte(expenses.date, query.startDate));
        }
        if (query.endDate) {
            conditions.push(lte(expenses.date, query.endDate));
        }

        const whereClause = and(...conditions);

        // Build ORDER BY clause
        let orderByClause;
        switch (query.sortBy) {
            case 'merchant':
                orderByClause = query.sortOrder === 'asc'
                    ? [sql`${expenses.merchant} ASC`, desc(expenses.createdAt)]
                    : [sql`${expenses.merchant} DESC`, desc(expenses.createdAt)];
                break;
            case 'category':
                orderByClause = query.sortOrder === 'asc'
                    ? [sql`${categories.name} ASC NULLS LAST`, desc(expenses.createdAt)]
                    : [sql`${categories.name} DESC NULLS LAST`, desc(expenses.createdAt)];
                break;
            case 'payment':
                orderByClause = query.sortOrder === 'asc'
                    ? [sql`${paymentMethods.name} ASC NULLS LAST`, desc(expenses.createdAt)]
                    : [sql`${paymentMethods.name} DESC NULLS LAST`, desc(expenses.createdAt)];
                break;
            case 'amount':
                orderByClause = query.sortOrder === 'asc'
                    ? [sql`${expenses.amount} ASC`, desc(expenses.createdAt)]
                    : [sql`${expenses.amount} DESC`, desc(expenses.createdAt)];
                break;
            case 'date':
            default:
                orderByClause = query.sortOrder === 'asc'
                    ? [sql`${expenses.date} ASC`, desc(expenses.createdAt)]
                    : [desc(expenses.date), desc(expenses.createdAt)];
                break;
        }

        // Query with JOINs (NO N+1!)
        const offset = (query.page - 1) * query.limit;

        const results = await db
            .select({
                expense: expenses,
                category: categories,
                paymentMethod: paymentMethods,
            })
            .from(expenses)
            .leftJoin(categories, eq(expenses.categoryId, categories.id))
            .leftJoin(paymentMethods, eq(expenses.paymentMethodId, paymentMethods.id))
            .where(whereClause)
            .orderBy(...orderByClause)
            .limit(query.limit)
            .offset(offset);

        // Get total count for pagination
        const [countResult] = await db
            .select({ count: sql<number>`count(*)::int` })
            .from(expenses)
            .where(whereClause);

        const formattedExpenses = results.map((r) => ({
            ...r.expense,
            category: r.category
                ? {
                    id: r.category.id,
                    name: r.category.name,
                }
                : null,
            paymentMethod: r.paymentMethod
                ? {
                    id: r.paymentMethod.id,
                    name: r.paymentMethod.name,
                    type: r.paymentMethod.type,
                    cashbackPercentage: r.paymentMethod.cashbackPercentage,
                }
                : null,
        }));

        return res.json({
            expenses: formattedExpenses,
            pagination: {
                page: query.page,
                limit: query.limit,
                total: countResult.count,
                totalPages: Math.ceil(countResult.count / query.limit),
            },
        });
    } catch (error) {
        if (error instanceof z.ZodError) {
            return res.status(400).json({
                error: 'Validation failed',
                details: error.errors,
            });
        }
        console.error('Get expenses error:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
});

/**
 * POST /api/expenses
 * Create expense with SERVER-CALCULATED cashback (never trust client)
 */
router.post('/', async (req, res) => {
    try {
        const { userId } = req.user!;
        const data = createExpenseSchema.parse(req.body);

        // Verify category belongs to user
        const category = await db.query.categories.findFirst({
            where: and(
                eq(categories.id, data.categoryId),
                eq(categories.userId, userId)
            ),
        });

        if (!category) {
            return res.status(400).json({ error: 'Invalid category' });
        }

        // Fetch payment method to get cashback rate
        const paymentMethod = await db.query.paymentMethods.findFirst({
            where: and(
                eq(paymentMethods.id, data.paymentMethodId),
                eq(paymentMethods.userId, userId)
            ),
        });

        if (!paymentMethod) {
            return res.status(400).json({ error: 'Invalid payment method' });
        }

        // SERVER calculates cashback (NEVER trust client)
        let cashbackAmount = 0;
        if (
            paymentMethod.type === 'Credit Card' &&
            paymentMethod.cashbackPercentage
        ) {
            cashbackAmount = Math.round(
                data.amount * (Number(paymentMethod.cashbackPercentage) / 100)
            );
        }

        const amountNet = data.amount - cashbackAmount;

        // Insert with database-enforced constraint validation
        const [expense] = await db
            .insert(expenses)
            .values({
                userId,
                date: data.date,
                merchant: data.merchant,
                amount: data.amount,
                cashbackAmount,
                amountNet,
                categoryId: data.categoryId,
                paymentMethodId: data.paymentMethodId,
            })
            .returning();

        return res.status(201).json(expense);
    } catch (error) {
        if (error instanceof z.ZodError) {
            return res.status(400).json({
                error: 'Validation failed',
                details: error.errors,
            });
        }
        console.error('Create expense error:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
});

/**
 * GET /api/expenses/:id
 * Get single expense by ID
 */
router.get('/:id', async (req, res) => {
    try {
        const { userId } = req.user!;
        const { id } = req.params;

        const result = await db
            .select({
                expense: expenses,
                category: categories,
                paymentMethod: paymentMethods,
            })
            .from(expenses)
            .leftJoin(categories, eq(expenses.categoryId, categories.id))
            .leftJoin(paymentMethods, eq(expenses.paymentMethodId, paymentMethods.id))
            .where(and(eq(expenses.id, id), eq(expenses.userId, userId)))
            .limit(1);

        if (result.length === 0) {
            return res.status(404).json({ error: 'Expense not found' });
        }

        const r = result[0];
        return res.json({
            ...r.expense,
            category: r.category
                ? { id: r.category.id, name: r.category.name }
                : null,
            paymentMethod: r.paymentMethod
                ? {
                    id: r.paymentMethod.id,
                    name: r.paymentMethod.name,
                    type: r.paymentMethod.type,
                    cashbackPercentage: r.paymentMethod.cashbackPercentage,
                }
                : null,
        });
    } catch (error) {
        console.error('Get expense error:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
});

/**
 * PATCH /api/expenses/:id
 * Update expense (recalculates cashback if payment method changes)
 */
router.patch('/:id', async (req, res) => {
    try {
        const { userId } = req.user!;
        const { id } = req.params;
        const data = updateExpenseSchema.parse(req.body);

        // Check ownership
        const existing = await db.query.expenses.findFirst({
            where: and(eq(expenses.id, id), eq(expenses.userId, userId)),
        });

        if (!existing) {
            return res.status(404).json({ error: 'Expense not found' });
        }

        // Determine final values
        const finalAmount = data.amount ?? existing.amount;
        const finalPaymentMethodId =
            data.paymentMethodId ?? existing.paymentMethodId;

        // Validate category if changed
        if (data.categoryId) {
            const category = await db.query.categories.findFirst({
                where: and(
                    eq(categories.id, data.categoryId),
                    eq(categories.userId, userId)
                ),
            });
            if (!category) {
                return res.status(400).json({ error: 'Invalid category' });
            }
        }

        // Fetch payment method for cashback calculation
        const paymentMethod = await db.query.paymentMethods.findFirst({
            where: and(
                eq(paymentMethods.id, finalPaymentMethodId),
                eq(paymentMethods.userId, userId)
            ),
        });

        if (!paymentMethod) {
            return res.status(400).json({ error: 'Invalid payment method' });
        }

        // Recalculate cashback
        let cashbackAmount = 0;
        if (
            paymentMethod.type === 'Credit Card' &&
            paymentMethod.cashbackPercentage
        ) {
            cashbackAmount = Math.round(
                finalAmount * (Number(paymentMethod.cashbackPercentage) / 100)
            );
        }

        const amountNet = finalAmount - cashbackAmount;

        // Build update object
        const updateData: Record<string, any> = {
            amount: finalAmount,
            cashbackAmount,
            amountNet,
            updatedAt: new Date(),
        };

        if (data.date !== undefined) updateData.date = data.date;
        if (data.merchant !== undefined) updateData.merchant = data.merchant;
        if (data.categoryId !== undefined) updateData.categoryId = data.categoryId;
        if (data.paymentMethodId !== undefined)
            updateData.paymentMethodId = data.paymentMethodId;

        const [updated] = await db
            .update(expenses)
            .set(updateData)
            .where(and(eq(expenses.id, id), eq(expenses.userId, userId)))
            .returning();

        return res.json(updated);
    } catch (error) {
        if (error instanceof z.ZodError) {
            return res.status(400).json({
                error: 'Validation failed',
                details: error.errors,
            });
        }
        console.error('Update expense error:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
});

/**
 * DELETE /api/expenses/:id
 * Delete an expense
 */
router.delete('/:id', async (req, res) => {
    try {
        const { userId } = req.user!;
        const { id } = req.params;

        const result = await db
            .delete(expenses)
            .where(and(eq(expenses.id, id), eq(expenses.userId, userId)))
            .returning({ id: expenses.id });

        if (result.length === 0) {
            return res.status(404).json({ error: 'Expense not found' });
        }

        return res.status(204).send();
    } catch (error) {
        console.error('Delete expense error:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
});

/**
 * POST /api/expenses/bulk-delete
 * Delete multiple expenses at once
 */
const bulkDeleteSchema = z.object({
    ids: z.array(z.string().uuid()).min(1).max(100),
});

router.post('/bulk-delete', async (req, res) => {
    try {
        const { userId } = req.user!;
        const { ids } = bulkDeleteSchema.parse(req.body);

        // Delete expenses one by one to ensure proper ownership check
        // This is safe for up to 100 items (as limited by schema)
        let deletedCount = 0;
        for (const id of ids) {
            const result = await db
                .delete(expenses)
                .where(and(eq(expenses.id, id), eq(expenses.userId, userId)))
                .returning({ id: expenses.id });
            if (result.length > 0) {
                deletedCount++;
            }
        }

        return res.json({ deleted: deletedCount });
    } catch (error) {
        if (error instanceof z.ZodError) {
            return res.status(400).json({
                error: 'Validation failed',
                details: error.errors,
            });
        }
        console.error('Bulk delete expenses error:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
});

export default router;
