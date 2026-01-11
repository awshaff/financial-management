import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useCallback, useEffect, useState } from 'react';

interface AuthState {
    user: { id: string; email: string } | null;
    token: string | null;
    isLoading: boolean;
    isAuthenticated: boolean;
}

export function useAuth() {
    const queryClient = useQueryClient();
    const [state, setState] = useState<AuthState>({
        user: null,
        token: null,
        isLoading: true,
        isAuthenticated: false,
    });

    // Check for existing token on mount
    useEffect(() => {
        const token = localStorage.getItem('auth_token');
        const userStr = localStorage.getItem('auth_user');

        if (token && userStr) {
            try {
                const user = JSON.parse(userStr);
                setState({
                    user,
                    token,
                    isLoading: false,
                    isAuthenticated: true,
                });
            } catch {
                localStorage.removeItem('auth_token');
                localStorage.removeItem('auth_user');
                setState(prev => ({ ...prev, isLoading: false }));
            }
        } else {
            setState(prev => ({ ...prev, isLoading: false }));
        }
    }, []);

    const loginMutation = useMutation({
        mutationFn: ({ email, password }: { email: string; password: string }) =>
            api.auth.login(email, password),
        onSuccess: (data) => {
            localStorage.setItem('auth_token', data.token);
            localStorage.setItem('auth_user', JSON.stringify(data.user));
            setState({
                user: data.user,
                token: data.token,
                isLoading: false,
                isAuthenticated: true,
            });
        },
    });

    const logout = useCallback(() => {
        localStorage.removeItem('auth_token');
        localStorage.removeItem('auth_user');
        queryClient.clear();
        setState({
            user: null,
            token: null,
            isLoading: false,
            isAuthenticated: false,
        });
        // Redirect to login page
        window.location.href = '/login';
    }, [queryClient]);

    return {
        ...state,
        login: loginMutation.mutate,
        loginAsync: loginMutation.mutateAsync,
        logout,
        loginError: loginMutation.error,
        isLoginPending: loginMutation.isPending,
    };
}
