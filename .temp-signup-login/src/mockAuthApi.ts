/**
 * Mock Authentication API for Demo/Preview
 * Replace this with real API calls in production
 */

import type { User, LoginFormData, SignupFormData, PasswordResetFormData } from '../types';

// Simulate network delay
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Mock user database
const mockUsers: User[] = [
  {
    id: 'user_demo_1',
    email: 'demo@example.com',
    firstName: 'Demo',
    lastName: 'User',
    isVerified: true,
  },
];

/**
 * Mock Login API
 */
export const mockLogin = async (data: LoginFormData): Promise<{ user: User; token: string }> => {
  console.log('🔐 Mock Login API called with:', data);

  // Simulate network delay
  await delay(1500);

  // Check if user exists
  const user = mockUsers.find(u => u.email === data.email);

  if (!user) {
    // For demo purposes, create a new user if not found
    const newUser: User = {
      id: `user_${Date.now()}`,
      email: data.email,
      firstName: data.email.split('@')[0],
      lastName: 'User',
      isVerified: true,
    };
    mockUsers.push(newUser);

    const token = `mock_token_${Date.now()}`;
    console.log('✅ Mock Login Success (new user created):', { user: newUser, token });
    return { user: newUser, token };
  }

  const token = `mock_token_${Date.now()}`;
  console.log('✅ Mock Login Success:', { user, token });
  return { user, token };
};

/**
 * Mock Signup API
 */
export const mockSignup = async (data: SignupFormData): Promise<{ user: User; token: string }> => {
  console.log('📝 Mock Signup API called with:', data);

  // Simulate network delay
  await delay(2000);

  // Check if user already exists
  const existingUser = mockUsers.find(u => u.email === data.email);
  if (existingUser) {
    throw new Error('Email already registered');
  }

  // Create new user
  const newUser: User = {
    id: `user_${Date.now()}`,
    email: data.email,
    firstName: data.firstName,
    lastName: data.lastName,
    isVerified: false,
  };

  mockUsers.push(newUser);
  const token = `mock_token_${Date.now()}`;

  console.log('✅ Mock Signup Success:', { user: newUser, token });
  return { user: newUser, token };
};

/**
 * Mock Password Reset API
 */
export const mockPasswordReset = async (data: PasswordResetFormData): Promise<boolean> => {
  console.log('🔑 Mock Password Reset API called with:', data);

  // Simulate network delay
  await delay(1500);

  // Check if user exists
  const user = mockUsers.find(u => u.email === data.email);
  if (!user) {
    console.log('⚠️ Mock Password Reset: User not found, but returning success for demo');
  } else {
    console.log('✅ Mock Password Reset: Email sent to', data.email);
  }

  return true;
};

/**
 * Mock Passwordless Login API
 */
export const mockPasswordlessLogin = async (email: string): Promise<boolean> => {
  console.log('✨ Mock Passwordless Login API called with:', email);

  // Simulate network delay
  await delay(1500);

  console.log('✅ Mock Passwordless Login: Magic link sent to', email);
  return true;
};

// Export mock users for debugging
export const getMockUsers = () => mockUsers;
