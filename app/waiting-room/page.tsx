'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function WaitingRoomPage() {
  const [isCheckingApproval, setIsCheckingApproval] = useState(true);
  const router = useRouter();
  const supabase = createClientComponentClient();

  useEffect(() => {
    const checkApprovalStatus = async () => {
      try {
        const { data: userData, error } = await supabase
          .from('users')
          .select('is_approved')
          .single();
        
        if (error) throw error;
        
        if (userData.is_approved) {
          router.push('/dashboard');
        }
      } catch (err) {
        console.error('Error checking approval status:', err);
      } finally {
        setIsCheckingApproval(false);
      }
    };

    checkApprovalStatus();
  }, [router, supabase]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Awaiting Admin Approval</CardTitle>
          <CardDescription>
            Your account is pending approval by an administrator. Please wait for confirmation.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
