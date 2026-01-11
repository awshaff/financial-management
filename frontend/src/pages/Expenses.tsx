import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Plus, Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { ExpenseForm } from '@/components/expenses/ExpenseForm';
import { ExpenseList } from '@/components/expenses/ExpenseList';
import { ExcelUpload } from '@/components/expenses/ExcelUpload';
import { useCategories } from '@/hooks/useCategories';
import { usePaymentMethods } from '@/hooks/usePaymentMethods';
import type { ExpenseFilters } from '@/types';

export function ExpensesPage() {
    const [searchParams] = useSearchParams();
    const [isAddOpen, setIsAddOpen] = useState(false);

    const [filters, setFilters] = useState<ExpenseFilters>(() => ({
        categoryId: searchParams.get('categoryId') || undefined,
        startDate: searchParams.get('startDate') || undefined,
        endDate: searchParams.get('endDate') || undefined,
    }));

    // Show filters panel if there are active filters
    const [showFilters, setShowFilters] = useState(() => {
        return !!(searchParams.get('categoryId') || searchParams.get('startDate') || searchParams.get('endDate'));
    });
    const [sortBy, setSortBy] = useState<string>('date');
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

    const { data: categories } = useCategories();
    const { data: paymentMethods } = usePaymentMethods();

    const handleSortChange = (column: string, order: 'asc' | 'desc') => {
        setSortBy(column);
        setSortOrder(order);
    };

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold">Expenses</h1>
                <div className="flex items-center gap-2">
                    <ExcelUpload />
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setShowFilters(!showFilters)}
                    >
                        <Filter className="w-4 h-4 mr-1.5" />
                        Filter
                    </Button>
                    <Button size="sm" onClick={() => setIsAddOpen(true)}>
                        <Plus className="w-4 h-4 mr-1.5" />
                        Add Expense
                    </Button>
                </div>
            </div>

            {/* Filters */}
            {showFilters && (
                <div className="flex flex-wrap gap-3 p-4 bg-card border border-border rounded-lg">
                    <Select
                        value={filters.categoryId || 'all'}
                        onValueChange={(value) =>
                            setFilters((f) => ({
                                ...f,
                                categoryId: value === 'all' ? undefined : value,
                            }))
                        }
                    >
                        <SelectTrigger className="w-40">
                            <SelectValue placeholder="All Categories" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Categories</SelectItem>
                            {categories?.map((cat) => (
                                <SelectItem key={cat.id} value={cat.id}>
                                    {cat.name}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>

                    <Select
                        value={filters.paymentMethodId || 'all'}
                        onValueChange={(value) =>
                            setFilters((f) => ({
                                ...f,
                                paymentMethodId: value === 'all' ? undefined : value,
                            }))
                        }
                    >
                        <SelectTrigger className="w-48">
                            <SelectValue placeholder="All Payment Methods" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Payment Methods</SelectItem>
                            {paymentMethods?.map((pm) => (
                                <SelectItem key={pm.id} value={pm.id}>
                                    {pm.name}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>

                    <div className="flex items-center gap-2">
                        <input
                            type="date"
                            value={filters.startDate || ''}
                            onChange={(e) =>
                                setFilters((f) => ({
                                    ...f,
                                    startDate: e.target.value || undefined,
                                }))
                            }
                            className="h-9 px-3 rounded-md border border-input bg-background text-sm"
                            placeholder="Start Date"
                        />
                        <span className="text-muted-foreground text-sm">→</span>
                        <input
                            type="date"
                            value={filters.endDate || ''}
                            onChange={(e) =>
                                setFilters((f) => ({
                                    ...f,
                                    endDate: e.target.value || undefined,
                                }))
                            }
                            className="h-9 px-3 rounded-md border border-input bg-background text-sm"
                            placeholder="End Date"
                        />
                    </div>

                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setFilters({})}
                    >
                        Clear Filters
                    </Button>
                </div>
            )}

            {/* Expense List */}
            <ExpenseList
                filters={filters}
                sortBy={sortBy}
                sortOrder={sortOrder}
                onSortChange={handleSortChange}
            />

            {/* Add Expense Dialog */}
            <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle>Add Expense</DialogTitle>
                    </DialogHeader>
                    <ExpenseForm
                        onSuccess={() => setIsAddOpen(false)}
                        onCancel={() => setIsAddOpen(false)}
                    />
                </DialogContent>
            </Dialog>
        </div>
    );
}
