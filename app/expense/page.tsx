'use client';
import { useState, useEffect } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

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

  const [selectedReceiptUrl, setSelectedReceiptUrl] = useState<string | null>(null);
  const [editingTransaction, setEditingTransaction] = useState<any | null>(null);
  
  const [isAddingExpense, setIsAddingExpense] = useState(false);
  const [addDescription, setAddDescription] = useState('');
  const [addAmount, setAddAmount] = useState('');
  const [addCategory, setAddCategory] = useState('');
  const [addDate, setAddDate] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  
  const [pingTransaction, setPingTransaction] = useState<any | null>(null);
  const [pingMessage, setPingMessage] = useState('These details might be incorrect. Please review and update.');
  const [isSendingPing, setIsSendingPing] = useState(false);

  const [editDescription, setEditDescription] = useState('');
  const [editAmount, setEditAmount] = useState('');
  const [editCategory, setEditCategory] = useState('');
  const [editDate, setEditDate] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);

  // File Upload States
  const [uploadingFile, setUploadingFile] = useState(false);
  const [receiptImagePath, setReceiptImagePath] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      const weddingId = localStorage.getItem('active_wedding_id');
      if (!weddingId) {
        setLoading(false);
        return;
      }
      setActiveWeddingId(weddingId);

      const { data: { session } } = await supabase.auth.getSession();
      if (session) setCurrentUser(session.user);

      try {
        const [txRes, usersRes, catRes] = await Promise.all([
          supabase.from('transactions').select('*').eq('wedding_id', weddingId).order('transaction_date', { ascending: false }),
          supabase.from('users').select('id, first_name, last_name, email, role'),
          supabase.from('categories').select('*')
        ]);

        const rawTransactions = txRes.data || [];
        const usersData = usersRes.data || [];
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
          return { ...tx, creator_name: formattedName };
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

  const openReceiptModal = async (imagePath: string) => {
    const { data } = supabase.storage.from('receipts').getPublicUrl(imagePath);
    if (data?.publicUrl) setSelectedReceiptUrl(data.publicUrl);
  };

  const handleFileUpload = async (file: File | undefined) => {
    if (!file) return;
    setUploadingFile(true);
    
    const fileExt = file.name.split('.').pop();
    const fileName = `${Math.random()}.${fileExt}`;
    
    const { error } = await supabase.storage.from('receipts').upload(fileName, file);

    if (error) {
      alert('Upload failed: ' + error.message);
    } else {
      setReceiptImagePath(fileName);
    }
    setUploadingFile(false);
  };

  const handleOpenEdit = (tx: any) => {
    setEditingTransaction(tx);
    setEditDescription(tx.description);
    setEditAmount(tx.amount);
    setEditCategory(tx.category);
    setEditDate(tx.transaction_date);
    setReceiptImagePath(tx.receipt_image_path || null);
  };

  const handleUpdateTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsUpdating(true);
    const { error } = await supabase.from('transactions').update({
      description: editDescription,
      amount: Number(editAmount),
      category: editCategory,
      transaction_date: editDate,
      receipt_image_path: receiptImagePath
    }).eq('id', editingTransaction.id);

    if (!error) {
      setTransactions(transactions.map(t => t.id === editingTransaction.id ? { 
        ...t, description: editDescription, amount: Number(editAmount), category: editCategory, transaction_date: editDate, receipt_image_path: receiptImagePath 
      } : t));
      setEditingTransaction(null);
      setReceiptImagePath(null);
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
      wedding_id: activeWeddingId,
      receipt_image_path: receiptImagePath
    };

    const { data, error } = await supabase.from('transactions').insert([newExpense]).select();

    if (!error && data) {
      const fallbackName = currentUser.user_metadata?.first_name 
        ? `${currentUser.user_metadata.first_name} ${currentUser.user_metadata.last_name || ''}`.trim() 
        : (currentUser.email?.split('@')[0] || 'Unknown User');

      const enrichedNewExpense = { ...data[0], creator_name: fallbackName };
      setTransactions([enrichedNewExpense, ...transactions]);
      
      setIsAddingExpense(false);
      setAddDescription('');
      setAddAmount('');
      setAddCategory('');
      setAddDate('');
      setReceiptImagePath(null);
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
      wedding_id: activeWeddingId
    }]);

    if (error) {
      alert(`Failed to send ping: ${error.message}`);
    } else {
      setPingTransaction(null);
      setPingMessage('These details might be incorrect. Please review and update.');
    }
    setIsSendingPing(false);
  };

  const downloadStatement = () => {
    const doc = new jsPDF();
    doc.setFontSize(20);
    doc.text("Wedding Expense Statement", 14, 22);
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 14, 30);

    const tableData = filteredTransactions.map(exp => [
      new Date(exp.transaction_date).toLocaleDateString(),
      exp.description,
      exp.category,
      exp.creator_name,
      `Rs. ${exp.amount}`
    ]);

    autoTable(doc, {
      startY: 40,
      head: [['Date', 'Description', 'Category', 'Paid By', 'Amount']],
      body: tableData,
      theme: 'grid',
      headStyles: { fillColor: [15, 23, 42] },
      styles: { fontSize: 9 },
    });

    doc.save('expense-statement.pdf');
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
          <div className="flex gap-3 w-full md:w-auto">
            {isAdmin && (
              <button onClick={downloadStatement} className="flex-1 md:flex-none bg-white border border-slate-200 px-4 py-3 text-xs font-bold uppercase tracking-wide text-slate-700 rounded-2xl hover:bg-slate-50 transition flex items-center justify-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
                PDF Statement
              </button>
            )}
            <button onClick={() => { setReceiptImagePath(null); setIsAddingExpense(true); }} className="flex-1 md:flex-none bg-slate-950 px-6 py-3 text-sm font-semibold text-white rounded-2xl hover:shadow-lg transition border-none cursor-pointer">
              + Log New Expense
            </button>
          </div>
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

        <div className="bg-white rounded-[2.5rem] p-4 md:p-8 shadow-sm border border-slate-100">
          <div className="w-full overflow-x-auto pb-4">
            <div className="min-w-[800px]">
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
                        
                        <td className="py-4 text-xs font-bold text-indigo-900">{t.creator_name}</td>

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
      </div>

      {/* ADD EXPENSE MODAL */}
      {isAddingExpense && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-[2.5rem] p-8 max-w-md w-full space-y-6 shadow-2xl max-h-[90vh] overflow-y-auto">
            <h3 className="text-base font-bold text-slate-950">Log New Expense</h3>
            <form onSubmit={handleAddTransaction} className="space-y-4">
              <input type="text" placeholder="Description" value={addDescription} onChange={(e) => setAddDescription(e.target.value)} className="w-full border border-slate-200 p-3 rounded-2xl text-xs outline-none focus:border-slate-400" required />
              <input type="number" placeholder="Amount (₹)" value={addAmount} onChange={(e) => setAddAmount(e.target.value)} className="w-full border border-slate-200 p-3 rounded-2xl text-xs outline-none focus:border-slate-400" required />
              <select value={addCategory} onChange={(e) => setAddCategory(e.target.value)} className="w-full border border-slate-200 p-3 rounded-2xl text-xs outline-none focus:border-slate-400" required>
                <option value="" disabled>Select Category</option>
                {categories.map((c, i) => <option key={i} value={c.name}>{c.name}</option>)}
              </select>
              <input type="date" value={addDate} onChange={(e) => setAddDate(e.target.value)} className="w-full border border-slate-200 p-3 rounded-2xl text-xs outline-none focus:border-slate-400" required />
              
              {/* Receipt Uploader */}
              <div className="p-3 border border-slate-200 rounded-2xl">
                <label className="block text-[10px] font-bold text-slate-400 mb-2 uppercase tracking-widest">Receipt (Snap/Upload)</label>
                <input 
                  type="file" 
                  accept="image/*,application/pdf"
                  onChange={(e) => handleFileUpload(e.target.files?.[0])}
                  className="w-full text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-[10px] file:font-bold file:bg-slate-100 file:text-slate-700 hover:file:bg-slate-200 transition"
                />
                {uploadingFile && <span className="text-[10px] text-indigo-500 font-bold mt-2 block">Uploading...</span>}
                {receiptImagePath && <span className="text-[10px] text-emerald-600 font-bold mt-2 block">✓ Attached</span>}
              </div>

              <div className="flex gap-3 mt-2">
                <button type="button" onClick={() => setIsAddingExpense(false)} className="flex-1 bg-slate-100 font-bold py-3.5 rounded-2xl text-xs hover:bg-slate-200 transition">Cancel</button>
                <button type="submit" disabled={isAdding || uploadingFile} className="flex-1 bg-slate-950 text-white font-bold py-3.5 rounded-2xl text-xs hover:bg-slate-800 transition disabled:opacity-50">
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
          <div className="bg-white rounded-[2.5rem] p-8 max-w-md w-full space-y-6 shadow-2xl max-h-[90vh] overflow-y-auto">
            <h3 className="text-base font-bold text-slate-950">Edit Expense</h3>
            <form onSubmit={handleUpdateTransaction} className="space-y-4">
              <input type="text" value={editDescription} onChange={(e) => setEditDescription(e.target.value)} className="w-full border border-slate-200 p-3.5 rounded-2xl text-xs outline-none focus:border-slate-400" required />
              <input type="number" value={editAmount} onChange={(e) => setEditAmount(e.target.value)} className="w-full border border-slate-200 p-3.5 rounded-2xl text-xs outline-none focus:border-slate-400" required />
              <select value={editCategory} onChange={(e) => setEditCategory(e.target.value)} className="w-full border border-slate-200 p-3.5 rounded-2xl text-xs outline-none focus:border-slate-400">
                {categories.map((c, i) => <option key={i} value={c.name}>{c.name}</option>)}
              </select>
              <input type="date" value={editDate} onChange={(e) => setEditDate(e.target.value)} className="w-full border border-slate-200 p-3.5 rounded-2xl text-xs outline-none focus:border-slate-400" required />
              
              {/* Receipt Uploader for Edit Modal */}
              <div className="p-3 border border-slate-200 rounded-2xl bg-slate-50">
                <label className="block text-[10px] font-bold text-slate-400 mb-2 uppercase tracking-widest">Update Receipt</label>
                <input 
                  type="file" 
                  accept="image/*,application/pdf"
                  onChange={(e) => handleFileUpload(e.target.files?.[0])}
                  className="w-full text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-[10px] file:font-bold file:bg-white file:border file:border-slate-200 file:text-slate-700 hover:file:bg-slate-100 transition"
                />
                {uploadingFile && <span className="text-[10px] text-indigo-500 font-bold mt-2 block">Uploading...</span>}
                {receiptImagePath && <span className="text-[10px] text-emerald-600 font-bold mt-2 block">✓ Attached: {receiptImagePath}</span>}
              </div>

              <div className="flex gap-3 mt-2">
                <button type="button" onClick={() => setEditingTransaction(null)} className="flex-1 bg-slate-100 font-bold py-3.5 rounded-2xl text-xs hover:bg-slate-200 transition">Cancel</button>
                <button type="submit" disabled={isUpdating || uploadingFile} className="flex-1 bg-slate-950 text-white font-bold py-3.5 rounded-2xl text-xs hover:bg-slate-800 transition disabled:opacity-50">Save Changes</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* RECEIPT MODAL */}
      {selectedReceiptUrl && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-[2.5rem] p-6 max-w-lg w-full space-y-4 flex flex-col items-center shadow-2xl">
            <div className="w-full h-[60vh] bg-slate-100 rounded-2xl overflow-hidden flex items-center justify-center">
              <img src={selectedReceiptUrl} alt="Receipt" className="w-full h-full object-contain" />
            </div>
            <button onClick={() => setSelectedReceiptUrl(null)} className="w-full bg-slate-950 text-white font-bold py-3.5 rounded-2xl text-xs hover:bg-slate-800 transition">Close Document</button>
          </div>
        </div>
      )}
    </div>
  );
}