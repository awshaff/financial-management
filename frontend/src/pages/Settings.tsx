import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import {
    useCategories,
    useCreateCategory,
    useUpdateCategory,
    useDeleteCategory,
} from '@/hooks/useCategories';
import type { Category } from '@/types';
import { toast } from 'sonner';
import { useSettings, useUpdateSettings } from '@/hooks/useSettings';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';

const categorySchema = z.object({
    name: z.string().min(1, 'Name is required').max(30),
    monthlyBudget: z.number().min(0).optional(),
});

type CategoryFormData = z.infer<typeof categorySchema>;

interface CategoryFormProps {
    category?: Category;
    onSuccess: () => void;
    onCancel: () => void;
}

function formatKRW(value: number): string {
    return new Intl.NumberFormat('ko-KR', {
        style: 'currency',
        currency: 'KRW',
        maximumFractionDigits: 0,
    }).format(value);
}

function CategoryForm({ category, onSuccess, onCancel }: CategoryFormProps) {
    const createCategory = useCreateCategory();
    const updateCategory = useUpdateCategory();

    const {
        register,
        handleSubmit,
        formState: { errors },
    } = useForm<CategoryFormData>({
        resolver: zodResolver(categorySchema),
        defaultValues: {
            name: category?.name || '',
            monthlyBudget: category?.monthlyBudget || 0,
        },
    });

    const onSubmit = async (data: CategoryFormData) => {
        try {
            if (category) {
                await updateCategory.mutateAsync({ id: category.id, ...data });
                toast.success('Category updated');
            } else {
                await createCategory.mutateAsync(data);
                toast.success('Category added');
            }
            onSuccess();
        } catch {
            toast.error('Failed to save category');
        }
    };

    return (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
                <Label htmlFor="name">Category Name</Label>
                <Input
                    id="name"
                    placeholder="e.g., Coffee"
                    {...register('name')}
                />
                {errors.name && (
                    <p className="text-sm text-destructive">{errors.name.message}</p>
                )}
            </div>

            <div className="space-y-2">
                <Label htmlFor="monthlyBudget">Monthly Budget (₩)</Label>
                <Input
                    id="monthlyBudget"
                    type="number"
                    placeholder="50000"
                    {...register('monthlyBudget', { valueAsNumber: true })}
                />
            </div>

            <div className="flex gap-3 pt-2">
                <Button type="button" variant="outline" className="flex-1" onClick={onCancel}>
                    Cancel
                </Button>
                <Button
                    type="submit"
                    className="flex-1"
                    disabled={createCategory.isPending || updateCategory.isPending}
                >
                    {category ? 'Update' : 'Add'} Category
                </Button>
            </div>
        </form>
    );
}

