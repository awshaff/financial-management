import 'dotenv/config';
import crypto from 'crypto';
import { expand } from 'dotenv-expand';
import dotenv from 'dotenv';

expand(dotenv.config());

import { drizzle } from 'drizzle-orm/node-postgres';
import pg from 'pg';
import bcrypt from 'bcrypt';
import * as schema from './schema.js';
import { users, categories, paymentMethods, expenses, income, userSettings } from './schema.js';

const { Pool } = pg;

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
});

const db = drizzle(pool, { schema });

// Demo user credentials
const DEMO_USER = {
    email: 'demo@example.com',
    password: 'Demo123!',
};

// Default categories with budgets
const demoCategories = [
    { name: 'Food & Dining', monthlyBudget: 500000, isDefault: true },
    { name: 'Transportation', monthlyBudget: 200000, isDefault: false },
    { name: 'Shopping', monthlyBudget: 300000, isDefault: false },
    { name: 'Entertainment', monthlyBudget: 150000, isDefault: false },
    { name: 'Utilities', monthlyBudget: 100000, isDefault: false },
    { name: 'Healthcare', monthlyBudget: 100000, isDefault: false },
    { name: 'Education', monthlyBudget: 200000, isDefault: false },
    { name: 'Coffee', monthlyBudget: 80000, isDefault: false },
];

// Payment methods with cashback rates
const demoPaymentMethods = [
    { name: 'Cash', type: 'Cash' as const, cashbackPercentage: null, isDefault: false },
    { name: 'Debit Card', type: 'Debit Card' as const, cashbackPercentage: null, isDefault: false },
    { name: 'Credit Card', type: 'Credit Card' as const, cashbackPercentage: '1.50', isDefault: true },
    { name: 'Premium Card', type: 'Credit Card' as const, cashbackPercentage: '3.00', isDefault: false },
];

// Sample merchants by category
const merchantsByCategory: Record<string, string[]> = {
    'Food & Dining': ['Starbucks', 'McDonald\'s', 'Pizza Hut', 'Local Restaurant', 'Subway', 'KFC'],
    'Transportation': ['Uber', 'Bus Ticket', 'Taxi', 'Gas Station', 'Parking'],
    'Shopping': ['Amazon', 'Uniqlo', 'H&M', 'Nike Store', 'Electronics Store'],
    'Entertainment': ['Netflix', 'Spotify', 'Cinema', 'Game Store', 'Concert Ticket'],
    'Utilities': ['Electric Bill', 'Water Bill', 'Internet', 'Phone Bill'],
    'Healthcare': ['Pharmacy', 'Doctor Visit', 'Dentist', 'Gym Membership'],
    'Education': ['Online Course', 'Books', 'Tutoring', 'School Supplies'],
    'Coffee': ['Starbucks', 'Blue Bottle', 'Local Cafe', 'Dunkin'],
};

// Generate random amount within range
function randomAmount(min: number, max: number): number {
    return Math.round(Math.random() * (max - min) + min);
}

// Generate date string for a given offset from today
function getDateString(daysAgo: number): string {
    const date = new Date();
    date.setDate(date.getDate() - daysAgo);
    return date.toISOString().split('T')[0];
}

