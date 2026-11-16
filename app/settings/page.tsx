'use client';
import { useState, useEffect } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import Link from 'next/link';

const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function SettingsPage() {
  const [user, setUser] = useState<any>(null);
  const [workspace, setWorkspace] = useState<any>(null);
  const [weddings, setWeddings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Profile Edit States
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({ first_name: '', last_name: '' });
  const [saving, setSaving] = useState(false);

  async function loadData() {
    setLoading(true);
    const { data: { user: authUser } } = await supabase.auth.getUser();
    
    if (authUser) {
      // 1. Get profile and organization ID, plus name fields
      const { data: profile } = await supabase
        .from('users')
        .select('role, organization_id, first_name, last_name')
        .eq('id', authUser.id)
        .single();

      setUser({ 
        ...authUser, 
        role: profile?.role || 'MEMBER',
        first_name: profile?.first_name || '',
        last_name: profile?.last_name || ''
      });

      // Initialize edit form
      setEditForm({
        first_name: profile?.first_name || '',
        last_name: profile?.last_name || ''
      });

      if (profile?.organization_id) {
        // 2. Fetch the Family Workspace and all associated Weddings
        const [orgRes, wedRes] = await Promise.all([
          supabase.from('organizations').select('*').eq('id', profile.organization_id).single(),
          supabase.from('weddings').select('*').eq('organization_id', profile.organization_id).order('created_at', { ascending: true })
        ]);

        if (orgRes.data) setWorkspace(orgRes.data);
        if (wedRes.data) setWeddings(wedRes.data);
      }
    }
    setLoading(false);
  }

  useEffect(() => {
    loadData();
  }, []);

  const handleSaveProfile = async () => {
    setSaving(true);
    const { error } = await supabase.from('users').update({
      first_name: editForm.first_name,
      last_name: editForm.last_name
    }).eq('id', user.id);

    if (error) {
      alert(`Update failed: ${error.message}`);
    } else {
      setIsEditing(false);
      await loadData(); // Reload to reflect changes
    }
    setSaving(false);
  };

  if (loading) return null;

  const displayName = `${user?.first_name || ''} ${user?.last_name || ''}`.trim() || user?.email?.split('@')[0];

  return (
    <div className="min-h-screen bg-[#FAFAFA] text-slate-900 font-sans p-6 md:p-12">
      <div className="max-w-2xl mx-auto space-y-8">
        <div>
          <Link href="/" className="text-xs font-bold uppercase tracking-wider text-slate-400 hover:text-slate-900 transition">
            ← Dashboard
          </Link>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-950 mt-2">Account Settings</h1>
          <p className="text-sm font-medium text-slate-500">Manage your active wedding planner profile and credentials</p>
        </div>

        {/* Card 1: User Profile */}
        <div className="bg-white rounded-[2.5rem] p-8 border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between pb-6 border-b border-slate-100 gap-4">
            
            <div className="flex items-center gap-4 w-full">
              <div className="w-16 h-16 rounded-full bg-slate-950 text-white flex items-center justify-center font-black text-xl shrink-0">
                {displayName?.charAt(0).toUpperCase()}
              </div>
              
              {isEditing ? (
                <div className="flex flex-col gap-1 w-full max-w-xs">
                  <div className="flex gap-2">
                    <input type="text" placeholder="First Name" value={editForm.first_name} onChange={(e) => setEditForm({...editForm, first_name: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-bold outline-none focus:border-indigo-500" />
                    <input type="text" placeholder="Last Name" value={editForm.last_name} onChange={(e) => setEditForm({...editForm, last_name: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-bold outline-none focus:border-indigo-500" />
                  </div>
                  <p className="text-[10px] text-slate-500 ml-1">{user?.email}</p>
                </div>
              ) : (
                <div>
                  <p className="text-base font-bold text-slate-900">{displayName}</p>
                  <p className="text-[10px] text-slate-500">{user?.email}</p>
                  <p className="text-[10px] text-slate-400 mt-1 uppercase tracking-wider font-bold">Role: {user?.role.replace('_', ' ')}</p>
                </div>
              )}
            </div>

            <div className="shrink-0">
              {isEditing ? (
                <div className="flex items-center gap-2">
                  <button onClick={() => setIsEditing(false)} className="text-[10px] font-bold text-slate-400 hover:text-slate-600 px-3 py-2 uppercase">Cancel</button>
                  <button onClick={handleSaveProfile} disabled={saving} className="text-[10px] font-bold bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-lg transition uppercase">
                    {saving ? 'Saving...' : 'Save'}
                  </button>
                </div>
              ) : (
                <button onClick={() => setIsEditing(true)} className="bg-white hover:bg-slate-50 border border-slate-200 text-slate-600 text-[10px] font-bold px-4 py-2 rounded-lg transition uppercase">
                  Edit Profile
                </button>
              )}
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">User ID (Supabase Auth)</label>
              <input type="text" readOnly value={user?.id || ''} className="w-full bg-slate-50 border border-slate-200 p-3.5 rounded-2xl text-xs font-mono text-slate-600 outline-none" />
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Account Created</label>
              <input type="text" readOnly value={user?.created_at ? new Date(user.created_at).toLocaleString() : ''} className="w-full bg-slate-50 border border-slate-200 p-3.5 rounded-2xl text-xs font-medium text-slate-600 outline-none" />
            </div>
          </div>
        </div>

        {/* Card 2: Workspace & Weddings */}
        {workspace && (
          <div className="bg-white rounded-[2.5rem] p-8 border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] space-y-6">
            <div>
              <h3 className="text-base font-bold text-slate-950">{workspace.name}</h3>
            </div>
            
            <div className="pt-4 border-t border-slate-100">
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-3">Managed Weddings ({weddings.length})</label>
              <div className="space-y-3">
                {weddings.map((w) => (
                  <div key={w.id} className="flex items-center justify-between p-4 rounded-2xl bg-slate-50 border border-slate-100">
                    <div>
                      <span className="font-bold text-slate-700 text-sm">{w.name}</span>
                      <p className="text-[10px] text-slate-400 mt-0.5">Created: {new Date(w.created_at).toLocaleDateString()}</p>
                    </div>
                    <span className="text-[10px] font-bold bg-indigo-50 text-indigo-700 px-3 py-1 rounded-full uppercase">Active</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}