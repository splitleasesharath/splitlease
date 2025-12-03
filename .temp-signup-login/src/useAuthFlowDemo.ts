/**
 * Demo version of useAuthFlow hook with mock API
 * This is used for the preview/demo application
 */

import { useState, useCallback } from 'react';
import {
  LoginFormData,
  SignupFormData,
  PasswordResetFormData,
  User,
} from '../types';
import { mockLogin, mockSignup, mockPasswordReset, mockPasswordlessLogin } from './mockAuthApi';

export const useAuthFlowDemo = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const login = useCallback(async (
    data: LoginFormData
  ): Promise<User | null> => {
    setLoading(true);
    setError(null);

    try {
      const result = await mockLogin(data);

      // Store authentication token
      if (result.token) {
        localStorage.setItem('authToken', result.token);
        localStorage.setItem('user', JSON.stringify(result.user));
      }

      return result.user;
    } catch (err: any) {
      const errorMessage = err.message || "Login failed. Please try again.";
      setError(errorMessage);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const signup = useCallback(async (
    data: SignupFormData
  ): Promise<User | null> => {
    setLoading(true);
    setError(null);

    try {
      const result = await mockSignup(data);

      // Store authentication token
      if (result.token) {
        localStorage.setItem('authToken', result.token);
        localStorage.setItem('user', JSON.stringify(result.user));
      }

      return result.user;
    } catch (err: any) {
      const errorMessage = err.message || 'Unable to create account. Please try again.';
      setError(errorMessage);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const resetPassword = useCallback(async (
    data: PasswordResetFormData
  ): Promise<boolean> => {
    setLoading(true);
    setError(null);

    try {
      return await mockPasswordReset(data);
    } catch (err: any) {
      const errorMessage = err.message || 'Unable to send reset email. Please try again.';
      setError(errorMessage);
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  const passwordlessLogin = useCallback(async (
    email: string
  ): Promise<boolean> => {
    setLoading(true);
    setError(null);

    try {
      return await mockPasswordlessLogin(email);
    } catch (err: any) {
      const errorMessage = err.message || 'Unable to send login link. Please try again.';
      setError(errorMessage);
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  const socialAuth = useCallback(async (
    provider: 'google' | 'facebook' | 'apple'
  ): Promise<User | null> => {
    setLoading(true);
    setError(null);

    try {
      console.log(`Mock ${provider} authentication initiated`);
      // In demo mode, just show an alert
      alert(`${provider} authentication would be initiated here in production`);
      return null;
    } catch (err: any) {
      const errorMessage = err.message || `${provider} authentication failed`;
      setError(errorMessage);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('authToken');
    localStorage.removeItem('user');
  }, []);

  return {
    loading,
    error,
    login,
    signup,
    resetPassword,
    passwordlessLogin,
    socialAuth,
    clearError,
    logout,
  };
};
