import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format } from 'date-fns';
import { CreditCard } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { useCategories } from '@/hooks/useCategories';
import { usePaymentMethods } from '@/hooks/usePaymentMethods';
import { useCreateExpense, useUpdateExpense } from '@/hooks/useExpenses';
import type { Expense } from '@/types';
import { toast } from 'sonner';

const expenseSchema = z.object({
    date: z.string().min(1, 'Date is required'),
    merchant: z.string().min(1, 'Merchant is required').max(255),
    amount: z.number().min(1, 'Amount must be at least 1'),
    categoryId: z.string().min(1, 'Category is required'),
    paymentMethodId: z.string().min(1, 'Payment method is required'),
});

type ExpenseFormData = z.infer<typeof expenseSchema>;

interface ExpenseFormProps {
    expense?: Expense;
    onSuccess?: () => void;
    onCancel?: () => void;
}

function formatKRW(value: number): string {
    return new Intl.NumberFormat('ko-KR', {
        style: 'currency',
        currency: 'KRW',
        maximumFractionDigits: 0,
    }).format(value);
}

export function ExpenseForm({ expense, onSuccess, onCancel }: ExpenseFormProps) {
    const { data: categories, isLoading: categoriesLoading } = useCategories();
    const { data: paymentMethods, isLoading: paymentMethodsLoading } = usePaymentMethods();
    const createExpense = useCreateExpense();
    const updateExpense = useUpdateExpense();

    const isEditing = !!expense;

    const {
        register,
        handleSubmit,
        watch,
        setValue,
        formState: { errors },
    } = useForm<ExpenseFormData>({
        resolver: zodResolver(expenseSchema),
        defaultValues: {
            date: expense?.date || format(new Date(), 'yyyy-MM-dd'),
            merchant: expense?.merchant || '',
            amount: expense?.amount || 0,
            categoryId: expense?.category?.id || '',
            paymentMethodId: expense?.paymentMethod?.id || '',
        },
    });

    const paymentMethodId = watch('paymentMethodId');
    const amount = watch('amount');

    // Find selected payment method for cashback calculation
    const selectedMethod = paymentMethods?.find((pm) => pm.id === paymentMethodId);

    // Calculate cashback preview (client-side preview only, server calculates actual)
    const isCreditCard = selectedMethod?.type === 'Credit Card';
    const cashbackPercentage = selectedMethod?.cashbackPercentage
        ? parseFloat(selectedMethod.cashbackPercentage)
        : 0;
    const cashbackAmount =
        isCreditCard && amount > 0
            ? Math.round(amount * (cashbackPercentage / 100))
            : 0;
    const amountNet = amount > 0 ? amount - cashbackAmount : 0;

    const onSubmit = async (data: ExpenseFormData) => {
        try {
            if (isEditing) {
                await updateExpense.mutateAsync({ id: expense.id, ...data });
                toast.success('Expense updated successfully');
            } else {
                await createExpense.mutateAsync(data);
                toast.success('Expense added successfully');
            }
            onSuccess?.();
        } catch (error) {
            toast.error(
                isEditing ? 'Failed to update expense' : 'Failed to add expense'
            );
        }
    };

    const isLoading =
        categoriesLoading ||
        paymentMethodsLoading ||
        createExpense.isPending ||
        updateExpense.isPending;

    return (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {/* Date */}
            <div className="space-y-2">
                <Label htmlFor="date">Date</Label>
                <Input type="date" id="date" {...register('date')} />
                {errors.date && (
                    <p className="text-sm text-destructive">{errors.date.message}</p>
                )}
            </div>

            {/* Merchant */}
            <div className="space-y-2">
                <Label htmlFor="merchant">Merchant</Label>
                <Input
                    id="merchant"
                    placeholder="e.g., Starbucks Gangnam"
                    {...register('merchant')}
                />
                {errors.merchant && (
                    <p className="text-sm text-destructive">{errors.merchant.message}</p>
                )}
            </div>

            {/* Amount */}
            <div className="space-y-2">
                <Label htmlFor="amount">Amount (₩)</Label>
                <Input
                    id="amount"
                    type="number"
                    placeholder="5000"
                    {...register('amount', { valueAsNumber: true })}
                />
                {errors.amount && (
                    <p className="text-sm text-destructive">{errors.amount.message}</p>
                )}
            </div>

            {/* Category */}
            <div className="space-y-2">
                <Label>Category</Label>
                <Select
                    value={watch('categoryId')}
                    onValueChange={(value) => setValue('categoryId', value)}
                >
                    <SelectTrigger>
                        <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                        {categories?.map((cat) => (
                            <SelectItem key={cat.id} value={cat.id}>
                                {cat.name}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
                {errors.categoryId && (
                    <p className="text-sm text-destructive">{errors.categoryId.message}</p>
                )}
            </div>

            {/* Payment Method */}
            <div className="space-y-2">
                <Label>Payment Method</Label>
                <Select
                    value={watch('paymentMethodId')}
                    onValueChange={(value) => setValue('paymentMethodId', value)}
                >
                    <SelectTrigger>
                        <SelectValue placeholder="Select payment method" />
                    </SelectTrigger>
                    <SelectContent>
                        {paymentMethods?.map((method) => (
                            <SelectItem key={method.id} value={method.id}>
                                {method.name}
                                {method.type === 'Credit Card' && method.cashbackPercentage && (
                                    <span className="text-success ml-2">
                                        ({method.cashbackPercentage}% cashback)
                                    </span>
                                )}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
                {errors.paymentMethodId && (
                    <p className="text-sm text-destructive">
                        {errors.paymentMethodId.message}
                    </p>
                )}
            </div>

            {/* Cashback Preview Card - v4.0 Key Feature */}
            {isCreditCard && cashbackAmount > 0 && (
                <Card className="bg-success/10 border-success/20">
                    <CardContent className="p-4">
                        <div className="flex items-center gap-2 text-success mb-3">
                            <CreditCard className="w-5 h-5" />
                            <span className="font-medium">
                                {selectedMethod?.name}: {cashbackPercentage}% cashback
                            </span>
                        </div>
                        <div className="space-y-1 text-sm">
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">Original:</span>
                                <span className="tabular-nums">{formatKRW(amount)}</span>
                            </div>
                            <div className="flex justify-between text-success">
                                <span>Cashback:</span>
                                <span className="tabular-nums">-{formatKRW(cashbackAmount)}</span>
                            </div>
                            <div className="flex justify-between font-semibold pt-2 border-t border-border">
                                <span>Net Cost:</span>
                                <span className="tabular-nums">{formatKRW(amountNet)}</span>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Actions */}
            <div className="flex gap-3 pt-2">
                {onCancel && (
                    <Button type="button" variant="outline" className="flex-1" onClick={onCancel}>
                        Cancel
                    </Button>
                )}
                <Button type="submit" className="flex-1" disabled={isLoading}>
                    {isLoading ? 'Saving...' : isEditing ? 'Update Expense' : 'Save Expense'}
                </Button>
            </div>
        </form>
    );
}
