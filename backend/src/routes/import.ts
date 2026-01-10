import { Router } from 'express';
import multer from 'multer';
import * as XLSX from 'xlsx';
import { eq } from 'drizzle-orm';

import { db } from '../db/client.js';
import { expenses, categories, paymentMethods } from '../db/schema.js';
import { authMiddleware } from '../middleware/auth.js';

const router = Router();

// Configure multer for file uploads (memory storage)
const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 10 * 1024 * 1024, // 10MB max
    },
    fileFilter: (_req, file, cb) => {
        const allowedMimes = [
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'application/vnd.ms-excel',
        ];
        if (allowedMimes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Invalid file type. Only .xlsx and .xls files are allowed.'));
        }
    },
});

// Use auth middleware for all routes
router.use(authMiddleware);

interface ExcelRow {
    Date: string | number;
    Merchant: string;
    Amount: number;
    Category: string;
    Payment: string;
}

interface ImportError {
    row: number;
    reason: string;
}

/**
 * POST /api/import/excel
 * Parse and bulk import expenses from Excel file
 * Expected columns: Date | Merchant | Amount | Category | Payment
 */
router.post('/excel', upload.single('file'), async (req, res) => {
    try {
        const { userId } = req.user!;

        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }

        // Parse Excel file
        const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const data = XLSX.utils.sheet_to_json<ExcelRow>(worksheet);

        if (data.length === 0) {
            return res.status(400).json({ error: 'Excel file is empty' });
        }

        // Fetch user's payment methods & categories (once, not per row)
        const [userPaymentMethods, userCategories] = await Promise.all([
            db.query.paymentMethods.findMany({
                where: eq(paymentMethods.userId, userId),
            }),
            db.query.categories.findMany({
                where: eq(categories.userId, userId),
            }),
        ]);

        // Create lookup maps for O(1) access
        const pmMap = new Map(userPaymentMethods.map((pm) => [pm.name.toLowerCase(), pm]));
        const catMap = new Map(userCategories.map((c) => [c.name.toLowerCase(), c]));

        const toInsert: Array<{
            userId: string;
            date: string;
            merchant: string;
            amount: number;
            cashbackAmount: number;
            amountNet: number;
            categoryId: string;
            paymentMethodId: string;
        }> = [];
        const errors: ImportError[] = [];

        for (let i = 0; i < data.length; i++) {
            const row = data[i];
            const rowNumber = i + 2; // Excel row (1-indexed + header row)

            // Validate required fields
            if (!row.Date) {
                errors.push({ row: rowNumber, reason: 'Missing required field: Date' });
                continue;
            }
            if (!row.Merchant) {
                errors.push({ row: rowNumber, reason: 'Missing required field: Merchant' });
                continue;
            }
            if (row.Amount === undefined || row.Amount === null) {
                errors.push({ row: rowNumber, reason: 'Missing required field: Amount' });
                continue;
            }
            if (!row.Category) {
                errors.push({ row: rowNumber, reason: 'Missing required field: Category' });
                continue;
            }
            if (!row.Payment) {
                errors.push({ row: rowNumber, reason: 'Missing required field: Payment' });
                continue;
            }

            // Parse date (handle Excel serial numbers and strings)
            let dateStr: string;
            if (typeof row.Date === 'number') {
                // Excel serial date number
                const excelDate = XLSX.SSF.parse_date_code(row.Date);
                dateStr = `${excelDate.y}-${String(excelDate.m).padStart(2, '0')}-${String(excelDate.d).padStart(2, '0')}`;
            } else {
                // String date - try to parse
                const parsed = new Date(row.Date);
                if (isNaN(parsed.getTime())) {
                    errors.push({ row: rowNumber, reason: `Invalid date format: ${row.Date}` });
                    continue;
                }
                dateStr = parsed.toISOString().split('T')[0];
            }

            // Lookup category
            const category = catMap.get(row.Category.toLowerCase());
            if (!category) {
                errors.push({
                    row: rowNumber,
                    reason: `Category not found: ${row.Category}`,
                });
                continue;
            }

            // Lookup payment method
            const paymentMethod = pmMap.get(row.Payment.toLowerCase());
            if (!paymentMethod) {
                errors.push({
                    row: rowNumber,
                    reason: `Payment method not found: ${row.Payment}`,
                });
                continue;
            }

            // Parse and validate amount
            const amount = Math.round(Number(row.Amount));
            if (isNaN(amount) || amount < 0) {
                errors.push({ row: rowNumber, reason: `Invalid amount: ${row.Amount}` });
                continue;
            }

            // Calculate cashback (server-side)
            let cashbackAmount = 0;
            if (
                paymentMethod.type === 'Credit Card' &&
                paymentMethod.cashbackPercentage
            ) {
                cashbackAmount = Math.round(
                    amount * (Number(paymentMethod.cashbackPercentage) / 100)
                );
            }

            toInsert.push({
                userId,
                date: dateStr,
                merchant: String(row.Merchant).trim(),
                amount,
                cashbackAmount,
                amountNet: amount - cashbackAmount,
                categoryId: category.id,
                paymentMethodId: paymentMethod.id,
            });
        }

        // Bulk insert (all valid rows in one query!)
        let importedCount = 0;
        if (toInsert.length > 0) {
            const inserted = await db.insert(expenses).values(toInsert).returning({ id: expenses.id });
            importedCount = inserted.length;
        }

        return res.json({
            success: true,
            imported: importedCount,
            skipped: errors.length,
            totalRows: data.length,
            errors: errors.slice(0, 50), // Limit error details to first 50
        });
    } catch (error) {
        if (error instanceof multer.MulterError) {
            if (error.code === 'LIMIT_FILE_SIZE') {
                return res.status(400).json({ error: 'File too large. Maximum size is 10MB.' });
            }
            return res.status(400).json({ error: error.message });
        }
        console.error('Excel import error:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
});

export default router;
