'use client';
import Link from 'next/link';

export default function PingsPage() {
  return (
    <div className="min-h-screen bg-[#FAFAFA] text-slate-900 font-sans p-6 md:p-12">
      <div className="max-w-4xl mx-auto space-y-8">
        <div>
          <Link href="/" className="text-xs font-bold uppercase tracking-wider text-slate-400 hover:text-slate-900 transition">
            ← Dashboard
          </Link>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-950 mt-2">Pings & Approvals</h1>
          <p className="text-sm font-medium text-slate-500">Manage edit requests sent between team members and the Admin.</p>
        </div>

        <div className="bg-white rounded-[2.5rem] p-8 border border-slate-100 shadow-xl space-y-6">
          <div className="flex items-center gap-3 mb-6 border-b border-slate-100 pb-4">
            <span className="w-3 h-3 rounded-full bg-rose-500 animate-pulse"></span>
            <h3 className="text-base font-bold text-slate-900">Pending Edit Requests</h3>
          </div>

          <div className="space-y-4">
            {/* Example of a Mock Ping Request */}
            <div className="p-5 rounded-2xl bg-amber-50/50 border border-amber-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div>
                <p className="text-xs font-bold text-slate-900 mb-1">Request to edit "Venue Advance Payment"</p>
                <p className="text-[10px] text-slate-500">
                  <strong className="text-slate-700">User</strong> pinged Admin to unlock this record to update the amount from ₹50,000 to ₹55,000.
                </p>
              </div>
              <div className="flex gap-2 w-full md:w-auto">
                <button className="flex-1 md:flex-none bg-slate-900 hover:bg-slate-800 text-white text-[11px] font-bold px-4 py-2 rounded-xl transition">
                  Approve & Edit
                </button>
                <button className="flex-1 md:flex-none bg-white border border-slate-200 text-slate-600 text-[11px] font-bold px-4 py-2 rounded-xl transition">
                  Dismiss
                </button>
              </div>
            </div>
            
            <p className="text-xs text-slate-400 text-center py-6">
              When a team member clicks "Ping to Edit" on an expense they don't own, the request will appear here for the Admin to review.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}