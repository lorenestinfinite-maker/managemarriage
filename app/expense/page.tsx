'use client';
import { useState, useEffect } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function ExpensesPage() {
  const router = useRouter();
  const [transactions, setTransactions] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [userRole, setUserRole] = useState('');
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeWeddingId, setActiveWeddingId] = useState<string | null>(null);

  // Modals
  const [selectedReceiptUrl, setSelectedReceiptUrl] = useState<string | null>(null);
  const [editingTransaction, setEditingTransaction] = useState<any | null>(null);
  
  // Add Expense States
  const [isAddingExpense, setIsAddingExpense] = useState(false);
  const [addDescription, setAddDescription] = useState('');
  const [addAmount, setAddAmount] = useState('');
  const [addCategory, setAddCategory] = useState('');
  const [addDate, setAddDate] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  
  // Ping State
  const [pingTransaction, setPingTransaction] = useState<any | null>(null);
  const [pingMessage, setPingMessage] = useState('These details might be incorrect. Please review and update.');
  const [isSendingPing, setIsSendingPing] = useState(false);

  // Edit States
  const [editDescription, setEditDescription] = useState('');
  const [editAmount, setEditAmount] = useState('');
  const [editCategory, setEditCategory] = useState('');
  const [editDate, setEditDate] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    async function fetchData() {
      // 1. Grab the active wedding ID from the browser
      const weddingId = localStorage.getItem('active_wedding_id');
      if (!weddingId) {
        setLoading(false);
        return;
      }
      setActiveWeddingId(weddingId);

      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        setCurrentUser(session.user);
      }

      try {
        const [txRes, usersRes, catRes] = await Promise.all([
          // Only fetch transactions for this specific wedding
          supabase.from('transactions').select('*').eq('wedding_id', weddingId).order('transaction_date', { ascending: false }),
          supabase.from('users').select('id, first_name, last_name, email, role'),
          supabase.from('categories').select('*')
        ]);

        const rawTransactions = txRes.data || [];
        const usersData = usersRes.data || [];
        
        // Filter out the "Total Budget" category for the expense dropdowns
        const validExpenseCategories = (catRes.data || []).filter(cat => cat.name !== 'Total Budget');

        const role = usersData.find(u => String(u.id) === String(session?.user.id))?.role || '';
        setUserRole(role);

        const enrichedTransactions = rawTransactions.map(tx => {
          const matchedUser = usersData.find(u => String(u.id) === String(tx.user_id));
          
          let formattedName = 'Unknown User';
          if (matchedUser) {
            if (matchedUser.first_name || matchedUser.last_name) {
              formattedName = `${matchedUser.first_name || ''} ${matchedUser.last_name || ''}`.trim();
            } else if (matchedUser.email) {
              formattedName = matchedUser.email.split('@')[0];
            }
          }

          return {
            ...tx,
            creator_name: formattedName
          };
        });

        setTransactions(enrichedTransactions);
        setCategories(validExpenseCategories);
      } catch (err) {
        console.error("Fetch Error:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  const openReceiptModal = (imagePath: string) => {
    const { data } = supabase.storage.from('receipts').getPublicUrl(imagePath);
    if (data?.publicUrl) setSelectedReceiptUrl(data.publicUrl);
  };

  const handleOpenEdit = (tx: any) => {
    setEditingTransaction(tx);
    setEditDescription(tx.description);
    setEditAmount(tx.amount);
    setEditCategory(tx.category);
    setEditDate(tx.transaction_date);
  };

  const handleUpdateTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsUpdating(true);
    const { error } = await supabase.from('transactions').update({
      description: editDescription,
      amount: Number(editAmount),
      category: editCategory,
      transaction_date: editDate
    }).eq('id', editingTransaction.id);

    if (!error) {
      setTransactions(transactions.map(t => t.id === editingTransaction.id ? { ...t, description: editDescription, amount: Number(editAmount), category: editCategory, transaction_date: editDate } : t));
      setEditingTransaction(null);
    } else {
      alert(`Failed to update: ${error.message}`);
    }
    setIsUpdating(false);
  };

  const handleAddTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || !activeWeddingId) return;
    setIsAdding(true);
    
    const newExpense = {
      description: addDescription,
      amount: Number(addAmount),
      category: addCategory || (categories.length > 0 ? categories[0].name : ''),
      transaction_date: addDate,
      user_id: currentUser.id,
      wedding_id: activeWeddingId // Include the wedding_id on insert
    };

    const { data, error } = await supabase.from('transactions').insert([newExpense]).select();

    if (!error && data) {
      const fallbackName = currentUser.user_metadata?.first_name 
        ? `${currentUser.user_metadata.first_name} ${currentUser.user_metadata.last_name || ''}`.trim() 
        : (currentUser.email?.split('@')[0] || 'Unknown User');

      const enrichedNewExpense = {
        ...data[0],
        creator_name: fallbackName
      };
      setTransactions([enrichedNewExpense, ...transactions]);
      setIsAddingExpense(false);
      
      setAddDescription('');
      setAddAmount('');
      setAddCategory('');
      setAddDate('');
    } else {
      alert(`Failed to add expense: ${error?.message}`);
    }
    setIsAdding(false);
  };

  const handleSendPing = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || !activeWeddingId) return;
    setIsSendingPing(true);
    
    const { error } = await supabase.from('pings').insert([{
      message: pingMessage,
      transaction_id: pingTransaction.id,
      user_id: currentUser.id,
      wedding_id: activeWeddingId // Include the wedding_id on ping inserts
    }]);

    if (error) {
      alert(`Failed to send ping: ${error.message}`);
    } else {
      setPingTransaction(null);
      setPingMessage('These details might be incorrect. Please review and update.');
    }
    setIsSendingPing(false);
  };

  const filteredTransactions = transactions.filter(t => 
    t.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
    t.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (t.creator_name && t.creator_name.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  if (loading) return <div className="flex h-screen items-center justify-center bg-[#FAFAFA]"><div className="h-6 w-6 border-2 border-slate-900 border-t-transparent rounded-full animate-spin"></div></div>;

  const isAdmin = userRole === 'ORGANIZER' || userRole === 'CO_ORGANIZER';

  return (
    <div className="min-h-screen bg-[#FAFAFA] text-slate-900 font-sans p-6 md:p-12">
      <div className="max-w-[1400px] mx-auto space-y-8">
        
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div>
            <Link href="/" className="text-xs font-bold uppercase tracking-wider text-slate-400 hover:text-slate-900 transition">← Dashboard</Link>
            <h1 className="text-3xl font-extrabold tracking-tight text-slate-950 mt-2">Expense Ledger Menu</h1>
          </div>
          <button onClick={() => setIsAddingExpense(true)} className="bg-slate-950 px-6 py-3 text-sm font-semibold text-white rounded-full hover:shadow-lg transition border-none cursor-pointer">
            + Log New Expense
          </button>
        </header>

        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex items-center">
          <input 
            type="text" 
            placeholder="Search expenses by description, category, or creator..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full text-xs font-medium outline-none bg-transparent px-4 py-2 text-slate-900 placeholder:text-slate-400"
          />
        </div>

        <div className="bg-white rounded-[2.5rem] p-8 shadow-sm border border-slate-100">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 text-[10px] font-bold uppercase tracking-widest text-slate-400">
                  <th className="pb-4 pl-2">Date</th>
                  <th className="pb-4">Description</th>
                  <th className="pb-4">Category</th>
                  <th className="pb-4">Created By</th>
                  <th className="pb-4 text-center">Receipt</th>
                  <th className="pb-4 text-center">Actions</th>
                  <th className="pb-4 text-right pr-2">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filteredTransactions.map((t) => {
                  const isCreator = t.user_id === currentUser?.id;
                  const canEdit = isAdmin || isCreator;

                  return (
                    <tr key={t.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-4 pl-2 text-xs font-bold text-slate-400">{new Date(t.transaction_date).toLocaleDateString()}</td>
                      <td className="py-4 text-xs font-bold text-slate-900">{t.description}</td>
                      <td className="py-4"><span className="inline-block bg-indigo-50 text-indigo-700 text-[10px] font-bold px-2.5 py-1 rounded-lg">{t.category}</span></td>
                      
                      <td className="py-4 text-xs font-bold text-indigo-900">
                        {t.creator_name}
                      </td>

                      <td className="py-4 text-center">
                        {t.receipt_image_path ? (
                          <button onClick={() => openReceiptModal(t.receipt_image_path)} className="text-emerald-600 text-[11px] font-bold px-3 py-1.5 rounded-xl bg-emerald-50">View Bill</button>
                        ) : <span className="text-[11px] text-slate-300 font-medium">No Receipt</span>}
                      </td>
                      <td className="py-4 text-center">
                        {canEdit ? (
                          <button onClick={() => handleOpenEdit(t)} className="bg-slate-900 text-white text-[11px] font-bold px-4 py-1.5 rounded-xl">✏️ Edit</button>
                        ) : (
                          <button onClick={() => setPingTransaction(t)} className="bg-amber-100 text-amber-800 text-[11px] font-bold px-4 py-1.5 rounded-xl flex items-center gap-1.5 mx-auto"><span>🔔</span> Ping</button>
                        )}
                      </td>
                      <td className="py-4 text-xs font-black text-right pr-2">₹{Number(t.amount).toLocaleString('en-IN')}</td>
                    </tr>
                  );
                })}
                {filteredTransactions.length === 0 && (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-xs font-medium text-slate-400">
                      No matching expenses found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* ADD EXPENSE MODAL */}
      {isAddingExpense && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-[2.5rem] p-8 max-w-md w-full space-y-6 shadow-2xl">
            <h3 className="text-base font-bold text-slate-950">Log New Expense</h3>
            <form onSubmit={handleAddTransaction} className="space-y-4">
              <input type="text" placeholder="Description" value={addDescription} onChange={(e) => setAddDescription(e.target.value)} className="w-full border border-slate-200 p-3 rounded-2xl text-xs outline-none focus:border-slate-400" required />
              <input type="number" placeholder="Amount (₹)" value={addAmount} onChange={(e) => setAddAmount(e.target.value)} className="w-full border border-slate-200 p-3 rounded-2xl text-xs outline-none focus:border-slate-400" required />
              <select value={addCategory} onChange={(e) => setAddCategory(e.target.value)} className="w-full border border-slate-200 p-3 rounded-2xl text-xs outline-none focus:border-slate-400" required>
                <option value="" disabled>Select Category</option>
                {categories.map((c, i) => <option key={i} value={c.name}>{c.name}</option>)}
              </select>
              <input type="date" value={addDate} onChange={(e) => setAddDate(e.target.value)} className="w-full border border-slate-200 p-3 rounded-2xl text-xs outline-none focus:border-slate-400" required />
              <div className="flex gap-3 mt-2">
                <button type="button" onClick={() => setIsAddingExpense(false)} className="flex-1 bg-slate-100 font-bold py-3.5 rounded-2xl text-xs hover:bg-slate-200 transition">Cancel</button>
                <button type="submit" disabled={isAdding} className="flex-1 bg-slate-950 text-white font-bold py-3.5 rounded-2xl text-xs hover:bg-slate-800 transition">
                  {isAdding ? 'Saving...' : 'Save Expense'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* PING MODAL */}
      {pingTransaction && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-[2.5rem] p-8 max-w-md w-full space-y-6 shadow-2xl">
            <div>
              <h3 className="text-base font-bold text-slate-950">Send Ping Notification</h3>
              <p className="text-xs text-slate-500 mt-1">Notify the organizer and creator that this expense requires review.</p>
            </div>
            <form onSubmit={handleSendPing} className="space-y-4">
              <textarea 
                value={pingMessage} 
                onChange={(e) => setPingMessage(e.target.value)}
                className="w-full border border-slate-200 p-4 rounded-2xl text-xs font-medium outline-none bg-slate-50 h-24"
                required 
              />
              <div className="flex gap-3 mt-2">
                <button type="button" onClick={() => setPingTransaction(null)} className="flex-1 bg-slate-100 font-bold py-3.5 rounded-2xl text-xs hover:bg-slate-200 transition">Cancel</button>
                <button type="submit" disabled={isSendingPing} className="flex-1 bg-amber-500 text-white font-bold py-3.5 rounded-2xl text-xs hover:bg-amber-600 transition">{isSendingPing ? 'Sending...' : 'Send Ping'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT MODAL */}
      {editingTransaction && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-[2.5rem] p-8 max-w-md w-full space-y-6 shadow-2xl">
            <h3 className="text-base font-bold text-slate-950">Edit Expense</h3>
            <form onSubmit={handleUpdateTransaction} className="space-y-4">
              <input type="text" value={editDescription} onChange={(e) => setEditDescription(e.target.value)} className="w-full border border-slate-200 p-3.5 rounded-2xl text-xs outline-none focus:border-slate-400" required />
              <input type="number" value={editAmount} onChange={(e) => setEditAmount(e.target.value)} className="w-full border border-slate-200 p-3.5 rounded-2xl text-xs outline-none focus:border-slate-400" required />
              <select value={editCategory} onChange={(e) => setEditCategory(e.target.value)} className="w-full border border-slate-200 p-3.5 rounded-2xl text-xs outline-none focus:border-slate-400">
                {categories.map((c, i) => <option key={i} value={c.name}>{c.name}</option>)}
              </select>
              <input type="date" value={editDate} onChange={(e) => setEditDate(e.target.value)} className="w-full border border-slate-200 p-3.5 rounded-2xl text-xs outline-none focus:border-slate-400" required />
              <div className="flex gap-3 mt-2">
                <button type="button" onClick={() => setEditingTransaction(null)} className="flex-1 bg-slate-100 font-bold py-3.5 rounded-2xl text-xs hover:bg-slate-200 transition">Cancel</button>
                <button type="submit" disabled={isUpdating} className="flex-1 bg-slate-950 text-white font-bold py-3.5 rounded-2xl text-xs hover:bg-slate-800 transition">Save Changes</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* RECEIPT MODAL */}
      {selectedReceiptUrl && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-[2.5rem] p-6 max-w-lg w-full space-y-4 flex flex-col items-center shadow-2xl">
            <div className="w-full h-96 bg-slate-900 rounded-2xl overflow-hidden flex items-center justify-center">
              <img src={selectedReceiptUrl} alt="Receipt" className="w-full h-full object-contain" />
            </div>
            <button onClick={() => setSelectedReceiptUrl(null)} className="w-full bg-slate-950 text-white font-bold py-3.5 rounded-2xl text-xs hover:bg-slate-800 transition">Close</button>
          </div>
        </div>
      )}
    </div>
  );
}