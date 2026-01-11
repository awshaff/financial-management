import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            refetchOnWindowFocus: true,    // Refetch when tab gains focus (multi-device sync)
            refetchOnReconnect: true,      // Refetch when internet restored
            staleTime: 5 * 60 * 1000,      // 5 minutes - don't refetch unless stale
            refetchInterval: false,         // NO polling (battery killer)
            retry: 1,                       // Only retry once on failure
            gcTime: 10 * 60 * 1000,        // 10 minutes garbage collection time
        },
        mutations: {
            retry: 0,
        },
    },
});
