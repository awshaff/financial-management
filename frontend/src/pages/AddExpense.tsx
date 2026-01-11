import { ExpenseForm } from '@/components/expenses/ExpenseForm';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export function AddExpensePage() {
    const navigate = useNavigate();

    return (
        <div className="max-w-md mx-auto">
            <Card className="bg-card border-border">
                <CardHeader>
                    <CardTitle>Add Expense</CardTitle>
                </CardHeader>
                <CardContent>
                    <ExpenseForm
                        onSuccess={() => navigate('/expenses')}
                        onCancel={() => navigate(-1)}
                    />
                </CardContent>
            </Card>
        </div>
    );
}
