import { db } from './client.js';
import { categories, paymentMethods } from './schema.js';

// Default categories to seed on user creation
export const defaultCategories = [
    'Food',
    'Baby',
    'Groceries',
    'Utilities',
    'Household',
    'Transport',
    'Others',
    'Subscription',
    'Insurance',
    'Monthly Rent',
    'Instalment',
] as const;

// Default payment methods to seed on user creation
export const defaultPaymentMethods = [
    { name: 'Cash', type: 'Cash' as const, cashbackPercentage: null },
    { name: 'Bank Transfer', type: 'Bank Transfer' as const, cashbackPercentage: null },
    { name: 'Debit Card', type: 'Debit Card' as const, cashbackPercentage: null },
    {
        name: 'Credit Card',
        type: 'Credit Card' as const,
        cashbackPercentage: '1.20',
        isDefault: true,
    },
] as const;

/**
 * Seeds default categories and payment methods for a new user
 * Called after user registration
 */
export async function seedUserDefaults(userId: string): Promise<void> {
    // Seed categories
    await db.insert(categories).values(
        defaultCategories.map((name) => ({
            userId,
            name,
            isDefault: true,
            monthlyBudget: null,
        }))
    );

    // Seed payment methods
    await db.insert(paymentMethods).values(
        defaultPaymentMethods.map((method) => ({
            userId,
            name: method.name,
            type: method.type,
            cashbackPercentage: method.cashbackPercentage,
            isDefault: 'isDefault' in method ? method.isDefault : false,
        }))
    );
}
