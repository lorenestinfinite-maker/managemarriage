'use client';
import './globals.css';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import AuthGuard from '../components/AuthGuard'; // Adjust path if needed

const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  
  const hiddenRoutes = ['/login', '/setup-family', '/create-wedding'];
  const isHiddenPage = hiddenRoutes.includes(pathname);
  
  const [userName, setUserName] = useState('User');
  const [userRole, setUserRole] = useState('MEMBER'); // Added to track role
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  
  // New State for Weddings
  const [weddings, setWeddings] = useState<any[]>([]);
  const [activeWeddingId, setActiveWeddingId] = useState<string>('');

  useEffect(() => {
    async function getUserAndWeddings() {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        // Fallback name
        setUserName(
          session.user.user_metadata?.full_name || 
          session.user.email?.split('@')[0] || 
          'User'
        );

        // Fetch user's organization, true database name, and role
        const { data: user } = await supabase
          .from('users')
          .select('organization_id, first_name, last_name, role')
          .eq('id', session.user.id)
          .single();

        if (user) {
          // Override fallback name with real database name
          const dbName = `${user.first_name || ''} ${user.last_name || ''}`.trim();
          if (dbName) setUserName(dbName);
          
          setUserRole(user.role || 'MEMBER');

          if (user.organization_id) {
            // Fetch weddings for this organization
            const { data: orgWeddings } = await supabase
              .from('weddings')
              .select('id, name')
              .eq('organization_id', user.organization_id)
              .order('created_at', { ascending: true });

            if (orgWeddings && orgWeddings.length > 0) {
              setWeddings(orgWeddings);
              
              // Check if they already have an active wedding saved in browser
              const savedWeddingId = localStorage.getItem('active_wedding_id');
              if (savedWeddingId && orgWeddings.find(w => w.id === savedWeddingId)) {
                setActiveWeddingId(savedWeddingId);
              } else {
                // Default to the first wedding and save it
                setActiveWeddingId(orgWeddings[0].id);
                localStorage.setItem('active_wedding_id', orgWeddings[0].id);
              }
            }
          }
        }
      }
    }
    if (!isHiddenPage) getUserAndWeddings();
  }, [isHiddenPage]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    localStorage.removeItem('active_wedding_id'); // Clear active wedding on logout
    router.refresh(); 
    router.replace('/login');
  };

  const handleWeddingChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newId = e.target.value;
    setActiveWeddingId(newId);
    localStorage.setItem('active_wedding_id', newId);
    window.location.reload(); // Force reload so the dashboard fetches the new wedding's data
  };

  return (
    <html lang="en" className="h-full bg-[#FAFAFA]">
      <body className="flex flex-col md:flex-row h-full text-slate-900 font-sans antialiased m-0 overflow-hidden">
        
        {!isHiddenPage && (
          <>
            {/* DESKTOP SIDEBAR */}
            <aside className="hidden md:flex w-80 bg-white border-r border-slate-100/80 flex-col justify-between p-8 shrink-0 h-full relative z-50">
              <div className="space-y-12">
                <div className="flex items-center gap-4 px-2">
                  <div className="flex items-center justify-center w-12 h-12 rounded-[0.8rem] bg-slate-950 text-white font-black text-lg shrink-0 shadow-lg">
                    MM
                  </div>
                  <div>
                    <h1 className="text-lg font-black tracking-tight text-slate-900 leading-none">manage</h1>
                    <span className="text-xs font-bold uppercase tracking-[0.15em] text-indigo-600 mt-0.5 block">marriage</span>
                  </div>
                </div>

                <nav className="space-y-2">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.15em] px-3 mb-4">Core Ledger</p>
                  
                  <Link href="/" className={`flex items-center gap-3.5 px-4 py-3 rounded-2xl font-semibold text-sm transition-all ${pathname === '/' ? 'bg-slate-950 text-white shadow-lg' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'}`}>
                    <span>📊</span> Dashboard
                  </Link>

                  <Link href="/expense" className={`flex items-center gap-3.5 px-4 py-3 rounded-2xl font-semibold text-sm transition-all ${pathname === '/expense' ? 'bg-slate-950 text-white shadow-lg' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'}`}>
                    <span>💸</span> Expenses
                  </Link>

                  <Link href="/categories" className={`flex items-center gap-3.5 px-4 py-3 rounded-2xl font-semibold text-sm transition-all ${pathname === '/categories' ? 'bg-slate-950 text-white shadow-lg' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'}`}>
                    <span>📁</span> Categories
                  </Link>

                  <Link href="/team" className={`flex items-center gap-3.5 px-4 py-3 rounded-2xl font-semibold text-sm transition-all ${pathname === '/team' ? 'bg-slate-950 text-white shadow-lg' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'}`}>
                    <span>👥</span> Team
                  </Link>
                  <Link href="/budget" className={`flex items-center gap-3.5 px-4 py-3 rounded-2xl font-semibold text-sm transition-all ${pathname === '/budget' ? 'bg-slate-950 text-white shadow-lg' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'}`}>
                    <span>💰</span> Budget
                  </Link>
                </nav>
              </div>

              <div className="space-y-4 border-t border-slate-100 pt-6">
                
                {/* User Profile */}
                <Link href="/settings" className="flex items-center gap-3 px-2">
                  <div className="w-10 h-10 rounded-full bg-indigo-50 border border-indigo-100 flex items-center justify-center text-sm font-bold text-indigo-700 uppercase shrink-0">
                    {userName.charAt(0)}
                  </div>
                  <div className="overflow-hidden">
                    <p className="text-sm font-bold text-slate-900 truncate">{userName}</p>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-0.5">{userRole.replace('_', ' ')}</p>
                  </div>
                </Link>

                {/* Wedding Selector Dropdown */}
                {weddings.length > 0 && (
                  <div className="px-2 pt-2 pb-2">
                    <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-2 block">Active Wedding Workspace</label>
                    <div className="flex gap-2">
                      <select 
                        value={activeWeddingId} 
                        onChange={handleWeddingChange}
                        className="flex-1 bg-slate-50 border border-slate-200 text-slate-900 text-xs font-bold rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500 appearance-none cursor-pointer truncate"
                      >
                        {weddings.map(w => (
                          <option key={w.id} value={w.id}>{w.name}</option>
                        ))}
                      </select>
                      
                      {/* ONLY display + button if user is an ORGANIZER */}
                      {userRole === 'ORGANIZER' && (
                        <button 
                          onClick={() => router.push('/create-wedding')}
                          className="w-9 h-9 flex items-center justify-center bg-indigo-50 text-indigo-600 rounded-xl hover:bg-indigo-100 transition shrink-0 font-bold text-lg"
                          title="Create New Wedding"
                        >
                          +
                        </button>
                      )}
                    </div>
                  </div>
                )}

                <button onClick={handleLogout} className="w-full flex items-center gap-3 px-4 py-3 text-sm font-bold text-rose-500 hover:bg-rose-50 rounded-2xl transition">
                  🚪 Sign Out
                </button>
              </div>
            </aside>

            {/* MOBILE BOTTOM NAVIGATION BAR & MENU DRAWER */}
            <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-md border-t border-slate-200 z-50 px-6 py-3 flex justify-around items-center shadow-lg">
              <Link href="/settings" className="w-10 h-10 rounded-full bg-indigo-50 border border-indigo-100 flex items-center justify-center text-sm font-bold text-indigo-700 uppercase shrink-0">
                {userName.charAt(0)}
              </Link>
              <button onClick={() => setIsMobileMenuOpen(true)} className="flex flex-col items-center gap-1 text-slate-400">
                <span className="text-lg">☰</span>
                <span className="text-[9px] font-bold">Menu</span>
              </button>
            </div>

            {/* MOBILE FULL-SCREEN MENU DRAWER */}
            {isMobileMenuOpen && (
              <div className="md:hidden fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-[100] flex flex-col justify-end p-4">
                <div className="bg-white rounded-[2.5rem] p-6 space-y-4 shadow-2xl border border-slate-100">
                  <div className="flex justify-between items-center pb-4 border-b border-slate-100">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Navigation Menu</span>
                    <button onClick={() => setIsMobileMenuOpen(false)} className="w-8 h-8 rounded-full bg-slate-100 text-slate-700 font-bold flex items-center justify-center">✕</button>
                  </div>
                  
                  {/* Mobile Wedding Selector */}
                  {weddings.length > 0 && (
                    <div className="mb-2">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2 block">Active Workspace</label>
                      <div className="flex gap-2">
                        <select 
                          value={activeWeddingId} 
                          onChange={(e) => {
                            handleWeddingChange(e);
                            setIsMobileMenuOpen(false);
                          }}
                          className="flex-1 bg-slate-50 border border-slate-200 text-slate-900 text-xs font-bold rounded-xl px-4 py-3 outline-none"
                        >
                          {weddings.map(w => (
                            <option key={w.id} value={w.id}>{w.name}</option>
                          ))}
                        </select>
                        
                        {/* ONLY display + button if user is an ORGANIZER */}
                        {userRole === 'ORGANIZER' && (
                          <button 
                            onClick={() => {
                              setIsMobileMenuOpen(false);
                              router.push('/create-wedding');
                            }}
                            className="w-12 h-12 flex items-center justify-center bg-indigo-50 text-indigo-600 rounded-xl font-bold text-xl shrink-0"
                          >
                            +
                          </button>
                        )}
                      </div>
                    </div>
                  )}

                  <div className="space-y-2 border-t border-slate-100 pt-4">
                    <Link href="/" onClick={() => setIsMobileMenuOpen(false)} className="flex items-center gap-3 p-3 rounded-2xl bg-slate-50 font-bold text-xs text-slate-900">📊 Dashboard</Link>
                    <Link href="/expense" onClick={() => setIsMobileMenuOpen(false)} className="flex items-center gap-3 p-3 rounded-2xl bg-slate-50 font-bold text-xs text-slate-900">💸 Expenses</Link>
                    <Link href="/categories" onClick={() => setIsMobileMenuOpen(false)} className="flex items-center gap-3 p-3 rounded-2xl bg-slate-50 font-bold text-xs text-slate-900">📁 Categories</Link>
                    <Link href="/team" onClick={() => setIsMobileMenuOpen(false)} className="flex items-center gap-3 p-3 rounded-2xl bg-slate-50 font-bold text-xs text-slate-900">👥 Team</Link>
                    <Link href="/budget" onClick={() => setIsMobileMenuOpen(false)} className="flex items-center gap-3 p-3 rounded-2xl bg-slate-50 font-bold text-xs text-slate-900">💰 Budget</Link>
                  </div>

                  <button onClick={handleLogout} className="w-full bg-rose-50 text-rose-600 font-bold py-3 rounded-2xl text-xs mt-2">
                    🚪 Sign Out
                  </button>
                </div>
              </div>
            )}
          </>
        )}

        {/* Main Application Shell with Global Auth Guard */}
        <main className="flex-1 h-full overflow-y-auto bg-[#FAFAFA] pb-24 md:pb-0">
          <AuthGuard>
            {children}
          </AuthGuard>
        </main>
      </body>
    </html>
  );
}