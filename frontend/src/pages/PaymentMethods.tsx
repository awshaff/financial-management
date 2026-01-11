import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus, CreditCard, Wallet, Building, Trash2, Pencil } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
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
import {
    usePaymentMethods,
    useCreatePaymentMethod,
    useUpdatePaymentMethod,
    useDeletePaymentMethod,
} from '@/hooks/usePaymentMethods';
import type { PaymentMethod, PaymentType } from '@/types';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

const paymentMethodSchema = z.object({
    name: z.string().min(1, 'Name is required').max(100),
    type: z.enum(['Cash', 'Credit Card', 'Debit Card', 'Bank Transfer']),
    cashbackPercentage: z.string().optional(),
    isDefault: z.boolean(),
});

type PaymentMethodFormData = z.infer<typeof paymentMethodSchema>;

interface PaymentMethodFormProps {
    method?: PaymentMethod;
    onSuccess: () => void;
    onCancel: () => void;
}

function PaymentMethodForm({ method, onSuccess, onCancel }: PaymentMethodFormProps) {
    const createMethod = useCreatePaymentMethod();
    const updateMethod = useUpdatePaymentMethod();

    const {
        register,
        handleSubmit,
        watch,
        setValue,
        formState: { errors },
    } = useForm<PaymentMethodFormData>({
        resolver: zodResolver(paymentMethodSchema),
        defaultValues: {
            name: method?.name || '',
            type: method?.type || 'Credit Card',
            cashbackPercentage: method?.cashbackPercentage || '',
            isDefault: method?.isDefault || false,
        },
    });

    const type = watch('type');
    const isCreditCard = type === 'Credit Card';

    const onSubmit = async (data: PaymentMethodFormData) => {
        try {
            const submitData = {
                name: data.name,
                type: data.type as PaymentType,
                cashbackPercentage: isCreditCard ? data.cashbackPercentage : undefined,
                isDefault: data.isDefault,
            };

            if (method) {
                await updateMethod.mutateAsync({ id: method.id, ...submitData });
                toast.success('Payment method updated');
            } else {
                await createMethod.mutateAsync(submitData);
                toast.success('Payment method added');
            }
            onSuccess();
        } catch {
            toast.error('Failed to save payment method');
        }
    };

    return (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input
                    id="name"
                    placeholder="e.g., Shinhan Deep Dream"
                    {...register('name')}
                />
                {errors.name && (
                    <p className="text-sm text-destructive">{errors.name.message}</p>
                )}
            </div>

            <div className="space-y-2">
                <Label>Type</Label>
                <Select
                    value={watch('type')}
                    onValueChange={(value) => setValue('type', value as PaymentType)}
                >
                    <SelectTrigger>
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="Credit Card">Credit Card</SelectItem>
                        <SelectItem value="Debit Card">Debit Card</SelectItem>
                        <SelectItem value="Cash">Cash</SelectItem>
                        <SelectItem value="Bank Transfer">Bank Transfer</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            {isCreditCard && (
                <div className="space-y-2">
                    <Label htmlFor="cashbackPercentage">Cashback Percentage (%)</Label>
                    <Input
                        id="cashbackPercentage"
                        type="number"
                        step="0.01"
                        placeholder="1.20"
                        {...register('cashbackPercentage')}
                    />
                </div>
            )}

            <div className="flex items-center gap-2">
                <input type="checkbox" id="isDefault" {...register('isDefault')} />
                <Label htmlFor="isDefault" className="font-normal cursor-pointer">
                    Set as default payment method
                </Label>
            </div>

            <div className="flex gap-3 pt-2">
                <Button type="button" variant="outline" className="flex-1" onClick={onCancel}>
                    Cancel
                </Button>
                <Button
                    type="submit"
                    className="flex-1"
                    disabled={createMethod.isPending || updateMethod.isPending}
                >
                    {method ? 'Update' : 'Add'} Payment Method
                </Button>
            </div>
        </form>
    );
}

export function PaymentMethodsPage() {
    const { data: methods, isLoading } = usePaymentMethods();
    const deleteMethod = useDeletePaymentMethod();
    const [isAddOpen, setIsAddOpen] = useState(false);
    const [editingMethod, setEditingMethod] = useState<PaymentMethod | null>(null);

    const handleDelete = async (id: string) => {
        try {
            await deleteMethod.mutateAsync(id);
            toast.success('Payment method deleted');
        } catch (error) {
            toast.error('Failed to delete. May have linked expenses.');
        }
    };

    const getIcon = (type: PaymentType) => {
        switch (type) {
            case 'Credit Card':
                return CreditCard;
            case 'Debit Card':
                return CreditCard;
            case 'Cash':
                return Wallet;
            case 'Bank Transfer':
                return Building;
            default:
                return Wallet;
        }
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold">Payment Methods</h1>
                <Button size="sm" onClick={() => setIsAddOpen(true)}>
                    <Plus className="w-4 h-4 mr-1.5" />
                    Add Payment Method
                </Button>
            </div>

            <div className="grid gap-4">
                {methods?.map((method) => {
                    const Icon = getIcon(method.type);

                    return (
                        <Card
                            key={method.id}
                            className={cn(
                                'bg-card border-border',
                                method.isDefault && 'border-primary/50'
                            )}
                        >
                            <CardContent className="p-4">
                                <div className="flex items-start justify-between">
                                    <div className="flex items-center gap-3">
                                        <div
                                            className={cn(
                                                'p-2 rounded-lg',
                                                method.type === 'Credit Card' && 'bg-primary/10 text-primary',
                                                method.type === 'Debit Card' && 'bg-chart-2/10 text-chart-2',
                                                method.type === 'Cash' && 'bg-success/10 text-success',
                                                method.type === 'Bank Transfer' && 'bg-chart-4/10 text-chart-4'
                                            )}
                                        >
                                            <Icon className="w-5 h-5" />
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <span className="font-medium">{method.name}</span>
                                                {method.isDefault && (
                                                    <Badge variant="outline" className="text-xs">
                                                        Default
                                                    </Badge>
                                                )}
                                            </div>
                                            <p className="text-sm text-muted-foreground">
                                                {method.type}
                                                {method.cashbackPercentage && (
                                                    <span className="text-success ml-2">
                                                        {method.cashbackPercentage}% cashback
                                                    </span>
                                                )}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-1">
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="h-8 w-8 p-0"
                                            onClick={() => setEditingMethod(method)}
                                        >
                                            <Pencil className="w-4 h-4" />
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                                            onClick={() => handleDelete(method.id)}
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </Button>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    );
                })}
            </div>

            {/* Add Dialog */}
            <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle>Add Payment Method</DialogTitle>
                    </DialogHeader>
                    <PaymentMethodForm
                        onSuccess={() => setIsAddOpen(false)}
                        onCancel={() => setIsAddOpen(false)}
                    />
                </DialogContent>
            </Dialog>

            {/* Edit Dialog */}
            <Dialog open={!!editingMethod} onOpenChange={() => setEditingMethod(null)}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle>Edit Payment Method</DialogTitle>
                    </DialogHeader>
                    {editingMethod && (
                        <PaymentMethodForm
                            method={editingMethod}
                            onSuccess={() => setEditingMethod(null)}
                            onCancel={() => setEditingMethod(null)}
                        />
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
}
