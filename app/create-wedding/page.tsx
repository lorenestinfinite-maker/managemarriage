'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createBrowserClient } from '@supabase/ssr';

export default function CreateWeddingPage() {
  const router = useRouter();
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const [weddingName, setWeddingName] = useState('');
  const [weddingDate, setWeddingDate] = useState('');
  const [orgId, setOrgId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Fetch the user's family workspace ID so we can attach the wedding to it
  useEffect(() => {
    async function fetchOrg() {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        const { data: user } = await supabase.from('users').select('organization_id').eq('id', session.user.id).single();
        if (user?.organization_id) setOrgId(user.organization_id);
      }
    }
    fetchOrg();
  }, [supabase]);

  const handleCreateWedding = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    if (!orgId) return;

    // Insert the new specific event into your weddings table
    const { error } = await supabase
      .from('weddings')
      .insert([{ 
        organization_id: orgId, 
        name: weddingName,
        date: weddingDate 
      }]);

    if (!error) {
      router.replace('/'); // Setup complete, redirect to dashboard
    } else {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white p-8 rounded-2xl shadow-lg border border-gray-200">
        <h1 className="text-3xl font-black text-gray-900 mb-2">Add a Wedding</h1>
        <p className="text-sm text-gray-500 mb-8">Create your first event under your Family Workspace.</p>

        <form onSubmit={handleCreateWedding} className="space-y-6">
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase">Wedding Name</label>
            <input 
              type="text" required value={weddingName} onChange={(e) => setWeddingName(e.target.value)} 
              className="w-full border p-3 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm" 
              placeholder="e.g., John & Jane's Wedding" 
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase">Wedding Date</label>
            <input 
              type="date" required value={weddingDate} onChange={(e) => setWeddingDate(e.target.value)} 
              className="w-full border p-3 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm" 
            />
          </div>

          <div className="border-t border-gray-200 pt-6">
            <button type="submit" disabled={loading || !weddingName || !weddingDate} className="w-full bg-blue-600 text-white font-bold py-4 rounded-xl hover:bg-blue-700 transition disabled:opacity-50">
              {loading ? 'Creating...' : 'Create Wedding & Go to Dashboard'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}