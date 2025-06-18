import { NextResponse } from 'next/server';
import { jwtVerify } from 'jose'; // Make sure to install 'jose' if not already installed

export async function middleware(request) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get('token')?.value;
  
  // Define route categories
  const isAuthRoute = pathname.startsWith('/login') || 
                      pathname.startsWith('/signup') || 
                      pathname.startsWith('/forgot-password') ||
                      pathname.startsWith('/reset-password');
  
  const isApiAuthRoute = pathname.startsWith('/api/auth') && 
                         !pathname.includes('/api/auth/me');
                         
  // Define limited access routes (view-only content)
  const isLimitedAccessRoute = pathname === '/' || 
                              pathname === '/home' || 
                              pathname.startsWith('/explore') || 
                              pathname.match(/^\/discussion\/[^\/]+$/); // Match discussion view pages
  
  // Define interactive API routes that require email verification
  const isInteractiveApiRoute = pathname.includes('/api/posts') && 
                               (pathname.includes('/vote') || 
                                pathname.includes('/comments') || 
                                pathname.includes('/create') ||
                                (pathname.includes('/api/posts') && (request.method === 'POST' || request.method === 'PATCH'))) ||
                                pathname.includes('/api/community-posts');
  
  // Check if the user is authenticated
  const isAuthenticated = !!token;
  
  // Check verification status if authenticated
  let isVerified = false;
  let userId = null;
  
  if (isAuthenticated) {
    try {
      // Decode the JWT to check verification status
      const secret = new TextEncoder().encode(process.env.NEXTAUTH_SECRET);
      const { payload } = await jwtVerify(token, secret);
      isVerified = payload.isVerified === true;
      userId = payload.id;
    } catch (error) {
      console.error('Token verification error:', error);
      // If token is invalid, treat as not authenticated
      return NextResponse.redirect(new URL('/login', request.url));
    }
  }
  
  // Redirect logic
  if (isAuthRoute && isAuthenticated) {
    // Redirect to home if trying to access auth pages while logged in
    return NextResponse.redirect(new URL('/', request.url));
  }
  
  // Handle interactive API routes - require verified status
  if (isInteractiveApiRoute && isAuthenticated && !isVerified) {
    return NextResponse.json(
      { message: 'Email verification required for this action' },
      { status: 403 }
    );
  }
  
  // For non-auth routes that are not limited access, require authentication
  if (!isAuthRoute && !isApiAuthRoute && !isLimitedAccessRoute && !isAuthenticated) {
    // Redirect to login if trying to access protected pages while not logged in
    return NextResponse.redirect(new URL('/login', request.url));
  }
  
  // For limited access routes, allow access even without authentication
  if (isLimitedAccessRoute) {
    // Add verification status to the request headers for the application to use
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set('x-user-auth-status', isAuthenticated ? (isVerified ? 'verified' : 'unverified') : 'guest');
    if (userId) {
      requestHeaders.set('x-user-id', userId);
    }
    
    return NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    });
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