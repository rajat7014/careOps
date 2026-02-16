'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { authApi, setAccessToken, clearAccessToken, getAccessToken, ApiError } from '@/lib/api';
import { UserRole } from '@/types';

interface User {
  id: string;
  email: string;
  name: string;
}

interface Workspace {
  id: string;
  name: string;
  slug: string;
  isActive: boolean;
}

interface AuthContextType {
  user: User | null;
  workspace: Workspace | null;
  role: UserRole | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
  error: string | null;
}

interface RegisterData {
  email: string;
  password: string;
  name: string;
  workspaceName: string;
  timezone?: string;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [role, setRole] = useState<UserRole | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Initialize auth state from storage
  useEffect(() => {
    const token = getAccessToken();
    if (token) {
      refreshUser();
    } else {
      setIsLoading(false);
    }
  }, []);

  const refreshUser = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const response = await authApi.me();
      
      if (response.success) {
        setUser(response.data.user);
        setWorkspace(response.data.workspace);
        setRole(response.data.role as UserRole);
      }
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        // Token expired or invalid
        clearAccessToken();
        setUser(null);
        setWorkspace(null);
        setRole(null);
      } else {
        setError(err instanceof Error ? err.message : 'Failed to fetch user');
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    try {
      setIsLoading(true);
      setError(null);
      
      const response = await authApi.login(email, password);
      
      if (response.success) {
        setAccessToken(response.data.token);
        setUser(response.data.user);
        setWorkspace(response.data.workspace);
        setRole('OWNER'); // Set based on your backend response
      }
    } catch (err) {
      if (err instanceof ApiError) {
        throw new Error(err.message);
      }
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const register = useCallback(async (data: RegisterData) => {
    try {
      setIsLoading(true);
      setError(null);
      
      const response = await authApi.register(data);
      
      if (response.success) {
        setAccessToken(response.data.token);
        setUser(response.data.user);
        setWorkspace(response.data.workspace);
        setRole('OWNER');
      }
    } catch (err) {
      if (err instanceof ApiError) {
        throw new Error(err.message);
      }
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const logout = useCallback(() => {
    authApi.logout();
    setUser(null);
    setWorkspace(null);
    setRole(null);
    setError(null);
  }, []);

  const value: AuthContextType = {
    user,
    workspace,
    role,
    isLoading,
    isAuthenticated: !!user,
    login,
    register,
    logout,
    refreshUser,
    error,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuthContext() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuthContext must be used within an AuthProvider');
  }
  return context;
}
