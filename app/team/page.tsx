'use client';
import { useState, useEffect } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import Link from 'next/link';

const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function TeamPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [currentUserRole, setCurrentUserRole] = useState<string>('MEMBER');
  const [orgId, setOrgId] = useState<string | null>(null); // Added to store org ID
  const [loading, setLoading] = useState(true);

  // Edit States
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ first_name: '', last_name: '', role: '', email: '' });
  const [saving, setSaving] = useState(false);

  // Add User States
  const [isAddingUser, setIsAddingUser] = useState(false);
  const [addForm, setAddForm] = useState({ first_name: '', last_name: '', role: 'MEMBER', email: '' });
  const [adding, setAdding] = useState(false);

  const fetchTeam = async () => {
    setLoading(true);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      setLoading(false);
      return;
    }
    setCurrentUser(session.user);

    const { data: currentUserData } = await supabase
      .from('users')
      .select('organization_id, role')
      .eq('id', session.user.id)
      .single();

    if (currentUserData?.organization_id) {
      setCurrentUserRole(currentUserData.role);
      setOrgId(currentUserData.organization_id); // Save org ID for adding users
      
      const { data: teamMembers } = await supabase
        .from('users')
        .select('*')
        .eq('organization_id', currentUserData.organization_id);

      if (teamMembers) {
        const userList = teamMembers.map(u => ({
          id: u.id,
          first_name: u.first_name || '',
          last_name: u.last_name || '',
          email: u.email,
          name: `${u.first_name || ''} ${u.last_name || ''}`.trim() || u.email.split('@')[0],
          role: u.role
        }));
        setUsers(userList);
      }
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchTeam();
  }, []);

  const handleEditClick = (u: any) => {
    setEditingId(u.id);
    setEditForm({ first_name: u.first_name, last_name: u.last_name, role: u.role, email: u.email });
  };

  const handleSave = async (userId: string) => {
    setSaving(true);
    
    const updatePayload: any = {
      first_name: editForm.first_name,
      last_name: editForm.last_name,
      role: editForm.role
    };

    if (currentUserRole === 'ORGANIZER') {
      updatePayload.email = editForm.email;
    }

    const { error } = await supabase.from('users').update(updatePayload).eq('id', userId);

    if (error) {
      alert(`Update failed: ${error.message}`);
    } else {
      setEditingId(null);
      await fetchTeam();
    }
    setSaving(false);
  };

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orgId) return;
    setAdding(true);

    try {
      // Sending the single new user to your existing backend API, 
      // exactly the same way setup-family does it.
      const response = await fetch('/api/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          users: [{
            first_name: addForm.first_name,
            last_name: addForm.last_name,
            email: addForm.email,
            role: addForm.role,
            phone_number: '' // Passing empty string if you don't collect it on this form
          }], 
          organizationId: orgId 
        })
      });

      if (!response.ok) {
        throw new Error("API failed to process the invite.");
      }

      setIsAddingUser(false);
      setAddForm({ first_name: '', last_name: '', role: 'MEMBER', email: '' }); // Reset form
      await fetchTeam(); // Refresh the list
      
    } catch (error: any) {
      alert(`Failed to add user: ${error.message}`);
    } finally {
      setAdding(false);
    }
  };

  if (loading) return <div className="flex h-screen items-center justify-center bg-[#FAFAFA]"><div className="h-6 w-6 border-2 border-slate-900 border-t-transparent rounded-full animate-spin"></div></div>;

  const isManager = currentUserRole === 'ORGANIZER' || currentUserRole === 'CO_ORGANIZER';

  return (
    <div className="min-h-screen bg-[#FAFAFA] text-slate-900 font-sans p-6 md:p-12">
      <div className="max-w-4xl mx-auto space-y-8">
        <div>
          <Link href="/" className="text-xs font-bold uppercase tracking-wider text-slate-400 hover:text-slate-900 transition">← Dashboard</Link>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-950 mt-2">Team & Collaborators</h1>
        </div>

        <div className="bg-white rounded-[2.5rem] p-8 border border-slate-100 shadow-sm space-y-6">
          <div className="pt-2">
            
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">Active Team Members ({users.length})</h4>
              
              {isManager && (
                <button 
                  onClick={() => setIsAddingUser(true)}
                  className="bg-slate-900 text-white text-[10px] font-bold px-4 py-2 rounded-xl uppercase transition hover:bg-slate-800"
                >
                  + Add User
                </button>
              )}
            </div>

            <div className="space-y-3">
              {users.map((u, i) => {
                const isEditing = editingId === u.id;
                const isCurrentUser = currentUser?.id === u.id;
                
                return (
                  <div key={i} className="flex flex-col md:flex-row items-start md:items-center justify-between p-4 rounded-2xl bg-slate-50 border border-slate-100 gap-4">
                    
                    <div className="flex items-center gap-3 w-full md:w-auto">
                      <div className="w-9 h-9 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center font-bold text-xs shrink-0">
                        {u.name.charAt(0).toUpperCase()}
                      </div>
                      
                      {isEditing ? (
                        <div className="flex flex-col gap-1 w-full">
                          <div className="flex gap-2 w-full">
                            <input type="text" placeholder="First Name" value={editForm.first_name} onChange={(e) => setEditForm({...editForm, first_name: e.target.value})} className="w-full bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-xs font-bold outline-none focus:border-indigo-500" />
                            <input type="text" placeholder="Last Name" value={editForm.last_name} onChange={(e) => setEditForm({...editForm, last_name: e.target.value})} className="w-full bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-xs font-bold outline-none focus:border-indigo-500" />
                          </div>
                          
                          {currentUserRole === 'ORGANIZER' ? (
                            <input type="email" placeholder="Email Address" value={editForm.email} onChange={(e) => setEditForm({...editForm, email: e.target.value})} className="w-full bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-[10px] font-medium outline-none focus:border-indigo-500 mt-1" />
                          ) : (
                            <span className="text-[10px] text-slate-500 ml-1">{u.email}</span>
                          )}
                        </div>
                      ) : (
                        <div>
                          <span className="text-xs font-bold text-slate-900 block">{u.name}</span>
                          <span className="text-[10px] text-slate-500">{u.email}</span>
                        </div>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-3 w-full md:w-auto justify-end">
                      {isEditing ? (
                        <>
                          <select value={editForm.role} onChange={(e) => setEditForm({...editForm, role: e.target.value})} className="bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-xs font-bold outline-none">
                            <option value="ORGANIZER">ORGANIZER</option>
                            <option value="CO_ORGANIZER">CO_ORGANIZER</option>
                            <option value="MEMBER">MEMBER</option>
                          </select>
                          <button onClick={() => setEditingId(null)} className="text-[10px] font-bold text-slate-400 hover:text-slate-600 px-2 py-1 uppercase">Cancel</button>
                          <button onClick={() => handleSave(u.id)} disabled={saving} className="text-[10px] font-bold bg-indigo-600 text-white px-3 py-1.5 rounded-lg transition uppercase">
                            {saving ? 'Saving...' : 'Save'}
                          </button>
                        </>
                      ) : (
                        <>
                          <span className="text-[10px] font-bold bg-slate-200 text-slate-700 px-3 py-1 rounded-full uppercase">{u.role}</span>
                          {isManager && !isCurrentUser && (
                            <button onClick={() => handleEditClick(u)} className="bg-white hover:bg-slate-100 border border-slate-200 text-slate-600 text-[10px] font-bold px-3 py-1.5 rounded-lg transition uppercase ml-2">
                              Edit
                            </button>
                          )}
                        </>
                      )}
                    </div>

                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* ADD USER MODAL */}
      {isAddingUser && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-[2.5rem] p-8 max-w-md w-full space-y-6 shadow-2xl">
            <div>
              <h3 className="text-base font-bold text-slate-950">Add Team Member</h3>
              <p className="text-xs text-slate-500 mt-1">Invite a new collaborator to this workspace.</p>
            </div>
            
            <form onSubmit={handleAddUser} className="space-y-4">
              <input type="email" placeholder="Email Address" value={addForm.email} onChange={(e) => setAddForm({...addForm, email: e.target.value})} className="w-full border border-slate-200 p-3.5 rounded-2xl text-xs outline-none focus:border-indigo-500" required />
              
              <div className="flex gap-2">
                <input type="text" placeholder="First Name" value={addForm.first_name} onChange={(e) => setAddForm({...addForm, first_name: e.target.value})} className="w-full border border-slate-200 p-3.5 rounded-2xl text-xs outline-none focus:border-indigo-500" required />
                <input type="text" placeholder="Last Name" value={addForm.last_name} onChange={(e) => setAddForm({...addForm, last_name: e.target.value})} className="w-full border border-slate-200 p-3.5 rounded-2xl text-xs outline-none focus:border-indigo-500" required />
              </div>
              
              <select value={addForm.role} onChange={(e) => setAddForm({...addForm, role: e.target.value})} className="w-full border border-slate-200 p-3.5 rounded-2xl text-xs font-bold outline-none focus:border-indigo-500" required>
                <option value="CO_ORGANIZER">Co-Organizer</option>
                <option value="MEMBER">Member</option>
              </select>
              
              <div className="flex gap-3 mt-2">
                <button type="button" onClick={() => setIsAddingUser(false)} className="flex-1 bg-slate-100 font-bold py-3.5 rounded-2xl text-xs hover:bg-slate-200 transition">Cancel</button>
                <button type="submit" disabled={adding} className="flex-1 bg-slate-950 text-white font-bold py-3.5 rounded-2xl text-xs hover:bg-slate-800 transition">
                  {adding ? 'Saving...' : 'Add User'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}