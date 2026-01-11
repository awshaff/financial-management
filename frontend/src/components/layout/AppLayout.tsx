import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Sidebar } from './Sidebar';
import { MobileNav } from './MobileNav';
import { Header } from './Header';
import { Toaster } from '@/components/ui/sonner';

export function AppLayout() {
    const { isAuthenticated, isLoading } = useAuth();

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-screen bg-background">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                    <p className="text-sm text-muted-foreground">Loading...</p>
                </div>
            </div>
        );
    }

    if (!isAuthenticated) {
        return <Navigate to="/login" replace />;
    }

    return (
        <div className="flex h-screen bg-background">
            {/* Desktop Sidebar */}
            <Sidebar />

            {/* Main Content */}
            <div className="flex-1 flex flex-col overflow-hidden">
                <Header />
                <main className="flex-1 overflow-y-auto pb-20 md:pb-6 scrollbar-thin">
                    <div className="container max-w-6xl mx-auto p-4 md:p-6">
                        <Outlet />
                    </div>
                </main>
            </div>

            {/* Mobile Bottom Nav */}
            <MobileNav />

            {/* Toast notifications */}
            <Toaster position="top-center" richColors />
        </div>
    );
}
