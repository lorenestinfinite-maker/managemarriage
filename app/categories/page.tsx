'use client';

import { useState, useEffect } from 'react';
import { createBrowserClient } from '@supabase/ssr';

export default function CategoriesPage() {
  const [categories, setCategories] = useState<any[]>([]);
  const [newCategory, setNewCategory] = useState('');
  const [loading, setLoading] = useState(true);

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  useEffect(() => {
    fetchCategories();
  }, []);

  async function fetchCategories() {
    // Universal fetch - no active_wedding_id filter needed here
    const { data, error } = await supabase.from('categories').select('*').order('name');
    if (data) setCategories(data);
    setLoading(false);
  }

  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCategory.trim()) return;

    // Insert ONLY the name. The database budget column is gone.
    const { error } = await supabase.from('categories').insert([{ name: newCategory.trim() }]);
    
    if (!error) {
      setNewCategory('');
      fetchCategories();
    } else {
      console.error('Error adding category:', error.message);
      alert(`Failed to add category: ${error.message}`);
    }
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from('categories').delete().eq('id', id);
    if (!error) {
      setCategories(categories.filter(c => c.id !== id));
    }
  };

  if (loading) return <div className="p-8 text-slate-500 font-bold">Loading master categories...</div>;

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-2xl font-black text-slate-900 mb-2">Master Categories</h1>
      <p className="text-sm text-slate-500 mb-8">Define the universal expense buckets for all family weddings. Budgets are now set separately on the Budget page.</p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        
        {/* Add Category Form */}
        <div className="md:col-span-1">
          <div className="bg-white p-6 rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100/80">
            <h3 className="text-sm font-bold text-slate-900 mb-4 uppercase tracking-wider">New Category</h3>
            <form onSubmit={handleAddCategory} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1.5">Category Name</label>
                <input 
                  type="text" 
                  value={newCategory} 
                  onChange={(e) => setNewCategory(e.target.value)}
                  className="w-full bg-slate-50 text-slate-900 border border-slate-200 rounded-xl py-3 px-4 outline-none focus:border-indigo-500 font-bold text-sm"
                  placeholder="e.g., Decor, Venue..."
                  required
                />
              </div>
              <button type="submit" disabled={!newCategory.trim()} className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-3 rounded-xl transition disabled:opacity-50">
                + Add Master Category
              </button>
            </form>
          </div>
        </div>

        {/* Category List */}
        <div className="md:col-span-2">
          <div className="bg-white p-6 rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100/80">
            <h3 className="text-sm font-bold text-slate-900 mb-4 uppercase tracking-wider">Universal List</h3>
            
            <div className="space-y-3">
              {categories.map((cat) => (
                <div key={cat.id} className="flex items-center justify-between p-4 rounded-xl bg-slate-50 border border-slate-100">
                  <span className="font-bold text-slate-700">{cat.name}</span>
                  <button 
                    onClick={() => handleDelete(cat.id)}
                    className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-50 transition"
                    title="Delete Category"
                  >
                    ✕
                  </button>
                </div>
              ))}
              {categories.length === 0 && (
                <div className="text-center py-8 text-xs font-medium text-slate-400 border border-dashed border-slate-200 rounded-xl">
                  No master categories defined yet.
                </div>
              )}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}