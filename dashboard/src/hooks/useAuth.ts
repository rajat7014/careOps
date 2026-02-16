import { useAuthContext } from '@/context/auth-context';

/**
 * useAuth hook
 * 
 * Convenient hook for accessing authentication state and methods.
 * 
 * @example
 * const { user, login, logout, isAuthenticated } = useAuth();
 */
export function useAuth() {
  return useAuthContext();
}

/**
 * useUser hook
 * 
 * Returns only the user data for components that only need user info.
 * 
 * @example
 * const { user, workspace, role } = useUser();
 */
export function useUser() {
  const { user, workspace, role, isLoading } = useAuthContext();
  return { user, workspace, role, isLoading };
}

/**
 * useIsOwner hook
 * 
 * Returns true if current user is an OWNER.
 * 
 * @example
 * const isOwner = useIsOwner();
 * {isOwner && <OwnerOnlyComponent />}
 */
export function useIsOwner() {
  const { role } = useAuthContext();
  return role === 'OWNER';
}

/**
 * useIsStaff hook
 * 
 * Returns true if current user is a STAFF member.
 */
export function useIsStaff() {
  const { role } = useAuthContext();
  return role === 'STAFF';
}
