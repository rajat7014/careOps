'use client';

import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { StatsCard } from '@/components/stats-card';
import { Icon } from '@/components/icons';
import { dashboardApi, ApiError, getAccessToken } from '@/lib/api';
import { useUser } from '@/hooks/useAuth';

interface Stats {
  bookings: { total: number; thisMonth: number; trend: number };
  revenue: { total: number; trend: number };
  contacts: { total: number; trend: number };
  inventory: { total: number; low: number; trend: number };
}

interface RecentBooking {
  id: string;
  contact: { name: string } | null;
  contactName?: string;
  service: string;
  scheduledAt: string;
  status: string;
}

// Mock data for preview mode
const mockStats: Stats = {
  bookings: { total: 248, thisMonth: 42, trend: 12 },
  revenue: { total: 12450, trend: 8 },
  contacts: { total: 1429, trend: 3.2 },
  inventory: { total: 86, low: 3, trend: -5.1 },
};

const mockBookings: RecentBooking[] = [
  { id: '1', contact: { name: 'Sarah Johnson' }, service: 'Consultation', scheduledAt: new Date(Date.now() + 3600000).toISOString(), status: 'confirmed' },
  { id: '2', contact: { name: 'Mike Chen' }, service: 'Follow-up', scheduledAt: new Date(Date.now() + 7200000).toISOString(), status: 'pending' },
  { id: '3', contact: { name: 'Emily Davis' }, service: 'Initial Visit', scheduledAt: new Date(Date.now() + 86400000).toISOString(), status: 'confirmed' },
];

export default function DashboardPage() {
  const { user } = useUser();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [stats, setStats] = useState<Stats | null>(null);
  const [recentBookings, setRecentBookings] = useState<RecentBooking[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const isPreviewMode = !!searchParams.get('role') && !getAccessToken();

  useEffect(() => {
    async function fetchData() {
      // If in preview mode, use mock data
      if (isPreviewMode) {
        setStats(mockStats);
        setRecentBookings(mockBookings);
        setIsLoading(false);
        return;
      }
      
      try {
        setIsLoading(true);
        const [statsRes, bookingsRes] = await Promise.all([
          dashboardApi.getStats(),
          dashboardApi.getRecentBookings(5),
        ]);

        if (statsRes.success) {
          setStats(statsRes.data);
        }
        if (bookingsRes.success) {
          setRecentBookings(bookingsRes.data);
        }
      } catch (err) {
        if (err instanceof ApiError) {
          setError(err.message);
        } else {
          setError('Failed to load dashboard data');
        }
      } finally {
        setIsLoading(false);
      }
    }

    fetchData();
  }, [isPreviewMode]);

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();
    const isTomorrow = new Date(now.setDate(now.getDate() + 1)).toDateString() === date.toDateString();
    
    const time = date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
    
    if (isToday) return `Today, ${time}`;
    if (isTomorrow) return `Tomorrow, ${time}`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
  };

  if (isLoading) {
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
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          Welcome back, {user?.name?.split(' ')[0] || 'there'}!
        </h1>
        <p className="text-muted-foreground">
          Here&apos;s what&apos;s happening with your business.
        </p>
      </div>

      {/* Stats grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          title="Total Bookings"
          value={stats?.bookings.thisMonth || 0}
          description="This month"
          trend={{ value: `${stats?.bookings.trend || 0}%`, positive: (stats?.bookings.trend || 0) >= 0 }}
          icon={<Icon name="Calendar" className="text-primary" size={24} />}
        />
        <StatsCard
          title="Revenue"
          value={`$${(stats?.revenue.total || 0).toLocaleString()}`}
          description="This month"
          trend={{ value: `${stats?.revenue.trend || 0}%`, positive: (stats?.revenue.trend || 0) >= 0 }}
          icon={<Icon name="CreditCard" className="text-primary" size={24} />}
        />
        <StatsCard
          title="Active Contacts"
          value={stats?.contacts.total || 0}
          description="Total customers"
          trend={{ value: `${stats?.contacts.trend || 0}%`, positive: (stats?.contacts.trend || 0) >= 0 }}
          icon={<Icon name="Users" className="text-primary" size={24} />}
        />
        <StatsCard
          title="Inventory Items"
          value={stats?.inventory.total || 0}
          description={stats?.inventory.low ? `${stats.inventory.low} low stock` : 'In stock'}
          trend={{ value: `${Math.abs(stats?.inventory.trend || 0)}%`, positive: (stats?.inventory.trend || 0) >= 0 }}
          icon={<Icon name="Package" className="text-primary" size={24} />}
        />
      </div>

      {/* Recent activity and quick actions */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Recent bookings */}
        <div className="bg-card rounded-lg border border-border">
          <div className="p-6 border-b border-border">
            <h2 className="text-lg font-semibold">Recent Bookings</h2>
            <p className="text-sm text-muted-foreground">Latest appointments scheduled</p>
          </div>
          <div className="p-6">
            {recentBookings.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">No bookings yet</p>
            ) : (
              <div className="space-y-4">
                {recentBookings.map((booking) => {
                  const contactName = booking.contact?.name || booking.contactName || 'Unknown';
                  return (
                    <div key={booking.id} className="flex items-center justify-between py-2">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center">
                          <span className="text-sm font-medium">
                            {contactName.split(' ').map(n => n[0]).join('')}
                          </span>
                        </div>
                        <div>
                          <p className="font-medium">{contactName}</p>
                          <p className="text-sm text-muted-foreground">{booking.service}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm">{formatTime(booking.scheduledAt)}</p>
                        <span className={`
                          inline-flex items-center px-2 py-0.5 rounded text-xs font-medium
                          ${booking.status === 'confirmed' 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-yellow-100 text-yellow-800'}
                        `}>
                          {booking.status}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Quick actions */}
        <div className="bg-card rounded-lg border border-border">
          <div className="p-6 border-b border-border">
            <h2 className="text-lg font-semibold">Quick Actions</h2>
            <p className="text-sm text-muted-foreground">Common tasks and shortcuts</p>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-2 gap-4">
              {[
                { title: 'New Booking', icon: 'Calendar', color: 'bg-blue-500', href: '/dashboard/bookings?action=create' },
                { title: 'Add Contact', icon: 'Users', color: 'bg-green-500', href: '/dashboard/contacts?action=add' },
                { title: 'Send Message', icon: 'MessageSquare', color: 'bg-purple-500', href: '/dashboard/messages?action=compose' },
                { title: 'View Reports', icon: 'LayoutDashboard', color: 'bg-orange-500', href: '/dashboard?tab=reports' },
              ].map((action) => (
                <button
                  key={action.title}
                  onClick={() => router.push(action.href)}
                  className="flex flex-col items-center gap-3 p-4 rounded-lg border border-border hover:bg-accent transition-colors"
                >
                  <div className={`w-12 h-12 ${action.color} rounded-lg flex items-center justify-center`}>
                    <Icon name={action.icon as any} className="text-white" size={24} />
                  </div>
                  <span className="font-medium">{action.title}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
