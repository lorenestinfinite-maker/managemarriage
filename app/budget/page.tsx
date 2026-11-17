'use client';
import { useState, useEffect } from 'react';
import { createBrowserClient } from '@supabase/ssr';

export default function BudgetPage() {
  const [categories, setCategories] = useState<any[]>([]);
  const [budgets, setBudgets] = useState<{ [key: string]: number }>({});
  const [activeWeddingId, setActiveWeddingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  useEffect(() => {
    const weddingId = localStorage.getItem('active_wedding_id');
    if (!weddingId) return;
    setActiveWeddingId(weddingId);

    async function fetchData() {
      const [catRes, budgetRes] = await Promise.all([
        supabase.from('categories').select('*'),
        supabase.from('wedding_budgets').select('*').eq('wedding_id', weddingId)
      ]);

      const catData = catRes.data || [];
      const budgetData = budgetRes.data || [];

      if (!catData.find(c => c.name === 'Total Budget')) {
        catData.unshift({ name: 'Total Budget' });
      }

      const budgetMap: { [key: string]: number } = {};
      budgetData.forEach(b => {
        budgetMap[b.category_name] = b.budget;
      });

      setCategories(catData);
      setBudgets(budgetMap);
      setLoading(false);
    }
    fetchData();
  }, []);

  const handleSaveBudget = async (categoryName: string) => {
    if (!activeWeddingId) return;
    setSaving(categoryName);

    const budgetValue = budgets[categoryName] || 0;

    await supabase.from('wedding_budgets').upsert({
      wedding_id: activeWeddingId,
      category_name: categoryName,
      budget: budgetValue
    }, { 
      onConflict: 'wedding_id, category_name' 
    });

    setTimeout(() => setSaving(null), 500);
  };

  if (loading) return <div className="p-8 text-slate-500 font-bold">Loading budget manager...</div>;

  return (
    <div className="p-6 md:p-12 max-w-4xl mx-auto w-full">
      <h1 className="text-2xl font-black text-slate-900 mb-2">Budget Allocations</h1>
      <p className="text-sm text-slate-500 mb-8">Set the master wedding budget and allocate caps to specific categories.</p>

      <div className="space-y-6">
        <div className="bg-slate-950 p-6 rounded-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-lg w-full">
          <div>
            <h2 className="text-white font-bold tracking-tight">Master Wedding Budget</h2>
            <p className="text-slate-400 text-xs mt-1">This drives the main dashboard percentage.</p>
          </div>
          <div className="flex gap-3 items-center w-full md:w-auto">
            <div className="relative flex-1 md:flex-none">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">₹</span>
              <input 
                type="number" 
                value={budgets['Total Budget'] || ''}
                onChange={(e) => setBudgets({...budgets, 'Total Budget': Number(e.target.value)})}
                className="w-full md:w-40 bg-white/10 text-white border border-white/20 rounded-xl py-3 pl-8 pr-4 outline-none focus:border-indigo-500 font-black text-right"
                placeholder="0"
              />
            </div>
            <button 
              onClick={() => handleSaveBudget('Total Budget')}
              className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3 px-6 rounded-xl transition shrink-0"
            >
              {saving === 'Total Budget' ? 'Saved!' : 'Save'}
            </button>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100/80 w-full overflow-hidden">
          <h3 className="text-sm font-bold text-slate-900 mb-6 uppercase tracking-wider">Category Limits</h3>
          <div className="space-y-4">
            {categories.filter(c => c.name !== 'Total Budget').map((cat, idx) => (
              <div key={idx} className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-3 rounded-xl hover:bg-slate-50 transition border border-transparent hover:border-slate-100 gap-3">
                <span className="font-bold text-slate-700">{cat.name}</span>
                <div className="flex gap-3 items-center w-full sm:w-auto">
                  <div className="relative flex-1 sm:flex-none">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs">₹</span>
                    <input 
                      type="number" 
                      value={budgets[cat.name] || ''}
                      onChange={(e) => setBudgets({...budgets, [cat.name]: Number(e.target.value)})}
                      className="w-full sm:w-32 bg-slate-50 text-slate-900 border border-slate-200 rounded-lg py-2 pl-7 pr-3 outline-none focus:border-indigo-500 font-bold text-right text-sm"
                      placeholder="0"
                    />
                  </div>
                  <button 
                    onClick={() => handleSaveBudget(cat.name)}
                    className="bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold py-2.5 px-4 rounded-lg transition min-w-[80px] shrink-0"
                  >
                    {saving === cat.name ? 'Saved' : 'Update'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}