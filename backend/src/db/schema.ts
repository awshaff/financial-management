import {
    pgTable,
    uuid,
    varchar,
    timestamp,
    boolean,
    integer,
    decimal,
    date,
    index,
    unique,
    pgEnum,
    check,
} from 'drizzle-orm/pg-core';
import { relations, sql } from 'drizzle-orm';

// ============================================
// Enums
// ============================================

export const paymentTypeEnum = pgEnum('payment_type', [
    'Cash',
    'Credit Card',
    'Debit Card',
    'Bank Transfer',
]);

// ============================================
// Users Table
// ============================================

export const users = pgTable(
    'users',
    {
        id: uuid('id').primaryKey().defaultRandom(),
        email: varchar('email', { length: 255 }).unique().notNull(),
        passwordHash: varchar('password_hash', { length: 255 }).notNull(),
        createdAt: timestamp('created_at').defaultNow().notNull(),
        updatedAt: timestamp('updated_at').defaultNow().notNull(),
    },
    (table) => ({
        emailIdx: index('idx_users_email').on(table.email),
    })
);

export const usersRelations = relations(users, ({ many, one }) => ({
    paymentMethods: many(paymentMethods),
    categories: many(categories),
    expenses: many(expenses),
    income: many(income),
    settings: one(userSettings),
}));

// ============================================
// Payment Methods Table (User-Configurable Cards)
// ============================================

export const paymentMethods = pgTable(
    'payment_methods',
    {
        id: uuid('id').primaryKey().defaultRandom(),
        userId: uuid('user_id')
            .references(() => users.id, { onDelete: 'cascade' })
            .notNull(),
        name: varchar('name', { length: 100 }).notNull(),
        type: paymentTypeEnum('type').notNull(),
        // Cashback percentage (0.00 - 10.00), only for Credit Cards
        cashbackPercentage: decimal('cashback_percentage', {
            precision: 4,
            scale: 2,
        }),
        isDefault: boolean('is_default').default(false).notNull(),
        createdAt: timestamp('created_at').defaultNow().notNull(),
        updatedAt: timestamp('updated_at').defaultNow().notNull(),
    },
    (table) => ({
        userIdx: index('idx_payment_methods_user').on(table.userId),
        uniqueUserName: unique('payment_methods_user_name').on(
            table.userId,
            table.name
        ),
        // CHECK: cashback_percentage must be between 0 and 10
        cashbackRangeCheck: check(
            'cashback_range_check',
            sql`${table.cashbackPercentage} IS NULL OR (${table.cashbackPercentage} >= 0 AND ${table.cashbackPercentage} <= 10)`
        ),
    })
);

export const paymentMethodsRelations = relations(
    paymentMethods,
    ({ one, many }) => ({
        user: one(users, {
            fields: [paymentMethods.userId],
            references: [users.id],
        }),
        expenses: many(expenses),
    })
);

// ============================================
// Categories Table
// ============================================

export const categories = pgTable(
    'categories',
    {
        id: uuid('id').primaryKey().defaultRandom(),
        userId: uuid('user_id')
            .references(() => users.id, { onDelete: 'cascade' })
            .notNull(),
        name: varchar('name', { length: 100 }).notNull(),
        // Monthly budget in integer (KRW), null = no budget set
        monthlyBudget: integer('monthly_budget'),
        isDefault: boolean('is_default').default(false).notNull(),
        createdAt: timestamp('created_at').defaultNow().notNull(),
        updatedAt: timestamp('updated_at').defaultNow().notNull(),
    },
    (table) => ({
        userIdx: index('idx_categories_user').on(table.userId),
        uniqueUserName: unique('categories_user_name').on(table.userId, table.name),
        // CHECK: monthly_budget must be non-negative if set
        budgetCheck: check(
            'budget_check',
            sql`${table.monthlyBudget} IS NULL OR ${table.monthlyBudget} >= 0`
        ),
    })
);

export const categoriesRelations = relations(categories, ({ one, many }) => ({
    user: one(users, {
        fields: [categories.userId],
        references: [users.id],
    }),
    expenses: many(expenses),
}));

// ============================================
// Expenses Table (Core Transaction Table)
// ============================================
// CRITICAL: All money stored as integers (₩5,000 = 5000)

