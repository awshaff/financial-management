import { Router } from 'express';
import { z } from 'zod';
import { eq, and, asc, sql } from 'drizzle-orm';

import { db } from '../db/client.js';
import { categories, expenses } from '../db/schema.js';
import { authMiddleware } from '../middleware/auth.js';

const router = Router();

// Use auth middleware for all routes
router.use(authMiddleware);

// Validation schemas
const createCategorySchema = z.object({
    name: z.string().min(1, 'Name is required').max(100),
    monthlyBudget: z.number().int().min(0).optional().nullable(),
});

const updateCategorySchema = z.object({
    name: z.string().min(1).max(100).optional(),
    monthlyBudget: z.number().int().min(0).optional().nullable(),
});

/**
 * GET /api/categories
 * List all categories with expense counts for authenticated user
 */
router.get('/', async (req, res) => {
    try {
        const { userId } = req.user!;

        // Get categories with expense counts in a single query
        const result = await db
            .select({
                id: categories.id,
                name: categories.name,
                monthlyBudget: categories.monthlyBudget,
                isDefault: categories.isDefault,
                createdAt: categories.createdAt,
                updatedAt: categories.updatedAt,
                expenseCount: sql<number>`count(${expenses.id})::int`,
            })
            .from(categories)
            .leftJoin(expenses, eq(categories.id, expenses.categoryId))
            .where(eq(categories.userId, userId))
            .groupBy(categories.id)
            .orderBy(asc(categories.name));

        return res.json({ categories: result });
    } catch (error) {
        console.error('Get categories error:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
});

/**
 * POST /api/categories
 * Create a new category
 */
router.post('/', async (req, res) => {
    try {
        const { userId } = req.user!;
        const data = createCategorySchema.parse(req.body);

        const [category] = await db
            .insert(categories)
            .values({
                userId,
                name: data.name,
                monthlyBudget: data.monthlyBudget ?? null,
                isDefault: false,
            })
            .returning();

        return res.status(201).json(category);
    } catch (error) {
        if (error instanceof z.ZodError) {
            return res.status(400).json({
                error: 'Validation failed',
                details: error.errors,
            });
        }
        // Handle unique constraint violation
        if ((error as any)?.code === '23505') {
            return res
                .status(400)
                .json({ error: 'A category with this name already exists' });
        }
        console.error('Create category error:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
});

/**
 * PATCH /api/categories/:id
 * Update an existing category
 */
router.patch('/:id', async (req, res) => {
    try {
        const { userId } = req.user!;
        const { id } = req.params;
        const data = updateCategorySchema.parse(req.body);

        // Check ownership
        const existing = await db.query.categories.findFirst({
            where: and(eq(categories.id, id), eq(categories.userId, userId)),
        });

        if (!existing) {
            return res.status(404).json({ error: 'Category not found' });
        }

        // Build update object
        const updateData: Record<string, any> = {
            updatedAt: new Date(),
        };

        if (data.name !== undefined) updateData.name = data.name;
        if (data.monthlyBudget !== undefined)
            updateData.monthlyBudget = data.monthlyBudget;

        const [updated] = await db
            .update(categories)
            .set(updateData)
            .where(and(eq(categories.id, id), eq(categories.userId, userId)))
            .returning();

        return res.json(updated);
    } catch (error) {
        if (error instanceof z.ZodError) {
            return res.status(400).json({
                error: 'Validation failed',
                details: error.errors,
            });
        }
        console.error('Update category error:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
});

/**
 * DELETE /api/categories/:id
 * Delete a category (warns if expenses exist, requires reassignment)
 */
router.delete('/:id', async (req, res) => {
    try {
        const { userId } = req.user!;
        const { id } = req.params;
        const { reassignTo } = req.query;

        // Check ownership
        const existing = await db.query.categories.findFirst({
            where: and(eq(categories.id, id), eq(categories.userId, userId)),
        });

        if (!existing) {
            return res.status(404).json({ error: 'Category not found' });
        }

        // Check if expenses exist with this category
        const [expenseCount] = await db
            .select({ count: sql<number>`count(*)::int` })
            .from(expenses)
            .where(eq(expenses.categoryId, id));

        if (expenseCount.count > 0) {
            // If no reassignment category provided, return error
            if (!reassignTo || typeof reassignTo !== 'string') {
                return res.status(400).json({
                    error:
                        'Cannot delete category with existing expenses. Please provide reassignTo query param.',
                    expenseCount: expenseCount.count,
                });
            }

            // Verify reassignment category exists and belongs to user
            const reassignCategory = await db.query.categories.findFirst({
                where: and(
                    eq(categories.id, reassignTo),
                    eq(categories.userId, userId)
                ),
            });

            if (!reassignCategory) {
                return res
                    .status(400)
                    .json({ error: 'Reassignment category not found' });
            }

            // Reassign expenses
            await db
                .update(expenses)
                .set({ categoryId: reassignTo, updatedAt: new Date() })
                .where(eq(expenses.categoryId, id));
        }

        // Delete the category
        await db
            .delete(categories)
            .where(and(eq(categories.id, id), eq(categories.userId, userId)));

        return res.status(204).send();
    } catch (error) {
        console.error('Delete category error:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
});

export default router;
