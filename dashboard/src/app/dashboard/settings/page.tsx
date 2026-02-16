'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { Icon } from '@/components/icons';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';

interface Workspace {
  id: string;
  name: string;
  slug: string;
  timezone: string;
  isActive: boolean;
}

export default function SettingsPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading: authLoading, role } = useAuth();
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login');
      return;
    }
    if (isAuthenticated) fetchWorkspace();
  }, [isAuthenticated, authLoading, router]);

  const fetchWorkspace = async () => {
    try {
      setIsLoading(true);
      const response = await api.get<{ success: boolean; data: { workspace: Workspace } }>('/auth/me');
      if (response.success) setWorkspace(response.data.workspace);
    } catch (err: any) {
      if (err.status === 401) router.push('/login');
      else setError(err.message || 'Failed to load settings');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    // TODO: Implement save
    setTimeout(() => setIsSaving(false), 500);
  };

  if (role !== 'OWNER') {
    return (
      <div className="p-4 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive">
        Only workspace owners can access settings.
      </div>
    );
  }

  if (authLoading || isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive">
        {error}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground">Manage your workspace preferences</p>
      </div>

      {workspace && (
        <div className="space-y-6 max-w-2xl">
          <div className="border rounded-lg p-6 space-y-4">
            <h2 className="text-lg font-medium">Workspace Information</h2>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">Workspace Name</label>
              <input
                type="text"
                value={workspace.name}
                readOnly
                className="w-full px-3 py-2 rounded-md border border-input bg-muted text-sm"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Workspace Slug</label>
              <input
                type="text"
                value={workspace.slug}
                readOnly
                className="w-full px-3 py-2 rounded-md border border-input bg-muted text-sm"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Timezone</label>
              <select
                value={workspace.timezone}
                className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm"
              >
                <option value="UTC">UTC</option>
                <option value="America/New_York">Eastern Time (ET)</option>
                <option value="America/Chicago">Central Time (CT)</option>
                <option value="America/Denver">Mountain Time (MT)</option>
                <option value="America/Los_Angeles">Pacific Time (PT)</option>
              </select>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <div className={`w-2 h-2 rounded-full ${workspace.isActive ? 'bg-green-500' : 'bg-yellow-500'}`} />
              <span className="text-sm">
                Status: {workspace.isActive ? 'Active' : 'Inactive'}
              </span>
            </div>
          </div>

          <button
            onClick={handleSave}
            disabled={isSaving}
            className={cn(
              'px-4 py-2 rounded-md',
              'bg-primary text-primary-foreground font-medium',
              'hover:bg-primary/90 transition-colors',
              'disabled:opacity-50'
            )}
          >
            {isSaving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      )}
    </div>
  );
}
