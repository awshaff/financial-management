import { useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { format, subMonths, addMonths } from 'date-fns';
import { useDashboardSummary, useTrends } from '@/hooks/useDashboard';
import { StatCards } from '@/components/dashboard/StatCards';
import { SpendingChart } from '@/components/dashboard/SpendingChart';
import { TrendChart } from '@/components/dashboard/TrendChart';
import { BudgetProgress } from '@/components/dashboard/BudgetProgress';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';

// Billing cycle: 27th of previous month to 26th of selected month
function getBillingCycleDates(selectedMonth: Date) {
    const year = selectedMonth.getFullYear();
    const month = selectedMonth.getMonth(); // 0-indexed

    // Start: 27th of previous month
    const prevMonth = month === 0 ? 11 : month - 1;
    const prevYear = month === 0 ? year - 1 : year;
    const startDate = `${prevYear}-${String(prevMonth + 1).padStart(2, '0')}-27`;

    // End: 26th of selected month
    const endDate = `${year}-${String(month + 1).padStart(2, '0')}-26`;

    return { startDate, endDate };
}

export function DashboardPage() {
    const [selectedMonth, setSelectedMonth] = useState(() => new Date());

    const billingCycle = useMemo(() => getBillingCycleDates(selectedMonth), [selectedMonth]);

    const { data: summary, isLoading: summaryLoading } = useDashboardSummary(billingCycle);
    const { data: trends, isLoading: trendsLoading } = useTrends();

    const handlePrevMonth = () => {
        setSelectedMonth(prev => subMonths(prev, 1));
    };

    const handleNextMonth = () => {
        setSelectedMonth(prev => addMonths(prev, 1));
    };

    const isCurrentMonth = useMemo(() => {
        const now = new Date();
        return selectedMonth.getMonth() === now.getMonth() &&
            selectedMonth.getFullYear() === now.getFullYear();
    }, [selectedMonth]);

    if (summaryLoading || trendsLoading) {
        return (
            <div className="space-y-6">
                <div className="flex items-center justify-between">
                    <Skeleton className="h-8 w-32" />
                    <Skeleton className="h-10 w-64" />
                </div>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
                    {[...Array(4)].map((_, i) => (
                        <Skeleton key={i} className="h-28 rounded-lg" />
                    ))}
                </div>
                <div className="grid md:grid-cols-2 gap-4">
                    <Skeleton className="h-80 rounded-lg" />
                    <Skeleton className="h-80 rounded-lg" />
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header with Month Selector */}
            <div className="flex items-center justify-between flex-wrap gap-4">
                <h1 className="text-2xl font-bold">Dashboard</h1>

                {/* Month Selector - Compact */}
                <div className="flex flex-col items-center gap-0.5">
                    <div className="flex items-center gap-1">
                        <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0"
                            onClick={handlePrevMonth}
                        >
                            <ChevronLeft className="w-4 h-4" />
                        </Button>

                        <span className="font-medium text-sm min-w-[100px] text-center">
                            {format(selectedMonth, 'MMMM yyyy')}
                        </span>

                        <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0"
                            onClick={handleNextMonth}
                            disabled={isCurrentMonth}
                        >
                            <ChevronRight className="w-4 h-4" />
                        </Button>
                    </div>
                    <span className="text-[10px] text-muted-foreground">
                        {billingCycle.startDate} → {billingCycle.endDate}
                    </span>
                </div>
            </div>

            {/* Stat Cards */}
            <StatCards
                totalSpent={summary?.totalSpent || 0}
                totalCashback={summary?.totalCashback || 0}
                totalExpenses={summary?.totalExpenses || 0}
                budgetProgress={summary?.budgetProgress || 0}
            />

            {/* Charts */}
            <div className="grid md:grid-cols-2 gap-4">
                <SpendingChart data={summary?.categoryBreakdown || []} />
                <BudgetProgress data={summary?.budgetStatus || []} />
            </div>

            {/* Trend Chart */}
            <TrendChart data={trends || []} />
        </div>
    );
}
