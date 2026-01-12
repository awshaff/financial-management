// API client for the Finance Tracker

const API_BASE = '/api';

class ApiError extends Error {
    status: number;

    constructor(status: number, message: string) {
        super(message);
        this.name = 'ApiError';
        this.status = status;
    }
}

async function getToken(): Promise<string | null> {
    return localStorage.getItem('auth_token');
}

async function request<T>(
    endpoint: string,
    options: RequestInit = {}
): Promise<T> {
    const token = await getToken();

    const headers: HeadersInit = {
        'Content-Type': 'application/json',
        ...options.headers,
    };

    if (token) {
        (headers as Record<string, string>)['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${API_BASE}${endpoint}`, {
        ...options,
        headers,
    });

    if (!response.ok) {
        // Handle 401 Unauthorized
        // Skip redirect if this was a login attempt to avoid reloading the page
        if (response.status === 401 && !endpoint.includes('/auth/login')) {
            localStorage.removeItem('auth_token');
            window.location.href = '/login';
        }

        const error = await response.json().catch(() => ({ error: 'Request failed' }));
        throw new ApiError(response.status, error.error || 'Request failed');
    }

    // Handle 204 No Content
    if (response.status === 204) {
        return {} as T;
    }

    return response.json();
}

// Auth API
export const auth = {
    login: (email: string, password: string) =>
        request<{ user: { id: string; email: string }; token: string }>('/auth/login', {
            method: 'POST',
            body: JSON.stringify({ email, password }),
        }),

    register: (email: string, password: string) =>
        request<{ user: { id: string; email: string }; token: string }>('/auth/register', {
            method: 'POST',
            body: JSON.stringify({ email, password }),
        }),
};

// Expenses API
export const expenses = {
    list: (params?: Record<string, string | number | undefined>) => {
        const searchParams = new URLSearchParams();
        if (params) {
            Object.entries(params).forEach(([key, value]) => {
                if (value !== undefined) {
                    searchParams.set(key, String(value));
                }
            });
        }
        const query = searchParams.toString();
        return request<{
            expenses: import('@/types').Expense[];
            pagination: { page: number; limit: number; total: number; totalPages: number };
        }>(`/expenses${query ? `?${query}` : ''}`);
    },

    create: (data: import('@/types').CreateExpenseInput) =>
        request<import('@/types').Expense>('/expenses', {
            method: 'POST',
            body: JSON.stringify(data),
        }),

    update: (id: string, data: Partial<import('@/types').CreateExpenseInput>) =>
        request<import('@/types').Expense>(`/expenses/${id}`, {
            method: 'PATCH',
            body: JSON.stringify(data),
        }),

    delete: (id: string) =>
        request<void>(`/expenses/${id}`, { method: 'DELETE' }),

    bulkDelete: (ids: string[]) =>
        request<{ deleted: number }>('/expenses/bulk-delete', {
            method: 'POST',
            body: JSON.stringify({ ids }),
        }),
};

// Categories API
export const categories = {
    list: () =>
        request<{ categories: import('@/types').Category[] }>('/categories'),

    create: (data: import('@/types').CreateCategoryInput) =>
        request<import('@/types').Category>('/categories', {
            method: 'POST',
            body: JSON.stringify(data),
        }),

    update: (id: string, data: Partial<import('@/types').CreateCategoryInput>) =>
        request<import('@/types').Category>(`/categories/${id}`, {
            method: 'PATCH',
            body: JSON.stringify(data),
        }),

    delete: (id: string) =>
        request<void>(`/categories/${id}`, { method: 'DELETE' }),
};

// Payment Methods API
export const paymentMethods = {
    list: () =>
        request<{ paymentMethods: import('@/types').PaymentMethod[] }>('/payment-methods'),

    create: (data: import('@/types').CreatePaymentMethodInput) =>
        request<import('@/types').PaymentMethod>('/payment-methods', {
            method: 'POST',
            body: JSON.stringify(data),
        }),

    update: (id: string, data: Partial<import('@/types').CreatePaymentMethodInput>) =>
        request<import('@/types').PaymentMethod>(`/payment-methods/${id}`, {
            method: 'PATCH',
            body: JSON.stringify(data),
        }),

    delete: (id: string) =>
        request<void>(`/payment-methods/${id}`, { method: 'DELETE' }),
};

// Dashboard API
export const dashboard = {
    summary: (startDate?: string, endDate?: string) => {
        const params = new URLSearchParams();
        if (startDate) params.set('startDate', startDate);
        if (endDate) params.set('endDate', endDate);
        const query = params.toString();
        return request<import('@/types').DashboardSummary>(`/dashboard/summary${query ? `?${query}` : ''}`);
    },

    trends: () =>
        request<{ months: import('@/types').MonthlyTrend[] }>('/dashboard/trends'),
};

// Settings API
const settings = {
    get: () =>
        request<{ billingCycleStartDay: number; billingCycleEndDay: number }>('/settings'),

    update: (data: { billingCycleStartDay?: number; billingCycleEndDay?: number }) =>
        request<{ billingCycleStartDay: number; billingCycleEndDay: number }>('/settings', {
            method: 'PATCH',
            body: JSON.stringify(data),
        }),
};

// Income API
export interface Income {
    id: string;
    month: string;
    amount: number;
    source: string | null;
    createdAt: string;
    updatedAt: string;
}

const income = {
    list: () =>
        request<{ income: Income[] }>('/income'),

    create: (data: { month: string; amount: number; source?: string }) =>
        request<Income>('/income', {
            method: 'POST',
            body: JSON.stringify(data),
        }),

    update: (id: string, data: { amount?: number; source?: string }) =>
        request<Income>(`/income/${id}`, {
            method: 'PATCH',
            body: JSON.stringify(data),
        }),

    delete: (id: string) =>
        request<void>(`/income/${id}`, { method: 'DELETE' }),
};

// Export default api object
export const api = {
    auth,
    expenses,
    categories,
    paymentMethods,
    dashboard,
    settings,
    income,
};
