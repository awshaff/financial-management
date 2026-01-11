import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { CreatePaymentMethodInput } from '@/types';

// Query keys
export const paymentMethodKeys = {
    all: ['paymentMethods'] as const,
    list: () => [...paymentMethodKeys.all, 'list'] as const,
};

// Fetch all payment methods
export function usePaymentMethods() {
    return useQuery({
        queryKey: paymentMethodKeys.list(),
        queryFn: () => api.paymentMethods.list(),
        select: (data) => data.paymentMethods,
    });
}

// Create payment method
export function useCreatePaymentMethod() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (data: CreatePaymentMethodInput) => api.paymentMethods.create(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: paymentMethodKeys.all });
        },
    });
}

// Update payment method
export function useUpdatePaymentMethod() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ id, ...data }: { id: string } & Partial<CreatePaymentMethodInput>) =>
            api.paymentMethods.update(id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: paymentMethodKeys.all });
        },
    });
}

// Delete payment method
export function useDeletePaymentMethod() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (id: string) => api.paymentMethods.delete(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: paymentMethodKeys.all });
        },
    });
}