export function SettingsPage() {
    const { data: categories, isLoading: categoriesLoading } = useCategories();
    const { data: settings, isLoading: settingsLoading } = useSettings();
    const updateSettingsMutation = useUpdateSettings();
    const deleteCategory = useDeleteCategory();
    const [isAddOpen, setIsAddOpen] = useState(false);
    const [editingCategory, setEditingCategory] = useState<Category | null>(null);

    const billingCycleStartDay = settings?.billingCycleStartDay ?? 27;
    const billingCycleEndDay = settings?.billingCycleEndDay ?? 26;

    const handleBillingCycleStartChange = (value: string) => {
        const day = parseInt(value, 10);
        updateSettingsMutation.mutate({ billingCycleStartDay: day });
        toast.success(`Billing cycle start updated to day ${day}`);
    };

    const handleBillingCycleEndChange = (value: string) => {
        const day = parseInt(value, 10);
        updateSettingsMutation.mutate({ billingCycleEndDay: day });
        toast.success(`Billing cycle end updated to day ${day}`);
    };

    const handleDelete = async (id: string) => {
        try {
            await deleteCategory.mutateAsync(id);
            toast.success('Category deleted');
        } catch {
            toast.error('Failed to delete. May have linked expenses.');
        }
    };

    if (categoriesLoading || settingsLoading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <h1 className="text-2xl font-bold">Settings</h1>

            {/* Billing Cycle Section */}
            <Card className="bg-card border-border">
                <CardHeader className="pb-2">
                    <CardTitle className="text-base font-semibold">Billing Cycle</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <p className="text-sm text-muted-foreground">
                        {billingCycleStartDay > billingCycleEndDay || billingCycleEndDay === 0
                            ? `Cross-month cycle: Day ${billingCycleStartDay} (prev month) → Day ${billingCycleEndDay === 0 ? 'End' : billingCycleEndDay} (this month)`
                            : `Same-month cycle: Day ${billingCycleStartDay} → Day ${billingCycleEndDay === 0 ? 'End' : billingCycleEndDay}`
                        }
                    </p>
                    <div className="flex flex-wrap items-center gap-4">
                        <div className="flex items-center gap-2">
                            <Label className="text-sm">Start Day</Label>
                            <Select
                                value={billingCycleStartDay.toString()}
                                onValueChange={handleBillingCycleStartChange}
                            >
                                <SelectTrigger className="w-20">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {Array.from({ length: 31 }, (_, i) => i + 1).map((day) => (
                                        <SelectItem key={day} value={day.toString()}>
                                            {day}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="flex items-center gap-2">
                            <Label className="text-sm">End Day</Label>
                            <Select
                                value={billingCycleEndDay.toString()}
                                onValueChange={handleBillingCycleEndChange}
                            >
                                <SelectTrigger className="w-28">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="0">End of month</SelectItem>
                                    {Array.from({ length: 31 }, (_, i) => i + 1).map((day) => (
                                        <SelectItem key={day} value={day.toString()}>
                                            {day}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Categories Section */}
            <Card className="bg-card border-border">
                <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                        <CardTitle className="text-base font-semibold">Categories</CardTitle>
                        <Button size="sm" variant="outline" onClick={() => setIsAddOpen(true)}>
                            <Plus className="w-4 h-4 mr-1.5" />
                            Add Category
                        </Button>
                    </div>
                </CardHeader>
                <CardContent className="space-y-3">
                    {categories?.map((category, index) => (
                        <div key={category.id}>
                            {index > 0 && <Separator className="my-3" />}
                            <div className="flex items-center justify-between">
                                <div>
                                    <div className="flex items-center gap-2">
                                        <span className="font-medium">{category.name}</span>
                                        {category.isDefault && (
                                            <Badge variant="secondary" className="text-xs">
                                                Default
                                            </Badge>
                                        )}
                                    </div>
                                    <p className="text-sm text-muted-foreground">
                                        Budget:{' '}
                                        {category.monthlyBudget
                                            ? formatKRW(category.monthlyBudget)
                                            : 'Not set'}
                                        {category.expenseCount !== undefined && (
                                            <span className="ml-2">
                                                • {category.expenseCount} expenses
                                            </span>
                                        )}
                                    </p>
                                </div>
                                <div className="flex items-center gap-1">
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-8 w-8 p-0"
                                        onClick={() => setEditingCategory(category)}
                                    >
                                        <Pencil className="w-4 h-4" />
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                                        onClick={() => handleDelete(category.id)}
                                        disabled={category.isDefault}
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </Button>
                                </div>
                            </div>
                        </div>
                    ))}
                </CardContent>
            </Card>

            {/* Add Dialog */}
            <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle>Add Category</DialogTitle>
                    </DialogHeader>
                    <CategoryForm
                        onSuccess={() => setIsAddOpen(false)}
                        onCancel={() => setIsAddOpen(false)}
                    />
                </DialogContent>
            </Dialog>

            {/* Edit Dialog */}
            <Dialog open={!!editingCategory} onOpenChange={() => setEditingCategory(null)}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle>Edit Category</DialogTitle>
                    </DialogHeader>
                    {editingCategory && (
                        <CategoryForm
                            category={editingCategory}
                            onSuccess={() => setEditingCategory(null)}
                            onCancel={() => setEditingCategory(null)}
                        />
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
}
