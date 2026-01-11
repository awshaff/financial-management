import { useState } from 'react';
import { format } from 'date-fns';
import { Trash2, Pencil, CreditCard, ChevronLeft, ChevronRight } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { useExpenses, useDeleteExpense } from '@/hooks/useExpenses';
import { ExpenseForm } from './ExpenseForm';
import type { Expense, ExpenseFilters } from '@/types';
import { toast } from 'sonner';
import { api } from '@/lib/api';

function formatKRW(value: number): string {
    return new Intl.NumberFormat('ko-KR', {
        style: 'currency',
        currency: 'KRW',
        maximumFractionDigits: 0,
    }).format(value);
}

function formatDate(dateStr: string): string {
    return format(new Date(dateStr), 'MMM d, yyyy');
}

interface ExpenseListProps {
    filters?: ExpenseFilters;
}

export function ExpenseList({ filters = {} }: ExpenseListProps) {
    const [page, setPage] = useState(1);
    const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const queryClient = useQueryClient();

    const { data, isLoading, error } = useExpenses({ ...filters, page, limit: 50 });
    const deleteExpense = useDeleteExpense();

    const bulkDeleteMutation = useMutation({
        mutationFn: (ids: string[]) => api.expenses.bulkDelete(ids),
        onSuccess: (data) => {
            toast.success(`Deleted ${data.deleted} expenses`);
            setSelectedIds(new Set());
            queryClient.invalidateQueries({ queryKey: ['expenses'] });
            queryClient.invalidateQueries({ queryKey: ['dashboard'] });
        },
        onError: () => {
            toast.error('Failed to delete expenses');
        },
    });

    const handleDelete = async (id: string) => {
        try {
            await deleteExpense.mutateAsync(id);
            toast.success('Expense deleted');
        } catch {
            toast.error('Failed to delete expense');
        }
    };

    const handleBulkDelete = () => {
        if (selectedIds.size === 0) return;
        bulkDeleteMutation.mutate(Array.from(selectedIds));
    };

    const toggleSelect = (id: string) => {
        const newSelected = new Set(selectedIds);
        if (newSelected.has(id)) {
            newSelected.delete(id);
        } else {
            newSelected.add(id);
        }
        setSelectedIds(newSelected);
    };

    const toggleSelectAll = () => {
        if (!data?.expenses) return;

        if (selectedIds.size === data.expenses.length) {
            setSelectedIds(new Set());
        } else {
            setSelectedIds(new Set(data.expenses.map((e) => e.id)));
        }
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    if (error) {
        return (
            <Card className="bg-destructive/10 border-destructive/20">
                <CardContent className="p-6 text-center">
                    <p className="text-destructive">Failed to load expenses</p>
                </CardContent>
            </Card>
        );
    }

    const expenses = data?.expenses || [];
    const pagination = data?.pagination;

    if (expenses.length === 0) {
        return (
            <Card className="bg-card border-border">
                <CardContent className="p-6 text-center">
                    <p className="text-muted-foreground">No expenses found</p>
                    <p className="text-sm text-muted-foreground mt-1">
                        Add your first expense to get started
                    </p>
                </CardContent>
            </Card>
        );
    }

    const isAllSelected = selectedIds.size === expenses.length && expenses.length > 0;
    const isSomeSelected = selectedIds.size > 0;

    return (
        <>
            {/* Bulk Actions Bar */}
            {isSomeSelected && (
                <div className="flex items-center justify-between p-3 mb-3 bg-primary/10 border border-primary/20 rounded-lg">
                    <span className="text-sm font-medium">
                        {selectedIds.size} expense{selectedIds.size > 1 ? 's' : ''} selected
                    </span>
                    <div className="flex items-center gap-2">
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setSelectedIds(new Set())}
                        >
                            Clear
                        </Button>
                        <Button
                            variant="destructive"
                            size="sm"
                            onClick={handleBulkDelete}
                            disabled={bulkDeleteMutation.isPending}
                        >
                            <Trash2 className="w-4 h-4 mr-1.5" />
                            {bulkDeleteMutation.isPending ? 'Deleting...' : 'Delete Selected'}
                        </Button>
                    </div>
                </div>
            )}

            {/* Desktop Table View */}
            <div className="hidden md:block">
                <Card className="bg-card border-border">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="w-12">
                                    <Checkbox
                                        checked={isAllSelected}
                                        onCheckedChange={toggleSelectAll}
                                        aria-label="Select all"
                                    />
                                </TableHead>
                                <TableHead>Date</TableHead>
                                <TableHead>Merchant</TableHead>
                                <TableHead>Category</TableHead>
                                <TableHead>Payment</TableHead>
                                <TableHead className="text-right">Amount</TableHead>
                                <TableHead className="text-right">Cashback</TableHead>
                                <TableHead className="text-right">Net</TableHead>
                                <TableHead className="w-24"></TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {expenses.map((expense) => (
                                <TableRow
                                    key={expense.id}
                                    className={selectedIds.has(expense.id) ? 'bg-primary/5' : ''}
                                >
                                    <TableCell>
                                        <Checkbox
                                            checked={selectedIds.has(expense.id)}
                                            onCheckedChange={() => toggleSelect(expense.id)}
                                            aria-label={`Select ${expense.merchant}`}
                                        />
                                    </TableCell>
                                    <TableCell className="text-sm">
                                        {formatDate(expense.date)}
                                    </TableCell>
                                    <TableCell className="font-medium">{expense.merchant}</TableCell>
                                    <TableCell>
                                        <Badge variant="secondary">{expense.category.name}</Badge>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex items-center gap-1.5">
                                            {expense.paymentMethod.type === 'Credit Card' && (
                                                <CreditCard className="w-3.5 h-3.5 text-muted-foreground" />
                                            )}
                                            <span className="text-sm text-muted-foreground">
                                                {expense.paymentMethod.name}
                                            </span>
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-right tabular-nums">
                                        {formatKRW(expense.amount)}
                                    </TableCell>
                                    <TableCell className="text-right tabular-nums">
                                        {expense.cashbackAmount > 0 ? (
                                            <span className="text-success">
                                                -{formatKRW(expense.cashbackAmount)}
                                            </span>
                                        ) : (
                                            <span className="text-muted-foreground">—</span>
                                        )}
                                    </TableCell>
                                    <TableCell className="text-right font-medium tabular-nums">
                                        {formatKRW(expense.amountNet)}
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex items-center gap-1">
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="h-8 w-8 p-0"
                                                onClick={() => setEditingExpense(expense)}
                                            >
                                                <Pencil className="w-4 h-4" />
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                                                onClick={() => handleDelete(expense.id)}
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </Card>
            </div>

            {/* Mobile Card View */}
            <div className="md:hidden space-y-3">
                {expenses.map((expense) => (
                    <Card
                        key={expense.id}
                        className={`bg-card border-border ${selectedIds.has(expense.id) ? 'ring-2 ring-primary' : ''}`}
                    >
                        <CardContent className="p-4">
                            <div className="flex items-start gap-3">
                                <Checkbox
                                    checked={selectedIds.has(expense.id)}
                                    onCheckedChange={() => toggleSelect(expense.id)}
                                    aria-label={`Select ${expense.merchant}`}
                                    className="mt-1"
                                />
                                <div className="flex-1">
                                    <div className="flex items-start justify-between">
                                        <div className="space-y-1">
                                            <p className="font-medium">{expense.merchant}</p>
                                            <p className="text-sm text-muted-foreground">
                                                {formatDate(expense.date)}
                                            </p>
                                            <div className="flex items-center gap-2 mt-2">
                                                <Badge variant="secondary" className="text-xs">
                                                    {expense.category.name}
                                                </Badge>
                                                {expense.paymentMethod.type === 'Credit Card' && (
                                                    <Badge variant="outline" className="text-xs gap-1">
                                                        <CreditCard className="w-3 h-3" />
                                                        {expense.paymentMethod.cashbackPercentage}%
                                                    </Badge>
                                                )}
                                            </div>
                                        </div>
                                        <div className="text-right space-y-1">
                                            <p className="font-semibold tabular-nums">
                                                {formatKRW(expense.amountNet)}
                                            </p>
                                            {expense.cashbackAmount > 0 && (
                                                <p className="text-xs text-success tabular-nums">
                                                    Saved {formatKRW(expense.cashbackAmount)}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2 mt-3 pt-3 border-t border-border">
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="flex-1 h-9"
                                            onClick={() => setEditingExpense(expense)}
                                        >
                                            <Pencil className="w-4 h-4 mr-1.5" />
                                            Edit
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="flex-1 h-9 text-destructive hover:text-destructive"
                                            onClick={() => handleDelete(expense.id)}
                                        >
                                            <Trash2 className="w-4 h-4 mr-1.5" />
                                            Delete
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* Pagination */}
            {pagination && pagination.totalPages > 1 && (
                <div className="flex items-center justify-center gap-2 mt-4">
                    <Button
                        variant="outline"
                        size="sm"
                        disabled={page === 1}
                        onClick={() => setPage((p) => p - 1)}
                    >
                        <ChevronLeft className="w-4 h-4" />
                    </Button>
                    <span className="text-sm text-muted-foreground">
                        Page {page} of {pagination.totalPages}
                    </span>
                    <Button
                        variant="outline"
                        size="sm"
                        disabled={page === pagination.totalPages}
                        onClick={() => setPage((p) => p + 1)}
                    >
                        <ChevronRight className="w-4 h-4" />
                    </Button>
                </div>
            )}

            {/* Edit Dialog */}
            <Dialog open={!!editingExpense} onOpenChange={() => setEditingExpense(null)}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle>Edit Expense</DialogTitle>
                    </DialogHeader>
                    {editingExpense && (
                        <ExpenseForm
                            expense={editingExpense}
                            onSuccess={() => setEditingExpense(null)}
                            onCancel={() => setEditingExpense(null)}
                        />
                    )}
                </DialogContent>
            </Dialog>
        </>
    );
}
