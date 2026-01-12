import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format, startOfMonth } from 'date-fns';
import { Plus, ChevronLeft, ChevronRight, Pencil, Trash2 } from 'lucide-react';

import { api } from '@/lib/api';
import type { Income } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from '@/components/ui/dialog';

function formatKRW(value: number): string {
    return new Intl.NumberFormat('ko-KR', {
        style: 'currency',
        currency: 'KRW',
        maximumFractionDigits: 0,
    }).format(value);
}



export function IncomePage() {
    const queryClient = useQueryClient();
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingIncome, setEditingIncome] = useState<Income | null>(null);
    const [formData, setFormData] = useState({ month: '', amount: '', source: '' });

    // Fetch all income records
    const { data, isLoading } = useQuery({
        queryKey: ['income'],
        queryFn: () => api.income.list(),
    });

    // Create mutation
    const createMutation = useMutation({
        mutationFn: (data: { month: string; amount: number; source?: string }) =>
            api.income.create(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['income'] });
            queryClient.invalidateQueries({ queryKey: ['dashboard'] });
            setIsDialogOpen(false);
            resetForm();
        },
    });

    // Update mutation
    const updateMutation = useMutation({
        mutationFn: ({ id, data }: { id: string; data: { amount?: number; source?: string } }) =>
            api.income.update(id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['income'] });
            queryClient.invalidateQueries({ queryKey: ['dashboard'] });
            setIsDialogOpen(false);
            setEditingIncome(null);
            resetForm();
        },
    });

    // Delete mutation
    const deleteMutation = useMutation({
        mutationFn: (id: string) => api.income.delete(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['income'] });
            queryClient.invalidateQueries({ queryKey: ['dashboard'] });
        },
    });

    const resetForm = () => {
        setFormData({ month: '', amount: '', source: '' });
    };

    const openAddDialog = (month?: Date) => {
        setEditingIncome(null);
        setFormData({
            month: month ? format(startOfMonth(month), 'yyyy-MM-dd') : format(startOfMonth(new Date()), 'yyyy-MM-dd'),
            amount: '',
            source: 'Salary',
        });
        setIsDialogOpen(true);
    };

    const openEditDialog = (income: Income) => {
        setEditingIncome(income);
        setFormData({
            month: income.month,
            amount: String(income.amount),
            source: income.source || '',
        });
        setIsDialogOpen(true);
    };

    const handleSubmit = () => {
        const amount = parseInt(formData.amount.replace(/,/g, ''), 10);
        if (isNaN(amount) || amount < 0) return;

        if (editingIncome) {
            updateMutation.mutate({
                id: editingIncome.id,
                data: { amount, source: formData.source || undefined },
            });
        } else {
            createMutation.mutate({
                month: formData.month,
                amount,
                source: formData.source || undefined,
            });
        }
    };

    const handleDelete = (id: string) => {
        if (confirm('Are you sure you want to delete this income record?')) {
            deleteMutation.mutate(id);
        }
    };

    // Get income records for selected year
    const incomes = data?.income || [];
    const yearIncomes = incomes.filter((inc) => {
        const incYear = new Date(inc.month).getFullYear();
        return incYear === selectedYear;
    });

    // Generate all months for the year
    const months = Array.from({ length: 12 }, (_, i) => {
        const date = new Date(selectedYear, i, 1);
        return {
            date,
            monthStr: format(date, 'yyyy-MM-dd'),
            label: format(date, 'MMMM'),
            income: yearIncomes.find((inc) => {
                const incMonth = new Date(inc.month);
                return incMonth.getMonth() === i;
            }),
        };
    });

    // Calculate totals
    const totalYearIncome = yearIncomes.reduce((sum, inc) => sum + inc.amount, 0);
    const avgMonthlyIncome = yearIncomes.length > 0 ? totalYearIncome / yearIncomes.length : 0;

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold">Income</h1>
                <Button onClick={() => openAddDialog()}>
                    <Plus className="w-4 h-4 mr-2" />
                    Add Income
                </Button>
            </div>

            {/* Year Navigation */}
            <div className="flex items-center justify-center gap-4">
                <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setSelectedYear((y) => y - 1)}
                >
                    <ChevronLeft className="w-4 h-4" />
                </Button>
                <span className="text-lg font-semibold w-20 text-center">{selectedYear}</span>
                <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setSelectedYear((y) => y + 1)}
                    disabled={selectedYear >= new Date().getFullYear()}
                >
                    <ChevronRight className="w-4 h-4" />
                </Button>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card className="bg-card border-border">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">
                            Total {selectedYear} Income
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-2xl font-bold text-green-500">{formatKRW(totalYearIncome)}</p>
                    </CardContent>
                </Card>
                <Card className="bg-card border-border">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">
                            Average Monthly
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-2xl font-bold">{formatKRW(avgMonthlyIncome)}</p>
                    </CardContent>
                </Card>
            </div>

            {/* Monthly Income Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {months.map(({ date, label, income }) => (
                    <Card
                        key={label}
                        className={`bg-card border-border transition-colors ${income ? 'hover:border-green-500/50' : 'hover:border-primary/50'
                            }`}
                    >
                        <CardContent className="p-4">
                            <div className="flex items-center justify-between mb-2">
                                <span className="font-medium">{label}</span>
                                {income ? (
                                    <div className="flex gap-1">
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-8 w-8"
                                            onClick={() => openEditDialog(income)}
                                        >
                                            <Pencil className="w-4 h-4" />
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-8 w-8 text-destructive"
                                            onClick={() => handleDelete(income.id)}
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </Button>
                                    </div>
                                ) : (
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-8 w-8"
                                        onClick={() => openAddDialog(date)}
                                    >
                                        <Plus className="w-4 h-4" />
                                    </Button>
                                )}
                            </div>
                            {income ? (
                                <div>
                                    <p className="text-xl font-bold text-green-500">
                                        {formatKRW(income.amount)}
                                    </p>
                                    {income.source && (
                                        <p className="text-sm text-muted-foreground">{income.source}</p>
                                    )}
                                </div>
                            ) : (
                                <p className="text-muted-foreground text-sm">No income recorded</p>
                            )}
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* Add/Edit Dialog */}
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>
                            {editingIncome ? 'Edit Income' : 'Add Income'}
                        </DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label>Month</Label>
                            <Input
                                type="month"
                                value={formData.month.substring(0, 7)}
                                onChange={(e) =>
                                    setFormData({ ...formData, month: e.target.value + '-01' })
                                }
                                disabled={!!editingIncome}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Amount (₩)</Label>
                            <Input
                                type="text"
                                placeholder="3,500,000"
                                value={formData.amount}
                                onChange={(e) => {
                                    const value = e.target.value.replace(/[^0-9]/g, '');
                                    const formatted = value ? parseInt(value, 10).toLocaleString() : '';
                                    setFormData({ ...formData, amount: formatted });
                                }}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Source (optional)</Label>
                            <Input
                                type="text"
                                placeholder="Salary, Freelance, etc."
                                value={formData.source}
                                onChange={(e) => setFormData({ ...formData, source: e.target.value })}
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                            Cancel
                        </Button>
                        <Button
                            onClick={handleSubmit}
                            disabled={createMutation.isPending || updateMutation.isPending}
                        >
                            {createMutation.isPending || updateMutation.isPending
                                ? 'Saving...'
                                : 'Save'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
