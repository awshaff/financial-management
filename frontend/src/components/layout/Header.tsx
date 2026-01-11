import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { LogOut, User } from 'lucide-react';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface HeaderProps {
    title?: string;
}

export function Header({ title }: HeaderProps) {
    const { user, logout } = useAuth();

    return (
        <header className="sticky top-0 z-40 flex items-center justify-between h-14 px-4 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            <div className="flex items-center gap-3">
                <span className="text-xl md:hidden">💰</span>
                {title && (
                    <h1 className="text-lg font-semibold tracking-tight">{title}</h1>
                )}
            </div>

            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="gap-2">
                        <User className="w-4 h-4" />
                        <span className="hidden sm:inline text-sm">
                            {user?.email?.split('@')[0]}
                        </span>
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                    <DropdownMenuItem>
                        <span className="text-sm text-muted-foreground">{user?.email}</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={logout} className="text-destructive">
                        <LogOut className="w-4 h-4 mr-2" />
                        Logout
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>
        </header>
    );
}
