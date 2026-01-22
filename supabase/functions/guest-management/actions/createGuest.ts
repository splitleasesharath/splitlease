/**
 * Create Guest Action
 *
 * Create a new guest user account.
 * For corporate use - creating accounts on behalf of guests.
 */

import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

interface CreateGuestPayload {
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: string;
  birthDate?: string;
  userType?: 'guest' | 'host' | 'corporate' | 'admin';
  notes?: string;
}

interface CreateGuestResult {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: string;
  userType: string;
  createdAt: string;
}

export async function handleCreateGuest(
  payload: CreateGuestPayload,
  supabase: SupabaseClient
): Promise<CreateGuestResult> {
  const {
    firstName,
    lastName,
    email,
    phoneNumber,
    birthDate,
    userType = 'guest',
    notes
  } = payload;

  // Validate required fields
  if (!firstName?.trim()) {
    throw new Error('firstName is required');
  }
  if (!lastName?.trim()) {
    throw new Error('lastName is required');
  }
  if (!email?.trim()) {
    throw new Error('email is required');
  }

  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    throw new Error('Invalid email format');
  }

  console.log(`[createGuest] Creating guest: ${firstName} ${lastName} (${email})`);

  // Check if email already exists
  const { data: existingUser, error: checkError } = await supabase
    .from('user')
    .select('_id, email')
    .eq('email', email.toLowerCase().trim())
    .maybeSingle();

  if (checkError) {
    console.error('[createGuest] Error checking existing user:', checkError);
  }

  if (existingUser) {
    throw new Error(`A user with email ${email} already exists`);
  }

  // Generate a unique ID
  const newId = crypto.randomUUID();
  const now = new Date().toISOString();

  // Insert new user
  const { data: newUser, error: insertError } = await supabase
    .from('user')
    .insert({
      _id: newId,
      'Name - First': firstName.trim(),
      'Name - Last': lastName.trim(),
      'Name - Full': `${firstName.trim()} ${lastName.trim()}`,
      email: email.toLowerCase().trim(),
      'Phone Number': phoneNumber?.trim() || null,
      'Date of Birth': birthDate || null,
      'User Type': userType,
      notes: notes || null,
      'Created Date': now,
      'Modified Date': now
    })
    .select()
    .single();

  if (insertError) {
    console.error('[createGuest] Insert error:', insertError);
    throw new Error(`Failed to create guest: ${insertError.message}`);
  }

  console.log(`[createGuest] Successfully created guest: ${newId}`);

  return {
    _id: newUser._id,
    firstName: newUser['Name - First'],
    lastName: newUser['Name - Last'],
    email: newUser.email,
    phoneNumber: newUser['Phone Number'] || '',
    userType: newUser['User Type'] || 'guest',
    createdAt: newUser['Created Date']
  };
}
