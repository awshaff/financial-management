import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { CreateCategoryInput } from '@/types';

// Query keys
export const categoryKeys = {
    all: ['categories'] as const,
    list: () => [...categoryKeys.all, 'list'] as const,
};

// Fetch all categories
export function useCategories() {
    return useQuery({
        queryKey: categoryKeys.list(),
        queryFn: () => api.categories.list(),
        select: (data) => data.categories,
    });
}

// Create category
export function useCreateCategory() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (data: CreateCategoryInput) => api.categories.create(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: categoryKeys.all });
        },
    });
}

// Update category
export function useUpdateCategory() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ id, ...data }: { id: string } & Partial<CreateCategoryInput>) =>
            api.categories.update(id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: categoryKeys.all });
        },
    });
}

// Delete category
export function useDeleteCategory() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (id: string) => api.categories.delete(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: categoryKeys.all });
        },
    });
}
