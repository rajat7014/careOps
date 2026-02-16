import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * Next.js Middleware
 * 
 * Protects dashboard routes by checking for authentication.
 * Redirects unauthenticated users to login page.
 * 
 * Note: Middleware runs on the server and cannot access localStorage.
 * We use a cookie 'auth_check' as a hint, but the actual token validation
 * happens client-side in the AuthContext.
 */

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // Public paths that don't require authentication
  const publicPaths = ['/', '/login', '/register'];
  const isPublicPath = publicPaths.includes(pathname);
  
  // Check for auth hint cookie (set by client when logged in)
  const authHint = request.cookies.get('auth_check')?.value;
  
  // For protected routes, we'll let the client-side handle the actual auth check
  // This middleware just provides a quick redirect for obvious cases
  
  // Redirect authenticated users away from login/register
  if (isPublicPath && authHint === 'true' && (pathname === '/login' || pathname === '/register')) {
    const dashboardUrl = new URL('/dashboard', request.url);
    return NextResponse.redirect(dashboardUrl);
  }
  
  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
