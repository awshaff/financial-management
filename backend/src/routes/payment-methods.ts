import { Router } from 'express';
import { z } from 'zod';
import { eq, and, asc, desc, sql } from 'drizzle-orm';

import { db } from '../db/client.js';
import { paymentMethods, expenses } from '../db/schema.js';
import { authMiddleware } from '../middleware/auth.js';

const router = Router();

// Use auth middleware for all routes
router.use(authMiddleware);

// Validation schemas
const createPaymentMethodSchema = z
    .object({
        name: z.string().min(1, 'Name is required').max(100),
        type: z.enum(['Cash', 'Credit Card', 'Debit Card', 'Bank Transfer']),
        cashbackPercentage: z
            .string()
            .regex(/^\d+(\.\d{1,2})?$/, 'Invalid percentage format')
            .optional(),
        isDefault: z.boolean().default(false),
    })
    .refine(
        (data) => {
            // Only Credit Cards can have cashback
            if (data.type === 'Credit Card') {
                return data.cashbackPercentage !== undefined;
            } else {
                return data.cashbackPercentage === undefined;
            }
        },
        { message: 'Only Credit Cards can have cashback percentage' }
    );

const updatePaymentMethodSchema = z
    .object({
        name: z.string().min(1).max(100).optional(),
        cashbackPercentage: z
            .string()
            .regex(/^\d+(\.\d{1,2})?$/)
            .optional(),
        isDefault: z.boolean().optional(),
    })
    .partial();

/**
 * GET /api/payment-methods
 * List all payment methods for authenticated user
 */
router.get('/', async (req, res) => {
    try {
        const { userId } = req.user!;

        const methods = await db.query.paymentMethods.findMany({
            where: eq(paymentMethods.userId, userId),
            orderBy: [desc(paymentMethods.isDefault), asc(paymentMethods.name)],
        });

        return res.json({ paymentMethods: methods });
    } catch (error) {
        console.error('Get payment methods error:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
});

/**
 * POST /api/payment-methods
 * Create a new payment method
 */
router.post('/', async (req, res) => {
    try {
        const { userId } = req.user!;
        const data = createPaymentMethodSchema.parse(req.body);

        // If setting as default, unset others
        if (data.isDefault) {
            await db
                .update(paymentMethods)
                .set({ isDefault: false, updatedAt: new Date() })
                .where(eq(paymentMethods.userId, userId));
        }

        const [method] = await db
            .insert(paymentMethods)
            .values({
                userId,
                name: data.name,
                type: data.type,
                cashbackPercentage:
                    data.type === 'Credit Card' ? data.cashbackPercentage : null,
                isDefault: data.isDefault,
            })
            .returning();

        return res.status(201).json(method);
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
                .json({ error: 'A payment method with this name already exists' });
        }
        console.error('Create payment method error:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
});

/**
 * PATCH /api/payment-methods/:id
 * Update an existing payment method
 */
router.patch('/:id', async (req, res) => {
    try {
        const { userId } = req.user!;
        const { id } = req.params;
        const data = updatePaymentMethodSchema.parse(req.body);

        // Check ownership
        const existing = await db.query.paymentMethods.findFirst({
            where: and(eq(paymentMethods.id, id), eq(paymentMethods.userId, userId)),
        });

        if (!existing) {
            return res.status(404).json({ error: 'Payment method not found' });
        }

        // If setting as default, unset others
        if (data.isDefault) {
            await db
                .update(paymentMethods)
                .set({ isDefault: false, updatedAt: new Date() })
                .where(eq(paymentMethods.userId, userId));
        }

        // Build update object
        const updateData: Record<string, any> = {
            updatedAt: new Date(),
        };

        if (data.name !== undefined) updateData.name = data.name;
        if (data.isDefault !== undefined) updateData.isDefault = data.isDefault;

        // Only update cashback if it's a credit card
        if (
            data.cashbackPercentage !== undefined &&
            existing.type === 'Credit Card'
        ) {
            updateData.cashbackPercentage = data.cashbackPercentage;
        }

        const [updated] = await db
            .update(paymentMethods)
            .set(updateData)
            .where(and(eq(paymentMethods.id, id), eq(paymentMethods.userId, userId)))
            .returning();

        return res.json(updated);
    } catch (error) {
        if (error instanceof z.ZodError) {
            return res.status(400).json({
                error: 'Validation failed',
                details: error.errors,
            });
        }
        console.error('Update payment method error:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
});

/**
 * DELETE /api/payment-methods/:id
 * Delete a payment method (blocked if expenses exist)
 */
router.delete('/:id', async (req, res) => {
    try {
        const { userId } = req.user!;
        const { id } = req.params;

        // Check ownership
        const existing = await db.query.paymentMethods.findFirst({
            where: and(eq(paymentMethods.id, id), eq(paymentMethods.userId, userId)),
        });

        if (!existing) {
            return res.status(404).json({ error: 'Payment method not found' });
        }

        // Check if expenses exist with this payment method
        const [expenseCount] = await db
            .select({ count: sql<number>`count(*)::int` })
            .from(expenses)
            .where(eq(expenses.paymentMethodId, id));

        if (expenseCount.count > 0) {
            return res.status(400).json({
                error: 'Cannot delete payment method with existing expenses',
                expenseCount: expenseCount.count,
            });
        }

        await db
            .delete(paymentMethods)
            .where(and(eq(paymentMethods.id, id), eq(paymentMethods.userId, userId)));

        return res.status(204).send();
    } catch (error) {
        console.error('Delete payment method error:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
});

export default router;