export const expenses = pgTable(
    'expenses',
    {
        id: uuid('id').primaryKey().defaultRandom(),
        userId: uuid('user_id')
            .references(() => users.id, { onDelete: 'cascade' })
            .notNull(),
        date: date('date').notNull(),
        merchant: varchar('merchant', { length: 255 }).notNull(),

        // Money as integers (KRW) - ₩5,000 = 5000
        amount: integer('amount').notNull(),
        cashbackAmount: integer('cashback_amount').default(0).notNull(),
        amountNet: integer('amount_net').notNull(),

        categoryId: uuid('category_id')
            .references(() => categories.id, { onDelete: 'restrict' })
            .notNull(),
        paymentMethodId: uuid('payment_method_id')
            .references(() => paymentMethods.id, { onDelete: 'restrict' })
            .notNull(),

        createdAt: timestamp('created_at').defaultNow().notNull(),
        updatedAt: timestamp('updated_at').defaultNow().notNull(),
    },
    (table) => ({
        userDateIdx: index('idx_expenses_user_date').on(table.userId, table.date),
        userCategoryIdx: index('idx_expenses_user_category').on(
            table.userId,
            table.categoryId
        ),
        userPaymentIdx: index('idx_expenses_user_payment').on(
            table.userId,
            table.paymentMethodId
        ),
        updatedIdx: index('idx_expenses_updated').on(table.updatedAt),
        // CHECK: amount must be non-negative
        amountCheck: check('amount_check', sql`${table.amount} >= 0`),
        // CHECK: cashback_amount must be non-negative
        cashbackCheck: check(
            'cashback_check',
            sql`${table.cashbackAmount} >= 0`
        ),
        // CHECK: amount_net must be non-negative
        amountNetCheck: check('amount_net_check', sql`${table.amountNet} >= 0`),
        // CHECK: amount_net = amount - cashback_amount (database-enforced business logic)
        netCalculationCheck: check(
            'net_calculation_check',
            sql`${table.amountNet} = ${table.amount} - ${table.cashbackAmount}`
        ),
        // CHECK: cashback can't exceed 10% of amount (sanity check)
        cashbackMaxCheck: check(
            'cashback_max_check',
            sql`${table.cashbackAmount} <= ${table.amount} * 0.1`
        ),
    })
);

export const expensesRelations = relations(expenses, ({ one }) => ({
    user: one(users, {
        fields: [expenses.userId],
        references: [users.id],
    }),
    category: one(categories, {
        fields: [expenses.categoryId],
        references: [categories.id],
    }),
    paymentMethod: one(paymentMethods, {
        fields: [expenses.paymentMethodId],
        references: [paymentMethods.id],
    }),
}));

// ============================================
// Income Table
// ============================================

export const income = pgTable(
    'income',
    {
        id: uuid('id').primaryKey().defaultRandom(),
        userId: uuid('user_id')
            .references(() => users.id, { onDelete: 'cascade' })
            .notNull(),
        // First day of month (YYYY-MM-01)
        month: date('month').notNull(),
        // Income amount in integer (KRW)
        amount: integer('amount').notNull(),
        source: varchar('source', { length: 255 }),
        createdAt: timestamp('created_at').defaultNow().notNull(),
        updatedAt: timestamp('updated_at').defaultNow().notNull(),
    },
    (table) => ({
        userMonthIdx: index('idx_income_user_month').on(table.userId, table.month),
        uniqueUserMonth: unique('income_user_month').on(table.userId, table.month),
        // CHECK: amount must be non-negative
        incomeAmountCheck: check(
            'income_amount_check',
            sql`${table.amount} >= 0`
        ),
    })
);

export const incomeRelations = relations(income, ({ one }) => ({
    user: one(users, {
        fields: [income.userId],
        references: [users.id],
    }),
}));

// ============================================
// User Settings Table
// ============================================

export const userSettings = pgTable(
    'user_settings',
    {
        id: uuid('id').primaryKey().defaultRandom(),
        userId: uuid('user_id')
            .references(() => users.id, { onDelete: 'cascade' })
            .unique()
            .notNull(),
        // Billing cycle start day (1-31), default 27
        billingCycleStartDay: integer('billing_cycle_start_day').default(27).notNull(),
        // Billing cycle end day (1-31), default 26
        billingCycleEndDay: integer('billing_cycle_end_day').default(26).notNull(),
        createdAt: timestamp('created_at').defaultNow().notNull(),
        updatedAt: timestamp('updated_at').defaultNow().notNull(),
    },
    (table) => ({
        userIdx: index('idx_user_settings_user').on(table.userId),
        // CHECK: billing_cycle_start_day must be between 1 and 31
        billingCycleStartCheck: check(
            'billing_cycle_start_check',
            sql`${table.billingCycleStartDay} >= 1 AND ${table.billingCycleStartDay} <= 31`
        ),
        // CHECK: billing_cycle_end_day must be between 1 and 31
        billingCycleEndCheck: check(
            'billing_cycle_end_check',
            sql`${table.billingCycleEndDay} >= 1 AND ${table.billingCycleEndDay} <= 31`
        ),
    })
);

export const userSettingsRelations = relations(userSettings, ({ one }) => ({
    user: one(users, {
        fields: [userSettings.userId],
        references: [users.id],
    }),
}));

// ============================================
// Type Exports
// ============================================

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;

export type PaymentMethod = typeof paymentMethods.$inferSelect;
export type NewPaymentMethod = typeof paymentMethods.$inferInsert;

export type Category = typeof categories.$inferSelect;
export type NewCategory = typeof categories.$inferInsert;

export type Expense = typeof expenses.$inferSelect;
export type NewExpense = typeof expenses.$inferInsert;

export type Income = typeof income.$inferSelect;
export type NewIncome = typeof income.$inferInsert;

export type UserSettings = typeof userSettings.$inferSelect;
export type NewUserSettings = typeof userSettings.$inferInsert;
