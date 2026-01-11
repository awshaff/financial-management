import { useState } from 'react';
import { Navigate, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useAuth } from '@/hooks/useAuth';

const registerSchema = z.object({
    email: z.string().email('Invalid email'),
    password: z.string().min(8, 'Password must be at least 8 characters'),
    confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ['confirmPassword'],
});

type RegisterFormData = z.infer<typeof registerSchema>;

export function RegisterPage() {
    const { isAuthenticated } = useAuth();
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);

    const {
        register,
        handleSubmit,
        formState: { errors },
    } = useForm<RegisterFormData>({
        resolver: zodResolver(registerSchema),
    });

    const registerMutation = useMutation({
        mutationFn: ({ email, password }: { email: string; password: string }) =>
            api.auth.register(email, password),
        onSuccess: () => {
            setSuccess(true);
        },
        onError: (err: Error) => {
            setError(err.message || 'Registration failed');
        },
    });

    if (isAuthenticated) {
        return <Navigate to="/" replace />;
    }

    if (success) {
        return (
            <div className="min-h-screen flex items-center justify-center p-4 bg-background">
                <Card className="w-full max-w-md bg-card border-border">
                    <CardHeader className="text-center">
                        <div className="text-4xl mb-4">✅</div>
                        <CardTitle className="text-2xl font-bold">Account Created!</CardTitle>
                        <CardDescription>You can now sign in with your credentials</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Link to="/login">
                            <Button className="w-full">Go to Sign In</Button>
                        </Link>
                    </CardContent>
                </Card>
            </div>
        );
    }

    const onSubmit = async (data: RegisterFormData) => {
        setError(null);
        registerMutation.mutate({ email: data.email, password: data.password });
    };

    return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-background">
            <Card className="w-full max-w-md bg-card border-border">
                <CardHeader className="text-center">
                    <div className="text-4xl mb-4">💰</div>
                    <CardTitle className="text-2xl font-bold">Create Account</CardTitle>
                    <CardDescription>Sign up for Family Finance Tracker</CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                        {error && (
                            <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20">
                                <p className="text-sm text-destructive">{error}</p>
                            </div>
                        )}

                        <div className="space-y-2">
                            <Label htmlFor="email">Email</Label>
                            <Input
                                id="email"
                                type="email"
                                placeholder="you@example.com"
                                {...register('email')}
                            />
                            {errors.email && (
                                <p className="text-sm text-destructive">{errors.email.message}</p>
                            )}
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="password">Password</Label>
                            <Input
                                id="password"
                                type="password"
                                placeholder="••••••••"
                                {...register('password')}
                            />
                            {errors.password && (
                                <p className="text-sm text-destructive">{errors.password.message}</p>
                            )}
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="confirmPassword">Confirm Password</Label>
                            <Input
                                id="confirmPassword"
                                type="password"
                                placeholder="••••••••"
                                {...register('confirmPassword')}
                            />
                            {errors.confirmPassword && (
                                <p className="text-sm text-destructive">{errors.confirmPassword.message}</p>
                            )}
                        </div>

                        <Button type="submit" className="w-full" disabled={registerMutation.isPending}>
                            {registerMutation.isPending ? 'Creating account...' : 'Create Account'}
                        </Button>

                        <p className="text-center text-sm text-muted-foreground">
                            Already have an account?{' '}
                            <Link to="/login" className="text-primary hover:underline">
                                Sign in
                            </Link>
                        </p>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}
