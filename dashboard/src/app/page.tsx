import Link from 'next/link';

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background">
      <div className="text-center space-y-6">
        <h1 className="text-4xl font-bold tracking-tight">CareOps</h1>
        <p className="text-lg text-muted-foreground max-w-md">
          Event-driven Unified Operations Platform for service businesses
        </p>
        <div className="flex gap-4 justify-center">
          <Link
            href="/dashboard"
            className="inline-flex items-center justify-center rounded-md bg-primary px-6 py-3 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            View Dashboard
          </Link>
          <Link
            href="/dashboard?role=STAFF"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-6 py-3 text-sm font-medium hover:bg-accent hover:text-accent-foreground transition-colors"
          >
            Preview as Staff
          </Link>
        </div>
        
        <div className="pt-8 grid grid-cols-2 gap-8 text-left max-w-lg mx-auto">
          <div>
            <h3 className="font-semibold mb-2">Owner Access</h3>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>Dashboard</li>
              <li>Bookings & Contacts</li>
              <li>Inventory & Messages</li>
              <li>Staff Management</li>
              <li>Settings & Integrations</li>
              <li>Billing</li>
            </ul>
          </div>
          <div>
            <h3 className="font-semibold mb-2">Staff Access</h3>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>Dashboard</li>
              <li>Bookings & Contacts</li>
              <li>Inventory & Messages</li>
              <li className="line-through opacity-50">Staff Management</li>
              <li className="line-through opacity-50">Settings</li>
              <li className="line-through opacity-50">Billing</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
