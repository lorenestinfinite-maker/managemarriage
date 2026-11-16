'use client';
import { useState, useEffect } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import Link from 'next/link';

const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const ADMIN_EMAIL = 'surajgowda@gmail.com'; // Organizer Email

export default function Dashboard() {
  const [transactions, setTransactions] = useState<any[]>([]);
  const [categoryStats, setCategoryStats] = useState<any[]>([]);
  const [userStats, setUserStats] = useState<any[]>([]);
  
  // Ping States
  const [pings, setPings] = useState<any[]>([]);
  const [currentUser, setCurrentUser] = useState<any>(null);
  
  const [totalSpent, setTotalSpent] = useState(0);
  const [totalBudget, setTotalBudget] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        setCurrentUser(session.user);
      }
      const user = session?.user;
      const isOrganizer = user?.email === ADMIN_EMAIL;

      // 1. Grab the active wedding ID from the browser
      const activeWeddingId = localStorage.getItem('active_wedding_id');
      
      // If there is no wedding selected yet, stop fetching to prevent a crash
      if (!activeWeddingId) {
        setLoading(false);
        return;
      }

      try {
        // 2. Inject .eq('wedding_id', activeWeddingId) into EVERY database query
        const [txRes, catRes, pingRes, budRes] = await Promise.all([
          supabase.from('transactions').select('*').eq('wedding_id', activeWeddingId).order('transaction_date', { ascending: false }),
          supabase.from('categories').select('*'),
          supabase.from('pings').select('*, transactions(description, user_id)').eq('wedding_id', activeWeddingId).order('created_at', { ascending: false }),
          supabase.from('wedding_budgets').select('*').eq('wedding_id', activeWeddingId)
        ]);

        const txData = txRes.data || [];
        const catData = catRes.data || [];
        const pingData = pingRes.data || [];
        const budData = budRes.data || [];

        const spent = txData.reduce((sum, t) => sum + Number(t.amount), 0);
        const totalBudgetRow = budData.find(b => b.category_name === 'Total Budget');
        const totBudget = totalBudgetRow ? Number(totalBudgetRow.budget) : 0;
        
        const groupedStats = catData.map(cat => {
          const catSpent = txData
            .filter(t => t.category === cat.name)
            .reduce((sum, t) => sum + Number(t.amount), 0);
          
          const catBudget = budData
          .filter(c => c.category_name === cat.name)
          .reduce((sum, c) => sum + Number(c.budget), 0);
          const percent = catBudget > 0 ? Math.min((catSpent / catBudget) * 100, 100) : (catSpent > 0 ? 100 : 0);
          const shareOfTotal = spent > 0 ? (catSpent / spent) * 100 : 0;

          return {
            name: cat.name,
            budget: catBudget,
            spent: catSpent,
            percent,
            shareOfTotal,
            isOverBudget: catBudget > 0 && catSpent > catBudget
          };
        }).sort((a, b) => b.spent - a.spent);

        const userMap: { [key: string]: number } = {};
        txData.forEach(t => {
          const name = t.user_name || t.user_email?.split('@')[0] || 'Organizer';
          userMap[name] = (userMap[name] || 0) + Number(t.amount);
        });

        const userComparison = Object.keys(userMap).map(name => ({
          name,
          spent: userMap[name],
          share: spent > 0 ? (userMap[name] / spent) * 100 : 0
        })).sort((a, b) => b.spent - a.spent);

        // Filter Pings: Show if Organizer OR if the logged-in user is the creator of the pinged expense
        const relevantPings = pingData.filter(ping => isOrganizer || (user && ping.transactions?.user_id === user.id));

        setTransactions(txData);
        setCategoryStats(groupedStats);
        setUserStats(userComparison);
        setPings(relevantPings);
        setTotalSpent(spent);
        setTotalBudget(totBudget);

      } catch (err) {
        console.error("Fetch error:", err);
      } finally {
        setLoading(false);
      }
    }
    
    fetchData();
  }, []);

  const dismissPing = async (id: string) => {
    await supabase.from('pings').delete().eq('id', id);
    setPings(pings.filter(p => p.id !== id));
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#FAFAFA]">
        <div className="h-6 w-6 border-2 border-slate-900 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  const totalPercent = totalBudget > 0 ? Math.min((totalSpent / totalBudget) * 100, 100) : 0;
  const remaining = totalBudget - totalSpent;
  const isBleeding = remaining < 0;

  const topOutliers = [...transactions].sort((a, b) => Number(b.amount) - Number(a.amount)).slice(0, 3);

  return (
    <div className="min-h-screen bg-[#FAFAFA] text-slate-900 font-sans selection:bg-slate-200">
      <div className="max-w-[1400px] mx-auto p-6 md:p-12 space-y-8">
        
        {/* Navigation / Header */}
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight text-slate-950">Financial Command Center</h1>
            <p className="text-sm font-medium text-slate-500 mt-1">Deep analytics, burn rates, and budget variance metrics</p>
          </div>
        </header>

        {/* Bento Grid Row 1: Hero Financial Card & Quick Analytics */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
          
          {/* Main Hero Card */}
          <div className="xl:col-span-2 relative bg-slate-950 rounded-[2.5rem] p-8 md:p-10 overflow-hidden shadow-2xl shadow-slate-900/10 flex flex-col justify-between">
            <div className="absolute top-0 right-0 -mr-20 -mt-20 w-96 h-96 rounded-full bg-blue-500/15 blur-3xl pointer-events-none"></div>
            
            <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-end gap-6 border-b border-white/10 pb-8 mb-8">
              <div>
                <p className="text-slate-400 text-xs font-bold tracking-widest uppercase mb-2">Total Expenditure</p>
                <h2 className="text-5xl md:text-6xl font-black text-white tracking-tighter">
                  ₹{totalSpent.toLocaleString('en-IN')}
                </h2>
              </div>
              <div className="text-left md:text-right">
                <p className="text-slate-400 text-xs font-bold tracking-widest uppercase mb-1">Net Balance / Variance</p>
                <p className={`text-2xl font-black tracking-tight ${isBleeding ? 'text-rose-400' : 'text-emerald-400'}`}>
                  {isBleeding ? `-₹${Math.abs(remaining).toLocaleString('en-IN')}` : `+₹${remaining.toLocaleString('en-IN')}`}
                </p>
              </div>
            </div>

            <div className="relative z-10 space-y-3">
              <div className="flex justify-between items-center text-xs font-bold text-slate-400 uppercase tracking-wider">
                <span>Master Burn Rate Allocation</span>
                <span className="text-white">{totalPercent.toFixed(1)}% of ₹{totalBudget.toLocaleString('en-IN')} Limit</span>
              </div>
              <div className="w-full bg-white/10 rounded-full h-2 overflow-hidden">
                <div 
                  className={`h-full rounded-full transition-all duration-1000 ease-out ${totalPercent > 90 ? 'bg-rose-500' : 'bg-gradient-to-r from-indigo-500 to-rose-400'}`}
                  style={{ width: `${totalPercent}%` }}
                ></div>
              </div>
            </div>
          </div>

          {/* Top Expense Outliers Card */}
          <div className="bg-white rounded-[2.5rem] p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100/80 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-base font-bold tracking-tight text-slate-950">Top Expense Outliers</h3>
                <span className="text-[10px] font-bold bg-amber-50 text-amber-700 px-2.5 py-1 rounded-full uppercase tracking-wider">Highest Impact</span>
              </div>
              <div className="space-y-4 max-h-[160px] overflow-y-auto pr-2">
                {topOutliers.map((item, i) => (
                  <div key={item.id || i} className="flex items-center justify-between p-3 rounded-2xl bg-slate-50/60 border border-slate-100">
                    <div className="overflow-hidden pr-2">
                      <p className="text-xs font-bold text-slate-900 truncate">{item.description}</p>
                      <p className="text-[10px] font-medium text-slate-400 mt-0.5">{item.category}</p>
                    </div>
                    <span className="text-xs font-black text-slate-900 shrink-0">₹{Number(item.amount).toLocaleString('en-IN')}</span>
                  </div>
                ))}
                {topOutliers.length === 0 && (
                  <p className="text-xs text-slate-400 text-center py-6">No transactions recorded.</p>
                )}
              </div>
            </div>
            <div className="text-[11px] font-medium text-slate-400 pt-4 border-t border-slate-100 text-center">
              Total Recorded Transactions: <strong className="text-slate-900">{transactions.length}</strong>
            </div>
          </div>

        </div>

        {/* --- ALWAYS VISIBLE PINGS & DISCREPANCY ALERTS SECTION --- */}
        <div className="bg-white rounded-[2.5rem] p-6 md:p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100/80">
          <div className="flex items-center gap-3 mb-6">
            <span className={`w-3 h-3 rounded-full ${pings.length > 0 ? 'bg-rose-500 animate-pulse' : 'bg-slate-200'}`}></span>
            <h3 className="text-base font-bold text-slate-950">Discrepancy Alerts & Edit Requests ({pings.length})</h3>
          </div>
          
          <div className="space-y-4 max-h-[300px] overflow-y-auto pr-2">
            {pings.length > 0 ? (
              pings.map((ping) => {
                const isNew = new Date(ping.created_at).toDateString() === new Date().toDateString();
                
                return (
                  <div key={ping.id} className="p-4 rounded-2xl bg-slate-50/60 border border-slate-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <p className="text-xs font-bold text-slate-900">Expense: {ping.transactions?.description}</p>
                        {isNew && (
                          <span className="bg-rose-500 text-white text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                            New
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] font-medium text-slate-600">"{ping.message}"</p>
                      <p className="text-[9px] text-slate-400 mt-1 uppercase tracking-wider">
                        {new Date(ping.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </p>
                    </div>
                    <div className="flex gap-2 w-full md:w-auto">
                      <Link href="/expense" className="flex-1 md:flex-none text-center bg-slate-900 text-white text-[11px] font-bold px-4 py-2 rounded-xl transition hover:bg-slate-800">
                        Go to Ledger
                      </Link>
                      <button onClick={() => dismissPing(ping.id)} className="flex-1 md:flex-none bg-white hover:bg-slate-50 border border-slate-200 text-slate-600 text-[11px] font-bold px-4 py-2 rounded-xl transition">
                        Dismiss
                      </button>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="flex flex-col items-center justify-center py-8 text-center bg-slate-50/50 rounded-2xl border border-slate-100 border-dashed">
                <span className="text-2xl mb-2">✅</span>
                <p className="text-xs font-bold text-slate-900">All caught up!</p>
                <p className="text-[10px] text-slate-400 mt-1">No pending ping requests for your attention.</p>
              </div>
            )}
          </div>
        </div>

        {/* Bento Grid Row 2: UPGRADED 4-COLUMN LAYOUT */}
        <div className="grid grid-cols-1 xl:grid-cols-4 gap-8">
          
          {/* 1. Category Share Distribution Bar */}
          <div className="bg-white rounded-[2.5rem] p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100/80 flex flex-col justify-between xl:col-span-1">
            <div>
              <h3 className="text-base font-bold tracking-tight text-slate-950 mb-2">Expenditure Share</h3>
              <p className="text-[10px] text-slate-400 mb-6">Proportional breakdown of funds</p>
              
              <div className="w-full h-4 rounded-full bg-slate-100 flex overflow-hidden mb-6 gap-0.5">
                {categoryStats.map((cat, idx) => {
                  if (cat.spent <= 0) return null;
                  const colors = ['bg-indigo-600', 'bg-rose-500', 'bg-amber-500', 'bg-emerald-500', 'bg-purple-500', 'bg-cyan-500'];
                  return (
                    <div 
                      key={idx} 
                      className={`h-full ${colors[idx % colors.length]} transition-all duration-500`}
                      style={{ width: `${cat.shareOfTotal}%` }}
                      title={`${cat.name}: ${cat.shareOfTotal.toFixed(1)}%`}
                    ></div>
                  );
                })}
              </div>

              <div className="space-y-2.5 max-h-[160px] overflow-y-auto pr-2">
                {categoryStats.map((cat, idx) => {
                  if (cat.spent <= 0) return null;
                  const dotColors = ['bg-indigo-600', 'bg-rose-500', 'bg-amber-500', 'bg-emerald-500', 'bg-purple-500', 'bg-cyan-500'];
                  return (
                    <div key={idx} className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <span className={`w-2.5 h-2.5 rounded-full ${dotColors[idx % dotColors.length]}`}></span>
                        <span className="font-semibold text-slate-700 truncate max-w-[80px]">{cat.name}</span>
                      </div>
                      <span className="font-bold text-slate-900">{cat.shareOfTotal.toFixed(1)}%</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* 2. User/Organizer Spend Comparison */}
          <div className="bg-white rounded-[2.5rem] p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100/80 flex flex-col justify-between xl:col-span-1">
            <div>
              <h3 className="text-base font-bold tracking-tight text-slate-950 mb-2">Organizer Spend</h3>
              <p className="text-[10px] text-slate-400 mb-6">Compare spending by team members</p>
              
              <div className="space-y-4 max-h-[190px] overflow-y-auto pr-1">
                {userStats.map((u, i) => (
                  <div key={i} className="space-y-1.5 p-3 rounded-2xl bg-slate-50/60 border border-slate-100">
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-bold text-slate-900 truncate max-w-[100px]">{u.name}</span>
                      <span className="font-black text-slate-900">₹{u.spent.toLocaleString('en-IN')}</span>
                    </div>
                    <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                      <div className="bg-indigo-600 h-full rounded-full" style={{ width: `${u.share}%` }}></div>
                    </div>
                  </div>
                ))}
                {userStats.length === 0 && (
                  <p className="text-xs text-slate-400 text-center py-6">No data yet.</p>
                )}
              </div>
            </div>
          </div>

          {/* 3. Category Heatmap & Budget Variance Matrix */}
          <div className="bg-white rounded-[2.5rem] p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100/80 xl:col-span-2">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h3 className="text-base font-bold tracking-tight text-slate-950">Category Variance Matrix</h3>
                <p className="text-xs text-slate-400 mt-0.5">Budget caps compared against real-time expenditure</p>
              </div>
            </div>
            
            <div className="space-y-6 max-h-[220px] overflow-y-auto pr-2">
              {categoryStats.map((cat, idx) => (
                <div key={idx} className="bg-slate-50/50 p-4 rounded-2xl border border-slate-100 space-y-3">
                  <div className="flex justify-between items-baseline">
                    <span className="text-xs font-bold text-slate-900">{cat.name}</span>
                    <div className="text-right flex items-baseline gap-2">
                      <span className="text-xs font-black text-slate-900">₹{cat.spent.toLocaleString('en-IN')}</span>
                      <span className="text-[10px] font-bold text-slate-400">/ ₹{cat.budget > 0 ? cat.budget.toLocaleString('en-IN') : 'No Cap'}</span>
                    </div>
                  </div>
                  
                  <div className="w-full bg-slate-200/60 rounded-full h-2 overflow-hidden">
                    <div 
                      className={`h-full rounded-full transition-all duration-1000 ${cat.isOverBudget ? 'bg-rose-500' : 'bg-slate-900'}`}
                      style={{ width: `${cat.percent}%` }}
                    ></div>
                  </div>

                  <div className="flex justify-between items-center text-[10px] font-bold">
                    <span className={cat.isOverBudget ? 'text-rose-600' : 'text-slate-500'}>
                      {cat.isOverBudget ? `Over budget by ₹{(cat.spent - cat.budget).toLocaleString('en-IN')}` : `${cat.percent.toFixed(1)}% consumed`}
                    </span>
                    <span className="text-slate-400 uppercase tracking-wider">{cat.budget > 0 ? `Limit: ₹{cat.budget.toLocaleString('en-IN')}` : 'Uncapped'}</span>
                  </div>
                </div>
              ))}
              {categoryStats.length === 0 && (
                <div className="text-center py-12 text-xs font-medium text-slate-400">
                  Setup your categories to unlock variance analytics.
                </div>
              )}
            </div>
          </div>

        </div>

        {/* Bento Grid Row 3: Recent Activity Feed */}
        <div className="bg-white rounded-[2.5rem] p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100/80">
          <h3 className="text-base font-bold tracking-tight text-slate-950 mb-6">Recent Ledger Activity</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 text-[10px] font-bold uppercase tracking-widest text-slate-400">
                  <th className="pb-4 pl-2">Date</th>
                  <th className="pb-4">Description / Vendor</th>
                  <th className="pb-4">Category</th>
                  <th className="pb-4 text-right pr-2">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {transactions.slice(0, 8).map((t) => (
                  <tr key={t.id} className="hover:bg-slate-50/80 transition-colors group">
                    <td className="py-4 pl-2 text-xs font-bold text-slate-400">
                      {new Date(t.transaction_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </td>
                    <td className="py-4 text-xs font-bold text-slate-900">{t.description}</td>
                    <td className="py-4">
                      <span className="inline-block bg-indigo-50 text-indigo-700 text-[10px] font-bold px-2.5 py-1 rounded-lg">
                        {t.category}
                      </span>
                    </td>
                    <td className="py-4 text-xs font-black text-right pr-2 text-slate-900">
                      ₹{Number(t.amount).toLocaleString('en-IN')}
                    </td>
                  </tr>
                ))}
                {transactions.length === 0 && (
                  <tr>
                    <td colSpan={4} className="py-12 text-center text-xs font-medium text-slate-400">
                      No transactions recorded yet. Click "+ Log Expense" to begin tracking.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  );
}