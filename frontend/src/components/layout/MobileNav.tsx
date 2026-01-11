import { Link, useLocation } from 'react-router-dom';
import { Home, Receipt, Plus, PiggyBank, Settings } from 'lucide-react';
import { cn } from '@/lib/utils';

const navItems = [
    { label: 'Home', icon: Home, path: '/' },
    { label: 'Expenses', icon: Receipt, path: '/expenses' },
    { label: 'Add', icon: Plus, path: '/add' },
    { label: 'Budget', icon: PiggyBank, path: '/budget' },
    { label: 'Settings', icon: Settings, path: '/settings' },
];

export function MobileNav() {
    const location = useLocation();

    return (
        <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 md:hidden">
            <div className="flex items-center justify-around h-16">
                {navItems.map((item) => {
                    const isActive = location.pathname === item.path;
                    const isAdd = item.path === '/add';

                    return (
                        <Link
                            key={item.path}
                            to={item.path}
                            className={cn(
                                'flex flex-col items-center justify-center gap-0.5 w-16 h-14',
                                'touch-manipulation',
                                isAdd && 'relative -top-3'
                            )}
                        >
                            <div
                                className={cn(
                                    'flex items-center justify-center rounded-full transition-colors',
                                    isAdd
                                        ? 'w-12 h-12 bg-primary text-primary-foreground shadow-lg'
                                        : 'w-10 h-10',
                                    !isAdd && isActive && 'bg-accent',
                                    !isAdd && !isActive && 'text-muted-foreground'
                                )}
                            >
                                <item.icon className={cn('w-5 h-5', isAdd && 'w-6 h-6')} />
                            </div>
                            {!isAdd && (
                                <span
                                    className={cn(
                                        'text-[10px] font-medium',
                                        isActive ? 'text-foreground' : 'text-muted-foreground'
                                    )}
                                >
                                    {item.label}
                                </span>
                            )}
                        </Link>
                    );
                })}
            </div>
        </nav>
    );
}
