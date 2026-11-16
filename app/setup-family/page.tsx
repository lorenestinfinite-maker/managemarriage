'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createBrowserClient } from '@supabase/ssr';

interface FamilyUser {
  first_name: string;
  last_name: string;
  email: string;
  phone_number: string;
  role: string;
}

export default function SetupFamilyPage() {
  const router = useRouter();
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const [familyName, setFamilyName] = useState('');
  const [users, setUsers] = useState<FamilyUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  
  const [newUser, setNewUser] = useState<FamilyUser>({
    first_name: '', last_name: '', email: '', phone_number: '', role: 'MEMBER'
  });

  const handleAddUser = (e: React.FormEvent) => {
    e.preventDefault();
    setUsers([...users, newUser]);
    setShowModal(false);
    setNewUser({ first_name: '', last_name: '', email: '', phone_number: '', role: 'MEMBER' });
  };

  const handleCreateFamily = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      router.replace('/login');
      return;
    }

    // 1. Create the Family Workspace
    const { data: orgData, error: orgError } = await supabase
      .from('organizations')
      .insert([{ name: familyName }])
      .select('id')
      .single();

    if (orgError || !orgData) {
      console.error("Org Error:", orgError);
      setLoading(false);
      return; // Stop here only if the DB actually fails to make the workspace
    }

    // 2. Link the current owner
    await supabase
      .from('users')
      .update({ organization_id: orgData.id })
      .eq('id', session.user.id);

    // 3. Fire off the backend invites asynchronously (Notice: No 'await' on the fetch)
    // This prevents the API or network latency from freezing the UI
    if (users.length > 0) {
      fetch('/api/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ users, organizationId: orgData.id })
      }).catch(err => console.error("Silent background invite error:", err));
    }

    // 4. Instantly redirect without waiting for the emails to finish sending
    router.replace('/create-wedding');
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl bg-white p-8 rounded-2xl shadow-lg border border-gray-200">
        <h1 className="text-3xl font-black text-gray-900 mb-2">Setup Your Family Workspace</h1>
        <p className="text-sm text-gray-500 mb-8">This is your main hub. You can host multiple weddings under this family name.</p>

        <form onSubmit={handleCreateFamily} className="space-y-6">
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase">Family / Workspace Name</label>
            <input 
              type="text" required value={familyName} onChange={(e) => setFamilyName(e.target.value)} 
              className="w-full border p-3 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm" 
              placeholder="e.g., The Smith Family" 
            />
          </div>

          <div className="border-t border-gray-200 pt-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-bold text-gray-900">Family Members & Organizers</h2>
              <button type="button" onClick={() => setShowModal(true)} className="bg-gray-900 text-white text-xs font-bold px-4 py-2 rounded-lg hover:bg-gray-800">
                + Add Member
              </button>
            </div>

            {users.length === 0 ? (
              <div className="text-center py-8 bg-gray-50 border border-dashed border-gray-300 rounded-xl">
                <p className="text-sm text-gray-500">No additional members added yet.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {users.map((u, idx) => (
                  <div key={idx} className="flex justify-between items-center p-4 border border-gray-200 rounded-xl bg-gray-50">
                    <div>
                      <p className="text-sm font-bold text-gray-900">{u.first_name} {u.last_name}</p>
                      <p className="text-xs text-gray-500">{u.email}</p>
                    </div>
                    <span className="text-xs font-bold px-2 py-1 bg-blue-100 text-blue-700 rounded-md">{u.role}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="border-t border-gray-200 pt-6">
            <button type="submit" disabled={loading || !familyName} className="w-full bg-blue-600 text-white font-bold py-4 rounded-xl hover:bg-blue-700 transition disabled:opacity-50">
              {loading ? 'Creating Workspace...' : 'Next: Create First Wedding ➔'}
            </button>
          </div>
        </form>
      </div>

      {/* Add User Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md p-6 rounded-2xl shadow-xl">
            <h3 className="text-xl font-black text-gray-900 mb-4">Add Family Member</h3>
            <form onSubmit={handleAddUser} className="space-y-4">
              <div className="flex gap-4">
                <input type="text" required placeholder="First Name" value={newUser.first_name} onChange={(e) => setNewUser({...newUser, first_name: e.target.value})} className="flex-1 border p-3 rounded-xl outline-none text-sm" />
                <input type="text" required placeholder="Last Name" value={newUser.last_name} onChange={(e) => setNewUser({...newUser, last_name: e.target.value})} className="flex-1 border p-3 rounded-xl outline-none text-sm" />
              </div>
              <input type="email" required placeholder="Email" value={newUser.email} onChange={(e) => setNewUser({...newUser, email: e.target.value})} className="w-full border p-3 rounded-xl outline-none text-sm" />
              <input type="tel" maxLength={10} required placeholder="Phone Number" value={newUser.phone_number} onChange={(e) => setNewUser({...newUser, phone_number: e.target.value.replace(/\D/g, '')})} className="w-full border p-3 rounded-xl outline-none text-sm" />
              <select value={newUser.role} onChange={(e) => setNewUser({...newUser, role: e.target.value})} className="w-full border p-3 rounded-xl outline-none text-sm bg-white">
                <option value="CO_ORGANIZER">Co-Organizer (Full Access)</option>
                <option value="MEMBER">Member (Limited Access)</option>
                <option value="GUEST">Guest (View Only)</option>
              </select>
              <div className="flex gap-3 pt-4">
                <button type="button" onClick={() => setShowModal(false)} className="flex-1 bg-gray-100 text-gray-700 font-bold py-3 rounded-xl">Cancel</button>
                <button type="submit" className="flex-1 bg-gray-900 text-white font-bold py-3 rounded-xl">Save Member</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}