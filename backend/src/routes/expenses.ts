import { Router } from 'express';
import { z } from 'zod';
import { eq, and, gte, lte, desc, sql } from 'drizzle-orm';
import { addMonths, format } from 'date-fns';
import crypto from 'crypto';

import { db } from '../db/client.js';
import { expenses, categories, paymentMethods } from '../db/schema.js';
import { authMiddleware } from '../middleware/auth.js';

const router = Router();

// Use auth middleware for all routes
router.use(authMiddleware);

// Validation schemas
const createExpenseSchema = z
    .object({
        date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (YYYY-MM-DD)'),
        merchant: z.string().min(1, 'Merchant is required').max(255),
        amount: z.number().int().min(0).max(100000000), // Max ₩100M
        categoryId: z.string().uuid('Invalid category ID'),
        paymentMethodId: z.string().uuid('Invalid payment method ID'),
        paymentMode: z.enum(['lump_sum', 'installment']).default('lump_sum'),
        // Required when paymentMode is 'installment', range 2-60
        installmentMonths: z.number().int().min(2).max(60).optional(),
    })
    .refine(
        (data) =>
            data.paymentMode === 'lump_sum' || data.installmentMonths !== undefined,
        {
            message: 'installmentMonths is required when paymentMode is "installment"',
            path: ['installmentMonths'],
        }
    );

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
    paymentMode: z.enum(['lump_sum', 'installment']).optional(),
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
        if (query.paymentMode) {
            conditions.push(eq(expenses.paymentMode, query.paymentMode));
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
 * Supports lump_sum (default) and installment payment modes.
 * For installments, creates N individual rows linked by installmentGroupId.
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

        // SERVER calculates cashback on the FULL amount (NEVER trust client)
        let totalCashback = 0;
        if (
            paymentMethod.type === 'Credit Card' &&
            paymentMethod.cashbackPercentage
        ) {
            totalCashback = Math.round(
                data.amount * (Number(paymentMethod.cashbackPercentage) / 100)
            );
        }

        const totalAmountNet = data.amount - totalCashback;

        // --- LUMP SUM ---
        if (data.paymentMode === 'lump_sum') {
            const [expense] = await db
                .insert(expenses)
                .values({
                    userId,
                    date: data.date,
                    merchant: data.merchant,
                    amount: data.amount,
                    cashbackAmount: totalCashback,
                    amountNet: totalAmountNet,
                    categoryId: data.categoryId,
                    paymentMethodId: data.paymentMethodId,
                    paymentMode: 'lump_sum',
                })
                .returning();

            return res.status(201).json(expense);
        }

        // --- INSTALLMENT ---
        const installmentMonths = data.installmentMonths!;
        const installmentGroupId = crypto.randomUUID();

        // Divide amount equally; last installment absorbs rounding remainder
        const perMonthAmount = Math.floor(data.amount / installmentMonths);
        const perMonthCashback = Math.floor(totalCashback / installmentMonths);
        const perMonthNet = Math.floor(totalAmountNet / installmentMonths);

        const rows: Array<{
            userId: string;
            date: string;
            merchant: string;
            amount: number;
            cashbackAmount: number;
            amountNet: number;
            categoryId: string;
            paymentMethodId: string;
            paymentMode: 'lump_sum' | 'installment';
            installmentGroupId: string;
            installmentMonths: number;
            installmentNumber: number;
        }> = [];

        const baseDate = new Date(data.date + 'T00:00:00');

        for (let i = 0; i < installmentMonths; i++) {
            const isLast = i === installmentMonths - 1;
            const installmentDate = format(addMonths(baseDate, i), 'yyyy-MM-dd');

            // Last installment absorbs any rounding remainder
            const amount = isLast
                ? data.amount - perMonthAmount * (installmentMonths - 1)
                : perMonthAmount;
            const cashback = isLast
                ? totalCashback - perMonthCashback * (installmentMonths - 1)
                : perMonthCashback;
            const net = isLast
                ? totalAmountNet - perMonthNet * (installmentMonths - 1)
                : perMonthNet;

            rows.push({
                userId,
                date: installmentDate,
                merchant: data.merchant,
                amount,
                cashbackAmount: cashback,
                amountNet: net,
                categoryId: data.categoryId,
                paymentMethodId: data.paymentMethodId,
                paymentMode: 'installment',
                installmentGroupId,
                installmentMonths,
                installmentNumber: i + 1,
            });
        }

        const inserted = await db.insert(expenses).values(rows).returning();

        return res.status(201).json({
            installmentGroupId,
            installmentMonths,
            totalAmount: data.amount,
            totalCashback,
            totalAmountNet,
            perMonthAmount,
            installments: inserted,
        });
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
 * Get single expense by ID.
 * If the expense is part of an installment group, also returns sibling installments.
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
        const expenseData: Record<string, any> = {
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
        };

        // If installment, include sibling installments for context
        if (r.expense.installmentGroupId) {
            const siblings = await db
                .select()
                .from(expenses)
                .where(
                    and(
                        eq(expenses.installmentGroupId, r.expense.installmentGroupId),
                        eq(expenses.userId, userId)
                    )
                )
                .orderBy(sql`${expenses.installmentNumber} ASC`);

            expenseData.installmentGroup = {
                groupId: r.expense.installmentGroupId,
                totalMonths: r.expense.installmentMonths,
                currentNumber: r.expense.installmentNumber,
                totalAmount: siblings.reduce((sum, s) => sum + s.amount, 0),
                installments: siblings.map((s) => ({
                    id: s.id,
                    date: s.date,
                    amount: s.amount,
                    amountNet: s.amountNet,
                    installmentNumber: s.installmentNumber,
                })),
            };
        }

        return res.json(expenseData);
    } catch (error) {
        console.error('Get expense error:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
});

