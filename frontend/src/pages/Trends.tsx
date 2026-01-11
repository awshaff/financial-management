import { useTrends } from '@/hooks/useDashboard';
import { TrendChart } from '@/components/dashboard/TrendChart';

export function TrendsPage() {
    const { data: trends, isLoading } = useTrends();

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <h1 className="text-2xl font-bold">Trends</h1>
            <TrendChart data={trends || []} />
        </div>
    );
}
