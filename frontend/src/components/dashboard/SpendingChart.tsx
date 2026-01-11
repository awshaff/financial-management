import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface CategoryBreakdown {
    category: string;
    spent: number;
    percentage: number;
    [key: string]: string | number;
}

interface SpendingChartProps {
    data: CategoryBreakdown[];
}

// Beautiful color palette for chart
const COLORS = [
    'oklch(0.65 0.18 250)',   // Primary blue
    'oklch(0.7 0.2 160)',     // Teal
    'oklch(0.75 0.18 45)',    // Orange
    'oklch(0.6 0.2 310)',     // Purple
    'oklch(0.55 0.2 27)',     // Red
    'oklch(0.65 0.15 200)',   // Cyan
    'oklch(0.7 0.18 100)',    // Yellow-green
    'oklch(0.6 0.15 280)',    // Violet
];

function formatKRW(value: number): string {
    return new Intl.NumberFormat('ko-KR', {
        style: 'currency',
        currency: 'KRW',
        maximumFractionDigits: 0,
    }).format(value);
}

interface CustomTooltipProps {
    active?: boolean;
    payload?: Array<{ payload: CategoryBreakdown }>;
}

function CustomTooltip({ active, payload }: CustomTooltipProps) {
    if (active && payload && payload.length) {
        const data = payload[0].payload;
        return (
            <div className="bg-popover border border-border rounded-lg p-3 shadow-lg">
                <p className="font-medium text-sm">{data.category}</p>
                <p className="text-muted-foreground text-sm tabular-nums">
                    {formatKRW(data.spent)}
                </p>
                <p className="text-xs text-muted-foreground">
                    {data.percentage.toFixed(1)}% of total
                </p>
            </div>
        );
    }
    return null;
}

export function SpendingChart({ data }: SpendingChartProps) {
    if (!data || data.length === 0) {
        return (
            <Card className="bg-card border-border">
                <CardHeader className="pb-2">
                    <CardTitle className="text-base font-semibold">
                        Spending by Category
                    </CardTitle>
                </CardHeader>
                <CardContent className="flex items-center justify-center h-[280px]">
                    <p className="text-muted-foreground text-sm">No spending data yet</p>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card className="bg-card border-border">
            <CardHeader className="pb-2">
                <CardTitle className="text-base font-semibold">
                    Spending by Category
                </CardTitle>
            </CardHeader>
            <CardContent>
                <ResponsiveContainer width="100%" height={280}>
                    <PieChart>
                        <Pie
                            data={data}
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={100}
                            paddingAngle={2}
                            dataKey="spent"
                            nameKey="category"
                        >
                            {data.map((_, index) => (
                                <Cell
                                    key={`cell-${index}`}
                                    fill={COLORS[index % COLORS.length]}
                                    stroke="transparent"
                                />
                            ))}
                        </Pie>
                        <Tooltip content={<CustomTooltip />} />
                        <Legend
                            verticalAlign="bottom"
                            layout="horizontal"
                            wrapperStyle={{ paddingTop: 16 }}
                            formatter={(value) => (
                                <span className="text-xs text-muted-foreground">{value}</span>
                            )}
                        />
                    </PieChart>
                </ResponsiveContainer>
            </CardContent>
        </Card>
    );
}
