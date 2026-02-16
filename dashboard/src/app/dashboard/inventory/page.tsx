'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { Icon } from '@/components/icons';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';

interface InventoryItem {
  id: string;
  name: string;
  quantity: number;
  threshold: number;
}

export default function InventoryPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login');
      return;
    }
    if (isAuthenticated) fetchInventory();
  }, [isAuthenticated, authLoading, router]);

  const fetchInventory = async () => {
    try {
      setIsLoading(true);
      const response = await api.get<{ success: boolean; data: InventoryItem[] }>('/inventory');
      if (response.success) setItems(response.data);
    } catch (err: any) {
      if (err.status === 401) router.push('/login');
      else setError(err.message || 'Failed to load inventory');
    } finally {
      setIsLoading(false);
    }
  };

  const lowStockItems = items.filter(item => item.quantity <= item.threshold);

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
        <h1 className="text-2xl font-bold tracking-tight">Inventory</h1>
        <p className="text-muted-foreground">Track your stock and supplies</p>
      </div>

      {lowStockItems.length > 0 && (
        <div className="p-4 rounded-lg bg-yellow-50 border border-yellow-200">
          <div className="flex items-center gap-2 text-yellow-800 font-medium mb-2">
            <Icon name="Bell" size={16} />
            Low Stock Alerts ({lowStockItems.length})
          </div>
          <ul className="text-sm text-yellow-700 space-y-1">
            {lowStockItems.map(item => (
              <li key={item.id}>{item.name}: {item.quantity} remaining (threshold: {item.threshold})</li>
            ))}
          </ul>
        </div>
      )}

      {items.length === 0 ? (
        <div className="text-center py-12 border border-dashed border-border rounded-lg">
          <Icon name="Package" className="mx-auto h-12 w-12 text-muted-foreground/50" />
          <h3 className="mt-4 text-lg font-medium">No inventory items</h3>
          <p className="text-muted-foreground mt-1">Add items to track your stock</p>
        </div>
      ) : (
        <div className="border rounded-lg overflow-hidden">
          <table className="w-full">
            <thead className="bg-muted">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-medium">Item</th>
                <th className="px-4 py-3 text-left text-sm font-medium">Quantity</th>
                <th className="px-4 py-3 text-left text-sm font-medium">Threshold</th>
                <th className="px-4 py-3 text-left text-sm font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {items.map((item) => (
                <tr key={item.id} className="hover:bg-muted/50">
                  <td className="px-4 py-3 font-medium">{item.name}</td>
                  <td className="px-4 py-3 text-sm">{item.quantity}</td>
                  <td className="px-4 py-3 text-sm">{item.threshold}</td>
                  <td className="px-4 py-3">
                    <span className={cn(
                      'inline-flex px-2 py-1 text-xs font-medium rounded-full',
                      item.quantity <= item.threshold 
                        ? 'bg-red-100 text-red-800' 
                        : 'bg-green-100 text-green-800'
                    )}>
                      {item.quantity <= item.threshold ? 'Low Stock' : 'In Stock'}
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
