'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { TransactionTable } from '@/components/transaction-table';
import { TransactionForm } from '@/components/transaction-form';

export default function DashboardPage() {
  const [userRole, setUserRole] = useState<string | null>(null);
  const router = useRouter();
  const supabase = createClientComponentClient();

  useEffect(() => {
    const fetchUserRole = async () => {
      try {
        const { data: userData, error } = await supabase
          .from('users')
          .select('role')
          .single();
        
        if (error) throw error;
        
        setUserRole(userData.role);
      } catch (err) {
        console.error('Error fetching user role:', err);
        router.push('/login');
      }
    };

    fetchUserRole();
  }, [router, supabase]);

  return (
    <div className="container mx-auto py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Wedding Budget Tracker</h1>
        {userRole === 'ADMIN' && (
          <Button onClick={() => router.push('/dashboard/admin')}>
            Admin Dashboard
          </Button>
        )}
      </div>
      
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Add New Transaction</CardTitle>
          <CardDescription>Record a new expense for your wedding</CardDescription>
        </CardHeader>
        <CardContent>
          <TransactionForm />
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
          <CardTitle>Transaction History</CardTitle>
          <CardDescription>All recorded expenses</CardDescription>
        </CardHeader>
        <CardContent>
          <TransactionTable />
        </CardContent>
      </Card>
    </div>
  );
}
