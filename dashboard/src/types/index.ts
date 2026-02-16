export type UserRole = 'OWNER' | 'STAFF';

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
}

export interface Workspace {
  id: string;
  name: string;
  slug: string;
  isActive: boolean;
}

export interface NavItem {
  title: string;
  href: string;
  icon: string;
  roles: UserRole[];
}
