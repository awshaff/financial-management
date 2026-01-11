import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface MonthlyTrend {
    month: string;
    totalSpent: number;
    totalCashback: number;
}

interface TrendChartProps {
    data: MonthlyTrend[];
}

function formatKRW(value: number): string {
    return new Intl.NumberFormat('ko-KR', {
        style: 'currency',
        currency: 'KRW',
        maximumFractionDigits: 0,
        notation: 'compact',
    }).format(value);
}

function formatMonth(month: string): string {
    const [year, monthNum] = month.split('-');
    const date = new Date(parseInt(year), parseInt(monthNum) - 1);
    return date.toLocaleDateString('en-US', { month: 'short' });
}

interface CustomTooltipProps {
    active?: boolean;
    payload?: Array<{ value: number; dataKey: string }>;
    label?: string;
}

function CustomTooltip({ active, payload, label }: CustomTooltipProps) {
    if (active && payload && payload.length) {
        return (
            <div className="bg-popover border border-border rounded-lg p-3 shadow-lg">
                <p className="font-medium text-sm mb-2">{label}</p>
                {payload.map((entry, index) => (
                    <p
                        key={index}
                        className="text-sm tabular-nums"
                        style={{ color: entry.dataKey === 'totalSpent' ? 'oklch(0.65 0.18 250)' : 'oklch(0.65 0.2 145)' }}
                    >
                        {entry.dataKey === 'totalSpent' ? 'Spent: ' : 'Cashback: '}
                        {formatKRW(entry.value)}
                    </p>
                ))}
            </div>
        );
    }
    return null;
}

export function TrendChart({ data }: TrendChartProps) {
    if (!data || data.length === 0) {
        return (
            <Card className="bg-card border-border">
                <CardHeader className="pb-2">
                    <CardTitle className="text-base font-semibold">
                        6-Month Spending Trend
                    </CardTitle>
                </CardHeader>
                <CardContent className="flex items-center justify-center h-[280px]">
                    <p className="text-muted-foreground text-sm">No trend data yet</p>
                </CardContent>
            </Card>
        );
    }

    const formattedData = data.map((item) => ({
        ...item,
        monthLabel: formatMonth(item.month),
    }));

    return (
        <Card className="bg-card border-border">
            <CardHeader className="pb-2">
                <CardTitle className="text-base font-semibold">
                    6-Month Spending Trend
                </CardTitle>
            </CardHeader>
            <CardContent>
                <ResponsiveContainer width="100%" height={280}>
                    <LineChart data={formattedData}>
                        <CartesianGrid
                            strokeDasharray="3 3"
                            stroke="oklch(0.3 0 0)"
                            vertical={false}
                        />
                        <XAxis
                            dataKey="monthLabel"
                            stroke="oklch(0.7 0 0)"
                            fontSize={12}
                            tickLine={false}
                            axisLine={false}
                        />
                        <YAxis
                            stroke="oklch(0.7 0 0)"
                            fontSize={12}
                            tickLine={false}
                            axisLine={false}
                            tickFormatter={(value) => formatKRW(value)}
                            width={70}
                        />
                        <Tooltip content={<CustomTooltip />} />
                        <Line
                            type="monotone"
                            dataKey="totalSpent"
                            stroke="oklch(0.65 0.18 250)"
                            strokeWidth={2}
                            dot={{ r: 4, fill: 'oklch(0.65 0.18 250)' }}
                            activeDot={{ r: 6 }}
                        />
                        <Line
                            type="monotone"
                            dataKey="totalCashback"
                            stroke="oklch(0.65 0.2 145)"
                            strokeWidth={2}
                            dot={{ r: 4, fill: 'oklch(0.65 0.2 145)' }}
                            activeDot={{ r: 6 }}
                        />
                    </LineChart>
                </ResponsiveContainer>
                <div className="flex items-center justify-center gap-6 mt-4">
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-[oklch(0.65_0.18_250)]" />
                        <span className="text-xs text-muted-foreground">Spending</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-[oklch(0.65_0.2_145)]" />
                        <span className="text-xs text-muted-foreground">Cashback</span>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
