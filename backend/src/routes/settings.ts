import { Router } from 'express';
import { z } from 'zod';
import { eq } from 'drizzle-orm';

import { db } from '../db/client.js';
import { userSettings } from '../db/schema.js';
import { authMiddleware } from '../middleware/auth.js';

const router = Router();

// Use auth middleware for all routes
router.use(authMiddleware);

// Validation schema for updating settings
const updateSettingsSchema = z.object({
    billingCycleStartDay: z.number().min(1).max(31).optional(),
    billingCycleEndDay: z.number().min(0).max(31).optional(), // 0 = end of month
});

/**
 * GET /api/settings
 * Get user settings (creates default if not exists)
 */
router.get('/', async (req, res) => {
    try {
        const { userId } = req.user!;

        // Try to find existing settings
        let [settings] = await db
            .select()
            .from(userSettings)
            .where(eq(userSettings.userId, userId))
            .limit(1);

        // If no settings exist, create default
        if (!settings) {
            [settings] = await db
                .insert(userSettings)
                .values({
                    userId,
                    billingCycleStartDay: 1,
                    billingCycleEndDay: 0, // 0 = end of month
                })
                .returning();
        }

        return res.json({
            billingCycleStartDay: settings.billingCycleStartDay,
            billingCycleEndDay: settings.billingCycleEndDay,
        });
    } catch (error) {
        console.error('Get settings error:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
});

/**
 * PATCH /api/settings
 * Update user settings
 */
router.patch('/', async (req, res) => {
    try {
        const { userId } = req.user!;
        const updates = updateSettingsSchema.parse(req.body);

        // Check if settings exist
        const [existing] = await db
            .select()
            .from(userSettings)
            .where(eq(userSettings.userId, userId))
            .limit(1);

        let settings;
        if (existing) {
            // Update existing settings
            [settings] = await db
                .update(userSettings)
                .set({
                    ...updates,
                    updatedAt: new Date(),
                })
                .where(eq(userSettings.userId, userId))
                .returning();
        } else {
            // Create new settings with provided values
            [settings] = await db
                .insert(userSettings)
                .values({
                    userId,
                    billingCycleStartDay: updates.billingCycleStartDay ?? 1,
                    billingCycleEndDay: updates.billingCycleEndDay ?? 0, // 0 = end of month
                })
                .returning();
        }

        return res.json({
            billingCycleStartDay: settings.billingCycleStartDay,
            billingCycleEndDay: settings.billingCycleEndDay,
        });
    } catch (error) {
        if (error instanceof z.ZodError) {
            return res.status(400).json({
                error: 'Validation failed',
                details: error.errors,
            });
        }
        console.error('Update settings error:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
});

export default router;
