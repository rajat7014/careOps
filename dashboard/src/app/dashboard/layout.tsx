'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { DashboardLayout } from '@/components/dashboard-layout';
import { useUser } from '@/hooks/useAuth';
import { UserRole } from '@/types';

// Mock data for preview mode (when not logged in)
const mockData = {
  owner: {
    user: { id: '1', email: 'owner@example.com', name: 'John Owner' },
    workspace: { id: '1', name: 'Acme Corporation', slug: 'acme', isActive: true },
    role: 'OWNER' as UserRole,
  },
  staff: {
    user: { id: '2', email: 'staff@example.com', name: 'Jane Staff' },
    workspace: { id: '1', name: 'Acme Corporation', slug: 'acme', isActive: true },
    role: 'STAFF' as UserRole,
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, workspace, role, isLoading } = useUser();
  
  // Check for preview mode
  const previewRole = searchParams.get('role') as UserRole | null;
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  
  useEffect(() => {
    // If preview role is specified and user is not logged in, enable preview mode
    if (previewRole && !isLoading && !user) {
      setIsPreviewMode(true);
    }
  }, [previewRole, isLoading, user]);

  // Redirect to login if not authenticated and not in preview mode
  useEffect(() => {
    if (!isLoading && !user && !previewRole) {
      router.replace('/login');
    }
  }, [isLoading, user, previewRole, router]);

  // Show loading state while fetching user
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  // Determine which data to use
  const displayData = isPreviewMode
    ? (previewRole === 'STAFF' ? mockData.staff : mockData.owner)
    : { user, workspace, role };

  // If no user data and not in preview mode, show loading until redirect happens
  if (!displayData.user || !displayData.workspace || !displayData.role) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
          <p className="text-muted-foreground">Redirecting to login...</p>
        </div>
      </div>
    );
  }

  return (
    <DashboardLayout
      userRole={displayData.role}
      userName={displayData.user.name}
      userEmail={displayData.user.email}
      workspaceName={displayData.workspace.name}
      banner={
        isPreviewMode ? (
          <div className="bg-yellow-100 border-b border-yellow-200 px-4 py-2 text-center text-sm text-yellow-800">
            Preview Mode: You are viewing as {displayData.role}. 
            <button 
              onClick={() => router.push('/login')} 
              className="underline ml-1 font-medium"
            >
              Log in for full access
            </button>
          </div>
        ) : undefined
      }
    >
      {children}
    </DashboardLayout>
  );
}
