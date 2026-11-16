'use client';
import { useEffect, useState } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import { usePathname, useRouter } from 'next/navigation';

const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    // Let public pages load immediately
    if (pathname.startsWith('/login') || pathname.startsWith('/auth')) {
      setIsAuthorized(true);
      setIsChecking(false);
      return;
    }

    async function routeUser() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return; 

      // Fetch ONLY organization_id
      let { data: publicUser } = await supabase
        .from('users')
        .select('organization_id')
        .eq('id', session.user.id)
        .single();

      // Grace period: If DB trigger is 1ms behind, retry
      if (!publicUser) {
        await new Promise(resolve => setTimeout(resolve, 500));
        const { data: retryUser } = await supabase.from('users').select('organization_id').eq('id', session.user.id).single();
        publicUser = retryUser;
      }

      // FIX 1: If the DB trigger completely failed (no row), kill the broken session and kick to login
      if (!publicUser) {
        await supabase.auth.signOut();
        router.refresh();
        window.location.replace('/login');
        return; 
      }

      // If NO organization (Family), force them to setup the family
      if (!publicUser.organization_id) {
        if (pathname !== '/setup-family') { 
          router.replace('/setup-family');
          return;
        } else {
          // Explicitly authorize them to view the setup page
          setIsAuthorized(true);
        }
      } 
      // If they have a family, unlock the app
      else {
        if (pathname === '/setup-family') {
          router.replace('/');
          return;
        }
        setIsAuthorized(true);
      }

      setIsChecking(false);
    }

    routeUser();
  }, [pathname, router]);

  // Lock the screen cleanly while routing decisions are made
  if (isChecking && !pathname.startsWith('/login')) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-[#FAFAFA]">
        <div className="h-6 w-6 border-2 border-slate-900 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  // FIX 2: Cleaned up the flash prevention check.
  if (!isAuthorized && !pathname.startsWith('/login')) {
    return null; 
  }

  return <>{children}</>;
}