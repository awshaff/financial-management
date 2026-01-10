import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

// Extend Express Request type to include user
declare global {
    namespace Express {
        interface Request {
            user?: {
                userId: string;
            };
        }
    }
}

interface JwtPayload {
    userId: string;
    iat: number;
    exp: number;
}

/**
 * JWT Authentication Middleware
 * Validates Bearer token and attaches userId to request
 */
export function authMiddleware(
    req: Request,
    res: Response,
    next: NextFunction
): void {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            res.status(401).json({ error: 'Missing or invalid authorization header' });
            return;
        }

        const token = authHeader.substring(7); // Remove 'Bearer ' prefix

        if (!process.env.JWT_SECRET) {
            console.error('JWT_SECRET is not configured');
            res.status(500).json({ error: 'Server configuration error' });
            return;
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET) as JwtPayload;

        req.user = {
            userId: decoded.userId,
        };

        next();
    } catch (error) {
        if (error instanceof jwt.TokenExpiredError) {
            res.status(401).json({ error: 'Token expired' });
            return;
        }
        if (error instanceof jwt.JsonWebTokenError) {
            res.status(401).json({ error: 'Invalid token' });
            return;
        }
        console.error('Auth middleware error:', error);
        res.status(500).json({ error: 'Authentication error' });
    }
}

/**
 * Generate JWT token with 30-day expiration
 */
export function generateToken(userId: string): string {
    if (!process.env.JWT_SECRET) {
        throw new Error('JWT_SECRET is not configured');
    }

    return jwt.sign({ userId }, process.env.JWT_SECRET, {
        expiresIn: '30d',
    });
}
