import { useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { format, subMonths, addMonths } from 'date-fns';
import { useDashboardSummary } from '@/hooks/useDashboard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

function formatKRW(value: number): string {
    return new Intl.NumberFormat('ko-KR', {
        style: 'currency',
        currency: 'KRW',
        maximumFractionDigits: 0,
    }).format(value);
}

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

export function BudgetPage() {
    const [selectedMonth, setSelectedMonth] = useState(() => new Date());

    const billingCycle = useMemo(() => getBillingCycleDates(selectedMonth), [selectedMonth]);

    const { data: summary, isLoading } = useDashboardSummary(billingCycle);

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

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    const budgetStatus = summary?.budgetStatus || [];
    const totalBudget = budgetStatus.reduce((sum, item) => sum + item.budget, 0);
    const totalSpent = budgetStatus.reduce((sum, item) => sum + item.spent, 0);
    const totalRemaining = totalBudget - totalSpent;
    const overallPercentage = totalBudget > 0 ? (totalSpent / totalBudget) * 100 : 0;

    return (
        <div className="space-y-6">
            {/* Header with Month Selector */}
            <div className="flex items-center justify-between flex-wrap gap-4">
                <h1 className="text-2xl font-bold">Budget</h1>

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

            {/* Overall Budget Summary */}
            <Card className="bg-card border-border">
                <CardHeader className="pb-2">
                    <CardTitle className="text-base font-semibold">Overall Budget</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <Progress
                        value={Math.min(overallPercentage, 100)}
                        className={cn(
                            'h-3',
                            overallPercentage <= 80 && '[&>div]:bg-success',
                            overallPercentage > 80 && overallPercentage <= 100 && '[&>div]:bg-warning',
                            overallPercentage > 100 && '[&>div]:bg-destructive'
                        )}
                    />
                    <div className="grid grid-cols-3 gap-4 text-center">
                        <div>
                            <p className="text-sm text-muted-foreground">Budget</p>
                            <p className="text-lg font-semibold tabular-nums">{formatKRW(totalBudget)}</p>
                        </div>
                        <div>
                            <p className="text-sm text-muted-foreground">Spent</p>
                            <p className="text-lg font-semibold tabular-nums">{formatKRW(totalSpent)}</p>
                        </div>
                        <div>
                            <p className="text-sm text-muted-foreground">Remaining</p>
                            <p
                                className={cn(
                                    'text-lg font-semibold tabular-nums',
                                    totalRemaining >= 0 ? 'text-success' : 'text-destructive'
                                )}
                            >
                                {formatKRW(totalRemaining)}
                            </p>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Category Budgets */}
            <div className="grid gap-4">
                {budgetStatus.length === 0 ? (
                    <Card className="bg-card border-border">
                        <CardContent className="p-6 text-center">
                            <p className="text-muted-foreground">No budgets set</p>
                            <p className="text-sm text-muted-foreground mt-1">
                                Set budgets for categories in Settings
                            </p>
                        </CardContent>
                    </Card>
                ) : (
                    budgetStatus.map((item) => (
                        <Card key={item.categoryId} className="bg-card border-border">
                            <CardContent className="p-4 space-y-3">
                                <div className="flex items-center justify-between">
                                    <span className="font-medium">{item.categoryName}</span>
                                    <span
                                        className={cn(
                                            'text-sm font-medium px-2 py-0.5 rounded',
                                            item.status === 'on-track' && 'bg-success/10 text-success',
                                            item.status === 'warning' && 'bg-warning/10 text-warning',
                                            item.status === 'over-budget' && 'bg-destructive/10 text-destructive'
                                        )}
                                    >
                                        {item.percentage.toFixed(0)}%
                                    </span>
                                </div>
                                <Progress
                                    value={Math.min(item.percentage, 100)}
                                    className={cn(
                                        'h-2',
                                        item.status === 'on-track' && '[&>div]:bg-success',
                                        item.status === 'warning' && '[&>div]:bg-warning',
                                        item.status === 'over-budget' && '[&>div]:bg-destructive'
                                    )}
                                />
                                <div className="flex items-center justify-between text-sm">
                                    <span className="text-muted-foreground tabular-nums">
                                        {formatKRW(item.spent)} of {formatKRW(item.budget)}
                                    </span>
                                    <span
                                        className={cn(
                                            'tabular-nums',
                                            item.remaining >= 0 ? 'text-success' : 'text-destructive'
                                        )}
                                    >
                                        {item.remaining >= 0 ? '+' : ''}
                                        {formatKRW(item.remaining)}
                                    </span>
                                </div>
                            </CardContent>
                        </Card>
                    ))
                )}
            </div>
        </div>
    );
}
