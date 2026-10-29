import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs';
import { NextResponse } from 'next/server';

export async function middleware(request: NextRequest) {
  const supabase = createMiddlewareClient({ req: request, res: NextResponse.next() });
  const { data: { session } } = await supabase.auth.getSession();
  
  // If user is not authenticated and trying to access dashboard
  if (!session && request.nextUrl.pathname.startsWith('/dashboard')) {
    return NextResponse.redirect(new URL('/login', request.url));
  }
  
  // If user is authenticated but not approved, redirect to waiting room
  if (session && request.nextUrl.pathname.startsWith('/dashboard') && !request.nextUrl.pathname.includes('/admin')) {
    const { data: userData, error } = await supabase
      .from('users')
      .select('is_approved')
      .eq('id', session.user.id)
      .single();
    
    if (error) {
      return NextResponse.redirect(new URL('/login', request.url));
    }
    
    if (!userData.is_approved) {
      return NextResponse.redirect(new URL('/waiting-room', request.url));
    }
  }
  
  return NextResponse.next();
}

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/login',
    '/signup',
    '/waiting-room'
  ],
};
