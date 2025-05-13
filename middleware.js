import { NextResponse } from 'next/server';

export function middleware(request) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get('token')?.value;
  
  // Define public and protected paths
  const isAuthRoute = pathname.startsWith('/login') || 
                       pathname.startsWith('/signup') || 
                       pathname.startsWith('/forgot-password');
  
  const isApiAuthRoute = pathname.startsWith('/api/auth') && 
                         !pathname.includes('/api/auth/me');
  
  // Check if the user is authenticated
  const isAuthenticated = !!token;
  
  // Redirect logic
  if (isAuthRoute && isAuthenticated) {
    // Redirect to home if trying to access auth pages while logged in
    return NextResponse.redirect(new URL('/', request.url));
  }
  
  if (!isAuthRoute && !isApiAuthRoute && !isAuthenticated) {
    // Redirect to login if trying to access protected pages while not logged in
    return NextResponse.redirect(new URL('/login', request.url));
  }
  
  return NextResponse.next();
}

// Specify paths middleware should run on
export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public directory
     */
    '/((?!_next/static|_next/image|favicon.ico|public).*)',
  ],
};