/**
 * PATCH /api/expenses/:id
 * Update expense (recalculates cashback if payment method changes).
 * For installment expenses: updates all rows in the group.
 * Amount changes are blocked for installment expenses.
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

        // Block amount changes for installment expenses (too complex to recalculate)
        if (existing.paymentMode === 'installment' && data.amount !== undefined) {
            return res.status(400).json({
                error: 'Cannot change amount for installment expenses. Delete and recreate instead.',
            });
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

        // --- INSTALLMENT GROUP UPDATE ---
        // For installment expenses, propagate merchant/category/paymentMethod changes to all rows
        if (existing.paymentMode === 'installment' && existing.installmentGroupId) {
            const groupUpdateData: Record<string, any> = {
                updatedAt: new Date(),
            };

            if (data.merchant !== undefined) groupUpdateData.merchant = data.merchant;
            if (data.categoryId !== undefined) groupUpdateData.categoryId = data.categoryId;
            if (data.paymentMethodId !== undefined) {
                groupUpdateData.paymentMethodId = data.paymentMethodId;

                // Recalculate cashback for each row in the group
                const groupRows = await db
                    .select()
                    .from(expenses)
                    .where(
                        and(
                            eq(expenses.installmentGroupId, existing.installmentGroupId),
                            eq(expenses.userId, userId)
                        )
                    );

                for (const row of groupRows) {
                    let cashbackAmount = 0;
                    if (
                        paymentMethod.type === 'Credit Card' &&
                        paymentMethod.cashbackPercentage
                    ) {
                        cashbackAmount = Math.round(
                            row.amount * (Number(paymentMethod.cashbackPercentage) / 100)
                        );
                    }
                    await db
                        .update(expenses)
                        .set({
                            ...groupUpdateData,
                            cashbackAmount,
                            amountNet: row.amount - cashbackAmount,
                        })
                        .where(eq(expenses.id, row.id));
                }

                // Return the updated target row
                const [updated] = await db
                    .select()
                    .from(expenses)
                    .where(eq(expenses.id, id));

                return res.json(updated);
            }

            // Non-payment-method group update (no cashback recalc needed)
            await db
                .update(expenses)
                .set(groupUpdateData)
                .where(
                    and(
                        eq(expenses.installmentGroupId, existing.installmentGroupId),
                        eq(expenses.userId, userId)
                    )
                );

            const [updated] = await db
                .select()
                .from(expenses)
                .where(eq(expenses.id, id));

            return res.json(updated);
        }

        // --- LUMP SUM UPDATE (original logic) ---
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
 * Delete an expense.
 * For installment expenses: deletes ALL rows in the installment group.
 */
router.delete('/:id', async (req, res) => {
    try {
        const { userId } = req.user!;
        const { id } = req.params;

        // Check if this is an installment expense
        const existing = await db.query.expenses.findFirst({
            where: and(eq(expenses.id, id), eq(expenses.userId, userId)),
        });

        if (!existing) {
            return res.status(404).json({ error: 'Expense not found' });
        }

        // If installment, delete the entire group
        if (existing.paymentMode === 'installment' && existing.installmentGroupId) {
            const result = await db
                .delete(expenses)
                .where(
                    and(
                        eq(expenses.installmentGroupId, existing.installmentGroupId),
                        eq(expenses.userId, userId)
                    )
                )
                .returning({ id: expenses.id });

            return res.json({
                deleted: result.length,
                installmentGroupId: existing.installmentGroupId,
            });
        }

        // Lump sum: delete single row
        await db
            .delete(expenses)
            .where(and(eq(expenses.id, id), eq(expenses.userId, userId)));

        return res.status(204).send();
    } catch (error) {
        console.error('Delete expense error:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
});

/**
 * POST /api/expenses/bulk-delete
 * Delete multiple expenses at once.
 * For installment expenses: automatically expands to delete entire groups.
 */
const bulkDeleteSchema = z.object({
    ids: z.array(z.string().uuid()).min(1).max(100),
});

router.post('/bulk-delete', async (req, res) => {
    try {
        const { userId } = req.user!;
        const { ids } = bulkDeleteSchema.parse(req.body);

        let deletedCount = 0;

        // Collect installment group IDs that need full-group deletion
        const processedGroupIds = new Set<string>();

        for (const id of ids) {
            const existing = await db.query.expenses.findFirst({
                where: and(eq(expenses.id, id), eq(expenses.userId, userId)),
            });

            if (!existing) continue;

            // If installment and group not yet processed, delete entire group
            if (
                existing.paymentMode === 'installment' &&
                existing.installmentGroupId &&
                !processedGroupIds.has(existing.installmentGroupId)
            ) {
                processedGroupIds.add(existing.installmentGroupId);
                const result = await db
                    .delete(expenses)
                    .where(
                        and(
                            eq(expenses.installmentGroupId, existing.installmentGroupId),
                            eq(expenses.userId, userId)
                        )
                    )
                    .returning({ id: expenses.id });
                deletedCount += result.length;
            } else if (existing.paymentMode === 'lump_sum') {
                const result = await db
                    .delete(expenses)
                    .where(and(eq(expenses.id, id), eq(expenses.userId, userId)))
                    .returning({ id: expenses.id });
                if (result.length > 0) deletedCount++;
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