async function seedDemo() {
    console.log('🌱 Starting demo data seed...\n');

    try {
        // Check if demo user already exists
        const existingUser = await db.query.users.findFirst({
            where: (users, { eq }) => eq(users.email, DEMO_USER.email),
        });

        if (existingUser) {
            console.log('⚠️  Demo user already exists. Skipping...');
            console.log(`\n📧 Demo Login: ${DEMO_USER.email}`);
            console.log(`🔑 Password: ${DEMO_USER.password}\n`);
            await pool.end();
            return;
        }

        // Create demo user
        console.log('👤 Creating demo user...');
        const passwordHash = await bcrypt.hash(DEMO_USER.password, 12);
        const [demoUser] = await db
            .insert(users)
            .values({
                email: DEMO_USER.email,
                passwordHash,
            })
            .returning();

        console.log(`   ✓ Created user: ${demoUser.email}`);

        // Create user settings
        console.log('⚙️  Creating user settings...');
        await db.insert(userSettings).values({
            userId: demoUser.id,
            billingCycleStartDay: 27,
            billingCycleEndDay: 26,
        });
        console.log('   ✓ Settings created');

        // Create categories
        console.log('📁 Creating categories...');
        const createdCategories = await db
            .insert(categories)
            .values(
                demoCategories.map((cat) => ({
                    userId: demoUser.id,
                    name: cat.name,
                    monthlyBudget: cat.monthlyBudget,
                    isDefault: cat.isDefault,
                }))
            )
            .returning();
        console.log(`   ✓ Created ${createdCategories.length} categories`);

        // Create payment methods
        console.log('💳 Creating payment methods...');
        const createdPaymentMethods = await db
            .insert(paymentMethods)
            .values(
                demoPaymentMethods.map((pm) => ({
                    userId: demoUser.id,
                    name: pm.name,
                    type: pm.type,
                    cashbackPercentage: pm.cashbackPercentage,
                    isDefault: pm.isDefault,
                }))
            )
            .returning();
        console.log(`   ✓ Created ${createdPaymentMethods.length} payment methods`);

        // Create sample expenses for the past 3 months
        console.log('💰 Creating sample expenses...');
        const expenseData: Array<{
            userId: string;
            date: string;
            merchant: string;
            amount: number;
            cashbackAmount: number;
            amountNet: number;
            categoryId: string;
            paymentMethodId: string;
            paymentMode?: 'lump_sum' | 'installment';
            installmentGroupId?: string;
            installmentMonths?: number;
            installmentNumber?: number;
        }> = [];

        // Category and payment method lookup
        const categoryMap = new Map(createdCategories.map((c) => [c.name, c]));
        const pmMap = new Map(createdPaymentMethods.map((pm) => [pm.name, pm]));

        // Generate ~350 expenses over 180 days (6 months)
        for (let day = 0; day < 180; day++) {
            // 1-3 expenses per day
            const expensesPerDay = Math.floor(Math.random() * 3) + 1;

            for (let i = 0; i < expensesPerDay; i++) {
                // Pick random category
                const categoryName = demoCategories[Math.floor(Math.random() * demoCategories.length)].name;
                const category = categoryMap.get(categoryName)!;

                // Pick merchant from category
                const merchants = merchantsByCategory[categoryName] || ['General Store'];
                const merchant = merchants[Math.floor(Math.random() * merchants.length)];

                // Pick payment method (credit cards more likely)
                const pmChoice = Math.random();
                let pmName: string;
                if (pmChoice < 0.5) {
                    pmName = 'Credit Card';
                } else if (pmChoice < 0.7) {
                    pmName = 'Premium Card';
                } else if (pmChoice < 0.9) {
                    pmName = 'Debit Card';
                } else {
                    pmName = 'Cash';
                }
                const paymentMethod = pmMap.get(pmName)!;

                // Generate amount based on category
                let amount: number;
                switch (categoryName) {
                    case 'Coffee':
                        amount = randomAmount(4000, 8000);
                        break;
                    case 'Food & Dining':
                        amount = randomAmount(8000, 50000);
                        break;
                    case 'Transportation':
                        amount = randomAmount(3000, 30000);
                        break;
                    case 'Shopping':
                        amount = randomAmount(20000, 150000);
                        break;
                    case 'Entertainment':
                        amount = randomAmount(10000, 50000);
                        break;
                    case 'Utilities':
                        amount = randomAmount(30000, 80000);
                        break;
                    case 'Healthcare':
                        amount = randomAmount(10000, 100000);
                        break;
                    case 'Education':
                        amount = randomAmount(10000, 200000);
                        break;
                    default:
                        amount = randomAmount(5000, 50000);
                }

                // Calculate cashback (only for credit cards)
                let cashbackAmount = 0;
                if (paymentMethod.type === 'Credit Card' && paymentMethod.cashbackPercentage) {
                    cashbackAmount = Math.round(amount * (Number(paymentMethod.cashbackPercentage) / 100));
                }

                expenseData.push({
                    userId: demoUser.id,
                    date: getDateString(day),
                    merchant,
                    amount,
                    cashbackAmount,
                    amountNet: amount - cashbackAmount,
                    categoryId: category.id,
                    paymentMethodId: paymentMethod.id,
                });
            }
        }

        // Add sample installment expenses
        console.log('📦 Creating sample installment expenses...');
        const installmentPurchases = [
            {
                merchant: 'Samsung Store',
                totalAmount: 1200000, // ₩1,200,000 laptop
                months: 12,
                categoryName: 'Shopping',
                pmName: 'Credit Card',
                daysAgo: 60, // purchased ~2 months ago
            },
            {
                merchant: 'Apple Store',
                totalAmount: 900000, // ₩900,000 phone
                months: 6,
                categoryName: 'Shopping',
                pmName: 'Premium Card',
                daysAgo: 30, // purchased ~1 month ago
            },
        ];

        for (const purchase of installmentPurchases) {
            const category = categoryMap.get(purchase.categoryName)!;
            const paymentMethod = pmMap.get(purchase.pmName)!;
            const installmentGroupId = crypto.randomUUID();

            // Calculate cashback on full amount
            let totalCashback = 0;
            if (paymentMethod.type === 'Credit Card' && paymentMethod.cashbackPercentage) {
                totalCashback = Math.round(
                    purchase.totalAmount * (Number(paymentMethod.cashbackPercentage) / 100)
                );
            }
            const totalNet = purchase.totalAmount - totalCashback;

            const perMonthAmount = Math.floor(purchase.totalAmount / purchase.months);
            const perMonthCashback = Math.floor(totalCashback / purchase.months);
            const perMonthNet = Math.floor(totalNet / purchase.months);

            const baseDate = new Date();
            baseDate.setDate(baseDate.getDate() - purchase.daysAgo);

            for (let i = 0; i < purchase.months; i++) {
                const isLast = i === purchase.months - 1;
                const installmentDate = new Date(baseDate);
                installmentDate.setMonth(installmentDate.getMonth() + i);
                const dateStr = installmentDate.toISOString().split('T')[0];

                expenseData.push({
                    userId: demoUser.id,
                    date: dateStr,
                    merchant: purchase.merchant,
                    amount: isLast
                        ? purchase.totalAmount - perMonthAmount * (purchase.months - 1)
                        : perMonthAmount,
                    cashbackAmount: isLast
                        ? totalCashback - perMonthCashback * (purchase.months - 1)
                        : perMonthCashback,
                    amountNet: isLast
                        ? totalNet - perMonthNet * (purchase.months - 1)
                        : perMonthNet,
                    categoryId: category.id,
                    paymentMethodId: paymentMethod.id,
                    paymentMode: 'installment' as const,
                    installmentGroupId,
                    installmentMonths: purchase.months,
                    installmentNumber: i + 1,
                });
            }
        }
        console.log(`   ✓ Created ${installmentPurchases.length} installment groups`);

        // Bulk insert expenses
        await db.insert(expenses).values(expenseData);
        console.log(`   ✓ Created ${expenseData.length} total expenses`);

        // Create income records for past 6 months (to match trends chart)
        console.log('💵 Creating income records...');
        const incomeSources = [
            { amount: 3500000, source: 'Salary' },
            { amount: 3500000, source: 'Salary' },
            { amount: 3700000, source: 'Salary + Bonus' },
            { amount: 3500000, source: 'Salary' },
            { amount: 3500000, source: 'Salary' },
            { amount: 4000000, source: 'Salary + Freelance' },
        ];
        const incomeData = [];
        for (let i = 0; i < 6; i++) {
            const date = new Date();
            date.setMonth(date.getMonth() - i);
            date.setDate(1);
            incomeData.push({
                userId: demoUser.id,
                month: date.toISOString().split('T')[0],
                amount: incomeSources[i].amount,
                source: incomeSources[i].source,
            });
        }
        await db.insert(income).values(incomeData);
        console.log(`   ✓ Created ${incomeData.length} income records`);

        console.log('\n✅ Demo data seeded successfully!\n');
        console.log('═══════════════════════════════════════');
        console.log('  🎯 DEMO LOGIN CREDENTIALS');
        console.log('═══════════════════════════════════════');
        console.log(`  📧 Email:    ${DEMO_USER.email}`);
        console.log(`  🔑 Password: ${DEMO_USER.password}`);
        console.log('═══════════════════════════════════════\n');

    } catch (error) {
        console.error('❌ Error seeding demo data:', error);
        throw error;
    } finally {
        await pool.end();
    }
}

seedDemo();
