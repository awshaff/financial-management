import { Link, useLocation } from 'react-router-dom';
import {
    Home,
    Receipt,
    PiggyBank,
    CreditCard,
    Settings,
    ChevronLeft,
    ChevronRight,
    TrendingUp,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useState } from 'react';

const navItems = [
    { label: 'Dashboard', icon: Home, path: '/' },
    { label: 'Expenses', icon: Receipt, path: '/expenses' },
    { label: 'Budget', icon: PiggyBank, path: '/budget' },
    { label: 'Trends', icon: TrendingUp, path: '/trends' },
    { label: 'Payment Methods', icon: CreditCard, path: '/payment-methods' },
    { label: 'Settings', icon: Settings, path: '/settings' },
];

export function Sidebar() {
    const location = useLocation();
    const [isCollapsed, setIsCollapsed] = useState(false);

    return (
        <aside
            className={cn(
                'hidden md:flex flex-col h-screen border-r border-border bg-card transition-all duration-300',
                isCollapsed ? 'w-16' : 'w-60'
            )}
        >
            {/* Header */}
            <div className="flex items-center justify-between h-16 px-4 border-b border-border">
                {!isCollapsed && (
                    <h1 className="text-lg font-semibold tracking-tight">
                        💰 Finance
                    </h1>
                )}
                <Button
                    variant="ghost"
                    size="sm"
                    className={cn('w-8 h-8 p-0', isCollapsed && 'mx-auto')}
                    onClick={() => setIsCollapsed(!isCollapsed)}
                >
                    {isCollapsed ? (
                        <ChevronRight className="w-4 h-4" />
                    ) : (
                        <ChevronLeft className="w-4 h-4" />
                    )}
                </Button>
            </div>

            {/* Navigation */}
            <nav className="flex-1 p-2 space-y-1">
                {navItems.map((item) => {
                    const isActive = location.pathname === item.path;

                    return (
                        <Link
                            key={item.path}
                            to={item.path}
                            className={cn(
                                'flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors',
                                'hover:bg-accent hover:text-accent-foreground',
                                isActive && 'bg-accent text-accent-foreground',
                                !isActive && 'text-muted-foreground',
                                isCollapsed && 'justify-center'
                            )}
                        >
                            <item.icon className="w-5 h-5 flex-shrink-0" />
                            {!isCollapsed && (
                                <span className="text-sm font-medium">{item.label}</span>
                            )}
                        </Link>
                    );
                })}
            </nav>

            {/* Footer */}
            <div className="p-4 border-t border-border">
                {!isCollapsed && (
                    <p className="text-xs text-muted-foreground text-center">
                        Family Finance Tracker v0.1
                    </p>
                )}
            </div>
        </aside>
    );
}
