import { Router } from 'express';
import { z } from 'zod';
import { eq, and } from 'drizzle-orm';
import { format, startOfMonth } from 'date-fns';

import { db } from '../db/client.js';
import { income } from '../db/schema.js';
import { authMiddleware } from '../middleware/auth.js';

const router = Router();

// Use auth middleware for all routes
router.use(authMiddleware);

// Validation schemas
const createIncomeSchema = z.object({
    month: z.string().regex(/^\d{4}-\d{2}$/, 'Invalid month format (YYYY-MM)'),
    amount: z.number().int().min(0),
    source: z.string().max(255).optional(),
});

const updateIncomeSchema = z.object({
    amount: z.number().int().min(0).optional(),
    source: z.string().max(255).optional().nullable(),
});

/**
 * GET /api/income
 * List all income entries for user
 */
router.get('/', async (req, res) => {
    try {
        const { userId } = req.user!;

        const entries = await db.query.income.findMany({
            where: eq(income.userId, userId),
            orderBy: (income, { desc }) => [desc(income.month)],
        });

        return res.json({ income: entries });
    } catch (error) {
        console.error('Get income error:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
});

/**
 * POST /api/income
 * Create or update income for a month (upsert)
 */
router.post('/', async (req, res) => {
    try {
        const { userId } = req.user!;
        const data = createIncomeSchema.parse(req.body);

        // Convert month to first day of month
        const monthDate = format(
            startOfMonth(new Date(data.month + '-01')),
            'yyyy-MM-dd'
        );

        // Check if income exists for this month
        const existing = await db.query.income.findFirst({
            where: and(eq(income.userId, userId), eq(income.month, monthDate)),
        });

        if (existing) {
            // Update existing
            const [updated] = await db
                .update(income)
                .set({
                    amount: data.amount,
                    source: data.source ?? existing.source,
                    updatedAt: new Date(),
                })
                .where(and(eq(income.userId, userId), eq(income.month, monthDate)))
                .returning();

            return res.json(updated);
        }

        // Create new
        const [created] = await db
            .insert(income)
            .values({
                userId,
                month: monthDate,
                amount: data.amount,
                source: data.source,
            })
            .returning();

        return res.status(201).json(created);
    } catch (error) {
        if (error instanceof z.ZodError) {
            return res.status(400).json({
                error: 'Validation failed',
                details: error.errors,
            });
        }
        console.error('Create income error:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
});

/**
 * PATCH /api/income/:id
 * Update income entry
 */
router.patch('/:id', async (req, res) => {
    try {
        const { userId } = req.user!;
        const { id } = req.params;
        const data = updateIncomeSchema.parse(req.body);

        const [updated] = await db
            .update(income)
            .set({
                ...data,
                updatedAt: new Date(),
            })
            .where(and(eq(income.id, id), eq(income.userId, userId)))
            .returning();

        if (!updated) {
            return res.status(404).json({ error: 'Income entry not found' });
        }

        return res.json(updated);
    } catch (error) {
        if (error instanceof z.ZodError) {
            return res.status(400).json({
                error: 'Validation failed',
                details: error.errors,
            });
        }
        console.error('Update income error:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
});

/**
 * DELETE /api/income/:id
 * Delete income entry
 */
router.delete('/:id', async (req, res) => {
    try {
        const { userId } = req.user!;
        const { id } = req.params;

        const result = await db
            .delete(income)
            .where(and(eq(income.id, id), eq(income.userId, userId)))
            .returning({ id: income.id });

        if (result.length === 0) {
            return res.status(404).json({ error: 'Income entry not found' });
        }

        return res.status(204).send();
    } catch (error) {
        console.error('Delete income error:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
});

export default router;
