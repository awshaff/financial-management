import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';

interface BudgetItem {
    categoryId: string;
    categoryName: string;
    budget: number;
    spent: number;
    remaining: number;
    percentage: number;
    status: 'on-track' | 'warning' | 'over-budget';
}

interface BudgetProgressProps {
    data: BudgetItem[];
}

function formatKRW(value: number): string {
    return new Intl.NumberFormat('ko-KR', {
        style: 'currency',
        currency: 'KRW',
        maximumFractionDigits: 0,
    }).format(value);
}

export function BudgetProgress({ data }: BudgetProgressProps) {
    if (!data || data.length === 0) {
        return (
            <Card className="bg-card border-border">
                <CardHeader className="pb-2">
                    <CardTitle className="text-base font-semibold">
                        Budget Overview
                    </CardTitle>
                </CardHeader>
                <CardContent className="flex items-center justify-center h-32">
                    <p className="text-muted-foreground text-sm">
                        No budgets set. Add budgets in Settings.
                    </p>
                </CardContent>
            </Card>
        );
    }

    // Filter to only show categories with budgets set
    const categoriesWithBudgets = data.filter((item) => item.budget > 0);

    if (categoriesWithBudgets.length === 0) {
        return (
            <Card className="bg-card border-border">
                <CardHeader className="pb-2">
                    <CardTitle className="text-base font-semibold">
                        Budget Overview
                    </CardTitle>
                </CardHeader>
                <CardContent className="flex items-center justify-center h-32">
                    <p className="text-muted-foreground text-sm">
                        No budgets set. Add budgets in Settings.
                    </p>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card className="bg-card border-border">
            <CardHeader className="pb-2">
                <CardTitle className="text-base font-semibold">
                    Budget Overview
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                {categoriesWithBudgets.slice(0, 5).map((item) => (
                    <div key={item.categoryId} className="space-y-2">
                        <div className="flex items-center justify-between">
                            <span className="text-sm font-medium">{item.categoryName}</span>
                            <div className="flex items-center gap-2">
                                <span
                                    className={cn(
                                        'text-xs font-medium px-1.5 py-0.5 rounded',
                                        item.status === 'on-track' && 'bg-success/10 text-success',
                                        item.status === 'warning' && 'bg-warning/10 text-warning',
                                        item.status === 'over-budget' && 'bg-destructive/10 text-destructive'
                                    )}
                                >
                                    {item.percentage.toFixed(0)}%
                                </span>
                            </div>
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
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                            <span className="tabular-nums">{formatKRW(item.spent)} spent</span>
                            <span className="tabular-nums">{formatKRW(item.budget)} budget</span>
                        </div>
                    </div>
                ))}
            </CardContent>
        </Card>
    );
}
