'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { api } from '@/lib/api';
import { Icon } from '@/components/icons';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';

interface Booking {
  id: string;
  contact: { name: string; email: string };
  bookingType: { name: string };
  scheduledAt: string;
  status: string;
}

export default function BookingsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  // Check for action=create in URL
  useEffect(() => {
    if (searchParams.get('action') === 'create') {
      setShowCreateModal(true);
    }
  }, [searchParams]);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login');
      return;
    }

    if (isAuthenticated) {
      fetchBookings();
    }
  }, [isAuthenticated, authLoading, router]);

  const fetchBookings = async () => {
    try {
      setIsLoading(true);
      const response = await api.get<{ success: boolean; data: Booking[] }>('/bookings');
      if (response.success) {
        setBookings(response.data);
      }
    } catch (err: any) {
      if (err.status === 401) {
        router.push('/login');
      } else {
        setError(err.message || 'Failed to load bookings');
      }
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
          <h1 className="text-2xl font-bold tracking-tight">Bookings</h1>
          <p className="text-muted-foreground">Manage your appointments and reservations</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className={cn(
            'inline-flex items-center gap-2 px-4 py-2 rounded-md',
            'bg-primary text-primary-foreground font-medium',
            'hover:bg-primary/90 transition-colors'
          )}
        >
          <Icon name="Plus" size={16} />
          Create Booking
        </button>
      </div>

      {bookings.length === 0 ? (
        <div className="text-center py-12 border border-dashed border-border rounded-lg">
          <Icon name="Calendar" className="mx-auto h-12 w-12 text-muted-foreground/50" />
          <h3 className="mt-4 text-lg font-medium">No bookings yet</h3>
          <p className="text-muted-foreground mt-1">Create your first booking to get started</p>
        </div>
      ) : (
        <div className="border rounded-lg overflow-hidden">
          <table className="w-full">
            <thead className="bg-muted">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-medium">Customer</th>
                <th className="px-4 py-3 text-left text-sm font-medium">Service</th>
                <th className="px-4 py-3 text-left text-sm font-medium">Date & Time</th>
                <th className="px-4 py-3 text-left text-sm font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {bookings.map((booking) => (
                <tr key={booking.id} className="hover:bg-muted/50">
                  <td className="px-4 py-3">
                    <div className="font-medium">{booking.contact?.name || 'Unknown'}</div>
                    <div className="text-sm text-muted-foreground">{booking.contact?.email}</div>
                  </td>
                  <td className="px-4 py-3 text-sm">{booking.bookingType?.name || 'Unknown'}</td>
                  <td className="px-4 py-3 text-sm">
                    {new Date(booking.scheduledAt).toLocaleString()}
                  </td>
                  <td className="px-4 py-3">
                    <span className={cn(
                      'inline-flex px-2 py-1 text-xs font-medium rounded-full',
                      booking.status === 'CONFIRMED' && 'bg-green-100 text-green-800',
                      booking.status === 'COMPLETED' && 'bg-blue-100 text-blue-800',
                      booking.status === 'NO_SHOW' && 'bg-red-100 text-red-800'
                    )}>
                      {booking.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Create Booking Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-card rounded-lg border border-border w-full max-w-md mx-4 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Create New Booking</h2>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-muted-foreground hover:text-foreground"
              >
                <Icon name="X" size={20} />
              </button>
            </div>
            
            {createError && (
              <div className="mb-4 p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm">
                {createError}
              </div>
            )}

            <form onSubmit={async (e) => {
              e.preventDefault();
              setCreateError(null);
              setIsCreating(true);
              
              const formData = new FormData(e.currentTarget);
              const data = {
                contactId: formData.get('contactId'),
                bookingTypeId: formData.get('bookingTypeId'),
                scheduledAt: new Date(formData.get('scheduledAt') as string).toISOString(),
                notes: formData.get('notes'),
              };
              
              try {
                await api.post('/bookings', data);
                setShowCreateModal(false);
                fetchBookings();
              } catch (err: any) {
                setCreateError(err.message || 'Failed to create booking');
              } finally {
                setIsCreating(false);
              }
            }} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Contact ID</label>
                <input
                  name="contactId"
                  type="text"
                  placeholder="Enter contact ID"
                  className="w-full px-3 py-2 rounded-md border border-input bg-background"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">Booking Type ID</label>
                <input
                  name="bookingTypeId"
                  type="text"
                  placeholder="Enter booking type ID"
                  className="w-full px-3 py-2 rounded-md border border-input bg-background"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">Date & Time</label>
                <input
                  name="scheduledAt"
                  type="datetime-local"
                  className="w-full px-3 py-2 rounded-md border border-input bg-background"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">Notes (optional)</label>
                <textarea
                  name="notes"
                  rows={3}
                  placeholder="Add any notes..."
                  className="w-full px-3 py-2 rounded-md border border-input bg-background"
                />
              </div>
              
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 px-4 py-2 rounded-md border border-input hover:bg-accent transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isCreating}
                  className="flex-1 px-4 py-2 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
                >
                  {isCreating ? 'Creating...' : 'Create Booking'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
