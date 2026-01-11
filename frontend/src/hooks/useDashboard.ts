import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';

// Query keys
export const dashboardKeys = {
    all: ['dashboard'] as const,
    summary: (startDate?: string, endDate?: string) =>
        [...dashboardKeys.all, 'summary', startDate, endDate] as const,
    trends: () => [...dashboardKeys.all, 'trends'] as const,
};

interface BillingCycleDates {
    startDate: string;
    endDate: string;
}

// Fetch dashboard summary with billing cycle dates
export function useDashboardSummary(dates?: BillingCycleDates) {
    return useQuery({
        queryKey: dashboardKeys.summary(dates?.startDate, dates?.endDate),
        queryFn: () => api.dashboard.summary(dates?.startDate, dates?.endDate),
    });
}

// Fetch monthly trends (last 6 months)
export function useTrends() {
    return useQuery({
        queryKey: dashboardKeys.trends(),
        queryFn: () => api.dashboard.trends(),
        select: (data) => data.months,
    });
}
