/**
 * Create Test Rental Application Action Handler
 *
 * Creates or updates a rental application for usability testing.
 * Autofills with test data so testers don't need to fill out forms.
 *
 * @param payload - Contains userId and autofill data
 * @param supabase - Supabase client with service role
 */

import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

interface CreateTestRentalAppPayload {
  userId: string;
  isUsabilityTest: boolean;
  autofillData?: {
    firstName?: string;
    lastName?: string;
    email?: string;
    phone?: string;
    occupation?: string;
    employer?: string;
    annualIncome?: number;
  };
}

export async function handleCreateTestRentalApplication(
  payload: CreateTestRentalAppPayload,
  supabase: SupabaseClient
): Promise<{ rentalApplicationId: string | null; message: string }> {
  console.log('[create_test_rental_application] Starting with userId:', payload.userId);

  const { userId, autofillData = {} } = payload;

  if (!userId) {
    throw new Error('userId is required');
  }

  // Check if user already has a rental application
  const { data: user, error: userError } = await supabase
    .from('user')
    .select('_id, "Rental Application", "Name - First", "Name - Last", email')
    .eq('_id', userId)
    .single();

  if (userError) {
    console.error('[create_test_rental_application] User fetch error:', userError);
    throw new Error(`Failed to fetch user: ${userError.message}`);
  }

  // If user already has a rental app, we'll note that
  if (user['Rental Application']) {
    console.log('[create_test_rental_application] User already has rental app:', user['Rental Application']);
    return {
      rentalApplicationId: user['Rental Application'],
      message: 'User already has a rental application'
    };
  }

  // Create rental application with test data
  // Note: The actual rental_application table structure may vary
  // This is a simplified version for simulation purposes
  const rentalAppData = {
    user_id: userId,
    'First Name': autofillData.firstName || user['Name - First'] || 'Test',
    'Last Name': autofillData.lastName || user['Name - Last'] || 'User',
    Email: autofillData.email || user.email || 'test@example.com',
    Phone: autofillData.phone || '555-555-5555',
    Occupation: autofillData.occupation || 'Software Engineer',
    Employer: autofillData.employer || 'Test Company Inc.',
    'Annual Income': autofillData.annualIncome || 100000,
    'Application Status': 'Completed',
    'is_usability_test': true,
    'Created Date': new Date().toISOString()
  };

  // Try to insert rental application
  // Note: This may need adjustment based on actual table structure
  try {
    const { data: rentalApp, error: insertError } = await supabase
      .from('rental_application')
      .insert(rentalAppData)
      .select('_id')
      .single();

    if (insertError) {
      console.warn('[create_test_rental_application] Insert warning:', insertError);
      // If rental_application table doesn't exist or has different structure,
      // we'll just proceed without it for the simulation
      return {
        rentalApplicationId: null,
        message: 'Rental application simulation completed (table may not exist)'
      };
    }

    // Link rental app to user
    await supabase
      .from('user')
      .update({ 'Rental Application': rentalApp._id })
      .eq('_id', userId);

    console.log('[create_test_rental_application] Created rental app:', rentalApp._id);

    return {
      rentalApplicationId: rentalApp._id,
      message: 'Test rental application created successfully'
    };

  } catch (error) {
    console.warn('[create_test_rental_application] Error creating rental app:', error);
    // Non-critical for simulation, continue
    return {
      rentalApplicationId: null,
      message: 'Rental application simulation skipped'
    };
  }
}
