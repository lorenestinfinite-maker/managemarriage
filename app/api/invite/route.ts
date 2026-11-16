import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(request: Request) {
  try {
    const { users, organizationId } = await request.json();

    // Initialize with the SERVICE ROLE KEY (Bypasses RLS to invite users)
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY! 
    );

    for (const u of users) {
      // 1. Invite the user. This creates auth.users AND fires your public.users trigger
      const { data, error } = await supabaseAdmin.auth.admin.inviteUserByEmail(u.email, {
        data: { first_name: u.first_name, last_name: u.last_name }
      });

      if (data?.user) {
        // 2. Immediately update the newly created public profile
        await supabaseAdmin.from('users').update({
          organization_id: organizationId,
          role: u.role,
          is_approved: false // Pending their first login
        }).eq('id', data.user.id);
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to invite users' }, { status: 500 });
  }
}