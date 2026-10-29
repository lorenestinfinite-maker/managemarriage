'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function AdminDashboardPage() {
  const [pendingUsers, setPendingUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const supabase = createClientComponentClient();

  useEffect(() => {
    const fetchPendingUsers = async () => {
      try {
        const { data, error } = await supabase
          .from('users')
          .select('*')
          .eq('is_approved', false);
        
        if (error) throw error;
        
        setPendingUsers(data || []);
      } catch (err) {
        console.error('Error fetching pending users:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchPendingUsers();
  }, [supabase]);

  const handleApproveUser = async (userId: string) => {
    try {
      const { error } = await supabase
        .from('users')
        .update({ is_approved: true })
        .eq('id', userId);
      
      if (error) throw error;
      
      // Remove approved user from list
      setPendingUsers(pendingUsers.filter(user => user.id !== userId));
    } catch (err) {
      console.error('Error approving user:', err);
    }
  };

  return (
    <div className="container mx-auto py-8">
      <Card>
        <CardHeader>
          <CardTitle>Admin Dashboard</CardTitle>
          <CardDescription>Manage pending users</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p>Loading pending users...</p>
          ) : pendingUsers.length === 0 ? (
            <p>No pending users to approve.</p>
          ) : (
            <div className="space-y-4">
              {pendingUsers.map((user) => (
                <div key={user.id} className="flex justify-between items-center border p-4 rounded">
                  <div>
                    <h3 className="font-medium">{user.name}</h3>
                    <p className="text-sm text-gray-500">{user.email}</p>
                  </div>
                  <Button onClick={() => handleApproveUser(user.id)}>
                    Approve
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
