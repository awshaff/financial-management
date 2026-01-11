import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { Expense, CreateExpenseInput, ExpenseFilters } from '@/types';

// Query keys
export const expenseKeys = {
    all: ['expenses'] as const,
    lists: () => [...expenseKeys.all, 'list'] as const,
    list: (filters: ExpenseFilters) => [...expenseKeys.lists(), filters] as const,
};

// Fetch expenses with filters
export function useExpenses(filters: ExpenseFilters = {}) {
    return useQuery({
        queryKey: expenseKeys.list(filters),
        queryFn: () => api.expenses.list({
            categoryId: filters.categoryId,
            paymentMethodId: filters.paymentMethodId,
            startDate: filters.startDate,
            endDate: filters.endDate,
            page: filters.page,
            limit: filters.limit,
        }),
    });
}

// Create expense
export function useCreateExpense() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (data: CreateExpenseInput) => api.expenses.create(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: expenseKeys.all });
            queryClient.invalidateQueries({ queryKey: ['dashboard'] });
        },
    });
}

// Update expense
export function useUpdateExpense() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ id, ...data }: { id: string } & Partial<CreateExpenseInput>) =>
            api.expenses.update(id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: expenseKeys.all });
            queryClient.invalidateQueries({ queryKey: ['dashboard'] });
        },
    });
}

// Delete expense with optimistic update
export function useDeleteExpense() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (id: string) => api.expenses.delete(id),

        // Optimistically remove from UI immediately
        onMutate: async (id: string) => {
            // Cancel any outgoing refetches
            await queryClient.cancelQueries({ queryKey: expenseKeys.all });

            // Snapshot the previous value for all expense queries
            const previousData = queryClient.getQueriesData<{ expenses: Expense[] }>({
                queryKey: expenseKeys.lists(),
            });

            // Optimistically update all expense lists
            queryClient.setQueriesData<{ expenses: Expense[]; pagination: unknown }>(
                { queryKey: expenseKeys.lists() },
                (old) => {
                    if (!old) return old;
                    return {
                        ...old,
                        expenses: old.expenses.filter((e) => e.id !== id),
                    };
                }
            );

            return { previousData };
        },

        // Rollback on error
        onError: (_err, _id, context) => {
            if (context?.previousData) {
                context.previousData.forEach(([queryKey, data]) => {
                    queryClient.setQueryData(queryKey, data);
                });
            }
        },

        // Refetch on success to ensure consistency
        onSettled: () => {
            queryClient.invalidateQueries({ queryKey: expenseKeys.all });
            queryClient.invalidateQueries({ queryKey: ['dashboard'] });
        },
    });
}
