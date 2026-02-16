'use client';

import { useAuth } from '@/hooks/useAuth';
import { Icon } from '@/components/icons';

export default function BillingPage() {
  const { role } = useAuth();

  if (role !== 'OWNER') {
    return (
      <div className="p-4 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive">
        Only workspace owners can access billing.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Billing</h1>
        <p className="text-muted-foreground">Manage your subscription and payments</p>
      </div>

      <div className="border rounded-lg p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-medium">Current Plan</h2>
            <p className="text-3xl font-bold mt-2">Free</p>
            <p className="text-muted-foreground mt-1">Basic features for small teams</p>
          </div>
          <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
            <Icon name="CreditCard" className="text-primary" size={32} />
          </div>
        </div>

        <div className="mt-6 pt-6 border-t">
          <h3 className="font-medium mb-4">Plan Features</h3>
          <ul className="space-y-2">
            {[
              'Up to 100 bookings/month',
              'Email notifications',
              'Basic reporting',
              '2 staff members',
            ].map((feature) => (
              <li key={feature} className="flex items-center gap-2 text-sm">
                <div className="w-4 h-4 rounded-full bg-green-100 flex items-center justify-center">
                  <div className="w-2 h-2 rounded-full bg-green-600" />
                </div>
                {feature}
              </li>
            ))}
          </ul>
        </div>

        <div className="mt-6 pt-6 border-t">
          <button
            disabled
            className="px-4 py-2 rounded-md bg-primary text-primary-foreground font-medium opacity-50 cursor-not-allowed"
          >
            Upgrade (Coming Soon)
          </button>
        </div>
      </div>

      <div className="border rounded-lg p-6">
        <h2 className="text-lg font-medium mb-4">Payment History</h2>
        <p className="text-muted-foreground text-sm">No payments yet</p>
      </div>
    </div>
  );
}
