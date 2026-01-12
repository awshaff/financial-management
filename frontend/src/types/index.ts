// Type definitions for the Finance Tracker

export type PaymentType = 'Cash' | 'Credit Card' | 'Debit Card' | 'Bank Transfer';

export interface User {
    id: string;
    email: string;
}

export interface AuthResponse {
    user: User;
    token: string;
}

export interface PaymentMethod {
    id: string;
    name: string;
    type: PaymentType;
    cashbackPercentage: string | null;
    isDefault: boolean;
    createdAt: string;
    updatedAt: string;
}

export interface Category {
    id: string;
    name: string;
    monthlyBudget: number | null;
    isDefault: boolean;
    expenseCount?: number;
    createdAt: string;
    updatedAt: string;
}

export interface Expense {
    id: string;
    date: string;
    merchant: string;
    amount: number;
    cashbackAmount: number;
    amountNet: number;
    category: Category;
    paymentMethod: PaymentMethod;
    createdAt: string;
    updatedAt: string;
}

export interface CreateExpenseInput {
    date: string;
    merchant: string;
    amount: number;
    categoryId: string;
    paymentMethodId: string;
}

export interface UpdateExpenseInput extends Partial<CreateExpenseInput> {
    id: string;
}

export interface ExpenseFilters {
    categoryId?: string;
    paymentMethodId?: string;
    startDate?: string;
    endDate?: string;
    sortBy?: 'date' | 'merchant' | 'category' | 'payment' | 'amount';
    sortOrder?: 'asc' | 'desc';
    page?: number;
    limit?: number;
}

export interface PaginatedResponse<T> {
    expenses: T[];
    pagination: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
    };
}

export interface DashboardSummary {
    month: string;
    totalSpent: number;
    totalCashback: number;
    totalExpenses: number;
    budgetProgress: number;
    categoryBreakdown: Array<{
        category: string;
        spent: number;
        cashback: number;
        percentage: number;
    }>;
    budgetStatus: Array<{
        categoryId: string;
        categoryName: string;
        budget: number;
        spent: number;
        remaining: number;
        percentage: number;
        status: 'on-track' | 'warning' | 'over-budget';
    }>;
    topMerchants: Array<{
        merchant: string;
        totalSpent: number;
        cashbackEarned: number;
        transactionCount: number;
    }>;
}

export interface MonthlyTrend {
    month: string;
    totalSpent: number;
    totalCashback: number;
}

export interface CreatePaymentMethodInput {
    name: string;
    type: PaymentType;
    cashbackPercentage?: string;
    isDefault?: boolean;
}

export interface CreateCategoryInput {
    name: string;
    monthlyBudget?: number;
}
