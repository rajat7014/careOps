'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Icon } from '@/components/icons';
import { getNavigationForRole } from '@/lib/navigation';
import { UserRole } from '@/types';

interface SidebarProps {
  role: UserRole;
  workspaceName: string;
  isOpen: boolean;
  onClose: () => void;
}

export function Sidebar({ role, workspaceName, isOpen, onClose }: SidebarProps) {
  const pathname = usePathname();
  const navItems = getNavigationForRole(role);

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed top-0 left-0 z-50 h-full w-64 bg-card border-r border-border',
          'transform transition-transform duration-200 ease-in-out',
          'lg:translate-x-0 lg:static lg:h-screen',
          isOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        {/* Logo */}
        <div className="h-16 flex items-center px-6 border-b border-border">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <Icon name="Building2" className="text-primary-foreground" size={18} />
            </div>
            <span className="font-semibold text-lg">CareOps</span>
          </div>
        </div>

        {/* Workspace name */}
        <div className="px-4 py-3 border-b border-border">
          <p className="text-xs text-muted-foreground uppercase tracking-wider">Workspace</p>
          <p className="text-sm font-medium truncate">{workspaceName}</p>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-4 px-3">
          <ul className="space-y-1">
            {navItems.map((item) => {
              const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={onClose}
                    className={cn(
                      'flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors',
                      isActive
                        ? 'bg-primary text-primary-foreground'
                        : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                    )}
                  >
                    <Icon name={item.icon as any} size={18} />
                    {item.title}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Role badge */}
        <div className="p-4 border-t border-border">
          <div className="flex items-center gap-2 px-3 py-2 rounded-md bg-secondary">
            <div className={cn(
              'w-2 h-2 rounded-full',
              role === 'OWNER' ? 'bg-blue-500' : 'bg-green-500'
            )} />
            <span className="text-sm font-medium">{role}</span>
          </div>
        </div>
      </aside>
    </>
  );
}
