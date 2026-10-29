'use client';

import { useEffect, useState } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { Button } from '@/components/ui/button';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle,
  DialogTrigger 
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Edit, Trash2, Flag, Eye } from 'lucide-react';

interface Transaction {
  id: string;
  amount: number;
  category: string;
  description: string;
  receipt_image_path: string | null;
  transaction_date: string;
  created_at: string;
  user_id: string;
}

interface Ping {
  id: string;
  message: string;
  transaction_id: string;
  user_id: string;
  created_at: string;
}

export function TransactionTable() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [pings, setPings] = useState<Ping[]>([]);
  const [currentUser, setCurrentUser] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [isPingOpen, setIsPingOpen] = useState(false);
  const [pingMessage, setPingMessage] = useState('');
  const [selectedTransactionId, setSelectedTransactionId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const supabase = createClientComponentClient();

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const { data: userData, error } = await supabase
          .from('users')
          .select('id, role')
          .single();
        
        if (error) throw error;
        
        setCurrentUser(userData.id);
        setUserRole(userData.role);
      } catch (err) {
        console.error('Error fetching user data:', err);
      }
    };

    const fetchTransactions = async () => {
      try {
        const { data, error } = await supabase
          .from('transactions')
          .select('*')
          .order('transaction_date', { ascending: false });
        
        if (error) throw error;
        
        setTransactions(data || []);
      } catch (err) {
        console.error('Error fetching transactions:', err);
      }
    };

    const fetchPings = async () => {
      try {
        const { data, error } = await supabase
          .from('pings')
          .select('*');
        
        if (error) throw error;
        
        setPings(data || []);
      } catch (err) {
        console.error('Error fetching pings:', err);
      }
    };

    fetchUserData();
    fetchTransactions();
    fetchPings();
    
    setLoading(false);
  }, [supabase]);

  const handlePing = async () => {
    if (!selectedTransactionId || !pingMessage.trim()) return;

    try {
      const { error } = await supabase
        .from('pings')
        .insert({
          message: pingMessage,
          transaction_id: selectedTransactionId,
          user_id: currentUser,
        });

      if (error) throw error;

      setIsPingOpen(false);
      setPingMessage('');
      
      // Refresh pings to show new one
      const { data, error: fetchError } = await supabase
        .from('pings')
        .select('*');
      
      if (!fetchError) {
        setPings(data || []);
      }
    } catch (err) {
      console.error('Error creating ping:', err);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase
        .from('transactions')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setTransactions(transactions.filter(t => t.id !== id));
    } catch (err) {
      console.error('Error deleting transaction:', err);
    }
  };

  const getTransactionPings = (transactionId: string) => {
    return pings.filter(ping => ping.transaction_id === transactionId);
  };

  if (loading) {
    return <div className="text-center py-8">Loading transactions...</div>;
  }

  return (
    <Card>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Description</TableHead>
              <TableHead className="text-right">Amount</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {transactions.map((transaction) => {
              const transactionPings = getTransactionPings(transaction.id);
              const isOwner = currentUser === transaction.user_id;
              const canEditDelete = isOwner || userRole === 'ADMIN';
              
              return (
                <TableRow key={transaction.id}>
                  <TableCell className="font-medium">
                    {new Date(transaction.transaction_date).toLocaleDateString()}
                  </TableCell>
                  <TableCell>{transaction.category}</TableCell>
                  <TableCell>{transaction.description}</TableCell>
                  <TableCell className="text-right font-medium">
                    ₹{transaction.amount.toFixed(2)}
                  </TableCell>
                  <TableCell>
                    <div className="flex space-x-2">
                      {canEditDelete ? (
                        <>
                          <Button variant="ghost" size="sm">
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => handleDelete(transaction.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </>
                      ) : (
                        <Dialog open={isPingOpen} onOpenChange={setIsPingOpen}>
                          <DialogTrigger asChild>
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => {
                                setSelectedTransactionId(transaction.id);
                                setPingMessage('');
                              }}
                            >
                              <Flag className="h-4 w-4 text-red-500" />
                              {transactionPings.length > 0 && (
                                <Badge className="ml-2" variant="destructive">
                                  {transactionPings.length}
                                </Badge>
                              )}
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Flag Transaction</DialogTitle>
                              <DialogDescription>
                                Report an issue with this transaction
                              </DialogDescription>
                            </DialogHeader>
                            <div className="grid gap-4 py-4">
                              <Input
                                placeholder="What's wrong with this transaction?"
                                value={pingMessage}
                                onChange={(e) => setPingMessage(e.target.value)}
                              />
                            </div>
                            <DialogFooter>
                              <Button 
                                onClick={handlePing} 
                                disabled={!pingMessage.trim()}
                              >
                                Submit Report
                              </Button>
                            </DialogFooter>
                          </DialogContent>
                        </Dialog>
                      )}
                      
                      {transactionPings.length > 0 && (
                        <Badge variant="destructive" className="ml-2">
                          {transactionPings.length} ping{transactionPings.length > 1 ? 's' : ''}
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
