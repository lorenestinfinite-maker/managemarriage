import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');

  if (code) {
    // 1. Tell it to redirect to the root so AuthGuard can take over
    const response = NextResponse.redirect(`${origin}/`); 
    
    // 2. Initialize the SSR client to set the cookies securely
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() { return request.cookies.getAll(); },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => {
              response.cookies.set(name, value, options);
            });
          },
        },
      }
    );
    
    // 3. Exchange the code for a session and bake the cookies into the response
    await supabase.auth.exchangeCodeForSession(code);
    return response;
  }

  // If something went wrong, send them back to login
  return NextResponse.redirect(`${origin}/login`);
}