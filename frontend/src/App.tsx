import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from '@/lib/queryClient';
import { AppLayout } from '@/components/layout/AppLayout';
import { LoginPage } from '@/pages/Login';
import { RegisterPage } from '@/pages/Register';
import { DashboardPage } from '@/pages/Dashboard';
import { ExpensesPage } from '@/pages/Expenses';
import { PaymentMethodsPage } from '@/pages/PaymentMethods';
import { BudgetPage } from '@/pages/Budget';
import { SettingsPage } from '@/pages/Settings';
import { TrendsPage } from '@/pages/Trends';
import { AddExpensePage } from '@/pages/AddExpense';
import { IncomePage } from '@/pages/Income';

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          {/* Public routes */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />

          {/* Protected routes */}
          <Route element={<AppLayout />}>
            <Route path="/" element={<DashboardPage />} />
            <Route path="/expenses" element={<ExpensesPage />} />
            <Route path="/add" element={<AddExpensePage />} />
            <Route path="/payment-methods" element={<PaymentMethodsPage />} />
            <Route path="/budget" element={<BudgetPage />} />
            <Route path="/trends" element={<TrendsPage />} />
            <Route path="/income" element={<IncomePage />} />
            <Route path="/settings" element={<SettingsPage />} />
          </Route>

          {/* Catch all */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
