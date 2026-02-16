'use client';

import { useRouter } from 'next/navigation';
import { Icon } from '@/components/icons';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';

interface TopBarProps {
  userName: string;
  userEmail: string;
  onMenuClick: () => void;
}

export function TopBar({ userName, userEmail, onMenuClick }: TopBarProps) {
  const router = useRouter();
  const { logout } = useAuth();

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  return (
    <header className="h-16 bg-card border-b border-border flex items-center justify-between px-4 lg:px-6">
      {/* Left side - Mobile menu button */}
      <button
        onClick={onMenuClick}
        className="lg:hidden p-2 -ml-2 rounded-md hover:bg-accent"
      >
        <Icon name="Menu" size={20} />
      </button>

      {/* Search bar - hidden on mobile */}
      <div className="hidden md:flex items-center flex-1 max-w-md ml-4">
        <div className="relative w-full">
          <Icon
            name="Search"
            className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
            size={16}
          />
          <input
            type="text"
            placeholder="Search..."
            className={cn(
              'w-full pl-10 pr-4 py-2 rounded-md border border-input',
              'bg-background text-sm',
              'focus:outline-none focus:ring-2 focus:ring-ring'
            )}
          />
        </div>
      </div>

      {/* Right side */}
      <div className="flex items-center gap-2 ml-auto">
        {/* Notifications */}
        <button className="relative p-2 rounded-md hover:bg-accent">
          <Icon name="Bell" size={20} />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-destructive rounded-full" />
        </button>

        {/* User menu */}
        <div className="flex items-center gap-3 pl-4 border-l border-border">
          <div className="hidden sm:block text-right">
            <p className="text-sm font-medium">{userName}</p>
            <p className="text-xs text-muted-foreground">{userEmail}</p>
          </div>
          <div className="relative group">
            <button className="flex items-center gap-2 p-2 rounded-md hover:bg-accent">
              <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
                <span className="text-primary-foreground text-sm font-medium">
                  {userName.charAt(0).toUpperCase()}
                </span>
              </div>
              <Icon name="ChevronDown" size={16} className="hidden sm:block text-muted-foreground" />
            </button>
            
            {/* Dropdown menu */}
            <div className="absolute right-0 top-full mt-1 w-48 py-1 bg-card border border-border rounded-md shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50">
              <button
                onClick={handleLogout}
                className="w-full px-4 py-2 text-left text-sm text-destructive hover:bg-accent flex items-center gap-2"
              >
                <Icon name="LogOut" size={16} />
                Logout
              </button>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
