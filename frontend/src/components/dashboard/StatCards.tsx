import { Card, CardContent } from '@/components/ui/card';
import { TrendingUp, TrendingDown, Wallet, PiggyBank, Receipt } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StatCardProps {
    title: string;
    value: number;
    subtitle?: string;
    icon: 'wallet' | 'piggybank' | 'receipt' | 'trending';
    trend?: 'up' | 'down' | 'neutral';
    trendValue?: string;
    isCurrency?: boolean;
}

const icons = {
    wallet: Wallet,
    piggybank: PiggyBank,
    receipt: Receipt,
    trending: TrendingUp,
};

// Format KRW with tabular numbers for alignment
function formatKRW(value: number): string {
    return new Intl.NumberFormat('ko-KR', {
        style: 'currency',
        currency: 'KRW',
        maximumFractionDigits: 0,
    }).format(value);
}

// Format plain number
function formatNumber(value: number): string {
    return new Intl.NumberFormat('ko-KR').format(value);
}

function StatCard({ title, value, subtitle, icon, trend, trendValue, isCurrency = true }: StatCardProps) {
    const Icon = icons[icon];

    return (
        <Card className="bg-card border-border hover:bg-accent/5 transition-colors">
            <CardContent className="p-4 md:p-6">
                <div className="flex flex-col-reverse md:flex-row items-start justify-between gap-4">
                    <div className="space-y-1">
                        <p className="text-sm text-muted-foreground">{title}</p>
                        <p className="text-xl sm:text-2xl font-bold tabular-nums tracking-tight text-nowrap">
                            {isCurrency ? formatKRW(value) : formatNumber(value)}
                        </p>
                        {subtitle && (
                            <p className="text-xs text-muted-foreground text-nowrap">{subtitle}</p>
                        )}
                    </div>
                    <div
                        className={cn(
                            'p-2 rounded-lg shrink-0 self-start',
                            icon === 'piggybank' && 'bg-success/10 text-success',
                            icon === 'wallet' && 'bg-primary/10 text-primary',
                            icon === 'receipt' && 'bg-warning/10 text-warning',
                            icon === 'trending' && 'bg-chart-1/10 text-chart-1'
                        )}
                    >
                        <Icon className="w-5 h-5" />
                    </div>
                </div>
                {trend && trendValue && (
                    <div className="flex items-center gap-1 mt-3">
                        {trend === 'up' ? (
                            <TrendingUp className="w-3 h-3 text-success" />
                        ) : trend === 'down' ? (
                            <TrendingDown className="w-3 h-3 text-destructive" />
                        ) : null}
                        <span
                            className={cn(
                                'text-xs font-medium',
                                trend === 'up' && 'text-success',
                                trend === 'down' && 'text-destructive',
                                trend === 'neutral' && 'text-muted-foreground'
                            )}
                        >
                            {trendValue}
                        </span>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}

interface StatCardsProps {
    totalSpent: number;
    totalCashback: number;
    totalExpenses: number;
    budgetProgress: number;
}

export function StatCards({
    totalSpent,
    totalCashback,
    totalExpenses,
    budgetProgress,
}: StatCardsProps) {
    return (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
            <StatCard
                title="Total Spending"
                value={totalSpent}
                icon="wallet"
                subtitle="This month (net)"
            />
            <StatCard
                title="Cashback Earned"
                value={totalCashback}
                icon="piggybank"
                subtitle="This month"
                trend="up"
                trendValue="Saved!"
            />
            <StatCard
                title="Expenses"
                value={totalExpenses}
                icon="receipt"
                subtitle="Transactions"
                isCurrency={false}
            />
            <StatCard
                title="Budget Used"
                value={budgetProgress}
                icon="trending"
                subtitle={`${budgetProgress.toFixed(1)}% of budget`}
                trend={budgetProgress > 100 ? 'down' : budgetProgress > 80 ? 'neutral' : 'up'}
                trendValue={budgetProgress > 100 ? 'Over budget!' : budgetProgress > 80 ? 'Warning' : 'On track'}
                isCurrency={false}
            />
        </div>
    );
}
