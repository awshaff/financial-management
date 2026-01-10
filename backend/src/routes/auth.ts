import { Router } from 'express';
import bcrypt from 'bcrypt';
import { z } from 'zod';
import { eq } from 'drizzle-orm';

import { db } from '../db/client.js';
import { users } from '../db/schema.js';
import { seedUserDefaults } from '../db/seed.js';
import { generateToken } from '../middleware/auth.js';

const router = Router();

// Validation schemas
const registerSchema = z.object({
    email: z.string().email('Invalid email format'),
    password: z
        .string()
        .min(8, 'Password must be at least 8 characters')
        .max(128, 'Password must not exceed 128 characters'),
});

const loginSchema = registerSchema;

/**
 * POST /api/auth/register
 * Create new user account with default categories and payment methods
 */
router.post('/register', async (req, res) => {
    try {
        // Validate input
        const { email, password } = registerSchema.parse(req.body);

        // Check if user already exists
        const existing = await db.query.users.findFirst({
            where: eq(users.email, email.toLowerCase()),
        });

        if (existing) {
            return res.status(400).json({ error: 'User already exists' });
        }

        // Hash password (12 rounds for security)
        const passwordHash = await bcrypt.hash(password, 12);

        // Create user
        const [user] = await db
            .insert(users)
            .values({
                email: email.toLowerCase(),
                passwordHash,
            })
            .returning({
                id: users.id,
                email: users.email,
            });

        // Seed default categories and payment methods
        await seedUserDefaults(user.id);

        // Generate JWT (30-day expiry)
        const token = generateToken(user.id);

        return res.status(201).json({
            user: {
                id: user.id,
                email: user.email,
            },
            token,
        });
    } catch (error) {
        if (error instanceof z.ZodError) {
            return res.status(400).json({
                error: 'Validation failed',
                details: error.errors,
            });
        }
        console.error('Registration error:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
});

/**
 * POST /api/auth/login
 * Authenticate user and return JWT token
 */
router.post('/login', async (req, res) => {
    try {
        // Validate input
        const { email, password } = loginSchema.parse(req.body);

        // Find user by email
        const user = await db.query.users.findFirst({
            where: eq(users.email, email.toLowerCase()),
        });

        if (!user) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        // Verify password
        const valid = await bcrypt.compare(password, user.passwordHash);
        if (!valid) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        // Generate JWT (30-day expiry)
        const token = generateToken(user.id);

        return res.json({
            user: {
                id: user.id,
                email: user.email,
            },
            token,
        });
    } catch (error) {
        if (error instanceof z.ZodError) {
            return res.status(400).json({
                error: 'Validation failed',
                details: error.errors,
            });
        }
        console.error('Login error:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
});

export default router;
