import { NavItem, UserRole } from '@/types';

export const navigationItems: NavItem[] = [
  {
    title: 'Dashboard',
    href: '/dashboard',
    icon: 'LayoutDashboard',
    roles: ['OWNER', 'STAFF'],
  },
  {
    title: 'Bookings',
    href: '/dashboard/bookings',
    icon: 'Calendar',
    roles: ['OWNER', 'STAFF'],
  },
  {
    title: 'Contacts',
    href: '/dashboard/contacts',
    icon: 'Users',
    roles: ['OWNER', 'STAFF'],
  },
  {
    title: 'Inventory',
    href: '/dashboard/inventory',
    icon: 'Package',
    roles: ['OWNER', 'STAFF'],
  },
  {
    title: 'Messages',
    href: '/dashboard/messages',
    icon: 'MessageSquare',
    roles: ['OWNER', 'STAFF'],
  },
  // Owner-only routes
  {
    title: 'Staff',
    href: '/dashboard/staff',
    icon: 'UserCog',
    roles: ['OWNER'],
  },
  {
    title: 'Settings',
    href: '/dashboard/settings',
    icon: 'Settings',
    roles: ['OWNER'],
  },
  {
    title: 'Integrations',
    href: '/dashboard/integrations',
    icon: 'Plug',
    roles: ['OWNER'],
  },
  {
    title: 'Billing',
    href: '/dashboard/billing',
    icon: 'CreditCard',
    roles: ['OWNER'],
  },
];

export function getNavigationForRole(role: UserRole): NavItem[] {
  return navigationItems.filter((item) => item.roles.includes(role));
}
