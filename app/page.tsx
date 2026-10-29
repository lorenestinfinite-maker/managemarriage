import { TransactionForm } from "@/components/transaction-form";
import { TransactionTable } from "@/components/transaction-table";

export default function Home() {
  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-6">Wedding Expense Tracker</h1>
      
      <div className="mb-8">
        <TransactionForm />
      </div>
      
      <div>
        <h2 className="text-xl font-semibold mb-4">Recent Transactions</h2>
        <TransactionTable />
      </div>
    </div>
  );
}
