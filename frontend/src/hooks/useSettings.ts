import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

export const settingsKeys = {
    all: ['settings'] as const,
};

export function useSettings() {
    return useQuery({
        queryKey: settingsKeys.all,
        queryFn: () => api.settings.get(),
        staleTime: 1000 * 60 * 5, // 5 minutes
    });
}

export function useUpdateSettings() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (data: { billingCycleStartDay?: number; billingCycleEndDay?: number }) =>
            api.settings.update(data),
        onSuccess: (data) => {
            queryClient.setQueryData(settingsKeys.all, data);
        },
    });
}
