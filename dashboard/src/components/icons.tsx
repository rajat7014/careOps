'use client';

import {
  LayoutDashboard,
  Calendar,
  Users,
  Package,
  MessageSquare,
  UserCog,
  Settings,
  Plug,
  CreditCard,
  Menu,
  X,
  Bell,
  Search,
  ChevronDown,
  LogOut,
  Building2,
  Plus,
  type LucideIcon,
} from 'lucide-react';

export type IconName =
  | 'LayoutDashboard'
  | 'Calendar'
  | 'Users'
  | 'Package'
  | 'MessageSquare'
  | 'UserCog'
  | 'Settings'
  | 'Plug'
  | 'CreditCard'
  | 'Menu'
  | 'X'
  | 'Bell'
  | 'Search'
  | 'ChevronDown'
  | 'LogOut'
  | 'Building2'
  | 'Plus';

const iconMap: Record<IconName, LucideIcon> = {
  LayoutDashboard,
  Calendar,
  Users,
  Package,
  MessageSquare,
  UserCog,
  Settings,
  Plug,
  CreditCard,
  Menu,
  X,
  Bell,
  Search,
  ChevronDown,
  LogOut,
  Building2,
  Plus,
};

interface IconProps {
  name: IconName;
  className?: string;
  size?: number;
}

export function Icon({ name, className, size = 20 }: IconProps) {
  const IconComponent = iconMap[name];
  return <IconComponent className={className} size={size} />;
}
