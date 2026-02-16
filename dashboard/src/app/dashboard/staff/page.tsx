'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { Icon } from '@/components/icons';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';

interface StaffMember {
  id: string;
  user: { name: string; email: string } | null;
  role: string;
}

export default function StaffPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading: authLoading, role } = useAuth();
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login');
      return;
    }
    if (isAuthenticated) fetchStaff();
  }, [isAuthenticated, authLoading, router]);

  const fetchStaff = async () => {
    try {
      setIsLoading(true);
      const response = await api.get<{ success: boolean; data: StaffMember[] }>('/staff');
      if (response.success) setStaff(response.data);
    } catch (err: any) {
      if (err.status === 401) router.push('/login');
      else if (err.status === 403) setError('Only owners can view staff members');
      else setError(err.message || 'Failed to load staff');
    } finally {
      setIsLoading(false);
    }
  };

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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Staff</h1>
          <p className="text-muted-foreground">Manage your team members</p>
        </div>
        {role === 'OWNER' && (
          <button
            className={cn(
              'inline-flex items-center gap-2 px-4 py-2 rounded-md',
              'bg-primary text-primary-foreground font-medium',
              'hover:bg-primary/90 transition-colors'
            )}
          >
            <Icon name="Plus" size={16} />
            Invite Staff
          </button>
        )}
      </div>

      {staff.length === 0 ? (
        <div className="text-center py-12 border border-dashed border-border rounded-lg">
          <Icon name="UserCog" className="mx-auto h-12 w-12 text-muted-foreground/50" />
          <h3 className="mt-4 text-lg font-medium">No staff members</h3>
          <p className="text-muted-foreground mt-1">Invite team members to collaborate</p>
        </div>
      ) : (
        <div className="border rounded-lg overflow-hidden">
          <table className="w-full">
            <thead className="bg-muted">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-medium">Name</th>
                <th className="px-4 py-3 text-left text-sm font-medium">Email</th>
                <th className="px-4 py-3 text-left text-sm font-medium">Role</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {staff.map((member) => (
                <tr key={member.id} className="hover:bg-muted/50">
                  <td className="px-4 py-3 font-medium">{member.user?.name || 'Unknown'}</td>
                  <td className="px-4 py-3 text-sm text-muted-foreground">{member.user?.email || '-'}</td>
                  <td className="px-4 py-3">
                    <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800">
                      {member.role}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
